-- Distinguish "Stripe is still reviewing" from "the seller must act" for a restricted
-- account. stripe_account_status='restricted' (or enabled-but-payouts-off) covers BOTH
-- the benign verification-in-progress window and the case where Stripe needs more info.
-- Without a persisted signal the dashboard banner can't tell them apart and would raise a
-- false "handling kreves" alarm during normal review. This mirrors what the payouts page
-- already derives live via check-stripe-connect-status (requirements_due = currently_due ∪
-- past_due) — persist it so every dashboard page can gate on it too.
--
-- Server-controlled, same as the other stripe_* columns: written by check-stripe-connect-status
-- and the account.updated webhook (stripe-connect-account-events). Surfacing only — not a
-- checkout/publish gate.

ALTER TABLE public.sellers
  ADD COLUMN stripe_requirements_due boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.sellers.stripe_requirements_due IS
  'True when Stripe has currently_due/past_due requirements the seller must supply (as opposed to Stripe merely verifying). Server-controlled; driven by account.updated.';

-- No accurate backfill possible without calling Stripe per account — default false is the
-- safe "no outstanding action" assumption; the next status check (manual refresh or the
-- account.updated webhook) re-syncs truth for any currently-restricted seller.

-- Private — like stripe_payouts_enabled, not shown to buyers. authenticated (dashboard) only.
GRANT SELECT(stripe_requirements_due) ON public.sellers TO authenticated;

-- Surface it through the member-gated operational RPC (hydrates currentSeller) — otherwise
-- the new column never reaches the dashboard outside a raw table select.
DROP FUNCTION IF EXISTS public.get_seller_operational(uuid);
CREATE FUNCTION public.get_seller_operational(p_seller_id uuid)
RETURNS TABLE(
  stripe_account_id text, stripe_account_status text, stripe_onboarding_complete boolean,
  stripe_payouts_enabled boolean, stripe_requirements_due boolean,
  operating_model text,
  subscription_plan text, subscription_status text,
  subscription_current_period_end timestamptz, subscription_cancel_at_period_end boolean,
  subscription_customer_id text, uses_integrated_payments boolean, updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT s.stripe_account_id, s.stripe_account_status, s.stripe_onboarding_complete,
         s.stripe_payouts_enabled, s.stripe_requirements_due,
         s.operating_model,
         s.subscription_plan, s.subscription_status,
         s.subscription_current_period_end, s.subscription_cancel_at_period_end,
         s.subscription_customer_id,
         s.uses_integrated_payments,
         s.updated_at
  FROM public.sellers s
  WHERE s.id = p_seller_id
    AND public.is_seller_member(p_seller_id, auth.uid());
$$;
REVOKE ALL ON FUNCTION public.get_seller_operational(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_seller_operational(uuid) TO authenticated, service_role;

-- Protected-columns trigger: stripe_requirements_due joins the other stripe_* columns —
-- clients cannot write it, only service-role / server-write context.
CREATE OR REPLACE FUNCTION public.sellers_block_protected_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
  IF current_user IN ('service_role', 'postgres', 'supabase_admin')
     OR current_setting('app.sellers_server_write', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan
     OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.subscription_current_period_end IS DISTINCT FROM OLD.subscription_current_period_end
     OR NEW.subscription_cancel_at_period_end IS DISTINCT FROM OLD.subscription_cancel_at_period_end
     OR NEW.subscription_provider IS DISTINCT FROM OLD.subscription_provider
     OR NEW.subscription_customer_id IS DISTINCT FROM OLD.subscription_customer_id
     OR NEW.subscription_external_id IS DISTINCT FROM OLD.subscription_external_id THEN
    RAISE EXCEPTION 'sellers.subscription_* is server-controlled' USING ERRCODE = '42501';
  END IF;

  IF NEW.stripe_account_id IS DISTINCT FROM OLD.stripe_account_id
     OR NEW.stripe_onboarding_complete IS DISTINCT FROM OLD.stripe_onboarding_complete
     OR NEW.stripe_account_status IS DISTINCT FROM OLD.stripe_account_status
     OR NEW.stripe_payouts_enabled IS DISTINCT FROM OLD.stripe_payouts_enabled
     OR NEW.stripe_requirements_due IS DISTINCT FROM OLD.stripe_requirements_due THEN
    RAISE EXCEPTION 'sellers.stripe_* is server-controlled' USING ERRCODE = '42501';
  END IF;

  IF NEW.organization_number IS DISTINCT FROM OLD.organization_number
     OR NEW.operating_model IS DISTINCT FROM OLD.operating_model
     OR NEW.slug IS DISTINCT FROM OLD.slug
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.closed_at IS DISTINCT FROM OLD.closed_at THEN
    RAISE EXCEPTION 'sellers identity/lifecycle columns are server-controlled' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

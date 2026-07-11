-- Surface Stripe Connect's payouts_enabled to sellers. stripe_onboarding_complete only
-- tracks charges_enabled, so a seller whose payouts are blocked (unverified bank, risk
-- hold) currently sees an "everything ready" payments page while Stripe holds their
-- money. Server-controlled — written by check-stripe-connect-status and the
-- account.updated webhook (stripe-connect-account-events), same as the other stripe_*
-- columns. Charges are unaffected: this is surfacing only, not a checkout/publish gate.

ALTER TABLE public.sellers
  ADD COLUMN stripe_payouts_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.sellers.stripe_payouts_enabled IS
  'True once the Express account can receive payouts (payouts_enabled). Server-controlled; driven by account.updated.';

-- Backfill: existing test sellers were verified in test mode alongside charges_enabled.
-- The next status check (manual refresh or webhook) re-syncs truth for everyone.
UPDATE public.sellers SET stripe_payouts_enabled = true WHERE stripe_onboarding_complete = true;

-- Private — unlike stripe_onboarding_complete (public storefront gate), payout state is
-- not shown to buyers. authenticated (dashboard) only, no anon.
GRANT SELECT(stripe_payouts_enabled) ON public.sellers TO authenticated;

-- Surface it through the member-gated operational RPC (hydrates currentSeller) —
-- otherwise the new column never reaches the dashboard outside a raw table select.
DROP FUNCTION IF EXISTS public.get_seller_operational(uuid);
CREATE FUNCTION public.get_seller_operational(p_seller_id uuid)
RETURNS TABLE(
  stripe_account_id text, stripe_account_status text, stripe_onboarding_complete boolean,
  stripe_payouts_enabled boolean,
  operating_model text,
  subscription_plan text, subscription_status text,
  subscription_current_period_end timestamptz, subscription_cancel_at_period_end boolean,
  subscription_customer_id text, uses_integrated_payments boolean, updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT s.stripe_account_id, s.stripe_account_status, s.stripe_onboarding_complete,
         s.stripe_payouts_enabled,
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

-- Protected-columns trigger: stripe_payouts_enabled joins the other stripe_* columns —
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
     OR NEW.stripe_payouts_enabled IS DISTINCT FROM OLD.stripe_payouts_enabled THEN
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

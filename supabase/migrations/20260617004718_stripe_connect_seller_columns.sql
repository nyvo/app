-- Stripe Connect — additive seller onboarding columns (Phase 1 of the Dintero → Stripe migration).
-- ADDITIVE + REVERSIBLE. Dintero columns are retained untouched. The integrated-payments
-- window is opened to EITHER provider so Stripe onboarding can run in parallel during the
-- overlap, then closed back to Stripe-only at cutover.
-- Plan: .context/plans/dintero-to-stripe-migration.md (Phase 1, step 4).
-- (No explicit BEGIN/COMMIT — the Supabase migration runner wraps each file in a transaction,
--  matching every other migration in this repo.)

-- 1. New Stripe Connect (Express) onboarding columns on sellers.
ALTER TABLE public.sellers
  ADD COLUMN stripe_account_id          text,
  ADD COLUMN stripe_onboarding_complete boolean NOT NULL DEFAULT false,
  ADD COLUMN stripe_account_status      text;

ALTER TABLE public.sellers
  ADD CONSTRAINT sellers_stripe_account_status_check
  CHECK (stripe_account_status IS NULL
         OR stripe_account_status IN ('pending', 'enabled', 'restricted', 'rejected'));

COMMENT ON COLUMN public.sellers.stripe_account_id IS
  'Stripe Connect (Express) account id (acct_…). Server-controlled.';
COMMENT ON COLUMN public.sellers.stripe_onboarding_complete IS
  'True once the Express account can accept charges (charges_enabled). Server-controlled; driven by account.updated.';
COMMENT ON COLUMN public.sellers.stripe_account_status IS
  'Derived Express account state: pending|enabled|restricted|rejected. Server-controlled; driven by account.updated.';

-- 2. Open the integrated-payments window to EITHER provider for the overlap.
--    uses_integrated_payments is GENERATED ALWAYS, so its expression can only be changed by
--    dropping and re-adding the column. No dependents (policies/views/indexes/generated cols) — verified.
ALTER TABLE public.sellers DROP COLUMN IF EXISTS uses_integrated_payments;
ALTER TABLE public.sellers
  ADD COLUMN uses_integrated_payments boolean
  GENERATED ALWAYS AS (
    (subscription_plan = 'pro')
    AND (subscription_status = ANY (ARRAY['active', 'past_due']))
    AND (dintero_onboarding_complete OR stripe_onboarding_complete)
  ) STORED;

-- DROP COLUMN destroys the column-level ACL with the column. Re-issue the SELECT grant that
-- 20260610110000_free_tier_manual_payments.sql attached to anon/authenticated — the public
-- storefront reads sellers.uses_integrated_payments as anon (src/services/publicCourses.ts:309,549),
-- and without this the integrated-checkout button silently vanishes for unauthenticated visitors.
GRANT SELECT(uses_integrated_payments) ON public.sellers TO anon, authenticated;

-- 3. Protect the new Stripe columns from client writes (parity with the dintero_* block).
CREATE OR REPLACE FUNCTION public.sellers_block_protected_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF current_user IN ('service_role', 'postgres', 'supabase_admin')
     OR current_setting('app.sellers_server_write', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan
     OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.subscription_current_period_end IS DISTINCT FROM OLD.subscription_current_period_end
     OR NEW.subscription_provider IS DISTINCT FROM OLD.subscription_provider
     OR NEW.subscription_customer_id IS DISTINCT FROM OLD.subscription_customer_id
     OR NEW.subscription_external_id IS DISTINCT FROM OLD.subscription_external_id THEN
    RAISE EXCEPTION 'sellers.subscription_* is server-controlled' USING ERRCODE = '42501';
  END IF;

  IF NEW.dintero_seller_id IS DISTINCT FROM OLD.dintero_seller_id
     OR NEW.dintero_approval_id IS DISTINCT FROM OLD.dintero_approval_id
     OR NEW.dintero_contract_url IS DISTINCT FROM OLD.dintero_contract_url
     OR NEW.dintero_onboarding_status IS DISTINCT FROM OLD.dintero_onboarding_status
     OR NEW.dintero_onboarding_complete IS DISTINCT FROM OLD.dintero_onboarding_complete THEN
    RAISE EXCEPTION 'sellers.dintero_* is server-controlled' USING ERRCODE = '42501';
  END IF;

  IF NEW.stripe_account_id IS DISTINCT FROM OLD.stripe_account_id
     OR NEW.stripe_onboarding_complete IS DISTINCT FROM OLD.stripe_onboarding_complete
     OR NEW.stripe_account_status IS DISTINCT FROM OLD.stripe_account_status THEN
    RAISE EXCEPTION 'sellers.stripe_* is server-controlled' USING ERRCODE = '42501';
  END IF;

  IF NEW.organization_number IS DISTINCT FROM OLD.organization_number
     OR NEW.seller_type IS DISTINCT FROM OLD.seller_type
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.phone IS DISTINCT FROM OLD.phone
     OR NEW.closed_at IS DISTINCT FROM OLD.closed_at THEN
    RAISE EXCEPTION 'sellers identity/lifecycle columns are server-controlled' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.sellers_block_protected_columns() FROM PUBLIC, anon, authenticated;

-- 4. Surface Stripe onboarding state to the dashboard (parity with the dintero_* fields).
--    RETURNS TABLE shape changes, so DROP + CREATE (CREATE OR REPLACE cannot alter return type).
DROP FUNCTION IF EXISTS public.get_seller_operational(uuid);
CREATE FUNCTION public.get_seller_operational(p_seller_id uuid)
 RETURNS TABLE(dintero_seller_id text, dintero_onboarding_status text,
               stripe_account_id text, stripe_account_status text, stripe_onboarding_complete boolean,
               seller_type text, subscription_plan text, subscription_status text,
               subscription_current_period_end timestamp with time zone, subscription_customer_id text,
               uses_integrated_payments boolean, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT s.dintero_seller_id, s.dintero_onboarding_status,
         s.stripe_account_id, s.stripe_account_status, s.stripe_onboarding_complete,
         s.seller_type,
         s.subscription_plan, s.subscription_status,
         s.subscription_current_period_end, s.subscription_customer_id,
         s.uses_integrated_payments,
         s.updated_at
  FROM public.sellers s
  WHERE s.id = p_seller_id
    AND public.is_seller_member(p_seller_id, auth.uid());
$function$;

ALTER FUNCTION public.get_seller_operational(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_seller_operational(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_seller_operational(uuid) TO authenticated, service_role;

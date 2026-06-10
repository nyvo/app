-- Phase 2 of the pricing & payments plan: seller-level subscription / tier state.
--
-- Adds the columns later phases gate on (INV-1: a seller becomes a Dintero
-- payout destination only while they hold an active Pro subscription):
--   subscription_plan                  free | pro
--   subscription_status                active | past_due | canceled | none
--   subscription_current_period_end    grace handling on lapse
--   subscription_provider/external_id  billing-system linkage (Stripe)
--   subscription_customer_id           added in 20260610130000 for customer portal sessions
--
-- Defaults put every existing and new seller on the free tier with no sub.
ALTER TABLE public.sellers
  ADD COLUMN subscription_plan text NOT NULL DEFAULT 'free'
    CONSTRAINT sellers_subscription_plan_check
    CHECK (subscription_plan IN ('free', 'pro')),
  ADD COLUMN subscription_status text NOT NULL DEFAULT 'none'
    CONSTRAINT sellers_subscription_status_check
    CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'none')),
  ADD COLUMN subscription_current_period_end timestamptz,
  ADD COLUMN subscription_provider text,
  ADD COLUMN subscription_external_id text;

-- Least-privilege narrowing (mirrors F4.1 on profiles): authenticated held a
-- TABLE-level UPDATE grant on sellers, which would extend to the new
-- subscription columns — letting a seller owner PATCH themselves to
-- subscription_plan = 'pro' (and, pre-existing, dintero_onboarding_complete =
-- true, bypassing the publish gate). The browser only writes name and logo_url
-- (updateSeller → StudioPage); all other write paths run through service-role
-- edge functions or SECURITY DEFINER RPCs, which are unaffected by grants.
REVOKE UPDATE ON public.sellers FROM authenticated;
GRANT UPDATE (name, logo_url) ON public.sellers TO authenticated;

-- Defense-in-depth (mirrors profiles_block_protected_columns): the column-level
-- grant above is the primary barrier, but it is one accidental re-widening away
-- from a paywall bypass. This trigger keeps subscription_* (the paywall) and
-- dintero_* (the publish gate) server-controlled even if grants regress.
-- Server writes pass via service_role; SECURITY DEFINER RPCs can opt in with
-- set_config('app.sellers_server_write', 'true', true).
CREATE FUNCTION public.sellers_block_protected_columns() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public'
    AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR current_setting('app.sellers_server_write', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan
     OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.subscription_current_period_end IS DISTINCT FROM OLD.subscription_current_period_end
     OR NEW.subscription_provider IS DISTINCT FROM OLD.subscription_provider
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

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.sellers_block_protected_columns() OWNER TO postgres;

CREATE TRIGGER sellers_block_protected_columns
  BEFORE UPDATE ON public.sellers
  FOR EACH ROW EXECUTE FUNCTION public.sellers_block_protected_columns();

-- Expose plan + status to members through the operational RPC.
-- Return type changes → drop + recreate, then restore owner and grants.
DROP FUNCTION public.get_seller_operational(uuid);

CREATE FUNCTION public.get_seller_operational(p_seller_id uuid)
RETURNS TABLE (
  dintero_seller_id text,
  dintero_onboarding_status text,
  seller_type text,
  subscription_plan text,
  subscription_status text,
  subscription_current_period_end timestamptz,
  updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT s.dintero_seller_id, s.dintero_onboarding_status,
         s.seller_type,
         s.subscription_plan, s.subscription_status,
         s.subscription_current_period_end,
         s.updated_at
  FROM public.sellers s
  WHERE s.id = p_seller_id
    AND public.is_seller_member(p_seller_id, auth.uid());
$$;

ALTER FUNCTION public.get_seller_operational(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_seller_operational(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_seller_operational(uuid) TO authenticated;
-- Restore the baseline grant set (DROP FUNCTION removed it).
GRANT ALL ON FUNCTION public.get_seller_operational(uuid) TO service_role;

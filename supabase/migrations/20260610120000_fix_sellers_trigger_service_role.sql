-- Fix: sellers_block_protected_columns blocked SERVER writes too.
--
-- The trigger (20260610090000) copied profiles_block_protected_columns'
-- service-role check — current_setting('request.jwt.claim.role') — but
-- current PostgREST only exposes request.jwt.claims (plural, json); the
-- singular per-claim GUC is gone. Result: service-role REST/edge-function
-- updates to sellers' protected columns (Dintero webhook, seller sync,
-- subscription writes) raised 42501.
--
-- Check the actual Postgres role instead: PostgREST switches to the JWT's
-- role via SET ROLE, so service-key requests run as current_user =
-- 'service_role'. postgres/supabase_admin cover migrations and dashboard.
-- The set_config('app.sellers_server_write') hatch stays for DEFINER RPCs.
CREATE OR REPLACE FUNCTION public.sellers_block_protected_columns() RETURNS trigger
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

-- Phase 5 support: Stripe Billing needs a durable customer id so teachers can
-- return to the hosted customer portal after subscribing.
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS subscription_customer_id text;

CREATE INDEX IF NOT EXISTS idx_sellers_subscription_customer_id
  ON public.sellers (subscription_customer_id)
  WHERE subscription_customer_id IS NOT NULL;

-- Keep the new billing linkage server-controlled with the rest of subscription_*.
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

  RETURN NEW;
END;
$$;

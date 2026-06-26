-- Track Stripe's cancel_at_period_end so the billing page can show the wind-down
-- state ("Abonnementet ditt utgår …") instead of a misleading "Aktiv" after a
-- portal cancellation. Server-controlled — set by stripe-billing-webhook.

ALTER TABLE public.sellers
  ADD COLUMN subscription_cancel_at_period_end boolean NOT NULL DEFAULT false;

-- Surface it through the member-gated operational RPC (hydrates currentSeller).
DROP FUNCTION IF EXISTS public.get_seller_operational(uuid);
CREATE FUNCTION public.get_seller_operational(p_seller_id uuid)
 RETURNS TABLE(stripe_account_id text, stripe_account_status text, stripe_onboarding_complete boolean, seller_type text, subscription_plan text, subscription_status text, subscription_current_period_end timestamp with time zone, subscription_cancel_at_period_end boolean, subscription_customer_id text, uses_integrated_payments boolean, updated_at timestamp with time zone)
 LANGUAGE sql STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT s.stripe_account_id, s.stripe_account_status, s.stripe_onboarding_complete,
         s.seller_type,
         s.subscription_plan, s.subscription_status,
         s.subscription_current_period_end, s.subscription_cancel_at_period_end,
         s.subscription_customer_id,
         s.uses_integrated_payments,
         s.updated_at
  FROM public.sellers s
  WHERE s.id = p_seller_id
    AND public.is_seller_member(p_seller_id, auth.uid());
$function$;
GRANT EXECUTE ON FUNCTION public.get_seller_operational(uuid) TO authenticated, service_role;

-- Protect the new column from client writes, like the rest of subscription_*.
CREATE OR REPLACE FUNCTION public.sellers_block_protected_columns()
 RETURNS trigger LANGUAGE plpgsql
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
     OR NEW.subscription_cancel_at_period_end IS DISTINCT FROM OLD.subscription_cancel_at_period_end
     OR NEW.subscription_provider IS DISTINCT FROM OLD.subscription_provider
     OR NEW.subscription_customer_id IS DISTINCT FROM OLD.subscription_customer_id
     OR NEW.subscription_external_id IS DISTINCT FROM OLD.subscription_external_id THEN
    RAISE EXCEPTION 'sellers.subscription_* is server-controlled' USING ERRCODE = '42501';
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

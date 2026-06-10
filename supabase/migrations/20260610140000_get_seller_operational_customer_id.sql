-- Phase 5 follow-up: the billing page needs the Stripe customer id to decide
-- whether it can open the hosted customer portal. Keep it behind the existing
-- seller-member RPC instead of exposing it through the public sellers select.
DROP FUNCTION public.get_seller_operational(uuid);

CREATE FUNCTION public.get_seller_operational(p_seller_id uuid)
RETURNS TABLE (
  dintero_seller_id text,
  dintero_onboarding_status text,
  seller_type text,
  subscription_plan text,
  subscription_status text,
  subscription_current_period_end timestamptz,
  subscription_customer_id text,
  updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT s.dintero_seller_id, s.dintero_onboarding_status,
         s.seller_type,
         s.subscription_plan, s.subscription_status,
         s.subscription_current_period_end, s.subscription_customer_id,
         s.updated_at
  FROM public.sellers s
  WHERE s.id = p_seller_id
    AND public.is_seller_member(p_seller_id, auth.uid());
$$;

ALTER FUNCTION public.get_seller_operational(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_seller_operational(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_seller_operational(uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_seller_operational(uuid) TO service_role;

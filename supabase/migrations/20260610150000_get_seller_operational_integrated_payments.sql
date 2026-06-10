-- Phase 6 follow-up: hydrate the canonical generated payment-mode predicate
-- for member-only app surfaces. This keeps the active seller object aligned
-- with the DB instead of recomputing only part of the generated expression on
-- the client.
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
  uses_integrated_payments boolean,
  updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT s.dintero_seller_id, s.dintero_onboarding_status,
         s.seller_type,
         s.subscription_plan, s.subscription_status,
         s.subscription_current_period_end, s.subscription_customer_id,
         s.uses_integrated_payments,
         s.updated_at
  FROM public.sellers s
  WHERE s.id = p_seller_id
    AND public.is_seller_member(p_seller_id, auth.uid());
$$;

ALTER FUNCTION public.get_seller_operational(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_seller_operational(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_seller_operational(uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_seller_operational(uuid) TO service_role;

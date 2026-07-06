-- Aggregate income/fee RPCs (pre-launch audit P1-6).
--
-- fetchIncomeSeries and fetchPlatformFeeMonth in src/services/income.ts shipped
-- raw signup rows to the browser with no .limit()/pagination. PostgREST caps
-- responses at 1000 rows, so a seller with >1000 paid signups in the trailing
-- 12 months silently got a wrong income chart AND a wrong "plattformgebyr denne
-- måneden" figure — the number the free→Pro crossover pitch is built on.
--
-- These two SECURITY DEFINER RPCs do the summation in the database (bounded
-- output: <= ~372 daily rows for the year range, one scalar for the fee),
-- scoped by is_seller_member so a caller only ever reads their own seller's
-- numbers. Day bucketing is by Oslo wall-clock date to match the previous
-- browser-local bucketing for Norwegian sellers. Net per day is summed per row
-- as greatest(0, paid - refund) — NOT sum(paid) - sum(refund) — so a single
-- fully-refunded booking can't drag a day negative.

CREATE OR REPLACE FUNCTION public.seller_income_series(
  p_seller_id uuid,
  p_from timestamptz
)
RETURNS TABLE(bucket_day date, net_nok numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT
    (s.created_at AT TIME ZONE 'Europe/Oslo')::date AS bucket_day,
    sum(greatest(0::numeric, coalesce(s.amount_paid, 0) - coalesce(s.refund_amount, 0))) AS net_nok
  FROM public.signups s
  WHERE public.is_seller_member(p_seller_id, (SELECT auth.uid()))
    AND s.seller_id = p_seller_id
    AND s.payment_status IN ('paid', 'refunded')
    AND s.created_at >= p_from
  GROUP BY 1;
$function$;

REVOKE ALL ON FUNCTION public.seller_income_series(uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seller_income_series(uuid, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.seller_platform_fee_month(
  p_seller_id uuid
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT coalesce(sum(s.platform_fee_nok), 0)
  FROM public.signups s
  WHERE public.is_seller_member(p_seller_id, (SELECT auth.uid()))
    AND s.seller_id = p_seller_id
    AND s.payment_status = 'paid'
    AND s.platform_fee_nok > 0
    AND s.created_at >= date_trunc('month', now() AT TIME ZONE 'Europe/Oslo');
$function$;

REVOKE ALL ON FUNCTION public.seller_platform_fee_month(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seller_platform_fee_month(uuid) TO authenticated;

-- Ops health check: a single RPC returning counts of money-state anomalies, for
-- the ops-health-alert cron (which emails when any count is non-zero). Replaces
-- the ad-hoc SQL that lived in the removed Dintero ops-health-checks runbook,
-- rewritten against the current Stripe schema.
--
-- Checks (all should be 0 in a healthy system):
--   paid_without_payment_intent — a Stripe-paid signup with no payment intent id.
--     Scoped to payment_product='stripe' so 'external' (manual/off-platform) and
--     free signups never false-positive.
--   stuck_payment_attempts — attempts still pending/authorized > 2h. sweep-pending-
--     payments runs every 2 min, so a 2h-old unresolved attempt means the webhook
--     AND the sweep are both failing to finalize it.
--   refunded_missing_metadata — a refunded signup missing refund_amount/refunded_at,
--     i.e. the refund state is internally inconsistent.
CREATE OR REPLACE FUNCTION public.ops_health_check()
 RETURNS jsonb
 LANGUAGE sql STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT jsonb_build_object(
    'paid_without_payment_intent', (
      SELECT count(*) FROM public.signups
      WHERE payment_status = 'paid'
        AND payment_product = 'stripe'
        AND stripe_payment_intent_id IS NULL
    ),
    'stuck_payment_attempts', (
      SELECT count(*) FROM public.payment_attempts
      WHERE status IN ('pending', 'authorized')
        AND created_at < now() - interval '2 hours'
    ),
    'refunded_missing_metadata', (
      SELECT count(*) FROM public.signups
      WHERE payment_status = 'refunded'
        AND (refund_amount IS NULL OR refunded_at IS NULL)
    )
  );
$function$;
REVOKE ALL ON FUNCTION public.ops_health_check() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ops_health_check() TO service_role;

-- Broaden ops_health_check beyond the three money anomalies (audit P1-15).
--
-- Adds coverage for the pipeline blind spots the audit flagged:
--   abandoned_confirmations — a Stripe-paid buyer whose confirmation or seller
--     notification never sent within 24h. send-pending-confirmations stops
--     retrying after 24h (ABANDON_HOURS), after which the stuck buyer was
--     invisible: paid, no email, no alert.
--   stuck_pending_reprice — a seller whose operating_model changed but whose
--     Stripe price was never swapped (subscription_pending_reprice stuck true).
--     Surfaces both a swallowed reprice failure and a direct-RPC bypass
--     (see 20260705212000).
--   failed_cron_runs_24h — cron jobs that errored in the last 24h. Catches a
--     cron that started 401-ing (e.g. a verify_jwt regression) — previously
--     nothing read net.http_post results or cron.job_run_details, so a dead
--     cron was undetectable.
--
-- All should be 0 in a healthy system; the ops-health-alert cron emails when
-- any count is non-zero.
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
    ),
    'abandoned_confirmations', (
      SELECT count(*) FROM public.signups
      WHERE payment_status = 'paid'
        AND (confirmation_sent_at IS NULL OR seller_notified_at IS NULL)
        AND created_at < now() - interval '24 hours'
    ),
    'stuck_pending_reprice', (
      SELECT count(*) FROM public.sellers
      WHERE subscription_pending_reprice = true
    ),
    'failed_cron_runs_24h', (
      SELECT count(*) FROM cron.job_run_details
      WHERE status = 'failed'
        AND start_time > now() - interval '24 hours'
    )
  );
$function$;
REVOKE ALL ON FUNCTION public.ops_health_check() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ops_health_check() TO service_role;

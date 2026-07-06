-- Bound the abandoned_confirmations ops check to a recent window (follow-up to
-- 20260705212500).
--
-- The check flagged every paid signup >24h old with a missing confirmation/
-- seller-notification stamp. That includes ancient seed/demo rows (e.g.
-- "Kristoffer Studio" fixtures from ~90 days ago that were inserted directly,
-- never went through checkout — no PaymentIntent, payment_product NULL), which
-- would alert forever with no actionable remedy. A confirmation is only
-- actionable while recent; the send-pending-confirmations sweep itself abandons
-- retries after 24h. Restrict to the 24h–7d window so the alert means "a real
-- paid booking in the last week never got its emails" — historical rows age out.
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
        AND created_at >= now() - interval '7 days'
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

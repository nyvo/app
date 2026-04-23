-- pg_cron for sweep-pending-payments: safety net that catches orphaned
-- payment_attempts where the customer paid but the client-side finalize
-- call (CheckoutSuccessPage → finalize-dintero-transaction) never ran —
-- e.g. browser closed after the iframe authorized, network dropped.
--
-- Runs every 2 min. For each pending attempt older than 2 min, queries
-- Dintero's list-transactions-by-session endpoint and either runs finalize
-- (idempotent) or marks the attempt failed. Max customer-side pay→signup
-- gap in the edge case: ~4 minutes.

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'sweep-pending-payments';

SELECT cron.schedule(
  'sweep-pending-payments',
  '*/2 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://nollnnkksgicsvuthnjq.supabase.co/functions/v1/sweep-pending-payments',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'dintero_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 45000
  );
  $cron$
);

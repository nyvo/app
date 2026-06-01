-- pg_cron for send-pending-confirmations: retry post-payment side effects
-- (buyer order-confirm email + seller booking.created notification) for any
-- paid signup where the inline call in dintero-webhook or
-- finalize-dintero-transaction failed (Resend timeout, crash, etc.).
--
-- Runs every 5 min. Picks up paid signups with confirmation_sent_at IS NULL
-- older than 30s (grace window for the inline call) and younger than 24h
-- (abandon window — stuck rows past that are bugs to investigate).

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'send-pending-confirmations';

SELECT cron.schedule(
  'send-pending-confirmations',
  '*/5 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://nollnnkksgicsvuthnjq.supabase.co/functions/v1/send-pending-confirmations',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'dintero_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 45000
  );
  $cron$
);

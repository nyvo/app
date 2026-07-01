-- Schedule the ops-health-alert cron: daily at 06:00 UTC, POST to the
-- ops-health-alert edge function with the shared cron secret. The function runs
-- ops_health_check() and emails OPS_ALERT_EMAIL (if configured) on any anomaly.
--
-- DEPLOY ORDER: apply this only AFTER the ops-health-alert function is deployed
-- (`supabase functions deploy ops-health-alert`). Until then the daily POST just
-- logs a 404 in the net extension — harmless, but pointless. It reuses the
-- existing `dintero_cron_secret` vault secret (same as sweep-pending-payments),
-- so no new secret is needed for auth; alerting also needs OPS_ALERT_EMAIL set as
-- a function secret (RESEND_* already exist).
select cron.unschedule('ops-health-alert')
where exists (select 1 from cron.job where jobname = 'ops-health-alert');

select cron.schedule(
  'ops-health-alert',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://nollnnkksgicsvuthnjq.supabase.co/functions/v1/ops-health-alert',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'dintero_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

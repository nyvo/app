-- Run the ops health check hourly instead of daily at 06:00 UTC.
--
-- With Slack delivery (owner_alert_webhook) a broken payment pipeline should
-- surface within the hour, not up to 24h later. The checks carry their own
-- time thresholds (2h stuck attempts, 24h abandoned confirmations), so an
-- hourly cadence adds no false positives — but a persisting anomaly will
-- re-alert every hour until it's fixed, which is the intended nagging.
select cron.unschedule('ops-health-alert')
where exists (select 1 from cron.job where jobname = 'ops-health-alert');

select cron.schedule(
  'ops-health-alert',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://nollnnkksgicsvuthnjq.supabase.co/functions/v1/ops-health-alert',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

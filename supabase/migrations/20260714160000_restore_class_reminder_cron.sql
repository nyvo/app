-- Restore the send-class-reminders cron job.
--
-- 20260705170000_class_reminder_cron.sql scheduled it, but the job was
-- unscheduled on prod almost immediately (zero rows in cron.job_run_details
-- ever existed for it) — so the day-before reminder emails promised on the
-- landing/privacy pages have never actually fired. The gap went unnoticed
-- because the deleted openspot-dev clone (2026-07-13/14) replayed this
-- migration and its pg_cron dutifully POSTed the hardcoded prod URL every
-- hour — always 401 (dev vaulted a different cron_secret), but enough log
-- traffic to look alive at a glance.
--
-- cron.schedule() upserts by jobname, so re-running this is idempotent.
-- Identical body to 20260705170000; the function itself is deployed and
-- healthy (CI-owned since the deploy-from-main pipeline).

select cron.schedule('send-class-reminders', '0 * * * *', $job$
  SELECT net.http_post(
    url := 'https://nollnnkksgicsvuthnjq.supabase.co/functions/v1/send-class-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 45000
  );
$job$);

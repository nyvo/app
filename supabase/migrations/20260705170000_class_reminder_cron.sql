-- Class reminders — the "påminnelser" promised on the landing/privacy pages.
--
-- The class-reminder email template has existed since the send-email
-- dispatcher shipped, but nothing ever triggered it. This wires it up:
--   1. reminder_sent_at marker on course_sessions (idempotency gate, same
--      pattern as signups.confirmation_sent_at / seller_notified_at)
--   2. hourly pg_cron job hitting the send-class-reminders edge function,
--      which reminds confirmed participants ~24h before each session

alter table public.course_sessions
  add column if not exists reminder_sent_at timestamptz;

comment on column public.course_sessions.reminder_sent_at is
  'Stamped by the send-class-reminders cron once day-before reminder emails for this session were delivered (or there was nobody to remind). NULL = not yet reminded.';

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

-- Rename the shared cron auth secret off its legacy Dintero name.
--
-- `dintero_cron_secret` (vault) / `DINTERO_CRON_SECRET` (function env) is NOT a
-- Dintero credential — it's the shared secret the pg_cron jobs send as
-- `x-cron-secret` and the edge functions check. The name is Dintero-era leftover.
--
-- Zero-downtime rename: the value is unchanged, so auth never breaks.
--   1. Create vault `cron_secret` from the existing value (idempotent).
--   2. Repoint the live crons to `cron_secret`.
-- The edge functions read `CRON_SECRET` and fall back to `DINTERO_CRON_SECRET`, so
-- they accept the value regardless of which env name is set.
--
-- The old `dintero_cron_secret` vault secret is intentionally KEPT here as a
-- rollback safety net. Drop it (and the function-env fallback) in a follow-up once
-- a `CRON_SECRET` function secret is set and verified.
do $$
begin
  if exists (select 1 from vault.secrets where name = 'dintero_cron_secret')
     and not exists (select 1 from vault.secrets where name = 'cron_secret') then
    perform vault.create_secret(
      (select decrypted_secret from vault.decrypted_secrets where name = 'dintero_cron_secret'),
      'cron_secret',
      'Shared cron auth secret (renamed from dintero_cron_secret; not Dintero-specific).'
    );
  end if;
end $$;

select cron.schedule('sweep-pending-payments', '*/2 * * * *', $job$
  SELECT net.http_post(
    url := 'https://nollnnkksgicsvuthnjq.supabase.co/functions/v1/sweep-pending-payments',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 45000
  );
$job$);

select cron.schedule('send-pending-confirmations', '*/5 * * * *', $job$
  SELECT net.http_post(
    url := 'https://nollnnkksgicsvuthnjq.supabase.co/functions/v1/send-pending-confirmations',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 45000
  );
$job$);

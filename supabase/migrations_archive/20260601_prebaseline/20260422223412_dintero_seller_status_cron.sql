-- pg_cron for sync-dintero-seller-statuses: polls Dintero for pending seller
-- approval state changes every 5 minutes. Substitutes for a seller-status
-- webhook (Dintero doesn't publish one).

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Cron secret in Vault so it isn't hardcoded in cron.job definitions.
-- NOTE: the literal secret value here is a placeholder for local reproducibility.
-- In practice the secret is minted once via `openssl rand -hex 32`, stored in
-- Vault via `vault.create_secret`, and echoed into the edge function secret
-- `DINTERO_CRON_SECRET` so both sides agree. Re-running this migration on a
-- fresh DB generates a new secret — the corresponding edge function env var
-- must be updated to match.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'dintero_cron_secret') THEN
    PERFORM vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'dintero_cron_secret',
      'Shared secret for Dintero cron-triggered edge functions (sync-dintero-seller-statuses, sweep-pending-payments)'
    );
  END IF;
END $$;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'sync-dintero-seller-statuses';

SELECT cron.schedule(
  'sync-dintero-seller-statuses',
  '*/5 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://nollnnkksgicsvuthnjq.supabase.co/functions/v1/sync-dintero-seller-statuses',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'dintero_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $cron$
);

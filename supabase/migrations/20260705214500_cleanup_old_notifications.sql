-- Bound notifications-table growth (audit P2-26).
--
-- notifications has no TTL — the retention policy covers only financial records
-- and closed-seller PII — so the table grows with activity forever. This adds a
-- monthly purge of rows older than 12 months, preserving anything still
-- actionable (unresolved action_required items are kept regardless of age).
--
-- NOTE: the cron.schedule below only takes effect once this migration is
-- applied to the remote database. Like every cron here, applied ≠ committed —
-- confirm the job exists in cron.job after apply.

CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
  RETURNS void
  LANGUAGE sql SECURITY DEFINER
  SET search_path TO 'pg_catalog', 'public'
AS $$
  DELETE FROM public.notifications
  WHERE created_at < now() - interval '12 months'
    AND NOT (action_required AND resolved_at IS NULL);
$$;
REVOKE ALL ON FUNCTION public.cleanup_old_notifications() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_old_notifications() TO service_role;

-- Schedule monthly (idempotent: drop any prior job of this name first).
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-old-notifications-monthly');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

SELECT cron.schedule(
  'cleanup-old-notifications-monthly',
  '45 3 1 * *',
  'SELECT public.cleanup_old_notifications();'
);

-- Stale webhook-claim TTL.
--
-- dintero-webhook claims idempotency by inserting a processed_webhook_events
-- row with processed_at = NULL, and releases the claim (deletes the row) if
-- processing throws. If that release itself fails, the NULL-processed_at row
-- became a permanent tombstone: every Dintero redelivery hit the duplicate-key
-- fast path and the event was silently dropped forever. The daily cleanup only
-- removed terminal rows (processed_at < now() - 30 days) and never touched
-- NULL rows.
--
-- This matters most for the new PARTIALLY_REFUNDED throw path (refund amount
-- not derivable from the transaction event log → throw → release → Dintero
-- retries): a stuck claim there means a partial refund never gets recorded.
--
-- Fix: stamp claims with created_at and let the existing daily cleanup also
-- purge claims that have sat unprocessed for over an hour. A released-late
-- claim only re-opens work that is idempotent downstream (signup RPC
-- short-circuits, refund updates rewrite the same values).

ALTER TABLE public.processed_webhook_events
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM processed_webhook_events
  WHERE processed_at < NOW() - INTERVAL '30 days'
     -- Stale processing claims: claimed but never reached a terminal result
     -- and the in-flight handler is long gone. Releasing them lets Dintero's
     -- redeliveries re-run the (idempotent) work instead of being dropped.
     OR (processed_at IS NULL AND created_at < NOW() - INTERVAL '1 hour');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

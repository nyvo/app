-- Migration: Webhook Event Idempotency
-- Purpose: Prevent duplicate processing of Stripe webhook events
-- This is critical for preventing issues from Stripe retries

-- ============================================
-- PROCESSED WEBHOOK EVENTS TABLE
-- Stores Stripe event IDs that have been processed
-- ============================================

CREATE TABLE IF NOT EXISTS processed_webhook_events (
  event_id TEXT PRIMARY KEY,                    -- Stripe event ID (e.g., evt_xxx)
  event_type TEXT NOT NULL,                     -- Event type (e.g., checkout.session.completed)
  processed_at TIMESTAMPTZ DEFAULT NOW(),       -- When we processed the event
  result JSONB                                  -- Optional result data (signup_id, error, etc.)
);

-- Index for cleanup queries (events older than X days)
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed_at
  ON processed_webhook_events(processed_at);

-- Index for event type analysis
CREATE INDEX IF NOT EXISTS idx_webhook_events_type
  ON processed_webhook_events(event_type);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;

-- Only service role can access (webhook functions use service role key)
-- No policies needed since service_role bypasses RLS

-- ============================================
-- CLEANUP FUNCTION
-- Remove events older than 30 days to prevent table bloat
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM processed_webhook_events
  WHERE processed_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION cleanup_old_webhook_events TO service_role;

COMMENT ON TABLE processed_webhook_events IS
'Tracks Stripe webhook events that have been processed to ensure idempotency.
Stripe may retry webhooks, and this table prevents duplicate processing.';

COMMENT ON FUNCTION cleanup_old_webhook_events IS
'Removes processed webhook events older than 30 days.
Should be called periodically via cron job.';

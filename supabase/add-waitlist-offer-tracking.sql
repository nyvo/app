-- Migration: Add waitlist offer tracking columns
-- Purpose: Track when waitlist users receive spot offers and their claim status

-- Add offer lifecycle tracking columns to signups table
ALTER TABLE signups ADD COLUMN IF NOT EXISTS offer_sent_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE signups ADD COLUMN IF NOT EXISTS offer_expires_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE signups ADD COLUMN IF NOT EXISTS offer_status TEXT DEFAULT NULL;
ALTER TABLE signups ADD COLUMN IF NOT EXISTS offer_claim_token UUID DEFAULT NULL;

-- Add comment explaining the offer_status values
COMMENT ON COLUMN signups.offer_status IS 'Waitlist offer status: pending (offer sent, awaiting claim), claimed (spot confirmed), expired (24h passed, moved to end), skipped (teacher manually promoted someone else)';

-- Index for efficient waitlist queries (find next person to offer spot)
CREATE INDEX IF NOT EXISTS idx_signups_waitlist_position
  ON signups(course_id, waitlist_position)
  WHERE status = 'waitlist';

-- Index for finding expired offers (for cron job)
CREATE INDEX IF NOT EXISTS idx_signups_pending_offers
  ON signups(offer_expires_at)
  WHERE offer_status = 'pending' AND offer_expires_at IS NOT NULL;

-- Index for claim token lookup
CREATE INDEX IF NOT EXISTS idx_signups_claim_token
  ON signups(offer_claim_token)
  WHERE offer_claim_token IS NOT NULL;

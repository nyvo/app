-- Migration: Add stripe_checkout_session_id column to signups table
-- This column stores the Stripe Checkout Session ID for lookup on success page

ALTER TABLE signups ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_signups_stripe_checkout_session_id
  ON signups(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN signups.stripe_checkout_session_id IS 'Stripe Checkout Session ID (cs_...) for payment tracking';

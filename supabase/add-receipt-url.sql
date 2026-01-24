-- Add stripe_receipt_url column to signups table
-- This stores the Stripe-hosted receipt URL for paid signups

ALTER TABLE signups ADD COLUMN IF NOT EXISTS stripe_receipt_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN signups.stripe_receipt_url IS 'URL to Stripe-hosted receipt page for the payment';

-- Add refund tracking fields to signups table
-- refund_amount: how much was refunded (NULL = no refund, allows distinguishing full vs partial)
-- refunded_at: when the refund was processed
ALTER TABLE signups ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10, 2);
ALTER TABLE signups ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

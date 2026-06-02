-- Add the customer-note column to payment_attempts.
--
-- The note is collected on the public checkout ("Melding (valgfritt)") and must
-- live on payment_attempts between Dintero session creation and finalize:
-- create-dintero-session writes it, finalize-dintero-transaction reads
-- attempt.note and carries it onto signups.note.
--
-- The original migration that added this column
-- (20260520180000_customer_note_and_manual_drop_in_price) was authored but never
-- applied to production, and was archived during the 2026-06-01 schema baseline —
-- so production never had the column. The result: create-dintero-session's INSERT
-- failed with `column "note" does not exist`, 500-ing every paid checkout. This
-- re-adds it. Idempotent + nullable, so it is safe on any existing row.
ALTER TABLE public.payment_attempts
  ADD COLUMN IF NOT EXISTS note text;

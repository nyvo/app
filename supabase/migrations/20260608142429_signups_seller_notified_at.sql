-- Idempotency guard for the seller-facing "new signup" email, mirroring
-- confirmation_sent_at (the buyer order-confirm guard). Stamped once the
-- studio owner(s) have been emailed so the inline call + the
-- send-pending-confirmations sweep deliver exactly once.
ALTER TABLE "public"."signups"
  ADD COLUMN IF NOT EXISTS "seller_notified_at" timestamp with time zone;

COMMENT ON COLUMN "public"."signups"."seller_notified_at" IS
  'When the studio owner(s) were emailed about this signup (booking-notification template). NULL = not yet sent; the confirmations sweep retries until set.';

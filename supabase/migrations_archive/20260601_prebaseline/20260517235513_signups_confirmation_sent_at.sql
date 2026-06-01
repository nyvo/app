-- Track whether post-payment side effects (buyer order-confirm email + seller
-- booking.created notification) have been delivered for a paid signup. The
-- value is set by the path that first succeeds in delivering them.
--
-- Before this column existed, both the webhook and finalize-dintero-transaction
-- attempted these side effects in their success paths but with no retry —
-- a Resend timeout or a crash between INSERT and email left the buyer with
-- a real signup and no confirmation. Now an unset value flags the row for
-- the sweep cron to retry until delivery succeeds.
--
-- Idempotency: the seller notification already dedupes via
-- notifications.dedupe_key, and the order-confirm email is gated by this
-- column being NULL. Both can be retried indefinitely without duplication.

alter table public.signups
  add column confirmation_sent_at timestamptz;

-- Partial index keeps the sweep query cheap — only scans paid signups still
-- awaiting confirmation. Drops out of the index as soon as the column is set.
create index signups_confirmation_pending
  on public.signups (created_at)
  where payment_status = 'paid' and confirmation_sent_at is null;

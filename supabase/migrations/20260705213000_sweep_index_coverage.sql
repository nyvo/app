-- Align two sweep indexes with the queries that actually run (audit P2-16, P2-17).
--
-- P2-16 — send-pending-confirmations selects
--   payment_status='paid' AND (confirmation_sent_at IS NULL OR seller_notified_at IS NULL)
-- every 5 minutes, but signups_confirmation_pending only covered
--   confirmation_sent_at IS NULL. Rows needing only the seller notification
-- weren't in the index, and there's no other created_at index on signups, so
-- the planner fell back to a full scan at scale. Rebuild with the OR predicate.
DROP INDEX IF EXISTS public.signups_confirmation_pending;
CREATE INDEX signups_confirmation_pending
  ON public.signups (created_at)
  WHERE payment_status = 'paid'
    AND (confirmation_sent_at IS NULL OR seller_notified_at IS NULL);

-- P2-17 — sweep-pending-payments scans status IN ('pending','authorized') but
-- idx_payment_attempts_pending_sweep_stripe only covered status='pending'
-- (advisor flags it unused). Rebuild to cover both states the sweep reads.
DROP INDEX IF EXISTS public.idx_payment_attempts_pending_sweep_stripe;
CREATE INDEX idx_payment_attempts_pending_sweep_stripe
  ON public.payment_attempts (created_at)
  WHERE status IN ('pending', 'authorized')
    AND stripe_payment_intent_id IS NOT NULL;

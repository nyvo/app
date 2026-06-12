-- Partial refunds must not cancel the signup.
--
-- signups_refund_implies_cancel() was a blanket backstop: any write leaving a
-- row with payment_status='refunded' while status='confirmed' force-flipped
-- status to 'cancelled'. Correct for full refunds — but a PARTIAL refund
-- (goodwill discount or price adjustment issued from the Dintero backoffice;
-- the app has no partial-refund UI) also sets payment_status='refunded', and
-- the backstop silently cancelled the booking and freed the spot for a buyer
-- who is still attending. The spot could then be resold → double-booked at
-- the door.
--
-- Guard: only force-cancel when the refund covers the full amount paid.
-- NULL refund_amount / amount_paid is treated as full (conservative — keeps
-- the old behavior for any writer that doesn't record amounts).
--
-- All app-initiated full-refund paths (dintero-webhook REFUNDED,
-- teacher-cancel-signup, cancel-course) set status explicitly and never
-- relied on this trigger; the partial-refund webhook branch
-- (dintero-webhook PARTIALLY_REFUNDED) is the only writer that reaches it
-- with a confirmed row.

CREATE OR REPLACE FUNCTION public.signups_refund_implies_cancel()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
  IF NEW.payment_status = 'refunded'
     AND NEW.status = 'confirmed'
     AND (
       NEW.refund_amount IS NULL
       OR NEW.amount_paid IS NULL
       OR NEW.refund_amount >= NEW.amount_paid
     )
  THEN
    NEW.status := 'cancelled';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.signups_refund_implies_cancel() IS
  'Backstop: a FULL refund (refund_amount >= amount_paid, or unknown amounts) on a confirmed signup forces status=cancelled. Partial refunds keep the signup confirmed — the buyer keeps their spot.';

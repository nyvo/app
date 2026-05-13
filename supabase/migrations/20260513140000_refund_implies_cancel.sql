-- Refunded signups must be cancelled. Enforced via a BEFORE INSERT/UPDATE
-- trigger so callers don't have to remember to set both columns — if you mark
-- payment_status='refunded' on an otherwise-confirmed signup, status is
-- auto-set to 'cancelled'. Preserves course_cancelled when it's already there
-- (course-wide cancellation flow sets that first, then processes refunds).

CREATE OR REPLACE FUNCTION signups_refund_implies_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.payment_status = 'refunded' AND NEW.status = 'confirmed' THEN
    NEW.status := 'cancelled';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER signups_refund_implies_cancel_trigger
  BEFORE INSERT OR UPDATE ON signups
  FOR EACH ROW
  EXECUTE FUNCTION signups_refund_implies_cancel();

-- Backfill any existing rows that violate the rule (e.g., test seed data).
UPDATE signups SET status = 'cancelled'
WHERE payment_status = 'refunded' AND status = 'confirmed';

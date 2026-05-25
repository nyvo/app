-- Add an explicit `cancelled_at` to signups so the activity log doesn't have
-- to lean on `updated_at` (which is dirtied by any later edit, e.g. a refund
-- on an already-cancelled row would rewrite the cancellation timestamp).
--
-- A BEFORE trigger fills it in whenever status transitions into
-- cancelled / course_cancelled, so callers that forget the column still
-- get a correct value. Existing rows are backfilled from updated_at — the
-- best proxy available — and only when status is already terminal.

ALTER TABLE public.signups
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

UPDATE public.signups
SET cancelled_at = updated_at
WHERE status IN ('cancelled', 'course_cancelled')
  AND cancelled_at IS NULL;

CREATE OR REPLACE FUNCTION public.signups_set_cancelled_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.status IN ('cancelled', 'course_cancelled')
     AND NEW.cancelled_at IS NULL
     AND (TG_OP = 'INSERT' OR OLD.status NOT IN ('cancelled', 'course_cancelled'))
  THEN
    NEW.cancelled_at := now();
  END IF;
  RETURN NEW;
END;
$$;

-- Name chosen so this fires AFTER signups_refund_implies_cancel_trigger
-- (BEFORE triggers run in alphabetical order). That lets refund-implies-
-- cancel flip status to 'cancelled' first; we then stamp cancelled_at.
DROP TRIGGER IF EXISTS signups_set_cancelled_at_trigger ON public.signups;
CREATE TRIGGER signups_set_cancelled_at_trigger
  BEFORE INSERT OR UPDATE ON public.signups
  FOR EACH ROW
  EXECUTE FUNCTION public.signups_set_cancelled_at();

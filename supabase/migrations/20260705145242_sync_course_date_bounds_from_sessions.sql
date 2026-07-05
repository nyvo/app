-- courses.start_date / end_date are load-bearing on the public storefront
-- (ordering, active/archive filtering, "has started" checks) but were only
-- written at course creation. Session reschedules (update-session edge
-- function) and per-day edits on the course page never synced them back, so
-- the columns drifted from the real timeline in course_sessions.
--
-- Fix at the root: derive both columns from the session rows on every session
-- write. Conventions preserved from the create path:
--   * bounds are computed over non-cancelled sessions; if every session is
--     cancelled, fall back to all sessions so the course keeps a timeline
--     (the cancelled-course grace filter reads start_date);
--   * end_date is set only when the course spans more than one calendar day,
--     otherwise NULL (a genuine one-day class — daySpan() relies on this);
--   * a course with no session rows at all is left untouched.

CREATE OR REPLACE FUNCTION public.sync_course_date_bounds()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_course_id uuid := COALESCE(NEW.course_id, OLD.course_id);
  v_first date;
  v_last date;
BEGIN
  SELECT min(s.session_date) FILTER (WHERE s.status IS DISTINCT FROM 'cancelled'),
         max(s.session_date) FILTER (WHERE s.status IS DISTINCT FROM 'cancelled')
    INTO v_first, v_last
    FROM public.course_sessions s
   WHERE s.course_id = v_course_id;

  IF v_first IS NULL THEN
    SELECT min(s.session_date), max(s.session_date)
      INTO v_first, v_last
      FROM public.course_sessions s
     WHERE s.course_id = v_course_id;
  END IF;

  IF v_first IS NULL THEN
    RETURN NULL;  -- no sessions left (e.g. mid-cascade delete): leave the course as-is
  END IF;

  UPDATE public.courses c
     SET start_date = v_first,
         end_date   = CASE WHEN v_last > v_first THEN v_last ELSE NULL END
   WHERE c.id = v_course_id
     AND (c.start_date IS DISTINCT FROM v_first
          OR c.end_date IS DISTINCT FROM CASE WHEN v_last > v_first THEN v_last ELSE NULL END);

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_course_date_bounds() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_course_date_bounds() FROM anon;
REVOKE ALL ON FUNCTION public.sync_course_date_bounds() FROM authenticated;

DROP TRIGGER IF EXISTS sync_course_date_bounds ON public.course_sessions;
CREATE TRIGGER sync_course_date_bounds
  AFTER INSERT OR DELETE OR UPDATE OF session_date, status ON public.course_sessions
  FOR EACH ROW EXECUTE FUNCTION public.sync_course_date_bounds();

-- One-time backfill: reconcile any drift that already happened.
WITH bounds AS (
  SELECT s.course_id,
         COALESCE(min(s.session_date) FILTER (WHERE s.status IS DISTINCT FROM 'cancelled'),
                  min(s.session_date)) AS first_day,
         COALESCE(max(s.session_date) FILTER (WHERE s.status IS DISTINCT FROM 'cancelled'),
                  max(s.session_date)) AS last_day
    FROM public.course_sessions s
   GROUP BY s.course_id
)
UPDATE public.courses c
   SET start_date = b.first_day,
       end_date   = CASE WHEN b.last_day > b.first_day THEN b.last_day ELSE NULL END
  FROM bounds b
 WHERE b.course_id = c.id
   AND (c.start_date IS DISTINCT FROM b.first_day
        OR c.end_date IS DISTINCT FROM CASE WHEN b.last_day > b.first_day THEN b.last_day ELSE NULL END);

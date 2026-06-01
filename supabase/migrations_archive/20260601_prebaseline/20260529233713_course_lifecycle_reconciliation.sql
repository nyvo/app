-- Make the persisted course lifecycle honest. The status enum already has
-- upcoming/active/completed, but nothing ever wrote active/completed — a
-- published course stayed 'upcoming' forever, forcing every reader to re-derive
-- the real lifecycle from dates. This reconciles status from the true timeline
-- (sessions preferred, course dates as fallback) so status is the source of
-- truth for all consumers. Transitions are date-granular (Oslo calendar day):
-- a course is 'active' through its last session day and 'completed' the day
-- after, so an hourly tick is exact (it only matters around Oslo midnight).
-- draft/cancelled are teacher-controlled workflow states and are never touched.

CREATE OR REPLACE FUNCTION public.reconcile_course_lifecycle()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Europe/Oslo')::date;
  v_count integer;
BEGIN
  WITH bounds AS (
    SELECT
      c.id,
      c.status AS current_status,
      COALESCE(
        (SELECT min(s.session_date) FROM public.course_sessions s
          WHERE s.course_id = c.id AND s.status IS DISTINCT FROM 'cancelled'),
        c.start_date
      ) AS first_day,
      COALESCE(
        (SELECT max(s.session_date) FROM public.course_sessions s
          WHERE s.course_id = c.id AND s.status IS DISTINCT FROM 'cancelled'),
        c.end_date,
        c.start_date
      ) AS last_day
    FROM public.courses c
    WHERE c.status IN ('upcoming', 'active', 'completed')  -- only published lifecycle; never draft/cancelled
  ),
  computed AS (
    SELECT
      id,
      CASE
        WHEN first_day IS NULL          THEN 'upcoming'::course_status   -- no timeline → can't advance
        WHEN v_today < first_day        THEN 'upcoming'::course_status
        WHEN v_today > last_day         THEN 'completed'::course_status
        ELSE 'active'::course_status                                     -- inclusive of first & last day
      END AS next_status
    FROM bounds
  )
  UPDATE public.courses c
  SET status = comp.next_status
  FROM computed comp
  WHERE c.id = comp.id
    AND c.status IS DISTINCT FROM comp.next_status;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- The Dintero publish gate must only fire when a course ENTERS a published
-- state from draft/cancelled — not on automated lifecycle moves between
-- upcoming/active/completed (which reconcile_course_lifecycle performs), or it
-- would block transitions if a seller's onboarding ever lapsed.
CREATE OR REPLACE FUNCTION public.enforce_course_publish_requires_dintero()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_onboarding_complete boolean;
BEGIN
  IF NEW.status NOT IN ('upcoming', 'active') THEN
    RETURN NEW;
  END IF;

  -- Already in a published lifecycle state → this is a lifecycle move, not a
  -- publish action. Exempt.
  IF TG_OP = 'UPDATE' AND OLD.status IN ('upcoming', 'active', 'completed') THEN
    RETURN NEW;
  END IF;

  SELECT dintero_onboarding_complete
    INTO v_onboarding_complete
    FROM public.sellers
   WHERE id = NEW.seller_id;

  IF NOT COALESCE(v_onboarding_complete, false) THEN
    RAISE EXCEPTION 'dintero_onboarding_required'
      USING ERRCODE = 'P0001',
            HINT = 'Seller must complete Dintero onboarding before publishing a course.';
  END IF;

  RETURN NEW;
END;
$$;

-- Hourly reconciliation. Pure SQL — no edge function needed. Hourly is exact
-- for date-granular transitions (they only flip at Oslo midnight) and DST-proof.
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'reconcile-course-lifecycle';
SELECT cron.schedule(
  'reconcile-course-lifecycle',
  '0 * * * *',
  $cron$ SELECT public.reconcile_course_lifecycle(); $cron$
);

-- One-time backfill so existing courses are correct immediately.
SELECT public.reconcile_course_lifecycle();

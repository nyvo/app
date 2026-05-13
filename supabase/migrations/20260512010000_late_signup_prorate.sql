-- Late-signup auto-prorate — Phase 1: schema migration
--
-- Adds the columns needed to model a buyer joining a course mid-way. The
-- price they pay is prorated against remaining weeks (computed in the
-- frontend + Dintero session creation), and per-session capacity counts
-- them only from `package_start_date` forward.
--
-- See tasks/dashboard-rebuild-status.md "Plan: late-signup auto-prorate".

BEGIN;

-- 1. Late-signup window start on signups + payment_attempts. Default
--    NULL; the RPC sets it explicitly: today for late buyers, course
--    start_date for everyone else.
ALTER TABLE public.signups
  ADD COLUMN IF NOT EXISTS package_start_date DATE;

ALTER TABLE public.payment_attempts
  ADD COLUMN IF NOT EXISTS package_start_date DATE;

-- 2. Per-course opt-out. Default TRUE — most teachers want bums on seats.
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS allow_late_signup BOOLEAN NOT NULL DEFAULT TRUE;

-- 3. Backfill: for every existing signup with a course start_date, set
--    package_start_date = course.start_date. Same shape as how
--    package_end_date was historically computed.
UPDATE public.signups s
   SET package_start_date = c.start_date
  FROM public.courses c
 WHERE s.course_id = c.id
   AND s.package_start_date IS NULL
   AND c.start_date IS NOT NULL;

-- payment_attempts holds pre-payment context, mostly transient — backfill
-- only the rows that haven't been resolved yet (finalized rows are
-- mirrored to signups already).
UPDATE public.payment_attempts pa
   SET package_start_date = c.start_date
  FROM public.courses c
 WHERE pa.course_id = c.id
   AND pa.package_start_date IS NULL
   AND c.start_date IS NOT NULL;

-- 4. Update count_signups_for_session to filter by BOTH window edges.
--    A late signup with package_start_date = today only contributes to
--    sessions on or after `today`. Earlier sessions don't count them.
CREATE OR REPLACE FUNCTION public.count_signups_for_session(p_course_session_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_session_date DATE;
  v_course_id    UUID;
  v_count        INT;
BEGIN
  SELECT cs.session_date, cs.course_id
    INTO v_session_date, v_course_id
  FROM public.course_sessions cs
  WHERE cs.id = p_course_session_id;

  IF v_session_date IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.signups s
  WHERE s.course_id = v_course_id
    AND s.status = 'confirmed'
    AND (
      s.course_session_id = p_course_session_id
      OR
      (s.ticket_kind_snapshot IS DISTINCT FROM 'drop_in'
       AND (s.package_start_date IS NULL OR v_session_date >= s.package_start_date)
       AND (s.package_end_date   IS NULL OR v_session_date <= s.package_end_date))
    );

  RETURN v_count;
END;
$function$;

COMMIT;

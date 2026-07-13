-- Course instructor attribution (spec: docs/superpowers/specs/
-- 2026-07-14-course-instructor-attribution-design.md).
--
-- 1. instructors: a studio's saved instructor names. No logins, no anon access
--    — public pages read the denormalized courses.instructor_name instead.
-- 2. courses.instructor_id is re-added fresh — the original (an all-NULL FK
--    to profiles, referenced nowhere in app code) was dropped 2026-07-02 by
--    business_consolidation. The new column references instructors so the
--    saved entry is the identity and renames can propagate. ON DELETE SET
--    NULL keeps instructor_name on the course when an instructor is removed
--    — past attribution stays truthful.
-- 3. save_course_schedule learns the two columns (key-presence guarded like
--    every other field) so the CoursePage settings save can write them.
--
-- Known accepted limitation: nothing stops a seller writing another seller's
-- instructor_id (FK checks existence, not tenancy). Harmless — display comes
-- from instructor_name, and instructors are not readable cross-tenant — so no
-- trigger; revisit only if instructors ever gain public data.

CREATE TABLE public.instructors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_instructors_seller ON public.instructors(seller_id);

ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;

-- Same member-scoped idiom as the courses policies (roles are owner-only
-- since 20260606140000, so member == owner).
CREATE POLICY "instructors_all_member" ON public.instructors
  TO authenticated
  USING (public.is_seller_member(seller_id, (SELECT auth.uid())))
  WITH CHECK (public.is_seller_member(seller_id, (SELECT auth.uid())));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.instructors TO authenticated;
GRANT ALL ON TABLE public.instructors TO service_role;

-- Re-add the column (the profiles-FK original was dropped 2026-07-02 in
-- business_consolidation §2). authenticated's table-level grants on courses
-- cover new columns; anon does NOT need it (public pages read instructor_name).
ALTER TABLE public.courses
  ADD COLUMN instructor_id uuid REFERENCES public.instructors(id) ON DELETE SET NULL;

CREATE INDEX idx_courses_instructor ON public.courses(instructor_id)
  WHERE instructor_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.save_course_schedule(
  p_course_id uuid,
  p_course jsonb,
  p_drop_in jsonb DEFAULT NULL,
  p_sessions jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_course       public.courses%ROWTYPE;
  v_is_draft     boolean;
  v_el           jsonb;
  v_idx          int;
  v_id           uuid;
  v_row          public.course_sessions%ROWTYPE;
  v_desired_ids  uuid[] := '{}';
  v_missing      int;
  v_rescheduled  jsonb := '[]'::jsonb;
  v_skipped_new  int := 0;
  v_changed      boolean;
  v_new_date     date;
  v_new_start    time;
  v_touch_end    boolean;
  v_new_end      time;
  v_final_number int;
BEGIN
  SELECT * INTO v_course FROM public.courses WHERE id = p_course_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'course_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.is_seller_member(v_course.seller_id, auth.uid()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  v_is_draft := v_course.status = 'draft';

  -- ── Validation pass (no writes yet — a RAISE here costs nothing) ────────
  IF p_sessions IS NOT NULL THEN
    IF jsonb_typeof(p_sessions) <> 'array' THEN
      RAISE EXCEPTION 'invalid_sessions_payload';
    END IF;

    FOR v_el IN SELECT * FROM jsonb_array_elements(p_sessions) LOOP
      IF v_el ? 'id' AND v_el->>'id' IS NOT NULL THEN
        v_id := (v_el->>'id')::uuid;
        PERFORM 1 FROM public.course_sessions
          WHERE id = v_id AND course_id = p_course_id;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'unknown_session %', v_id;
        END IF;
        v_desired_ids := v_desired_ids || v_id;
      END IF;
    END LOOP;

    SELECT count(*) INTO v_missing FROM public.course_sessions
      WHERE course_id = p_course_id AND NOT (id = ANY(v_desired_ids));
    IF v_missing > 0 AND NOT v_is_draft THEN
      RAISE EXCEPTION 'cannot_remove_published_day';
    END IF;
  END IF;

  -- ── Course fields (key-presence guarded so absent keys keep values) ─────
  UPDATE public.courses SET
    title             = CASE WHEN p_course ? 'title' THEN p_course->>'title' ELSE title END,
    description       = CASE WHEN p_course ? 'description' THEN p_course->>'description' ELSE description END,
    location          = CASE WHEN p_course ? 'location' THEN p_course->>'location' ELSE location END,
    location_address  = CASE WHEN p_course ? 'location_address' THEN p_course->>'location_address' ELSE location_address END,
    location_lat      = CASE WHEN p_course ? 'location_lat' THEN (p_course->>'location_lat')::double precision ELSE location_lat END,
    location_lon      = CASE WHEN p_course ? 'location_lon' THEN (p_course->>'location_lon')::double precision ELSE location_lon END,
    location_place_id = CASE WHEN p_course ? 'location_place_id' THEN p_course->>'location_place_id' ELSE location_place_id END,
    max_participants  = CASE WHEN p_course ? 'max_participants' THEN (p_course->>'max_participants')::integer ELSE max_participants END,
    price             = CASE WHEN p_course ? 'price' THEN (p_course->>'price')::numeric ELSE price END,
    time_schedule     = CASE WHEN p_course ? 'time_schedule' THEN p_course->>'time_schedule' ELSE time_schedule END,
    duration          = CASE WHEN p_course ? 'duration' THEN (p_course->>'duration')::integer ELSE duration END,
    instructor_id     = CASE WHEN p_course ? 'instructor_id' THEN (p_course->>'instructor_id')::uuid ELSE instructor_id END,
    instructor_name   = CASE WHEN p_course ? 'instructor_name' THEN p_course->>'instructor_name' ELSE instructor_name END,
    updated_at        = now()
  WHERE id = p_course_id;

  -- ── Drop-in tier upsert (only when the save includes it) ────────────────
  IF p_drop_in IS NOT NULL THEN
    UPDATE public.course_signup_packages
      SET is_active = true, label = 'Drop-in',
          price = (p_drop_in->>'price')::numeric, updated_at = now()
      WHERE course_id = p_course_id AND ticket_kind = 'drop_in';
    IF NOT FOUND THEN
      INSERT INTO public.course_signup_packages
        (course_id, label, ticket_kind, audience, price, is_active, is_default)
      VALUES
        (p_course_id, 'Drop-in', 'drop_in', 'standard',
         (p_drop_in->>'price')::numeric, true, false);
    END IF;
  END IF;

  -- ── Session diff ─────────────────────────────────────────────────────────
  IF p_sessions IS NOT NULL THEN
    -- Deletions (validated above: only reachable for drafts).
    DELETE FROM public.course_sessions
      WHERE course_id = p_course_id AND NOT (id = ANY(v_desired_ids));

    FOR v_el, v_idx IN
      SELECT value, ordinality FROM jsonb_array_elements(p_sessions) WITH ORDINALITY
    LOOP
      IF (v_el->>'keep')::boolean IS TRUE THEN
        CONTINUE;
      END IF;

      v_new_date  := (v_el->>'session_date')::date;
      v_new_start := (v_el->>'start_time')::time;
      v_touch_end := v_el ? 'end_time';
      v_new_end   := NULLIF(v_el->>'end_time', '')::time;

      IF v_el ? 'id' AND v_el->>'id' IS NOT NULL THEN
        v_id := (v_el->>'id')::uuid;
        SELECT * INTO v_row FROM public.course_sessions WHERE id = v_id;

        v_changed := v_row.session_date <> v_new_date
          OR v_row.start_time <> v_new_start
          OR (v_touch_end AND v_row.end_time IS DISTINCT FROM v_new_end);
        IF NOT v_changed THEN
          CONTINUE;
        END IF;

        IF NOT v_is_draft THEN
          v_rescheduled := v_rescheduled || jsonb_build_object(
            'session_id', v_row.id,
            'old_date', v_row.session_date,
            'old_start_time', to_char(v_row.start_time, 'HH24:MI'),
            'new_date', v_new_date,
            'new_start_time', to_char(v_new_start, 'HH24:MI')
          );
        END IF;

        UPDATE public.course_sessions SET
          session_date = v_new_date,
          start_time   = v_new_start,
          end_time     = CASE WHEN v_touch_end THEN v_new_end ELSE end_time END,
          updated_at   = now()
        WHERE id = v_id;
      ELSE
        -- New day: drafts only. On a live course the old flow silently
        -- skipped these; keep that, but report the count so the UI can say so.
        IF NOT v_is_draft THEN
          v_skipped_new := v_skipped_new + 1;
          CONTINUE;
        END IF;
        INSERT INTO public.course_sessions
          (course_id, session_date, start_time, end_time, session_number, status)
        VALUES
          -- Placeholder number in its own band (2M+); existing rows get
          -- offset into the 1M band below, so the two can never collide.
          (p_course_id, v_new_date, v_new_start, v_new_end, 2000000 + v_idx, 'upcoming');
      END IF;
    END LOOP;

    -- Draft renumbering: 1..n by date+time, via the offset trick so the
    -- UNIQUE (course_id, session_number) constraint never sees a transient
    -- collision mid-shuffle (fresh inserts sit in the 2M band, untouched here).
    IF v_is_draft THEN
      UPDATE public.course_sessions
        SET session_number = session_number + 1000000
        WHERE course_id = p_course_id AND session_number < 1000000;
      UPDATE public.course_sessions cs
        SET session_number = numbered.rn
        FROM (
          SELECT id, row_number() OVER (ORDER BY session_date, start_time, id) AS rn
          FROM public.course_sessions WHERE course_id = p_course_id
        ) numbered
        WHERE cs.id = numbered.id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'rescheduled', v_rescheduled,
    'skipped_new_days', v_skipped_new
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.save_course_schedule(uuid, jsonb, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_course_schedule(uuid, jsonb, jsonb, jsonb) TO authenticated;

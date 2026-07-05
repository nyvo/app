-- save_course_schedule: one transactional RPC replacing CoursePage's
-- browser-side multi-write save saga (course update → drop-in tier sync →
-- per-day session delete/create/update loops). The old flow could be killed
-- mid-loop by a network drop, leaving the course half-updated with a
-- hand-rolled re-baselining apparatus (committedSessions, skipNextDaysSyncRef)
-- trying to make retries safe. Here every write commits or none do.
--
-- Design:
-- - SECURITY INVOKER: runs as the calling teacher under existing RLS policies
--   (which already permit member writes to courses / course_sessions /
--   course_signup_packages). An explicit is_seller_member check gives a clean
--   'forbidden' error instead of silent zero-row updates.
-- - Validate BEFORE the first write; any violation RAISEs so the transaction
--   rolls back as a unit. No WHEN OTHERS — unexpected errors surface as RPC
--   transport errors and roll back.
-- - Session diff is computed server-side from the desired state:
--     {id, session_date, start_time[, end_time]}  → upsert-style target
--     {id, keep: true}                            → leave the row untouched
--     no id                                       → new day (drafts only;
--                                                   counted+skipped when live)
--   Rows missing from the desired set are deleted for drafts and a hard error
--   for published courses (the UI never produces that; refuse rather than
--   silently drop a day participants booked).
-- - Published-course changes are RETURNED as `rescheduled` (with old values);
--   the CLIENT decides which of them notify participants (single-format
--   reschedules do; series bulk time changes don't — parity with the old
--   flow). Emails stay best-effort post-commit, exactly as before.
-- - Drafts are renumbered 1..n in desired order after the diff, via the
--   +1000000 offset trick (course_sessions has UNIQUE (course_id,
--   session_number) and renumbering in place would collide transiently).
--   This also fixes a latent bug in the old client flow, where new days got
--   array-index numbers that could collide with surviving rows.

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

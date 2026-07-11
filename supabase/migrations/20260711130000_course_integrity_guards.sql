-- Launch audit: two direct-write gaps around course cancellation and schedule
-- editing. `authenticated` holds full table-level UPDATE on courses and DELETE
-- on course_sessions (courses_update_member / course_sessions_delete_member),
-- so a plain PostgREST call can do what only the sanctioned server flows
-- should be allowed to do:
--
--   1. Flip courses.status to 'cancelled' directly, skipping the cancel-course
--      edge function's refund + notification work for any paid signup.
--   2. Delete a course_sessions row out from under a published course that
--      still has participants, skipping reschedule/refund handling.
--
-- Service-role / SECURITY DEFINER-as-postgres detection idiom copied from the
-- fixed sellers_block_protected_columns (20260610120000, refined
-- 20260626120000): PostgREST does `SET ROLE` to the JWT's role, so a
-- service-key request runs as current_user = 'service_role'; a SECURITY
-- DEFINER function owned by postgres (e.g. delete_course_cascade) runs as
-- current_user = 'postgres'. Checking current_user, not
-- request.jwt.claim.role (removed by PostgREST), is what actually works.

-- ── 1. courses: block a direct status flip to 'cancelled' when money is owed ─
-- Mirrors enforce_course_delete_retention's reasoning: SECURITY DEFINER is
-- required because the check must count signups regardless of the calling
-- seller's own RLS visibility (signups_select_member_or_buyer already lets a
-- member read their own signups, but we don't want this guard's correctness
-- to depend on that policy never tightening).
CREATE OR REPLACE FUNCTION public.enforce_course_cancel_requires_refund_flow()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_paid_signups int;
BEGIN
  IF NEW.status <> 'cancelled' OR OLD.status IS NOT DISTINCT FROM 'cancelled' THEN
    RETURN NEW;
  END IF;

  IF current_user IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO v_paid_signups
  FROM public.signups s
  WHERE s.course_id = NEW.id AND s.payment_status = 'paid';

  IF v_paid_signups > 0 THEN
    RAISE EXCEPTION 'cancel_course_requires_refund_flow: use the cancel-course function'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.enforce_course_cancel_requires_refund_flow()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_course_cancel_requires_refund_flow ON public.courses;
CREATE TRIGGER enforce_course_cancel_requires_refund_flow
  BEFORE UPDATE OF status ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.enforce_course_cancel_requires_refund_flow();

-- ── 2. course_sessions: block deleting a live day off a published course ────
-- Draft courses are exempt outright (their days are freely rearranged pre-
-- publish, and save_course_schedule's own renumbering leans on that). Once a
-- course is no longer 'draft', a day may only be removed when the course has
-- no active (status = 'confirmed') signups — matching the "active" signup
-- definition already used by count_signups_for_session /
-- count_signups_by_ticket_type. If the parent course row is gone (this fires
-- as part of a courses row's own ON DELETE CASCADE), treat it like draft: the
-- courses-side triggers/grants are the authority for that delete, not this one.
CREATE OR REPLACE FUNCTION public.enforce_course_session_delete_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_course_status  public.course_status;
  v_active_signups int;
BEGIN
  IF current_user IN ('service_role', 'postgres', 'supabase_admin')
     OR current_setting('app.course_sessions_server_write', true) = 'true' THEN
    RETURN OLD;
  END IF;

  SELECT status INTO v_course_status FROM public.courses WHERE id = OLD.course_id;

  IF v_course_status IS NULL OR v_course_status = 'draft' THEN
    RETURN OLD;
  END IF;

  SELECT count(*) INTO v_active_signups
  FROM public.signups s
  WHERE s.course_id = OLD.course_id AND s.status = 'confirmed';

  IF v_active_signups > 0 THEN
    RAISE EXCEPTION 'cannot_delete_session_with_active_signups: use save_course_schedule or the cancel-course flow'
      USING ERRCODE = '42501';
  END IF;

  RETURN OLD;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.enforce_course_session_delete_guard()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_course_session_delete_guard ON public.course_sessions;
CREATE TRIGGER enforce_course_session_delete_guard
  BEFORE DELETE ON public.course_sessions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_course_session_delete_guard();

-- ── 3. save_course_schedule: opt into the sanctioned bypass ─────────────────
-- This RPC is SECURITY INVOKER (runs as the calling teacher, current_user =
-- 'authenticated'), so it gets none of the postgres-owner free pass that
-- SECURITY DEFINER functions like delete_course_cascade get automatically.
-- Its own cannot_remove_published_day guard (above the session diff, unchanged
-- below) already enforces the real invariant on published courses — days are
-- never actually removed there, only re-dated/kept — so the DELETE below is
-- either a genuine draft-day removal (course_sessions_delete_guard already
-- exempts drafts) or a no-op on published courses. The flag is set
-- unconditionally and early regardless, so the RPC's internal delete keeps
-- working even if either guard's conditions are tightened independently in
-- the future. Reproduced verbatim from 20260705200000 with exactly one
-- addition (marked below); grants/body otherwise unchanged.
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

  -- ADDED: sanctioned-path flag for enforce_course_session_delete_guard. See
  -- the note above the CREATE OR REPLACE — belt-and-suspenders, not solely
  -- relying on the draft-exemption / zero-row coincidence.
  PERFORM set_config('app.course_sessions_server_write', 'true', true);

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

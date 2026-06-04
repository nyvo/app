-- Account deletion — STEP 2: database backstop, built BEHIND the existing 409.
-- This does NOT re-enable self-service deletion. It builds the safe foundation:
--   1. FK fixes so a profile delete isn't blocked by NO ACTION refs
--   2. one private blocker helper (single source of truth)
--   3. a public no-arg preflight RPC (auth.uid only — no cross-user inspection)
--   4. a BEFORE DELETE guard on profiles that serializes co-owner deletes
-- Deletion auditing is intentionally NOT included here: a per-deletion row keyed
-- on the (pseudonymous) profile id is itself retained personal data, and it needs
-- an explicit legal purpose + retention deadline + cleanup job before it exists.
-- See docs/account-deletion-design.md.

-- 1. FK fixes ----------------------------------------------------------------
-- instructor_id is already nullable: clear the link on delete. ACTIVE-course
-- assignment is still a hard blocker (the guard below), because instructor_name
-- is a denormalized snapshot that would otherwise stay publicly rendered.
ALTER TABLE public.courses DROP CONSTRAINT courses_instructor_id_fkey;
ALTER TABLE public.courses
  ADD CONSTRAINT courses_instructor_id_fkey
  FOREIGN KEY (instructor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- invited_by is NOT NULL today; make it nullable, then SET NULL on delete.
ALTER TABLE public.team_affiliations ALTER COLUMN invited_by DROP NOT NULL;
ALTER TABLE public.team_affiliations DROP CONSTRAINT team_affiliations_invited_by_fkey;
ALTER TABLE public.team_affiliations
  ADD CONSTRAINT team_affiliations_invited_by_fkey
  FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Private blocker helper (single source of truth) -------------------------
-- SECURITY DEFINER so it has full read visibility (storage.objects, all sellers)
-- regardless of caller. Takes an explicit user id; NOT exposed to clients.
CREATE OR REPLACE FUNCTION public._account_deletion_blockers(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_sole_owner   jsonb;
  v_active_inst  jsonb;
  v_storage      int;
BEGIN
  -- (a) sellers where this user is an owner AND the only owner
  SELECT coalesce(jsonb_agg(jsonb_build_object('seller_id', s.id, 'name', s.name)), '[]'::jsonb)
  INTO v_sole_owner
  FROM public.sellers s
  WHERE EXISTS (
          SELECT 1 FROM public.seller_members sm
          WHERE sm.seller_id = s.id AND sm.user_id = p_user_id AND sm.role = 'owner')
    AND (SELECT count(*) FROM public.seller_members sm2
         WHERE sm2.seller_id = s.id AND sm2.role = 'owner') = 1;

  -- (b) courses where this user is the assigned instructor AND the course still
  --     runs today or later. Mirrors deriveCourseDisplayStatus (_shared/
  --     course-status.ts): "lastDay" = the max NON-cancelled session date when
  --     sessions exist, else end_date/start_date; the course is done once today
  --     passes lastDay. We block only on positive evidence of a current/future
  --     course, so completed courses (incl. sessionless ones with NULL dates) do
  --     NOT block deletion forever.
  SELECT coalesce(jsonb_agg(jsonb_build_object('course_id', c.id, 'title', c.title)), '[]'::jsonb)
  INTO v_active_inst
  FROM public.courses c
  WHERE c.instructor_id = p_user_id
    AND c.status NOT IN ('cancelled', 'draft')
    AND (
      -- a live (non-cancelled) session today or later
      EXISTS (
        SELECT 1 FROM public.course_sessions cs
        WHERE cs.course_id = c.id
          AND cs.status IS DISTINCT FROM 'cancelled'
          AND cs.session_date >= current_date
      )
      -- or no live sessions at all → fall back exactly as the app does:
      --   * start_date NULL  → no usable timeline; the app derives from status
      --     (active/upcoming block, completed does not)
      --   * start_date set   → lastDay = end_date clamped up to start_date
      --     (greatest(...)), block while today <= lastDay
      OR (
        NOT EXISTS (
          SELECT 1 FROM public.course_sessions cs2
          WHERE cs2.course_id = c.id
            AND cs2.status IS DISTINCT FROM 'cancelled'
        )
        AND (
          (c.start_date IS NULL AND c.status IN ('active', 'upcoming'))
          OR (
            c.start_date IS NOT NULL
            AND greatest(coalesce(c.end_date, c.start_date), c.start_date) >= current_date
          )
        )
      )
    );

  -- (c) Storage objects owned by the user (both legacy owner + owner_id)
  SELECT count(*) INTO v_storage
  FROM storage.objects o
  WHERE o.owner = p_user_id OR o.owner_id = p_user_id::text;

  RETURN jsonb_build_object(
    'sole_owner_of',             v_sole_owner,
    'active_instructor_courses', v_active_inst,
    'owned_storage_objects',     v_storage,
    'deletable',
      jsonb_array_length(v_sole_owner) = 0
      AND jsonb_array_length(v_active_inst) = 0
      AND v_storage = 0
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public._account_deletion_blockers(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public._account_deletion_blockers(uuid) TO service_role;

-- 3. Public no-arg preflight (callers can only inspect themselves) -----------
CREATE OR REPLACE FUNCTION public.account_deletion_preflight()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT public._account_deletion_blockers(auth.uid());
$function$;

REVOKE EXECUTE ON FUNCTION public.account_deletion_preflight() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.account_deletion_preflight() TO authenticated;

-- 4. BEFORE DELETE guard on profiles -----------------------------------------
-- The atomic backstop: fires on the auth.users -> profiles cascade too, so even
-- a direct auth.admin.deleteUser() is refused when blockers exist.
CREATE OR REPLACE FUNCTION public.enforce_profile_delete_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_blockers jsonb;
BEGIN
  -- Serialize concurrent co-owner deletions: lock every seller this profile
  -- owns, ordered by id (deadlock-free), BEFORE the owner count is taken. Two
  -- co-owners deleting at once will serialize here; whoever runs second
  -- re-evaluates as sole owner and is blocked. Ownership-transfer RPCs must
  -- take the same lock.
  PERFORM 1
  FROM public.sellers s
  WHERE EXISTS (
    SELECT 1 FROM public.seller_members sm
    WHERE sm.seller_id = s.id AND sm.user_id = OLD.id AND sm.role = 'owner')
  ORDER BY s.id
  FOR UPDATE;

  v_blockers := public._account_deletion_blockers(OLD.id);

  IF (v_blockers->>'deletable')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'Cannot delete profile %: unresolved account-deletion blockers %',
      OLD.id, v_blockers
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN OLD;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.enforce_profile_delete_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_profile_delete_guard ON public.profiles;
CREATE TRIGGER trg_profile_delete_guard
  BEFORE DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_delete_guard();

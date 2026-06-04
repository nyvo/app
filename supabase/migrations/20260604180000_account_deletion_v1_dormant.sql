-- Account deletion v1 — a sole owner may delete once their studio is "dormant"
-- (no course running today or later, no money in flight). On deletion the studio
-- is closed + anonymized and ALL financial records are retained. A studio with
-- unfinished business still blocks, with a specific reason. The edge function
-- orchestrates close-then-delete; this migration provides the building blocks.
-- See docs/account-deletion-design.md.

-- 0. Tombstone marker on sellers ---------------------------------------------
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS closed_at timestamptz;

-- 1. One reusable "course runs today or later" predicate ---------------------
-- Mirrors deriveCourseDisplayStatus (_shared/course-status.ts): non-cancelled
-- sessions are authoritative (max day >= today), falling back to start/end dates
-- (end clamped up to start), and to persisted status when there is no timeline.
CREATE OR REPLACE FUNCTION public._course_runs_today_or_later(p_course_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = p_course_id
      AND c.status NOT IN ('cancelled', 'draft')
      AND (
        EXISTS (
          SELECT 1 FROM public.course_sessions cs
          WHERE cs.course_id = c.id
            AND cs.status IS DISTINCT FROM 'cancelled'
            AND cs.session_date >= current_date
        )
        OR (
          NOT EXISTS (
            SELECT 1 FROM public.course_sessions cs2
            WHERE cs2.course_id = c.id AND cs2.status IS DISTINCT FROM 'cancelled'
          )
          AND (
            (c.start_date IS NULL AND c.status IN ('active', 'upcoming'))
            OR (c.start_date IS NOT NULL
                AND greatest(coalesce(c.end_date, c.start_date), c.start_date) >= current_date)
          )
        )
      )
  );
$function$;

REVOKE EXECUTE ON FUNCTION public._course_runs_today_or_later(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public._course_runs_today_or_later(uuid) TO service_role;

-- 2. A seller has "unfinished business" if any of: a course running today or
--    later, a non-terminal payment attempt, or a refund started-not-finished.
CREATE OR REPLACE FUNCTION public._seller_has_unfinished_business(p_seller_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.seller_id = p_seller_id AND public._course_runs_today_or_later(c.id)
    )
    OR EXISTS (
      SELECT 1 FROM public.payment_attempts pa
      WHERE pa.seller_id = p_seller_id
        AND pa.status NOT IN ('failed', 'voided', 'captured', 'settled', 'refunded')
    )
    OR EXISTS (
      SELECT 1 FROM public.signups su
      WHERE su.seller_id = p_seller_id
        AND su.refund_amount > 0 AND su.refunded_at IS NULL
    );
$function$;

REVOKE EXECUTE ON FUNCTION public._seller_has_unfinished_business(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public._seller_has_unfinished_business(uuid) TO service_role;

-- 3. Blockers: sole-owned studios split into blocking (unfinished) vs dormant
--    (closed on deletion). Dormant studios DO NOT block. -----------------------
CREATE OR REPLACE FUNCTION public._account_deletion_blockers(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_block   jsonb;
  v_dormant jsonb;
  v_active_inst jsonb;
  v_storage int;
BEGIN
  WITH sole AS (
    SELECT s.id, s.name
    FROM public.sellers s
    WHERE EXISTS (
            SELECT 1 FROM public.seller_members sm
            WHERE sm.seller_id = s.id AND sm.user_id = p_user_id AND sm.role = 'owner')
      AND (SELECT count(*) FROM public.seller_members sm2
           WHERE sm2.seller_id = s.id AND sm2.role = 'owner') = 1
      AND s.closed_at IS NULL
  ), classified AS (
    SELECT so.id, so.name, public._seller_has_unfinished_business(so.id) AS unfinished
    FROM sole so
  )
  SELECT
    coalesce(jsonb_agg(jsonb_build_object('seller_id', id, 'name', name)) FILTER (WHERE unfinished), '[]'::jsonb),
    coalesce(jsonb_agg(jsonb_build_object('seller_id', id, 'name', name)) FILTER (WHERE NOT unfinished), '[]'::jsonb)
  INTO v_block, v_dormant
  FROM classified;

  SELECT coalesce(jsonb_agg(jsonb_build_object('course_id', c.id, 'title', c.title)), '[]'::jsonb)
  INTO v_active_inst
  FROM public.courses c
  WHERE c.instructor_id = p_user_id AND public._course_runs_today_or_later(c.id);

  SELECT count(*) INTO v_storage
  FROM storage.objects o
  WHERE o.owner = p_user_id OR o.owner_id = p_user_id::text;

  RETURN jsonb_build_object(
    'blocking_studios',          v_block,
    'dormant_studios',           v_dormant,
    'active_instructor_courses', v_active_inst,
    'owned_storage_objects',     v_storage,
    'deletable',
      jsonb_array_length(v_block) = 0
      AND jsonb_array_length(v_active_inst) = 0
      AND v_storage = 0
  );
END;
$function$;

-- 4. Close + anonymize a seller (keep all financial records). -----------------
CREATE OR REPLACE FUNCTION public.close_and_anonymize_seller(p_seller_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  UPDATE public.sellers
     SET name = 'Slettet studio',
         email = NULL,
         phone = NULL,
         closed_at = now()
   WHERE id = p_seller_id AND closed_at IS NULL;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.close_and_anonymize_seller(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.close_and_anonymize_seller(uuid) TO service_role;

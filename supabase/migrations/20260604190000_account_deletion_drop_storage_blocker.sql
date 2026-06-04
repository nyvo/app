-- Storage ownership no longer blocks account deletion.
--
-- There is NO foreign key from storage.objects.owner / owner_id to auth.users in
-- this project (the only FK on storage.objects is bucket_id -> storage.buckets),
-- so deleting the auth user succeeds with owned objects still present: the owner
-- column simply becomes a dangling id, and files in the public image buckets keep
-- serving (historical course/logo images don't break). The earlier Storage
-- blocker was therefore unnecessary, and it kept dormant-studio owners who had
-- uploaded any image from deleting. Drop it.
CREATE OR REPLACE FUNCTION public._account_deletion_blockers(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_block       jsonb;
  v_dormant     jsonb;
  v_active_inst jsonb;
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

  RETURN jsonb_build_object(
    'blocking_studios',          v_block,
    'dormant_studios',           v_dormant,
    'active_instructor_courses', v_active_inst,
    'deletable',
      jsonb_array_length(v_block) = 0
      AND jsonb_array_length(v_active_inst) = 0
  );
END;
$function$;

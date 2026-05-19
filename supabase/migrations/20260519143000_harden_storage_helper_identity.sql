-- Harden storage helper RPCs after production verification showed Supabase's
-- public-schema default grants can leave helper functions executable by anon.
-- The helpers must not accept a user id parameter; they derive identity from
-- auth.uid() internally so callers cannot probe arbitrary seller memberships.

BEGIN;

DROP POLICY IF EXISTS "seller_logos_write" ON storage.objects;
DROP POLICY IF EXISTS "course_images_write" ON storage.objects;

CREATE OR REPLACE FUNCTION public.storage_can_write_seller_logo(
  p_object_name text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, storage
AS $$
DECLARE
  parts text[] := storage.foldername(p_object_name);
  calling_user uuid := auth.uid();
  seller_id_text text;
BEGIN
  IF calling_user IS NULL OR array_length(parts, 1) < 1 THEN
    RETURN false;
  END IF;

  seller_id_text := parts[1];
  IF seller_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN false;
  END IF;

  RETURN public.is_seller_member(seller_id_text::uuid, calling_user);
END;
$$;

CREATE OR REPLACE FUNCTION public.storage_can_write_course_image(
  p_object_name text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, storage
AS $$
DECLARE
  parts text[] := storage.foldername(p_object_name);
  calling_user uuid := auth.uid();
  course_id_text text;
BEGIN
  IF calling_user IS NULL OR array_length(parts, 1) < 2 OR parts[1] <> 'courses' THEN
    RETURN false;
  END IF;

  course_id_text := parts[2];
  IF course_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.courses c
    WHERE c.id = course_id_text::uuid
      AND public.is_seller_member(c.seller_id, calling_user)
  );
END;
$$;

DROP FUNCTION IF EXISTS public.storage_can_write_seller_logo(text, uuid);
DROP FUNCTION IF EXISTS public.storage_can_write_course_image(text, uuid);

REVOKE ALL ON FUNCTION public.storage_can_write_seller_logo(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.storage_can_write_course_image(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.storage_can_write_seller_logo(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.storage_can_write_course_image(text) TO authenticated, service_role;

CREATE POLICY "seller_logos_write"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'seller-logos'
    AND public.storage_can_write_seller_logo(name)
  )
  WITH CHECK (
    bucket_id = 'seller-logos'
    AND public.storage_can_write_seller_logo(name)
  );

CREATE POLICY "course_images_write"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'course-images'
    AND public.storage_can_write_course_image(name)
  )
  WITH CHECK (
    bucket_id = 'course-images'
    AND public.storage_can_write_course_image(name)
  );

COMMIT;

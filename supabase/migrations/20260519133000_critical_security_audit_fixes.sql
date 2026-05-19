-- Critical security audit fixes:
-- 1. Remove public/authenticated direct SELECT access to sellers.email.
-- 2. Scope storage writes to seller/course ownership.
-- 3. Move protected profile onboarding fields behind SECURITY DEFINER RPCs.

BEGIN;

-- C1: sellers.email is PII. Direct sellers reads stay limited to public
-- storefront fields; seller email should flow through profiles or dedicated
-- member-gated RPCs when a feature truly needs it.
REVOKE SELECT ON public.sellers FROM anon, authenticated;

GRANT SELECT (
  id,
  name,
  logo_url,
  dintero_onboarding_complete,
  created_at
) ON public.sellers TO anon, authenticated;

-- C2: storage object ownership helpers. They defensively validate path shape
-- before casting path segments to uuid, so malformed object names simply fail
-- policy checks instead of throwing.
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

DROP POLICY IF EXISTS "Authenticated users can upload seller logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update seller logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete seller logos" ON storage.objects;
DROP POLICY IF EXISTS "seller_logos_write" ON storage.objects;

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

DROP POLICY IF EXISTS "Authenticated users can upload course images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update course images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete course images" ON storage.objects;
DROP POLICY IF EXISTS "course_images_write" ON storage.objects;

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

-- C3: protected profile columns are server-controlled. RPCs set a transaction
-- local marker consumed by the trigger; direct PostgREST updates cannot set it.
CREATE OR REPLACE FUNCTION public.profiles_block_protected_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR current_setting('app.profiles_server_write', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'profiles.role is server-controlled' USING ERRCODE = '42501';
  END IF;
  IF NEW.onboarding_completed_at IS DISTINCT FROM OLD.onboarding_completed_at THEN
    RAISE EXCEPTION 'profiles.onboarding_completed_at is server-controlled' USING ERRCODE = '42501';
  END IF;
  IF NEW.is_platform_admin IS DISTINCT FROM OLD.is_platform_admin THEN
    RAISE EXCEPTION 'profiles.is_platform_admin is server-controlled' USING ERRCODE = '42501';
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'profiles.email is server-controlled' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_columns ON public.profiles;
CREATE TRIGGER profiles_protect_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_block_protected_columns();

CREATE OR REPLACE FUNCTION public.set_user_role(p_role text)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  calling_user uuid := auth.uid();
  result public.profiles;
BEGIN
  IF calling_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF p_role IS NOT NULL AND p_role NOT IN ('buyer', 'seller') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('app.profiles_server_write', 'true', true);

  UPDATE public.profiles
     SET role = p_role
   WHERE id = calling_user
     AND onboarding_completed_at IS NULL
  RETURNING * INTO result;

  IF result.id IS NULL THEN
    SELECT * INTO result FROM public.profiles WHERE id = calling_user;
    IF result.id IS NULL THEN
      RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002';
    END IF;
    IF result.role IS DISTINCT FROM p_role THEN
      RAISE EXCEPTION 'Cannot change role after onboarding is complete' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_buyer_onboarding(
  p_name text,
  p_phone text DEFAULT NULL
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  calling_user uuid := auth.uid();
  clean_name text := left(trim(coalesce(p_name, '')), 120);
  clean_phone text := nullif(left(trim(coalesce(p_phone, '')), 40), '');
  result public.profiles;
BEGIN
  IF calling_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF clean_name = '' THEN
    RAISE EXCEPTION 'Name is required' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('app.profiles_server_write', 'true', true);

  UPDATE public.profiles
     SET name = clean_name,
         phone = clean_phone,
         role = 'buyer',
         onboarding_completed_at = coalesce(onboarding_completed_at, now())
   WHERE id = calling_user
     AND (role IS NULL OR role = 'buyer')
  RETURNING * INTO result;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'Buyer onboarding is not allowed for this profile' USING ERRCODE = '42501';
  END IF;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_seller_onboarding_complete()
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  calling_user uuid := auth.uid();
  result public.profiles;
BEGIN
  IF calling_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.seller_members sm
    WHERE sm.user_id = calling_user
      AND sm.role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Seller ownership is required to complete seller onboarding' USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('app.profiles_server_write', 'true', true);

  UPDATE public.profiles
     SET role = 'seller',
         onboarding_completed_at = coalesce(onboarding_completed_at, now())
   WHERE id = calling_user
  RETURNING * INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.profiles_block_protected_columns() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_user_role(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_buyer_onboarding(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_seller_onboarding_complete() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.set_user_role(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_buyer_onboarding(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_seller_onboarding_complete() TO authenticated;

COMMIT;

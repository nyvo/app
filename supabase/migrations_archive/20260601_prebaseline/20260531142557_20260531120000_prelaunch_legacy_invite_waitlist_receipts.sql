-- Prelaunch hardening, part 1:
--   * remove the legacy teams.invite_code surface
--   * tighten waitlist inserts
--   * require both Dintero identifiers for anonymous receipt lookup

DROP INDEX IF EXISTS public.idx_teams_invite_code;
ALTER TABLE public.teams DROP COLUMN IF EXISTS invite_code;

CREATE OR REPLACE FUNCTION public.ensure_seller_for_user(
  p_seller_name text,
  p_team_slug text,
  p_seller_type text DEFAULT 'individual'::text
)
RETURNS TABLE(
  seller_id uuid,
  team_id uuid,
  team_slug text,
  seller_name text,
  member_role public.seller_member_role,
  was_created boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  calling_user uuid := auth.uid();
  existing_seller_id uuid;
  existing_team_id uuid;
  existing_team_slug text;
  existing_seller_name text;
  new_seller_id uuid;
  new_team_id uuid;
  candidate_slug text;
  clean_name text;
BEGIN
  IF calling_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF p_seller_type NOT IN ('individual', 'business') THEN
    RAISE EXCEPTION 'Invalid seller_type: %', p_seller_type USING ERRCODE = '22023';
  END IF;

  SELECT sm.seller_id INTO existing_seller_id
  FROM public.seller_members sm
  WHERE sm.user_id = calling_user AND sm.role = 'owner'
  LIMIT 1;

  IF existing_seller_id IS NOT NULL THEN
    SELECT t.id, t.slug INTO existing_team_id, existing_team_slug
    FROM public.teams t
    WHERE t.owner_seller_id = existing_seller_id
    LIMIT 1;

    SELECT s.name INTO existing_seller_name
    FROM public.sellers s
    WHERE s.id = existing_seller_id;

    RETURN QUERY SELECT existing_seller_id, existing_team_id, existing_team_slug,
      existing_seller_name, 'owner'::public.seller_member_role, false;
    RETURN;
  END IF;

  clean_name := left(trim(coalesce(p_seller_name, '')), 100);
  IF clean_name = '' THEN
    RAISE EXCEPTION 'Seller name is required' USING ERRCODE = '22023';
  END IF;

  candidate_slug := public._normalize_team_slug(p_team_slug);

  IF EXISTS (SELECT 1 FROM public.teams WHERE lower(slug) = candidate_slug) THEN
    RAISE EXCEPTION 'Slug already taken' USING ERRCODE = '23505';
  END IF;
  IF EXISTS (SELECT 1 FROM public.team_slug_aliases WHERE lower(old_slug) = candidate_slug) THEN
    RAISE EXCEPTION 'Slug already taken' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.sellers (name, seller_type)
  VALUES (clean_name, p_seller_type)
  RETURNING id INTO new_seller_id;

  BEGIN
    INSERT INTO public.teams (slug, name, owner_seller_id)
    VALUES (candidate_slug, clean_name, new_seller_id)
    RETURNING id INTO new_team_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Slug already taken' USING ERRCODE = '23505';
  END;

  INSERT INTO public.seller_members (seller_id, user_id, role)
  VALUES (new_seller_id, calling_user, 'owner');

  RETURN QUERY SELECT new_seller_id, new_team_id, candidate_slug,
    clean_name, 'owner'::public.seller_member_role, true;
END;
$$;

ALTER TABLE public.waitlist
  ADD CONSTRAINT waitlist_email_length
  CHECK (char_length(email) BETWEEN 3 AND 254);

ALTER TABLE public.waitlist
  ADD CONSTRAINT waitlist_email_format
  CHECK (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$');

ALTER TABLE public.waitlist
  ADD CONSTRAINT waitlist_source_length
  CHECK (source IS NULL OR char_length(source) <= 120);

DROP POLICY IF EXISTS "anyone can insert" ON public.waitlist;
CREATE POLICY waitlist_insert_valid_email
  ON public.waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(email) BETWEEN 3 AND 254
    AND email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    AND (source IS NULL OR char_length(source) <= 120)
  );

CREATE OR REPLACE FUNCTION public.get_signup_by_dintero_id(
  p_transaction_id text DEFAULT NULL::text,
  p_merchant_reference text DEFAULT NULL::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  result json;
BEGIN
  IF p_transaction_id IS NULL OR p_merchant_reference IS NULL THEN
    RAISE EXCEPTION 'Must supply both p_transaction_id and p_merchant_reference'
      USING ERRCODE = '22023';
  END IF;

  SELECT json_build_object(
    'id', s.id,
    'participant_name', s.participant_name,
    'participant_email', s.participant_email,
    'amount_paid', s.amount_paid,
    'created_at', s.created_at,
    'course', json_build_object(
      'id', c.id,
      'title', c.title,
      'start_date', c.start_date,
      'time_schedule', c.time_schedule,
      'location', c.location,
      'image_url', COALESCE(c.image_url, t.default_course_image_url),
      'seller', json_build_object(
        'name', sel.name,
        'logo_url', sel.logo_url,
        'team_slug', t.slug
      )
    )
  )
  INTO result
  FROM public.signups s
  JOIN public.courses c ON c.id = s.course_id
  JOIN public.sellers sel ON sel.id = s.seller_id
  LEFT JOIN public.teams t ON t.owner_seller_id = sel.id
  WHERE s.dintero_transaction_id = p_transaction_id
    AND s.dintero_merchant_reference = p_merchant_reference
  LIMIT 1;

  RETURN result;
END;
$$;

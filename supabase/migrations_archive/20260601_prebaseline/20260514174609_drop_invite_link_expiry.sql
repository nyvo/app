-- Drop the 7-day expiry rule on team invite links. Studio admins regenerate
-- when they want to invalidate; revoked_at still covers that.

ALTER TABLE public.team_invite_links DROP COLUMN expires_at;

CREATE OR REPLACE FUNCTION public.create_team_invite_link(p_team_id uuid)
RETURNS team_invite_links
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_code text;
  v_attempts int := 0;
  v_row public.team_invite_links;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS(
    SELECT 1
    FROM public.teams t
    JOIN public.seller_members sm ON sm.seller_id = t.owner_seller_id
    WHERE t.id = p_team_id AND sm.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.team_invite_links
  SET revoked_at = now()
  WHERE team_id = p_team_id
    AND revoked_at IS NULL;

  LOOP
    v_code := substr(md5(random()::text || clock_timestamp()::text), 1, 3)
              || '-'
              || substr(md5(random()::text || clock_timestamp()::text), 1, 5);

    BEGIN
      INSERT INTO public.team_invite_links (team_id, code, created_by)
      VALUES (p_team_id, v_code, v_user_id)
      RETURNING * INTO v_row;
      RETURN v_row;
    EXCEPTION WHEN unique_violation THEN
      v_attempts := v_attempts + 1;
      IF v_attempts > 5 THEN
        RAISE EXCEPTION 'Could not generate unique code after % attempts', v_attempts;
      END IF;
    END;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.lookup_team_invite_link(p_code text)
RETURNS TABLE(status text, team_id uuid, team_slug text, team_name text, team_cover_image_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_link public.team_invite_links;
BEGIN
  SELECT * INTO v_link FROM public.team_invite_links WHERE code = p_code;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::text, NULL::uuid, NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  IF v_link.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT 'expired'::text, NULL::uuid, NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  RETURN QUERY
    SELECT 'valid'::text, t.id, t.slug, t.name, t.cover_image_url
    FROM public.teams t
    WHERE t.id = v_link.team_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.redeem_team_invite_link(p_code text, p_force_leave boolean DEFAULT false)
RETURNS TABLE(status text, team_id uuid, existing_team_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_link public.team_invite_links;
  v_user_id uuid := auth.uid();
  v_seller_id uuid;
  v_existing_team uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_link FROM public.team_invite_links WHERE code = p_code;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::text, NULL::uuid, NULL::uuid;
    RETURN;
  END IF;
  IF v_link.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT 'expired'::text, NULL::uuid, NULL::uuid;
    RETURN;
  END IF;

  SELECT seller_id INTO v_seller_id
  FROM public.seller_members
  WHERE user_id = v_user_id AND role = 'owner'
  LIMIT 1;

  IF v_seller_id IS NULL THEN
    RETURN QUERY SELECT 'no_seller'::text, NULL::uuid, NULL::uuid;
    RETURN;
  END IF;

  IF EXISTS(
    SELECT 1 FROM public.teams
    WHERE id = v_link.team_id AND owner_seller_id = v_seller_id
  ) THEN
    RETURN QUERY SELECT 'own_team'::text, v_link.team_id, NULL::uuid;
    RETURN;
  END IF;

  IF EXISTS(
    SELECT 1 FROM public.team_affiliations
    WHERE team_id = v_link.team_id
      AND seller_id = v_seller_id
      AND status = 'active'
  ) THEN
    RETURN QUERY SELECT 'already_member'::text, v_link.team_id, NULL::uuid;
    RETURN;
  END IF;

  SELECT team_id INTO v_existing_team
  FROM public.team_affiliations
  WHERE seller_id = v_seller_id AND status = 'active'
  LIMIT 1;

  IF v_existing_team IS NOT NULL AND NOT p_force_leave THEN
    RETURN QUERY SELECT 'in_other_team'::text, v_link.team_id, v_existing_team;
    RETURN;
  END IF;

  IF v_existing_team IS NOT NULL AND p_force_leave THEN
    DELETE FROM public.team_affiliations
    WHERE seller_id = v_seller_id AND status = 'active';
  END IF;

  INSERT INTO public.team_affiliations (team_id, seller_id, status, invited_by, responded_at)
  VALUES (v_link.team_id, v_seller_id, 'active', v_link.created_by, now());

  RETURN QUERY SELECT 'joined'::text, v_link.team_id, NULL::uuid;
END;
$function$;

-- Drop the obsolete two-arg signature so PostgREST/JS callers see a single overload.
DROP FUNCTION IF EXISTS public.create_team_invite_link(uuid, integer);

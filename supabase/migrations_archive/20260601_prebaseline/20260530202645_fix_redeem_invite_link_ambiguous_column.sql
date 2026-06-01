-- Fix: redeem_team_invite_link raised "column reference \"team_id\" is ambiguous"
-- (→ 400) whenever a seller redeemed a link for a team they weren't in yet.
--
-- The function RETURNS TABLE(status, team_id, existing_team_id), so those names
-- exist as OUT variables inside the body. Bare references to `team_id`/`status`
-- against public.team_affiliations (which has both columns) were ambiguous, so
-- Postgres aborted. Qualify every team_affiliations reference with an alias.

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
    SELECT 1 FROM public.team_affiliations ta
    WHERE ta.team_id = v_link.team_id
      AND ta.seller_id = v_seller_id
      AND ta.status = 'active'
  ) THEN
    RETURN QUERY SELECT 'already_member'::text, v_link.team_id, NULL::uuid;
    RETURN;
  END IF;

  SELECT ta.team_id INTO v_existing_team
  FROM public.team_affiliations ta
  WHERE ta.seller_id = v_seller_id AND ta.status = 'active'
  LIMIT 1;

  IF v_existing_team IS NOT NULL AND NOT p_force_leave THEN
    RETURN QUERY SELECT 'in_other_team'::text, v_link.team_id, v_existing_team;
    RETURN;
  END IF;

  IF v_existing_team IS NOT NULL AND p_force_leave THEN
    DELETE FROM public.team_affiliations ta
    WHERE ta.seller_id = v_seller_id AND ta.status = 'active';
  END IF;

  INSERT INTO public.team_affiliations (team_id, seller_id, status, invited_by, responded_at)
  VALUES (v_link.team_id, v_seller_id, 'active', v_link.created_by, now());

  RETURN QUERY SELECT 'joined'::text, v_link.team_id, NULL::uuid;
END;
$function$;

-- Notify the studio owner when an instructor joins via invite link.
--
-- Invite links redeem instantly (no approval step, by design) — which means a
-- leaked or forwarded link can put a stranger's courses on the studio page
-- without anyone noticing. The fix is visibility, not friction: every
-- successful redeem now drops an 'affiliation.joined' notification to the
-- studio's owner member(s), so an unexpected join is seen and reversible
-- (remove from the Samarbeid section) within minutes.
--
-- The insert mirrors _shared/notifications.ts conventions: snapshotted
-- Norwegian copy, (recipient_id, dedupe_key) idempotency, self-suppression
-- (the joining user never notifies themselves — can't happen today because
-- own-team joins are rejected, but kept as a guard).

CREATE OR REPLACE FUNCTION public.redeem_team_invite_link(p_code text, p_force_leave boolean DEFAULT false)
RETURNS TABLE(status text, team_id uuid, existing_team_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
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

  -- Visibility for the instant-join model: tell the studio owner(s) who just
  -- joined. Day-granularity dedupe suffix: client retries / double-submits
  -- on the same day collapse to one notification, while a genuine
  -- leave→rejoin on a later day still notifies.
  INSERT INTO public.notifications
    (seller_id, recipient_id, actor_id, type, action_required, dedupe_key, title, body, action_url, metadata)
  SELECT
    t.owner_seller_id,
    sm.user_id,
    v_user_id,
    'affiliation.joined',
    false,
    'affiliation.joined:' || v_link.team_id || ':' || v_seller_id || ':' || to_char(now(), 'YYYY-MM-DD'),
    'Ny instruktør på studiosiden',
    s.name,
    '/studio',
    jsonb_build_object('team_id', v_link.team_id, 'joined_seller_id', v_seller_id)
  FROM public.teams t
  JOIN public.seller_members sm
    ON sm.seller_id = t.owner_seller_id AND sm.role = 'owner'
  JOIN public.sellers s ON s.id = v_seller_id
  WHERE t.id = v_link.team_id
    AND sm.user_id <> v_user_id
  ON CONFLICT (recipient_id, dedupe_key) DO NOTHING;

  RETURN QUERY SELECT 'joined'::text, v_link.team_id, NULL::uuid;
END;
$$;

-- Re-assert grants so the file is self-contained for fresh environments
-- (CREATE OR REPLACE preserves grants on the live DB, but a branch/staging
-- project built from migrations alone needs them stated here).
REVOKE ALL ON FUNCTION public.redeem_team_invite_link(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_team_invite_link(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_team_invite_link(text, boolean) TO service_role;

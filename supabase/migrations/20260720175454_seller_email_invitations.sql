-- Seller email invitations — replaces the shareable invite-link mechanism.
--
-- A studio invites a named instructor by email; the invitee accepts via the
-- emailed token (/join/:token) or the Godta row on /samarbeid. Ownership is
-- one-directional by design: only studio accounts can invite, only solo
-- accounts can accept (the old studio-as-guest shape is retired).
--
-- The legacy seller_invite_links table + RPCs stay in place untouched while
-- the email flow is verified; they are no longer called by the app.

CREATE TABLE public.seller_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_seller_id uuid NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'revoked')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 days',
  accepted_at timestamptz,
  accepted_seller_id uuid REFERENCES public.sellers(id) ON DELETE SET NULL
);

-- One live invitation per host+address; resending reuses the row/token.
CREATE UNIQUE INDEX seller_invitations_host_email_pending
  ON public.seller_invitations (host_seller_id, lower(email))
  WHERE status = 'pending';
CREATE INDEX seller_invitations_host_idx ON public.seller_invitations (host_seller_id);
CREATE INDEX seller_invitations_email_idx ON public.seller_invitations (lower(email));

ALTER TABLE public.seller_invitations ENABLE ROW LEVEL SECURITY;

-- The inviting studio's owner sees their own invitations.
CREATE POLICY seller_invitations_select_host ON public.seller_invitations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.seller_members sm
      WHERE sm.seller_id = seller_invitations.host_seller_id
        AND sm.user_id = auth.uid()
        AND sm.role = 'owner'
    )
  );

-- The invitee sees their own pending invitation (drives the Godta/Avslå row
-- on /samarbeid). Matched on the JWT's verified email.
CREATE POLICY seller_invitations_select_invitee ON public.seller_invitations
  FOR SELECT TO authenticated
  USING (
    status = 'pending'
    AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- All writes go through the SECURITY DEFINER RPCs below (or service role).

-- ---------------------------------------------------------------------------
-- create_seller_invitation — owner-only, studio-only. Revokes any prior
-- pending invitation for the same address, then mints a fresh token.
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.create_seller_invitation(p_host_seller_id uuid, p_email text)
RETURNS public.seller_invitations
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text := lower(trim(p_email));
  v_token text;
  v_attempts int := 0;
  v_row public.seller_invitations;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.seller_members sm
    WHERE sm.seller_id = p_host_seller_id AND sm.user_id = v_user_id AND sm.role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  -- Only studio accounts own a team.
  IF NOT EXISTS (
    SELECT 1 FROM public.sellers s
    WHERE s.id = p_host_seller_id AND s.operating_model = 'studio'
  ) THEN
    RAISE EXCEPTION 'not_studio' USING ERRCODE = 'P0001';
  END IF;

  IF v_email IS NULL OR v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
    RAISE EXCEPTION 'invalid_email' USING ERRCODE = 'P0001';
  END IF;

  -- Replace any prior pending invitation for the same address.
  UPDATE public.seller_invitations
  SET status = 'revoked'
  WHERE host_seller_id = p_host_seller_id
    AND lower(email) = v_email
    AND status = 'pending';

  LOOP
    v_token := encode(extensions.gen_random_bytes(16), 'hex');
    BEGIN
      INSERT INTO public.seller_invitations (host_seller_id, email, token, created_by)
      VALUES (p_host_seller_id, v_email, v_token, v_user_id)
      RETURNING * INTO v_row;
      RETURN v_row;
    EXCEPTION WHEN unique_violation THEN
      v_attempts := v_attempts + 1;
      IF v_attempts > 5 THEN
        RAISE EXCEPTION 'Could not generate unique token after % attempts', v_attempts;
      END IF;
    END;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.create_seller_invitation(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_seller_invitation(uuid, text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- revoke_seller_invitation — owner-only; pending → revoked.
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.revoke_seller_invitation(p_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  UPDATE public.seller_invitations i
  SET status = 'revoked'
  WHERE i.id = p_invitation_id
    AND i.status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.seller_members sm
      WHERE sm.seller_id = i.host_seller_id AND sm.user_id = v_user_id AND sm.role = 'owner'
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_seller_invitation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_seller_invitation(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- lookup_seller_invitation — public (anon), drives /join/:token. Returns the
-- studio's display info; never the invitee email.
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.lookup_seller_invitation(p_token text)
RETURNS TABLE(status text, host_seller_id uuid, name text, slug text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_inv public.seller_invitations;
BEGIN
  SELECT * INTO v_inv FROM public.seller_invitations i WHERE i.token = p_token;

  IF NOT FOUND OR v_inv.status IN ('revoked', 'declined') THEN
    RETURN QUERY SELECT 'not_found'::text, NULL::uuid, NULL::text, NULL::text;
    RETURN;
  END IF;

  IF v_inv.status = 'accepted' THEN
    RETURN QUERY
      SELECT 'accepted'::text, s.id, s.name, s.slug
      FROM public.sellers s WHERE s.id = v_inv.host_seller_id;
    RETURN;
  END IF;

  IF v_inv.expires_at < now() THEN
    RETURN QUERY SELECT 'expired'::text, NULL::uuid, NULL::text, NULL::text;
    RETURN;
  END IF;

  RETURN QUERY
    SELECT 'valid'::text, s.id, s.name, s.slug
    FROM public.sellers s WHERE s.id = v_inv.host_seller_id;
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_seller_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_seller_invitation(text) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- accept_seller_invitation — authenticated. The invitee's verified email must
-- match, and only solo accounts can accept. Handles the single-host
-- constraint via has_other_host + p_force_leave, mirroring the old redeem.
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.accept_seller_invitation(p_token text, p_force_leave boolean DEFAULT false)
RETURNS TABLE(status text, existing_host_seller_id uuid)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_inv public.seller_invitations;
  v_seller public.sellers;
  v_existing_host uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_inv FROM public.seller_invitations i WHERE i.token = p_token;

  IF NOT FOUND OR v_inv.status IN ('revoked', 'declined', 'accepted') THEN
    RETURN QUERY SELECT 'not_found'::text, NULL::uuid; RETURN;
  END IF;

  IF v_inv.expires_at < now() THEN
    RETURN QUERY SELECT 'expired'::text, NULL::uuid; RETURN;
  END IF;

  -- The caller's seller (owner membership).
  SELECT s.* INTO v_seller
  FROM public.sellers s
  JOIN public.seller_members sm ON sm.seller_id = s.id
  WHERE sm.user_id = v_user_id AND sm.role = 'owner'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'no_seller'::text, NULL::uuid; RETURN;
  END IF;

  IF v_seller.id = v_inv.host_seller_id THEN
    RETURN QUERY SELECT 'own_storefront'::text, NULL::uuid; RETURN;
  END IF;

  IF v_email <> lower(v_inv.email) THEN
    RETURN QUERY SELECT 'wrong_email'::text, NULL::uuid; RETURN;
  END IF;

  -- Only solo accounts guest on a studio page.
  IF v_seller.operating_model = 'studio' THEN
    RETURN QUERY SELECT 'studio_account'::text, NULL::uuid; RETURN;
  END IF;

  SELECT sa.host_seller_id INTO v_existing_host
  FROM public.seller_affiliations sa
  WHERE sa.guest_seller_id = v_seller.id
  LIMIT 1;

  IF v_existing_host = v_inv.host_seller_id THEN
    UPDATE public.seller_invitations
    SET status = 'accepted', accepted_at = now(), accepted_seller_id = v_seller.id
    WHERE id = v_inv.id;
    RETURN QUERY SELECT 'already_affiliated'::text, NULL::uuid; RETURN;
  END IF;

  IF v_existing_host IS NOT NULL AND NOT p_force_leave THEN
    RETURN QUERY SELECT 'has_other_host'::text, v_existing_host; RETURN;
  END IF;

  IF v_existing_host IS NOT NULL THEN
    DELETE FROM public.seller_affiliations
    WHERE guest_seller_id = v_seller.id AND host_seller_id = v_existing_host;
  END IF;

  INSERT INTO public.seller_affiliations (host_seller_id, guest_seller_id, invited_by)
  VALUES (v_inv.host_seller_id, v_seller.id, v_inv.created_by);

  UPDATE public.seller_invitations
  SET status = 'accepted', accepted_at = now(), accepted_seller_id = v_seller.id
  WHERE id = v_inv.id;

  RETURN QUERY SELECT 'joined'::text, NULL::uuid;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_seller_invitation(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_seller_invitation(text, boolean) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- decline_seller_invitation — authenticated invitee; pending → declined.
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.decline_seller_invitation(p_token text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  UPDATE public.seller_invitations i
  SET status = 'declined'
  WHERE i.token = p_token
    AND i.status = 'pending'
    AND lower(i.email) = v_email;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;
  RETURN 'declined';
END;
$$;

REVOKE ALL ON FUNCTION public.decline_seller_invitation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decline_seller_invitation(text) TO authenticated, service_role;

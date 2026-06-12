-- Pre-launch audit fix H3 (see .context/db-audit/AUDIT-REPORT.md)
--
-- inviteAffiliateByEmail (src/services/affiliations.ts) looked up the invitee
-- via a direct SELECT on profiles — but the "Profiles SELECT" policy only
-- exposes the caller's own row, so the lookup always returned zero rows and
-- every email invite failed with "Fant ingen bruker…".
--
-- This RPC does the email → owner → seller resolution under SECURITY DEFINER
-- and returns ONLY the seller_id (no profile data). The actual affiliation
-- insert still goes through team_affiliations RLS (team admin + pending +
-- not-own-seller), so this widens nothing about who can invite whom.
-- Rate-limited per caller: it is an existence oracle for "this email belongs
-- to a seller owner", so probing is capped.

CREATE OR REPLACE FUNCTION public.find_seller_by_owner_email(p_email text)
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_seller_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  -- 30 lookups/hour per user is far above legitimate invite usage.
  IF NOT public.check_rate_limit('seller-owner-lookup:user:' || auth.uid()::text, 30, 3600) THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
  END IF;

  SELECT sm.seller_id INTO v_seller_id
  FROM public.profiles p
  JOIN public.seller_members sm ON sm.user_id = p.id AND sm.role = 'owner'
  WHERE lower(p.email) = lower(btrim(p_email))
  LIMIT 1;

  RETURN v_seller_id;
END;
$$;

REVOKE ALL ON FUNCTION public.find_seller_by_owner_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_seller_by_owner_email(text) TO authenticated, service_role;

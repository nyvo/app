-- Claim-by-verified-email: backfill signups.buyer_id for the calling user.
--
-- All bookings are guest bookings today — `signups.buyer_id` exists but
-- nothing sets it. Instead of threading buyer_id through the checkout/
-- Dintero/webhook pipeline, an authenticated user claims their historical
-- signups by email match: every unclaimed signup whose participant_email
-- equals the caller's verified auth email gets buyer_id = auth.uid().
--
-- Called fire-and-forget at session start (AuthContext) and awaited in the
-- buyer onboarding step before prefill. Idempotent — already-claimed rows
-- (buyer_id IS NOT NULL) are never touched, so a later email change cannot
-- reassign someone else's claim; re-claim after an email change picks up
-- signups made under the new address only.
--
-- Tombstoned rows ('%.invalid' participant_email, set on data-erasure) are
-- excluded. The email comparison is case-insensitive; the partial index
-- below keeps the probe cheap as the unclaimed set shrinks over time.

CREATE OR REPLACE FUNCTION public.claim_my_signups()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email text;
  v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  -- Only a *verified* email may claim. Magic-link and OAuth sign-ins are
  -- always confirmed, but guard anyway so a future unverified-signup path
  -- can never claim someone else's bookings.
  SELECT u.email INTO v_email
  FROM auth.users u
  WHERE u.id = auth.uid()
    AND u.email_confirmed_at IS NOT NULL;

  IF v_email IS NULL THEN
    RETURN 0;
  END IF;

  UPDATE public.signups s
  SET buyer_id = auth.uid()
  WHERE s.buyer_id IS NULL
    AND s.participant_email NOT LIKE '%.invalid'
    AND lower(s.participant_email) = lower(v_email);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Revoke from anon explicitly too — Supabase's ALTER DEFAULT PRIVILEGES
-- grants EXECUTE to anon directly, which a PUBLIC revoke does not strip.
REVOKE ALL ON FUNCTION public.claim_my_signups() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_my_signups() FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_my_signups() TO authenticated;

-- Probe index for the claim UPDATE: only unclaimed rows are ever matched,
-- and matching is on lower(participant_email).
CREATE INDEX IF NOT EXISTS idx_signups_unclaimed_email
  ON public.signups (lower(participant_email))
  WHERE buyer_id IS NULL;

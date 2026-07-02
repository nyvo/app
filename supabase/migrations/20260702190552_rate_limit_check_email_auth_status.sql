-- Rate-limit the anon email-auth-status oracle (auth-audit fix).
--
-- check_email_auth_status is anon-callable and returns email_exists +
-- has_password, i.e. an email-enumeration oracle. 20260702165020 added a
-- single per-email limiter but left the note that "SQL has no client IP" — it
-- does: PostgREST forwards the request headers into `request.headers`, so we
-- can key an IP bucket off x-forwarded-for. This supersedes that per-email-only
-- guard with a two-key limit (per IP + per probed address) and returns the same
-- email_exists/has_password row afterwards.
--
-- The client (AuthPage checkEmailAuthStatus → rateOrGeneric) keys on the word
-- 'rate' in the error message to show the "for many forsøk" copy, so the raised
-- message must contain it.
CREATE OR REPLACE FUNCTION public.check_email_auth_status(p_email text)
RETURNS TABLE(email_exists boolean, has_password boolean)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_ip text;
  v_ip_ok boolean;
  v_email_ok boolean;
BEGIN
  -- Client IP from the forwarded header — first entry in x-forwarded-for,
  -- 'unknown' when absent/empty (all such probes then share one bucket).
  v_ip := split_part(
    coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', 'unknown'),
    ',', 1
  );
  v_ip := nullif(trim(v_ip), '');
  IF v_ip IS NULL THEN
    v_ip := 'unknown';
  END IF;

  -- Evaluate both buckets (each increments) before deciding, so a blocked IP
  -- still counts the address probe and vice versa.
  v_ip_ok := public.check_rate_limit('email-status:ip:' || v_ip, 30, 3600);
  v_email_ok := public.check_rate_limit('email-status:email:' || lower(trim(p_email)), 10, 3600);
  IF NOT v_ip_ok OR NOT v_email_ok THEN
    RAISE EXCEPTION 'rate limit exceeded' USING ERRCODE = '54000';
  END IF;

  RETURN QUERY
  SELECT
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.email = lower(trim(p_email))
    ) AS email_exists,
    EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.email = lower(trim(p_email))
        AND u.encrypted_password IS NOT NULL
        AND u.encrypted_password <> ''
    ) AS has_password;
END;
$$;
REVOKE ALL ON FUNCTION public.check_email_auth_status(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_email_auth_status(text) TO anon, authenticated;

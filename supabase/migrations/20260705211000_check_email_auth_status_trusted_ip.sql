-- Harden the anon email-auth-status oracle's rate-limit key (audit P1-5).
--
-- check_email_auth_status returns email_exists + has_password, i.e. an account
-- enumeration oracle, throttled per IP + per probed email. The IP key used
-- split_part(x-forwarded-for, ',', 1) — the LEFT-most entry, which is
-- client-supplied and forgeable. An attacker rotating a random XFF per request
-- lands in a fresh 30/hr bucket every time, leaving only the per-email cap,
-- which doesn't constrain enumeration (one probe per target address already
-- reveals existence). The edge functions' getClientIp already documents this
-- and keys on the LAST hop (written by the Supabase/Kong edge, not spoofable).
-- Mirror that here: take the right-most XFF entry.
--
-- Everything else (per-email cap, the 'rate' keyword the client matches on,
-- grants) is unchanged.

CREATE OR REPLACE FUNCTION public.check_email_auth_status(p_email text)
RETURNS TABLE(email_exists boolean, has_password boolean)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_xff   text;
  v_parts text[];
  v_ip    text;
  v_ip_ok boolean;
  v_email_ok boolean;
BEGIN
  -- Trusted client IP = the LAST x-forwarded-for hop (appended by our edge).
  -- The first entry is attacker-controlled; keying on it makes the IP bucket
  -- trivially bypassable. 'unknown' when absent/empty (all such probes then
  -- share one bucket).
  v_xff := current_setting('request.headers', true)::json ->> 'x-forwarded-for';
  v_parts := string_to_array(coalesce(v_xff, ''), ',');
  IF array_length(v_parts, 1) IS NULL THEN
    v_ip := 'unknown';
  ELSE
    v_ip := nullif(trim(v_parts[array_length(v_parts, 1)]), '');
    IF v_ip IS NULL THEN
      v_ip := 'unknown';
    END IF;
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

-- Combined sign-in / sign-up determination (§ auth rework).
-- The new /auth screen shows email + password on one surface and must decide,
-- on submit, whether to sign the user IN, create a NEW account, or bridge a
-- passwordless (Google/magic-link) account into one that can use a password.
--
-- Supabase gives no client API to ask "does this email exist?" (anti-enumeration),
-- and signUp()/signInWithPassword() deliberately return obfuscated/generic results,
-- so the supported pattern is a SECURITY DEFINER RPC over auth.users.
--
-- Returns one row always:
--   email_exists  — an account with this email exists
--   has_password  — that account has an email/password credential set
--                   (FALSE for Google-only / magic-link-only users)
--
-- SECURITY NOTE: this intentionally exposes email existence to anon. That is an
-- accepted UX trade-off for a consumer surface (the signup/reset flows leak it
-- anyway). Mitigate abuse with rate limiting at the edge if it becomes a problem.
CREATE OR REPLACE FUNCTION public.check_email_auth_status(p_email text)
 RETURNS TABLE(email_exists boolean, has_password boolean)
 LANGUAGE sql STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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
$function$;
REVOKE ALL ON FUNCTION public.check_email_auth_status(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_email_auth_status(text) TO anon, authenticated;

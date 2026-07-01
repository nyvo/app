-- Self-heal for missing profile rows (§ auth rework).
--
-- profiles is SELECT-only for `authenticated` (all mutations go through
-- SECURITY DEFINER functions), and handle_new_user swallows insert failures —
-- so a profile row can occasionally end up missing for a valid auth user. That
-- would otherwise hang the auth flow forever (AuthContext.loadUserData signs the
-- user out on every login when no profile is found).
--
-- ensure_own_profile lets the client recreate ONLY its own row (keyed on
-- auth.uid(), pulled from auth.users server-side so the caller can't spoof it),
-- idempotently. AuthContext calls it before giving up on a missing profile.
CREATE OR REPLACE FUNCTION public.ensure_own_profile()
 RETURNS void
 LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email)
  SELECT u.id, u.email
  FROM auth.users u
  WHERE u.id = auth.uid()
  ON CONFLICT (id) DO NOTHING;
END;
$function$;
REVOKE ALL ON FUNCTION public.ensure_own_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_own_profile() TO authenticated;

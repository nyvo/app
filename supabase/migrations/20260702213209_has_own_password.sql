-- Self-scoped password-presence check for the settings Passord row.
--
-- The client cannot read whether its own account has a password. We avoid
-- check_email_auth_status here: that RPC is rate-limited per email, so a
-- settings visit would burn the user's own login bucket. This function is keyed
-- strictly on auth.uid() — it takes no input and exposes no enumeration surface
-- (a caller can only learn about their own account). Returns true when the
-- authenticated user has a usable password set.
CREATE OR REPLACE FUNCTION public.has_own_password()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
      AND u.encrypted_password IS NOT NULL
      AND u.encrypted_password <> ''
  );
$$;
REVOKE ALL ON FUNCTION public.has_own_password() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_own_password() FROM anon;
GRANT EXECUTE ON FUNCTION public.has_own_password() TO authenticated;

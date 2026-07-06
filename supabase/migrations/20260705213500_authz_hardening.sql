-- Two authorization hardening fixes (audit P2-24, P2-25).
--
-- P2-24 — Drop the dead signups UPDATE policy.
--   signups_update_member (USING/WITH CHECK is_seller_member) looks like the
--   guard against a seller rewriting money columns, but authenticated holds NO
--   table UPDATE privilege on signups (all writes go through service-role edge
--   functions), so the policy never runs. Worse, it is a latent risk: a single
--   future GRANT UPDATE would activate it and let members mutate signups. With
--   the policy gone, RLS denies UPDATE by default (no policy = deny), so a
--   stray grant fails closed instead. Updates stay RPC/service-role only.
DROP POLICY IF EXISTS signups_update_member ON public.signups;

-- P2-25 — is_platform_admin no longer leaks other users' admin status.
--   The function returned the admin flag for ANY passed uuid, so any signed-in
--   user could probe whether a given account is a platform admin (recon). Now
--   it answers truthfully only about the caller themselves, or when the caller
--   is already an admin; otherwise false. Every real call site passes
--   auth.uid() (the Profiles SELECT policy), so this is behavior-preserving for
--   legitimate use.
CREATE OR REPLACE FUNCTION public.is_platform_admin(user_uuid uuid)
  RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT CASE
    WHEN user_uuid = (SELECT auth.uid())
      OR COALESCE((SELECT is_platform_admin FROM profiles WHERE id = (SELECT auth.uid())), false)
    THEN COALESCE((SELECT is_platform_admin FROM profiles WHERE id = user_uuid), false)
    ELSE false
  END;
$$;
REVOKE ALL ON FUNCTION public.is_platform_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO authenticated, service_role;

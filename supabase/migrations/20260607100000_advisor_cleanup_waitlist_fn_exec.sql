-- Advisor cleanup (read-only security-scan follow-up). Narrowly scoped.
--
-- 1. public.waitlist_rate_limit() is a TRIGGER function, not an RPC. It was
--    callable by anon/authenticated only via the default PUBLIC EXECUTE grant
--    (calling it directly errors anyway — trigger functions can't run outside a
--    trigger context). Revoke EXECUTE to remove the exposed-API surface and clear
--    advisor lints 0028/0029. This does NOT affect trigger firing: triggers run
--    the function via the trigger mechanism, independent of the inserting role's
--    EXECUTE privilege. service_role / owner retain access.
REVOKE EXECUTE ON FUNCTION public.waitlist_rate_limit() FROM PUBLIC, anon, authenticated;

-- 2. Cosmetic only: align create_team_invite_link's pinned search_path with the
--    rest of the codebase (pg_catalog first). Body unchanged.
ALTER FUNCTION public.create_team_invite_link(uuid) SET search_path TO 'pg_catalog', 'public';

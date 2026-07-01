-- Revoke the default PUBLIC EXECUTE on a trigger function that is not an RPC.
-- (Supabase advisors 0028/0029 — anon/authenticated could call it via
-- /rest/v1/rpc/enforce_course_publish_requires_payment.)
--
-- enforce_course_publish_requires_payment() fires on courses INSERT/UPDATE; it is
-- never meant to be invoked directly. Every other trigger function in `public` was
-- already narrowed to postgres/service_role (see waitlist_rate_limit); this one
-- still carried the default `GRANT EXECUTE ... TO PUBLIC`. Revoking it does NOT
-- affect trigger firing — a trigger runs as the table owner regardless of who
-- holds EXECUTE on the function.
REVOKE ALL ON FUNCTION public.enforce_course_publish_requires_payment() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_course_publish_requires_payment() FROM anon;
REVOKE ALL ON FUNCTION public.enforce_course_publish_requires_payment() FROM authenticated;

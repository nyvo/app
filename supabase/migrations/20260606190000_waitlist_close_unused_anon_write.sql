-- F3.4 (revised) — close the unused anonymous waitlist write surface.
--
-- public.waitlist has 0 rows ever and no active production path writes to it: the
-- React WaitlistForm/LandingPage is not the production public entry point, and
-- there is no waitlist system intended for launch. Rather than merely rate-limit
-- an unused anonymous write surface, revoke INSERT from anon and authenticated.
-- service_role (and the postgres owner) retain access, so the table and its data
-- model remain available if a waitlist is reintroduced later via a server path.
--
-- The waitlist_rate_limit BEFORE INSERT trigger added earlier is now inert (anon
-- and authenticated have no INSERT privilege; service_role bypasses it by design)
-- and is left in place — harmless, and ready if the surface is reopened.
REVOKE INSERT ON public.waitlist FROM anon;
REVOKE INSERT ON public.waitlist FROM authenticated;

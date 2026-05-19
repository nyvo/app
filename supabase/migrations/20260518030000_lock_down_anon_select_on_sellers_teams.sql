-- Close anonymous-read leaks on sellers + teams.
--
-- Current state (pre-migration):
--   - public.sellers SELECT policy is `USING (true)` for role {public}, and the
--     default Supabase SELECT grant lets anon read every column, including:
--       dintero_approval_id   — internal Dintero KYC handle
--       dintero_contract_url  — hosted KYC URL (can carry a session token)
--       phone, organization_number — PII
--       settings              — jsonb, unbounded
--   - public.teams SELECT policy is also `USING (true)` for role {public},
--     so anon can read every team's `invite_code` and self-onboard to any team.
--
-- We're closing the anon side here (the highest-blast-radius leak). Authenticated
-- users still see full rows — locking that down further requires refactoring
-- AuthContext + PaymentsPage to fetch sensitive Dintero fields via an
-- authorization-gated RPC, which is tracked as separate follow-up work.
--
-- Mechanics: PostgREST honors column-level GRANTs. By REVOKEing SELECT on the
-- table from anon and GRANTing SELECT only on a whitelist of safe columns, anon
-- queries can no longer read sensitive columns even though the row-level
-- USING(true) policy still admits the row.

revoke select on public.sellers from anon;
grant select (
  id,
  name,
  logo_url,
  email,
  dintero_onboarding_complete,
  dintero_seller_id,
  dintero_onboarding_status,
  seller_type,
  created_at,
  updated_at
) on public.sellers to anon;

revoke select on public.teams from anon;
grant select (
  id,
  slug,
  name,
  cover_image_url,
  default_course_image_url,
  owner_seller_id,
  created_at,
  updated_at
) on public.teams to anon;

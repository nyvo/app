-- ============================================
-- SECURITY: close anonymous PII leak on signups
--
-- Problem: `"Anon can view signup counts"` on signups uses `USING (true)` and
-- grants anon full SELECT on every row — leaks name, email, phone, and paid
-- amount across all tenants to anyone holding the public anon key.
--
-- The policy was added for public-page capacity display ("3 av 10 plasser").
-- Replace with an aggregate-only RPC that returns counts, never rows.
--
-- Also tighten the over-broad anon policy on course_sessions (exposed session
-- dates of unpublished/draft courses) — restrict to sessions of published
-- courses only.
-- ============================================


-- 1. Drop the leaky signups anon policy.
DROP POLICY IF EXISTS "Anon can view signup counts" ON public.signups;


-- 2. Replacement: aggregate-only count RPC, callable by anon.
--    Returns only (course_id, confirmed_count) — no row data can leak.
CREATE OR REPLACE FUNCTION public.public_signup_counts(p_course_ids uuid[])
RETURNS TABLE (course_id uuid, confirmed_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT s.course_id, COUNT(*)::bigint
  FROM public.signups s
  WHERE s.course_id = ANY(p_course_ids)
    AND s.status = 'confirmed'
  GROUP BY s.course_id;
$$;

REVOKE ALL ON FUNCTION public.public_signup_counts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_signup_counts(uuid[]) TO anon, authenticated;

COMMENT ON FUNCTION public.public_signup_counts(uuid[]) IS
  'Aggregate-only capacity lookup for public course pages. Returns confirmed-signup counts keyed by course_id. Never exposes row data — replaces the permissive anon SELECT policy that was dropped.';


-- 3. Tighten course_sessions anon SELECT.
--    Old policy: USING (true) — exposed session dates on draft courses.
--    New: only sessions of non-draft courses visible to anon + non-org authenticated users.
--    Teacher/org access is handled by the existing "Course sessions SELECT" policy from
--    20260418010000 (org_member check); that policy remains in place.
DROP POLICY IF EXISTS "Course sessions are viewable by everyone" ON public.course_sessions;

CREATE POLICY "Course sessions of non-draft courses are viewable"
  ON public.course_sessions FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_sessions.course_id
        AND c.status <> 'draft'
    )
  );

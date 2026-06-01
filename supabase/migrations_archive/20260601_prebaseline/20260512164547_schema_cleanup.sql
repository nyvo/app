-- Schema cleanup — housekeeping pass after the marketplace renames.
--
-- 1. Drop duplicate indexes left over from venue→space→team and orgs→sellers
--    renames. Each pair was indexing the same columns with two names.
-- 2. Add case-insensitive slug uniqueness on teams + courses (GitHub pattern).
-- 3. Update stale table comments referencing the old space-actions flow and
--    pre-Dintero Stripe vocabulary.
-- 4. Rename indexes that still carry old-name prefixes for clarity.
-- 5. Drop teams.address + teams.city — they always mirror sellers.{address,city}
--    in practice, and the public-page query reads from sellers anyway. Edit
--    dialog will be repointed in app code to write to sellers.city.
-- 6. Document profiles.role as "UX hint, NOT authorization" to prevent the
--    column being used for authz decisions in future code.

BEGIN;

-- (1) Drop duplicate indexes
DROP INDEX IF EXISTS public.idx_spaces_slug;             -- duplicate of teams_slug_key
DROP INDEX IF EXISTS public.idx_courses_slug;            -- duplicate of courses_slug_unique
ALTER TABLE public.seller_members
  DROP CONSTRAINT IF EXISTS org_members_organization_id_user_id_key;  -- duplicate of seller_members_pkey

-- (2) Case-insensitive slug uniqueness. Prevents /Anna-yoga vs /anna-yoga
-- from creating two different teams. App always writes lowercase, but the
-- index defends the invariant at the DB level.
CREATE UNIQUE INDEX IF NOT EXISTS teams_slug_lower_idx ON public.teams (lower(slug));
CREATE UNIQUE INDEX IF NOT EXISTS courses_slug_lower_idx ON public.courses (lower(slug));

-- (3) Refresh stale comments
COMMENT ON TABLE public.teams IS 'Public storefront owned by a seller (1:1 via owner_seller_id). Renders at the flat root URL /<slug>. Other sellers can syndicate their courses here via team_affiliations + course_team_listings (studio-initiated, freelancer accepts).';
COMMENT ON TABLE public.processed_webhook_events IS 'Idempotency record for Dintero webhook events. Prevents double-processing on retries.';

-- (4) Rename stale indexes left over from earlier renames
ALTER INDEX public.organizations_pkey RENAME TO sellers_pkey;
ALTER INDEX public.idx_org_members_org RENAME TO idx_seller_members_seller;
ALTER INDEX public.idx_org_members_user RENAME TO idx_seller_members_user;
ALTER INDEX public.idx_courses_org RENAME TO idx_courses_seller;
ALTER INDEX public.idx_signups_org RENAME TO idx_signups_seller;

-- (5) Backfill sellers.{address,city} from teams.{address,city} before drop,
-- in case any team has data not yet mirrored. Then drop teams columns.
UPDATE public.sellers s
   SET city = COALESCE(s.city, t.city),
       address = COALESCE(s.address, t.address)
  FROM public.teams t
 WHERE t.owner_seller_id = s.id
   AND (s.city IS NULL OR s.address IS NULL);

ALTER TABLE public.teams DROP COLUMN IF EXISTS address;
ALTER TABLE public.teams DROP COLUMN IF EXISTS city;

-- (6) profiles.role doctrine
COMMENT ON COLUMN public.profiles.role IS 'UX hint for routing — distinguishes buyer vs seller persona for /onboarding branching and /overview sidebar contents. NOT for authorization. Authz checks must use seller_members (presence of row = seller; role column within = owner/admin).';

COMMIT;

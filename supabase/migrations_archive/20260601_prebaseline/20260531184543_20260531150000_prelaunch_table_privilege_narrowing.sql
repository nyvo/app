-- Prelaunch hardening, part 6:
-- narrow explicit table privileges for browser roles.
--
-- RLS remains the row boundary. This migration removes the broad table-level
-- grants that are explicit on anon/authenticated, then adds back only the
-- direct browser table surface observed in src as of 2026-05-31.
--
-- Keep sellers and anon teams reads column-scoped. Private/operational seller
-- fields stay behind the existing member-gated RPCs.

-- Future public tables created by the common migration owner roles should not
-- inherit full browser access.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON TABLES FROM anon, authenticated;

-- Drop broad live table grants. Column-level grants are restated below for the
-- public projections that intentionally rely on them.
REVOKE SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON ALL TABLES IN SCHEMA public
  FROM anon, authenticated;

-- Anonymous browser reads: public storefront, course detail/checkout surfaces,
-- and slug redirects. Waitlist is insert-only.
GRANT SELECT ON TABLE
  public.courses,
  public.course_sessions,
  public.course_signup_packages,
  public.course_team_listings,
  public.team_slug_aliases
TO anon;

GRANT SELECT (
  id,
  slug,
  name,
  cover_image_url,
  default_course_image_url,
  owner_seller_id,
  created_at,
  updated_at
) ON TABLE public.teams TO anon;

GRANT SELECT (
  id,
  name,
  logo_url,
  dintero_onboarding_complete,
  created_at
) ON TABLE public.sellers TO anon;

GRANT INSERT ON TABLE public.waitlist TO anon;

-- Authenticated browser reads: current teacher/buyer app direct table reads.
-- Do not grant table-level SELECT on sellers; keep the same public projection
-- as anon and use get_seller_operational/get_seller_private for member fields.
GRANT SELECT ON TABLE
  public.courses,
  public.course_sessions,
  public.course_signup_packages,
  public.course_team_listings,
  public.notifications,
  public.profiles,
  public.seller_members,
  public.signups,
  public.teacher_locations,
  public.team_affiliations,
  public.team_invite_links,
  public.team_slug_aliases,
  public.teams
TO authenticated;

GRANT SELECT (
  id,
  name,
  logo_url,
  dintero_onboarding_complete,
  created_at
) ON TABLE public.sellers TO authenticated;

-- Authenticated browser writes. Service-role Edge Functions keep their service
-- role access and are not constrained by these browser-role grants.
-- Direct browser deletes for course_sessions/course_signup_packages remain
-- ungranted; destructive flows should route through Edge Functions/RPCs.
GRANT INSERT, UPDATE, DELETE ON TABLE public.courses TO authenticated;
GRANT INSERT, UPDATE ON TABLE public.course_sessions TO authenticated;
GRANT INSERT, UPDATE ON TABLE public.course_signup_packages TO authenticated;
GRANT INSERT, DELETE ON TABLE public.course_team_listings TO authenticated;
GRANT UPDATE ON TABLE public.notifications TO authenticated;
GRANT UPDATE ON TABLE public.profiles TO authenticated;
GRANT UPDATE ON TABLE public.sellers TO authenticated;
GRANT INSERT ON TABLE public.signups TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.teacher_locations TO authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.team_affiliations TO authenticated;
GRANT UPDATE ON TABLE public.team_invite_links TO authenticated;
GRANT UPDATE ON TABLE public.teams TO authenticated;
GRANT INSERT ON TABLE public.waitlist TO authenticated;

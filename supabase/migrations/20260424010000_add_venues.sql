-- ============================================
-- Venue graph layer for shared-marketing studio pages
--
-- A venue is a pure graph node: label + metadata + edges to organizations.
-- Zero course ownership, zero money, zero authority over another org.
--
-- Inspire-style rental studio:
--   • Inspire Yogastudio       → one row in venues
--   • Each freelance teacher's → their own row in organizations (own Dintero)
--     studio org
--   • Each teacher's org       → one row in venue_members(role='tenant')
--   • Inspire founder's own    → one row in venue_members(role='admin')
--     teaching org
--
-- Permission to manage the venue comes from the existing Org role system:
-- user must be owner/admin of an org that has venue_members.role='admin'
-- on the target venue. No new user-level role.
-- ============================================

-- ============================================
-- 1. venues
-- ============================================
CREATE TABLE public.venues (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text UNIQUE NOT NULL,
  name            text NOT NULL,
  description     text,
  address         text,
  city            text,
  cover_image_url text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_venues_slug ON public.venues(slug);

COMMENT ON TABLE public.venues IS
  'Marketing/discovery grouping for orgs that operate at a shared physical space. Pure graph node — no course ownership, no money.';


-- ============================================
-- 2. venue_members
-- ============================================
CREATE TABLE public.venue_members (
  venue_id         uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  organization_id  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role             text NOT NULL DEFAULT 'tenant' CHECK (role IN ('tenant', 'admin')),
  joined_at        timestamptz NOT NULL DEFAULT now(),
  visible          boolean NOT NULL DEFAULT true,
  PRIMARY KEY (venue_id, organization_id)
);

CREATE INDEX idx_venue_members_organization ON public.venue_members(organization_id);
CREATE INDEX idx_venue_members_venue ON public.venue_members(venue_id);

COMMENT ON TABLE public.venue_members IS
  'Edges between venues and orgs. role=tenant means the org operates at the venue; role=admin also grants curation rights (edit venue metadata, add/remove members) to anyone who is owner/admin of that org.';
COMMENT ON COLUMN public.venue_members.visible IS
  'When false, the member org is hidden from the public venue page but the membership is retained. Used for temporary parking without severing the link.';


-- ============================================
-- 3. Helper: is_venue_admin(venue_id, user_id)
--
-- "Can user X curate venue Y?"
-- Chain: user is owner/admin of some org, and that org is a venue_members
-- row with role='admin' on the target venue.
-- ============================================
CREATE OR REPLACE FUNCTION public.is_venue_admin(p_venue_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_members om
    JOIN public.venue_members vm ON vm.organization_id = om.organization_id
    WHERE om.user_id = p_user_id
      AND vm.venue_id = p_venue_id
      AND vm.role = 'admin'
      AND om.role IN ('owner', 'admin')
  );
$$;

REVOKE ALL ON FUNCTION public.is_venue_admin(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_venue_admin(uuid, uuid) TO authenticated;


-- ============================================
-- 4. Row-level security
-- ============================================
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_members ENABLE ROW LEVEL SECURITY;

-- venues: public read (so venue pages work without auth)
CREATE POLICY "Venues are publicly readable"
  ON public.venues FOR SELECT
  TO anon, authenticated
  USING (true);

-- venues: updates require being a venue admin via the chain
CREATE POLICY "Venue admins can update venue"
  ON public.venues FOR UPDATE
  TO authenticated
  USING (public.is_venue_admin(id, (SELECT auth.uid())))
  WITH CHECK (public.is_venue_admin(id, (SELECT auth.uid())));

CREATE POLICY "Venue admins can delete venue"
  ON public.venues FOR DELETE
  TO authenticated
  USING (public.is_venue_admin(id, (SELECT auth.uid())));

-- venues: no public INSERT policy. Creating a new venue is a service-role
-- operation for MVP (seeded via MCP/admin tooling). A future /venue-onboarding
-- edge function can create venue + first admin member atomically.

-- venue_members: anon + authenticated can read visible members (for the
-- public venue page). Authenticated users additionally see their own org's
-- memberships regardless of visible flag.
CREATE POLICY "Public can read visible venue members"
  ON public.venue_members FOR SELECT
  TO anon, authenticated
  USING (visible = true);

CREATE POLICY "Org members can read own venue memberships"
  ON public.venue_members FOR SELECT
  TO authenticated
  USING (public.is_org_member(organization_id, (SELECT auth.uid())));

-- venue_members: inserts/updates/deletes require venue-admin chain.
-- (Chicken-and-egg note: the very first venue_members.role='admin' row
-- for a brand-new venue must be created via service role. Once it exists,
-- that admin's org can add more members through this policy.)
CREATE POLICY "Venue admins can add members"
  ON public.venue_members FOR INSERT
  TO authenticated
  WITH CHECK (public.is_venue_admin(venue_id, (SELECT auth.uid())));

CREATE POLICY "Venue admins can update members"
  ON public.venue_members FOR UPDATE
  TO authenticated
  USING (public.is_venue_admin(venue_id, (SELECT auth.uid())))
  WITH CHECK (public.is_venue_admin(venue_id, (SELECT auth.uid())));

CREATE POLICY "Venue admins can remove members"
  ON public.venue_members FOR DELETE
  TO authenticated
  USING (public.is_venue_admin(venue_id, (SELECT auth.uid())));


-- ============================================
-- 5. updated_at trigger on venues
-- ============================================
CREATE OR REPLACE FUNCTION public.tg_venues_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_venues_updated_at
  BEFORE UPDATE ON public.venues
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_venues_updated_at();

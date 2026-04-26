-- ============================================================================
-- venue → space rename (final pre-launch cleanup)
--
-- Pure schema rename: tables, columns, helpers, policies, triggers all move
-- from "venue*" to "space*". No data shape changes; ALTER ... RENAME preserves
-- rows and FK relationships. Policies must be drop+recreated because their
-- bodies reference the table names directly.
-- ============================================================================

-- 1. Drop policies (must drop before rename — they reference table names).
DROP POLICY IF EXISTS "Venues are publicly readable" ON public.venues;
DROP POLICY IF EXISTS "Venue admins can update venue" ON public.venues;
DROP POLICY IF EXISTS "Venue admins can delete venue" ON public.venues;
DROP POLICY IF EXISTS "Public can read visible venue members" ON public.venue_members;
DROP POLICY IF EXISTS "Org members can read own venue memberships" ON public.venue_members;
DROP POLICY IF EXISTS "Venue admins can add members" ON public.venue_members;
DROP POLICY IF EXISTS "Venue admins can update members" ON public.venue_members;
DROP POLICY IF EXISTS "Org owners and admins can update own venue memberships" ON public.venue_members;
DROP POLICY IF EXISTS "Venue admins can remove members" ON public.venue_members;
DROP POLICY IF EXISTS "Org members can read own join requests" ON public.venue_join_requests;
DROP POLICY IF EXISTS "Venue admins can read venue join requests" ON public.venue_join_requests;
DROP POLICY IF EXISTS "Org owners and admins can submit join requests" ON public.venue_join_requests;
DROP POLICY IF EXISTS "Requester can cancel own pending request" ON public.venue_join_requests;
DROP POLICY IF EXISTS "Venue admins can decide pending requests" ON public.venue_join_requests;

-- 2. Drop triggers + functions.
DROP TRIGGER IF EXISTS tg_venues_updated_at ON public.venues;
DROP TRIGGER IF EXISTS tg_vjr_updated_at ON public.venue_join_requests;
DROP TRIGGER IF EXISTS tg_venue_members_role_guard ON public.venue_members;
DROP FUNCTION IF EXISTS public.is_venue_admin(uuid, uuid);
DROP FUNCTION IF EXISTS public.tg_venues_updated_at();
DROP FUNCTION IF EXISTS public.tg_venue_members_role_guard();

-- 3. Rename tables.
ALTER TABLE public.venues RENAME TO spaces;
ALTER TABLE public.venue_members RENAME TO space_members;
ALTER TABLE public.venue_join_requests RENAME TO space_join_requests;

-- 4. Rename column venue_id → space_id.
ALTER TABLE public.space_members RENAME COLUMN venue_id TO space_id;
ALTER TABLE public.space_join_requests RENAME COLUMN venue_id TO space_id;

-- 5. Rename indexes (cosmetic but worth doing for consistency).
ALTER INDEX public.idx_venues_slug RENAME TO idx_spaces_slug;
ALTER INDEX public.idx_venue_members_organization RENAME TO idx_space_members_organization;
ALTER INDEX public.idx_venue_members_venue RENAME TO idx_space_members_space;
ALTER INDEX public.idx_vjr_pending_unique RENAME TO idx_sjr_pending_unique;
ALTER INDEX public.idx_vjr_venue_status RENAME TO idx_sjr_space_status;
ALTER INDEX public.idx_vjr_org RENAME TO idx_sjr_org;
ALTER INDEX public.venues_pkey RENAME TO spaces_pkey;
ALTER INDEX public.venues_slug_key RENAME TO spaces_slug_key;
ALTER INDEX public.venue_members_pkey RENAME TO space_members_pkey;
ALTER INDEX public.venue_join_requests_pkey RENAME TO space_join_requests_pkey;

-- 6. Recreate helper function: is_venue_admin → is_space_admin.
CREATE OR REPLACE FUNCTION public.is_space_admin(p_space_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_members om
    JOIN public.space_members sm ON sm.organization_id = om.organization_id
    WHERE om.user_id = p_user_id
      AND sm.space_id = p_space_id
      AND sm.role = 'admin'
      AND om.role IN ('owner', 'admin')
  );
$$;

REVOKE ALL ON FUNCTION public.is_space_admin(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_space_admin(uuid, uuid) TO authenticated;

-- 7. Recreate updated_at trigger function + attach to both tables.
CREATE OR REPLACE FUNCTION public.tg_spaces_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_spaces_updated_at
  BEFORE UPDATE ON public.spaces
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_spaces_updated_at();

CREATE TRIGGER tg_sjr_updated_at
  BEFORE UPDATE ON public.space_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_spaces_updated_at();

-- 8. Recreate role-guard trigger (uses is_space_admin now).
CREATE OR REPLACE FUNCTION public.tg_space_members_role_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT public.is_space_admin(NEW.space_id, auth.uid()) THEN
      RAISE EXCEPTION 'Only space admins can change a member''s role'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NEW.space_id IS DISTINCT FROM OLD.space_id
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'Cannot reassign space_members to a different space/org'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_space_members_role_guard
  BEFORE UPDATE ON public.space_members
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_space_members_role_guard();

-- 9. Recreate RLS policies under new names.

-- spaces
CREATE POLICY "Spaces are publicly readable"
  ON public.spaces FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Space admins can update space"
  ON public.spaces FOR UPDATE
  TO authenticated
  USING (public.is_space_admin(id, (SELECT auth.uid())))
  WITH CHECK (public.is_space_admin(id, (SELECT auth.uid())));

CREATE POLICY "Space admins can delete space"
  ON public.spaces FOR DELETE
  TO authenticated
  USING (public.is_space_admin(id, (SELECT auth.uid())));

-- space_members
CREATE POLICY "Public can read visible space members"
  ON public.space_members FOR SELECT
  TO anon, authenticated
  USING (visible = true);

CREATE POLICY "Org members can read own space memberships"
  ON public.space_members FOR SELECT
  TO authenticated
  USING (public.is_org_member(organization_id, (SELECT auth.uid())));

CREATE POLICY "Space admins can add members"
  ON public.space_members FOR INSERT
  TO authenticated
  WITH CHECK (public.is_space_admin(space_id, (SELECT auth.uid())));

CREATE POLICY "Space admins can update members"
  ON public.space_members FOR UPDATE
  TO authenticated
  USING (public.is_space_admin(space_id, (SELECT auth.uid())))
  WITH CHECK (public.is_space_admin(space_id, (SELECT auth.uid())));

CREATE POLICY "Org owners and admins can update own space memberships"
  ON public.space_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.organization_id = space_members.organization_id
        AND om.user_id = (SELECT auth.uid())
        AND om.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.organization_id = space_members.organization_id
        AND om.user_id = (SELECT auth.uid())
        AND om.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Space admins can remove members"
  ON public.space_members FOR DELETE
  TO authenticated
  USING (public.is_space_admin(space_id, (SELECT auth.uid())));

-- space_join_requests
CREATE POLICY "Org members can read own join requests"
  ON public.space_join_requests FOR SELECT
  TO authenticated
  USING (public.is_org_member(organization_id, (SELECT auth.uid())));

CREATE POLICY "Space admins can read space join requests"
  ON public.space_join_requests FOR SELECT
  TO authenticated
  USING (public.is_space_admin(space_id, (SELECT auth.uid())));

CREATE POLICY "Org owners and admins can submit join requests"
  ON public.space_join_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.organization_id = space_join_requests.organization_id
        AND om.user_id = (SELECT auth.uid())
        AND om.role IN ('owner', 'admin')
    )
    AND requested_by_user_id = (SELECT auth.uid())
    AND status = 'pending'
    AND decided_by_user_id IS NULL
    AND decided_at IS NULL
  );

CREATE POLICY "Requester can cancel own pending request"
  ON public.space_join_requests FOR UPDATE
  TO authenticated
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.organization_id = space_join_requests.organization_id
        AND om.user_id = (SELECT auth.uid())
        AND om.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (status = 'cancelled');

CREATE POLICY "Space admins can decide pending requests"
  ON public.space_join_requests FOR UPDATE
  TO authenticated
  USING (
    status = 'pending'
    AND public.is_space_admin(space_id, (SELECT auth.uid()))
  )
  WITH CHECK (status IN ('approved', 'rejected'));

-- 10. Update table comments.
COMMENT ON TABLE public.spaces IS
  'Marketing/discovery grouping for orgs that operate at a shared physical place. Pure graph node — no course ownership, no money. Renamed from venues 2026-04-25.';
COMMENT ON TABLE public.space_members IS
  'Edges between spaces and orgs. role=tenant means the org operates at the space; role=admin also grants curation rights to anyone who is owner/admin of that org. Renamed from venue_members 2026-04-25.';
COMMENT ON TABLE public.space_join_requests IS
  'Org-initiated requests to join a space. Approval inserts a space_members row via the space-join-requests edge function. Renamed from venue_join_requests 2026-04-25.';
COMMENT ON COLUMN public.space_members.visible IS
  'When false, the member org is hidden from the public space page but the membership is retained.';

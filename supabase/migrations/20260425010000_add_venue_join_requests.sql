-- ============================================
-- Venue join-request flow + tenant self-visibility
--
-- Adds the table + RLS + indexes to power teacher-initiated requests
-- to join a venue, and extends venue_members updates so a tenant org's
-- owner/admin can flip their own visibility on the venue page (instant
-- toggle in the UI). Role changes remain venue-admin-only via a guard
-- trigger.
-- ============================================

-- ============================================
-- 1. venue_join_requests
-- ============================================
CREATE TABLE public.venue_join_requests (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id              uuid NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  organization_id       uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  requested_by_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status                text NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','approved','rejected','cancelled')),
  message               text,
  decided_by_user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at            timestamptz,
  decision_note         text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CHECK (length(coalesce(message, '')) <= 500),
  CHECK (length(coalesce(decision_note, '')) <= 500)
);

-- Partial unique index: at most one pending request per (venue, org).
-- Allows re-submission after rejection/cancellation without DELETE.
CREATE UNIQUE INDEX idx_vjr_pending_unique
  ON public.venue_join_requests (venue_id, organization_id)
  WHERE status = 'pending';

CREATE INDEX idx_vjr_venue_status ON public.venue_join_requests (venue_id, status);
CREATE INDEX idx_vjr_org           ON public.venue_join_requests (organization_id);

COMMENT ON TABLE public.venue_join_requests IS
  'Teacher/org-initiated requests to join a venue. Approval inserts a venue_members row via the venue-join-requests edge function. Rows persist as audit log; cancellation/rejection are state changes, not deletes.';

-- updated_at — reuse the venues trigger function (same shape).
CREATE TRIGGER tg_vjr_updated_at
  BEFORE UPDATE ON public.venue_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_venues_updated_at();


-- ============================================
-- 2. RLS on venue_join_requests
-- ============================================
ALTER TABLE public.venue_join_requests ENABLE ROW LEVEL SECURITY;

-- Read: org members can read their own org's requests.
CREATE POLICY "Org members can read own join requests"
  ON public.venue_join_requests FOR SELECT
  TO authenticated
  USING (public.is_org_member(organization_id, (SELECT auth.uid())));

-- Read: venue admins can read all requests targeting their venue.
CREATE POLICY "Venue admins can read venue join requests"
  ON public.venue_join_requests FOR SELECT
  TO authenticated
  USING (public.is_venue_admin(venue_id, (SELECT auth.uid())));

-- Insert: org owner OR admin can submit on behalf of their org.
-- Inline EXISTS (no new is_org_admin helper — single consumer for now).
CREATE POLICY "Org owners and admins can submit join requests"
  ON public.venue_join_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.organization_id = venue_join_requests.organization_id
        AND om.user_id = (SELECT auth.uid())
        AND om.role IN ('owner', 'admin')
    )
    AND requested_by_user_id = (SELECT auth.uid())
    AND status = 'pending'
    AND decided_by_user_id IS NULL
    AND decided_at IS NULL
  );

-- Update: requester can flip pending → cancelled.
-- Service layer narrows to { status: 'cancelled' }; WITH CHECK pins terminal state.
CREATE POLICY "Requester can cancel own pending request"
  ON public.venue_join_requests FOR UPDATE
  TO authenticated
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.organization_id = venue_join_requests.organization_id
        AND om.user_id = (SELECT auth.uid())
        AND om.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (status = 'cancelled');

-- Update: venue admins can decide pending → approved/rejected.
-- The actual side-effect (insert into venue_members on approve) is done
-- via service-role inside the venue-join-requests edge function so a
-- single client call yields atomic state.
CREATE POLICY "Venue admins can decide pending requests"
  ON public.venue_join_requests FOR UPDATE
  TO authenticated
  USING (
    status = 'pending'
    AND public.is_venue_admin(venue_id, (SELECT auth.uid()))
  )
  WITH CHECK (status IN ('approved', 'rejected'));


-- ============================================
-- 3. Tenant self-visibility on venue_members
--
-- Existing policy "Venue admins can update members" lets a venue admin
-- edit anyone's row. We additionally let the *tenant* org's owner/admin
-- update their own row so they can flip the `visible` flag from the
-- "Mine medlemskap" section. RLS can't restrict to a specific column,
-- so we add a guard trigger below that blocks non-admins from changing
-- `role` (or moving the row to a different venue/org).
-- ============================================
CREATE POLICY "Org owners and admins can update own venue memberships"
  ON public.venue_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.organization_id = venue_members.organization_id
        AND om.user_id = (SELECT auth.uid())
        AND om.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.organization_id = venue_members.organization_id
        AND om.user_id = (SELECT auth.uid())
        AND om.role IN ('owner', 'admin')
    )
  );

-- Guard trigger: only a venue admin can change role / move row.
CREATE OR REPLACE FUNCTION public.tg_venue_members_role_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT public.is_venue_admin(NEW.venue_id, auth.uid()) THEN
      RAISE EXCEPTION 'Only venue admins can change a member''s role'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- venue_id and organization_id are part of the PK and must not migrate.
  IF NEW.venue_id IS DISTINCT FROM OLD.venue_id
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'Cannot reassign venue_members to a different venue/org'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_venue_members_role_guard
  BEFORE UPDATE ON public.venue_members
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_venue_members_role_guard();

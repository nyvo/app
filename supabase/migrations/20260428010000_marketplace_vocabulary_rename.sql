-- ============================================================================
-- Marketplace vocabulary rename
--   organizations    -> sellers
--   org_members      -> seller_members
--   spaces           -> teams
--   space_members    -> team_members
--   organization_id  -> seller_id (everywhere)
--   space_id         -> team_id
--   org_member_role  -> seller_member_role
-- Plus: profiles.account_type, sellers.seller_type, sellers.organization_number,
--       teams.owner_seller_id, teams.default_course_image_url, signups.buyer_id.
-- Drops on sellers: slug, description, default_course_image_url, studio_shared_at
-- (consolidated to teams).
--
-- Applied via mcp__supabase__apply_migration on 2026-04-28. This file is the
-- canonical record for git history.
-- ============================================================================

-- Drop pre-existing policies (those not auto-CASCADEd by helper-function drop)
DROP POLICY IF EXISTS "Public can read organizations" ON public.organizations;
DROP POLICY IF EXISTS "Org admins can update organization" ON public.organizations;
DROP POLICY IF EXISTS "Service role can insert organizations" ON public.organizations;
DROP POLICY IF EXISTS "Spaces are publicly readable" ON public.spaces;
DROP POLICY IF EXISTS "Space admins can update space" ON public.spaces;
DROP POLICY IF EXISTS "Space admins can delete space" ON public.spaces;
DROP POLICY IF EXISTS "Public can read visible space members" ON public.space_members;
DROP POLICY IF EXISTS "Org members can read own space memberships" ON public.space_members;
DROP POLICY IF EXISTS "Space admins can add members" ON public.space_members;
DROP POLICY IF EXISTS "Space admins can update members" ON public.space_members;
DROP POLICY IF EXISTS "Space admins can remove members" ON public.space_members;
DROP POLICY IF EXISTS "Org owners and admins can leave space" ON public.space_members;
DROP POLICY IF EXISTS "Course sessions of non-draft courses are viewable" ON public.course_sessions;
DROP POLICY IF EXISTS "course_sessions public read" ON public.course_sessions;
DROP POLICY IF EXISTS "course_instructors public read" ON public.course_instructors;

-- Drop helpers with CASCADE (catches any remaining function-dependent policies)
DROP FUNCTION IF EXISTS public.is_org_member(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_org_owner(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_space_admin(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_venue_admin(uuid, uuid) CASCADE;

DROP FUNCTION IF EXISTS public.ensure_organization_for_user(text, text);
DROP FUNCTION IF EXISTS public.delete_course_cascade(uuid);
DROP FUNCTION IF EXISTS public.check_session_conflict(uuid, date, time, time, uuid);
DROP FUNCTION IF EXISTS public.check_sessions_conflicts(uuid, jsonb, uuid);
DROP FUNCTION IF EXISTS public.create_course_idempotent(uuid, text, text, text, text, text, text, text, text, integer, integer, numeric, integer, date, date, uuid, text, uuid);
DROP FUNCTION IF EXISTS public.create_signup_if_available(uuid, uuid, uuid, text, text, text, numeric, text, text, text, uuid, uuid);
DROP FUNCTION IF EXISTS public.get_signup_by_dintero_id(text, text);

DROP TRIGGER IF EXISTS tg_spaces_updated_at ON public.spaces;
DROP FUNCTION IF EXISTS public.tg_spaces_updated_at();

-- Wipe space data (pre-launch; rebuilt below from sellers)
DELETE FROM public.space_members;
DELETE FROM public.spaces;

-- Rename enum + tables + columns + constraints + indexes
ALTER TYPE public.org_member_role RENAME TO seller_member_role;

ALTER TABLE public.organizations RENAME TO sellers;
ALTER TABLE public.org_members    RENAME TO seller_members;
ALTER TABLE public.spaces         RENAME TO teams;
ALTER TABLE public.space_members  RENAME TO team_members;

ALTER TABLE public.seller_members      RENAME COLUMN organization_id TO seller_id;
ALTER TABLE public.team_members        RENAME COLUMN organization_id TO seller_id;
ALTER TABLE public.team_members        RENAME COLUMN space_id        TO team_id;
ALTER TABLE public.courses             RENAME COLUMN organization_id TO seller_id;
ALTER TABLE public.signups             RENAME COLUMN organization_id TO seller_id;
ALTER TABLE public.conversations       RENAME COLUMN organization_id TO seller_id;
ALTER TABLE public.teacher_locations   RENAME COLUMN organization_id TO seller_id;
ALTER TABLE public.payment_audit_log   RENAME COLUMN organization_id TO seller_id;
ALTER TABLE public.payment_attempts    RENAME COLUMN organization_id TO seller_id;

ALTER TABLE public.seller_members      RENAME CONSTRAINT org_members_organization_id_fkey       TO seller_members_seller_id_fkey;
ALTER TABLE public.seller_members      RENAME CONSTRAINT org_members_user_id_fkey               TO seller_members_user_id_fkey;
ALTER TABLE public.courses             RENAME CONSTRAINT courses_organization_id_fkey           TO courses_seller_id_fkey;
ALTER TABLE public.signups             RENAME CONSTRAINT signups_organization_id_fkey           TO signups_seller_id_fkey;
ALTER TABLE public.conversations       RENAME CONSTRAINT conversations_organization_id_fkey     TO conversations_seller_id_fkey;
ALTER TABLE public.teacher_locations   RENAME CONSTRAINT teacher_locations_organization_id_fkey TO teacher_locations_seller_id_fkey;
ALTER TABLE public.payment_audit_log   RENAME CONSTRAINT payment_audit_log_organization_id_fkey TO payment_audit_log_seller_id_fkey;
ALTER TABLE public.payment_attempts    RENAME CONSTRAINT payment_attempts_organization_id_fkey  TO payment_attempts_seller_id_fkey;
ALTER TABLE public.team_members        RENAME CONSTRAINT venue_members_venue_id_fkey            TO team_members_team_id_fkey;
ALTER TABLE public.team_members        RENAME CONSTRAINT venue_members_organization_id_fkey     TO team_members_seller_id_fkey;

ALTER INDEX IF EXISTS public.idx_space_members_organization RENAME TO idx_team_members_seller;
ALTER INDEX IF EXISTS public.idx_space_members_space        RENAME TO idx_team_members_team;
ALTER INDEX IF EXISTS public.idx_spaces_invite_code         RENAME TO idx_teams_invite_code;
ALTER INDEX IF EXISTS public.spaces_pkey                    RENAME TO teams_pkey;
ALTER INDEX IF EXISTS public.spaces_slug_key                RENAME TO teams_slug_key;
ALTER INDEX IF EXISTS public.space_members_pkey             RENAME TO team_members_pkey;

-- New columns
ALTER TABLE public.profiles
  ADD COLUMN account_type text NOT NULL DEFAULT 'seller'
  CHECK (account_type IN ('buyer', 'seller'));
COMMENT ON COLUMN public.profiles.account_type IS
  'Self-described role at signup. Drives default-landing UX. Not a hard restriction.';

ALTER TABLE public.sellers
  ADD COLUMN seller_type text NOT NULL DEFAULT 'individual'
  CHECK (seller_type IN ('individual', 'business'));
COMMENT ON COLUMN public.sellers.seller_type IS
  'Set at onboarding from the Privatperson/Bedrift question. Drives KYC routing and dashboard copy.';

ALTER TABLE public.sellers ADD COLUMN organization_number text;
COMMENT ON COLUMN public.sellers.organization_number IS
  'Norwegian organisasjonsnummer (9 digits). NULL until Dintero onboarding collects it.';

ALTER TABLE public.teams ADD COLUMN owner_seller_id uuid REFERENCES public.sellers(id);
COMMENT ON COLUMN public.teams.owner_seller_id IS
  'The seller that owns this team brand. Member sellers list courses on it.';

ALTER TABLE public.teams ADD COLUMN default_course_image_url text;
COMMENT ON COLUMN public.teams.default_course_image_url IS
  'Fallback hero image for courses on this team that have no own image_url.';

ALTER TABLE public.signups
  ADD COLUMN buyer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.signups.buyer_id IS
  'Logged-in buyer profile. NULL for guest checkouts.';
CREATE INDEX IF NOT EXISTS idx_signups_buyer_id ON public.signups(buyer_id);

-- Backfill: one team per seller, seller is admin
INSERT INTO public.teams (slug, name, description, address, city, default_course_image_url, owner_seller_id, invite_code)
SELECT s.slug, s.name, s.description, s.address, s.city, s.default_course_image_url, s.id,
  upper(substring(md5(random()::text || s.id::text || clock_timestamp()::text) from 1 for 8))
FROM public.sellers s;

INSERT INTO public.team_members (team_id, seller_id, role, joined_at, visible)
SELECT t.id, t.owner_seller_id, 'admin', now(), true FROM public.teams t;

ALTER TABLE public.teams ALTER COLUMN owner_seller_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_teams_owner_seller ON public.teams(owner_seller_id);

-- Drop seller columns (consolidated to teams)
ALTER TABLE public.sellers DROP COLUMN IF EXISTS slug;
ALTER TABLE public.sellers DROP COLUMN IF EXISTS description;
ALTER TABLE public.sellers DROP COLUMN IF EXISTS default_course_image_url;
ALTER TABLE public.sellers DROP COLUMN IF EXISTS studio_shared_at;

-- seller_members composite PK (drop surrogate)
ALTER TABLE public.seller_members DROP CONSTRAINT IF EXISTS org_members_pkey;
ALTER TABLE public.seller_members DROP CONSTRAINT IF EXISTS seller_members_pkey;
ALTER TABLE public.seller_members DROP COLUMN IF EXISTS id;
ALTER TABLE public.seller_members ADD PRIMARY KEY (seller_id, user_id);

-- Helper functions
CREATE OR REPLACE FUNCTION public.is_seller_member(p_seller_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.seller_members
    WHERE seller_id = p_seller_id AND user_id = p_user_id);
$$;
REVOKE ALL ON FUNCTION public.is_seller_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_seller_member(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_seller_owner(p_seller_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.seller_members
    WHERE seller_id = p_seller_id AND user_id = p_user_id
      AND role IN ('owner', 'admin'));
$$;
REVOKE ALL ON FUNCTION public.is_seller_owner(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_seller_owner(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_team_admin(p_team_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.seller_members sm
    JOIN public.team_members tm ON tm.seller_id = sm.seller_id
    WHERE sm.user_id = p_user_id AND tm.team_id = p_team_id
      AND tm.role = 'admin' AND sm.role IN ('owner', 'admin'));
$$;
REVOKE ALL ON FUNCTION public.is_team_admin(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_team_admin(uuid, uuid) TO authenticated, service_role;

-- Trigger functions (CREATE OR REPLACE keeps existing triggers attached)
CREATE OR REPLACE FUNCTION public.log_payment_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.payment_status IS NULL THEN RETURN NEW; END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.payment_status IS NOT DISTINCT FROM OLD.payment_status THEN RETURN NEW; END IF;
  END IF;
  INSERT INTO public.payment_audit_log (
    signup_id, seller_id, changed_by, old_status, new_status, via_external, changed_at
  ) VALUES (
    NEW.id, NEW.seller_id, auth.uid(),
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.payment_status ELSE NULL END,
    NEW.payment_status, NEW.dintero_transaction_id IS NOT NULL, now()
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_session_no_conflict()
RETURNS trigger LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE v_seller_id UUID; v_duration INTEGER; v_end_time TIME; v_conflict RECORD;
BEGIN
  SELECT c.seller_id, COALESCE(c.duration, 60) INTO v_seller_id, v_duration
  FROM public.courses c WHERE c.id = NEW.course_id;
  v_end_time := NEW.start_time + (v_duration || ' minutes')::INTERVAL;
  SELECT * INTO v_conflict
  FROM public.check_session_conflict(v_seller_id, NEW.session_date, NEW.start_time, v_end_time, NEW.course_id) AS c
  WHERE c.has_conflict = TRUE;
  IF FOUND THEN
    RAISE EXCEPTION 'Session conflicts with existing course: % (%-%)',
      v_conflict.conflicting_course_title, v_conflict.conflicting_start, v_conflict.conflicting_end
      USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_teams_updated_at()
RETURNS trigger LANGUAGE plpgsql
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER tg_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.tg_teams_updated_at();

-- (RPC functions, ensure_seller_for_user, and all RLS policies — see migration
--  applied via apply_migration on 2026-04-28. The remote DB is the source of
--  truth for those bodies; this file is a record of the operation.)

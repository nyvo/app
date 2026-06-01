-- ============================================================================
-- Simplify the Spaces feature for MVP launch
--
-- Replaces the request/approve flow with an invite-code model:
--   - Admin creates a space → gets a short invite code
--   - Admin shares code out-of-band
--   - Tenant pastes code → joins instantly as 'tenant'
--   - Tenant can leave their own space at any time
--
-- This drops the entire join-request subsystem (table + policies + role guard
-- trigger + tenant-self-visibility update policy) since none of it is reachable
-- from the new UI. Existing space + space_members data is preserved.
-- ============================================================================

-- 1. Drop join-request infra entirely (table CASCADE drops policies + indexes).
DROP TABLE IF EXISTS public.space_join_requests CASCADE;

-- 2. Drop role-guard trigger + function. No more role transitions in MVP — the
--    create flow makes the caller 'admin', join-with-code makes them 'tenant',
--    and there's no UI path to mutate role. RLS prevents non-admin role writes
--    via the "Space admins can update members" policy alone.
DROP TRIGGER IF EXISTS tg_space_members_role_guard ON public.space_members;
DROP FUNCTION IF EXISTS public.tg_space_members_role_guard();

-- 3. Drop the tenant-self-visibility update policy. With no visibility toggle
--    in the new UI, this policy has no caller. The "Space admins can update
--    members" policy still covers admin-driven updates if we ever add them.
DROP POLICY IF EXISTS "Org owners and admins can update own space memberships"
  ON public.space_members;

-- 4. Add invite_code on spaces. Short, alphanumeric, uppercase, dash-separated
--    for human readability ("X4P-7K9"). Generated server-side; can be rotated
--    by a future admin action.
ALTER TABLE public.spaces ADD COLUMN invite_code text;

-- Backfill existing rows with random codes (none exist post-cleanup, but
-- migration must be safe to re-run on a populated DB).
UPDATE public.spaces
SET invite_code = upper(substring(replace(encode(gen_random_bytes(6), 'base64'), '/', '') from 1 for 7))
WHERE invite_code IS NULL;

ALTER TABLE public.spaces ALTER COLUMN invite_code SET NOT NULL;

-- Unique index supports lookup by code in the join-with-code edge function.
CREATE UNIQUE INDEX idx_spaces_invite_code ON public.spaces(invite_code);

-- 5. Allow a tenant to leave their own space. Admin uses the existing "Space
--    admins can remove members" policy; this adds the symmetric self-leave
--    path for tenants. Org owner/admin authority required (an instructor on
--    the org can't unilaterally leave).
CREATE POLICY "Org owners and admins can leave space"
  ON public.space_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members om
      WHERE om.organization_id = space_members.organization_id
        AND om.user_id = (SELECT auth.uid())
        AND om.role IN ('owner', 'admin')
    )
  );

-- 6. Update comments for the new model.
COMMENT ON TABLE public.spaces IS
  'Marketing/discovery grouping for orgs that share a physical place. Each space has a single admin (creator) and any number of tenants joined via invite_code. Created via the space-actions edge function (action=create); joined via action=join-with-code.';
COMMENT ON COLUMN public.spaces.invite_code IS
  'Short alphanumeric code shared out-of-band by the admin to invite tenants. Unique across all spaces. Rotatable post-launch.';

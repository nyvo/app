-- Role simplification — collapse to a single visible studio role (owner/operator).
--
-- Audit (2026-06-06): owner and admin are treated identically by every authz
-- surface — is_seller_member (any role), is_seller_owner (role IN owner,admin),
-- is_team_admin (role IN owner,admin), edge verifyOrgMembership(['owner','admin']),
-- NOTIFIABLE_ROLES. Nothing requires 'admin' alone. Worse, several owner-ONLY
-- paths (Dintero onboarding completion, redeem_team_invite_link, team slug rename,
-- team creation) check role = 'owner' directly and therefore EXCLUDED the 6 solo
-- studios whose only member was 'admin'. The 7 admin rows were legacy 2026-05-20
-- seed data created via the column DEFAULT 'admin'; today's signup RPC already
-- writes 'owner' explicitly.
--
-- Product decision: one studio role. profiles.role (buyer/seller) stays as account
-- type; seller_members.role stays as internal authorization but is always 'owner'.

-- 1) Migrate legacy admin rows. Behavior-preserving, and un-breaks the formerly
--    admin-only studios' owner-gated features.
UPDATE public.seller_members SET role = 'owner' WHERE role = 'admin';

-- 2) Default new memberships to 'owner' (removes the DEFAULT 'admin' footgun).
ALTER TABLE public.seller_members ALTER COLUMN role SET DEFAULT 'owner';

-- 3) The enum value 'admin' is retained (no risky enum surgery) but...
-- 4) ...enforce the single-role decision at the DB so no future insert/update path
--    can write 'admin' explicitly. Step 1 left zero non-owner rows, so the
--    constraint validates immediately.
ALTER TABLE public.seller_members
  ADD CONSTRAINT seller_members_role_owner_only CHECK (role = 'owner'::seller_member_role);

COMMENT ON COLUMN public.seller_members.role IS
  'Single studio owner/operator role; always ''owner''. The enum value ''admin'' is retained only as a legacy value and is blocked by the seller_members_role_owner_only CHECK. There is no ''teacher'' role.';

COMMENT ON CONSTRAINT seller_members_role_owner_only ON public.seller_members IS
  'Enforces the one-studio-role product decision: memberships may only be ''owner''. Drop this if a genuine multi-role model (with assignment UI) is reintroduced.';

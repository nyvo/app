-- Onboarding role split — distinguishes buyers from sellers at the profile
-- level. Drives the /onboarding flow (RoleChooser → buyer or seller branch)
-- and the role-aware sidebar on the shared /overview route.
--
-- Backfill rule: any user who already has a seller_members row is implicitly
-- a seller. Everyone else stays NULL until they pick in onboarding.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT;

UPDATE public.profiles p
   SET role = 'seller'
 WHERE p.role IS NULL
   AND EXISTS (SELECT 1 FROM public.seller_members sm WHERE sm.user_id = p.id);

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IS NULL OR role IN ('buyer', 'seller'));

COMMIT;

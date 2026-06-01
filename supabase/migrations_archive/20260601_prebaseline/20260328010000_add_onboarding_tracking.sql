-- Track onboarding completion on profiles
ALTER TABLE profiles
  ADD COLUMN onboarding_completed_at timestamptz DEFAULT NULL;

-- Track when teacher first shared their studio page
ALTER TABLE organizations
  ADD COLUMN studio_shared_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN profiles.onboarding_completed_at IS 'Timestamp when user completed the welcome onboarding flow';
COMMENT ON COLUMN organizations.studio_shared_at IS 'Timestamp when teacher first shared/copied their studio link';

-- Backfill: mark existing teachers as onboarded so they aren't blocked by the new flow
UPDATE profiles
SET onboarding_completed_at = profiles.created_at
WHERE onboarding_completed_at IS NULL
  AND id IN (SELECT user_id FROM org_members);

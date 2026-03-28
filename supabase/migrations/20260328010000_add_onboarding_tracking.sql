-- Track onboarding completion on profiles
ALTER TABLE profiles
  ADD COLUMN onboarding_completed_at timestamptz DEFAULT NULL;

-- Track when teacher first shared their studio page
ALTER TABLE organizations
  ADD COLUMN studio_shared_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN profiles.onboarding_completed_at IS 'Timestamp when user completed the welcome onboarding flow';
COMMENT ON COLUMN organizations.studio_shared_at IS 'Timestamp when teacher first shared/copied their studio link';

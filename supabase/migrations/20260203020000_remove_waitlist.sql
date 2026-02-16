-- ============================================
-- MIGRATION: Remove Waitlist System
-- ============================================
-- Removes all waitlist-related columns, indexes,
-- constraints, functions, and enum values.
-- ============================================

BEGIN;

-- ============================================
-- 1. Convert existing waitlist signups to cancelled
-- ============================================
UPDATE signups
SET status = 'cancelled',
    updated_at = NOW()
WHERE status = 'waitlist';

-- ============================================
-- 2. Drop waitlist-related indexes
-- ============================================
DROP INDEX IF EXISTS idx_signups_waitlist_position;
DROP INDEX IF EXISTS idx_signups_pending_offers;
DROP INDEX IF EXISTS idx_signups_claim_token;

-- ============================================
-- 3. Drop waitlist-related constraints
-- ============================================
ALTER TABLE signups DROP CONSTRAINT IF EXISTS check_waitlist_position_with_status;

-- ============================================
-- 4. Drop waitlist-related columns from signups
-- ============================================
ALTER TABLE signups
  DROP COLUMN IF EXISTS waitlist_position,
  DROP COLUMN IF EXISTS offer_sent_at,
  DROP COLUMN IF EXISTS offer_expires_at,
  DROP COLUMN IF EXISTS offer_status,
  DROP COLUMN IF EXISTS offer_claim_token;

-- ============================================
-- 5. Drop waitlist-related functions
-- ============================================
DROP FUNCTION IF EXISTS promote_next_waitlist_entry(UUID);
DROP FUNCTION IF EXISTS process_expired_waitlist_offers();
DROP FUNCTION IF EXISTS claim_waitlist_spot(TEXT);

-- ============================================
-- 6. Remove 'waitlist' from signup_status enum
-- ============================================
-- PostgreSQL does not support removing values from enums directly.
-- We must recreate the enum type.

-- 6a. Drop the default value (references old enum type)
ALTER TABLE signups ALTER COLUMN status DROP DEFAULT;

-- 6b. Drop RLS policy that references status column
DROP POLICY IF EXISTS "Users can cancel own signups" ON signups;

-- 6c. Drop indexes that reference status column (old enum type)
DROP INDEX IF EXISTS unique_active_signup_per_course_email;

-- 6e. Rename old enum
ALTER TYPE signup_status RENAME TO signup_status_old;

-- 6f. Create new enum without 'waitlist'
CREATE TYPE signup_status AS ENUM ('confirmed', 'cancelled');

-- 6g. Update the column to use the new enum
ALTER TABLE signups
  ALTER COLUMN status TYPE signup_status
  USING status::text::signup_status;

-- 6h. Restore the default value with the new enum type
ALTER TABLE signups ALTER COLUMN status SET DEFAULT 'confirmed'::signup_status;

-- 6i. Drop old enum
DROP TYPE signup_status_old;

-- 6j. Recreate the RLS policy with new enum type
CREATE POLICY "Users can cancel own signups"
  ON signups FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (status = 'cancelled');

-- ============================================
-- 7. Update partial unique index
-- ============================================
-- Drop the old index and recreate without 'waitlist'
DROP INDEX IF EXISTS unique_active_signup_per_course_email;

CREATE UNIQUE INDEX unique_active_signup_per_course_email
  ON signups (course_id, participant_email)
  WHERE status = 'confirmed';

COMMIT;

-- Migration: Rename guest_* columns to participant_* in signups table
-- These fields store signup contact info for ALL participants (not just guests)

-- Rename columns
ALTER TABLE signups RENAME COLUMN guest_name TO participant_name;
ALTER TABLE signups RENAME COLUMN guest_email TO participant_email;
ALTER TABLE signups RENAME COLUMN guest_phone TO participant_phone;

-- Add comments for clarity
COMMENT ON COLUMN signups.participant_name IS 'Full name of the participant (required for all signups)';
COMMENT ON COLUMN signups.participant_email IS 'Email address of the participant (required for all signups)';
COMMENT ON COLUMN signups.participant_phone IS 'Phone number of the participant (optional)';
COMMENT ON COLUMN signups.user_id IS 'Links to auth.users for registered students (enables "my bookings" feature)';

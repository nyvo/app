-- Migration: Package-Aware Capacity System
-- Enables automatic spot release when a participant's package period ends

-- 0. Drop old function signature to avoid ambiguity
-- The old version has 12 parameters, new version has 14 (with package params)
DROP FUNCTION IF EXISTS create_signup_if_available(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, BOOLEAN, DATE, TIME);

-- 1. Add package_end_date to signups table
-- This stores when the participant's package ends (NULL for full course signups)
ALTER TABLE signups ADD COLUMN IF NOT EXISTS package_end_date DATE;

-- Index for efficient queries on active signups
CREATE INDEX IF NOT EXISTS idx_signups_package_end_date ON signups(package_end_date);

-- 2. Function to calculate package end date
-- Takes the course start_date and calculates the LAST CLASS DATE
-- (weeks - 1) * 7 gives the last session day, spot opens the day after
CREATE OR REPLACE FUNCTION calculate_package_end_date(
  p_course_start_date DATE,
  p_package_weeks INTEGER
) RETURNS DATE AS $$
BEGIN
  IF p_package_weeks IS NULL THEN
    RETURN NULL; -- Full course signup, no end date
  END IF;
  -- Last class is on start_date + ((weeks - 1) * 7)
  -- e.g., 6-week course starting Jan 6: last class = Jan 6 + 35 = Feb 10
  RETURN p_course_start_date + ((p_package_weeks - 1) * 7);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Updated capacity check function that's package-aware
-- Only counts signups where:
-- - status = 'confirmed' AND
-- - (package_end_date IS NULL OR package_end_date > CURRENT_DATE)
CREATE OR REPLACE FUNCTION count_active_confirmed_signups(
  p_course_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM signups
  WHERE course_id = p_course_id
    AND status = 'confirmed'
    AND (package_end_date IS NULL OR package_end_date > CURRENT_DATE);

  RETURN v_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. Updated atomic signup creation function with package support
-- Replaces the existing create_signup_if_available function
CREATE OR REPLACE FUNCTION create_signup_if_available(
  p_course_id UUID,
  p_organization_id UUID,
  p_participant_name TEXT,
  p_participant_email TEXT,
  p_participant_phone TEXT,
  p_stripe_checkout_session_id TEXT,
  p_stripe_payment_intent_id TEXT,
  p_stripe_receipt_url TEXT,
  p_amount_paid NUMERIC,
  p_is_drop_in BOOLEAN DEFAULT FALSE,
  p_class_date DATE DEFAULT NULL,
  p_class_time TIME DEFAULT NULL,
  -- New package parameters
  p_signup_package_id UUID DEFAULT NULL,
  p_package_weeks INTEGER DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_max_participants INT;
  v_current_count INT;
  v_signup_id UUID;
  v_course_start_date DATE;
  v_package_end_date DATE;
BEGIN
  -- Lock the course row to serialize concurrent signup requests
  -- This prevents race conditions where two people try to book the last spot
  SELECT max_participants, start_date
  INTO v_max_participants, v_course_start_date
  FROM courses
  WHERE id = p_course_id
  FOR UPDATE;

  -- Course not found
  IF v_max_participants IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'course_not_found',
      'message', 'Kurset ble ikke funnet'
    );
  END IF;

  -- Calculate package end date if this is a package signup
  IF p_package_weeks IS NOT NULL AND v_course_start_date IS NOT NULL THEN
    v_package_end_date := calculate_package_end_date(v_course_start_date, p_package_weeks);
  END IF;

  -- Count current ACTIVE confirmed signups (package-aware)
  -- Only counts signups that haven't expired yet
  v_current_count := count_active_confirmed_signups(p_course_id);

  -- Check capacity
  IF v_current_count >= v_max_participants THEN
    -- No spots available - return failure without creating signup
    RETURN json_build_object(
      'success', false,
      'error', 'course_full',
      'message', 'Kurset er fullt',
      'current_count', v_current_count,
      'max_participants', v_max_participants
    );
  END IF;

  -- Spot available - create signup
  INSERT INTO signups (
    organization_id,
    course_id,
    participant_name,
    participant_email,
    participant_phone,
    status,
    payment_status,
    is_drop_in,
    class_date,
    class_time,
    stripe_checkout_session_id,
    stripe_payment_intent_id,
    stripe_receipt_url,
    amount_paid,
    signup_package_id,
    package_weeks,
    package_end_date,
    created_at,
    updated_at
  ) VALUES (
    p_organization_id,
    p_course_id,
    p_participant_name,
    p_participant_email,
    p_participant_phone,
    'confirmed',
    'paid',
    p_is_drop_in,
    p_class_date,
    p_class_time,
    p_stripe_checkout_session_id,
    p_stripe_payment_intent_id,
    p_stripe_receipt_url,
    p_amount_paid,
    p_signup_package_id,
    p_package_weeks,
    v_package_end_date,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_signup_id;

  RETURN json_build_object(
    'success', true,
    'signup_id', v_signup_id,
    'status', 'confirmed',
    'package_end_date', v_package_end_date
  );

EXCEPTION
  WHEN unique_violation THEN
    -- User already has an active signup for this course
    RETURN json_build_object(
      'success', false,
      'error', 'already_signed_up',
      'message', 'Du er allerede påmeldt dette kurset'
    );
  WHEN OTHERS THEN
    -- Unexpected error
    RETURN json_build_object(
      'success', false,
      'error', 'database_error',
      'message', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_package_end_date TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_package_end_date TO service_role;
GRANT EXECUTE ON FUNCTION count_active_confirmed_signups TO authenticated;
GRANT EXECUTE ON FUNCTION count_active_confirmed_signups TO service_role;
GRANT EXECUTE ON FUNCTION create_signup_if_available TO authenticated;
GRANT EXECUTE ON FUNCTION create_signup_if_available TO service_role;

-- Comments for documentation
COMMENT ON FUNCTION calculate_package_end_date IS
'Calculates the end date for a signup package based on course start date and package weeks.';

COMMENT ON FUNCTION count_active_confirmed_signups IS
'Counts active confirmed signups for a course. Only counts signups where package has not expired.';

COMMENT ON FUNCTION create_signup_if_available IS
'Atomically creates a signup if course has available spots. Package-aware: only counts active signups against capacity.';

-- 5. Backfill package_end_date for existing signups with package_weeks
-- This ensures existing package signups get their end date calculated
-- Uses (weeks - 1) * 7 to get the last class date
UPDATE signups s
SET package_end_date = c.start_date + ((s.package_weeks - 1) * 7)
FROM courses c
WHERE s.course_id = c.id
  AND s.package_weeks IS NOT NULL
  AND s.package_end_date IS NULL
  AND c.start_date IS NOT NULL;

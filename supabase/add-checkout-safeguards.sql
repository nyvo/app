-- Checkout Safeguards: Race Condition Prevention
-- This migration adds database-level protections against overbooking

-- 0. First, find and resolve duplicate active signups
-- This query shows all duplicates that would block the unique index:
-- SELECT course_id, participant_email, COUNT(*), array_agg(id) as signup_ids
-- FROM signups
-- WHERE status = 'confirmed'
-- GROUP BY course_id, participant_email
-- HAVING COUNT(*) > 1;

-- Cancel duplicate signups, keeping only the most recent one per course/email combo
WITH duplicates AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY course_id, participant_email
    ORDER BY created_at DESC
  ) as rn
  FROM signups
  WHERE status = 'confirmed'
)
UPDATE signups
SET status = 'cancelled',
    updated_at = NOW()
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- 1. Partial unique index to prevent duplicate active signups per email per course
-- Only applies to 'confirmed' status (cancelled signups can be duplicated)
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_signup_per_course_email
ON signups (course_id, participant_email)
WHERE status = 'confirmed';

-- 2. Atomic signup creation function with row locking
-- This function:
-- - Locks the course row to serialize concurrent requests
-- - Checks capacity atomically
-- - Creates signup if spot available
-- - Returns failure if course is full (without creating signup)
-- - Handles duplicate email gracefully
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
  p_class_time TIME DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_max_participants INT;
  v_current_count INT;
  v_signup_id UUID;
BEGIN
  -- Lock the course row to serialize concurrent signup requests
  -- This prevents race conditions where two people try to book the last spot
  SELECT max_participants INTO v_max_participants
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

  -- Count current confirmed signups
  SELECT COUNT(*) INTO v_current_count
  FROM signups
  WHERE course_id = p_course_id AND status = 'confirmed';

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
    NOW(),
    NOW()
  )
  RETURNING id INTO v_signup_id;

  RETURN json_build_object(
    'success', true,
    'signup_id', v_signup_id,
    'status', 'confirmed'
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

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION create_signup_if_available TO authenticated;
GRANT EXECUTE ON FUNCTION create_signup_if_available TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION create_signup_if_available IS
'Atomically creates a signup if course has available spots. Uses row locking to prevent race conditions.
Returns JSON with success status and either signup_id or error details.';

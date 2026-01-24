-- Migration: Atomic Waitlist Promotion
-- Purpose: Prevent double-promotion when multiple cancellations happen simultaneously
-- Uses row-level locking to ensure only ONE offer is sent at a time

-- ============================================
-- PROMOTE NEXT WAITLIST ENTRY FUNCTION
-- Atomically promotes the next waiting entry
-- ============================================

CREATE OR REPLACE FUNCTION promote_next_waitlist_entry(
  p_course_id UUID,
  p_offer_hours INTEGER DEFAULT 24  -- How many hours until offer expires
) RETURNS JSON AS $$
DECLARE
  v_next_entry RECORD;
  v_claim_token UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Lock and get next waiting entry (FIFO by created_at)
  -- SKIP LOCKED prevents blocking if another transaction has it locked
  SELECT id, user_id, participant_name, participant_email
  INTO v_next_entry
  FROM signups
  WHERE course_id = p_course_id
    AND status = 'waitlist'
    AND (offer_status IS NULL OR offer_status IN ('expired', 'skipped'))
  ORDER BY waitlist_position ASC NULLS LAST, created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  -- No waiting entries found
  IF v_next_entry IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'no_waiting_entries',
      'message', 'Ingen på venteliste'
    );
  END IF;

  -- Generate claim token and expiry
  v_claim_token := gen_random_uuid();
  v_expires_at := NOW() + (p_offer_hours || ' hours')::INTERVAL;

  -- Update to offered status
  UPDATE signups
  SET offer_status = 'pending',
      offer_sent_at = NOW(),
      offer_expires_at = v_expires_at,
      offer_claim_token = v_claim_token,
      updated_at = NOW()
  WHERE id = v_next_entry.id
    AND status = 'waitlist'
    AND (offer_status IS NULL OR offer_status IN ('expired', 'skipped'));

  -- Double-check the update worked (status might have changed between SELECT and UPDATE)
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'status_changed',
      'message', 'Ventelistestatus har endret seg'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'signup_id', v_next_entry.id,
    'participant_name', v_next_entry.participant_name,
    'participant_email', v_next_entry.participant_email,
    'claim_token', v_claim_token,
    'expires_at', v_expires_at
  );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION promote_next_waitlist_entry TO authenticated;
GRANT EXECUTE ON FUNCTION promote_next_waitlist_entry TO service_role;

COMMENT ON FUNCTION promote_next_waitlist_entry IS
'Atomically promotes the next waitlist entry for a course.
Uses row-level locking (FOR UPDATE SKIP LOCKED) to prevent double-promotion
when multiple cancellations trigger promotion simultaneously.
Returns JSON with success status and either promotion details or error.';

-- ============================================
-- CHECK AND SKIP EXPIRED OFFERS FUNCTION
-- Called before promoting to ensure expired offers are handled
-- ============================================

CREATE OR REPLACE FUNCTION process_expired_waitlist_offers(
  p_course_id UUID
) RETURNS JSON AS $$
DECLARE
  v_expired_count INTEGER;
BEGIN
  -- Mark all expired pending offers as expired
  UPDATE signups
  SET offer_status = 'expired',
      updated_at = NOW()
  WHERE course_id = p_course_id
    AND status = 'waitlist'
    AND offer_status = 'pending'
    AND offer_expires_at < NOW();

  GET DIAGNOSTICS v_expired_count = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'expired_count', v_expired_count
  );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION process_expired_waitlist_offers TO authenticated;
GRANT EXECUTE ON FUNCTION process_expired_waitlist_offers TO service_role;

COMMENT ON FUNCTION process_expired_waitlist_offers IS
'Marks expired waitlist offers as expired so they can be re-offered.
Should be called before promote_next_waitlist_entry to ensure
expired offers are processed first.';

-- ============================================
-- ATOMIC CLAIM WAITLIST SPOT FUNCTION
-- Atomically claims a spot from waitlist offer
-- ============================================

CREATE OR REPLACE FUNCTION claim_waitlist_spot(
  p_claim_token UUID,
  p_stripe_checkout_session_id TEXT,
  p_stripe_payment_intent_id TEXT,
  p_amount_paid NUMERIC
) RETURNS JSON AS $$
DECLARE
  v_signup RECORD;
  v_course_capacity INTEGER;
  v_current_count INTEGER;
BEGIN
  -- Lock and verify the signup
  SELECT s.*, c.max_participants
  INTO v_signup
  FROM signups s
  JOIN courses c ON c.id = s.course_id
  WHERE s.offer_claim_token = p_claim_token
  FOR UPDATE;

  -- Not found
  IF v_signup IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'invalid_token',
      'message', 'Ugyldig bekreftelseslenke'
    );
  END IF;

  -- Already claimed
  IF v_signup.offer_status = 'claimed' THEN
    RETURN json_build_object(
      'success', true,
      'already_claimed', true,
      'signup_id', v_signup.id
    );
  END IF;

  -- Check if expired
  IF v_signup.offer_expires_at < NOW() THEN
    UPDATE signups
    SET offer_status = 'expired', updated_at = NOW()
    WHERE id = v_signup.id;

    RETURN json_build_object(
      'success', false,
      'error', 'offer_expired',
      'message', 'Tilbudet har utløpt'
    );
  END IF;

  -- Verify capacity (someone might have taken spot via direct booking)
  SELECT COUNT(*) INTO v_current_count
  FROM signups
  WHERE course_id = v_signup.course_id
    AND status = 'confirmed';

  IF v_current_count >= v_signup.max_participants THEN
    RETURN json_build_object(
      'success', false,
      'error', 'course_full',
      'message', 'Kurset er dessverre fullt'
    );
  END IF;

  -- Claim the spot
  UPDATE signups
  SET status = 'confirmed',
      offer_status = 'claimed',
      payment_status = 'paid',
      waitlist_position = NULL,
      stripe_checkout_session_id = p_stripe_checkout_session_id,
      stripe_payment_intent_id = p_stripe_payment_intent_id,
      amount_paid = p_amount_paid,
      updated_at = NOW()
  WHERE id = v_signup.id;

  RETURN json_build_object(
    'success', true,
    'signup_id', v_signup.id,
    'status', 'confirmed'
  );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION claim_waitlist_spot TO authenticated;
GRANT EXECUTE ON FUNCTION claim_waitlist_spot TO service_role;

COMMENT ON FUNCTION claim_waitlist_spot IS
'Atomically claims a waitlist spot using a claim token.
Verifies token validity, expiry, and course capacity.
Used by stripe webhook when processing waitlist claim payments.';

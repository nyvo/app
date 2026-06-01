-- Migration: Add all RPC functions missing from version control
-- These functions existed in the live DB but were never committed.
-- Using CREATE OR REPLACE so this is safe to apply to databases that already have them.

-- ============================================
-- Package end date calculation (IMMUTABLE helper)
-- ============================================
CREATE OR REPLACE FUNCTION calculate_package_end_date(p_course_start_date DATE, p_package_weeks INTEGER)
RETURNS DATE
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  IF p_package_weeks IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN p_course_start_date + ((p_package_weeks - 1) * 7);
END;
$$;

-- ============================================
-- Count active confirmed signups (package-aware)
-- ============================================
CREATE OR REPLACE FUNCTION count_active_confirmed_signups(p_course_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql STABLE
AS $$
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
$$;

-- ============================================
-- Atomic signup creation with capacity check
-- Prevents overbooking via SELECT FOR UPDATE row lock
-- ============================================
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
  p_signup_package_id UUID DEFAULT NULL,
  p_package_weeks INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_max_participants INT;
  v_current_count INT;
  v_signup_id UUID;
  v_course_start_date DATE;
  v_package_end_date DATE;
BEGIN
  SELECT max_participants, start_date
  INTO v_max_participants, v_course_start_date
  FROM courses
  WHERE id = p_course_id
  FOR UPDATE;

  IF v_max_participants IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'course_not_found',
      'message', 'Kurset ble ikke funnet'
    );
  END IF;

  IF p_package_weeks IS NOT NULL AND v_course_start_date IS NOT NULL THEN
    v_package_end_date := calculate_package_end_date(v_course_start_date, p_package_weeks);
  END IF;

  v_current_count := count_active_confirmed_signups(p_course_id);

  IF v_current_count >= v_max_participants THEN
    RETURN json_build_object(
      'success', false,
      'error', 'course_full',
      'message', 'Kurset er fullt',
      'current_count', v_current_count,
      'max_participants', v_max_participants
    );
  END IF;

  INSERT INTO signups (
    organization_id, course_id, participant_name, participant_email,
    participant_phone, status, payment_status, is_drop_in,
    class_date, class_time, stripe_checkout_session_id,
    stripe_payment_intent_id, stripe_receipt_url, amount_paid,
    signup_package_id, package_weeks, package_end_date,
    created_at, updated_at
  ) VALUES (
    p_organization_id, p_course_id, p_participant_name, p_participant_email,
    p_participant_phone, 'confirmed', 'paid', p_is_drop_in,
    p_class_date, p_class_time, p_stripe_checkout_session_id,
    p_stripe_payment_intent_id, p_stripe_receipt_url, p_amount_paid,
    p_signup_package_id, p_package_weeks, v_package_end_date,
    NOW(), NOW()
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
    RETURN json_build_object(
      'success', false,
      'error', 'already_signed_up',
      'message', 'Du er allerede påmeldt dette kurset'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'database_error',
      'message', SQLERRM
    );
END;
$$;

-- ============================================
-- Idempotent course creation
-- ============================================
CREATE OR REPLACE FUNCTION create_course_idempotent(
  p_organization_id UUID,
  p_idempotency_key TEXT,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_course_type TEXT DEFAULT 'event',
  p_status TEXT DEFAULT 'draft',
  p_level TEXT DEFAULT 'alle',
  p_location TEXT DEFAULT NULL,
  p_time_schedule TEXT DEFAULT NULL,
  p_duration INTEGER DEFAULT 60,
  p_max_participants INTEGER DEFAULT NULL,
  p_price NUMERIC DEFAULT NULL,
  p_allows_drop_in BOOLEAN DEFAULT FALSE,
  p_drop_in_price NUMERIC DEFAULT NULL,
  p_total_weeks INTEGER DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_instructor_id UUID DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL,
  p_style_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing_course RECORD;
  v_new_course_id UUID;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id, title, status, created_at
    INTO v_existing_course
    FROM courses
    WHERE organization_id = p_organization_id
      AND idempotency_key = p_idempotency_key;

    IF FOUND THEN
      RETURN json_build_object(
        'success', true,
        'course_id', v_existing_course.id,
        'already_existed', true,
        'message', 'Kurset eksisterer allerede'
      );
    END IF;
  END IF;

  INSERT INTO courses (
    organization_id, idempotency_key, title, description,
    course_type, status, level, location, time_schedule,
    duration, max_participants, price, allows_drop_in,
    drop_in_price, total_weeks, start_date, end_date,
    instructor_id, image_url, style_id
  ) VALUES (
    p_organization_id, p_idempotency_key, p_title, p_description,
    p_course_type::course_type, p_status::course_status, p_level::course_level,
    p_location, p_time_schedule, p_duration, p_max_participants,
    p_price, p_allows_drop_in, p_drop_in_price, p_total_weeks,
    p_start_date, p_end_date, p_instructor_id, p_image_url, p_style_id
  )
  RETURNING id INTO v_new_course_id;

  RETURN json_build_object(
    'success', true,
    'course_id', v_new_course_id,
    'already_existed', false,
    'message', 'Kurs opprettet'
  );

EXCEPTION
  WHEN unique_violation THEN
    SELECT id INTO v_existing_course
    FROM courses
    WHERE organization_id = p_organization_id
      AND idempotency_key = p_idempotency_key;

    IF FOUND THEN
      RETURN json_build_object(
        'success', true,
        'course_id', v_existing_course.id,
        'already_existed', true,
        'message', 'Kurset eksisterer allerede'
      );
    END IF;

    RETURN json_build_object(
      'success', false,
      'error', 'unique_violation',
      'message', 'Unik begrensning feilet'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'database_error',
      'message', SQLERRM
    );
END;
$$;

-- ============================================
-- Session conflict checking
-- ============================================
CREATE OR REPLACE FUNCTION check_session_conflict(
  p_organization_id UUID,
  p_session_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_exclude_course_id UUID DEFAULT NULL
)
RETURNS TABLE(
  has_conflict BOOLEAN,
  conflicting_course_id UUID,
  conflicting_course_title TEXT,
  conflicting_start TIME,
  conflicting_end TIME
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE,
    c.id,
    c.title,
    cs.start_time,
    (cs.start_time + (COALESCE(c.duration, 60) || ' minutes')::INTERVAL)::TIME
  FROM course_sessions cs
  JOIN courses c ON c.id = cs.course_id
  WHERE c.organization_id = p_organization_id
    AND cs.session_date = p_session_date
    AND cs.status != 'cancelled'
    AND c.status != 'cancelled'
    AND (p_exclude_course_id IS NULL OR c.id != p_exclude_course_id)
    AND (
      p_start_time < (cs.start_time + (COALESCE(c.duration, 60) || ' minutes')::INTERVAL)::TIME
      AND cs.start_time < p_end_time
    )
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TIME, NULL::TIME;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION check_sessions_conflicts(
  p_organization_id UUID,
  p_sessions JSONB,
  p_exclude_course_id UUID DEFAULT NULL
)
RETURNS TABLE(
  session_date DATE,
  has_conflict BOOLEAN,
  conflicting_course_id UUID,
  conflicting_course_title TEXT,
  conflicting_start TIME,
  conflicting_end TIME
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_session JSONB;
  v_date DATE;
  v_start TIME;
  v_duration INTEGER;
  v_end TIME;
  v_conflict RECORD;
BEGIN
  FOR v_session IN SELECT * FROM jsonb_array_elements(p_sessions)
  LOOP
    v_date := (v_session->>'date')::DATE;
    v_start := (v_session->>'start_time')::TIME;
    v_duration := COALESCE((v_session->>'duration')::INTEGER, 60);
    v_end := v_start + (v_duration || ' minutes')::INTERVAL;

    SELECT * INTO v_conflict
    FROM check_session_conflict(
      p_organization_id, v_date, v_start, v_end, p_exclude_course_id
    ) AS c
    WHERE c.has_conflict = TRUE;

    IF FOUND THEN
      RETURN QUERY SELECT
        v_date, TRUE,
        v_conflict.conflicting_course_id,
        v_conflict.conflicting_course_title,
        v_conflict.conflicting_start,
        v_conflict.conflicting_end;
    ELSE
      RETURN QUERY SELECT
        v_date, FALSE, NULL::UUID, NULL::TEXT, NULL::TIME, NULL::TIME;
    END IF;
  END LOOP;
END;
$$;

-- ============================================
-- Session conflict enforcement trigger
-- ============================================
CREATE OR REPLACE FUNCTION enforce_session_no_conflict()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_organization_id UUID;
  v_duration INTEGER;
  v_end_time TIME;
  v_conflict RECORD;
BEGIN
  SELECT c.organization_id, COALESCE(c.duration, 60)
  INTO v_organization_id, v_duration
  FROM courses c
  WHERE c.id = NEW.course_id;

  v_end_time := NEW.start_time + (v_duration || ' minutes')::INTERVAL;

  SELECT * INTO v_conflict
  FROM check_session_conflict(
    v_organization_id, NEW.session_date, NEW.start_time, v_end_time, NEW.course_id
  ) AS c
  WHERE c.has_conflict = TRUE;

  IF FOUND THEN
    RAISE EXCEPTION 'Session conflicts with existing course: % (%-%)',
      v_conflict.conflicting_course_title,
      v_conflict.conflicting_start,
      v_conflict.conflicting_end
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_session_conflict_check ON course_sessions;
CREATE TRIGGER enforce_session_conflict_check
  BEFORE INSERT OR UPDATE OF session_date, start_time ON course_sessions
  FOR EACH ROW
  WHEN (NEW.status <> 'cancelled')
  EXECUTE FUNCTION enforce_session_no_conflict();

-- ============================================
-- Organization creation for new users
-- ============================================
CREATE OR REPLACE FUNCTION ensure_organization_for_user(p_org_name TEXT, p_org_slug TEXT)
RETURNS TABLE(org_id UUID, org_slug TEXT, org_name TEXT, member_role org_member_role, was_created BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  calling_user UUID := auth.uid();
  existing_org_id UUID;
  new_org_id UUID;
  base_slug TEXT;
  candidate_slug TEXT;
  clean_name TEXT;
  slug_suffix INT := 0;
  suffix_text TEXT;
BEGIN
  IF calling_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT om.organization_id INTO existing_org_id
  FROM org_members om
  WHERE om.user_id = calling_user AND om.role = 'owner'
  ORDER BY om.created_at ASC
  LIMIT 1;

  IF existing_org_id IS NOT NULL THEN
    RETURN QUERY
      SELECT o.id, o.slug, o.name, 'owner'::org_member_role, FALSE
      FROM organizations o WHERE o.id = existing_org_id;
    RETURN;
  END IF;

  clean_name := LEFT(TRIM(COALESCE(p_org_name, '')), 100);
  IF clean_name = '' THEN
    RAISE EXCEPTION 'Organization name is required';
  END IF;

  base_slug := NULLIF(TRIM(LOWER(COALESCE(p_org_slug, ''))), '');
  IF base_slug IS NULL THEN
    base_slug := LOWER(clean_name);
  END IF;

  base_slug := REGEXP_REPLACE(base_slug, '[æ]', 'ae', 'g');
  base_slug := REGEXP_REPLACE(base_slug, '[ø]', 'o', 'g');
  base_slug := REGEXP_REPLACE(base_slug, '[å]', 'a', 'g');
  base_slug := REGEXP_REPLACE(base_slug, '[^a-z0-9]+', '-', 'g');
  base_slug := REGEXP_REPLACE(base_slug, '^-+|-+$', '', 'g');
  base_slug := LEFT(base_slug, 56);

  IF base_slug = '' THEN
    RAISE EXCEPTION 'Could not generate valid slug from name';
  END IF;

  LOOP
    IF slug_suffix = 0 THEN
      candidate_slug := base_slug;
    ELSE
      suffix_text := slug_suffix::TEXT;
      candidate_slug := LEFT(base_slug, 60 - 1 - LENGTH(suffix_text)) || '-' || suffix_text;
    END IF;

    BEGIN
      INSERT INTO organizations (name, slug)
      VALUES (clean_name, candidate_slug)
      RETURNING id INTO new_org_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      slug_suffix := slug_suffix + 1;
      IF slug_suffix > 50 THEN
        RAISE EXCEPTION 'Could not generate unique slug after 50 attempts';
      END IF;
    END;
  END LOOP;

  INSERT INTO org_members (organization_id, user_id, role)
  VALUES (new_org_id, calling_user, 'owner');

  RETURN QUERY
    SELECT new_org_id, candidate_slug, clean_name, 'owner'::org_member_role, TRUE;
  RETURN;
END;
$$;

-- ============================================
-- Waitlist management (legacy, kept for safety)
-- ============================================
CREATE OR REPLACE FUNCTION claim_waitlist_spot(
  p_claim_token UUID,
  p_stripe_checkout_session_id TEXT,
  p_stripe_payment_intent_id TEXT,
  p_amount_paid NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_signup RECORD;
  v_course_capacity INTEGER;
  v_current_count INTEGER;
BEGIN
  SELECT s.*, c.max_participants
  INTO v_signup
  FROM signups s
  JOIN courses c ON c.id = s.course_id
  WHERE s.offer_claim_token = p_claim_token
  FOR UPDATE;

  IF v_signup IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'invalid_token',
      'message', 'Ugyldig bekreftelseslenke'
    );
  END IF;

  IF v_signup.offer_status = 'claimed' THEN
    RETURN json_build_object(
      'success', true,
      'already_claimed', true,
      'signup_id', v_signup.id
    );
  END IF;

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

  SELECT COUNT(*) INTO v_current_count
  FROM signups
  WHERE course_id = v_signup.course_id AND status = 'confirmed';

  IF v_current_count >= v_signup.max_participants THEN
    RETURN json_build_object(
      'success', false,
      'error', 'course_full',
      'message', 'Kurset er dessverre fullt'
    );
  END IF;

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
$$;

CREATE OR REPLACE FUNCTION process_expired_waitlist_offers(p_course_id UUID)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_expired_count INTEGER;
BEGIN
  UPDATE signups
  SET offer_status = 'expired', updated_at = NOW()
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
$$;

CREATE OR REPLACE FUNCTION promote_next_waitlist_entry(p_course_id UUID, p_offer_hours INTEGER DEFAULT 24)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_next_entry RECORD;
  v_claim_token UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  SELECT id, user_id, participant_name, participant_email
  INTO v_next_entry
  FROM signups
  WHERE course_id = p_course_id
    AND status = 'waitlist'
    AND (offer_status IS NULL OR offer_status IN ('expired', 'skipped'))
  ORDER BY waitlist_position ASC NULLS LAST, created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_next_entry IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'no_waiting_entries',
      'message', 'Ingen på venteliste'
    );
  END IF;

  v_claim_token := gen_random_uuid();
  v_expires_at := NOW() + (p_offer_hours || ' hours')::INTERVAL;

  UPDATE signups
  SET offer_status = 'pending',
      offer_sent_at = NOW(),
      offer_expires_at = v_expires_at,
      offer_claim_token = v_claim_token,
      updated_at = NOW()
  WHERE id = v_next_entry.id
    AND status = 'waitlist'
    AND (offer_status IS NULL OR offer_status IN ('expired', 'skipped'));

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
$$;

-- ============================================
-- Webhook event cleanup
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM processed_webhook_events
  WHERE processed_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ============================================
-- Course sessions updated_at trigger function
-- ============================================
CREATE OR REPLACE FUNCTION update_course_sessions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

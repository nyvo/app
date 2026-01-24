-- Migration: Course Creation Idempotency
-- Purpose: Prevent duplicate course creation from network retries
-- Uses client-generated idempotency key to detect duplicate submissions

-- ============================================
-- ADD IDEMPOTENCY KEY COLUMN TO COURSES
-- ============================================

ALTER TABLE courses ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Unique constraint: one idempotency key per organization
-- NULL keys are allowed (old courses, direct DB inserts)
CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_idempotency
  ON courses(organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

COMMENT ON COLUMN courses.idempotency_key IS
'Client-generated unique key to prevent duplicate course creation.
Generated once when form loads, sent with create request.
If a request fails and is retried, same key returns existing course.';

-- ============================================
-- CREATE OR RETURN EXISTING COURSE FUNCTION
-- Handles idempotency for course creation
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
) RETURNS JSON AS $$
DECLARE
  v_existing_course RECORD;
  v_new_course_id UUID;
BEGIN
  -- If idempotency key provided, check for existing course first
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id, title, status, created_at
    INTO v_existing_course
    FROM courses
    WHERE organization_id = p_organization_id
      AND idempotency_key = p_idempotency_key;

    IF FOUND THEN
      -- Course already exists, return it
      RETURN json_build_object(
        'success', true,
        'course_id', v_existing_course.id,
        'already_existed', true,
        'message', 'Kurset eksisterer allerede'
      );
    END IF;
  END IF;

  -- Create new course
  INSERT INTO courses (
    organization_id,
    idempotency_key,
    title,
    description,
    course_type,
    status,
    level,
    location,
    time_schedule,
    duration,
    max_participants,
    price,
    allows_drop_in,
    drop_in_price,
    total_weeks,
    start_date,
    end_date,
    instructor_id,
    image_url,
    style_id
  ) VALUES (
    p_organization_id,
    p_idempotency_key,
    p_title,
    p_description,
    p_course_type::course_type,
    p_status::course_status,
    p_level::course_level,
    p_location,
    p_time_schedule,
    p_duration,
    p_max_participants,
    p_price,
    p_allows_drop_in,
    p_drop_in_price,
    p_total_weeks,
    p_start_date,
    p_end_date,
    p_instructor_id,
    p_image_url,
    p_style_id
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
    -- Race condition: another request created it between check and insert
    -- Fetch and return the existing course
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

    -- Some other unique violation
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
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_course_idempotent TO authenticated;
GRANT EXECUTE ON FUNCTION create_course_idempotent TO service_role;

COMMENT ON FUNCTION create_course_idempotent IS
'Creates a course with idempotency support.
If a course with the same idempotency_key exists for the organization,
returns the existing course instead of creating a duplicate.
This prevents duplicate courses from network retries.';

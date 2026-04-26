-- create_course_idempotent's body referenced courses.allows_drop_in /
-- drop_in_price, both dropped in 20260426030000. Recreate it without those.
-- Drop-in availability is now configured via course_signup_packages tier rows
-- created separately after the course exists.

DROP FUNCTION IF EXISTS public.create_course_idempotent(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER,
  NUMERIC, BOOLEAN, NUMERIC, INTEGER, DATE, DATE, UUID, TEXT, UUID
);

CREATE OR REPLACE FUNCTION public.create_course_idempotent(
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
  p_total_weeks INTEGER DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_instructor_id UUID DEFAULT NULL,
  p_image_url TEXT DEFAULT NULL,
  p_style_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_existing_course RECORD;
  v_new_course_id UUID;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id, title, status, created_at
    INTO v_existing_course
    FROM public.courses
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

  INSERT INTO public.courses (
    organization_id, idempotency_key, title, description,
    course_type, status, level, location, time_schedule,
    duration, max_participants, price, total_weeks,
    start_date, end_date, instructor_id, image_url, style_id
  ) VALUES (
    p_organization_id, p_idempotency_key, p_title, p_description,
    p_course_type::course_type, p_status::course_status, p_level::course_level,
    p_location, p_time_schedule, p_duration, p_max_participants,
    p_price, p_total_weeks,
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
    FROM public.courses
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

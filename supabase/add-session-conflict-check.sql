-- Migration: Session Conflict Check at Database Level
-- Purpose: Prevent double-booking of time slots for the same organization
-- This is the authoritative check - frontend checks are just for UX

-- ============================================
-- CHECK SESSION CONFLICT FUNCTION
-- Returns conflicting session if one exists
-- ============================================

CREATE OR REPLACE FUNCTION check_session_conflict(
  p_organization_id UUID,
  p_session_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_exclude_course_id UUID DEFAULT NULL  -- For updates, exclude own course
) RETURNS TABLE(
  has_conflict BOOLEAN,
  conflicting_course_id UUID,
  conflicting_course_title TEXT,
  conflicting_start TIME,
  conflicting_end TIME
) AS $$
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
      -- Overlap check: start1 < end2 AND start2 < end1
      p_start_time < (cs.start_time + (COALESCE(c.duration, 60) || ' minutes')::INTERVAL)::TIME
      AND cs.start_time < p_end_time
    )
  LIMIT 1;

  -- If no conflicts found, return no conflict row
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TIME, NULL::TIME;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_session_conflict TO authenticated;
GRANT EXECUTE ON FUNCTION check_session_conflict TO service_role;

COMMENT ON FUNCTION check_session_conflict IS
'Checks if a proposed session time conflicts with existing sessions.
Returns the conflicting course if found, or has_conflict=false if available.
Used for both frontend validation and backend enforcement.';

-- ============================================
-- CHECK MULTIPLE SESSIONS CONFLICT FUNCTION
-- Batch check for course-series (multiple weeks)
-- ============================================

CREATE OR REPLACE FUNCTION check_sessions_conflicts(
  p_organization_id UUID,
  p_sessions JSONB,  -- Array of {date: "YYYY-MM-DD", start_time: "HH:MM", duration: minutes}
  p_exclude_course_id UUID DEFAULT NULL
) RETURNS TABLE(
  session_date DATE,
  has_conflict BOOLEAN,
  conflicting_course_id UUID,
  conflicting_course_title TEXT,
  conflicting_start TIME,
  conflicting_end TIME
) AS $$
DECLARE
  v_session JSONB;
  v_date DATE;
  v_start TIME;
  v_duration INTEGER;
  v_end TIME;
  v_conflict RECORD;
BEGIN
  -- Process each planned session
  FOR v_session IN SELECT * FROM jsonb_array_elements(p_sessions)
  LOOP
    v_date := (v_session->>'date')::DATE;
    v_start := (v_session->>'start_time')::TIME;
    v_duration := COALESCE((v_session->>'duration')::INTEGER, 60);
    v_end := v_start + (v_duration || ' minutes')::INTERVAL;

    -- Check for conflict
    SELECT * INTO v_conflict
    FROM check_session_conflict(
      p_organization_id,
      v_date,
      v_start,
      v_end,
      p_exclude_course_id
    ) AS c
    WHERE c.has_conflict = TRUE;

    IF FOUND THEN
      RETURN QUERY SELECT
        v_date,
        TRUE,
        v_conflict.conflicting_course_id,
        v_conflict.conflicting_course_title,
        v_conflict.conflicting_start,
        v_conflict.conflicting_end;
    ELSE
      RETURN QUERY SELECT
        v_date,
        FALSE,
        NULL::UUID,
        NULL::TEXT,
        NULL::TIME,
        NULL::TIME;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_sessions_conflicts TO authenticated;
GRANT EXECUTE ON FUNCTION check_sessions_conflicts TO service_role;

COMMENT ON FUNCTION check_sessions_conflicts IS
'Batch check for session conflicts across multiple dates.
Useful for course-series creation where multiple weeks need checking.
Returns one row per session with conflict status.';

-- ============================================
-- CONSTRAINT TRIGGER FOR SESSION INSERTS
-- Enforces conflict check at database level
-- ============================================

CREATE OR REPLACE FUNCTION enforce_session_no_conflict()
RETURNS TRIGGER AS $$
DECLARE
  v_organization_id UUID;
  v_duration INTEGER;
  v_end_time TIME;
  v_conflict RECORD;
BEGIN
  -- Get organization_id and duration from course
  SELECT c.organization_id, COALESCE(c.duration, 60)
  INTO v_organization_id, v_duration
  FROM courses c
  WHERE c.id = NEW.course_id;

  -- Calculate end time
  v_end_time := NEW.start_time + (v_duration || ' minutes')::INTERVAL;

  -- Check for conflict
  SELECT * INTO v_conflict
  FROM check_session_conflict(
    v_organization_id,
    NEW.session_date,
    NEW.start_time,
    v_end_time,
    NEW.course_id  -- Exclude own course for updates
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
$$ LANGUAGE plpgsql;

-- Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS enforce_session_conflict_check ON course_sessions;

CREATE TRIGGER enforce_session_conflict_check
  BEFORE INSERT OR UPDATE OF session_date, start_time
  ON course_sessions
  FOR EACH ROW
  WHEN (NEW.status != 'cancelled')
  EXECUTE FUNCTION enforce_session_no_conflict();

COMMENT ON TRIGGER enforce_session_conflict_check ON course_sessions IS
'Prevents inserting or updating sessions that conflict with existing ones.
Only active (non-cancelled) sessions are checked.';

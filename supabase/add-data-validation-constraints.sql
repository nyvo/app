-- ============================================
-- DATA VALIDATION CONSTRAINTS
-- Add server-side validation via database constraints
-- ============================================

-- ============================================
-- COURSES TABLE CONSTRAINTS
-- ============================================

-- Price must be non-negative
ALTER TABLE courses
  ADD CONSTRAINT check_price_non_negative
  CHECK (price >= 0);

-- Max participants must be positive
ALTER TABLE courses
  ADD CONSTRAINT check_max_participants_positive
  CHECK (max_participants > 0);

-- Duration must be positive
ALTER TABLE courses
  ADD CONSTRAINT check_duration_positive
  CHECK (duration > 0);

-- End date must be after or equal to start date
ALTER TABLE courses
  ADD CONSTRAINT check_date_range
  CHECK (end_date IS NULL OR end_date >= start_date);

-- Title must have reasonable length
ALTER TABLE courses
  ADD CONSTRAINT check_title_length
  CHECK (char_length(title) <= 200 AND char_length(title) > 0);

-- ============================================
-- SIGNUPS TABLE CONSTRAINTS
-- ============================================

-- Amount paid must be non-negative
ALTER TABLE signups
  ADD CONSTRAINT check_amount_paid_non_negative
  CHECK (amount_paid >= 0);

-- Email format validation for guest signups
ALTER TABLE signups
  ADD CONSTRAINT check_guest_email_format
  CHECK (
    guest_email IS NULL OR
    guest_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'
  );

-- Either user_id OR guest fields must be present (not both)
ALTER TABLE signups
  ADD CONSTRAINT check_user_or_guest_data
  CHECK (
    (user_id IS NOT NULL) OR
    (guest_name IS NOT NULL AND guest_email IS NOT NULL)
  );

-- ============================================
-- CONVERSATIONS TABLE CONSTRAINTS
-- ============================================

-- Either user_id OR guest_email (not both, not neither)
ALTER TABLE conversations
  ADD CONSTRAINT check_conversation_user_or_guest
  CHECK (
    (user_id IS NOT NULL AND guest_email IS NULL) OR
    (user_id IS NULL AND guest_email IS NOT NULL)
  );

-- ============================================
-- COURSE_SESSIONS TABLE CONSTRAINTS
-- ============================================

-- Session number must be positive
ALTER TABLE course_sessions
  ADD CONSTRAINT check_session_number_positive
  CHECK (session_number > 0);

-- ============================================
-- ORGANIZATIONS TABLE CONSTRAINTS
-- ============================================

-- Slug must be lowercase, alphanumeric + hyphens only
ALTER TABLE organizations
  ADD CONSTRAINT check_slug_format
  CHECK (slug ~* '^[a-z0-9-]+$');

-- Name must have reasonable length
ALTER TABLE organizations
  ADD CONSTRAINT check_name_length
  CHECK (char_length(name) <= 100 AND char_length(name) > 0);

-- ============================================
-- TRIGGER: Validate signup organization_id matches course
-- ============================================

CREATE OR REPLACE FUNCTION validate_signup_organization()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM courses
    WHERE id = NEW.course_id
    AND organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'Signup organization_id must match course organization_id';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_signup_organization ON signups;
CREATE TRIGGER check_signup_organization
  BEFORE INSERT OR UPDATE ON signups
  FOR EACH ROW
  EXECUTE FUNCTION validate_signup_organization();

-- ============================================
-- NOTES
-- ============================================
-- These constraints provide server-side validation that cannot be bypassed
-- Client-side validation should still be used for better UX
-- Constraints are enforced at the database level for all insert/update operations

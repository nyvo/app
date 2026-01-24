-- Migration: Add signup packages for courses
-- Allows teachers to offer multiple signup options (e.g., 6 weeks, 8 weeks, full course)

-- Create the course_signup_packages table
CREATE TABLE IF NOT EXISTS course_signup_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,

  -- Package definition
  weeks INTEGER NOT NULL,
  label TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  is_full_course BOOLEAN DEFAULT FALSE,

  -- Ordering for display
  sort_order INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups by course
CREATE INDEX IF NOT EXISTS idx_course_signup_packages_course
  ON course_signup_packages(course_id);

-- Unique constraint: one package per week count per course
CREATE UNIQUE INDEX IF NOT EXISTS idx_course_signup_packages_unique
  ON course_signup_packages(course_id, weeks);

-- Enable RLS
ALTER TABLE course_signup_packages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running migration
DROP POLICY IF EXISTS "Public can read signup packages" ON course_signup_packages;
DROP POLICY IF EXISTS "Org members can manage signup packages" ON course_signup_packages;

-- Public can read packages for published courses
CREATE POLICY "Public can read signup packages"
  ON course_signup_packages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE id = course_signup_packages.course_id
      AND status != 'draft'
    )
  );

-- Org members can manage packages for their courses
CREATE POLICY "Org members can manage signup packages"
  ON course_signup_packages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM courses c
      JOIN org_members om ON om.organization_id = c.organization_id
      WHERE c.id = course_signup_packages.course_id
      AND om.user_id = auth.uid()
    )
  );

-- Trigger for updated_at (reuse existing function if available)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_course_signup_packages_updated_at'
  ) THEN
    CREATE TRIGGER update_course_signup_packages_updated_at
      BEFORE UPDATE ON course_signup_packages
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Add package reference columns to signups table (for future student-facing integration)
ALTER TABLE signups ADD COLUMN IF NOT EXISTS signup_package_id UUID REFERENCES course_signup_packages(id);
ALTER TABLE signups ADD COLUMN IF NOT EXISTS package_weeks INTEGER;

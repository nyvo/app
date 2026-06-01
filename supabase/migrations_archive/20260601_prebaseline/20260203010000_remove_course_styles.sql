-- ============================================
-- MIGRATION: Remove Course Styles System
-- ============================================
-- Removes the course_styles table, the style_id
-- foreign key on courses, and related indexes/policies.
-- ============================================

BEGIN;

-- 1. Drop the index on courses.style_id
DROP INDEX IF EXISTS idx_courses_style;

-- 2. Drop the style_id column from courses
ALTER TABLE courses DROP COLUMN IF EXISTS style_id;

-- 3. Drop RLS policy on course_styles
DROP POLICY IF EXISTS "Anyone can read course_styles" ON course_styles;

-- 4. Drop the course_styles table
DROP TABLE IF EXISTS course_styles;

-- 5. Drop the normalization helper function
DROP FUNCTION IF EXISTS normalize_style_name(TEXT);

COMMIT;

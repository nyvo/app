-- Remove style auto-detection columns from courses table
-- These columns were created but never actually used by the application

-- Drop the foreign key constraint first
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_detected_style_id_fkey;

-- Drop the index
DROP INDEX IF EXISTS idx_courses_detected_style_id;

-- Drop the columns
ALTER TABLE courses DROP COLUMN IF EXISTS detected_style_id;
ALTER TABLE courses DROP COLUMN IF EXISTS style_confidence;

-- Note: We keep style_id column (user-assigned styles) and the course_styles table

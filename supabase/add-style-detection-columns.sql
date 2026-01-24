-- Migration: Add style detection columns to courses table
-- These columns store the auto-detected yoga style and confidence score

-- Add detected_style_id column (FK to course_styles)
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS detected_style_id UUID REFERENCES course_styles(id) ON DELETE SET NULL;

-- Add style_confidence column (0-1 score, lower is better match)
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS style_confidence DECIMAL(3,2);

-- Add index for querying by detected style
CREATE INDEX IF NOT EXISTS idx_courses_detected_style_id ON courses(detected_style_id);

-- Comment explaining the columns
COMMENT ON COLUMN courses.detected_style_id IS 'Auto-detected yoga style from title/description using Fuse.js';
COMMENT ON COLUMN courses.style_confidence IS 'Confidence score from style detection (0-1, lower is better match)';

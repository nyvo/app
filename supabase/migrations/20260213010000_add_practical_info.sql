-- Migration: Add practical_info JSONB column to courses
-- Stores structured practical information: audience_level, equipment, arrival_minutes_before, custom_bullets

ALTER TABLE courses ADD COLUMN IF NOT EXISTS practical_info JSONB DEFAULT NULL;

-- Ensure if data exists, it's a JSON object (not an array or scalar)
ALTER TABLE courses ADD CONSTRAINT courses_practical_info_is_object
  CHECK (practical_info IS NULL OR jsonb_typeof(practical_info) = 'object');

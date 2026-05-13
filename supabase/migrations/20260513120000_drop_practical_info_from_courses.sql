-- Migration: Drop practical_info column from courses
-- Removes the JSONB column added in 20260213010000_add_practical_info.sql.
-- The practical info feature was removed from the UI; the column is no
-- longer read or written anywhere in the app.

ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_practical_info_is_object;
ALTER TABLE courses DROP COLUMN IF EXISTS practical_info;

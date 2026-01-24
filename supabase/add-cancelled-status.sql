-- Add 'cancelled' to course_status enum
-- This allows courses to be soft-deleted/cancelled instead of hard-deleted
-- Required for the course cancellation feature

ALTER TYPE course_status ADD VALUE 'cancelled';

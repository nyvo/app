-- Add course_cancelled to signup_status enum
-- This status is used when a teacher cancels a course (distinct from participant cancellation)
ALTER TYPE signup_status ADD VALUE 'course_cancelled';

-- Drop the unused `level` column from courses and its enum type.
-- Level was removed from the course creation flow; renderers and service
-- code no longer read it. The only remaining consumer (create_course_idempotent
-- RPC) was already dropped in 20260428010000.

ALTER TABLE public.courses DROP COLUMN IF EXISTS level;
DROP TYPE IF EXISTS public.course_level;

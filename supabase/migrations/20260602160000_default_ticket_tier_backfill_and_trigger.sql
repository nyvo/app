-- Every course needs a default, non-drop-in "main" ticket tier so both booking
-- flows resolve a ticket: paid (create-dintero-session -> available_ticket_types)
-- and free (create-free-signup -> default tier). Course creation never made one
-- -- createCourse() inserts only `courses` + `course_sessions`, and there is no
-- DB trigger -- so wizard-created courses were unbookable. The public
-- BookingRailLite synthesises a tile from course.price, masking it; checkout then
-- finds no real tier (available_ticket_types is empty) and the submit button
-- stays disabled with no error. Existing courses only have tiers because the
-- April ticket-types migration backfilled them.
--
-- This migration (1) backfills a default tier for every course missing one and
-- (2) adds an AFTER INSERT trigger so future courses always get one. Both respect
-- the `one_default_per_course` partial unique index (one is_default row/course).

-- 1a. A drop-in can never be the default main tier; demote any default drop-in
--     first to free the one-default slot. (No-op on current data.)
UPDATE public.course_signup_packages
SET is_default = false, updated_at = now()
WHERE ticket_kind = 'drop_in' AND is_default = true;

-- 1b. Promote an existing non-drop-in tier to default where the course has one
--     but none is currently the default (prefer the lowest display_order).
WITH promotable AS (
  SELECT DISTINCT ON (p.course_id) p.id
  FROM public.course_signup_packages p
  WHERE p.ticket_kind <> 'drop_in'
    AND NOT EXISTS (
      SELECT 1 FROM public.course_signup_packages d
      WHERE d.course_id = p.course_id AND d.is_default = true
    )
  ORDER BY p.course_id, p.display_order, p.created_at
)
UPDATE public.course_signup_packages p
SET is_default = true, updated_at = now()
FROM promotable
WHERE p.id = promotable.id;

-- 1c. Insert a default package tier for courses that still have no default
--     (no non-drop-in tier existed to promote).
INSERT INTO public.course_signup_packages
  (course_id, label, price, weeks, ticket_kind, audience, is_default, is_active, display_order)
SELECT
  c.id,
  CASE WHEN c.format = 'series' THEN 'Hele kurspakken' ELSE 'Enkelttime' END,
  COALESCE(c.price, 0),
  CASE WHEN c.format = 'series' THEN COALESCE(c.total_weeks, 1) ELSE 1 END,
  'package', 'standard', true, true, 0
FROM public.courses c
WHERE NOT EXISTS (
  SELECT 1 FROM public.course_signup_packages d
  WHERE d.course_id = c.id AND d.is_default = true
);

-- 2. Trigger: every new course gets its default tier. SECURITY DEFINER + fixed
--    search_path so creation never depends on the caller's grants/RLS against
--    course_signup_packages -- this is internal schema maintenance.
CREATE OR REPLACE FUNCTION public.create_default_ticket_for_course()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.course_signup_packages
    WHERE course_id = NEW.id AND is_default = true
  ) THEN
    INSERT INTO public.course_signup_packages
      (course_id, label, price, weeks, ticket_kind, audience, is_default, is_active, display_order)
    VALUES (
      NEW.id,
      CASE WHEN NEW.format = 'series' THEN 'Hele kurspakken' ELSE 'Enkelttime' END,
      COALESCE(NEW.price, 0),
      CASE WHEN NEW.format = 'series' THEN COALESCE(NEW.total_weeks, 1) ELSE 1 END,
      'package', 'standard', true, true, 0
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER courses_create_default_ticket
  AFTER INSERT ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_ticket_for_course();

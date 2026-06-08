-- The course price lives in two places: courses.price (canonical, shown on the
-- public booking card) and the default non-drop-in tier's
-- course_signup_packages.price (what available_ticket_types returns to checkout
-- step 2, what create_signup_if_available charges, and -- via the `csp.price > 0`
-- visibility gate -- what routes a course between the free and paid signup paths).
--
-- The April ticket-types model and the create_default_ticket_for_course INSERT
-- trigger keep the two in sync at course creation, but nothing re-syncs on
-- UPDATE. Editing a course's price (teacher settings) writes only courses.price,
-- so the tier copy drifts: a course re-priced to 0 shows "0 kr" on the card while
-- checkout still displays -- and would charge -- the old amount.
--
-- This migration (1) backfills the default tier price to match the live course
-- price for every drifted course and (2) adds the missing AFTER UPDATE trigger so
-- the two never diverge again. Drop-in tiers are managed separately
-- (syncCourseDropInTier) and are intentionally left untouched.

-- 1. Heal already-drifted courses.
UPDATE public.course_signup_packages csp
SET price = COALESCE(c.price, 0), updated_at = now()
FROM public.courses c
WHERE csp.course_id = c.id
  AND csp.is_default = true
  AND csp.ticket_kind <> 'drop_in'
  AND csp.price IS DISTINCT FROM COALESCE(c.price, 0);

-- 2. Keep them in sync going forward. SECURITY DEFINER + fixed search_path so the
--    sync never depends on the editing user's grants/RLS against
--    course_signup_packages -- this is internal schema maintenance, mirroring
--    create_default_ticket_for_course.
CREATE OR REPLACE FUNCTION public.sync_default_tier_price_on_course_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE public.course_signup_packages
  SET price = COALESCE(NEW.price, 0), updated_at = now()
  WHERE course_id = NEW.id
    AND is_default = true
    AND ticket_kind <> 'drop_in'
    AND price IS DISTINCT FROM COALESCE(NEW.price, 0);
  RETURN NEW;
END;
$$;

CREATE TRIGGER courses_sync_default_tier_price
  AFTER UPDATE OF price ON public.courses
  FOR EACH ROW
  WHEN (NEW.price IS DISTINCT FROM OLD.price)
  EXECUTE FUNCTION public.sync_default_tier_price_on_course_update();

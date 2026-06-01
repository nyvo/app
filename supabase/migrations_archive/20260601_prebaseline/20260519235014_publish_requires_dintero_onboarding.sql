-- Server-side gate: a course cannot enter a published state (upcoming/active)
-- unless its seller has completed Dintero onboarding. Mirrors the client-side
-- check in CourseDrawer/CoursePage so direct UPDATEs and any code path that
-- bypasses the UI gate fail at the database boundary.

CREATE OR REPLACE FUNCTION public.enforce_course_publish_requires_dintero()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_onboarding_complete boolean;
BEGIN
  IF NEW.status NOT IN ('upcoming', 'active') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT dintero_onboarding_complete
    INTO v_onboarding_complete
    FROM public.sellers
   WHERE id = NEW.seller_id;

  IF NOT COALESCE(v_onboarding_complete, false) THEN
    RAISE EXCEPTION 'dintero_onboarding_required'
      USING ERRCODE = 'P0001',
            HINT = 'Seller must complete Dintero onboarding before publishing a course.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_course_publish_requires_dintero ON public.courses;

CREATE TRIGGER enforce_course_publish_requires_dintero
BEFORE INSERT OR UPDATE OF status ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.enforce_course_publish_requires_dintero();

-- Series default tier label: "Hele kurspakken" → "Hele kurset".
--
-- The P0 production audit (982cd6b) renamed the booking rail's series tier
-- to "Hele kurset", but did it in the client-side label derivation. The rail
-- now renders the DATABASE tier label (single-source-of-truth refactor), so
-- the copy decision must live where the label lives: the default-tier
-- trigger. Backfills any auto-created rows still carrying the old label —
-- teacher-authored labels are untouched (exact-match guard).

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
      CASE WHEN NEW.format = 'series' THEN 'Hele kurset' ELSE 'Enkelttime' END,
      COALESCE(NEW.price, 0),
      CASE WHEN NEW.format = 'series' THEN COALESCE(NEW.total_weeks, 1) ELSE 1 END,
      'package', 'standard', true, true, 0
    );
  END IF;
  RETURN NEW;
END;
$$;

UPDATE public.course_signup_packages
SET label = 'Hele kurset', updated_at = now()
WHERE ticket_kind <> 'drop_in'
  AND label = 'Hele kurspakken';

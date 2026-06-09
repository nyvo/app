-- Multi-day single courses: the package ticket should read "Hele kurset",
-- not "Enkelttime".
--
-- A `single`-format course can run over consecutive days (the teacher sets
-- "Antall dager"; each day becomes one session and the last day becomes
-- courses.end_date). The default ticket tier is created on course INSERT by
-- create_default_ticket_for_course(), which can only label it "Enkelttime"
-- because sessions — and therefore end_date — don't exist yet. So a 2-day
-- workshop ends up stored (and snapshotted onto every signup) as "Enkelttime".
--
-- Root-cause fix: re-derive the label from the day span whenever a course's
-- start_date / end_date / format changes. end_date is written right after the
-- sessions are inserted, so this fires on create AND on any later day-count
-- edit. Series keep "Hele kurspakken"; drop-in tiers are never touched. The
-- guard `label IN ('Enkelttime','Hele kurset')` ensures only the auto-managed
-- default label is ever rewritten.

-- 1. Trigger function ------------------------------------------------------

CREATE OR REPLACE FUNCTION "public"."sync_single_ticket_label"()
RETURNS "trigger"
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO 'pg_catalog', 'public'
AS $$
BEGIN
  -- Only single-format courses; series labels ("Hele kurspakken") are fixed.
  IF NEW.format <> 'single' THEN
    RETURN NEW;
  END IF;

  UPDATE public.course_signup_packages
  SET label = CASE
        WHEN NEW.end_date IS NOT NULL AND NEW.end_date > NEW.start_date
          THEN 'Hele kurset'
        ELSE 'Enkelttime'
      END,
      updated_at = now()
  WHERE course_id = NEW.id
    AND ticket_kind <> 'drop_in'
    AND label IN ('Enkelttime', 'Hele kurset');

  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."sync_single_ticket_label"() OWNER TO "postgres";

COMMENT ON FUNCTION "public"."sync_single_ticket_label"() IS 'Keeps a single-format course''s default package label in sync with its day span: "Hele kurset" when it runs over multiple consecutive days (end_date > start_date), otherwise "Enkelttime". Series and drop-in tiers are untouched.';

DROP TRIGGER IF EXISTS "sync_single_ticket_label_trg" ON "public"."courses";
CREATE TRIGGER "sync_single_ticket_label_trg"
AFTER INSERT OR UPDATE OF "start_date", "end_date", "format" ON "public"."courses"
FOR EACH ROW
EXECUTE FUNCTION "public"."sync_single_ticket_label"();

-- 2. Backfill existing data ------------------------------------------------

-- 2a. Default package tiers of existing multi-day single courses.
UPDATE public.course_signup_packages csp
SET label = 'Hele kurset', updated_at = now()
FROM public.courses c
WHERE csp.course_id = c.id
  AND c.format = 'single'
  AND c.end_date IS NOT NULL
  AND c.start_date IS NOT NULL
  AND c.end_date > c.start_date
  AND csp.ticket_kind <> 'drop_in'
  AND csp.label = 'Enkelttime';

-- 2b. Historical signup snapshots — the record of what each buyer purchased.
UPDATE public.signups s
SET ticket_label_snapshot = 'Hele kurset'
FROM public.courses c
WHERE s.course_id = c.id
  AND c.format = 'single'
  AND c.end_date IS NOT NULL
  AND c.start_date IS NOT NULL
  AND c.end_date > c.start_date
  AND s.ticket_kind_snapshot <> 'drop_in'
  AND s.ticket_label_snapshot = 'Enkelttime';

-- 2c. Payment-attempt snapshots, so reconciliation/webhook lookups stay
--     consistent with the signup record.
UPDATE public.payment_attempts pa
SET ticket_label_snapshot = 'Hele kurset'
FROM public.courses c
WHERE pa.course_id = c.id
  AND c.format = 'single'
  AND c.end_date IS NOT NULL
  AND c.start_date IS NOT NULL
  AND c.end_date > c.start_date
  AND pa.ticket_kind_snapshot IS DISTINCT FROM 'drop_in'
  AND pa.ticket_label_snapshot = 'Enkelttime';

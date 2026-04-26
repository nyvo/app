-- Ticket types — unified pricing model.
--
-- Replaces the old "course_signup_packages = packages only" + "courses.allows_drop_in"
-- pattern with one table where every priced unit (full course, multi-week package,
-- drop-in for one session) is a row. Discounts are described by the audience the
-- ticket is for (standard / student / senior / staff) — early-bird is just a
-- standard row with sales_ends_at set, not a separate concept.
--
-- See tasks/todo.md for the full rationale and the multi-session capacity rule
-- that the next migration's RPC update will enforce.
--
-- Backwards compat:
--   * The table keeps its name (course_signup_packages). Lower-risk than renaming
--     and the concept lives in code/UI as "ticket types" / "billettyper".
--   * signups.signup_package_id stays alongside the new signups.ticket_type_id.
--     New signups populate both; legacy signups keep just the old one.
--   * courses.allows_drop_in / drop_in_price stay until the next migration drops
--     them. This one only mirrors their data into ticket-type rows.

-- ----------------------------------------------------------------------------
-- 1. Enum types
-- ----------------------------------------------------------------------------

CREATE TYPE public.ticket_kind_t  AS ENUM ('package', 'drop_in', 'pass');
CREATE TYPE public.ticket_audience_t AS ENUM ('standard', 'student', 'senior', 'staff');

COMMENT ON TYPE public.ticket_kind_t IS
  'package = multi-session purchase (covers a window of sessions). drop_in = single session. pass = reserved for future punch cards (no behaviour wired yet).';
COMMENT ON TYPE public.ticket_audience_t IS
  'Who the ticket is for. Independent of pricing math — discount semantics live in the row''s price.';


-- ----------------------------------------------------------------------------
-- 2. Extend course_signup_packages
-- ----------------------------------------------------------------------------

ALTER TABLE public.course_signup_packages
  ADD COLUMN ticket_kind     public.ticket_kind_t     NOT NULL DEFAULT 'package',
  ADD COLUMN audience        public.ticket_audience_t NOT NULL DEFAULT 'standard',
  ADD COLUMN description     TEXT,
  ADD COLUMN sales_starts_at TIMESTAMPTZ,
  ADD COLUMN sales_ends_at   TIMESTAMPTZ,
  ADD COLUMN max_quantity    INTEGER,
  ADD COLUMN is_active       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN is_default      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN display_order   INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.course_signup_packages.ticket_kind IS
  'package | drop_in | pass. Determines whether the buyer occupies a window of sessions or a single one.';
COMMENT ON COLUMN public.course_signup_packages.audience IS
  'Who the ticket is for (standard / student / senior / staff). Pricing math lives in the price column, not here.';
COMMENT ON COLUMN public.course_signup_packages.max_quantity IS
  'Course-wide cap on this ticket type, summed across ALL sessions. NULL = unlimited. NOT per-session.';
COMMENT ON COLUMN public.course_signup_packages.is_default IS
  'Pre-selected option in BookingPanel. At most one per course (enforced by partial unique index).';
COMMENT ON COLUMN public.course_signup_packages.sales_starts_at IS
  'Inclusive lower bound for when this tier is buyable. NULL = no lower bound.';
COMMENT ON COLUMN public.course_signup_packages.sales_ends_at IS
  'Exclusive cutoff for sale (used by early-bird). NULL = no time limit.';
COMMENT ON COLUMN public.course_signup_packages.display_order IS
  'Teacher-controlled order in the public picker. Lower = earlier. Replaces legacy sort_order.';


-- ----------------------------------------------------------------------------
-- 3. Drop the (course_id, weeks) uniqueness — multi-tier same-weeks is now valid
--    (e.g. "Standard 10 uker" + "Student 10 uker" must both exist).
-- ----------------------------------------------------------------------------

DROP INDEX IF EXISTS public.idx_course_signup_packages_unique;


-- ----------------------------------------------------------------------------
-- 4. Allow NULL weeks for drop-in tickets
-- ----------------------------------------------------------------------------

ALTER TABLE public.course_signup_packages ALTER COLUMN weeks DROP NOT NULL;


-- ----------------------------------------------------------------------------
-- 5. CHECK constraints
-- ----------------------------------------------------------------------------

ALTER TABLE public.course_signup_packages
  ADD CONSTRAINT sales_window_valid
    CHECK (sales_ends_at IS NULL OR sales_starts_at IS NULL OR sales_ends_at > sales_starts_at),
  ADD CONSTRAINT package_has_weeks
    CHECK (ticket_kind <> 'package' OR weeks IS NOT NULL),
  ADD CONSTRAINT drop_in_no_weeks
    CHECK (ticket_kind <> 'drop_in' OR weeks IS NULL),
  ADD CONSTRAINT max_quantity_positive
    CHECK (max_quantity IS NULL OR max_quantity > 0),
  ADD CONSTRAINT price_non_negative
    CHECK (price >= 0);


-- ----------------------------------------------------------------------------
-- 6. Backfill display_order from legacy sort_order
-- ----------------------------------------------------------------------------

UPDATE public.course_signup_packages
SET display_order = COALESCE(sort_order, 0);


-- ----------------------------------------------------------------------------
-- 7. Mark one row per course as default (lowest display_order, then created_at).
--    Done before inserting more rows so the partial unique index can be created
--    cleanly afterwards.
-- ----------------------------------------------------------------------------

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY course_id ORDER BY display_order, created_at
  ) AS rn
  FROM public.course_signup_packages
)
UPDATE public.course_signup_packages csp
SET is_default = true
FROM ranked
WHERE csp.id = ranked.id AND ranked.rn = 1;


-- ----------------------------------------------------------------------------
-- 8. For every course that has zero ticket-type rows, create a default
--    "Hele kurset" / "Standard" tier from courses.price + total_weeks.
--    Without this, those courses would become unbookable as soon as the
--    edge function switches to reading from ticket types.
-- ----------------------------------------------------------------------------

INSERT INTO public.course_signup_packages
  (course_id, label, price, weeks, ticket_kind, audience,
   is_active, is_default, display_order, is_full_course)
SELECT
  c.id,
  CASE WHEN c.course_type = 'event' THEN 'Standard' ELSE 'Hele kurset' END,
  c.price,
  CASE WHEN c.course_type = 'event' THEN 1 ELSE COALESCE(c.total_weeks, 1) END,
  'package'::public.ticket_kind_t,
  'standard'::public.ticket_audience_t,
  true,
  true,
  0,
  true
FROM public.courses c
WHERE NOT EXISTS (
  SELECT 1 FROM public.course_signup_packages csp WHERE csp.course_id = c.id
);


-- ----------------------------------------------------------------------------
-- 9. Mirror legacy drop-in into a ticket-type row per course.
--    is_active = courses.allows_drop_in so behaviour stays identical:
--    a course with allows_drop_in=false gets an *inactive* drop-in row,
--    re-enableable from the editor without re-creating it.
-- ----------------------------------------------------------------------------

INSERT INTO public.course_signup_packages
  (course_id, label, price, weeks, ticket_kind, audience,
   is_active, is_default, display_order, is_full_course)
SELECT
  c.id,
  'Drop-in',
  c.drop_in_price,
  NULL,                                         -- drop-in has no weeks
  'drop_in'::public.ticket_kind_t,
  'standard'::public.ticket_audience_t,
  COALESCE(c.allows_drop_in, false),            -- preserves enabled/disabled state
  false,
  999,                                          -- sorts after package tiers
  false
FROM public.courses c
WHERE c.drop_in_price IS NOT NULL AND c.drop_in_price > 0;


-- ----------------------------------------------------------------------------
-- 10. Drop legacy sort_order — display_order has the data
-- ----------------------------------------------------------------------------

ALTER TABLE public.course_signup_packages DROP COLUMN sort_order;


-- ----------------------------------------------------------------------------
-- 11. Partial unique index: at most one default per course
-- ----------------------------------------------------------------------------

CREATE UNIQUE INDEX one_default_per_course
  ON public.course_signup_packages(course_id) WHERE is_default;


-- ----------------------------------------------------------------------------
-- 12. signups: add ticket_type_id + write-once snapshot fields
--     Snapshots prevent receipts/reporting from breaking when a teacher edits
--     or soft-deletes a tier later.
-- ----------------------------------------------------------------------------

ALTER TABLE public.signups
  ADD COLUMN ticket_type_id           UUID REFERENCES public.course_signup_packages(id),
  ADD COLUMN ticket_label_snapshot    TEXT,
  ADD COLUMN ticket_audience_snapshot public.ticket_audience_t,
  ADD COLUMN ticket_kind_snapshot     public.ticket_kind_t;

COMMENT ON COLUMN public.signups.ticket_type_id IS
  'FK to the ticket type purchased. NULL only on legacy rows from before this migration.';
COMMENT ON COLUMN public.signups.ticket_label_snapshot IS
  'Write-once at signup time. Receipts and historical reporting read this, not the (mutable) FK row.';
COMMENT ON COLUMN public.signups.ticket_audience_snapshot IS
  'Write-once at signup time. Used by teacher rosters to know which signups need verification at the door.';
COMMENT ON COLUMN public.signups.ticket_kind_snapshot IS
  'Write-once at signup time. Lets reporting distinguish drop-ins from package buyers without joining.';

CREATE INDEX idx_signups_ticket_type ON public.signups(ticket_type_id);


-- ----------------------------------------------------------------------------
-- 13. payment_attempts: same snapshots so refund/recovery paths have full
--     context without re-joining a possibly-soft-deleted tier row.
-- ----------------------------------------------------------------------------

ALTER TABLE public.payment_attempts
  ADD COLUMN ticket_type_id           UUID REFERENCES public.course_signup_packages(id),
  ADD COLUMN ticket_label_snapshot    TEXT,
  ADD COLUMN ticket_audience_snapshot public.ticket_audience_t,
  ADD COLUMN ticket_kind_snapshot     public.ticket_kind_t;

CREATE INDEX idx_payment_attempts_ticket_type ON public.payment_attempts(ticket_type_id);


-- ----------------------------------------------------------------------------
-- 14. count_signups_for_session — primitive used by the future RPC's
--     per-session capacity check.
--
--     A session is "covered" by a signup if:
--       (a) it's a drop-in for that exact (date, time), OR
--       (b) it's a non-drop-in whose package window covers the date.
--
--     Legacy non-drop-in signups with NULL package_end_date are treated as
--     full-course (they joined before the package model and are committed
--     for the whole run).
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.count_signups_for_session(
  p_course_id UUID,
  p_session_date DATE,
  p_session_start_time TIME
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_course_start DATE;
  v_count INT;
BEGIN
  SELECT start_date INTO v_course_start FROM public.courses WHERE id = p_course_id;
  IF v_course_start IS NULL OR p_session_date < v_course_start THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.signups s
  WHERE s.course_id = p_course_id
    AND s.status = 'confirmed'
    AND (
      (s.is_drop_in = true
       AND s.class_date = p_session_date
       AND s.class_time = p_session_start_time)
      OR
      (s.is_drop_in IS DISTINCT FROM true
       AND (s.package_end_date IS NULL OR p_session_date <= s.package_end_date))
    );

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.count_signups_for_session(UUID, DATE, TIME) IS
  'Counts confirmed signups whose package window includes (session_date, session_start_time), or who bought a drop-in for that exact session.';


-- ----------------------------------------------------------------------------
-- 15. count_signups_by_ticket_type — course-wide, all sessions, used for
--     per-tier quota enforcement (max_quantity).
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.count_signups_by_ticket_type(
  p_course_id UUID,
  p_ticket_type_id UUID
)
RETURNS INTEGER
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT COUNT(*)::INT
  FROM public.signups s
  WHERE s.course_id = p_course_id
    AND s.ticket_type_id = p_ticket_type_id
    AND s.status = 'confirmed';
$$;

COMMENT ON FUNCTION public.count_signups_by_ticket_type(UUID, UUID) IS
  'Course-wide count for a single ticket type. Used to enforce max_quantity (tier quota). Not per-session.';


-- ----------------------------------------------------------------------------
-- 16. Public RPC: available_ticket_types(course_id)
--     The booking page reads this. Filters by is_active + sales window and
--     computes seats_remaining (NULL for unlimited tiers).
--     SECURITY DEFINER so the count helper runs without RLS interference —
--     anon callers should see the true count, not what RLS lets them see.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.available_ticket_types(p_course_id UUID)
RETURNS TABLE (
  id UUID,
  course_id UUID,
  label TEXT,
  description TEXT,
  price NUMERIC,
  weeks INTEGER,
  ticket_kind public.ticket_kind_t,
  audience public.ticket_audience_t,
  is_default BOOLEAN,
  display_order INTEGER,
  sales_starts_at TIMESTAMPTZ,
  sales_ends_at TIMESTAMPTZ,
  max_quantity INTEGER,
  seats_remaining INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT
    csp.id, csp.course_id, csp.label, csp.description, csp.price, csp.weeks,
    csp.ticket_kind, csp.audience, csp.is_default, csp.display_order,
    csp.sales_starts_at, csp.sales_ends_at, csp.max_quantity,
    CASE
      WHEN csp.max_quantity IS NULL THEN NULL
      ELSE GREATEST(0, csp.max_quantity - public.count_signups_by_ticket_type(csp.course_id, csp.id))
    END AS seats_remaining
  FROM public.course_signup_packages csp
  WHERE csp.course_id = p_course_id
    AND csp.is_active = true
    AND (csp.sales_starts_at IS NULL OR csp.sales_starts_at <= now())
    AND (csp.sales_ends_at  IS NULL OR csp.sales_ends_at  >  now())
  ORDER BY csp.display_order, csp.created_at;
$$;

COMMENT ON FUNCTION public.available_ticket_types(UUID) IS
  'Public RPC. Returns ticket types currently buyable for a course, with seats_remaining computed. Centralises the "is this buyable right now" rule so the booking page and edge function agree.';

GRANT EXECUTE ON FUNCTION public.available_ticket_types(UUID)         TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.count_signups_for_session(UUID, DATE, TIME) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_signups_by_ticket_type(UUID, UUID)    TO authenticated;


-- ----------------------------------------------------------------------------
-- 17. RLS: replace the public SELECT policy so anon only sees buyable tiers.
--     Org members keep visibility into inactive / out-of-window rows so they
--     can manage them in the editor.
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Signup packages SELECT" ON public.course_signup_packages;

CREATE POLICY "Signup packages SELECT"
  ON public.course_signup_packages FOR SELECT TO authenticated, anon
  USING (
    -- Org members see everything (active, inactive, expired) for management.
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_signup_packages.course_id
        AND public.is_org_member(c.organization_id, (SELECT auth.uid()))
    )
    OR
    -- Public sees only buyable tiers on non-draft courses.
    (
      EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.id = course_signup_packages.course_id
          AND c.status <> 'draft'::course_status
      )
      AND course_signup_packages.is_active = true
      AND (course_signup_packages.sales_starts_at IS NULL OR course_signup_packages.sales_starts_at <= now())
      AND (course_signup_packages.sales_ends_at   IS NULL OR course_signup_packages.sales_ends_at   >  now())
    )
  );

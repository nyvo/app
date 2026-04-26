-- Finalize the ticket-type model.
--
-- 20260426020000 added the new columns and migrated drop-in pricing into rows.
-- This migration does the rest:
--
--   * Backfills signups.ticket_type_id + 3 snapshot columns from existing data.
--   * Adds signups.course_session_id (FK to course_sessions) to replace the
--     denormalised class_date / class_time pair.
--   * Drops the legacy redundant columns:
--       courses.allows_drop_in / drop_in_price
--       signups.is_drop_in / class_date / class_time / signup_package_id / package_weeks
--       payment_attempts.is_drop_in / class_date / class_time / signup_package_id / package_weeks
--   * Replaces count_signups_for_session(course_id, date, time) with the
--     simpler count_signups_for_session(session_id) — single arg, joins itself.
--   * Drops count_active_confirmed_signups (course-wide count is no longer the
--     right capacity primitive).
--   * Replaces create_signup_if_available with the ticket-type-aware version:
--     advisory locks, multi-session capacity for packages, snapshot writing,
--     sales-window re-check, per-tier quota.
--
-- Permission to break data was granted (test environment). Running consumer
-- code (edge functions + a few frontend reads) will error until the
-- accompanying code update lands in the same session.

-- ----------------------------------------------------------------------------
-- 1. Backfill signups.ticket_type_id from existing links
-- ----------------------------------------------------------------------------

-- 1a. Existing package buyers: ticket_type_id == signup_package_id (same FK target)
UPDATE public.signups
SET ticket_type_id = signup_package_id
WHERE signup_package_id IS NOT NULL;

-- 1b. Drop-ins without an explicit package_id: link to the course's drop-in tier
UPDATE public.signups s
SET ticket_type_id = csp.id
FROM public.course_signup_packages csp
WHERE s.is_drop_in = true
  AND s.ticket_type_id IS NULL
  AND csp.course_id = s.course_id
  AND csp.ticket_kind = 'drop_in';

-- 1c. Legacy full-course signups (no package_id, not drop-in): link to the
--     course's default tier (every course has one — created in 20260426020000).
UPDATE public.signups s
SET ticket_type_id = csp.id
FROM public.course_signup_packages csp
WHERE s.ticket_type_id IS NULL
  AND s.is_drop_in IS DISTINCT FROM true
  AND csp.course_id = s.course_id
  AND csp.is_default = true;

-- 1d. Backfill the three snapshot columns from the linked tier
UPDATE public.signups s
SET
  ticket_label_snapshot    = csp.label,
  ticket_audience_snapshot = csp.audience,
  ticket_kind_snapshot     = csp.ticket_kind
FROM public.course_signup_packages csp
WHERE s.ticket_type_id = csp.id
  AND s.ticket_label_snapshot IS NULL;

-- 1e. Sanity check: every signup must have a ticket_type_id by now
DO $$
DECLARE
  v_unbacked INT;
BEGIN
  SELECT COUNT(*) INTO v_unbacked FROM public.signups WHERE ticket_type_id IS NULL;
  IF v_unbacked > 0 THEN
    RAISE EXCEPTION 'Backfill incomplete: % signup(s) have NULL ticket_type_id', v_unbacked;
  END IF;
END $$;


-- ----------------------------------------------------------------------------
-- 2. Add signups.course_session_id and backfill from class_date / class_time
-- ----------------------------------------------------------------------------

ALTER TABLE public.signups
  ADD COLUMN course_session_id UUID REFERENCES public.course_sessions(id);

UPDATE public.signups s
SET course_session_id = cs.id
FROM public.course_sessions cs
WHERE s.is_drop_in = true
  AND s.class_date  = cs.session_date
  AND s.class_time  = cs.start_time
  AND cs.course_id  = s.course_id;

-- Sanity check: every drop-in must have a session link
DO $$
DECLARE
  v_unbacked INT;
BEGIN
  SELECT COUNT(*) INTO v_unbacked
  FROM public.signups
  WHERE is_drop_in = true AND course_session_id IS NULL;
  IF v_unbacked > 0 THEN
    RAISE EXCEPTION 'Drop-in session backfill incomplete: % drop-in signup(s) have no matching course_session row', v_unbacked;
  END IF;
END $$;

CREATE INDEX idx_signups_course_session ON public.signups(course_session_id);

COMMENT ON COLUMN public.signups.course_session_id IS
  'Set only when ticket_kind_snapshot = ''drop_in''. FK to the specific session the buyer purchased. NULL for package buyers (their "which sessions" is derived from start_date + package_end_date).';


-- ----------------------------------------------------------------------------
-- 3. Drop legacy signups columns
-- ----------------------------------------------------------------------------

ALTER TABLE public.signups
  DROP COLUMN is_drop_in,
  DROP COLUMN class_date,
  DROP COLUMN class_time,
  DROP COLUMN signup_package_id,
  DROP COLUMN package_weeks;

-- Now that backfill is complete, lock in the snapshots as NOT NULL.
ALTER TABLE public.signups
  ALTER COLUMN ticket_type_id           SET NOT NULL,
  ALTER COLUMN ticket_label_snapshot    SET NOT NULL,
  ALTER COLUMN ticket_audience_snapshot SET NOT NULL,
  ALTER COLUMN ticket_kind_snapshot     SET NOT NULL;


-- ----------------------------------------------------------------------------
-- 4. Backfill + drop legacy payment_attempts columns
-- ----------------------------------------------------------------------------

-- payment_attempts.signup_package_id (legacy) → ticket_type_id
UPDATE public.payment_attempts
SET ticket_type_id = signup_package_id
WHERE signup_package_id IS NOT NULL AND ticket_type_id IS NULL;

-- For drop-ins, link to the drop-in tier
UPDATE public.payment_attempts pa
SET ticket_type_id = csp.id
FROM public.course_signup_packages csp
WHERE pa.is_drop_in = true
  AND pa.ticket_type_id IS NULL
  AND csp.course_id = pa.course_id
  AND csp.ticket_kind = 'drop_in';

-- Backfill snapshot columns
UPDATE public.payment_attempts pa
SET
  ticket_label_snapshot    = csp.label,
  ticket_audience_snapshot = csp.audience,
  ticket_kind_snapshot     = csp.ticket_kind
FROM public.course_signup_packages csp
WHERE pa.ticket_type_id = csp.id
  AND pa.ticket_label_snapshot IS NULL;

-- payment_attempts.course_session_id already exists (added in 20260422010000)
-- so we don't need to add it.

ALTER TABLE public.payment_attempts
  DROP COLUMN is_drop_in,
  DROP COLUMN class_date,
  DROP COLUMN class_time,
  DROP COLUMN signup_package_id,
  DROP COLUMN package_weeks;


-- ----------------------------------------------------------------------------
-- 5. Drop legacy courses columns (drop-in pricing now lives in tiers)
-- ----------------------------------------------------------------------------

ALTER TABLE public.courses
  DROP COLUMN IF EXISTS allows_drop_in,
  DROP COLUMN IF EXISTS drop_in_price;


-- ----------------------------------------------------------------------------
-- 6. Drop superseded RPCs
-- ----------------------------------------------------------------------------

-- Course-wide count is no longer the right capacity guard (drop-ins broke it).
DROP FUNCTION IF EXISTS public.count_active_confirmed_signups(UUID);

-- Old (course_id, session_date, session_start_time) signature — replaced
-- with single-arg session_id below.
DROP FUNCTION IF EXISTS public.count_signups_for_session(UUID, DATE, TIME);


-- ----------------------------------------------------------------------------
-- 7. New count_signups_for_session(session_id) — single arg, joins itself.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.count_signups_for_session(
  p_course_session_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_session_date DATE;
  v_course_id    UUID;
  v_count        INT;
BEGIN
  SELECT cs.session_date, cs.course_id
    INTO v_session_date, v_course_id
  FROM public.course_sessions cs
  WHERE cs.id = p_course_session_id;

  IF v_session_date IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.signups s
  WHERE s.course_id = v_course_id
    AND s.status = 'confirmed'
    AND (
      -- Drop-in: bought this exact session
      s.course_session_id = p_course_session_id
      OR
      -- Package: window covers this session's date
      (s.ticket_kind_snapshot IS DISTINCT FROM 'drop_in'
       AND (s.package_end_date IS NULL OR v_session_date <= s.package_end_date))
    );

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.count_signups_for_session(UUID) TO authenticated, anon;

COMMENT ON FUNCTION public.count_signups_for_session(UUID) IS
  'Counts confirmed attendees on a specific session. Includes both drop-in buyers (linked via course_session_id) and package buyers whose window covers the session date.';


-- ----------------------------------------------------------------------------
-- 8. Replace create_signup_if_available with the ticket-type-aware version.
--
--    New contract:
--      * p_ticket_type_id is required (replaces p_signup_package_id +
--        p_is_drop_in + p_package_weeks — all derivable from the tier row).
--      * p_course_session_id replaces p_class_date + p_class_time. Required
--        when ticket_kind = 'drop_in', forbidden otherwise.
--      * Re-validates is_active + sales window inside the transaction
--        (race against early-bird cutoff).
--      * Per-session capacity check for drop-ins.
--      * Multi-session capacity check for packages — if ANY session in the
--        buyer's window is at capacity, the booking fails. This is the
--        correctness rule that the old course-wide counter missed.
--      * Per-tier quota check via max_quantity (when set).
--      * pg_advisory_xact_lock on (course_id, course_session_id) for
--        drop-ins, (course_id) for packages — serialises concurrent buyers
--        to prevent overselling under load.
--      * Writes ticket_type_id + 3 snapshots so receipts and reporting
--        survive future tier edits.
-- ----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.create_signup_if_available(
  UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, NUMERIC, BOOLEAN, DATE, TIME, UUID, INTEGER
);

CREATE OR REPLACE FUNCTION public.create_signup_if_available(
  p_organization_id            UUID,
  p_course_id                  UUID,
  p_ticket_type_id             UUID,
  p_participant_name           TEXT,
  p_participant_email          TEXT,
  p_participant_phone          TEXT,
  p_amount_paid                NUMERIC,
  p_dintero_transaction_id     TEXT,
  p_dintero_session_id         TEXT,
  p_dintero_merchant_reference TEXT,
  p_course_session_id          UUID DEFAULT NULL,
  p_user_id                    UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_tier              public.course_signup_packages%ROWTYPE;
  v_course            public.courses%ROWTYPE;
  v_session           public.course_sessions%ROWTYPE;
  v_package_end_date  DATE;
  v_signup_id         UUID;
  v_count             INT;
  v_failing_session   UUID;
  v_lock_key          BIGINT;
BEGIN
  -- ---- Load + validate the ticket type
  SELECT * INTO v_tier
  FROM public.course_signup_packages
  WHERE id = p_ticket_type_id AND course_id = p_course_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'ticket_not_found',
      'message', 'Billettypen finnes ikke');
  END IF;

  IF NOT v_tier.is_active THEN
    RETURN json_build_object('success', false, 'error', 'ticket_inactive',
      'message', 'Denne billetten er ikke lenger tilgjengelig');
  END IF;

  IF v_tier.sales_starts_at IS NOT NULL AND v_tier.sales_starts_at > now() THEN
    RETURN json_build_object('success', false, 'error', 'ticket_not_yet_on_sale',
      'message', 'Denne billetten er ikke i salg ennå');
  END IF;

  IF v_tier.sales_ends_at IS NOT NULL AND v_tier.sales_ends_at <= now() THEN
    RETURN json_build_object('success', false, 'error', 'ticket_expired',
      'message', 'Tilbudet er utløpt');
  END IF;

  -- ---- Validate course_session_id presence matches ticket_kind
  IF v_tier.ticket_kind = 'drop_in' AND p_course_session_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'session_required',
      'message', 'Drop-in krever at du velger en time');
  END IF;

  IF v_tier.ticket_kind <> 'drop_in' AND p_course_session_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'session_not_allowed',
      'message', 'Pakke-billetter kan ikke knyttes til en enkelt time');
  END IF;

  -- ---- Load course + (for drop-ins) the chosen session
  SELECT * INTO v_course FROM public.courses WHERE id = p_course_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'course_not_found',
      'message', 'Kurset finnes ikke');
  END IF;

  IF v_tier.ticket_kind = 'drop_in' THEN
    SELECT * INTO v_session
    FROM public.course_sessions
    WHERE id = p_course_session_id AND course_id = p_course_id;

    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error', 'session_not_found',
        'message', 'Timen finnes ikke');
    END IF;
  END IF;

  -- ---- Compute package_end_date (only for non-drop-in)
  IF v_tier.ticket_kind <> 'drop_in' AND v_tier.weeks IS NOT NULL THEN
    v_package_end_date := v_course.start_date + ((v_tier.weeks - 1) * INTERVAL '7 days');
  END IF;

  -- ---- Advisory lock: serialise concurrent buyers
  IF v_tier.ticket_kind = 'drop_in' THEN
    v_lock_key := hashtextextended(p_course_id::text || p_course_session_id::text, 0);
  ELSE
    v_lock_key := hashtextextended(p_course_id::text, 0);
  END IF;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- ---- Capacity check
  IF v_tier.ticket_kind = 'drop_in' THEN
    IF v_course.max_participants IS NOT NULL THEN
      v_count := public.count_signups_for_session(p_course_session_id);
      IF v_count >= v_course.max_participants THEN
        RETURN json_build_object('success', false, 'error', 'session_full',
          'message', 'Timen er full');
      END IF;
    END IF;
  ELSE
    -- Multi-session: every session in the package window must have room.
    IF v_course.max_participants IS NOT NULL AND v_package_end_date IS NOT NULL THEN
      SELECT cs.id INTO v_failing_session
      FROM public.course_sessions cs
      WHERE cs.course_id = p_course_id
        AND cs.session_date BETWEEN v_course.start_date AND v_package_end_date
        AND public.count_signups_for_session(cs.id) >= v_course.max_participants
      LIMIT 1;

      IF v_failing_session IS NOT NULL THEN
        RETURN json_build_object('success', false, 'error', 'course_full',
          'message', 'En eller flere timer i kurset er fulle');
      END IF;
    END IF;
  END IF;

  -- ---- Per-tier quota
  IF v_tier.max_quantity IS NOT NULL THEN
    v_count := public.count_signups_by_ticket_type(p_course_id, p_ticket_type_id);
    IF v_count >= v_tier.max_quantity THEN
      RETURN json_build_object('success', false, 'error', 'tier_sold_out',
        'message', 'Denne billettypen er utsolgt');
    END IF;
  END IF;

  -- ---- Insert
  INSERT INTO public.signups (
    organization_id, course_id, user_id,
    participant_name, participant_email, participant_phone,
    status, payment_status,
    ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot,
    course_session_id, package_end_date,
    dintero_transaction_id, dintero_session_id, dintero_merchant_reference,
    amount_paid,
    created_at, updated_at
  ) VALUES (
    p_organization_id, p_course_id, p_user_id,
    p_participant_name, p_participant_email, p_participant_phone,
    'confirmed', 'paid',
    p_ticket_type_id, v_tier.label, v_tier.audience, v_tier.ticket_kind,
    p_course_session_id, v_package_end_date,
    p_dintero_transaction_id, p_dintero_session_id, p_dintero_merchant_reference,
    p_amount_paid,
    NOW(), NOW()
  )
  RETURNING id INTO v_signup_id;

  RETURN json_build_object(
    'success', true,
    'signup_id', v_signup_id,
    'status', 'confirmed',
    'package_end_date', v_package_end_date
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object('success', false, 'error', 'already_signed_up',
      'message', 'Du er allerede påmeldt dette kurset');
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'database_error',
      'message', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.create_signup_if_available(
  UUID, UUID, UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, UUID, UUID
) IS
  'Atomic ticket-type-aware signup creation. Validates sales window + capacity (per-session for drop-in, multi-session for packages) + tier quota inside an advisory-locked transaction. Writes write-once snapshots so receipts and reporting survive future tier edits.';

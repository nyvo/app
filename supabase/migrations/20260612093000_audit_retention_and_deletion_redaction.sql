-- Pre-launch audit fixes H1 + H4 + M7 + M8 + M10 (see .context/db-audit/AUDIT-REPORT.md)
--
-- 1. payment_audit_log rows must outlive their operational parents. Both FKs
--    were ON DELETE CASCADE, so deleting a non-material signup (free/'external'
--    footprint via delete_course_cascade) or hard-deleting a dormant seller
--    silently destroyed payment-status history.
-- 2. 'external' signups (paid outside the platform — Vipps/cash/invoice) are
--    real payment records the seller relies on; they now count as material in
--    the course-deletion guards, like 'refunded' already did.
-- 3. Account deletion redacted signups + notifications but left full PII
--    (name/email/phone/note) in payment_attempts forever, and left
--    signups.note (free text — can hold sensitive info) unredacted.
-- 4. _seller_has_unfinished_business listed a status 'settled' that does not
--    exist in payment_attempts_status_check (dead value, removed).
-- 5. payment_attempts.ticket_type_id FK (NO ACTION) blocked deleting a ticket
--    tier that only abandoned checkout attempts reference; the attempt carries
--    its own label snapshots, so SET NULL loses nothing.

-- ── 1. Audit log survives parent deletion ────────────────────────────────────
ALTER TABLE public.payment_audit_log ALTER COLUMN signup_id DROP NOT NULL;
ALTER TABLE public.payment_audit_log ALTER COLUMN seller_id DROP NOT NULL;

ALTER TABLE public.payment_audit_log
  DROP CONSTRAINT payment_audit_log_signup_id_fkey;
ALTER TABLE public.payment_audit_log
  ADD CONSTRAINT payment_audit_log_signup_id_fkey
    FOREIGN KEY (signup_id) REFERENCES public.signups(id) ON DELETE SET NULL;

ALTER TABLE public.payment_audit_log
  DROP CONSTRAINT payment_audit_log_seller_id_fkey;
ALTER TABLE public.payment_audit_log
  ADD CONSTRAINT payment_audit_log_seller_id_fkey
    FOREIGN KEY (seller_id) REFERENCES public.sellers(id) ON DELETE SET NULL;

-- ── 2. 'external' signups are material for course deletion ──────────────────
CREATE OR REPLACE FUNCTION "public"."delete_course_cascade"("p_course_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_material_signups  int;
  v_material_attempts int;
BEGIN
  -- Authorize AND lock in one statement: the caller must be a member of the
  -- course's seller, and FOR UPDATE OF c pins the course row so no concurrent
  -- payment_attempts insert (which takes FOR KEY SHARE on this parent row) can
  -- slip between the materiality counts below and the deletes.
  PERFORM 1
  FROM public.courses c
  JOIN public.seller_members sm ON sm.seller_id = c.seller_id
  WHERE c.id = p_course_id AND sm.user_id = auth.uid()
  FOR UPDATE OF c;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized: you are not a member of this course''s seller';
  END IF;

  SELECT count(*) INTO v_material_signups
  FROM public.signups s
  WHERE s.course_id = p_course_id
    AND (
         s.amount_paid > 0
      OR s.refund_amount > 0
      OR s.refunded_at IS NOT NULL
      -- 'external' = participant paid the seller outside the platform; the
      -- signup row is the seller's only record of that payment.
      OR s.payment_status::text IN ('refunded', 'external')
      OR s.dintero_transaction_id IS NOT NULL
    );

  -- Every payment_attempt that is not in a terminal throwaway state is material.
  -- This includes a still-`pending` attempt that has not yet been backlinked
  -- with a session id: create-dintero-session inserts the attempt as pending
  -- BEFORE opening the Dintero session, and the backlink write is best-effort
  -- (it can be lost), so a live checkout can exist as pending with no ids.
  -- Truly abandoned pending rows are reaped by the purge-stale-payment-attempts
  -- cron, after which the course becomes deletable again.
  SELECT count(*) INTO v_material_attempts
  FROM public.payment_attempts pa
  WHERE pa.course_id = p_course_id
    AND pa.status NOT IN ('failed', 'voided');

  IF v_material_signups > 0 OR v_material_attempts > 0 THEN
    RAISE EXCEPTION
      'Cannot delete course %: % paid/refunded signup(s) and % live/settled payment record(s) exist. Financial records must be retained.',
      p_course_id, v_material_signups, v_material_attempts;
  END IF;

  -- Safe: only free/failed/voided footprint remains. The BEFORE DELETE trigger
  -- on courses re-checks at the course delete and is the universal backstop for
  -- any path that does not go through this function.
  DELETE FROM public.signups         WHERE course_id = p_course_id;
  DELETE FROM public.course_sessions WHERE course_id = p_course_id;
  DELETE FROM public.courses         WHERE id        = p_course_id;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."enforce_course_delete_retention"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_material_signups  int;
  v_material_attempts int;
BEGIN
  SELECT count(*) INTO v_material_signups
  FROM public.signups s
  WHERE s.course_id = OLD.id
    AND (
         s.amount_paid > 0
      OR s.refund_amount > 0
      OR s.refunded_at IS NOT NULL
      OR s.payment_status::text IN ('refunded', 'external')
      OR s.dintero_transaction_id IS NOT NULL
    );

  SELECT count(*) INTO v_material_attempts
  FROM public.payment_attempts pa
  WHERE pa.course_id = OLD.id
    AND pa.status NOT IN ('failed', 'voided');

  IF v_material_signups > 0 OR v_material_attempts > 0 THEN
    RAISE EXCEPTION
      'Cannot delete course %: financial records must be retained (% paid/refunded signup(s), % live/settled payment record(s)).',
      OLD.id, v_material_signups, v_material_attempts
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."enforce_seller_delete_retention"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_material_signups  int;
  v_material_attempts int;
BEGIN
  SELECT count(*) INTO v_material_signups
  FROM public.signups s
  WHERE s.seller_id = OLD.id
    AND (
         s.amount_paid > 0
      OR s.refund_amount > 0
      OR s.refunded_at IS NOT NULL
      OR s.payment_status::text IN ('refunded', 'external')
      OR s.dintero_transaction_id IS NOT NULL
    );

  SELECT count(*) INTO v_material_attempts
  FROM public.payment_attempts pa
  WHERE pa.seller_id = OLD.id
    AND pa.status NOT IN ('failed', 'voided');

  IF v_material_signups > 0 OR v_material_attempts > 0 THEN
    RAISE EXCEPTION
      'Cannot delete seller %: financial records must be retained (% paid/refunded signup(s), % live/settled payment record(s)).',
      OLD.id, v_material_signups, v_material_attempts
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN OLD;
END;
$$;

-- ── 3. Account deletion also redacts payment_attempts PII + free-text notes ─
CREATE OR REPLACE FUNCTION "public"."enforce_profile_delete_guard"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_blockers jsonb;
BEGIN
  -- Serialize concurrent co-owner deletes (lock the owned seller rows first).
  PERFORM 1
  FROM public.sellers s
  WHERE EXISTS (
    SELECT 1 FROM public.seller_members sm
    WHERE sm.seller_id = s.id AND sm.user_id = OLD.id AND sm.role = 'owner')
  ORDER BY s.id
  FOR UPDATE;

  v_blockers := public._account_deletion_blockers(OLD.id);

  IF (v_blockers->>'deletable')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'Cannot delete profile %: unresolved account-deletion blockers %',
      OLD.id, v_blockers
      USING ERRCODE = 'check_violation';
  END IF;

  -- 1. Close + anonymize dormant studios (records kept; studio becomes an
  --    ownerless tombstone). Runs here so it's atomic with the profile delete.
  PERFORM public.close_and_anonymize_seller((studio->>'seller_id')::uuid)
  FROM jsonb_array_elements(v_blockers->'dormant_studios') AS studio;

  -- 2. Redact this buyer's name from their own booking-linked notifications.
  --    Match only known signup-linked types, and only rows tied to a signup the
  --    deleting user actually bought (buyer_id still = OLD.id at BEFORE DELETE).
  UPDATE public.notifications n
  SET body = regexp_replace(n.body, '^.*? · ', 'Slettet bruker · ')
  WHERE n.type IN ('booking.created', 'booking.waitlist_promoted', 'payment.failed', 'refund.completed')
    AND n.body ~ ' · '
    AND EXISTS (
      SELECT 1 FROM public.signups s
      WHERE s.buyer_id = OLD.id
        AND n.metadata->>'signup_id' = s.id::text
    );

  -- 3. Redact PII copied into payment_attempts at checkout time. Attempts have
  --    no buyer FK; match on the account email and on transactions belonging to
  --    the user's claimed signups (still linked at BEFORE DELETE). Name is kept
  --    for the retained accounting record, same as on signups below.
  UPDATE public.payment_attempts pa
  SET participant_email = 'slettet@slettet.invalid',
      participant_phone = NULL,
      note = NULL
  WHERE (
      lower(pa.participant_email) = lower(OLD.email)
      OR pa.dintero_transaction_id IN (
        SELECT s.dintero_transaction_id FROM public.signups s
        WHERE s.buyer_id = OLD.id AND s.dintero_transaction_id IS NOT NULL
      )
    )
    AND pa.participant_email IS DISTINCT FROM 'slettet@slettet.invalid';

  -- 4. Redact this buyer's contact PII from their own signups. Keep
  --    participant_name for the retained accounting/receipt record; drop email
  --    (NOT NULL -> tombstone), phone, and the free-text note (can hold
  --    sensitive details — allergies, health info). buyer_id is still OLD.id
  --    here; the FK SET NULL fires as part of the delete that follows.
  UPDATE public.signups s
  SET participant_email = 'slettet@slettet.invalid',
      participant_phone = NULL,
      note = NULL
  WHERE s.buyer_id = OLD.id
    AND (s.participant_email IS DISTINCT FROM 'slettet@slettet.invalid'
         OR s.participant_phone IS NOT NULL
         OR s.note IS NOT NULL);

  RETURN OLD;
END;
$$;

-- ── 4. Drop the dead 'settled' status; document the materiality asymmetry ───
-- NOTE the deliberate asymmetry with the deletion-retention guards above:
-- account deletion CLOSES sellers (rows kept, tombstoned), so settled money
-- ('captured'/'refunded' attempts) does not block it. Course/seller DELETION
-- destroys rows, so there settled money does block. Only in-flight payments
-- ('pending'/'authorized') and unresolved refunds make business "unfinished".
CREATE OR REPLACE FUNCTION "public"."_seller_has_unfinished_business"("p_seller_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.seller_id = p_seller_id AND public._course_runs_today_or_later(c.id)
    )
    OR EXISTS (
      SELECT 1 FROM public.payment_attempts pa
      WHERE pa.seller_id = p_seller_id
        AND pa.status NOT IN ('failed', 'voided', 'captured', 'refunded')
    )
    OR EXISTS (
      SELECT 1 FROM public.signups su
      WHERE su.seller_id = p_seller_id
        AND su.refund_amount > 0 AND su.refunded_at IS NULL
    );
$$;

-- ── 5. Abandoned-checkout attempts must not pin ticket tiers ─────────────────
ALTER TABLE public.payment_attempts
  DROP CONSTRAINT payment_attempts_ticket_type_id_fkey;
ALTER TABLE public.payment_attempts
  ADD CONSTRAINT payment_attempts_ticket_type_id_fkey
    FOREIGN KEY (ticket_type_id) REFERENCES public.course_signup_packages(id)
    ON DELETE SET NULL;

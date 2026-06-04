-- Launch hardening, round 2 — universal delete-retention + signup invariants.
-- Follow-up to 20260603090000 (already applied in prod; left unchanged).
--
-- WHY TRIGGERS, NOT JUST THE RPC:
-- Authenticated sellers hold DIRECT delete on public.courses (the
-- courses_delete_member RLS policy + a table-level GRANT ... DELETE TO
-- authenticated), so a plain REST `DELETE FROM courses` bypasses
-- delete_course_cascade and its materiality guard entirely. Seller deletion
-- likewise cascades seller -> courses -> signups -> payment_attempts ->
-- payment_audit_log. A BEFORE DELETE trigger on courses covers the direct-REST,
-- RPC, and (per-row) cascade-from-seller course deletes — but it has a blind
-- spot on a seller delete: payment_attempts carries its own seller_id cascade
-- and those rows can be removed BEFORE the course rows, so a live pending
-- attempt with no signup yet would be invisible to the course trigger. A second
-- BEFORE DELETE trigger on sellers (which fires before ANY cascade child is
-- touched) closes that gap. Together they enforce the bokføringsloven (5-yr)
-- retention rule on every deletion path and cannot be revoked around.
--
--   1.  enforce_course_delete_retention  trigger on public.courses
--   1b. enforce_seller_delete_retention  trigger on public.sellers
--   2.  delete_course_cascade: combined auth + row-lock, simple pending materiality
--   3.  create_signup_if_available: FOR SHARE on the tier read + a zero-value/
--       paid-tier guard (defense-in-depth for the public free-signup path)

-- 1. Universal retention trigger ---------------------------------------------
-- Fires for each course row about to be deleted, no matter who initiated it.
-- On the delete_course_cascade path the function has already removed signups by
-- the time the course row is deleted, so v_material_signups reads 0 there — but
-- payment_attempts still exist (they cascade on the course delete), so material
-- payments are still caught, and the function keeps its own pre-delete signup
-- check as the early, clearly-messaged guard.
-- SECURITY DEFINER is REQUIRED: this fires on direct REST deletes initiated by
-- authenticated sellers, who cannot SELECT payment_attempts. As an invoker
-- function it would either error out a legitimate empty-course rollback delete
-- or (under row-filtering RLS) count 0 and silently let material deletes
-- through. Running as the owner (postgres) gives it full, RLS-bypassing read
-- visibility so the count is always correct regardless of who triggered it.
CREATE OR REPLACE FUNCTION public.enforce_course_delete_retention()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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
      OR s.payment_status::text = 'refunded'
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
$function$;

-- Trigger function: not directly RPC-callable (RETURNS trigger), revoke anyway
-- to keep the grant surface honest, matching the repo convention.
REVOKE EXECUTE ON FUNCTION public.enforce_course_delete_retention() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_course_delete_retention ON public.courses;
CREATE TRIGGER trg_course_delete_retention
  BEFORE DELETE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_course_delete_retention();

-- 1b. Universal retention trigger on sellers ---------------------------------
-- The courses trigger alone has a blind spot on a SELLER delete: payment_attempts
-- carries its own seller_id -> sellers ON DELETE CASCADE, so those rows can be
-- cascade-deleted BEFORE the courses rows are. By the time the courses trigger
-- fires, a live (pending, no-signup-yet) attempt may already be gone, and the
-- course would delete cleanly. A BEFORE DELETE trigger on sellers runs before
-- ANY cascade child is touched, so it sees the full financial footprint
-- regardless of cascade order. SECURITY DEFINER for the same reason as above.
CREATE OR REPLACE FUNCTION public.enforce_seller_delete_retention()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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
      OR s.payment_status::text = 'refunded'
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
$function$;

REVOKE EXECUTE ON FUNCTION public.enforce_seller_delete_retention() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_seller_delete_retention ON public.sellers;
CREATE TRIGGER trg_seller_delete_retention
  BEFORE DELETE ON public.sellers
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_seller_delete_retention();

-- 2. delete_course_cascade: combine auth + lock, simple pending materiality ---
CREATE OR REPLACE FUNCTION public.delete_course_cascade(p_course_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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
      OR s.payment_status::text = 'refunded'
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
$function$;

-- 3. create_signup_if_available (14-arg overload): lock tier + free-tier guard
-- Reproduced verbatim from 20260601000000_production_schema_baseline.sql with
-- exactly two changes, both marked CHANGED below:
--   (a) FOR SHARE on the tier read so a concurrent price edit cannot land
--       between validation and insert;
--   (b) reject a zero-value, transactionless signup against a positively-priced
--       tier. The paid finalize path always passes a transaction id, so it is
--       untouched; the teacher manual-add path is a DIRECT insert (not this
--       RPC), so comping a free seat into a paid course still works.
CREATE OR REPLACE FUNCTION public.create_signup_if_available(
  p_seller_id uuid, p_course_id uuid, p_ticket_type_id uuid,
  p_participant_name text, p_participant_email text, p_participant_phone text,
  p_amount_paid numeric, p_dintero_transaction_id text, p_dintero_session_id text,
  p_dintero_merchant_reference text, p_course_session_id uuid DEFAULT NULL::uuid,
  p_buyer_id uuid DEFAULT NULL::uuid, p_note text DEFAULT NULL::text,
  p_payment_product text DEFAULT NULL::text
) RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_tier               public.course_signup_packages%ROWTYPE;
  v_course             public.courses%ROWTYPE;
  v_session            public.course_sessions%ROWTYPE;
  v_package_end_date   DATE;
  v_signup_id          UUID;
  v_existing_signup_id UUID;
  v_count              INT;
  v_failing_session    UUID;
  v_lock_key           BIGINT;
BEGIN
  IF p_dintero_transaction_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(
      hashtextextended('dintero:txn:' || p_dintero_transaction_id, 0)
    );

    SELECT id INTO v_existing_signup_id
    FROM public.signups
    WHERE dintero_transaction_id = p_dintero_transaction_id;

    IF v_existing_signup_id IS NOT NULL THEN
      RETURN json_build_object(
        'success', true,
        'signup_id', v_existing_signup_id,
        'status', 'already_processed'
      );
    END IF;
  END IF;

  -- CHANGED (a): FOR SHARE locks the tier row so a concurrent price/active edit
  -- cannot race the validation below against the insert.
  SELECT * INTO v_tier
  FROM public.course_signup_packages
  WHERE id = p_ticket_type_id AND course_id = p_course_id
  FOR SHARE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'ticket_not_found',
      'message', 'Billettypen finnes ikke');
  END IF;

  IF NOT v_tier.is_active THEN
    RETURN json_build_object('success', false, 'error', 'ticket_inactive',
      'message', 'Denne billetten er ikke lenger tilgjengelig');
  END IF;

  -- CHANGED (b): a zero-value signup with no Dintero transaction may only be
  -- created against a free tier. Closes the forgery gap where a free-PRICED
  -- course could carry a positively-priced default tier and still be booked at
  -- 0 kr through the public free-signup endpoint.
  IF p_dintero_transaction_id IS NULL
     AND COALESCE(p_amount_paid, 0) = 0
     AND COALESCE(v_tier.price, 0) > 0 THEN
    RETURN json_build_object('success', false, 'error', 'tier_requires_payment',
      'message', 'Denne billetten krever betaling');
  END IF;

  IF v_tier.sales_starts_at IS NOT NULL AND v_tier.sales_starts_at > now() THEN
    RETURN json_build_object('success', false, 'error', 'ticket_not_yet_on_sale',
      'message', 'Denne billetten er ikke i salg ennå');
  END IF;

  IF v_tier.sales_ends_at IS NOT NULL AND v_tier.sales_ends_at <= now() THEN
    RETURN json_build_object('success', false, 'error', 'ticket_expired',
      'message', 'Tilbudet er utløpt');
  END IF;

  IF v_tier.ticket_kind = 'drop_in' AND p_course_session_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'session_required',
      'message', 'Drop-in krever at du velger en time');
  END IF;

  IF v_tier.ticket_kind <> 'drop_in' AND p_course_session_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'session_not_allowed',
      'message', 'Pakke-billetter kan ikke knyttes til en enkelt time');
  END IF;

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

  IF v_tier.ticket_kind <> 'drop_in' AND v_tier.weeks IS NOT NULL THEN
    v_package_end_date := v_course.start_date + ((v_tier.weeks - 1) * INTERVAL '7 days');
  END IF;

  IF v_tier.ticket_kind = 'drop_in' THEN
    v_lock_key := hashtextextended(p_course_id::text || p_course_session_id::text, 0);
  ELSE
    v_lock_key := hashtextextended(p_course_id::text, 0);
  END IF;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  IF v_tier.ticket_kind = 'drop_in' THEN
    IF v_course.max_participants IS NOT NULL THEN
      v_count := public.count_signups_for_session(p_course_session_id);
      IF v_count >= v_course.max_participants THEN
        RETURN json_build_object('success', false, 'error', 'session_full',
          'message', 'Timen er full');
      END IF;
    END IF;
  ELSE
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

  IF v_tier.max_quantity IS NOT NULL THEN
    v_count := public.count_signups_by_ticket_type(p_course_id, p_ticket_type_id);
    IF v_count >= v_tier.max_quantity THEN
      RETURN json_build_object('success', false, 'error', 'tier_sold_out',
        'message', 'Denne billettypen er utsolgt');
    END IF;
  END IF;

  INSERT INTO public.signups (
    seller_id, course_id, buyer_id,
    participant_name, participant_email, participant_phone, note,
    status, payment_status,
    ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot,
    course_session_id, package_end_date,
    dintero_transaction_id, dintero_session_id, dintero_merchant_reference,
    payment_product,
    amount_paid, created_at, updated_at
  ) VALUES (
    p_seller_id, p_course_id, p_buyer_id,
    p_participant_name, p_participant_email, p_participant_phone, NULLIF(BTRIM(p_note), ''),
    'confirmed', 'paid',
    p_ticket_type_id, v_tier.label, v_tier.audience, v_tier.ticket_kind,
    p_course_session_id, v_package_end_date,
    p_dintero_transaction_id, p_dintero_session_id, p_dintero_merchant_reference,
    p_payment_product,
    p_amount_paid, NOW(), NOW()
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
$function$;

-- Disambiguate unique_violation in create_signup_if_available.
--
-- Two different unique indexes can fire on the signups INSERT, and they mean
-- OPPOSITE things for the caller holding an authorized PaymentIntent:
--
--   signups_stripe_payment_intent_id_key
--     THIS payment already minted its signup (webhook retry that slipped past
--     the dedup SELECT). Idempotent success — the caller may safely ensure the
--     PI is captured.
--
--   unique_active_non_drop_in_signup_per_course_email
--     This EMAIL already holds a confirmed booking on the course via a
--     DIFFERENT payment (two-tab double checkout: both PIs authorize, webhook 1
--     mints + captures PI-1, webhook 2 hits this index). The caller must CANCEL
--     its PaymentIntent — capturing charges the buyer twice for one seat.
--
-- The old handler collapsed both into {error:'already_signed_up'}, which
-- sweep-pending-payments treated as "fall through to capture": a buyer who
-- double-submitted could be charged twice, with no signup row for the second
-- charge. Now:
--   PI index    → {success:true, status:'already_processed', signup_id}
--                 (same shape as the dedup-SELECT path — callers already handle it)
--   email index → {success:false, error:'duplicate_signup'}
--                 (callers cancel the PI / reject the request)
--
-- Also drops WHEN OTHERS. It converted transient DB errors (deadlock, lock
-- timeout) into {error:'database_error'} — a "successful" RPC transport result
-- that the webhook treated as a genuine reject, irreversibly CANCELLING a
-- paying customer's authorization instead of letting Stripe retry. A raised
-- exception now surfaces as an RPC transport error: webhook throws → claim
-- released → Stripe retries; sweep counts an error and retries next run;
-- create-free-signup returns a generic 500. It also leaked SQLERRM to
-- unauthenticated callers via create-free-signup.
--
-- Same signature as 20260705153104 → CREATE OR REPLACE; grants persist
-- (re-issued anyway to match house style).

CREATE OR REPLACE FUNCTION public.create_signup_if_available(
  p_seller_id uuid, p_course_id uuid, p_ticket_type_id uuid,
  p_participant_name text, p_participant_email text, p_participant_phone text,
  p_amount_paid numeric,
  p_course_session_id uuid DEFAULT NULL::uuid,
  p_buyer_id uuid DEFAULT NULL::uuid,
  p_note text DEFAULT NULL::text,
  p_payment_product text DEFAULT NULL::text,
  p_payment_status text DEFAULT 'paid'::text,
  p_stripe_payment_intent_id text DEFAULT NULL::text,
  p_platform_fee_nok numeric DEFAULT 0
)
 RETURNS json
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
  v_constraint         TEXT;
BEGIN
  -- The only status this RPC mints. 'external' (off-platform payment) was
  -- removed when integrated payments opened to all tiers.
  IF p_payment_status <> 'paid' THEN
    RETURN json_build_object('success', false, 'error', 'invalid_payment_status',
      'message', 'Ugyldig betalingsstatus');
  END IF;

  -- Stripe idempotency. The webhook may retry payment_intent.amount_capturable_updated;
  -- the advisory lock + dedup SELECT keep this single-mint. In the rare race where the dedup
  -- SELECT misses and the partial unique index fires instead, the EXCEPTION handler below
  -- resolves the existing row and returns the same already_processed success shape.
  IF p_stripe_payment_intent_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(
      hashtextextended('stripe:pi:' || p_stripe_payment_intent_id, 0)
    );

    SELECT id INTO v_existing_signup_id
    FROM public.signups
    WHERE stripe_payment_intent_id = p_stripe_payment_intent_id;

    IF v_existing_signup_id IS NOT NULL THEN
      RETURN json_build_object(
        'success', true,
        'signup_id', v_existing_signup_id,
        'status', 'already_processed'
      );
    END IF;
  END IF;

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

  -- Zero-value guard: a priced tier requires a Stripe PaymentIntent or a
  -- recorded amount (teacher-added rows pass an amount).
  IF p_stripe_payment_intent_id IS NULL
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

  -- AUDIT C1: the signup row must belong to the seller who owns the course.
  IF v_course.seller_id <> p_seller_id THEN
    RETURN json_build_object('success', false, 'error', 'seller_mismatch',
      'message', 'Kurset tilhører ikke denne selgeren');
  END IF;

  -- AUDIT C1: never mint signups on unpublished or cancelled courses.
  IF v_course.status IN ('draft', 'cancelled') THEN
    RETURN json_build_object('success', false, 'error', 'course_not_open',
      'message', 'Kurset er ikke åpent for påmelding');
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
    stripe_payment_intent_id,
    payment_product,
    amount_paid, platform_fee_nok, created_at, updated_at
  ) VALUES (
    p_seller_id, p_course_id, p_buyer_id,
    p_participant_name, p_participant_email, p_participant_phone, NULLIF(BTRIM(p_note), ''),
    'confirmed', p_payment_status::public.payment_status,
    p_ticket_type_id, v_tier.label, v_tier.audience, v_tier.ticket_kind,
    p_course_session_id, v_package_end_date,
    p_stripe_payment_intent_id,
    p_payment_product,
    p_amount_paid, COALESCE(p_platform_fee_nok, 0), NOW(), NOW()
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
    GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;
    -- PI dedup index: this payment already minted its signup (retry race that
    -- slipped past the dedup SELECT). Same idempotent-success shape as the
    -- dedup path, so callers can safely ensure-capture.
    IF v_constraint = 'signups_stripe_payment_intent_id_key'
       AND p_stripe_payment_intent_id IS NOT NULL THEN
      SELECT id INTO v_existing_signup_id
      FROM public.signups
      WHERE stripe_payment_intent_id = p_stripe_payment_intent_id;
      IF v_existing_signup_id IS NOT NULL THEN
        RETURN json_build_object(
          'success', true,
          'signup_id', v_existing_signup_id,
          'status', 'already_processed'
        );
      END IF;
    END IF;
    -- Email index (or unresolvable): a DIFFERENT payment already booked this
    -- buyer. Callers must cancel their PaymentIntent — never capture.
    RETURN json_build_object('success', false, 'error', 'duplicate_signup',
      'message', 'Du er allerede påmeldt dette kurset');
  -- No WHEN OTHERS: real errors must surface as RPC transport errors so the
  -- webhook releases its claim and Stripe retries, instead of the auth being
  -- cancelled on a transient deadlock (and SQLERRM leaking to anon callers).
END;
$function$;

REVOKE ALL ON FUNCTION public.create_signup_if_available(
  uuid, uuid, uuid, text, text, text, numeric,
  uuid, uuid, text, text, text, text, numeric
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_signup_if_available(
  uuid, uuid, uuid, text, text, text, numeric,
  uuid, uuid, text, text, text, text, numeric
) TO service_role;

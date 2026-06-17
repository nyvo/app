-- Stripe Connect — additive payment-path columns + RPC/trigger extensions (Phase 1, step 5).
-- ADDITIVE + REVERSIBLE. Dintero columns and their idempotency stay intact. The Stripe path
-- mirrors the Dintero path one-for-one (partial unique idx, advisory-lock idempotency).
-- Plan: .context/plans/dintero-to-stripe-migration.md (Phase 1, step 5).
-- (No explicit BEGIN/COMMIT — the Supabase migration runner wraps each file in a transaction,
--  matching every other migration in this repo.)

-- 1. payment_attempts: Stripe PaymentIntent id + partial unique idx (parity with dintero_transaction_id).
ALTER TABLE public.payment_attempts ADD COLUMN stripe_payment_intent_id text;

CREATE UNIQUE INDEX IF NOT EXISTS payment_attempts_stripe_payment_intent_id_key
  ON public.payment_attempts (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

-- Sweep index parity with idx_payment_attempts_pending_sweep (which keys on dintero_session_id).
CREATE INDEX IF NOT EXISTS idx_payment_attempts_pending_sweep_stripe
  ON public.payment_attempts (created_at)
  WHERE status = 'pending' AND stripe_payment_intent_id IS NOT NULL;

-- 2. signups: Stripe PaymentIntent id + partial unique idx (parity with dintero_transaction_id).
ALTER TABLE public.signups ADD COLUMN stripe_payment_intent_id text;

CREATE UNIQUE INDEX IF NOT EXISTS signups_stripe_payment_intent_id_key
  ON public.signups (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

-- 3. payment_audit_log.via_external must also be true for Stripe-originated changes.
CREATE OR REPLACE FUNCTION public.log_payment_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.payment_status IS NULL THEN RETURN NEW; END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.payment_status IS NOT DISTINCT FROM OLD.payment_status THEN
      RETURN NEW;
    END IF;
  END IF;
  INSERT INTO public.payment_audit_log (
    signup_id, seller_id, old_status, new_status, via_external, changed_at
  ) VALUES (
    NEW.id, NEW.seller_id,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.payment_status ELSE NULL END,
    NEW.payment_status,
    NEW.dintero_transaction_id IS NOT NULL OR NEW.stripe_payment_intent_id IS NOT NULL,
    now()
  );
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.log_payment_status_change() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_payment_status_change() TO service_role;

-- 4. create_signup_if_available: add optional Stripe PaymentIntent id with its own idempotency
--    lock (stripe:pi:) mirroring the Dintero path, and persist it on the minted signup.
--    Trailing-defaulted param → existing named-arg callers (dintero-webhook) are unaffected.
--    DROP + CREATE because the argument list changes (a CREATE OR REPLACE would leave an
--    ambiguous 15-arg/16-arg overload pair).
DROP FUNCTION IF EXISTS public.create_signup_if_available(
  uuid, uuid, uuid, text, text, text, numeric, text, text, text, uuid, uuid, text, text, text);

CREATE FUNCTION public.create_signup_if_available(
  p_seller_id uuid, p_course_id uuid, p_ticket_type_id uuid,
  p_participant_name text, p_participant_email text, p_participant_phone text,
  p_amount_paid numeric,
  p_dintero_transaction_id text, p_dintero_session_id text, p_dintero_merchant_reference text,
  p_course_session_id uuid DEFAULT NULL::uuid, p_buyer_id uuid DEFAULT NULL::uuid,
  p_note text DEFAULT NULL::text, p_payment_product text DEFAULT NULL::text,
  p_payment_status text DEFAULT 'paid'::text,
  p_stripe_payment_intent_id text DEFAULT NULL::text)
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
BEGIN
  -- Only the two statuses this RPC is allowed to mint.
  IF p_payment_status NOT IN ('paid', 'external') THEN
    RETURN json_build_object('success', false, 'error', 'invalid_payment_status',
      'message', 'Ugyldig betalingsstatus');
  END IF;

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

  -- Stripe idempotency (parity with the Dintero block above). The webhook may retry
  -- payment_intent.amount_capturable_updated; the lock + dedup keep this single-mint.
  -- NOTE for the stripe-webhook author: in the rare race where the dedup SELECT misses and the
  -- partial unique index fires instead, the EXCEPTION handler below returns
  -- {success:false, error:'already_signed_up'}. The webhook MUST treat that as an idempotent
  -- success (HTTP 200), exactly like 'already_processed', or Stripe will retry forever.
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

  -- 'external' signups are reserved for sellers OUTSIDE the integrated flow — an integrated
  -- seller's paid tiers must go through a PSP. The zero-value guard still protects the 'paid'
  -- path; a paid signup now carries EITHER a Dintero txn OR a Stripe PaymentIntent.
  IF p_payment_status = 'external' THEN
    IF EXISTS (
      SELECT 1 FROM public.sellers s
      WHERE s.id = p_seller_id AND s.uses_integrated_payments
    ) THEN
      RETURN json_build_object('success', false, 'error', 'seller_integrated',
        'message', 'Dette studioet bruker integrert betaling');
    END IF;
  ELSIF p_dintero_transaction_id IS NULL
     AND p_stripe_payment_intent_id IS NULL
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

  -- AUDIT C1: never mint signups on unpublished or cancelled courses. (Edge functions enforce
  -- richer rules — accepts_late_signups etc.; this is the floor that holds for every caller.)
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
    dintero_transaction_id, dintero_session_id, dintero_merchant_reference,
    stripe_payment_intent_id,
    payment_product,
    amount_paid, created_at, updated_at
  ) VALUES (
    p_seller_id, p_course_id, p_buyer_id,
    p_participant_name, p_participant_email, p_participant_phone, NULLIF(BTRIM(p_note), ''),
    'confirmed', p_payment_status::public.payment_status,
    p_ticket_type_id, v_tier.label, v_tier.audience, v_tier.ticket_kind,
    p_course_session_id, v_package_end_date,
    p_dintero_transaction_id, p_dintero_session_id, p_dintero_merchant_reference,
    p_stripe_payment_intent_id,
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

REVOKE ALL ON FUNCTION public.create_signup_if_available(
  uuid, uuid, uuid, text, text, text, numeric, text, text, text, uuid, uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_signup_if_available(
  uuid, uuid, uuid, text, text, text, numeric, text, text, text, uuid, uuid, text, text, text, text) TO service_role;

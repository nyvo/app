-- Open integrated payments to all tiers (monetization restructure).
--
-- The off-platform "betaling avtales med instruktør" path is deleted: every
-- paid course sells through Stripe Connect, on every tier. The free tier is
-- bounded by a 5% platform take deducted from the seller's payout (computed in
-- the checkout edge function; Pro pays 0%). Tier stops being a payment
-- capability and becomes a fee parameter.
--
-- Pre-launch hard cut (verified: 0 'external' signups, 0 live paid courses by
-- free sellers), so no grandfathering. The 'external' payment_status value is
-- kept in the type and in historical predicates (audit/retention) — it can no
-- longer be minted.
--
--   1. platform_fee_nok snapshot columns on payment_attempts + signups
--   2. sellers.uses_integrated_payments := stripe_onboarding_complete
--   3. publish gate: price-aware + tier-agnostic
--   4. new guard: priced package added to an already-published course
--   5. create_signup_if_available: 'paid' only, + p_platform_fee_nok

-- ── 1. Platform-take snapshot columns ────────────────────────────────────────
-- Written by create-stripe-connect-session at attempt time, carried onto the
-- signup by the webhook via create_signup_if_available. Feeds the seller-facing
-- "plattformgebyr denne måneden" line (read as authenticated under RLS).
ALTER TABLE public.payment_attempts
  ADD COLUMN platform_fee_nok numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.signups
  ADD COLUMN platform_fee_nok numeric(10,2) NOT NULL DEFAULT 0;

-- ── 2. uses_integrated_payments: any onboarded seller sells integrated ───────
-- A generated column's expression can't be altered in place — drop + re-add.
-- DROP COLUMN destroys the column-level SELECT grants, so they MUST be
-- re-issued (anon/authenticated read this on the public booking page; missing
-- this grant broke public checkout in the Dintero cutover once already).
-- The column is now redundant with stripe_onboarding_complete; it survives one
-- release for deployed bundles that still select it, then gets dropped.
ALTER TABLE public.sellers DROP COLUMN uses_integrated_payments;
ALTER TABLE public.sellers
  ADD COLUMN uses_integrated_payments boolean
  GENERATED ALWAYS AS (stripe_onboarding_complete) STORED;
GRANT SELECT(uses_integrated_payments) ON public.sellers TO anon, authenticated;

-- ── 3. Publish gate: price-aware, tier-agnostic ──────────────────────────────
-- Old rule: Pro needs Stripe onboarding to publish anything; free publishes
-- freely (manual payments). New rule: publishing a course with any priced
-- ticket requires onboarding on every tier; 0 kr courses publish freely.
CREATE OR REPLACE FUNCTION public.enforce_course_publish_requires_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_onboarding_complete boolean;
  v_paid boolean;
BEGIN
  IF NEW.status NOT IN ('upcoming', 'active') THEN
    RETURN NEW;
  END IF;

  -- Already in a published lifecycle state → lifecycle move, not a publish action.
  IF TG_OP = 'UPDATE' AND OLD.status IN ('upcoming', 'active', 'completed') THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
           SELECT 1 FROM public.course_signup_packages p
            WHERE p.course_id = NEW.id
              AND p.is_active
              AND COALESCE(p.price, 0) > 0
         ) OR COALESCE(NEW.price, 0) > 0
    INTO v_paid;

  IF NOT v_paid THEN
    RETURN NEW;
  END IF;

  SELECT s.stripe_onboarding_complete
    INTO v_onboarding_complete
    FROM public.sellers s
   WHERE s.id = NEW.seller_id;

  IF NOT COALESCE(v_onboarding_complete, false) THEN
    RAISE EXCEPTION 'stripe_onboarding_required'
      USING ERRCODE = 'P0001',
            HINT = 'Seller must complete Stripe onboarding before publishing a paid course.';
  END IF;

  RETURN NEW;
END;
$function$;
-- Trigger itself is unchanged (BEFORE INSERT OR UPDATE OF status ON courses);
-- CREATE OR REPLACE preserves the existing ACL (EXECUTE already revoked from
-- PUBLIC/anon/authenticated by 20260701160100).

-- ── 4. Guard the post-publish loophole: pricing lives on ticket packages, and
--      a priced package can be added/re-activated after publish. Same error as
--      the publish gate; the checkout edge function remains the money backstop.
CREATE OR REPLACE FUNCTION public.enforce_package_price_requires_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF COALESCE(NEW.price, 0) <= 0 OR NOT NEW.is_active THEN
    RETURN NEW;
  END IF;

  PERFORM 1
    FROM public.courses c
    JOIN public.sellers s ON s.id = c.seller_id
   WHERE c.id = NEW.course_id
     AND c.status IN ('upcoming', 'active')
     AND NOT COALESCE(s.stripe_onboarding_complete, false);

  IF FOUND THEN
    RAISE EXCEPTION 'stripe_onboarding_required'
      USING ERRCODE = 'P0001',
            HINT = 'Seller must complete Stripe onboarding before selling priced tickets.';
  END IF;

  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.enforce_package_price_requires_payment() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_package_price_requires_payment() FROM anon;
REVOKE ALL ON FUNCTION public.enforce_package_price_requires_payment() FROM authenticated;

DROP TRIGGER IF EXISTS enforce_package_price_requires_payment ON public.course_signup_packages;
CREATE TRIGGER enforce_package_price_requires_payment
  BEFORE INSERT OR UPDATE OF price, is_active ON public.course_signup_packages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_package_price_requires_payment();

-- ── 5. create_signup_if_available: 'paid' only, carry the platform take ──────
-- Adding a parameter changes the signature → DROP + CREATE (not OR REPLACE, which
-- would create an ambiguous overload) and re-issue grants. p_platform_fee_nok is
-- appended with a default so the deployed webhook keeps working through the
-- deploy window. The 'external' status and its seller_integrated guard are
-- deleted — the manual path no longer exists. The inert p_dintero_* params are
-- kept for signature stability; they come out in a later cleanup.
DROP FUNCTION IF EXISTS public.create_signup_if_available(
  uuid, uuid, uuid, text, text, text, numeric,
  text, text, text, uuid, uuid, text, text, text, text
);
CREATE FUNCTION public.create_signup_if_available(
  p_seller_id uuid, p_course_id uuid, p_ticket_type_id uuid,
  p_participant_name text, p_participant_email text, p_participant_phone text,
  p_amount_paid numeric,
  p_dintero_transaction_id text DEFAULT NULL::text,
  p_dintero_session_id text DEFAULT NULL::text,
  p_dintero_merchant_reference text DEFAULT NULL::text,
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
  -- returns {success:false, error:'already_signed_up'} — the webhook MUST treat that as an
  -- idempotent success (HTTP 200), exactly like 'already_processed', or Stripe retries forever.
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
    RETURN json_build_object('success', false, 'error', 'already_signed_up',
      'message', 'Du er allerede påmeldt dette kurset');
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'database_error',
      'message', SQLERRM);
END;
$function$;

REVOKE ALL ON FUNCTION public.create_signup_if_available(
  uuid, uuid, uuid, text, text, text, numeric,
  text, text, text, uuid, uuid, text, text, text, text, numeric
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_signup_if_available(
  uuid, uuid, uuid, text, text, text, numeric,
  text, text, text, uuid, uuid, text, text, text, text, numeric
) TO service_role;

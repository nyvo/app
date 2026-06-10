-- Phase 4 of the pricing & payments plan: free-tier sellers take signups for
-- paid courses with payment handled off-platform ("betaling avtales med
-- instruktør"). The platform never touches the money (INV-4).
--
-- One derived predicate — sellers.uses_integrated_payments — becomes the
-- single source of truth for "this seller's paid courses go through Dintero".
-- The publish trigger (A in the blocker inventory), checkout, and the booking
-- UI all consult it instead of dintero_onboarding_complete alone.

-- 1. New payment_status for signups whose payment happens outside the platform.
--    (Only added here; first used at runtime after this migration commits.)
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'external';

-- 2. The unifying predicate. Stored generated column so the public booking
--    payload can read it via the existing column-grant pattern without
--    exposing plan/status details to anon.
--    'past_due' still counts as integrated: Stripe dunning runs before a sub
--    is canceled, and yanking checkout mid-grace would punish card hiccups.
ALTER TABLE public.sellers
  ADD COLUMN uses_integrated_payments boolean GENERATED ALWAYS AS (
    subscription_plan = 'pro'
    AND subscription_status IN ('active', 'past_due')
    AND dintero_onboarding_complete
  ) STORED;

GRANT SELECT(uses_integrated_payments) ON public.sellers TO anon, authenticated;

-- 3. Grandfather: sellers who already completed Dintero onboarding keep
--    integrated payments (pre-launch test studios). Without this, existing
--    onboarded sellers would silently flip to manual checkout.
--    (Transaction-local opt-in for the sellers_block_protected_columns trigger.)
SELECT set_config('app.sellers_server_write', 'true', true);

UPDATE public.sellers
   SET subscription_plan = 'pro',
       subscription_status = 'active'
 WHERE dintero_onboarding_complete;

-- 4. Publish gate: only Pro sellers must complete Dintero before publishing.
--    Free sellers publish without Dintero — their courses use manual payment.
CREATE OR REPLACE FUNCTION public.enforce_course_publish_requires_dintero() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_plan text;
  v_onboarding_complete boolean;
BEGIN
  IF NEW.status NOT IN ('upcoming', 'active') THEN
    RETURN NEW;
  END IF;

  -- Already in a published lifecycle state → this is a lifecycle move, not a
  -- publish action. Exempt.
  IF TG_OP = 'UPDATE' AND OLD.status IN ('upcoming', 'active', 'completed') THEN
    RETURN NEW;
  END IF;

  SELECT s.subscription_plan, s.dintero_onboarding_complete
    INTO v_plan, v_onboarding_complete
    FROM public.sellers s
   WHERE s.id = NEW.seller_id;

  -- Free tier: manual payments, no Dintero requirement (INV-4).
  IF COALESCE(v_plan, 'free') <> 'pro' THEN
    RETURN NEW;
  END IF;

  IF NOT COALESCE(v_onboarding_complete, false) THEN
    RAISE EXCEPTION 'dintero_onboarding_required'
      USING ERRCODE = 'P0001',
            HINT = 'Seller must complete Dintero onboarding before publishing a course.';
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Capacity RPC: accept an explicit payment_status so the manual path can
--    record 'external' signups. Reproduced from 20260604143000 with exactly
--    three changes, marked CHANGED below:
--      (a) new p_payment_status param (text, validated, default 'paid');
--      (b) guard fork: 'external' requires a NON-integrated seller —
--          the old zero-value guard still protects the 'paid' path;
--      (c) INSERT uses p_payment_status instead of the literal 'paid'.
--    Param added → new signature, so drop the old 14-arg overload first.
DROP FUNCTION public.create_signup_if_available(
  uuid, uuid, uuid, text, text, text, numeric, text, text, text, uuid, uuid, text, text
);

CREATE FUNCTION public.create_signup_if_available(
  p_seller_id uuid, p_course_id uuid, p_ticket_type_id uuid,
  p_participant_name text, p_participant_email text, p_participant_phone text,
  p_amount_paid numeric, p_dintero_transaction_id text, p_dintero_session_id text,
  p_dintero_merchant_reference text, p_course_session_id uuid DEFAULT NULL::uuid,
  p_buyer_id uuid DEFAULT NULL::uuid, p_note text DEFAULT NULL::text,
  p_payment_product text DEFAULT NULL::text,
  p_payment_status text DEFAULT 'paid'::text
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
  -- CHANGED (a): only the two statuses this RPC is allowed to mint.
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

  -- CHANGED (b): 'external' signups are reserved for sellers OUTSIDE the
  -- integrated flow — an integrated seller's paid tiers must go through
  -- Dintero. The original zero-value guard still protects the 'paid' path.
  IF p_payment_status = 'external' THEN
    IF EXISTS (
      SELECT 1 FROM public.sellers s
      WHERE s.id = p_seller_id AND s.uses_integrated_payments
    ) THEN
      RETURN json_build_object('success', false, 'error', 'seller_integrated',
        'message', 'Dette studioet bruker integrert betaling');
    END IF;
  ELSIF p_dintero_transaction_id IS NULL
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
    'confirmed', p_payment_status::public.payment_status,  -- CHANGED (c)
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

ALTER FUNCTION public.create_signup_if_available(
  uuid, uuid, uuid, text, text, text, numeric, text, text, text, uuid, uuid, text, text, text
) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.create_signup_if_available(
  uuid, uuid, uuid, text, text, text, numeric, text, text, text, uuid, uuid, text, text, text
) FROM PUBLIC;

GRANT ALL ON FUNCTION public.create_signup_if_available(
  uuid, uuid, uuid, text, text, text, numeric, text, text, text, uuid, uuid, text, text, text
) TO service_role;

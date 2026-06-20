-- Phase 6 follow-up — drop the last Dintero DB footprint.
-- Pre-launch: no real receipts, so the back-compat columns/RPC kept by
-- 20260620120000 are no longer needed. Rewrites the 5 functions that still
-- referenced the dintero_* columns (so they don't break), then drops the columns.
-- DINTERO_CRON_SECRET stays (shared cron auth, not Dintero-specific).

-- ── 1. Drop the Dintero receipt-lookup RPC (back-compat, now unused) ─────────
DROP FUNCTION IF EXISTS public.get_signup_by_dintero_id(text);
DROP FUNCTION IF EXISTS public.get_signup_by_dintero_id(text, text);

-- ── 2. Seller RPCs — drop the dintero_* return columns (TABLE sig change →
--      DROP + CREATE; re-grant EXECUTE, which DROP removes) ──────────────────
DROP FUNCTION IF EXISTS public.get_seller_operational(uuid);
CREATE FUNCTION public.get_seller_operational(p_seller_id uuid)
 RETURNS TABLE(stripe_account_id text, stripe_account_status text, stripe_onboarding_complete boolean, seller_type text, subscription_plan text, subscription_status text, subscription_current_period_end timestamp with time zone, subscription_customer_id text, uses_integrated_payments boolean, updated_at timestamp with time zone)
 LANGUAGE sql STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT s.stripe_account_id, s.stripe_account_status, s.stripe_onboarding_complete,
         s.seller_type,
         s.subscription_plan, s.subscription_status,
         s.subscription_current_period_end, s.subscription_customer_id,
         s.uses_integrated_payments,
         s.updated_at
  FROM public.sellers s
  WHERE s.id = p_seller_id
    AND public.is_seller_member(p_seller_id, auth.uid());
$function$;
GRANT EXECUTE ON FUNCTION public.get_seller_operational(uuid) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.get_seller_private(uuid);
CREATE FUNCTION public.get_seller_private(p_seller_id uuid)
 RETURNS TABLE(phone text, organization_number text)
 LANGUAGE sql STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT s.phone, s.organization_number
  FROM public.sellers s
  WHERE s.id = p_seller_id
    AND public.is_seller_member(p_seller_id, auth.uid());
$function$;
GRANT EXECUTE ON FUNCTION public.get_seller_private(uuid) TO authenticated, service_role;

-- ── 3. Audit trigger — via_external keys on Stripe only now ──────────────────
CREATE OR REPLACE FUNCTION public.log_payment_status_change()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
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
    NEW.stripe_payment_intent_id IS NOT NULL,
    now()
  );
  RETURN NEW;
END;
$function$;

-- ── 4. Protected-columns trigger — drop the dintero_* block ──────────────────
CREATE OR REPLACE FUNCTION public.sellers_block_protected_columns()
 RETURNS trigger LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF current_user IN ('service_role', 'postgres', 'supabase_admin')
     OR current_setting('app.sellers_server_write', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan
     OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.subscription_current_period_end IS DISTINCT FROM OLD.subscription_current_period_end
     OR NEW.subscription_provider IS DISTINCT FROM OLD.subscription_provider
     OR NEW.subscription_customer_id IS DISTINCT FROM OLD.subscription_customer_id
     OR NEW.subscription_external_id IS DISTINCT FROM OLD.subscription_external_id THEN
    RAISE EXCEPTION 'sellers.subscription_* is server-controlled' USING ERRCODE = '42501';
  END IF;

  IF NEW.stripe_account_id IS DISTINCT FROM OLD.stripe_account_id
     OR NEW.stripe_onboarding_complete IS DISTINCT FROM OLD.stripe_onboarding_complete
     OR NEW.stripe_account_status IS DISTINCT FROM OLD.stripe_account_status THEN
    RAISE EXCEPTION 'sellers.stripe_* is server-controlled' USING ERRCODE = '42501';
  END IF;

  IF NEW.organization_number IS DISTINCT FROM OLD.organization_number
     OR NEW.seller_type IS DISTINCT FROM OLD.seller_type
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.phone IS DISTINCT FROM OLD.phone
     OR NEW.closed_at IS DISTINCT FROM OLD.closed_at THEN
    RAISE EXCEPTION 'sellers identity/lifecycle columns are server-controlled' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

-- ── 5. Signup-mint RPC — drop the Dintero idempotency block + column writes.
--      Signature is preserved (p_dintero_* kept but DEFAULT NULL and ignored)
--      so the deployed webhook/sweep callers keep working through the change. ─
CREATE OR REPLACE FUNCTION public.create_signup_if_available(
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
  p_stripe_payment_intent_id text DEFAULT NULL::text
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
  -- Only the two statuses this RPC is allowed to mint.
  IF p_payment_status NOT IN ('paid', 'external') THEN
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

  -- 'external' signups are reserved for sellers OUTSIDE the integrated flow — an integrated
  -- seller's paid tiers must go through Stripe. The zero-value guard still protects the 'paid'
  -- path; a paid signup carries a Stripe PaymentIntent.
  IF p_payment_status = 'external' THEN
    IF EXISTS (
      SELECT 1 FROM public.sellers s
      WHERE s.id = p_seller_id AND s.uses_integrated_payments
    ) THEN
      RETURN json_build_object('success', false, 'error', 'seller_integrated',
        'message', 'Dette studioet bruker integrert betaling');
    END IF;
  ELSIF p_stripe_payment_intent_id IS NULL
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
    amount_paid, created_at, updated_at
  ) VALUES (
    p_seller_id, p_course_id, p_buyer_id,
    p_participant_name, p_participant_email, p_participant_phone, NULLIF(BTRIM(p_note), ''),
    'confirmed', p_payment_status::public.payment_status,
    p_ticket_type_id, v_tier.label, v_tier.audience, v_tier.ticket_kind,
    p_course_session_id, v_package_end_date,
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

-- ── 5b. Deletion/retention guards that referenced dintero_transaction_id ─────
-- The 3 materiality guards already protect Stripe records via `amount_paid > 0`;
-- the dintero clause is redundant once the column is gone — drop it. The profile
-- delete-guard's GDPR PII redaction matched payment_attempts to the buyer's
-- signups via dintero_transaction_id — port that id-match to stripe_payment_intent_id
-- (the email match already covers the common case).

CREATE OR REPLACE FUNCTION public.enforce_seller_delete_retention()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
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
      OR s.payment_status::text IN ('refunded', 'external')
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

CREATE OR REPLACE FUNCTION public.enforce_course_delete_retention()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
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
      OR s.payment_status::text IN ('refunded', 'external')
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

CREATE OR REPLACE FUNCTION public.delete_course_cascade(p_course_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER
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
      -- 'external' = participant paid the seller outside the platform; the
      -- signup row is the seller's only record of that payment.
      OR s.payment_status::text IN ('refunded', 'external')
    );

  -- Every payment_attempt that is not in a terminal throwaway state is material.
  -- A live checkout can exist as pending with no ids; truly abandoned pending
  -- rows are reaped by the purge-stale-payment-attempts cron, after which the
  -- course becomes deletable again.
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
  -- on courses re-checks at the course delete and is the universal backstop.
  DELETE FROM public.signups         WHERE course_id = p_course_id;
  DELETE FROM public.course_sessions WHERE course_id = p_course_id;
  DELETE FROM public.courses         WHERE id        = p_course_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_profile_delete_guard()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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
  --    no buyer FK; match on the account email and on PaymentIntents belonging
  --    to the user's claimed signups (still linked at BEFORE DELETE). Name is
  --    kept for the retained accounting record, same as on signups below.
  UPDATE public.payment_attempts pa
  SET participant_email = 'slettet@slettet.invalid',
      participant_phone = NULL,
      note = NULL
  WHERE (
      lower(pa.participant_email) = lower(OLD.email)
      OR pa.stripe_payment_intent_id IN (
        SELECT s.stripe_payment_intent_id FROM public.signups s
        WHERE s.buyer_id = OLD.id AND s.stripe_payment_intent_id IS NOT NULL
      )
    )
    AND pa.participant_email IS DISTINCT FROM 'slettet@slettet.invalid';

  -- 4. Redact this buyer's contact PII from their own signups. Keep
  --    participant_name for the retained accounting/receipt record; drop email
  --    (NOT NULL -> tombstone), phone, and the free-text note (can hold
  --    sensitive details — allergies, health info).
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
$function$;

-- ── 6. Drop the Dintero columns (their indexes + the onboarding-status CHECK
--      drop with them) ───────────────────────────────────────────────────────
ALTER TABLE public.signups
  DROP COLUMN IF EXISTS dintero_transaction_id,
  DROP COLUMN IF EXISTS dintero_session_id,
  DROP COLUMN IF EXISTS dintero_merchant_reference;

ALTER TABLE public.payment_attempts
  DROP COLUMN IF EXISTS dintero_session_id,
  DROP COLUMN IF EXISTS dintero_transaction_id;

ALTER TABLE public.sellers
  DROP COLUMN IF EXISTS dintero_seller_id,
  DROP COLUMN IF EXISTS dintero_approval_id,
  DROP COLUMN IF EXISTS dintero_contract_url,
  DROP COLUMN IF EXISTS dintero_onboarding_status,
  DROP COLUMN IF EXISTS dintero_onboarding_complete;

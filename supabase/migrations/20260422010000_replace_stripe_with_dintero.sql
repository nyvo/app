-- ============================================
-- MIGRATION: Replace Stripe with Dintero
--
-- Hard cutover. Drops every Stripe-specific column and RPC,
-- adds Dintero equivalents, and introduces a `payment_attempts` table
-- to hold the context that used to live in Stripe's `metadata` field
-- (Dintero has no native metadata round-trip — we use `order.merchant_reference`
-- to point back at a row in `payment_attempts`).
-- ============================================


-- ============================================
-- 1. organizations: drop Stripe, add Dintero seller approval state
-- ============================================
ALTER TABLE public.organizations
  DROP COLUMN IF EXISTS stripe_account_id,
  DROP COLUMN IF EXISTS stripe_onboarding_complete;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS dintero_seller_id TEXT,
  ADD COLUMN IF NOT EXISTS dintero_approval_id TEXT,
  ADD COLUMN IF NOT EXISTS dintero_contract_url TEXT,
  ADD COLUMN IF NOT EXISTS dintero_onboarding_status TEXT
    CHECK (dintero_onboarding_status IN ('PENDING', 'WAITING_FOR_SIGNATURE', 'ACTIVE', 'DECLINED', 'TERMINATED')),
  ADD COLUMN IF NOT EXISTS dintero_onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.organizations.dintero_seller_id IS
  'Platform-assigned seller identifier echoed back in payout_destination_id on checkout sessions.';
COMMENT ON COLUMN public.organizations.dintero_approval_id IS
  'Dintero approval ID from POST /v1/accounts/{aid}/management/settings/approvals/payout-destinations.';
COMMENT ON COLUMN public.organizations.dintero_contract_url IS
  'Hosted KYC URL returned in links[rel=contract_url] — sent to the teacher to complete onboarding.';


-- ============================================
-- 2. signups: drop Stripe, add Dintero transaction reference
-- ============================================
DROP INDEX IF EXISTS public.idx_signups_stripe_checkout_session_id;

ALTER TABLE public.signups
  DROP COLUMN IF EXISTS stripe_payment_intent_id,
  DROP COLUMN IF EXISTS stripe_checkout_session_id,
  DROP COLUMN IF EXISTS stripe_receipt_url;

ALTER TABLE public.signups
  ADD COLUMN IF NOT EXISTS dintero_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS dintero_session_id TEXT,
  ADD COLUMN IF NOT EXISTS dintero_merchant_reference TEXT;

CREATE INDEX IF NOT EXISTS idx_signups_dintero_transaction_id
  ON public.signups(dintero_transaction_id)
  WHERE dintero_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_signups_dintero_merchant_reference
  ON public.signups(dintero_merchant_reference)
  WHERE dintero_merchant_reference IS NOT NULL;


-- ============================================
-- 3. payment_attempts: Dintero metadata substitute
--
-- Dintero sessions have no native metadata field that round-trips on webhooks.
-- Instead we put a UUID into order.merchant_reference and look up the
-- full payment context from this table.
-- ============================================
CREATE TABLE IF NOT EXISTS public.payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  participant_name TEXT NOT NULL,
  participant_email TEXT NOT NULL,
  participant_phone TEXT,
  is_drop_in BOOLEAN NOT NULL DEFAULT FALSE,
  course_session_id UUID REFERENCES public.course_sessions(id) ON DELETE SET NULL,
  class_date DATE,
  class_time TIME,
  signup_package_id UUID REFERENCES public.course_signup_packages(id) ON DELETE SET NULL,
  package_weeks INTEGER,
  base_price_nok NUMERIC(10,2) NOT NULL,
  service_fee_nok NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_price_nok NUMERIC(10,2) NOT NULL,
  existing_signup_id UUID REFERENCES public.signups(id) ON DELETE SET NULL,
  dintero_session_id TEXT,
  dintero_transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'authorized', 'captured', 'failed', 'voided', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_dintero_transaction
  ON public.payment_attempts(dintero_transaction_id)
  WHERE dintero_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_attempts_existing_signup
  ON public.payment_attempts(existing_signup_id)
  WHERE existing_signup_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_attempts_organization
  ON public.payment_attempts(organization_id);

ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;

-- Only edge functions (service role) write. Org members may read their own for observability.
CREATE POLICY "Payment attempts SELECT by org member"
  ON public.payment_attempts FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id, (SELECT auth.uid())));

CREATE TRIGGER payment_attempts_updated_at
  BEFORE UPDATE ON public.payment_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.payment_attempts IS
  'Holds the pre-payment context that used to live in Stripe metadata. Keyed by a UUID we pass to Dintero as order.merchant_reference; looked up by the webhook handler.';


-- ============================================
-- 4. Replace create_signup_if_available RPC
--    Old signature used p_stripe_checkout_session_id + p_stripe_payment_intent_id + p_stripe_receipt_url.
--    New signature uses p_dintero_transaction_id + p_dintero_session_id + p_dintero_merchant_reference.
-- ============================================
DROP FUNCTION IF EXISTS public.create_signup_if_available(
  uuid, uuid, text, text, text, text, text, text, numeric, boolean, date, time, uuid, integer
);

CREATE OR REPLACE FUNCTION public.create_signup_if_available(
  p_course_id UUID,
  p_organization_id UUID,
  p_participant_name TEXT,
  p_participant_email TEXT,
  p_participant_phone TEXT,
  p_dintero_transaction_id TEXT,
  p_dintero_session_id TEXT,
  p_dintero_merchant_reference TEXT,
  p_amount_paid NUMERIC,
  p_is_drop_in BOOLEAN DEFAULT FALSE,
  p_class_date DATE DEFAULT NULL,
  p_class_time TIME DEFAULT NULL,
  p_signup_package_id UUID DEFAULT NULL,
  p_package_weeks INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_max_participants INT;
  v_current_count INT;
  v_signup_id UUID;
  v_course_start_date DATE;
  v_package_end_date DATE;
BEGIN
  SELECT max_participants, start_date
  INTO v_max_participants, v_course_start_date
  FROM public.courses
  WHERE id = p_course_id
  FOR UPDATE;

  IF v_max_participants IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'course_not_found',
      'message', 'Kurset ble ikke funnet'
    );
  END IF;

  IF p_package_weeks IS NOT NULL AND v_course_start_date IS NOT NULL THEN
    v_package_end_date := public.calculate_package_end_date(v_course_start_date, p_package_weeks);
  END IF;

  v_current_count := public.count_active_confirmed_signups(p_course_id);

  IF v_current_count >= v_max_participants THEN
    RETURN json_build_object(
      'success', false,
      'error', 'course_full',
      'message', 'Kurset er fullt',
      'current_count', v_current_count,
      'max_participants', v_max_participants
    );
  END IF;

  INSERT INTO public.signups (
    organization_id, course_id, participant_name, participant_email,
    participant_phone, status, payment_status, is_drop_in,
    class_date, class_time,
    dintero_transaction_id, dintero_session_id, dintero_merchant_reference,
    amount_paid,
    signup_package_id, package_weeks, package_end_date,
    created_at, updated_at
  ) VALUES (
    p_organization_id, p_course_id, p_participant_name, p_participant_email,
    p_participant_phone, 'confirmed', 'paid', p_is_drop_in,
    p_class_date, p_class_time,
    p_dintero_transaction_id, p_dintero_session_id, p_dintero_merchant_reference,
    p_amount_paid,
    p_signup_package_id, p_package_weeks, v_package_end_date,
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
    RETURN json_build_object(
      'success', false,
      'error', 'already_signed_up',
      'message', 'Du er allerede påmeldt dette kurset'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'database_error',
      'message', SQLERRM
    );
END;
$$;


-- ============================================
-- 5. Replace get_signup_by_stripe_id with get_signup_by_dintero_id
-- ============================================
DROP FUNCTION IF EXISTS public.get_signup_by_stripe_id(text, text);

CREATE OR REPLACE FUNCTION public.get_signup_by_dintero_id(
  p_transaction_id TEXT DEFAULT NULL,
  p_merchant_reference TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  result json;
BEGIN
  IF p_transaction_id IS NULL AND p_merchant_reference IS NULL THEN
    RAISE EXCEPTION 'Must supply either p_transaction_id or p_merchant_reference';
  END IF;

  SELECT json_build_object(
    'id', s.id,
    'participant_name', s.participant_name,
    'participant_email', s.participant_email,
    'amount_paid', s.amount_paid,
    'course', json_build_object(
      'id', c.id,
      'title', c.title,
      'start_date', c.start_date,
      'time_schedule', c.time_schedule,
      'location', c.location,
      'organization', json_build_object('slug', o.slug, 'name', o.name)
    )
  )
  INTO result
  FROM public.signups s
  JOIN public.courses c ON c.id = s.course_id
  JOIN public.organizations o ON o.id = s.organization_id
  WHERE (p_transaction_id IS NOT NULL AND s.dintero_transaction_id = p_transaction_id)
     OR (p_merchant_reference IS NOT NULL AND s.dintero_merchant_reference = p_merchant_reference)
  LIMIT 1;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_signup_by_dintero_id(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_signup_by_dintero_id(text, text) TO anon, authenticated;


-- ============================================
-- 6. Update cleanup_old_webhook_events (provider-agnostic, just ensure it still runs)
--    The table is unchanged; no functional update needed beyond lock search_path.
-- ============================================
-- Existing function remains valid. Nothing to change here.

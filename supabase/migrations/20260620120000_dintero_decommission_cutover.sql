-- Phase 6 — Dintero decommission, DB cutover.
--
-- Stripe Connect is the sole payment provider (Phase 4 cutover shipped). This
-- migration removes Dintero from the two DB objects that still gated on it:
--   1. the course-publish trigger (was enforce_course_publish_requires_dintero)
--   2. the sellers.uses_integrated_payments generated column (dropped the
--      `dintero_onboarding_complete OR` term)
-- and unschedules the Dintero seller-status sync cron.
--
-- KEPT (receipt back-compat / still-read columns — do NOT drop here):
--   signups.dintero_transaction_id / dintero_session_id / dintero_merchant_reference,
--   sellers.dintero_* columns (still read by AuthContext/sellers RPCs),
--   get_signup_by_dintero_id RPC. Those come out in a later cleanup once their
--   reads are gone.

-- ── 1. Publish gate: Dintero → Stripe ───────────────────────────────────────
-- Same gating logic as enforce_course_publish_requires_dintero, but checks
-- stripe_onboarding_complete and raises 'stripe_onboarding_required' (matched by
-- the frontend error-messages map). Free-tier (non-pro) sellers publish freely.
CREATE OR REPLACE FUNCTION public.enforce_course_publish_requires_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_plan text;
  v_onboarding_complete boolean;
BEGIN
  IF NEW.status NOT IN ('upcoming', 'active') THEN
    RETURN NEW;
  END IF;

  -- Already in a published lifecycle state → lifecycle move, not a publish action.
  IF TG_OP = 'UPDATE' AND OLD.status IN ('upcoming', 'active', 'completed') THEN
    RETURN NEW;
  END IF;

  SELECT s.subscription_plan, s.stripe_onboarding_complete
    INTO v_plan, v_onboarding_complete
    FROM public.sellers s
   WHERE s.id = NEW.seller_id;

  -- Free tier: manual payments, no integrated-payment requirement (INV-4).
  IF COALESCE(v_plan, 'free') <> 'pro' THEN
    RETURN NEW;
  END IF;

  IF NOT COALESCE(v_onboarding_complete, false) THEN
    RAISE EXCEPTION 'stripe_onboarding_required'
      USING ERRCODE = 'P0001',
            HINT = 'Seller must complete Stripe onboarding before publishing a course.';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS enforce_course_publish_requires_dintero ON public.courses;
CREATE TRIGGER enforce_course_publish_requires_payment
  BEFORE INSERT OR UPDATE OF status ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.enforce_course_publish_requires_payment();

DROP FUNCTION IF EXISTS public.enforce_course_publish_requires_dintero();

-- ── 2. uses_integrated_payments: drop the Dintero term ───────────────────────
-- A generated column's expression can't be altered in place (PG15) — drop + re-add.
-- DROP COLUMN destroys the column-level SELECT grants, so they MUST be re-issued
-- (anon/authenticated read this for the public "pay here" gate; this is the
-- exact grant that broke public checkout in Phase 1 if missed).
ALTER TABLE public.sellers DROP COLUMN uses_integrated_payments;
ALTER TABLE public.sellers
  ADD COLUMN uses_integrated_payments boolean
  GENERATED ALWAYS AS (
    (subscription_plan = 'pro')
    AND (subscription_status = ANY (ARRAY['active'::text, 'past_due'::text]))
    AND stripe_onboarding_complete
  ) STORED;
GRANT SELECT(uses_integrated_payments) ON public.sellers TO anon, authenticated;

-- ── 3. Unschedule the Dintero seller-status sync cron (function deleted) ──────
DO $$
DECLARE v_jobid bigint;
BEGIN
  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'sync-dintero-seller-statuses';
  IF v_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(v_jobid);
  END IF;
END $$;

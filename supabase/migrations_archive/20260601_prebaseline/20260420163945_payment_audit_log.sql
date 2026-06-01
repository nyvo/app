-- ============================================
-- MIGRATION: payment_status audit log
--
-- Manual "mark as paid" from the teacher UI (and any other path that
-- mutates signups.payment_status) now leaves a forensic trail. The
-- trigger fires on every INSERT or UPDATE that changes payment_status,
-- regardless of caller — client, edge function, Stripe webhook, or
-- direct SQL via service role — and captures:
--   - which signup + org was affected
--   - which authenticated user did it (null for service-role writes)
--   - the old → new transition
--   - whether a Stripe payment_intent was attached at the time
--     (distinguishes Stripe-driven writes from manual "received outside Stripe")
--   - when it happened
--
-- Read access is limited to org members; the table is append-only from
-- the application's perspective (no INSERT/UPDATE/DELETE policies — only
-- the trigger, running SECURITY DEFINER, writes rows).
-- ============================================


-- ============================================
-- 1. Table
-- ============================================
CREATE TABLE public.payment_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signup_id uuid NOT NULL REFERENCES public.signups(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  old_status public.payment_status,
  new_status public.payment_status NOT NULL,
  via_stripe boolean NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

-- Per-signup history lookup
CREATE INDEX payment_audit_log_signup_id_changed_at_idx
  ON public.payment_audit_log (signup_id, changed_at DESC);

-- Per-org recent activity
CREATE INDEX payment_audit_log_org_changed_at_idx
  ON public.payment_audit_log (organization_id, changed_at DESC);


-- ============================================
-- 2. Trigger function
-- ============================================
CREATE OR REPLACE FUNCTION public.log_payment_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- Only fire when payment_status is actually present/changing.
  IF TG_OP = 'INSERT' THEN
    IF NEW.payment_status IS NULL THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.payment_status IS NOT DISTINCT FROM OLD.payment_status THEN
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.payment_audit_log (
    signup_id,
    organization_id,
    changed_by,
    old_status,
    new_status,
    via_stripe,
    changed_at
  ) VALUES (
    NEW.id,
    NEW.organization_id,
    auth.uid(),
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.payment_status ELSE NULL END,
    NEW.payment_status,
    NEW.stripe_payment_intent_id IS NOT NULL,
    now()
  );

  RETURN NEW;
END;
$$;


-- ============================================
-- 3. Trigger
-- ============================================
CREATE TRIGGER signups_payment_status_audit
  AFTER INSERT OR UPDATE OF payment_status ON public.signups
  FOR EACH ROW
  EXECUTE FUNCTION public.log_payment_status_change();


-- ============================================
-- 4. RLS: org members can read their own org's audit rows
-- ============================================
ALTER TABLE public.payment_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit log SELECT by org member"
  ON public.payment_audit_log FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id, (SELECT auth.uid())));

-- No INSERT/UPDATE/DELETE policies: only the SECURITY DEFINER trigger can write.
REVOKE INSERT, UPDATE, DELETE ON public.payment_audit_log FROM anon, authenticated;

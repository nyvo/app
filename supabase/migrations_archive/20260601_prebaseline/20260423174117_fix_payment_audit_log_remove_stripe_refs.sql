-- Remove last Stripe reference from the payment_audit_log trigger.
-- The original trigger (`log_payment_status_change`) read `NEW.stripe_payment_intent_id`
-- when writing audit rows, which broke after 20260422 dropped the column.
-- Rename the audit column to a provider-neutral name and rewrite the trigger
-- to check `NEW.dintero_transaction_id IS NOT NULL` instead.

ALTER TABLE public.payment_audit_log
  RENAME COLUMN via_stripe TO via_external;

CREATE OR REPLACE FUNCTION public.log_payment_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
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
    via_external,
    changed_at
  ) VALUES (
    NEW.id,
    NEW.organization_id,
    auth.uid(),
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.payment_status ELSE NULL END,
    NEW.payment_status,
    NEW.dintero_transaction_id IS NOT NULL,
    now()
  );

  RETURN NEW;
END;
$function$;

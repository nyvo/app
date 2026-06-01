-- M1-final: clean up dead audit column + unused signup index.
--
-- payment_audit_log.changed_by has always been NULL (verified 0/163 rows).
-- The trigger wrote auth.uid(), which is NULL under service-role webhook
-- mutations — the only path that touches signups.payment_status in prod.
--
-- Replace the trigger body to stop writing changed_by, drop the FK
-- (auth.users) and the column, then drop the unused
-- idx_signups_package_end_date (1 lifetime scan vs ~30k on real indexes).
-- The signups.package_end_date COLUMN stays — it's actively used by
-- count_signups_for_session() and create_signup_if_available().

-- 1. Replace trigger body. Preserves every condition and value the live
--    function uses today; only the `changed_by` column + auth.uid() value
--    are removed from the INSERT.
CREATE OR REPLACE FUNCTION public.log_payment_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
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
    NEW.dintero_transaction_id IS NOT NULL,
    now()
  );
  RETURN NEW;
END;
$function$;

-- 2. Drop the FK to auth.users (must precede column drop), then the column.
ALTER TABLE public.payment_audit_log
  DROP CONSTRAINT IF EXISTS payment_audit_log_changed_by_fkey;

ALTER TABLE public.payment_audit_log
  DROP COLUMN IF EXISTS changed_by;

-- 3. Drop the unused index. The package_end_date COLUMN stays — only the
--    btree index on it is being removed.
DROP INDEX IF EXISTS public.idx_signups_package_end_date;

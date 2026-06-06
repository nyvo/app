-- F4.2 + F4.3 — tighten PII handling in the account-deletion pipeline.
--
-- F4.2: on deletion the buyer's signups kept participant_email/phone (only
-- buyer_id was nulled and notifications redacted). Redact contact PII from the
-- deleting buyer's own signups, keeping participant_name for the retained
-- accounting/receipt record (bokføringsloven). participant_email is NOT NULL, so
-- it's set to a reserved-.invalid tombstone rather than NULL; phone is nullable.
--
-- F4.3: studio anonymization now also clears logo_url (a logo is often a personal
-- photo). The Storage object itself is removed by the delete-account edge function
-- via the service-role client (storage.objects has RLS and is owned by
-- supabase_storage_admin, so an in-DB delete from a postgres-owned function is not
-- reliable). dintero_seller_id is intentionally retained for settlement records.

CREATE OR REPLACE FUNCTION public.close_and_anonymize_seller(p_seller_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  UPDATE public.sellers
     SET name = 'Slettet studio',
         email = NULL,
         phone = NULL,
         logo_url = NULL,
         closed_at = now()
   WHERE id = p_seller_id AND closed_at IS NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_profile_delete_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
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
  --    Match only known signup-linked types, and only rows tied to a signup the
  --    deleting user actually bought (buyer_id still = OLD.id at BEFORE DELETE).
  UPDATE public.notifications n
  SET body = regexp_replace(n.body, '^.*? · ', 'Slettet bruker · ')
  WHERE n.type IN ('booking.created', 'booking.waitlist_promoted', 'payment.failed', 'refund.completed')
    AND n.body ~ ' · '
    AND EXISTS (
      SELECT 1 FROM public.signups s
      WHERE s.buyer_id = OLD.id
        AND n.metadata->>'signup_id' = s.id::text
    );

  -- 3. Redact this buyer's contact PII from their own signups. Keep
  --    participant_name for the retained accounting/receipt record; drop email
  --    (NOT NULL -> tombstone) and phone. buyer_id is still OLD.id here; the FK
  --    SET NULL fires as part of the delete that follows.
  UPDATE public.signups s
  SET participant_email = 'slettet@slettet.invalid',
      participant_phone = NULL
  WHERE s.buyer_id = OLD.id
    AND (s.participant_email IS DISTINCT FROM 'slettet@slettet.invalid'
         OR s.participant_phone IS NOT NULL);

  RETURN OLD;
END;
$function$;

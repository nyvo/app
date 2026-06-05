-- Consolidate all deletion-time work into the EXISTING profile-delete guard, so
-- it runs atomically with the profile delete (the auth.admin.deleteUser cascade)
-- and rolls back together if anything fails. No second trigger (avoids
-- trigger-order surprises). Two changes folded in, after the blocker check:
--   1. Close + anonymize the dormant studios this profile solely owns. (Moved
--      out of the Edge function, where a failure after the close could leave a
--      studio half-tombstoned while the account survived.)
--   2. Redact the buyer's name from their own booking-linked notifications.
--      These are ephemeral alerts, not records — redact the body, keep the row,
--      so action-required tasks (e.g. payment.failed) survive.
-- participant_* on signups/payment_attempts is deliberately NOT touched here: it
-- may belong to a third party (attendee != account holder) and is part of the
-- seller's booking/accounting documentation. Erasing it belongs to a separate,
-- verified privacy-erasure workflow. See docs/account-deletion-design.md.
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
  --    Replace the leading "Navn · " with "Slettet bruker · "; the row (and any
  --    action_required flag) is preserved.
  UPDATE public.notifications n
  SET body = regexp_replace(n.body, '^.*? · ', 'Slettet bruker · ')
  WHERE n.type IN ('booking.created', 'booking.waitlist_promoted', 'payment.failed', 'refund.completed')
    AND n.body ~ ' · '
    AND EXISTS (
      SELECT 1 FROM public.signups s
      WHERE s.buyer_id = OLD.id
        AND n.metadata->>'signup_id' = s.id::text
    );

  RETURN OLD;
END;
$function$;

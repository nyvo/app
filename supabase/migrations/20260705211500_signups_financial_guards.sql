-- Integrity guards on signups' financial columns (audit P1-14).
--
-- The signups money columns had zero CHECK constraints and authenticated
-- (seller members, via the signups_insert_member RLS policy) held INSERT on
-- every column — including server-controlled ones. A member's manual "add
-- participant" could therefore mint negative amounts (corrupts the income
-- series), refund_amount > amount_paid, a pre-stamped confirmation_sent_at
-- (suppresses the buyer's email), or an arbitrary stripe_payment_intent_id
-- (poisons the PI unique index). Verified no existing rows violate the CHECKs
-- and the sole client insert path (createSignup / AddParticipantDrawer) writes
-- none of the revoked columns, so both changes are non-breaking.

-- Value bounds. amount_paid/refund_amount are nullable (manual adds leave
-- amount_paid NULL); the CHECKs only bite when a value is present.
ALTER TABLE public.signups
  ADD CONSTRAINT signups_amount_paid_non_negative
    CHECK (amount_paid IS NULL OR amount_paid >= 0),
  ADD CONSTRAINT signups_refund_amount_valid
    CHECK (refund_amount IS NULL OR (refund_amount >= 0 AND refund_amount <= amount_paid)),
  ADD CONSTRAINT signups_platform_fee_non_negative
    CHECK (platform_fee_nok >= 0);

-- Server-controlled columns: only the Stripe webhook / sweep / cancel / refund
-- edge functions (service_role) may write these. Revoke them from the client
-- INSERT grant; all other columns stay insertable so the manual-add path is
-- unaffected. buyer_id is already forced NULL by the RLS WITH CHECK.
REVOKE INSERT (
  refund_amount,
  refunded_at,
  stripe_payment_intent_id,
  confirmation_sent_at,
  seller_notified_at,
  platform_fee_nok,
  cancelled_at
) ON public.signups FROM authenticated;

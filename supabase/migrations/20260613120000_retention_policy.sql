-- Retention policy (decided 2026-06-13; see .context/db-audit/FEASIBILITY-PASS.md §8)
--
--  1. Financial/payment/accounting records: keep 5 years from transaction
--     year-end (bokføringsloven). Already *enforced* by the deletion-retention
--     guards (enforce_course_delete_retention / enforce_seller_delete_retention
--     / delete_course_cascade); codified here as table comments. No purge cron
--     — nothing in the system approaches 5 years, and purging early would
--     violate the retention duty. Revisit in 2031.
--  2. Closed-seller buyer contact PII: redacted 12 months after
--     sellers.closed_at by a monthly cron. Contact fields only
--     (email tombstone, phone, free-text note); participant_name is kept for
--     the retained accounting record — the same deliberate decision as in
--     enforce_profile_delete_guard. Amounts, dates and statuses are untouched,
--     so the 5-year financial record stays intact.
--  3. waitlist: no TTL. 0 rows, no grants/policies, no write path; kept inert
--     as a post-launch cleanup candidate (documented in its comment).

-- ── 1. Five-year financial retention, documented at the source ──────────────
COMMENT ON TABLE public.signups IS
  'Bookings incl. their payment footprint. Financial records (paid/refunded/external rows): retain 5 years from transaction year-end (bokføringsloven) — enforced by the deletion-retention guards. Buyer contact PII is redacted earlier: on account deletion (enforce_profile_delete_guard) and 12 months after the seller closes (redact_closed_seller_buyer_pii); participant_name stays as part of the accounting record.';

COMMENT ON TABLE public.payment_attempts IS
  'Checkout attempts (one per Dintero session). Financial records: retain 5 years from transaction year-end (bokføringsloven). Stale pending rows are reaped by the purge-stale-payment-attempts cron; contact PII is redacted on account deletion and 12 months after seller closure (redact_closed_seller_buyer_pii).';

COMMENT ON TABLE public.payment_audit_log IS
  'Append-only payment-status history; survives parent deletion (FKs SET NULL). Retain 5 years from transaction year-end (bokføringsloven). Contains no buyer contact PII.';

-- ── 2. Closed-seller buyer-contact-PII redaction ─────────────────────────────
-- Sellers are tombstoned on closure (close_and_anonymize_seller); the buyer
-- contact details under them existed so the seller could reach participants.
-- 12 months after closure (refund/dispute tail well past), that purpose is
-- gone — GDPR storage limitation says drop it. Claimed signups keep buyer_id,
-- so an active buyer's dashboard history still works; their live contact info
-- lives on their profile, not in these snapshot columns.
CREATE OR REPLACE FUNCTION public.redact_closed_seller_buyer_pii()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_signups  int;
  v_attempts int;
BEGIN
  UPDATE public.signups s
  SET participant_email = 'slettet@slettet.invalid',
      participant_phone = NULL,
      note = NULL
  WHERE s.seller_id IN (
      SELECT id FROM public.sellers
      WHERE closed_at IS NOT NULL AND closed_at < now() - interval '12 months'
    )
    AND (s.participant_email IS DISTINCT FROM 'slettet@slettet.invalid'
         OR s.participant_phone IS NOT NULL
         OR s.note IS NOT NULL);
  GET DIAGNOSTICS v_signups = ROW_COUNT;

  UPDATE public.payment_attempts pa
  SET participant_email = 'slettet@slettet.invalid',
      participant_phone = NULL,
      note = NULL
  WHERE pa.seller_id IN (
      SELECT id FROM public.sellers
      WHERE closed_at IS NOT NULL AND closed_at < now() - interval '12 months'
    )
    AND (pa.participant_email IS DISTINCT FROM 'slettet@slettet.invalid'
         OR pa.participant_phone IS NOT NULL
         OR pa.note IS NOT NULL);
  GET DIAGNOSTICS v_attempts = ROW_COUNT;

  IF v_signups > 0 OR v_attempts > 0 THEN
    RAISE LOG 'redact_closed_seller_buyer_pii: redacted % signup(s), % payment attempt(s)',
      v_signups, v_attempts;
  END IF;
END;
$$;

-- SECURITY DEFINER + default PUBLIC EXECUTE would let any client trigger mass
-- redaction scans. Lock it to the service role (the cron runs as the job
-- owner and is unaffected).
REVOKE EXECUTE ON FUNCTION public.redact_closed_seller_buyer_pii() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.redact_closed_seller_buyer_pii() TO service_role;

-- Idempotent (re)schedule, same pattern as cleanup-rate-limit-buckets-daily.
-- Monthly is plenty: the trigger condition moves once a day at most, and the
-- redaction window is "at least 12 months", not "exactly".
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'redact-closed-seller-pii-monthly';

SELECT cron.schedule(
  'redact-closed-seller-pii-monthly',
  '0 4 1 * *',
  $$ SELECT public.redact_closed_seller_buyer_pii(); $$
);

-- ── 3. waitlist: documented as inert ─────────────────────────────────────────
COMMENT ON TABLE public.waitlist IS
  'Pre-launch email-collection table. Empty, no grants/policies, no write path anywhere (verified 2026-06-13) — kept inert; post-launch cleanup candidate. No retention TTL needed while empty.';

-- Integrity guards for signups.service_fee_nok, mirroring the ones
-- 20260705211500_signups_financial_guards.sql (audit P1-14) added for its
-- sibling platform_fee_nok. Added in 20260714140000 without them.
--
-- 1. CHECK (service_fee_nok >= 0): a negative service fee would make
--    seller_income_series' net (amount − service_fee − platform_fee − refund)
--    EXCEED the buyer's gross — a nonsensical, self-inflating figure. This is
--    the real data-layer guard: it holds regardless of who writes the row.
--
-- 2. REVOKE INSERT (service_fee_nok) FROM authenticated — restated for parity
--    with platform_fee_nok. NOTE: authenticated currently also holds a
--    table-level INSERT grant on signups, which dominates column-level
--    REVOKEs, so today this REVOKE is defense-in-depth, not the active gate
--    (the CHECK above is). It keeps the two fee columns symmetric so that if
--    the table-level grant is ever narrowed to column-level, service_fee_nok
--    is already covered. The server mint path (create_signup_if_available,
--    service_role) is unaffected — it bypasses these grants.

ALTER TABLE public.signups
  ADD CONSTRAINT signups_service_fee_non_negative
    CHECK (service_fee_nok >= 0);

REVOKE INSERT (service_fee_nok) ON public.signups FROM authenticated;

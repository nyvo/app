-- Honor-system student/pensjonist discount (2026-07-15).
--
-- Sellers opt in with a percentage on the Studio page; buyers claim it with a
-- quiet toggle in checkout. Deliberately trust-based — no verification — so
-- the whole feature is one seller column:
--   * NULL  = discount off (default)
--   * 5..90 = percent off the ticket price, applied server-side in
--             create-stripe-connect-session (the client toggle only asks).
--
-- Grants follow the sellers column-level pattern: anon reads it to render the
-- checkout toggle; authenticated (RLS: seller members) may update it. The
-- sellers_block_protected_columns trigger is a blocklist, so no change there.

ALTER TABLE public.sellers
  ADD COLUMN student_senior_discount_percent integer
  CHECK (student_senior_discount_percent BETWEEN 5 AND 90);

COMMENT ON COLUMN public.sellers.student_senior_discount_percent IS
  'Honor-system student/pensjonist discount in percent (5–90); NULL = not offered. Applied to the ticket price server-side when the buyer claims it in checkout.';

GRANT SELECT (student_senior_discount_percent) ON public.sellers TO anon, authenticated;
GRANT UPDATE (student_senior_discount_percent) ON public.sellers TO authenticated;

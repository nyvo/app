-- Split the honor-system discount into two independent percentages
-- (2026-07-15, follow-up to 20260715120000 the same day — the single column
-- never carried data).
--
-- Studentrabatt and honnørrabatt are distinct, standard Norwegian discount
-- categories and providers routinely price them differently (e.g. Nordstrand
-- Yoga: students ~30–40 % off, pensioners ~11 %). One column can't express
-- that, so:
--   * student_discount_percent — NULL = not offered, 5..90 = percent off
--   * senior_discount_percent  — NULL = not offered, 5..90 = percent off
-- Both remain trust-based: the buyer picks one in checkout, no verification.

ALTER TABLE public.sellers
  DROP COLUMN student_senior_discount_percent;

ALTER TABLE public.sellers
  ADD COLUMN student_discount_percent integer
    CHECK (student_discount_percent BETWEEN 5 AND 90),
  ADD COLUMN senior_discount_percent integer
    CHECK (senior_discount_percent BETWEEN 5 AND 90);

COMMENT ON COLUMN public.sellers.student_discount_percent IS
  'Honor-system student discount in percent (5–90); NULL = not offered. Applied to the ticket price server-side when claimed in checkout.';
COMMENT ON COLUMN public.sellers.senior_discount_percent IS
  'Honor-system honnør/pensjonist discount in percent (5–90); NULL = not offered. Applied to the ticket price server-side when claimed in checkout.';

GRANT SELECT (student_discount_percent, senior_discount_percent)
  ON public.sellers TO anon, authenticated;
GRANT UPDATE (student_discount_percent, senior_discount_percent)
  ON public.sellers TO authenticated;

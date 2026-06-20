-- Review fixes after the Dintero decommission.

-- ── CRITICAL: storefront 403 ────────────────────────────────────────────────
-- The public storefront embeds sellers.stripe_onboarding_complete (publicCourses.ts), but it was
-- never granted column-level SELECT to anon/authenticated. Dropping dintero_onboarding_complete
-- (which WAS granted) removed the last readable onboarding column, so PostgREST 403'd every public
-- course page + the checkout entry for ALL visitors. Mirror the uses_integrated_payments grant.
GRANT SELECT(stripe_onboarding_complete) ON public.sellers TO anon, authenticated;

-- ── Anon-safe payment-attempt status lookup ─────────────────────────────────
-- Lets the checkout success page distinguish a voided/failed attempt (capacity-reject AFTER the
-- buyer was redirected with redirect_status=succeeded) from a genuine success, so it never shows a
-- false "Betalingen er bekreftet". Keyed on the attempt id the buyer holds via the ?ref return
-- param; returns only the status string (no PII).
CREATE OR REPLACE FUNCTION public.get_payment_attempt_status(p_attempt_id uuid)
 RETURNS text
 LANGUAGE sql STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT status FROM public.payment_attempts WHERE id = p_attempt_id;
$function$;
REVOKE ALL ON FUNCTION public.get_payment_attempt_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_payment_attempt_status(uuid) TO anon, authenticated;

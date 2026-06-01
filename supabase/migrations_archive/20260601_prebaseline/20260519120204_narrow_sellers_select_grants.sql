-- H2 Variant A: after the app now hydrates operational seller fields through
-- get_seller_operational(), narrow direct sellers reads to public columns only.

REVOKE SELECT ON public.sellers FROM anon, authenticated;

GRANT SELECT (
  id,
  name,
  logo_url,
  email,
  dintero_onboarding_complete,
  created_at
) ON public.sellers TO anon, authenticated;

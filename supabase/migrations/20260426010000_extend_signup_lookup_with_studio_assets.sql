-- ============================================
-- Extend get_signup_by_dintero_id to return course image and studio support assets
-- ============================================
-- The checkout-success page needs to render:
--   • Course image (with org default fallback)
--   • Studio support email (so users have a contact for help)
--   • Studio logo (small brand chip above the success card)
--   • Signup created_at (for the "Bestilt {date}" line, instead of `new Date()`)
--
-- This migration is purely additive — no fields removed or renamed.
-- Safe to run on production; clients without the new TS interface fields
-- simply ignore the extra keys.

CREATE OR REPLACE FUNCTION public.get_signup_by_dintero_id(
  p_transaction_id TEXT DEFAULT NULL,
  p_merchant_reference TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  result json;
BEGIN
  IF p_transaction_id IS NULL AND p_merchant_reference IS NULL THEN
    RAISE EXCEPTION 'Must supply either p_transaction_id or p_merchant_reference';
  END IF;

  SELECT json_build_object(
    'id', s.id,
    'participant_name', s.participant_name,
    'participant_email', s.participant_email,
    'amount_paid', s.amount_paid,
    'created_at', s.created_at,
    'course', json_build_object(
      'id', c.id,
      'title', c.title,
      'start_date', c.start_date,
      'time_schedule', c.time_schedule,
      'location', c.location,
      'image_url', COALESCE(c.image_url, o.default_course_image_url),
      'organization', json_build_object(
        'slug', o.slug,
        'name', o.name,
        'email', o.email,
        'logo_url', o.logo_url
      )
    )
  )
  INTO result
  FROM public.signups s
  JOIN public.courses c ON c.id = s.course_id
  JOIN public.organizations o ON o.id = s.organization_id
  WHERE (p_transaction_id IS NOT NULL AND s.dintero_transaction_id = p_transaction_id)
     OR (p_merchant_reference IS NOT NULL AND s.dintero_merchant_reference = p_merchant_reference)
  LIMIT 1;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_signup_by_dintero_id(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_signup_by_dintero_id(text, text) TO anon, authenticated;

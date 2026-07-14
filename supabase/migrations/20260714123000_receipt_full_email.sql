-- Receipt shows the buyer's full email (product decision 2026-07-14) — the
-- masked form (n•••@gmail.com) read as a bug on the confirmation screen.
-- The receipt URL still requires the unguessable payment-intent id, which is
-- the effective access token for this data.
--
-- Copied from the LATEST prior definition (20260702153923_business_consolidation
-- § 7g) — only the email field changes: participant_email_masked/regexp_replace
-- → participant_email verbatim. (Rule: always copy CREATE OR REPLACE bodies
-- from the latest definition, see 20260714110000's header.)

CREATE OR REPLACE FUNCTION public.get_signup_by_stripe_id(p_payment_intent_id text DEFAULT NULL::text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  result json;
BEGIN
  IF p_payment_intent_id IS NULL THEN
    RAISE EXCEPTION 'Must supply p_payment_intent_id' USING ERRCODE = '22023';
  END IF;

  SELECT json_build_object(
    'id', s.id,
    'payment_status', s.payment_status,
    'status', s.status,
    'participant_email', s.participant_email,
    'amount_paid', s.amount_paid,
    'created_at', s.created_at,
    'course', json_build_object(
      'id', c.id,
      'title', c.title,
      'start_date', c.start_date,
      'time_schedule', c.time_schedule,
      'location', c.location,
      'image_url', COALESCE(c.image_url, sel.default_course_image_url),
      'seller', json_build_object(
        'name', sel.name,
        'logo_url', sel.logo_url,
        'slug', sel.slug
      )
    )
  )
  INTO result
  FROM public.signups s
  JOIN public.courses c ON c.id = s.course_id
  JOIN public.sellers sel ON sel.id = s.seller_id
  WHERE s.stripe_payment_intent_id = p_payment_intent_id
  LIMIT 1;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_signup_by_stripe_id(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_signup_by_stripe_id(text) TO anon, authenticated;

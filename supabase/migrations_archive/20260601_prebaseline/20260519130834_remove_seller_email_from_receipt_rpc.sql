-- H3: receipt lookups are anonymous magic-link style access. Keep the receipt
-- payload to what the page needs and do not return seller email addresses.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_signup_by_dintero_id(
  p_transaction_id text DEFAULT NULL,
  p_merchant_reference text DEFAULT NULL
) RETURNS json
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
      'image_url', COALESCE(c.image_url, t.default_course_image_url),
      'seller', json_build_object(
        'name', sel.name,
        'logo_url', sel.logo_url,
        'team_slug', t.slug
      )
    )
  )
  INTO result
  FROM public.signups s
  JOIN public.courses c ON c.id = s.course_id
  JOIN public.sellers sel ON sel.id = s.seller_id
  LEFT JOIN public.teams t ON t.owner_seller_id = sel.id
  WHERE (p_transaction_id IS NOT NULL AND s.dintero_transaction_id = p_transaction_id)
     OR (p_merchant_reference IS NOT NULL AND s.dintero_merchant_reference = p_merchant_reference)
  LIMIT 1;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_signup_by_dintero_id(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_signup_by_dintero_id(text, text) TO anon, authenticated;

COMMIT;

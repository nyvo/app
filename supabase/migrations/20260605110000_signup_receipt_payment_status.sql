-- The checkout success/receipt page must not show "Du er påmeldt" for a signup
-- whose capture failed. The embedded flow creates the signup as confirmed and,
-- on capture failure, flips payment_status='failed' while leaving the row in
-- place. get_signup_by_dintero_id previously returned the row with no status
-- info, so the receipt page over-confirmed it. Return payment_status + status so
-- the page can branch (paid -> confirmed, failed -> "gikk ikke gjennom", other ->
-- keep polling). Same lookup, same auth model; only the JSON shape grows.
CREATE OR REPLACE FUNCTION public.get_signup_by_dintero_id(
  p_transaction_id text DEFAULT NULL::text,
  p_merchant_reference text DEFAULT NULL::text
)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  result json;
BEGIN
  IF p_transaction_id IS NULL OR p_merchant_reference IS NULL THEN
    RAISE EXCEPTION 'Must supply both p_transaction_id and p_merchant_reference'
      USING ERRCODE = '22023';
  END IF;

  SELECT json_build_object(
    'id', s.id,
    'payment_status', s.payment_status,
    'status', s.status,
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
  WHERE s.dintero_transaction_id = p_transaction_id
    AND s.dintero_merchant_reference = p_merchant_reference
  LIMIT 1;

  RETURN result;
END;
$function$;

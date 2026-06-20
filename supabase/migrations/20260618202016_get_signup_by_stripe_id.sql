-- get_signup_by_stripe_id: anon-safe receipt lookup for the Stripe checkout success page (C3).
-- Stripe counterpart to get_signup_by_dintero_id. Keys on the unguessable PaymentIntent id
-- (pi_…) — a capability token — so a single key is sufficient (the Dintero version paired
-- transaction_id + merchant_reference; signups carries no stripe merchant reference, only
-- stripe_payment_intent_id). SECURITY DEFINER so the anon success page can poll without a broad
-- SELECT RLS policy on signups. Returns the same JSON shape as get_signup_by_dintero_id, with
-- the participant email masked.

CREATE OR REPLACE FUNCTION public.get_signup_by_stripe_id(p_payment_intent_id text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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
    'participant_email_masked',
      regexp_replace(s.participant_email, '^(.)[^@]*@', '\1•••@'),
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
  WHERE s.stripe_payment_intent_id = p_payment_intent_id
  LIMIT 1;

  RETURN result;
END;
$function$;

ALTER FUNCTION public.get_signup_by_stripe_id(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_signup_by_stripe_id(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_signup_by_stripe_id(text) TO anon, authenticated, service_role;

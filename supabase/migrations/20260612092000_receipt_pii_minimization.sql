-- Pre-launch audit fix C2 (see .context/db-audit/AUDIT-REPORT.md)
--
-- get_signup_by_dintero_id is the anon receipt lookup for the checkout success
-- page. Its credentials (transaction id + merchant reference) travel in the
-- Dintero redirect URL — browser history, referrer headers, analytics, server
-- logs — so the response must not carry PII. It returned the buyer's full name
-- and email; the page never rendered the name at all, and only used the email
-- for display ("bekreftelse sendt til …") and for the guest claim magic link.
--
-- Now: no participant_name, and the email is masked (k•••@example.com) for
-- display. The claim magic link is sent server-side by the new
-- send-booking-claim-link edge function, which looks the address up itself —
-- the full email never crosses the anon API again.

CREATE OR REPLACE FUNCTION "public"."get_signup_by_dintero_id"("p_transaction_id" "text" DEFAULT NULL::"text", "p_merchant_reference" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
  WHERE s.dintero_transaction_id = p_transaction_id
    AND s.dintero_merchant_reference = p_merchant_reference
  LIMIT 1;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_signup_by_dintero_id(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_signup_by_dintero_id(text, text)
  TO anon, authenticated, service_role;

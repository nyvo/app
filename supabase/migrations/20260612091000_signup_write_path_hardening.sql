-- Pre-launch audit fix C1 (see .context/db-audit/AUDIT-REPORT.md)
--
-- The signup write path trusted its callers too much:
--   1. create_signup_if_available never validated that p_seller_id is the
--      seller who owns p_course_id, and never checked the course's lifecycle
--      status — a mismatched seller_id would insert a signup that satisfies the
--      caller's own RLS membership while consuming capacity on (and appearing
--      in rosters of) another seller's course.
--   2. signups_insert_member only checked is_seller_member(seller_id): any
--      member could insert rows pointing at other sellers' courses, and could
--      set buyer_id to an arbitrary user, planting fake bookings in that
--      user's buyer dashboard.
--
-- Combined with 20260612090000 (RPC now service-role only), signups can now be
-- created only via: (a) validated edge functions, (b) a member's direct insert
-- for their own course with no buyer linkage (manual adds), (c) claim_my_signups
-- setting buyer_id under its own verified-email guard.

-- ── 1. RPC: validate seller/course consistency + course status ───────────────
CREATE OR REPLACE FUNCTION "public"."create_signup_if_available"("p_seller_id" "uuid", "p_course_id" "uuid", "p_ticket_type_id" "uuid", "p_participant_name" "text", "p_participant_email" "text", "p_participant_phone" "text", "p_amount_paid" numeric, "p_dintero_transaction_id" "text", "p_dintero_session_id" "text", "p_dintero_merchant_reference" "text", "p_course_session_id" "uuid" DEFAULT NULL::"uuid", "p_buyer_id" "uuid" DEFAULT NULL::"uuid", "p_note" "text" DEFAULT NULL::"text", "p_payment_product" "text" DEFAULT NULL::"text", "p_payment_status" "text" DEFAULT 'paid'::"text") RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_tier               public.course_signup_packages%ROWTYPE;
  v_course             public.courses%ROWTYPE;
  v_session            public.course_sessions%ROWTYPE;
  v_package_end_date   DATE;
  v_signup_id          UUID;
  v_existing_signup_id UUID;
  v_count              INT;
  v_failing_session    UUID;
  v_lock_key           BIGINT;
BEGIN
  -- Only the two statuses this RPC is allowed to mint.
  IF p_payment_status NOT IN ('paid', 'external') THEN
    RETURN json_build_object('success', false, 'error', 'invalid_payment_status',
      'message', 'Ugyldig betalingsstatus');
  END IF;

  IF p_dintero_transaction_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(
      hashtextextended('dintero:txn:' || p_dintero_transaction_id, 0)
    );

    SELECT id INTO v_existing_signup_id
    FROM public.signups
    WHERE dintero_transaction_id = p_dintero_transaction_id;

    IF v_existing_signup_id IS NOT NULL THEN
      RETURN json_build_object(
        'success', true,
        'signup_id', v_existing_signup_id,
        'status', 'already_processed'
      );
    END IF;
  END IF;

  SELECT * INTO v_tier
  FROM public.course_signup_packages
  WHERE id = p_ticket_type_id AND course_id = p_course_id
  FOR SHARE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'ticket_not_found',
      'message', 'Billettypen finnes ikke');
  END IF;

  IF NOT v_tier.is_active THEN
    RETURN json_build_object('success', false, 'error', 'ticket_inactive',
      'message', 'Denne billetten er ikke lenger tilgjengelig');
  END IF;

  -- 'external' signups are reserved for sellers OUTSIDE the integrated flow —
  -- an integrated seller's paid tiers must go through Dintero. The original
  -- zero-value guard still protects the 'paid' path.
  IF p_payment_status = 'external' THEN
    IF EXISTS (
      SELECT 1 FROM public.sellers s
      WHERE s.id = p_seller_id AND s.uses_integrated_payments
    ) THEN
      RETURN json_build_object('success', false, 'error', 'seller_integrated',
        'message', 'Dette studioet bruker integrert betaling');
    END IF;
  ELSIF p_dintero_transaction_id IS NULL
     AND COALESCE(p_amount_paid, 0) = 0
     AND COALESCE(v_tier.price, 0) > 0 THEN
    RETURN json_build_object('success', false, 'error', 'tier_requires_payment',
      'message', 'Denne billetten krever betaling');
  END IF;

  IF v_tier.sales_starts_at IS NOT NULL AND v_tier.sales_starts_at > now() THEN
    RETURN json_build_object('success', false, 'error', 'ticket_not_yet_on_sale',
      'message', 'Denne billetten er ikke i salg ennå');
  END IF;

  IF v_tier.sales_ends_at IS NOT NULL AND v_tier.sales_ends_at <= now() THEN
    RETURN json_build_object('success', false, 'error', 'ticket_expired',
      'message', 'Tilbudet er utløpt');
  END IF;

  IF v_tier.ticket_kind = 'drop_in' AND p_course_session_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'session_required',
      'message', 'Drop-in krever at du velger en time');
  END IF;

  IF v_tier.ticket_kind <> 'drop_in' AND p_course_session_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'session_not_allowed',
      'message', 'Pakke-billetter kan ikke knyttes til en enkelt time');
  END IF;

  SELECT * INTO v_course FROM public.courses WHERE id = p_course_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'course_not_found',
      'message', 'Kurset finnes ikke');
  END IF;

  -- AUDIT C1: the signup row must belong to the seller who owns the course.
  IF v_course.seller_id <> p_seller_id THEN
    RETURN json_build_object('success', false, 'error', 'seller_mismatch',
      'message', 'Kurset tilhører ikke denne selgeren');
  END IF;

  -- AUDIT C1: never mint signups on unpublished or cancelled courses. (Edge
  -- functions enforce richer rules — accepts_late_signups etc.; this is the
  -- floor that holds for every caller.)
  IF v_course.status IN ('draft', 'cancelled') THEN
    RETURN json_build_object('success', false, 'error', 'course_not_open',
      'message', 'Kurset er ikke åpent for påmelding');
  END IF;

  IF v_tier.ticket_kind = 'drop_in' THEN
    SELECT * INTO v_session
    FROM public.course_sessions
    WHERE id = p_course_session_id AND course_id = p_course_id;

    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error', 'session_not_found',
        'message', 'Timen finnes ikke');
    END IF;
  END IF;

  IF v_tier.ticket_kind <> 'drop_in' AND v_tier.weeks IS NOT NULL THEN
    v_package_end_date := v_course.start_date + ((v_tier.weeks - 1) * INTERVAL '7 days');
  END IF;

  IF v_tier.ticket_kind = 'drop_in' THEN
    v_lock_key := hashtextextended(p_course_id::text || p_course_session_id::text, 0);
  ELSE
    v_lock_key := hashtextextended(p_course_id::text, 0);
  END IF;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  IF v_tier.ticket_kind = 'drop_in' THEN
    IF v_course.max_participants IS NOT NULL THEN
      v_count := public.count_signups_for_session(p_course_session_id);
      IF v_count >= v_course.max_participants THEN
        RETURN json_build_object('success', false, 'error', 'session_full',
          'message', 'Timen er full');
      END IF;
    END IF;
  ELSE
    IF v_course.max_participants IS NOT NULL AND v_package_end_date IS NOT NULL THEN
      SELECT cs.id INTO v_failing_session
      FROM public.course_sessions cs
      WHERE cs.course_id = p_course_id
        AND cs.session_date BETWEEN v_course.start_date AND v_package_end_date
        AND public.count_signups_for_session(cs.id) >= v_course.max_participants
      LIMIT 1;

      IF v_failing_session IS NOT NULL THEN
        RETURN json_build_object('success', false, 'error', 'course_full',
          'message', 'En eller flere timer i kurset er fulle');
      END IF;
    END IF;
  END IF;

  IF v_tier.max_quantity IS NOT NULL THEN
    v_count := public.count_signups_by_ticket_type(p_course_id, p_ticket_type_id);
    IF v_count >= v_tier.max_quantity THEN
      RETURN json_build_object('success', false, 'error', 'tier_sold_out',
        'message', 'Denne billettypen er utsolgt');
    END IF;
  END IF;

  INSERT INTO public.signups (
    seller_id, course_id, buyer_id,
    participant_name, participant_email, participant_phone, note,
    status, payment_status,
    ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot,
    course_session_id, package_end_date,
    dintero_transaction_id, dintero_session_id, dintero_merchant_reference,
    payment_product,
    amount_paid, created_at, updated_at
  ) VALUES (
    p_seller_id, p_course_id, p_buyer_id,
    p_participant_name, p_participant_email, p_participant_phone, NULLIF(BTRIM(p_note), ''),
    'confirmed', p_payment_status::public.payment_status,
    p_ticket_type_id, v_tier.label, v_tier.audience, v_tier.ticket_kind,
    p_course_session_id, v_package_end_date,
    p_dintero_transaction_id, p_dintero_session_id, p_dintero_merchant_reference,
    p_payment_product,
    p_amount_paid, NOW(), NOW()
  )
  RETURNING id INTO v_signup_id;

  RETURN json_build_object(
    'success', true,
    'signup_id', v_signup_id,
    'status', 'confirmed',
    'package_end_date', v_package_end_date
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object('success', false, 'error', 'already_signed_up',
      'message', 'Du er allerede påmeldt dette kurset');
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'database_error',
      'message', SQLERRM);
END;
$$;

-- Service-role only (edge functions); see 20260612090000 for the revokes.
REVOKE ALL ON FUNCTION public.create_signup_if_available(
  uuid, uuid, uuid, text, text, text, numeric, text, text, text, uuid, uuid, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_signup_if_available(
  uuid, uuid, uuid, text, text, text, numeric, text, text, text, uuid, uuid, text, text, text
) TO service_role;

-- ── 2. Policy: member inserts are scoped to their own courses, no buyer link ─
DROP POLICY IF EXISTS "signups_insert_member" ON "public"."signups";
CREATE POLICY "signups_insert_member" ON "public"."signups"
  FOR INSERT TO "authenticated"
  WITH CHECK (
    public.is_seller_member("seller_id", (SELECT auth.uid()))
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = "signups"."course_id"
        AND c.seller_id = "signups"."seller_id"
    )
    -- Members add guest participants (manual adds). Buyer linkage is set only
    -- by claim_my_signups (verified email) or service-role flows — never by a
    -- direct authenticated insert, which could plant bookings in another
    -- user's dashboard.
    AND "buyer_id" IS NULL
  );

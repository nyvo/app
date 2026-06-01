-- Customer notes on public booking + explicit drop-in pricing.
--
-- Notes are collected before payment, stored on payment_attempts while the
-- Dintero flow is pending, then copied to signups by create_signup_if_available.
-- Drop-in price now comes from course_signup_packages.price instead of being
-- calculated from the package price.

ALTER TABLE public.payment_attempts
  ADD COLUMN IF NOT EXISTS note TEXT;

CREATE OR REPLACE FUNCTION public.available_ticket_types(p_course_id uuid)
RETURNS TABLE(
  id uuid, course_id uuid, label text, description text, price numeric,
  weeks integer, ticket_kind ticket_kind_t, audience ticket_audience_t,
  is_default boolean, display_order integer,
  sales_starts_at timestamp with time zone, sales_ends_at timestamp with time zone,
  max_quantity integer, seats_remaining integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
  WITH course_meta AS (
    SELECT
      c.id,
      c.price,
      c.total_weeks,
      c.start_date,
      c.max_participants,
      c.format,
      c.duration,
      c.accepts_late_signups,
      (SELECT COUNT(*) FROM public.signups s
        WHERE s.course_id = c.id AND s.status = 'confirmed') AS confirmed_signups,
      (
        SELECT COUNT(*)::int
        FROM public.course_sessions cs
        WHERE cs.course_id = c.id
          AND cs.status <> 'cancelled'
          AND (
            (cs.session_date + COALESCE(
              cs.end_time,
              cs.start_time + (COALESCE(c.duration, 60) || ' minutes')::interval
            ))::timestamptz > NOW()
          )
      ) AS remaining_sessions,
      (
        c.format = 'series'
        AND c.start_date IS NOT NULL
        AND c.start_date <= CURRENT_DATE
      ) AS series_started
    FROM public.courses c
    WHERE c.id = p_course_id
  )
  SELECT
    csp.id,
    csp.course_id,
    csp.label,
    csp.description,
    CASE
      WHEN csp.ticket_kind <> 'drop_in'
        AND cm.series_started
        AND cm.total_weeks IS NOT NULL AND cm.total_weeks > 0
        AND cm.price IS NOT NULL
        THEN ROUND(cm.price::numeric / cm.total_weeks) * cm.remaining_sessions
      ELSE csp.price
    END AS price,
    CASE
      WHEN csp.ticket_kind <> 'drop_in'
        AND cm.series_started
        AND cm.total_weeks IS NOT NULL AND cm.total_weeks > 0
        THEN cm.remaining_sessions
      ELSE csp.weeks
    END AS weeks,
    csp.ticket_kind,
    csp.audience,
    csp.is_default,
    csp.display_order,
    csp.sales_starts_at,
    csp.sales_ends_at,
    csp.max_quantity,
    CASE
      WHEN csp.max_quantity IS NULL THEN NULL
      ELSE GREATEST(0, csp.max_quantity - public.count_signups_by_ticket_type(csp.course_id, csp.id))
    END AS seats_remaining
  FROM public.course_signup_packages csp
  CROSS JOIN course_meta cm
  WHERE csp.course_id = p_course_id
    AND csp.is_active = true
    AND (csp.sales_starts_at IS NULL OR csp.sales_starts_at <= now())
    AND (csp.sales_ends_at  IS NULL OR csp.sales_ends_at  >  now())
    AND (
      csp.ticket_kind <> 'drop_in'
      OR (
        cm.format = 'series'
        AND cm.start_date IS NOT NULL
        AND cm.start_date <= CURRENT_DATE
        AND (cm.max_participants IS NULL OR cm.confirmed_signups < cm.max_participants)
        AND csp.price > 0
      )
    )
    AND NOT (
      csp.ticket_kind <> 'drop_in'
      AND cm.series_started
      AND (cm.remaining_sessions <= 1 OR cm.accepts_late_signups = false)
    )
  ORDER BY csp.display_order, csp.created_at;
$function$;

DROP FUNCTION IF EXISTS public.create_signup_if_available(
  UUID, UUID, UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT, TEXT, TEXT, UUID, UUID
);

CREATE OR REPLACE FUNCTION public.create_signup_if_available(
  p_seller_id                  UUID,
  p_course_id                  UUID,
  p_ticket_type_id             UUID,
  p_participant_name           TEXT,
  p_participant_email          TEXT,
  p_participant_phone          TEXT,
  p_amount_paid                NUMERIC,
  p_dintero_transaction_id     TEXT,
  p_dintero_session_id         TEXT,
  p_dintero_merchant_reference TEXT,
  p_course_session_id          UUID DEFAULT NULL,
  p_buyer_id                   UUID DEFAULT NULL,
  p_note                       TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SET search_path = pg_catalog, public
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
  WHERE id = p_ticket_type_id AND course_id = p_course_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'ticket_not_found',
      'message', 'Billettypen finnes ikke');
  END IF;

  IF NOT v_tier.is_active THEN
    RETURN json_build_object('success', false, 'error', 'ticket_inactive',
      'message', 'Denne billetten er ikke lenger tilgjengelig');
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
    amount_paid, created_at, updated_at
  ) VALUES (
    p_seller_id, p_course_id, p_buyer_id,
    p_participant_name, p_participant_email, p_participant_phone, NULLIF(BTRIM(p_note), ''),
    'confirmed', 'paid',
    p_ticket_type_id, v_tier.label, v_tier.audience, v_tier.ticket_kind,
    p_course_session_id, v_package_end_date,
    p_dintero_transaction_id, p_dintero_session_id, p_dintero_merchant_reference,
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

-- Prorated package price: round ONCE at the end, not per week.
--
-- The old formula `ROUND(price / total_weeks) * remaining_sessions` bakes the
-- per-week rounding error into every remaining week: a 1 000 kr / 3-week
-- course priced the full package at ROUND(1000/3) * 3 = 999 kr on the very
-- day it started (series_started flips at midnight of start_date, while all
-- 3 sessions still count as remaining). Rounding once —
-- `ROUND(price * remaining / total_weeks)` — makes "all sessions remaining"
-- always equal the full price and caps the error at half a krone regardless
-- of week count.
--
-- Only the price CASE changes; everything else is identical to
-- 20260703201728_restore_tier_count_fn_and_dropin_next_session_gate.
-- Signature is unchanged, so existing grants are preserved by
-- CREATE OR REPLACE.
--
-- This RPC is now also the single pricing source for the course detail
-- page's booking rail (it always was for checkout + the Stripe session), so
-- the displayed and charged price come from the same formula.

CREATE OR REPLACE FUNCTION public.available_ticket_types(p_course_id uuid)
 RETURNS TABLE(id uuid, course_id uuid, label text, description text, price numeric, weeks integer, ticket_kind ticket_kind_t, audience ticket_audience_t, is_default boolean, display_order integer, sales_starts_at timestamp with time zone, sales_ends_at timestamp with time zone, max_quantity integer, seats_remaining integer)
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
        SELECT cs.id
        FROM public.course_sessions cs
        WHERE cs.course_id = c.id
          AND cs.status IS DISTINCT FROM 'cancelled'
          AND (cs.session_date + cs.start_time)::timestamptz > NOW()
        ORDER BY cs.session_date, cs.start_time
        LIMIT 1
      ) AS next_session_id,
      (
        c.format = 'series'
        AND c.start_date IS NOT NULL
        AND c.start_date <= CURRENT_DATE
      ) AS series_started
    FROM public.courses c
    WHERE c.id = p_course_id
      AND c.status <> 'draft'
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
        THEN ROUND(cm.price::numeric * cm.remaining_sessions / cm.total_weeks)
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
        AND cm.next_session_id IS NOT NULL
        AND (
          cm.max_participants IS NULL
          OR public.count_signups_for_session(cm.next_session_id) < cm.max_participants
        )
        AND csp.price > 0
      )
    )
    AND NOT (
      csp.ticket_kind <> 'drop_in'
      AND cm.series_started
      AND (cm.remaining_sessions <= 0 OR cm.accepts_late_signups = false)
    )
  ORDER BY csp.display_order, csp.created_at;
$function$;

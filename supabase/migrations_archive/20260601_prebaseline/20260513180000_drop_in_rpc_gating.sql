-- Drop-in launch model — single source of truth.
--
-- The existence of an active drop-in tier row in course_signup_packages
-- represents the teacher's policy ("drop-in is offered on this course"). The
-- RPC below gates the runtime exposure: drop-in tiers are only returned for
-- courses that are series, have started, and have spots available. Drop-in
-- price is computed at read time as ROUND(course.price ÷ course.total_weeks)
-- — no snapshot, no drift.
--
-- Non-drop-in tiers pass through unchanged: their stored price wins, no
-- additional gating beyond is_active + sales window.

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
      (SELECT COUNT(*) FROM public.signups s
        WHERE s.course_id = c.id AND s.status = 'confirmed') AS confirmed_signups
    FROM public.courses c
    WHERE c.id = p_course_id
  )
  SELECT
    csp.id,
    csp.course_id,
    csp.label,
    csp.description,
    CASE
      WHEN csp.ticket_kind = 'drop_in' AND cm.total_weeks > 0 AND cm.price IS NOT NULL
        THEN ROUND(cm.price::numeric / cm.total_weeks)
      ELSE csp.price
    END AS price,
    csp.weeks,
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
      )
    )
  ORDER BY csp.display_order, csp.created_at;
$function$;

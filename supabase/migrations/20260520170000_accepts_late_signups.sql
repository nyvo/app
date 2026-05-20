-- Teacher-controlled late-join policy for series courses.
--
-- Adds courses.accepts_late_signups (default true so existing series keep
-- the behavior introduced in migration 20260520160000). When toggled off,
-- the prorated package tier is hidden from available_ticket_types — buyers
-- see only drop-in (if enabled) or "Påmelding stengt" once the series has
-- started.
--
-- Single-format courses (events) are unaffected: the proration branch
-- already requires format = 'series'.

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS accepts_late_signups BOOLEAN NOT NULL DEFAULT true;

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
      WHEN csp.ticket_kind = 'drop_in' AND cm.total_weeks > 0 AND cm.price IS NOT NULL
        THEN ROUND(cm.price::numeric / cm.total_weeks)
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
      )
    )
    -- Package tier is hidden for started series when:
    --   • ≤1 session remains (would duplicate drop-in pricing), OR
    --   • the teacher has disabled late signups for this course.
    AND NOT (
      csp.ticket_kind <> 'drop_in'
      AND cm.series_started
      AND (cm.remaining_sessions <= 1 OR cm.accepts_late_signups = false)
    )
  ORDER BY csp.display_order, csp.created_at;
$function$;

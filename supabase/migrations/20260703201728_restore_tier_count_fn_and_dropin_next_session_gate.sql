-- 1. RESTORE count_signups_by_ticket_type — 20260702165020_prelaunch_db_cleanup
--    dropped it as "zero callers", but it has two live callers:
--      * available_ticket_types (SQL fn → EVERY call errors 42883: the public
--        booking page and checkout could not load tiers at all);
--      * create_signup_if_available's max_quantity branch (plpgsql → minting
--        breaks for tiers with a quota).
--    Identical to the production_schema_baseline definition + grants.
--
-- 2. Drop-in availability = the NEXT upcoming class, not the course-wide total.

CREATE OR REPLACE FUNCTION public.count_signups_by_ticket_type(p_course_id uuid, p_ticket_type_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT COUNT(*)::INT
  FROM public.signups s
  WHERE s.course_id = p_course_id
    AND s.ticket_type_id = p_ticket_type_id
    AND s.status = 'confirmed';
$$;

COMMENT ON FUNCTION public.count_signups_by_ticket_type(uuid, uuid) IS
  'Course-wide count for a single ticket type. Used to enforce max_quantity (tier quota). Not per-session. Called by available_ticket_types and create_signup_if_available — do NOT drop as dead.';

REVOKE ALL ON FUNCTION public.count_signups_by_ticket_type(uuid, uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.count_signups_by_ticket_type(uuid, uuid) TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- Drop-in gate on next-session capacity.
--
-- available_ticket_types gated the drop-in tier on
-- `confirmed_signups < max_participants` counted across the WHOLE course. For a
-- running series that is wrong in both directions:
--   * false-full: drop-ins from past sessions accumulate (each only ever occupied
--     one class), so the tier vanished even though the next class had free spots;
--   * false-open: the tier stayed visible when the next class WAS full but the
--     course-wide count was still under the cap (the buyer then hit the hard
--     reject only after the webhook capacity check).
--
-- The product model: a drop-in is always for the next class (checkout auto-picks
-- it; there is no session picker). So the tier is available exactly when a next
-- session exists and count_signups_for_session(next) < max_participants — the
-- same per-session semantics the mint RPC (create_signup_if_available) enforces,
-- where a drop-in only occupies its own session and the spot frees once the
-- class passes.
--
-- Timestamp note: (session_date + start_time)::timestamptz reads the naive local
-- time as the DB timezone (UTC), same as the existing remaining_sessions logic —
-- deliberately consistent with it, and the ~1-2h leniency errs toward keeping a
-- class bookable rather than hiding it early.

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

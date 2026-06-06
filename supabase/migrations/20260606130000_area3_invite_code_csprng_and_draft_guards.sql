-- Area #3 storefront/exposure hardening.
--
-- F3.1 — Team invite codes were 8 hex chars (~32 bits) from md5(random()), and
-- lookup_team_invite_link is anon + unrate-limited, so codes were brute-forceable.
-- Switch to a CSPRNG (pgcrypto gen_random_bytes) giving 24 hex chars (96 bits).
-- gen_random_bytes lives in the extensions schema; this function pins
-- search_path to 'public', so qualify it explicitly.
CREATE OR REPLACE FUNCTION public.create_team_invite_link(p_team_id uuid)
 RETURNS public.team_invite_links
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_code text;
  v_attempts int := 0;
  v_row public.team_invite_links;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS(
    SELECT 1
    FROM public.teams t
    JOIN public.seller_members sm ON sm.seller_id = t.owner_seller_id
    WHERE t.id = p_team_id AND sm.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.team_invite_links
  SET revoked_at = now()
  WHERE team_id = p_team_id
    AND revoked_at IS NULL;

  LOOP
    v_code := encode(extensions.gen_random_bytes(12), 'hex');

    BEGIN
      INSERT INTO public.team_invite_links (team_id, code, created_by)
      VALUES (p_team_id, v_code, v_user_id)
      RETURNING * INTO v_row;
      RETURN v_row;
    EXCEPTION WHEN unique_violation THEN
      v_attempts := v_attempts + 1;
      IF v_attempts > 5 THEN
        RAISE EXCEPTION 'Could not generate unique code after % attempts', v_attempts;
      END IF;
    END;
  END LOOP;
END;
$$;

-- Rotate out the legacy weak active code(s). Pre-launch there is exactly one
-- active link and no shared-link dependency, so revoke any short legacy codes;
-- the studio owner regenerates a fresh strong one on demand.
UPDATE public.team_invite_links
SET revoked_at = now()
WHERE revoked_at IS NULL
  AND length(code) < 24;

-- F3.3 — available_ticket_types and public_signup_counts are SECURITY DEFINER and
-- bypass RLS, so a known course UUID could read pricing / seat / signup counts of
-- a draft course. Add a status <> 'draft' guard to both, matching the row-level
-- policy that hides drafts from anon.
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
        AND (cm.max_participants IS NULL OR cm.confirmed_signups < cm.max_participants)
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

CREATE OR REPLACE FUNCTION public.public_signup_counts(p_course_ids uuid[])
 RETURNS TABLE(course_id uuid, confirmed_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT s.course_id, COUNT(*)::bigint
  FROM public.signups s
  WHERE s.course_id = ANY(p_course_ids)
    AND s.status = 'confirmed'
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = s.course_id AND c.status <> 'draft'
    )
  GROUP BY s.course_id;
$function$;

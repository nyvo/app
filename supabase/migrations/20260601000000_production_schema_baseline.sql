-- Production schema baseline for Supabase project nollnnkksgicsvuthnjq.
-- Generated from the live database on 2026-06-01 after prelaunch hardening.
-- Earlier migration SQL is archived in supabase/migrations_archive/20260601_prebaseline/.
-- This migration is marked as applied on production; fresh databases apply it after the no-op history placeholders.

CREATE SCHEMA IF NOT EXISTS "extensions";
CREATE SCHEMA IF NOT EXISTS "vault";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";



SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."course_format" AS ENUM (
    'single',
    'series'
);


ALTER TYPE "public"."course_format" OWNER TO "postgres";


CREATE TYPE "public"."course_status" AS ENUM (
    'draft',
    'upcoming',
    'active',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."course_status" OWNER TO "postgres";


CREATE TYPE "public"."delivery_mode" AS ENUM (
    'in_person',
    'online'
);


ALTER TYPE "public"."delivery_mode" OWNER TO "postgres";


CREATE TYPE "public"."payment_status" AS ENUM (
    'pending',
    'paid',
    'failed',
    'refunded'
);


ALTER TYPE "public"."payment_status" OWNER TO "postgres";


CREATE TYPE "public"."seller_member_role" AS ENUM (
    'owner',
    'admin'
);


ALTER TYPE "public"."seller_member_role" OWNER TO "postgres";


CREATE TYPE "public"."signup_status" AS ENUM (
    'confirmed',
    'cancelled',
    'course_cancelled'
);


ALTER TYPE "public"."signup_status" OWNER TO "postgres";


CREATE TYPE "public"."ticket_audience_t" AS ENUM (
    'standard',
    'student',
    'senior',
    'staff'
);


ALTER TYPE "public"."ticket_audience_t" OWNER TO "postgres";


COMMENT ON TYPE "public"."ticket_audience_t" IS 'Who the ticket is for. Independent of pricing math — discount semantics live in the row''s price.';



CREATE TYPE "public"."ticket_kind_t" AS ENUM (
    'package',
    'drop_in',
    'pass'
);


ALTER TYPE "public"."ticket_kind_t" OWNER TO "postgres";


COMMENT ON TYPE "public"."ticket_kind_t" IS 'package = multi-session purchase (covers a window of sessions). drop_in = single session. pass = reserved for future punch cards (no behaviour wired yet).';



CREATE OR REPLACE FUNCTION "public"."_normalize_team_slug"("p_input" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $_$
DECLARE
  s TEXT;
  reserved_slugs TEXT[] := ARRAY[
    'signup','login','logout','forgot-password','reset-password','terms','checkout',
    'confirm-email','teacher','dev','studio','studios','space','spaces','team','teams',
    'admin','api','auth','account','accounts','signin','sign-in','sign-up','register',
    'verify','oauth','about','pricing','price','contact','help','support','blog','news',
    'docs','documentation','faq','careers','jobs','press','privacy','legal','cookies',
    'security','features','product','platform','enterprise','business','home','welcome',
    'onboarding','dashboard','app','apps','settings','profile','profiles','preferences',
    'billing','invoice','invoices','payment','payments','payouts','refund','refunds',
    'invite','invites','om-oss','priser','kontakt','hjelp','personvern','vilkar','vilkaar',
    'kurs','course','courses','event','events','schedule','timeplan','booking','book',
    'paamelding','pamelding','cancel','avbestill','static','assets','public','private',
    'favicon','robots','sitemap','manifest','icon','icons','og','embed','oembed','rss',
    'feed','json','null','undefined','true','false','new','_','@','$','__internal','__data'
  ];
BEGIN
  s := NULLIF(TRIM(LOWER(COALESCE(p_input, ''))), '');
  IF s IS NULL THEN
    RAISE EXCEPTION 'Slug is required' USING ERRCODE = '22023';
  END IF;
  s := REGEXP_REPLACE(s, '[æ]', 'ae', 'g');
  s := REGEXP_REPLACE(s, '[ø]', 'o',  'g');
  s := REGEXP_REPLACE(s, '[å]', 'a',  'g');
  s := REGEXP_REPLACE(s, '[^a-z0-9]+', '-', 'g');
  s := REGEXP_REPLACE(s, '^-+|-+$', '', 'g');
  s := LEFT(s, 40);

  IF s = '' OR LENGTH(s) < 3 THEN
    RAISE EXCEPTION 'Slug must be at least 3 characters' USING ERRCODE = '22023';
  END IF;
  IF s = ANY(reserved_slugs) THEN
    RAISE EXCEPTION 'Slug is reserved' USING ERRCODE = '23505';
  END IF;

  RETURN s;
END;
$_$;


ALTER FUNCTION "public"."_normalize_team_slug"("p_input" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."available_ticket_types"("p_course_id" "uuid") RETURNS TABLE("id" "uuid", "course_id" "uuid", "label" "text", "description" "text", "price" numeric, "weeks" integer, "ticket_kind" "public"."ticket_kind_t", "audience" "public"."ticket_audience_t", "is_default" boolean, "display_order" integer, "sales_starts_at" timestamp with time zone, "sales_ends_at" timestamp with time zone, "max_quantity" integer, "seats_remaining" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
      AND (cm.remaining_sessions <= 0 OR cm.accepts_late_signups = false)
    )
  ORDER BY csp.display_order, csp.created_at;
$$;


ALTER FUNCTION "public"."available_ticket_types"("p_course_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."available_ticket_types"("p_course_id" "uuid") IS 'Public RPC. Returns ticket types currently buyable for a course, with seats_remaining computed.';



CREATE OR REPLACE FUNCTION "public"."calculate_package_end_date"("p_course_start_date" "date", "p_package_weeks" integer) RETURNS "date"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  IF p_package_weeks IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN p_course_start_date + ((p_package_weeks - 1) * 7);
END;
$$;


ALTER FUNCTION "public"."calculate_package_end_date"("p_course_start_date" "date", "p_package_weeks" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_package_end_date"("p_course_start_date" "date", "p_package_weeks" integer) IS 'Calculates the end date for a signup package based on course start date and package weeks.';



CREATE OR REPLACE FUNCTION "public"."check_session_conflict"("p_seller_id" "uuid", "p_session_date" "date", "p_start_time" time without time zone, "p_end_time" time without time zone, "p_exclude_course_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("has_conflict" boolean, "conflicting_course_id" "uuid", "conflicting_course_title" "text", "conflicting_start" time without time zone, "conflicting_end" time without time zone)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT TRUE, c.id, c.title, cs.start_time,
    (cs.start_time + (COALESCE(c.duration, 60) || ' minutes')::INTERVAL)::TIME
  FROM public.course_sessions cs
  JOIN public.courses c ON c.id = cs.course_id
  WHERE c.seller_id = p_seller_id
    AND cs.session_date = p_session_date
    AND cs.status != 'cancelled' AND c.status != 'cancelled'
    AND (p_exclude_course_id IS NULL OR c.id != p_exclude_course_id)
    AND (p_start_time < (cs.start_time + (COALESCE(c.duration, 60) || ' minutes')::INTERVAL)::TIME
      AND cs.start_time < p_end_time)
  LIMIT 1;
  IF NOT FOUND THEN RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TIME, NULL::TIME; END IF;
END;
$$;


ALTER FUNCTION "public"."check_session_conflict"("p_seller_id" "uuid", "p_session_date" "date", "p_start_time" time without time zone, "p_end_time" time without time zone, "p_exclude_course_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_sessions_conflicts"("p_seller_id" "uuid", "p_sessions" "jsonb", "p_exclude_course_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("session_date" "date", "has_conflict" boolean, "conflicting_course_id" "uuid", "conflicting_course_title" "text", "conflicting_start" time without time zone, "conflicting_end" time without time zone)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE v_session JSONB; v_date DATE; v_start TIME; v_duration INTEGER; v_end TIME; v_conflict RECORD;
BEGIN
  FOR v_session IN SELECT * FROM jsonb_array_elements(p_sessions)
  LOOP
    v_date := (v_session->>'date')::DATE;
    v_start := (v_session->>'start_time')::TIME;
    v_duration := COALESCE((v_session->>'duration')::INTEGER, 60);
    v_end := v_start + (v_duration || ' minutes')::INTERVAL;
    SELECT * INTO v_conflict
    FROM public.check_session_conflict(p_seller_id, v_date, v_start, v_end, p_exclude_course_id) AS c
    WHERE c.has_conflict = TRUE;
    IF FOUND THEN
      RETURN QUERY SELECT v_date, TRUE, v_conflict.conflicting_course_id,
        v_conflict.conflicting_course_title, v_conflict.conflicting_start, v_conflict.conflicting_end;
    ELSE
      RETURN QUERY SELECT v_date, FALSE, NULL::UUID, NULL::TEXT, NULL::TIME, NULL::TIME;
    END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."check_sessions_conflicts"("p_seller_id" "uuid", "p_sessions" "jsonb", "p_exclude_course_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_course_listings_on_affiliation_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.course_team_listings ctl
    USING public.courses c
    WHERE ctl.course_id = c.id
      AND ctl.team_id = OLD.team_id
      AND c.seller_id = OLD.seller_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' AND NEW.status <> 'active' AND OLD.status = 'active' THEN
    DELETE FROM public.course_team_listings ctl
    USING public.courses c
    WHERE ctl.course_id = c.id
      AND ctl.team_id = NEW.team_id
      AND c.seller_id = NEW.seller_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."cleanup_course_listings_on_affiliation_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_webhook_events"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM processed_webhook_events
  WHERE processed_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_webhook_events"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_old_webhook_events"() IS 'Removes processed webhook events older than 30 days.
Should be called periodically via cron job.';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "name" "text",
    "phone" "text",
    "is_platform_admin" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "onboarding_completed_at" timestamp with time zone,
    "setup_complete_seen_at" timestamp with time zone,
    "role" "text",
    CONSTRAINT "profiles_role_check" CHECK ((("role" IS NULL) OR ("role" = ANY (ARRAY['buyer'::"text", 'seller'::"text"]))))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."onboarding_completed_at" IS 'Timestamp when user completed the welcome onboarding flow';



COMMENT ON COLUMN "public"."profiles"."role" IS 'UX hint for routing — distinguishes buyer vs seller persona for /onboarding branching and /overview sidebar contents. NOT for authorization. Authz checks must use seller_members (presence of row = seller; role column within = owner/admin).';



CREATE OR REPLACE FUNCTION "public"."complete_buyer_onboarding"("p_name" "text", "p_phone" "text" DEFAULT NULL::"text") RETURNS "public"."profiles"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  calling_user uuid := auth.uid();
  clean_name text := left(trim(coalesce(p_name, '')), 120);
  clean_phone text := nullif(left(trim(coalesce(p_phone, '')), 40), '');
  result public.profiles;
BEGIN
  IF calling_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF clean_name = '' THEN
    RAISE EXCEPTION 'Name is required' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('app.profiles_server_write', 'true', true);

  UPDATE public.profiles
     SET name = clean_name,
         phone = clean_phone,
         role = 'buyer',
         onboarding_completed_at = coalesce(onboarding_completed_at, now())
   WHERE id = calling_user
     AND (role IS NULL OR role = 'buyer')
  RETURNING * INTO result;

  IF result.id IS NULL THEN
    RAISE EXCEPTION 'Buyer onboarding is not allowed for this profile' USING ERRCODE = '42501';
  END IF;

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."complete_buyer_onboarding"("p_name" "text", "p_phone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."count_signups_by_ticket_type"("p_course_id" "uuid", "p_ticket_type_id" "uuid") RETURNS integer
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT COUNT(*)::INT
  FROM public.signups s
  WHERE s.course_id = p_course_id
    AND s.ticket_type_id = p_ticket_type_id
    AND s.status = 'confirmed';
$$;


ALTER FUNCTION "public"."count_signups_by_ticket_type"("p_course_id" "uuid", "p_ticket_type_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."count_signups_by_ticket_type"("p_course_id" "uuid", "p_ticket_type_id" "uuid") IS 'Course-wide count for a single ticket type. Used to enforce max_quantity (tier quota). Not per-session.';



CREATE OR REPLACE FUNCTION "public"."count_signups_for_session"("p_course_session_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_session_date DATE;
  v_course_id    UUID;
  v_count        INT;
BEGIN
  SELECT cs.session_date, cs.course_id
    INTO v_session_date, v_course_id
  FROM public.course_sessions cs
  WHERE cs.id = p_course_session_id;

  IF v_session_date IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.signups s
  WHERE s.course_id = v_course_id
    AND s.status = 'confirmed'
    AND (
      s.course_session_id = p_course_session_id
      OR
      (s.ticket_kind_snapshot IS DISTINCT FROM 'drop_in'
       AND (s.package_end_date IS NULL OR v_session_date <= s.package_end_date))
    );

  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."count_signups_for_session"("p_course_session_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."count_signups_for_session"("p_course_session_id" "uuid") IS 'Counts confirmed attendees on a specific session. Includes both drop-in buyers (linked via course_session_id) and package buyers whose window covers the session date.';



CREATE OR REPLACE FUNCTION "public"."create_course_idempotent"("p_seller_id" "uuid", "p_idempotency_key" "text", "p_title" "text", "p_description" "text" DEFAULT NULL::"text", "p_format" "text" DEFAULT 'single'::"text", "p_delivery_mode" "text" DEFAULT 'in_person'::"text", "p_status" "text" DEFAULT 'draft'::"text", "p_level" "text" DEFAULT 'alle'::"text", "p_location" "text" DEFAULT NULL::"text", "p_time_schedule" "text" DEFAULT NULL::"text", "p_duration" integer DEFAULT 60, "p_max_participants" integer DEFAULT NULL::integer, "p_price" numeric DEFAULT NULL::numeric, "p_total_weeks" integer DEFAULT NULL::integer, "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date", "p_instructor_id" "uuid" DEFAULT NULL::"uuid", "p_image_url" "text" DEFAULT NULL::"text", "p_style_id" "uuid" DEFAULT NULL::"uuid") RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $_$
DECLARE
  v_existing_course RECORD;
  v_new_course_id UUID;
  base_slug TEXT;
  candidate_slug TEXT;
  slug_suffix INT := 0;
  suffix_text TEXT;
BEGIN
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id, title, status, created_at INTO v_existing_course
    FROM public.courses WHERE seller_id = p_seller_id AND idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN json_build_object('success', true, 'course_id', v_existing_course.id,
        'already_existed', true, 'message', 'Kurset eksisterer allerede');
    END IF;
  END IF;

  base_slug := REGEXP_REPLACE(LOWER(p_title), '[æ]', 'ae', 'g');
  base_slug := REGEXP_REPLACE(base_slug, '[ø]', 'o', 'g');
  base_slug := REGEXP_REPLACE(base_slug, '[å]', 'a', 'g');
  base_slug := REGEXP_REPLACE(base_slug, '[^a-z0-9]+', '-', 'g');
  base_slug := REGEXP_REPLACE(base_slug, '^-+|-+$', '', 'g');
  base_slug := LEFT(base_slug, 60);
  IF base_slug = '' THEN
    base_slug := SUBSTRING(extensions.uuid_generate_v4()::text, 1, 8);
  END IF;

  LOOP
    IF slug_suffix = 0 THEN
      candidate_slug := base_slug;
    ELSE
      suffix_text := slug_suffix::TEXT;
      candidate_slug := LEFT(base_slug, 60 - 1 - LENGTH(suffix_text)) || '-' || suffix_text;
    END IF;

    BEGIN
      INSERT INTO public.courses (
        seller_id, idempotency_key, slug, title, description,
        format, delivery_mode, status, level, location, time_schedule,
        duration, max_participants, price, total_weeks,
        start_date, end_date, instructor_id, image_url, style_id
      ) VALUES (
        p_seller_id, p_idempotency_key, candidate_slug, p_title, p_description,
        p_format::public.course_format, p_delivery_mode::public.delivery_mode,
        p_status::course_status, p_level::course_level,
        p_location, p_time_schedule, p_duration, p_max_participants,
        p_price, p_total_weeks, p_start_date, p_end_date,
        p_instructor_id, p_image_url, p_style_id
      )
      RETURNING id INTO v_new_course_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_existing_course FROM public.courses
        WHERE seller_id = p_seller_id AND idempotency_key = p_idempotency_key;
        IF FOUND THEN
          RETURN json_build_object('success', true, 'course_id', v_existing_course.id,
            'already_existed', true, 'message', 'Kurset eksisterer allerede');
        END IF;
      END IF;
      slug_suffix := slug_suffix + 1;
      IF slug_suffix > 100 THEN
        RETURN json_build_object('success', false, 'error', 'slug_collision',
          'message', 'Kunne ikke generere unik lenke etter 100 forsøk');
      END IF;
    END;
  END LOOP;

  RETURN json_build_object('success', true, 'course_id', v_new_course_id,
    'already_existed', false, 'message', 'Kurs opprettet');
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'database_error', 'message', SQLERRM);
END;
$_$;


ALTER FUNCTION "public"."create_course_idempotent"("p_seller_id" "uuid", "p_idempotency_key" "text", "p_title" "text", "p_description" "text", "p_format" "text", "p_delivery_mode" "text", "p_status" "text", "p_level" "text", "p_location" "text", "p_time_schedule" "text", "p_duration" integer, "p_max_participants" integer, "p_price" numeric, "p_total_weeks" integer, "p_start_date" "date", "p_end_date" "date", "p_instructor_id" "uuid", "p_image_url" "text", "p_style_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_signup_if_available"("p_seller_id" "uuid", "p_course_id" "uuid", "p_ticket_type_id" "uuid", "p_participant_name" "text", "p_participant_email" "text", "p_participant_phone" "text", "p_amount_paid" numeric, "p_dintero_transaction_id" "text", "p_dintero_session_id" "text", "p_dintero_merchant_reference" "text", "p_course_session_id" "uuid" DEFAULT NULL::"uuid", "p_buyer_id" "uuid" DEFAULT NULL::"uuid") RETURNS json
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
    participant_name, participant_email, participant_phone,
    status, payment_status,
    ticket_type_id, ticket_label_snapshot, ticket_audience_snapshot, ticket_kind_snapshot,
    course_session_id, package_end_date,
    dintero_transaction_id, dintero_session_id, dintero_merchant_reference,
    amount_paid, created_at, updated_at
  ) VALUES (
    p_seller_id, p_course_id, p_buyer_id,
    p_participant_name, p_participant_email, p_participant_phone,
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


ALTER FUNCTION "public"."create_signup_if_available"("p_seller_id" "uuid", "p_course_id" "uuid", "p_ticket_type_id" "uuid", "p_participant_name" "text", "p_participant_email" "text", "p_participant_phone" "text", "p_amount_paid" numeric, "p_dintero_transaction_id" "text", "p_dintero_session_id" "text", "p_dintero_merchant_reference" "text", "p_course_session_id" "uuid", "p_buyer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_signup_if_available"("p_seller_id" "uuid", "p_course_id" "uuid", "p_ticket_type_id" "uuid", "p_participant_name" "text", "p_participant_email" "text", "p_participant_phone" "text", "p_amount_paid" numeric, "p_dintero_transaction_id" "text", "p_dintero_session_id" "text", "p_dintero_merchant_reference" "text", "p_course_session_id" "uuid" DEFAULT NULL::"uuid", "p_buyer_id" "uuid" DEFAULT NULL::"uuid", "p_note" "text" DEFAULT NULL::"text", "p_payment_product" "text" DEFAULT NULL::"text") RETURNS json
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
    payment_product,
    amount_paid, created_at, updated_at
  ) VALUES (
    p_seller_id, p_course_id, p_buyer_id,
    p_participant_name, p_participant_email, p_participant_phone, NULLIF(BTRIM(p_note), ''),
    'confirmed', 'paid',
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


ALTER FUNCTION "public"."create_signup_if_available"("p_seller_id" "uuid", "p_course_id" "uuid", "p_ticket_type_id" "uuid", "p_participant_name" "text", "p_participant_email" "text", "p_participant_phone" "text", "p_amount_paid" numeric, "p_dintero_transaction_id" "text", "p_dintero_session_id" "text", "p_dintero_merchant_reference" "text", "p_course_session_id" "uuid", "p_buyer_id" "uuid", "p_note" "text", "p_payment_product" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_invite_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "revoked_at" timestamp with time zone,
    "created_by" "uuid"
);


ALTER TABLE "public"."team_invite_links" OWNER TO "postgres";


COMMENT ON TABLE "public"."team_invite_links" IS 'Shareable invite codes for team membership. At most one non-revoked, non-expired link per team at a time.';



CREATE OR REPLACE FUNCTION "public"."create_team_invite_link"("p_team_id" "uuid") RETURNS "public"."team_invite_links"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
    v_code := substr(md5(random()::text || clock_timestamp()::text), 1, 3)
              || '-'
              || substr(md5(random()::text || clock_timestamp()::text), 1, 5);

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


ALTER FUNCTION "public"."create_team_invite_link"("p_team_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_course_cascade"("p_course_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.courses c
    JOIN public.seller_members sm ON sm.seller_id = c.seller_id
    WHERE c.id = p_course_id AND sm.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: you are not a member of this course''s seller';
  END IF;
  DELETE FROM public.signups        WHERE course_id = p_course_id;
  DELETE FROM public.course_sessions WHERE course_id = p_course_id;
  DELETE FROM public.courses         WHERE id        = p_course_id;
END;
$$;


ALTER FUNCTION "public"."delete_course_cascade"("p_course_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_course_publish_requires_dintero"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_onboarding_complete boolean;
BEGIN
  IF NEW.status NOT IN ('upcoming', 'active') THEN
    RETURN NEW;
  END IF;

  -- Already in a published lifecycle state → this is a lifecycle move, not a
  -- publish action. Exempt.
  IF TG_OP = 'UPDATE' AND OLD.status IN ('upcoming', 'active', 'completed') THEN
    RETURN NEW;
  END IF;

  SELECT dintero_onboarding_complete
    INTO v_onboarding_complete
    FROM public.sellers
   WHERE id = NEW.seller_id;

  IF NOT COALESCE(v_onboarding_complete, false) THEN
    RAISE EXCEPTION 'dintero_onboarding_required'
      USING ERRCODE = 'P0001',
            HINT = 'Seller must complete Dintero onboarding before publishing a course.';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_course_publish_requires_dintero"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_session_no_conflict"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE v_seller_id UUID; v_duration INTEGER; v_end_time TIME; v_conflict RECORD;
BEGIN
  SELECT c.seller_id, COALESCE(c.duration, 60) INTO v_seller_id, v_duration
  FROM public.courses c WHERE c.id = NEW.course_id;
  v_end_time := NEW.start_time + (v_duration || ' minutes')::INTERVAL;
  SELECT * INTO v_conflict
  FROM public.check_session_conflict(v_seller_id, NEW.session_date, NEW.start_time, v_end_time, NEW.course_id) AS c
  WHERE c.has_conflict = TRUE;
  IF FOUND THEN
    RAISE EXCEPTION 'Session conflicts with existing course: % (%-%)',
      v_conflict.conflicting_course_title, v_conflict.conflicting_start, v_conflict.conflicting_end
      USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_session_no_conflict"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_seller_for_user"("p_seller_name" "text", "p_team_slug" "text", "p_seller_type" "text" DEFAULT 'individual'::"text") RETURNS TABLE("seller_id" "uuid", "team_id" "uuid", "team_slug" "text", "seller_name" "text", "member_role" "public"."seller_member_role", "was_created" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  calling_user uuid := auth.uid();
  existing_seller_id uuid;
  existing_team_id uuid;
  existing_team_slug text;
  existing_seller_name text;
  new_seller_id uuid;
  new_team_id uuid;
  candidate_slug text;
  clean_name text;
BEGIN
  IF calling_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF p_seller_type NOT IN ('individual', 'business') THEN
    RAISE EXCEPTION 'Invalid seller_type: %', p_seller_type USING ERRCODE = '22023';
  END IF;

  SELECT sm.seller_id INTO existing_seller_id
  FROM public.seller_members sm
  WHERE sm.user_id = calling_user AND sm.role = 'owner'
  LIMIT 1;

  IF existing_seller_id IS NOT NULL THEN
    SELECT t.id, t.slug INTO existing_team_id, existing_team_slug
    FROM public.teams t
    WHERE t.owner_seller_id = existing_seller_id
    LIMIT 1;

    SELECT s.name INTO existing_seller_name
    FROM public.sellers s
    WHERE s.id = existing_seller_id;

    RETURN QUERY SELECT existing_seller_id, existing_team_id, existing_team_slug,
      existing_seller_name, 'owner'::public.seller_member_role, false;
    RETURN;
  END IF;

  clean_name := left(trim(coalesce(p_seller_name, '')), 100);
  IF clean_name = '' THEN
    RAISE EXCEPTION 'Seller name is required' USING ERRCODE = '22023';
  END IF;

  candidate_slug := public._normalize_team_slug(p_team_slug);

  IF EXISTS (SELECT 1 FROM public.teams WHERE lower(slug) = candidate_slug) THEN
    RAISE EXCEPTION 'Slug already taken' USING ERRCODE = '23505';
  END IF;
  IF EXISTS (SELECT 1 FROM public.team_slug_aliases WHERE lower(old_slug) = candidate_slug) THEN
    RAISE EXCEPTION 'Slug already taken' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.sellers (name, seller_type)
  VALUES (clean_name, p_seller_type)
  RETURNING id INTO new_seller_id;

  BEGIN
    INSERT INTO public.teams (slug, name, owner_seller_id)
    VALUES (candidate_slug, clean_name, new_seller_id)
    RETURNING id INTO new_team_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Slug already taken' USING ERRCODE = '23505';
  END;

  INSERT INTO public.seller_members (seller_id, user_id, role)
  VALUES (new_seller_id, calling_user, 'owner');

  RETURN QUERY SELECT new_seller_id, new_team_id, candidate_slug,
    clean_name, 'owner'::public.seller_member_role, true;
END;
$$;


ALTER FUNCTION "public"."ensure_seller_for_user"("p_seller_name" "text", "p_team_slug" "text", "p_seller_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_seller_operational"("p_seller_id" "uuid") RETURNS TABLE("dintero_seller_id" "text", "dintero_onboarding_status" "text", "seller_type" "text", "updated_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT s.dintero_seller_id, s.dintero_onboarding_status,
         s.seller_type, s.updated_at
  FROM public.sellers s
  WHERE s.id = p_seller_id
    AND public.is_seller_member(p_seller_id, auth.uid());
$$;


ALTER FUNCTION "public"."get_seller_operational"("p_seller_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_seller_private"("p_seller_id" "uuid") RETURNS TABLE("dintero_approval_id" "text", "dintero_contract_url" "text", "phone" "text", "organization_number" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  select s.dintero_approval_id, s.dintero_contract_url, s.phone, s.organization_number
  from public.sellers s
  where s.id = p_seller_id
    and public.is_seller_member(p_seller_id, auth.uid());
$$;


ALTER FUNCTION "public"."get_seller_private"("p_seller_id" "uuid") OWNER TO "postgres";


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
$$;


ALTER FUNCTION "public"."get_signup_by_dintero_id"("p_transaction_id" "text", "p_merchant_reference" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_platform_admin"("user_uuid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT COALESCE(
    (SELECT is_platform_admin FROM profiles WHERE id = user_uuid),
    FALSE
  );
$$;


ALTER FUNCTION "public"."is_platform_admin"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_seller_member"("p_seller_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.seller_members
    WHERE seller_id = p_seller_id AND user_id = p_user_id);
$$;


ALTER FUNCTION "public"."is_seller_member"("p_seller_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_seller_owner"("p_seller_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT EXISTS (SELECT 1 FROM public.seller_members
    WHERE seller_id = p_seller_id AND user_id = p_user_id
      AND role IN ('owner', 'admin'));
$$;


ALTER FUNCTION "public"."is_seller_owner"("p_seller_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_team_admin"("p_team_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teams t
    JOIN public.seller_members sm ON sm.seller_id = t.owner_seller_id
    WHERE t.id = p_team_id AND sm.user_id = p_user_id
      AND sm.role IN ('owner','admin')
  );
$$;


ALTER FUNCTION "public"."is_team_admin"("p_team_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_payment_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.payment_status IS NULL THEN RETURN NEW; END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.payment_status IS NOT DISTINCT FROM OLD.payment_status THEN
      RETURN NEW;
    END IF;
  END IF;
  INSERT INTO public.payment_audit_log (
    signup_id, seller_id, old_status, new_status, via_external, changed_at
  ) VALUES (
    NEW.id, NEW.seller_id,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.payment_status ELSE NULL END,
    NEW.payment_status,
    NEW.dintero_transaction_id IS NOT NULL,
    now()
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_payment_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lookup_team_invite_link"("p_code" "text") RETURNS TABLE("status" "text", "team_id" "uuid", "team_slug" "text", "team_name" "text", "team_cover_image_url" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_link public.team_invite_links;
BEGIN
  SELECT * INTO v_link FROM public.team_invite_links WHERE code = p_code;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::text, NULL::uuid, NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  IF v_link.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT 'expired'::text, NULL::uuid, NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  RETURN QUERY
    SELECT 'valid'::text, t.id, t.slug, t.name, t.cover_image_url
    FROM public.teams t
    WHERE t.id = v_link.team_id;
END;
$$;


ALTER FUNCTION "public"."lookup_team_invite_link"("p_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_seller_onboarding_complete"() RETURNS "public"."profiles"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  calling_user uuid := auth.uid();
  result public.profiles;
BEGIN
  IF calling_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.seller_members sm
    WHERE sm.user_id = calling_user
      AND sm.role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Seller ownership is required to complete seller onboarding' USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('app.profiles_server_write', 'true', true);

  UPDATE public.profiles
     SET role = 'seller',
         onboarding_completed_at = coalesce(onboarding_completed_at, now())
   WHERE id = calling_user
  RETURNING * INTO result;

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."mark_seller_onboarding_complete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."profiles_block_protected_columns"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR current_setting('app.profiles_server_write', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'profiles.role is server-controlled' USING ERRCODE = '42501';
  END IF;
  IF NEW.onboarding_completed_at IS DISTINCT FROM OLD.onboarding_completed_at THEN
    RAISE EXCEPTION 'profiles.onboarding_completed_at is server-controlled' USING ERRCODE = '42501';
  END IF;
  IF NEW.is_platform_admin IS DISTINCT FROM OLD.is_platform_admin THEN
    RAISE EXCEPTION 'profiles.is_platform_admin is server-controlled' USING ERRCODE = '42501';
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'profiles.email is server-controlled' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."profiles_block_protected_columns"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."public_signup_counts"("p_course_ids" "uuid"[]) RETURNS TABLE("course_id" "uuid", "confirmed_count" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT s.course_id, COUNT(*)::bigint
  FROM public.signups s
  WHERE s.course_id = ANY(p_course_ids)
    AND s.status = 'confirmed'
  GROUP BY s.course_id;
$$;


ALTER FUNCTION "public"."public_signup_counts"("p_course_ids" "uuid"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."public_signup_counts"("p_course_ids" "uuid"[]) IS 'Aggregate-only capacity lookup for public course pages. Returns confirmed-signup counts keyed by course_id. Never exposes row data — replaces the permissive anon SELECT policy that was dropped.';



CREATE OR REPLACE FUNCTION "public"."public_storefront_seller_ids"("p_team_slug" "text") RETURNS TABLE("team_id" "uuid", "owner_seller_id" "uuid", "seller_id" "uuid")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  WITH storefront AS (
    SELECT t.id, t.owner_seller_id
    FROM public.teams t
    WHERE lower(t.slug) = lower(trim(p_team_slug))
  )
  SELECT s.id AS team_id, s.owner_seller_id, s.owner_seller_id AS seller_id
  FROM storefront s

  UNION

  SELECT s.id AS team_id, s.owner_seller_id, ta.seller_id
  FROM storefront s
  JOIN public.team_affiliations ta
    ON ta.team_id = s.id
   AND ta.status = 'active';
$$;


ALTER FUNCTION "public"."public_storefront_seller_ids"("p_team_slug" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."public_storefront_seller_ids"("p_team_slug" "text") IS 'Public storefront scope: returns the owner seller and active collaborator sellers for a team/storefront slug.';



CREATE OR REPLACE FUNCTION "public"."reconcile_course_lifecycle"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_today date := (now() AT TIME ZONE 'Europe/Oslo')::date;
  v_count integer;
BEGIN
  WITH bounds AS (
    SELECT
      c.id,
      c.status AS current_status,
      COALESCE(
        (SELECT min(s.session_date) FROM public.course_sessions s
          WHERE s.course_id = c.id AND s.status IS DISTINCT FROM 'cancelled'),
        c.start_date
      ) AS first_day,
      COALESCE(
        (SELECT max(s.session_date) FROM public.course_sessions s
          WHERE s.course_id = c.id AND s.status IS DISTINCT FROM 'cancelled'),
        c.end_date,
        c.start_date
      ) AS last_day
    FROM public.courses c
    WHERE c.status IN ('upcoming', 'active', 'completed')  -- only published lifecycle; never draft/cancelled
  ),
  computed AS (
    SELECT
      id,
      CASE
        WHEN first_day IS NULL          THEN 'upcoming'::course_status   -- no timeline → can't advance
        WHEN v_today < first_day        THEN 'upcoming'::course_status
        WHEN v_today > last_day         THEN 'completed'::course_status
        ELSE 'active'::course_status                                     -- inclusive of first & last day
      END AS next_status
    FROM bounds
  )
  UPDATE public.courses c
  SET status = comp.next_status
  FROM computed comp
  WHERE c.id = comp.id
    AND c.status IS DISTINCT FROM comp.next_status;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."reconcile_course_lifecycle"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."redeem_team_invite_link"("p_code" "text", "p_force_leave" boolean DEFAULT false) RETURNS TABLE("status" "text", "team_id" "uuid", "existing_team_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_link public.team_invite_links;
  v_user_id uuid := auth.uid();
  v_seller_id uuid;
  v_existing_team uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_link FROM public.team_invite_links WHERE code = p_code;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::text, NULL::uuid, NULL::uuid;
    RETURN;
  END IF;
  IF v_link.revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT 'expired'::text, NULL::uuid, NULL::uuid;
    RETURN;
  END IF;

  SELECT seller_id INTO v_seller_id
  FROM public.seller_members
  WHERE user_id = v_user_id AND role = 'owner'
  LIMIT 1;

  IF v_seller_id IS NULL THEN
    RETURN QUERY SELECT 'no_seller'::text, NULL::uuid, NULL::uuid;
    RETURN;
  END IF;

  IF EXISTS(
    SELECT 1 FROM public.teams
    WHERE id = v_link.team_id AND owner_seller_id = v_seller_id
  ) THEN
    RETURN QUERY SELECT 'own_team'::text, v_link.team_id, NULL::uuid;
    RETURN;
  END IF;

  IF EXISTS(
    SELECT 1 FROM public.team_affiliations ta
    WHERE ta.team_id = v_link.team_id
      AND ta.seller_id = v_seller_id
      AND ta.status = 'active'
  ) THEN
    RETURN QUERY SELECT 'already_member'::text, v_link.team_id, NULL::uuid;
    RETURN;
  END IF;

  SELECT ta.team_id INTO v_existing_team
  FROM public.team_affiliations ta
  WHERE ta.seller_id = v_seller_id AND ta.status = 'active'
  LIMIT 1;

  IF v_existing_team IS NOT NULL AND NOT p_force_leave THEN
    RETURN QUERY SELECT 'in_other_team'::text, v_link.team_id, v_existing_team;
    RETURN;
  END IF;

  IF v_existing_team IS NOT NULL AND p_force_leave THEN
    DELETE FROM public.team_affiliations ta
    WHERE ta.seller_id = v_seller_id AND ta.status = 'active';
  END IF;

  INSERT INTO public.team_affiliations (team_id, seller_id, status, invited_by, responded_at)
  VALUES (v_link.team_id, v_seller_id, 'active', v_link.created_by, now());

  RETURN QUERY SELECT 'joined'::text, v_link.team_id, NULL::uuid;
END;
$$;


ALTER FUNCTION "public"."redeem_team_invite_link"("p_code" "text", "p_force_leave" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rename_team_slug"("p_team_id" "uuid", "p_new_slug" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  calling_user UUID := auth.uid();
  team_owner_seller_id UUID;
  current_slug TEXT;
  new_slug TEXT;
BEGIN
  IF calling_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT owner_seller_id, slug INTO team_owner_seller_id, current_slug
  FROM public.teams WHERE id = p_team_id;
  IF team_owner_seller_id IS NULL THEN
    RAISE EXCEPTION 'Team not found' USING ERRCODE = '42704';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.seller_members
    WHERE seller_id = team_owner_seller_id
      AND user_id   = calling_user
      AND role      = 'owner'
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  new_slug := public._normalize_team_slug(p_new_slug);

  -- No-op when normalized form matches current slug.
  IF lower(current_slug) = new_slug THEN
    RETURN current_slug;
  END IF;

  -- Conflict against another team's current slug.
  IF EXISTS (
    SELECT 1 FROM public.teams
    WHERE lower(slug) = new_slug AND id <> p_team_id
  ) THEN
    RAISE EXCEPTION 'Slug already taken' USING ERRCODE = '23505';
  END IF;

  -- Conflict against another team's archived alias. A team can reclaim its
  -- own former alias — we drop that row below.
  IF EXISTS (
    SELECT 1 FROM public.team_slug_aliases
    WHERE lower(old_slug) = new_slug AND team_id <> p_team_id
  ) THEN
    RAISE EXCEPTION 'Slug already taken' USING ERRCODE = '23505';
  END IF;

  -- Archive the previous slug so old links keep working.
  INSERT INTO public.team_slug_aliases (old_slug, team_id)
  VALUES (current_slug, p_team_id)
  ON CONFLICT (old_slug) DO NOTHING;

  -- Drop alias row if the team is reclaiming its own old slug.
  DELETE FROM public.team_slug_aliases
  WHERE team_id = p_team_id AND lower(old_slug) = new_slug;

  UPDATE public.teams SET slug = new_slug WHERE id = p_team_id;
  -- Keep teams.name aligned with sellers.name elsewhere; name is not touched here.

  RETURN new_slug;
END;
$$;


ALTER FUNCTION "public"."rename_team_slug"("p_team_id" "uuid", "p_new_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_user_role"("p_role" "text") RETURNS "public"."profiles"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  calling_user uuid := auth.uid();
  result public.profiles;
BEGIN
  IF calling_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF p_role IS NOT NULL AND p_role NOT IN ('buyer', 'seller') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('app.profiles_server_write', 'true', true);

  UPDATE public.profiles
     SET role = p_role
   WHERE id = calling_user
     AND onboarding_completed_at IS NULL
  RETURNING * INTO result;

  IF result.id IS NULL THEN
    SELECT * INTO result FROM public.profiles WHERE id = calling_user;
    IF result.id IS NULL THEN
      RAISE EXCEPTION 'Profile not found' USING ERRCODE = 'P0002';
    END IF;
    IF result.role IS DISTINCT FROM p_role THEN
      RAISE EXCEPTION 'Cannot change role after onboarding is complete' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."set_user_role"("p_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."signups_refund_implies_cancel"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  IF NEW.payment_status = 'refunded' AND NEW.status = 'confirmed' THEN
    NEW.status := 'cancelled';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."signups_refund_implies_cancel"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."signups_set_cancelled_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  IF NEW.status IN ('cancelled', 'course_cancelled')
     AND NEW.cancelled_at IS NULL
     AND (TG_OP = 'INSERT' OR OLD.status NOT IN ('cancelled', 'course_cancelled'))
  THEN
    NEW.cancelled_at := now();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."signups_set_cancelled_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."storage_can_write_course_image"("p_object_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'storage'
    AS $_$
DECLARE
  parts text[] := storage.foldername(p_object_name);
  calling_user uuid := auth.uid();
  course_id_text text;
BEGIN
  IF calling_user IS NULL OR array_length(parts, 1) < 2 OR parts[1] <> 'courses' THEN
    RETURN false;
  END IF;

  course_id_text := parts[2];
  IF course_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.courses c
    WHERE c.id = course_id_text::uuid
      AND public.is_seller_member(c.seller_id, calling_user)
  );
END;
$_$;


ALTER FUNCTION "public"."storage_can_write_course_image"("p_object_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."storage_can_write_seller_logo"("p_object_name" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public', 'storage'
    AS $_$
DECLARE
  parts text[] := storage.foldername(p_object_name);
  calling_user uuid := auth.uid();
  seller_id_text text;
BEGIN
  IF calling_user IS NULL OR array_length(parts, 1) < 1 THEN
    RETURN false;
  END IF;

  seller_id_text := parts[1];
  IF seller_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN false;
  END IF;

  RETURN public.is_seller_member(seller_id_text::uuid, calling_user);
END;
$_$;


ALTER FUNCTION "public"."storage_can_write_seller_logo"("p_object_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tg_teams_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."tg_teams_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_course_sessions_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_course_sessions_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_sessions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "session_number" integer NOT NULL,
    "session_date" "date" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone,
    "status" "text" DEFAULT 'upcoming'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "course_sessions_status_check" CHECK (("status" = ANY (ARRAY['upcoming'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."course_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_signup_packages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "weeks" integer,
    "label" "text" NOT NULL,
    "price" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "ticket_kind" "public"."ticket_kind_t" DEFAULT 'package'::"public"."ticket_kind_t" NOT NULL,
    "audience" "public"."ticket_audience_t" DEFAULT 'standard'::"public"."ticket_audience_t" NOT NULL,
    "description" "text",
    "sales_starts_at" timestamp with time zone,
    "sales_ends_at" timestamp with time zone,
    "max_quantity" integer,
    "is_active" boolean DEFAULT true NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "drop_in_no_weeks" CHECK ((("ticket_kind" <> 'drop_in'::"public"."ticket_kind_t") OR ("weeks" IS NULL))),
    CONSTRAINT "max_quantity_positive" CHECK ((("max_quantity" IS NULL) OR ("max_quantity" > 0))),
    CONSTRAINT "package_has_weeks" CHECK ((("ticket_kind" <> 'package'::"public"."ticket_kind_t") OR ("weeks" IS NOT NULL))),
    CONSTRAINT "price_non_negative" CHECK (("price" >= (0)::numeric)),
    CONSTRAINT "sales_window_valid" CHECK ((("sales_ends_at" IS NULL) OR ("sales_starts_at" IS NULL) OR ("sales_ends_at" > "sales_starts_at")))
);


ALTER TABLE "public"."course_signup_packages" OWNER TO "postgres";


COMMENT ON COLUMN "public"."course_signup_packages"."ticket_kind" IS 'package | drop_in | pass. Determines whether the buyer occupies a window of sessions or a single one.';



COMMENT ON COLUMN "public"."course_signup_packages"."audience" IS 'Who the ticket is for (standard / student / senior / staff). Pricing math lives in the price column, not here.';



COMMENT ON COLUMN "public"."course_signup_packages"."sales_starts_at" IS 'Inclusive lower bound for when this tier is buyable. NULL = no lower bound.';



COMMENT ON COLUMN "public"."course_signup_packages"."sales_ends_at" IS 'Exclusive cutoff for sale (used by early-bird). NULL = no time limit.';



COMMENT ON COLUMN "public"."course_signup_packages"."max_quantity" IS 'Course-wide cap on this ticket type, summed across ALL sessions. NULL = unlimited. NOT per-session.';



COMMENT ON COLUMN "public"."course_signup_packages"."is_default" IS 'Pre-selected option in BookingPanel. At most one per course (enforced by partial unique index).';



COMMENT ON COLUMN "public"."course_signup_packages"."display_order" IS 'Teacher-controlled order in the public picker. Lower = earlier. Replaces legacy sort_order.';



CREATE TABLE IF NOT EXISTS "public"."course_team_listings" (
    "course_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."course_team_listings" OWNER TO "postgres";


COMMENT ON TABLE "public"."course_team_listings" IS 'Per-course opt-in: which courses appear on which (foreign) team storefronts. RLS requires an ACTIVE team_affiliation between the course''s owning seller and the team for INSERT.';



CREATE TABLE IF NOT EXISTS "public"."courses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "seller_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "status" "public"."course_status" DEFAULT 'draft'::"public"."course_status" NOT NULL,
    "location" "text",
    "time_schedule" "text",
    "duration" integer,
    "max_participants" integer,
    "price" numeric(10,2),
    "total_weeks" integer,
    "start_date" "date",
    "end_date" "date",
    "instructor_id" "uuid",
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "idempotency_key" "text",
    "slug" "text" NOT NULL,
    "format" "public"."course_format" DEFAULT 'single'::"public"."course_format" NOT NULL,
    "delivery_mode" "public"."delivery_mode" DEFAULT 'in_person'::"public"."delivery_mode" NOT NULL,
    "instructor_name" "text",
    "accepts_late_signups" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."courses" OWNER TO "postgres";


COMMENT ON COLUMN "public"."courses"."idempotency_key" IS 'Client-generated unique key to prevent duplicate course creation.
Generated once when form loads, sent with create request.
If a request fails and is retried, same key returns existing course.';



COMMENT ON COLUMN "public"."courses"."slug" IS 'Public URL fragment: /<team-slug>/<course-slug>. Generated from title at insert; editable while status = draft, locked after publish. Globally unique. Hard-deleted courses (no signups) free their slug; cancelled courses keep theirs to preserve receipt-link integrity.';



COMMENT ON COLUMN "public"."courses"."format" IS 'single = one session (event/workshop); series = multiple sessions (weekly course, multi-day intensive).';



COMMENT ON COLUMN "public"."courses"."delivery_mode" IS 'in_person or online. Hybrid intentionally omitted until needed.';



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" bigint NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "seller_id" "uuid" NOT NULL,
    "actor_id" "uuid",
    "type" "text" NOT NULL,
    "action_required" boolean DEFAULT false NOT NULL,
    "dedupe_key" "text",
    "title" "text" NOT NULL,
    "body" "text",
    "action_url" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "seen_at" timestamp with time zone,
    "read_at" timestamp with time zone,
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON COLUMN "public"."notifications"."seller_id" IS 'Tenant scope. Matches courses.seller_id et al — the studio/business that owns the event. Recipient is normally the seller; differs only when team members get fanout (future).';



COMMENT ON COLUMN "public"."notifications"."dedupe_key" IS 'Stable key per real-world event to make inserts idempotent under webhook/cron retries. Pattern: <event_type>:<entity_id>.';



COMMENT ON COLUMN "public"."notifications"."seen_at" IS 'Set when the recipient opens the popover. Clears the bell dot. Distinct from read_at, which requires an explicit row click.';



COMMENT ON COLUMN "public"."notifications"."read_at" IS 'Set when the recipient clicks the row or uses "Marker alle som lest". Dims the row visually but keeps it in the feed.';



COMMENT ON COLUMN "public"."notifications"."resolved_at" IS 'Only meaningful when action_required = true. Set when the underlying action is handled (e.g., KYC docs uploaded). Clears the amber bell dot for that row.';



ALTER TABLE "public"."notifications" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."notifications_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."payment_attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "seller_id" "uuid" NOT NULL,
    "participant_name" "text" NOT NULL,
    "participant_email" "text" NOT NULL,
    "participant_phone" "text",
    "course_session_id" "uuid",
    "base_price_nok" numeric(10,2) NOT NULL,
    "service_fee_nok" numeric(10,2) DEFAULT 0 NOT NULL,
    "total_price_nok" numeric(10,2) NOT NULL,
    "existing_signup_id" "uuid",
    "dintero_session_id" "text",
    "dintero_transaction_id" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ticket_type_id" "uuid",
    "ticket_label_snapshot" "text",
    "ticket_audience_snapshot" "public"."ticket_audience_t",
    "ticket_kind_snapshot" "public"."ticket_kind_t",
    "payment_product" "text",
    CONSTRAINT "payment_attempts_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'authorized'::"text", 'captured'::"text", 'failed'::"text", 'voided'::"text", 'refunded'::"text"])))
);


ALTER TABLE "public"."payment_attempts" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_attempts" IS 'Holds the pre-payment context that used to live in Stripe metadata. Keyed by a UUID we pass to Dintero as order.merchant_reference; looked up by the webhook handler.';



CREATE TABLE IF NOT EXISTS "public"."payment_audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "signup_id" "uuid" NOT NULL,
    "seller_id" "uuid" NOT NULL,
    "old_status" "public"."payment_status",
    "new_status" "public"."payment_status" NOT NULL,
    "via_external" boolean NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."payment_audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."processed_webhook_events" (
    "event_id" "text" NOT NULL,
    "event_type" "text" NOT NULL,
    "processed_at" timestamp with time zone DEFAULT "now"(),
    "result" "jsonb"
);


ALTER TABLE "public"."processed_webhook_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."processed_webhook_events" IS 'Idempotency record for Dintero webhook events. Prevents double-processing on retries.';



CREATE TABLE IF NOT EXISTS "public"."seller_members" (
    "seller_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."seller_member_role" DEFAULT 'admin'::"public"."seller_member_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."seller_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sellers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "logo_url" "text",
    "email" "text",
    "phone" "text",
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "dintero_seller_id" "text",
    "dintero_approval_id" "text",
    "dintero_contract_url" "text",
    "dintero_onboarding_status" "text",
    "dintero_onboarding_complete" boolean DEFAULT false NOT NULL,
    "seller_type" "text" DEFAULT 'individual'::"text" NOT NULL,
    "organization_number" "text",
    CONSTRAINT "organizations_dintero_onboarding_status_check" CHECK (("dintero_onboarding_status" = ANY (ARRAY['PENDING'::"text", 'WAITING_FOR_DECLARATION'::"text", 'WAITING_FOR_SIGNATURE'::"text", 'ACTIVE'::"text", 'DECLINED'::"text", 'TERMINATED'::"text"]))),
    CONSTRAINT "sellers_seller_type_check" CHECK (("seller_type" = ANY (ARRAY['individual'::"text", 'business'::"text"])))
);


ALTER TABLE "public"."sellers" OWNER TO "postgres";


COMMENT ON COLUMN "public"."sellers"."dintero_seller_id" IS 'Platform-assigned seller identifier echoed back in payout_destination_id on checkout sessions.';



COMMENT ON COLUMN "public"."sellers"."dintero_approval_id" IS 'Dintero approval ID from POST /v1/accounts/{aid}/management/settings/approvals/payout-destinations.';



COMMENT ON COLUMN "public"."sellers"."dintero_contract_url" IS 'Hosted KYC URL returned in links[rel=contract_url] — sent to the teacher to complete onboarding.';



COMMENT ON COLUMN "public"."sellers"."seller_type" IS 'Set at onboarding from the Privatperson/Bedrift question. Drives KYC routing and dashboard copy.';



COMMENT ON COLUMN "public"."sellers"."organization_number" IS 'Norwegian organisasjonsnummer (9 digits). NULL until Dintero onboarding collects it.';



CREATE TABLE IF NOT EXISTS "public"."signups" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "seller_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "participant_name" "text" NOT NULL,
    "participant_email" "text" NOT NULL,
    "participant_phone" "text",
    "status" "public"."signup_status" DEFAULT 'confirmed'::"public"."signup_status" NOT NULL,
    "note" "text",
    "payment_status" "public"."payment_status" DEFAULT 'pending'::"public"."payment_status",
    "amount_paid" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "package_end_date" "date",
    "refund_amount" numeric(10,2),
    "refunded_at" timestamp with time zone,
    "dintero_transaction_id" "text",
    "dintero_session_id" "text",
    "dintero_merchant_reference" "text",
    "ticket_type_id" "uuid" NOT NULL,
    "ticket_label_snapshot" "text" NOT NULL,
    "ticket_audience_snapshot" "public"."ticket_audience_t" NOT NULL,
    "ticket_kind_snapshot" "public"."ticket_kind_t" NOT NULL,
    "course_session_id" "uuid",
    "buyer_id" "uuid",
    "confirmation_sent_at" timestamp with time zone,
    "payment_product" "text",
    "cancelled_at" timestamp with time zone
);


ALTER TABLE "public"."signups" OWNER TO "postgres";


COMMENT ON COLUMN "public"."signups"."participant_name" IS 'Full name of the participant (required for all signups)';



COMMENT ON COLUMN "public"."signups"."participant_email" IS 'Email address of the participant (required for all signups)';



COMMENT ON COLUMN "public"."signups"."participant_phone" IS 'Phone number of the participant (optional)';



COMMENT ON COLUMN "public"."signups"."ticket_type_id" IS 'FK to the ticket type purchased. NULL only on legacy rows from before this migration.';



COMMENT ON COLUMN "public"."signups"."ticket_label_snapshot" IS 'Write-once at signup time. Receipts and historical reporting read this, not the (mutable) FK row.';



COMMENT ON COLUMN "public"."signups"."ticket_audience_snapshot" IS 'Write-once at signup time. Used by teacher rosters to know which signups need verification at the door.';



COMMENT ON COLUMN "public"."signups"."ticket_kind_snapshot" IS 'Write-once at signup time. Lets reporting distinguish drop-ins from package buyers without joining.';



COMMENT ON COLUMN "public"."signups"."course_session_id" IS 'Set only when ticket_kind_snapshot = ''drop_in''. FK to the specific session the buyer purchased. NULL for package buyers (their "which sessions" is derived from start_date + package_end_date).';



COMMENT ON COLUMN "public"."signups"."buyer_id" IS 'Logged-in buyer profile. NULL for guest checkouts.';



CREATE TABLE IF NOT EXISTS "public"."teacher_locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "seller_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "rooms" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "address" "text"
);


ALTER TABLE "public"."teacher_locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_affiliations" (
    "team_id" "uuid" NOT NULL,
    "seller_id" "uuid" NOT NULL,
    "status" "text" NOT NULL,
    "invited_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "responded_at" timestamp with time zone,
    CONSTRAINT "team_affiliations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'declined'::"text"])))
);


ALTER TABLE "public"."team_affiliations" OWNER TO "postgres";


COMMENT ON TABLE "public"."team_affiliations" IS 'Studio/venue teams invite freelancer sellers to advertise courses on their storefront. Studio-initiated; freelancer accepts. Self-affiliation is implicit and not represented here.';



CREATE TABLE IF NOT EXISTS "public"."team_slug_aliases" (
    "old_slug" "text" NOT NULL,
    "team_id" "uuid" NOT NULL,
    "archived_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."team_slug_aliases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "cover_image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "owner_seller_id" "uuid" NOT NULL,
    "default_course_image_url" "text"
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


COMMENT ON TABLE "public"."teams" IS 'Public storefront owned by a seller (1:1 via owner_seller_id). Renders at the flat root URL /<slug>. Other sellers can syndicate their courses here via team_affiliations + course_team_listings (studio-initiated, freelancer accepts).';



COMMENT ON COLUMN "public"."teams"."owner_seller_id" IS 'The seller that owns this team brand. Member sellers list courses on it.';



COMMENT ON COLUMN "public"."teams"."default_course_image_url" IS 'Fallback hero image for courses on this team that have no own image_url.';



CREATE TABLE IF NOT EXISTS "public"."waitlist" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "source" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "waitlist_email_format" CHECK (("email" ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'::"text")),
    CONSTRAINT "waitlist_email_length" CHECK ((("char_length"("email") >= 3) AND ("char_length"("email") <= 254))),
    CONSTRAINT "waitlist_source_length" CHECK ((("source" IS NULL) OR ("char_length"("source") <= 120)))
);


ALTER TABLE "public"."waitlist" OWNER TO "postgres";


COMMENT ON TABLE "public"."waitlist" IS 'Pre-launch interest list. Anon insert only; reads via service role.';



ALTER TABLE ONLY "public"."course_sessions"
    ADD CONSTRAINT "course_sessions_course_id_session_number_key" UNIQUE ("course_id", "session_number");



ALTER TABLE ONLY "public"."course_sessions"
    ADD CONSTRAINT "course_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_signup_packages"
    ADD CONSTRAINT "course_signup_packages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_team_listings"
    ADD CONSTRAINT "course_team_listings_pkey" PRIMARY KEY ("course_id", "team_id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_slug_unique" UNIQUE ("slug");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_attempts"
    ADD CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_audit_log"
    ADD CONSTRAINT "payment_audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."processed_webhook_events"
    ADD CONSTRAINT "processed_webhook_events_pkey" PRIMARY KEY ("event_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seller_members"
    ADD CONSTRAINT "seller_members_pkey" PRIMARY KEY ("seller_id", "user_id");



ALTER TABLE ONLY "public"."sellers"
    ADD CONSTRAINT "sellers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."signups"
    ADD CONSTRAINT "signups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teacher_locations"
    ADD CONSTRAINT "teacher_locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_affiliations"
    ADD CONSTRAINT "team_affiliations_pkey" PRIMARY KEY ("team_id", "seller_id");



ALTER TABLE ONLY "public"."team_invite_links"
    ADD CONSTRAINT "team_invite_links_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."team_invite_links"
    ADD CONSTRAINT "team_invite_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_slug_aliases"
    ADD CONSTRAINT "team_slug_aliases_pkey" PRIMARY KEY ("old_slug");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_owner_seller_id_key" UNIQUE ("owner_seller_id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."waitlist"
    ADD CONSTRAINT "waitlist_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "courses_slug_lower_idx" ON "public"."courses" USING "btree" ("lower"("slug"));



CREATE INDEX "idx_course_sessions_course" ON "public"."course_sessions" USING "btree" ("course_id");



CREATE INDEX "idx_course_sessions_date" ON "public"."course_sessions" USING "btree" ("session_date");



CREATE INDEX "idx_course_sessions_status" ON "public"."course_sessions" USING "btree" ("status");



CREATE INDEX "idx_course_signup_packages_course" ON "public"."course_signup_packages" USING "btree" ("course_id");



CREATE INDEX "idx_course_team_listings_team" ON "public"."course_team_listings" USING "btree" ("team_id");



CREATE UNIQUE INDEX "idx_courses_idempotency" ON "public"."courses" USING "btree" ("seller_id", "idempotency_key") WHERE ("idempotency_key" IS NOT NULL);



CREATE INDEX "idx_courses_instructor" ON "public"."courses" USING "btree" ("instructor_id") WHERE ("instructor_id" IS NOT NULL);



CREATE INDEX "idx_courses_seller" ON "public"."courses" USING "btree" ("seller_id");



CREATE INDEX "idx_courses_start_date" ON "public"."courses" USING "btree" ("start_date");



CREATE INDEX "idx_courses_status" ON "public"."courses" USING "btree" ("status");



CREATE INDEX "idx_notifications_actor_id" ON "public"."notifications" USING "btree" ("actor_id");



CREATE INDEX "idx_notifications_seller_id" ON "public"."notifications" USING "btree" ("seller_id");



CREATE INDEX "idx_payment_attempts_course_id" ON "public"."payment_attempts" USING "btree" ("course_id");



CREATE INDEX "idx_payment_attempts_existing_signup" ON "public"."payment_attempts" USING "btree" ("existing_signup_id") WHERE ("existing_signup_id" IS NOT NULL);



CREATE INDEX "idx_payment_attempts_organization" ON "public"."payment_attempts" USING "btree" ("seller_id");



CREATE INDEX "idx_payment_attempts_session_id" ON "public"."payment_attempts" USING "btree" ("course_session_id");



CREATE INDEX "idx_payment_attempts_ticket_type" ON "public"."payment_attempts" USING "btree" ("ticket_type_id");



CREATE INDEX "idx_seller_members_seller" ON "public"."seller_members" USING "btree" ("seller_id");



CREATE INDEX "idx_seller_members_user" ON "public"."seller_members" USING "btree" ("user_id");



CREATE INDEX "idx_signups_buyer_id" ON "public"."signups" USING "btree" ("buyer_id");



CREATE INDEX "idx_signups_course" ON "public"."signups" USING "btree" ("course_id");



CREATE INDEX "idx_signups_course_session" ON "public"."signups" USING "btree" ("course_session_id");



CREATE INDEX "idx_signups_dintero_merchant_reference" ON "public"."signups" USING "btree" ("dintero_merchant_reference") WHERE ("dintero_merchant_reference" IS NOT NULL);



CREATE INDEX "idx_signups_guest_email" ON "public"."signups" USING "btree" ("participant_email");



CREATE INDEX "idx_signups_seller" ON "public"."signups" USING "btree" ("seller_id");



CREATE INDEX "idx_signups_status" ON "public"."signups" USING "btree" ("status");



CREATE INDEX "idx_signups_ticket_type" ON "public"."signups" USING "btree" ("ticket_type_id");



CREATE INDEX "idx_teacher_locations_org" ON "public"."teacher_locations" USING "btree" ("seller_id");



CREATE INDEX "idx_team_affiliations_invited_by" ON "public"."team_affiliations" USING "btree" ("invited_by");



CREATE INDEX "idx_team_affiliations_seller" ON "public"."team_affiliations" USING "btree" ("seller_id", "status");



CREATE INDEX "idx_team_invite_links_code" ON "public"."team_invite_links" USING "btree" ("code");



CREATE INDEX "idx_team_invite_links_created_by" ON "public"."team_invite_links" USING "btree" ("created_by");



CREATE INDEX "idx_team_invite_links_team_active" ON "public"."team_invite_links" USING "btree" ("team_id") WHERE ("revoked_at" IS NULL);



CREATE INDEX "idx_teams_owner_seller" ON "public"."teams" USING "btree" ("owner_seller_id");



CREATE INDEX "idx_webhook_events_processed_at" ON "public"."processed_webhook_events" USING "btree" ("processed_at");



CREATE INDEX "idx_webhook_events_type" ON "public"."processed_webhook_events" USING "btree" ("event_type");



CREATE INDEX "notifications_recipient_action" ON "public"."notifications" USING "btree" ("recipient_id") WHERE ("action_required" AND ("resolved_at" IS NULL));



CREATE INDEX "notifications_recipient_created" ON "public"."notifications" USING "btree" ("recipient_id", "created_at" DESC);



CREATE UNIQUE INDEX "notifications_recipient_dedupe_key_unique" ON "public"."notifications" USING "btree" ("recipient_id", "dedupe_key") WHERE ("dedupe_key" IS NOT NULL);



CREATE INDEX "notifications_recipient_read_created" ON "public"."notifications" USING "btree" ("recipient_id", "read_at", "created_at" DESC);



CREATE INDEX "notifications_recipient_unread" ON "public"."notifications" USING "btree" ("recipient_id") WHERE ("read_at" IS NULL);



CREATE INDEX "notifications_recipient_unseen" ON "public"."notifications" USING "btree" ("recipient_id") WHERE ("seen_at" IS NULL);



CREATE UNIQUE INDEX "one_default_per_course" ON "public"."course_signup_packages" USING "btree" ("course_id") WHERE "is_default";



CREATE UNIQUE INDEX "payment_attempts_dintero_session_id_key" ON "public"."payment_attempts" USING "btree" ("dintero_session_id") WHERE ("dintero_session_id" IS NOT NULL);



CREATE UNIQUE INDEX "payment_attempts_dintero_transaction_id_key" ON "public"."payment_attempts" USING "btree" ("dintero_transaction_id") WHERE ("dintero_transaction_id" IS NOT NULL);



CREATE INDEX "payment_audit_log_org_changed_at_idx" ON "public"."payment_audit_log" USING "btree" ("seller_id", "changed_at" DESC);



CREATE INDEX "payment_audit_log_signup_id_changed_at_idx" ON "public"."payment_audit_log" USING "btree" ("signup_id", "changed_at" DESC);



CREATE INDEX "signups_confirmation_pending" ON "public"."signups" USING "btree" ("created_at") WHERE (("payment_status" = 'paid'::"public"."payment_status") AND ("confirmation_sent_at" IS NULL));



CREATE UNIQUE INDEX "signups_dintero_transaction_id_key" ON "public"."signups" USING "btree" ("dintero_transaction_id") WHERE ("dintero_transaction_id" IS NOT NULL);



CREATE UNIQUE INDEX "team_slug_aliases_lower_idx" ON "public"."team_slug_aliases" USING "btree" ("lower"("old_slug"));



CREATE INDEX "team_slug_aliases_team_id_idx" ON "public"."team_slug_aliases" USING "btree" ("team_id");



CREATE UNIQUE INDEX "teams_slug_lower_idx" ON "public"."teams" USING "btree" ("lower"("slug"));



CREATE UNIQUE INDEX "unique_active_non_drop_in_signup_per_course_email" ON "public"."signups" USING "btree" ("course_id", "participant_email") WHERE (("status" = 'confirmed'::"public"."signup_status") AND ("ticket_kind_snapshot" <> 'drop_in'::"public"."ticket_kind_t"));



CREATE UNIQUE INDEX "waitlist_email_lower_idx" ON "public"."waitlist" USING "btree" ("lower"("email"));



CREATE OR REPLACE TRIGGER "course_sessions_updated_at" BEFORE UPDATE ON "public"."course_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_course_sessions_updated_at"();



CREATE OR REPLACE TRIGGER "enforce_course_publish_requires_dintero" BEFORE INSERT OR UPDATE OF "status" ON "public"."courses" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_course_publish_requires_dintero"();



CREATE OR REPLACE TRIGGER "payment_attempts_updated_at" BEFORE UPDATE ON "public"."payment_attempts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "profiles_protect_columns" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."profiles_block_protected_columns"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."teacher_locations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "signups_payment_status_audit" AFTER INSERT OR UPDATE OF "payment_status" ON "public"."signups" FOR EACH ROW EXECUTE FUNCTION "public"."log_payment_status_change"();



CREATE OR REPLACE TRIGGER "signups_refund_implies_cancel_trigger" BEFORE INSERT OR UPDATE ON "public"."signups" FOR EACH ROW EXECUTE FUNCTION "public"."signups_refund_implies_cancel"();



CREATE OR REPLACE TRIGGER "signups_set_cancelled_at_trigger" BEFORE INSERT OR UPDATE ON "public"."signups" FOR EACH ROW EXECUTE FUNCTION "public"."signups_set_cancelled_at"();



CREATE OR REPLACE TRIGGER "team_affiliations_cleanup_listings" AFTER DELETE OR UPDATE ON "public"."team_affiliations" FOR EACH ROW EXECUTE FUNCTION "public"."cleanup_course_listings_on_affiliation_change"();



CREATE OR REPLACE TRIGGER "tg_teams_updated_at" BEFORE UPDATE ON "public"."teams" FOR EACH ROW EXECUTE FUNCTION "public"."tg_teams_updated_at"();



CREATE OR REPLACE TRIGGER "update_course_signup_packages_updated_at" BEFORE UPDATE ON "public"."course_signup_packages" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_courses_updated_at" BEFORE UPDATE ON "public"."courses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organizations_updated_at" BEFORE UPDATE ON "public"."sellers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_signups_updated_at" BEFORE UPDATE ON "public"."signups" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."course_sessions"
    ADD CONSTRAINT "course_sessions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_signup_packages"
    ADD CONSTRAINT "course_signup_packages_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_team_listings"
    ADD CONSTRAINT "course_team_listings_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_team_listings"
    ADD CONSTRAINT "course_team_listings_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."courses"
    ADD CONSTRAINT "courses_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_attempts"
    ADD CONSTRAINT "payment_attempts_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_attempts"
    ADD CONSTRAINT "payment_attempts_course_session_id_fkey" FOREIGN KEY ("course_session_id") REFERENCES "public"."course_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payment_attempts"
    ADD CONSTRAINT "payment_attempts_existing_signup_id_fkey" FOREIGN KEY ("existing_signup_id") REFERENCES "public"."signups"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payment_attempts"
    ADD CONSTRAINT "payment_attempts_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_attempts"
    ADD CONSTRAINT "payment_attempts_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "public"."course_signup_packages"("id");



ALTER TABLE ONLY "public"."payment_audit_log"
    ADD CONSTRAINT "payment_audit_log_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_audit_log"
    ADD CONSTRAINT "payment_audit_log_signup_id_fkey" FOREIGN KEY ("signup_id") REFERENCES "public"."signups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."seller_members"
    ADD CONSTRAINT "seller_members_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."seller_members"
    ADD CONSTRAINT "seller_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."signups"
    ADD CONSTRAINT "signups_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."signups"
    ADD CONSTRAINT "signups_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."signups"
    ADD CONSTRAINT "signups_course_session_id_fkey" FOREIGN KEY ("course_session_id") REFERENCES "public"."course_sessions"("id");



ALTER TABLE ONLY "public"."signups"
    ADD CONSTRAINT "signups_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."signups"
    ADD CONSTRAINT "signups_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "public"."course_signup_packages"("id");



ALTER TABLE ONLY "public"."teacher_locations"
    ADD CONSTRAINT "teacher_locations_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_affiliations"
    ADD CONSTRAINT "team_affiliations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."team_affiliations"
    ADD CONSTRAINT "team_affiliations_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "public"."sellers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_affiliations"
    ADD CONSTRAINT "team_affiliations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_invite_links"
    ADD CONSTRAINT "team_invite_links_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."team_invite_links"
    ADD CONSTRAINT "team_invite_links_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_slug_aliases"
    ADD CONSTRAINT "team_slug_aliases_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_owner_seller_id_fkey" FOREIGN KEY ("owner_seller_id") REFERENCES "public"."sellers"("id") ON DELETE CASCADE;



CREATE POLICY "Profiles INSERT own" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Profiles SELECT" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_platform_admin"(( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Profiles UPDATE own" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "Sellers INSERT service" ON "public"."sellers" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Sellers SELECT public" ON "public"."sellers" FOR SELECT USING (true);



CREATE POLICY "Service role can insert profiles" ON "public"."profiles" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "Service role only" ON "public"."processed_webhook_events" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Teams SELECT public" ON "public"."teams" FOR SELECT USING (true);



ALTER TABLE "public"."course_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "course_sessions_delete_member" ON "public"."course_sessions" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "course_sessions"."course_id") AND "public"."is_seller_member"("c"."seller_id", ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "course_sessions_insert_member" ON "public"."course_sessions" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "course_sessions"."course_id") AND "public"."is_seller_member"("c"."seller_id", ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "course_sessions_select_authenticated" ON "public"."course_sessions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "course_sessions"."course_id") AND (("c"."status" = ANY (ARRAY['active'::"public"."course_status", 'upcoming'::"public"."course_status", 'cancelled'::"public"."course_status"])) OR "public"."is_seller_member"("c"."seller_id", ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "course_sessions_select_public" ON "public"."course_sessions" FOR SELECT TO "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "course_sessions"."course_id") AND ("c"."status" = ANY (ARRAY['active'::"public"."course_status", 'upcoming'::"public"."course_status", 'cancelled'::"public"."course_status"]))))));



CREATE POLICY "course_sessions_update_member" ON "public"."course_sessions" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "course_sessions"."course_id") AND "public"."is_seller_member"("c"."seller_id", ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "course_sessions"."course_id") AND "public"."is_seller_member"("c"."seller_id", ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."course_signup_packages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "course_signup_packages_delete_member" ON "public"."course_signup_packages" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "course_signup_packages"."course_id") AND "public"."is_seller_member"("c"."seller_id", ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "course_signup_packages_insert_member" ON "public"."course_signup_packages" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "course_signup_packages"."course_id") AND "public"."is_seller_member"("c"."seller_id", ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "course_signup_packages_select_authenticated" ON "public"."course_signup_packages" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "course_signup_packages"."course_id") AND "public"."is_seller_member"("c"."seller_id", ( SELECT "auth"."uid"() AS "uid"))))) OR (("is_active" = true) AND (("sales_starts_at" IS NULL) OR ("sales_starts_at" <= "now"())) AND (("sales_ends_at" IS NULL) OR ("sales_ends_at" > "now"())) AND (EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "course_signup_packages"."course_id") AND ("c"."status" <> 'draft'::"public"."course_status")))))));



CREATE POLICY "course_signup_packages_select_public" ON "public"."course_signup_packages" FOR SELECT TO "anon" USING ((("is_active" = true) AND (("sales_starts_at" IS NULL) OR ("sales_starts_at" <= "now"())) AND (("sales_ends_at" IS NULL) OR ("sales_ends_at" > "now"())) AND (EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "course_signup_packages"."course_id") AND ("c"."status" <> 'draft'::"public"."course_status"))))));



CREATE POLICY "course_signup_packages_update_member" ON "public"."course_signup_packages" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "course_signup_packages"."course_id") AND "public"."is_seller_member"("c"."seller_id", ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."courses" "c"
  WHERE (("c"."id" = "course_signup_packages"."course_id") AND "public"."is_seller_member"("c"."seller_id", ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."course_team_listings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "course_team_listings_delete" ON "public"."course_team_listings" FOR DELETE TO "authenticated" USING ("public"."is_seller_member"(( SELECT "c"."seller_id"
   FROM "public"."courses" "c"
  WHERE ("c"."id" = "course_team_listings"."course_id")), ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "course_team_listings_insert" ON "public"."course_team_listings" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_seller_member"(( SELECT "c"."seller_id"
   FROM "public"."courses" "c"
  WHERE ("c"."id" = "course_team_listings"."course_id")), ( SELECT "auth"."uid"() AS "uid")) AND (EXISTS ( SELECT 1
   FROM "public"."team_affiliations" "ta"
  WHERE (("ta"."team_id" = "course_team_listings"."team_id") AND ("ta"."seller_id" = ( SELECT "c"."seller_id"
           FROM "public"."courses" "c"
          WHERE ("c"."id" = "course_team_listings"."course_id"))) AND ("ta"."status" = 'active'::"text"))))));



CREATE POLICY "course_team_listings_read_public" ON "public"."course_team_listings" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."courses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "courses_delete_member" ON "public"."courses" FOR DELETE TO "authenticated" USING ("public"."is_seller_member"("seller_id", ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "courses_insert_member" ON "public"."courses" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_seller_member"("seller_id", ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "courses_select_authenticated" ON "public"."courses" FOR SELECT TO "authenticated" USING ((("status" <> 'draft'::"public"."course_status") OR "public"."is_seller_member"("seller_id", ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "courses_select_public" ON "public"."courses" FOR SELECT TO "anon" USING (("status" <> 'draft'::"public"."course_status"));



CREATE POLICY "courses_update_member" ON "public"."courses" FOR UPDATE TO "authenticated" USING ("public"."is_seller_member"("seller_id", ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_seller_member"("seller_id", ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_select_own" ON "public"."notifications" FOR SELECT TO "authenticated" USING (("recipient_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "notifications_update_own" ON "public"."notifications" FOR UPDATE TO "authenticated" USING (("recipient_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("recipient_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."payment_attempts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payment_attempts_select_member" ON "public"."payment_attempts" FOR SELECT TO "authenticated" USING ("public"."is_seller_member"("seller_id", ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."payment_audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payment_audit_log_select_member" ON "public"."payment_audit_log" FOR SELECT TO "authenticated" USING ("public"."is_seller_member"("seller_id", ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."processed_webhook_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."seller_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "seller_members service" ON "public"."seller_members" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "seller_members_delete_owner" ON "public"."seller_members" FOR DELETE TO "authenticated" USING (("public"."is_seller_owner"("seller_id", ( SELECT "auth"."uid"() AS "uid")) AND ("user_id" <> ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "seller_members_insert_owner" ON "public"."seller_members" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_seller_owner"("seller_id", ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "seller_members_select_member" ON "public"."seller_members" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_seller_member"("seller_id", ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "seller_members_update_owner" ON "public"."seller_members" FOR UPDATE TO "authenticated" USING ("public"."is_seller_owner"("seller_id", ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_seller_owner"("seller_id", ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."sellers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sellers_update_owner" ON "public"."sellers" FOR UPDATE TO "authenticated" USING ("public"."is_seller_owner"("id", ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."signups" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "signups_insert_member" ON "public"."signups" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_seller_member"("seller_id", ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "signups_select_member_or_buyer" ON "public"."signups" FOR SELECT TO "authenticated" USING ((("buyer_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_seller_member"("seller_id", ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "signups_update_member_or_buyer_cancel" ON "public"."signups" FOR UPDATE TO "authenticated" USING (("public"."is_seller_member"("seller_id", ( SELECT "auth"."uid"() AS "uid")) OR ("buyer_id" = ( SELECT "auth"."uid"() AS "uid")))) WITH CHECK (("public"."is_seller_member"("seller_id", ( SELECT "auth"."uid"() AS "uid")) OR (("buyer_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("status" = 'cancelled'::"public"."signup_status"))));



ALTER TABLE "public"."teacher_locations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "teacher_locations_all_member" ON "public"."teacher_locations" TO "authenticated" USING ("public"."is_seller_member"("seller_id", ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_seller_member"("seller_id", ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."team_affiliations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "team_affiliations_delete" ON "public"."team_affiliations" FOR DELETE TO "authenticated" USING (("public"."is_team_admin"("team_id", ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_seller_member"("seller_id", ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "team_affiliations_insert_invite" ON "public"."team_affiliations" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_team_admin"("team_id", ( SELECT "auth"."uid"() AS "uid")) AND ("invited_by" = ( SELECT "auth"."uid"() AS "uid")) AND ("status" = 'pending'::"text") AND ("seller_id" <> ( SELECT "teams"."owner_seller_id"
   FROM "public"."teams"
  WHERE ("teams"."id" = "team_affiliations"."team_id")))));



CREATE POLICY "team_affiliations_read" ON "public"."team_affiliations" FOR SELECT TO "authenticated" USING (("public"."is_team_admin"("team_id", ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_seller_member"("seller_id", ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "team_affiliations_update_respond" ON "public"."team_affiliations" FOR UPDATE TO "authenticated" USING ("public"."is_seller_member"("seller_id", ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("public"."is_seller_member"("seller_id", ( SELECT "auth"."uid"() AS "uid")) AND ("status" = ANY (ARRAY['active'::"text", 'declined'::"text"]))));



ALTER TABLE "public"."team_invite_links" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "team_invite_links_admin_write" ON "public"."team_invite_links" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."teams" "t"
     JOIN "public"."seller_members" "sm" ON (("sm"."seller_id" = "t"."owner_seller_id")))
  WHERE (("t"."id" = "team_invite_links"."team_id") AND ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."teams" "t"
     JOIN "public"."seller_members" "sm" ON (("sm"."seller_id" = "t"."owner_seller_id")))
  WHERE (("t"."id" = "team_invite_links"."team_id") AND ("sm"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."team_slug_aliases" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "team_slug_aliases_select" ON "public"."team_slug_aliases" FOR SELECT USING (true);



ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "teams_delete_admin" ON "public"."teams" FOR DELETE TO "authenticated" USING ("public"."is_team_admin"("id", ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "teams_update_admin" ON "public"."teams" FOR UPDATE TO "authenticated" USING ("public"."is_team_admin"("id", ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK ("public"."is_team_admin"("id", ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."waitlist" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "waitlist_insert_valid_email" ON "public"."waitlist" FOR INSERT TO "authenticated", "anon" WITH CHECK (((("char_length"("email") >= 3) AND ("char_length"("email") <= 254)) AND ("email" ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'::"text") AND (("source" IS NULL) OR ("char_length"("source") <= 120))));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."_normalize_team_slug"("p_input" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_normalize_team_slug"("p_input" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."_normalize_team_slug"("p_input" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."available_ticket_types"("p_course_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."available_ticket_types"("p_course_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."available_ticket_types"("p_course_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."available_ticket_types"("p_course_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."calculate_package_end_date"("p_course_start_date" "date", "p_package_weeks" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."calculate_package_end_date"("p_course_start_date" "date", "p_package_weeks" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_session_conflict"("p_seller_id" "uuid", "p_session_date" "date", "p_start_time" time without time zone, "p_end_time" time without time zone, "p_exclude_course_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_session_conflict"("p_seller_id" "uuid", "p_session_date" "date", "p_start_time" time without time zone, "p_end_time" time without time zone, "p_exclude_course_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_sessions_conflicts"("p_seller_id" "uuid", "p_sessions" "jsonb", "p_exclude_course_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_sessions_conflicts"("p_seller_id" "uuid", "p_sessions" "jsonb", "p_exclude_course_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."cleanup_course_listings_on_affiliation_change"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_course_listings_on_affiliation_change"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."cleanup_old_webhook_events"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_old_webhook_events"() TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "service_role";
GRANT SELECT,UPDATE ON TABLE "public"."profiles" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."complete_buyer_onboarding"("p_name" "text", "p_phone" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."complete_buyer_onboarding"("p_name" "text", "p_phone" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."complete_buyer_onboarding"("p_name" "text", "p_phone" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."count_signups_by_ticket_type"("p_course_id" "uuid", "p_ticket_type_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."count_signups_by_ticket_type"("p_course_id" "uuid", "p_ticket_type_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."count_signups_for_session"("p_course_session_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."count_signups_for_session"("p_course_session_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_course_idempotent"("p_seller_id" "uuid", "p_idempotency_key" "text", "p_title" "text", "p_description" "text", "p_format" "text", "p_delivery_mode" "text", "p_status" "text", "p_level" "text", "p_location" "text", "p_time_schedule" "text", "p_duration" integer, "p_max_participants" integer, "p_price" numeric, "p_total_weeks" integer, "p_start_date" "date", "p_end_date" "date", "p_instructor_id" "uuid", "p_image_url" "text", "p_style_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_course_idempotent"("p_seller_id" "uuid", "p_idempotency_key" "text", "p_title" "text", "p_description" "text", "p_format" "text", "p_delivery_mode" "text", "p_status" "text", "p_level" "text", "p_location" "text", "p_time_schedule" "text", "p_duration" integer, "p_max_participants" integer, "p_price" numeric, "p_total_weeks" integer, "p_start_date" "date", "p_end_date" "date", "p_instructor_id" "uuid", "p_image_url" "text", "p_style_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_signup_if_available"("p_seller_id" "uuid", "p_course_id" "uuid", "p_ticket_type_id" "uuid", "p_participant_name" "text", "p_participant_email" "text", "p_participant_phone" "text", "p_amount_paid" numeric, "p_dintero_transaction_id" "text", "p_dintero_session_id" "text", "p_dintero_merchant_reference" "text", "p_course_session_id" "uuid", "p_buyer_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_signup_if_available"("p_seller_id" "uuid", "p_course_id" "uuid", "p_ticket_type_id" "uuid", "p_participant_name" "text", "p_participant_email" "text", "p_participant_phone" "text", "p_amount_paid" numeric, "p_dintero_transaction_id" "text", "p_dintero_session_id" "text", "p_dintero_merchant_reference" "text", "p_course_session_id" "uuid", "p_buyer_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_signup_if_available"("p_seller_id" "uuid", "p_course_id" "uuid", "p_ticket_type_id" "uuid", "p_participant_name" "text", "p_participant_email" "text", "p_participant_phone" "text", "p_amount_paid" numeric, "p_dintero_transaction_id" "text", "p_dintero_session_id" "text", "p_dintero_merchant_reference" "text", "p_course_session_id" "uuid", "p_buyer_id" "uuid", "p_note" "text", "p_payment_product" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_signup_if_available"("p_seller_id" "uuid", "p_course_id" "uuid", "p_ticket_type_id" "uuid", "p_participant_name" "text", "p_participant_email" "text", "p_participant_phone" "text", "p_amount_paid" numeric, "p_dintero_transaction_id" "text", "p_dintero_session_id" "text", "p_dintero_merchant_reference" "text", "p_course_session_id" "uuid", "p_buyer_id" "uuid", "p_note" "text", "p_payment_product" "text") TO "service_role";



GRANT ALL ON TABLE "public"."team_invite_links" TO "service_role";
GRANT SELECT,UPDATE ON TABLE "public"."team_invite_links" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."create_team_invite_link"("p_team_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_team_invite_link"("p_team_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."create_team_invite_link"("p_team_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."delete_course_cascade"("p_course_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_course_cascade"("p_course_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."delete_course_cascade"("p_course_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."enforce_course_publish_requires_dintero"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_course_publish_requires_dintero"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_session_no_conflict"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_session_no_conflict"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."ensure_seller_for_user"("p_seller_name" "text", "p_team_slug" "text", "p_seller_type" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."ensure_seller_for_user"("p_seller_name" "text", "p_team_slug" "text", "p_seller_type" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."ensure_seller_for_user"("p_seller_name" "text", "p_team_slug" "text", "p_seller_type" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_seller_operational"("p_seller_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_seller_operational"("p_seller_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_seller_operational"("p_seller_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_seller_private"("p_seller_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_seller_private"("p_seller_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_seller_private"("p_seller_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_signup_by_dintero_id"("p_transaction_id" "text", "p_merchant_reference" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_signup_by_dintero_id"("p_transaction_id" "text", "p_merchant_reference" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_signup_by_dintero_id"("p_transaction_id" "text", "p_merchant_reference" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_signup_by_dintero_id"("p_transaction_id" "text", "p_merchant_reference" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_platform_admin"("user_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_platform_admin"("user_uuid" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."is_platform_admin"("user_uuid" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."is_seller_member"("p_seller_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_seller_member"("p_seller_id" "uuid", "p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."is_seller_member"("p_seller_id" "uuid", "p_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."is_seller_owner"("p_seller_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_seller_owner"("p_seller_id" "uuid", "p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."is_seller_owner"("p_seller_id" "uuid", "p_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."is_team_admin"("p_team_id" "uuid", "p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_team_admin"("p_team_id" "uuid", "p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."is_team_admin"("p_team_id" "uuid", "p_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."log_payment_status_change"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_payment_status_change"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."lookup_team_invite_link"("p_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."lookup_team_invite_link"("p_code" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."lookup_team_invite_link"("p_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."lookup_team_invite_link"("p_code" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."mark_seller_onboarding_complete"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_seller_onboarding_complete"() TO "service_role";
GRANT ALL ON FUNCTION "public"."mark_seller_onboarding_complete"() TO "authenticated";



REVOKE ALL ON FUNCTION "public"."profiles_block_protected_columns"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."profiles_block_protected_columns"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."public_signup_counts"("p_course_ids" "uuid"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."public_signup_counts"("p_course_ids" "uuid"[]) TO "service_role";
GRANT ALL ON FUNCTION "public"."public_signup_counts"("p_course_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."public_signup_counts"("p_course_ids" "uuid"[]) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."public_storefront_seller_ids"("p_team_slug" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."public_storefront_seller_ids"("p_team_slug" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."public_storefront_seller_ids"("p_team_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."public_storefront_seller_ids"("p_team_slug" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."reconcile_course_lifecycle"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reconcile_course_lifecycle"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."redeem_team_invite_link"("p_code" "text", "p_force_leave" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."redeem_team_invite_link"("p_code" "text", "p_force_leave" boolean) TO "service_role";
GRANT ALL ON FUNCTION "public"."redeem_team_invite_link"("p_code" "text", "p_force_leave" boolean) TO "authenticated";



REVOKE ALL ON FUNCTION "public"."rename_team_slug"("p_team_id" "uuid", "p_new_slug" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rename_team_slug"("p_team_id" "uuid", "p_new_slug" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."rename_team_slug"("p_team_id" "uuid", "p_new_slug" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."set_user_role"("p_role" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_user_role"("p_role" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."set_user_role"("p_role" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."signups_refund_implies_cancel"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."signups_refund_implies_cancel"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."signups_set_cancelled_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."signups_set_cancelled_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."storage_can_write_course_image"("p_object_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."storage_can_write_course_image"("p_object_name" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."storage_can_write_course_image"("p_object_name" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."storage_can_write_seller_logo"("p_object_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."storage_can_write_seller_logo"("p_object_name" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."storage_can_write_seller_logo"("p_object_name" "text") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."tg_teams_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."tg_teams_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_course_sessions_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_course_sessions_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_updated_at_column"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."course_sessions" TO "service_role";
GRANT SELECT ON TABLE "public"."course_sessions" TO "anon";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."course_sessions" TO "authenticated";



GRANT ALL ON TABLE "public"."course_signup_packages" TO "service_role";
GRANT SELECT ON TABLE "public"."course_signup_packages" TO "anon";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."course_signup_packages" TO "authenticated";



GRANT ALL ON TABLE "public"."course_team_listings" TO "service_role";
GRANT SELECT ON TABLE "public"."course_team_listings" TO "anon";
GRANT SELECT,INSERT,DELETE ON TABLE "public"."course_team_listings" TO "authenticated";



GRANT ALL ON TABLE "public"."courses" TO "service_role";
GRANT SELECT ON TABLE "public"."courses" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."courses" TO "authenticated";



GRANT ALL ON TABLE "public"."notifications" TO "service_role";
GRANT SELECT,UPDATE ON TABLE "public"."notifications" TO "authenticated";



GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."payment_attempts" TO "service_role";



GRANT ALL ON TABLE "public"."payment_audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."processed_webhook_events" TO "service_role";



GRANT ALL ON TABLE "public"."seller_members" TO "service_role";
GRANT SELECT ON TABLE "public"."seller_members" TO "authenticated";



GRANT ALL ON TABLE "public"."sellers" TO "service_role";
GRANT UPDATE ON TABLE "public"."sellers" TO "authenticated";



GRANT SELECT("id") ON TABLE "public"."sellers" TO "anon";
GRANT SELECT("id") ON TABLE "public"."sellers" TO "authenticated";



GRANT SELECT("name") ON TABLE "public"."sellers" TO "anon";
GRANT SELECT("name") ON TABLE "public"."sellers" TO "authenticated";



GRANT SELECT("logo_url") ON TABLE "public"."sellers" TO "anon";
GRANT SELECT("logo_url") ON TABLE "public"."sellers" TO "authenticated";



GRANT SELECT("created_at") ON TABLE "public"."sellers" TO "anon";
GRANT SELECT("created_at") ON TABLE "public"."sellers" TO "authenticated";



GRANT SELECT("dintero_onboarding_complete") ON TABLE "public"."sellers" TO "anon";
GRANT SELECT("dintero_onboarding_complete") ON TABLE "public"."sellers" TO "authenticated";



GRANT ALL ON TABLE "public"."signups" TO "service_role";
GRANT SELECT,INSERT ON TABLE "public"."signups" TO "authenticated";



GRANT ALL ON TABLE "public"."teacher_locations" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."teacher_locations" TO "authenticated";



GRANT ALL ON TABLE "public"."team_affiliations" TO "service_role";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."team_affiliations" TO "authenticated";



GRANT ALL ON TABLE "public"."team_slug_aliases" TO "service_role";
GRANT SELECT ON TABLE "public"."team_slug_aliases" TO "anon";
GRANT SELECT ON TABLE "public"."team_slug_aliases" TO "authenticated";



GRANT ALL ON TABLE "public"."teams" TO "service_role";
GRANT SELECT,UPDATE ON TABLE "public"."teams" TO "authenticated";



GRANT SELECT("id") ON TABLE "public"."teams" TO "anon";



GRANT SELECT("slug") ON TABLE "public"."teams" TO "anon";



GRANT SELECT("name") ON TABLE "public"."teams" TO "anon";



GRANT SELECT("cover_image_url") ON TABLE "public"."teams" TO "anon";



GRANT SELECT("created_at") ON TABLE "public"."teams" TO "anon";



GRANT SELECT("updated_at") ON TABLE "public"."teams" TO "anon";



GRANT SELECT("owner_seller_id") ON TABLE "public"."teams" TO "anon";



GRANT SELECT("default_course_image_url") ON TABLE "public"."teams" TO "anon";



GRANT ALL ON TABLE "public"."waitlist" TO "service_role";
GRANT INSERT ON TABLE "public"."waitlist" TO "anon";
GRANT INSERT ON TABLE "public"."waitlist" TO "authenticated";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";








-- Baseline-managed Supabase Storage buckets and policies.
INSERT INTO "storage"."buckets" ("id", "name", "owner", "public", "file_size_limit", "allowed_mime_types")
VALUES
  ('course-images', 'course-images', NULL, true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]),
  ('seller-logos', 'seller-logos', NULL, true, 5242880, NULL)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "public" = EXCLUDED."public",
  "file_size_limit" = EXCLUDED."file_size_limit",
  "allowed_mime_types" = EXCLUDED."allowed_mime_types";

DROP POLICY IF EXISTS "seller_logos_write" ON "storage"."objects";
CREATE POLICY "seller_logos_write"
  ON "storage"."objects"
  FOR ALL
  TO "authenticated"
  USING (("bucket_id" = 'seller-logos'::text) AND "public"."storage_can_write_seller_logo"("name"))
  WITH CHECK (("bucket_id" = 'seller-logos'::text) AND "public"."storage_can_write_seller_logo"("name"));

DROP POLICY IF EXISTS "course_images_write" ON "storage"."objects";
CREATE POLICY "course_images_write"
  ON "storage"."objects"
  FOR ALL
  TO "authenticated"
  USING (("bucket_id" = 'course-images'::text) AND "public"."storage_can_write_course_image"("name"))
  WITH CHECK (("bucket_id" = 'course-images'::text) AND "public"."storage_can_write_course_image"("name"));

-- Baseline-managed cron jobs. Production already has these rows; fresh databases recreate them.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "vault"."secrets" WHERE "name" = 'dintero_cron_secret') THEN
    PERFORM "vault"."create_secret"(
      encode("extensions"."gen_random_bytes"(32), 'hex'),
      'dintero_cron_secret',
      'Shared secret for cron-triggered edge functions'
    );
  END IF;
END $$;

SELECT "cron"."unschedule"("jobid") FROM "cron"."job" WHERE "jobname" = 'sync-dintero-seller-statuses';
SELECT "cron"."schedule"(
  'sync-dintero-seller-statuses',
  '*/5 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://nollnnkksgicsvuthnjq.supabase.co/functions/v1/sync-dintero-seller-statuses',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'dintero_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $cron$
);

SELECT "cron"."unschedule"("jobid") FROM "cron"."job" WHERE "jobname" = 'sweep-pending-payments';
SELECT "cron"."schedule"(
  'sweep-pending-payments',
  '*/2 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://nollnnkksgicsvuthnjq.supabase.co/functions/v1/sweep-pending-payments',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'dintero_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 45000
  );
  $cron$
);

SELECT "cron"."unschedule"("jobid") FROM "cron"."job" WHERE "jobname" = 'send-pending-confirmations';
SELECT "cron"."schedule"(
  'send-pending-confirmations',
  '*/5 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://nollnnkksgicsvuthnjq.supabase.co/functions/v1/send-pending-confirmations',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'dintero_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 45000
  );
  $cron$
);

SELECT "cron"."unschedule"("jobid") FROM "cron"."job" WHERE "jobname" = 'cleanup-webhook-events-daily';
SELECT "cron"."schedule"(
  'cleanup-webhook-events-daily',
  '0 3 * * *',
  $cron$ SELECT public.cleanup_old_webhook_events(); $cron$
);

SELECT "cron"."unschedule"("jobid") FROM "cron"."job" WHERE "jobname" = 'purge-stale-payment-attempts';
SELECT "cron"."schedule"(
  'purge-stale-payment-attempts',
  '15 3 * * *',
  $cron$
  DELETE FROM public.payment_attempts
  WHERE status IN ('pending','failed','voided')
    AND created_at < now() - INTERVAL '14 days';
  $cron$
);

SELECT "cron"."unschedule"("jobid") FROM "cron"."job" WHERE "jobname" = 'reconcile-course-lifecycle';
SELECT "cron"."schedule"(
  'reconcile-course-lifecycle',
  '0 * * * *',
  $cron$ SELECT public.reconcile_course_lifecycle(); $cron$
);
-- Launch hardening — four non-destructive changes:
--   1. delete_course_cascade: refuse deletion when financially material records exist
--   2. Pin 6 SECURITY DEFINER search_paths to explicit 'pg_catalog, public'
--   3. Revoke unnecessary EXECUTE on the create_default_ticket_for_course trigger fn
--   4. Add a fixed-window rate limiter (table + fn) for the public endpoints
-- None of these drop data or remove endpoints.

-- 1. Financial-materiality guard on delete_course_cascade --------------------
--
-- A hard cascade delete of a course also wipes signups, payment_attempts AND
-- payment_audit_log (all ON DELETE CASCADE) — destroying accounting/audit
-- evidence. Refuse the delete when any real money moved or is held.
--
-- Deliberately NOT keyed on payment_status = 'paid' alone: free signups are
-- stored as payment_status='paid' with amount_paid=0 and MUST stay deletable.
-- Materiality = money actually moved (amount/refund) or a Dintero transaction
-- exists, or a payment_attempt is past the throwaway states.
CREATE OR REPLACE FUNCTION public.delete_course_cascade(p_course_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_material_signups  int;
  v_material_attempts int;
BEGIN
  -- Authorization (unchanged): caller must be a member of the course's seller.
  IF NOT EXISTS (
    SELECT 1 FROM public.courses c
    JOIN public.seller_members sm ON sm.seller_id = c.seller_id
    WHERE c.id = p_course_id AND sm.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: you are not a member of this course''s seller';
  END IF;

  SELECT count(*) INTO v_material_signups
  FROM public.signups s
  WHERE s.course_id = p_course_id
    AND (
         s.amount_paid > 0
      OR s.refund_amount > 0
      OR s.refunded_at IS NOT NULL
      OR s.payment_status::text = 'refunded'
      OR s.dintero_transaction_id IS NOT NULL
    );

  -- payment_attempts.status is free-text; fail closed — anything beyond the
  -- three throwaway states (captured / authorized / settled / refunded /
  -- disputed / unknown-future) counts as material. Also block a still-`pending`
  -- attempt that has already opened a Dintero session: a checkout may be live
  -- and about to authorize, and deleting the course would orphan the merchant
  -- reference context before the buyer pays. Truly-abandoned pending+session
  -- rows are reaped by the purge-stale-payment-attempts cron after 14 days.
  SELECT count(*) INTO v_material_attempts
  FROM public.payment_attempts pa
  WHERE pa.course_id = p_course_id
    AND (
         pa.dintero_transaction_id IS NOT NULL
      OR pa.dintero_session_id IS NOT NULL
      OR pa.status NOT IN ('pending', 'failed', 'voided')
    );

  IF v_material_signups > 0 OR v_material_attempts > 0 THEN
    RAISE EXCEPTION
      'Cannot delete course %: % paid/refunded signup(s) and % settled payment record(s) exist. Financial records must be retained.',
      p_course_id, v_material_signups, v_material_attempts;
  END IF;

  -- Safe: only free/pending/failed/voided footprint remains.
  DELETE FROM public.signups         WHERE course_id = p_course_id;
  DELETE FROM public.course_sessions WHERE course_id = p_course_id;
  DELETE FROM public.courses         WHERE id        = p_course_id;
END;
$function$;

-- 2. Pin the 6 SECURITY DEFINER functions to explicit 'pg_catalog, public' ---
-- (Already safe — public CREATE is revoked from all untrusted roles — but make
--  the intent explicit per launch review. ALTER ... SET does not change bodies.)
ALTER FUNCTION public.cleanup_course_listings_on_affiliation_change() SET search_path = pg_catalog, public;
ALTER FUNCTION public.create_team_invite_link(uuid)                   SET search_path = pg_catalog, public;
ALTER FUNCTION public.enforce_course_publish_requires_dintero()       SET search_path = pg_catalog, public;
ALTER FUNCTION public.lookup_team_invite_link(text)                   SET search_path = pg_catalog, public;
ALTER FUNCTION public.public_storefront_seller_ids(text)              SET search_path = pg_catalog, public;
ALTER FUNCTION public.redeem_team_invite_link(text, boolean)          SET search_path = pg_catalog, public;

-- 3. Revoke unnecessary EXECUTE on the default-ticket TRIGGER function --------
-- It is a RETURNS trigger function — Postgres refuses direct RPC invocation, so
-- this changes no behavior (the AFTER INSERT trigger fires regardless of grants),
-- it just removes a misleading PUBLIC/anon/authenticated grant.
REVOKE EXECUTE ON FUNCTION public.create_default_ticket_for_course() FROM PUBLIC, anon, authenticated;

-- 4. Fixed-window rate limiter for the public/unauthenticated endpoints -------
-- Backs abuse protection on create-free-signup + create-dintero-session without
-- an external dependency (no Turnstile signup, no frontend widget). Bounded:
-- one row per active key (sliding fixed window that resets in place), so it
-- cannot grow per-request. A daily purge keeps idle keys from accumulating.
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  bucket_key   text PRIMARY KEY,
  hit_count    int  NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now()
);

-- Only the service role (edge functions) ever touches this — never anon/authenticated.
REVOKE ALL ON public.rate_limit_buckets FROM PUBLIC, anon, authenticated;
-- Enable RLS with no policies: deny-by-default for anon/authenticated; the
-- service role bypasses RLS. Defense-in-depth + keeps the linter quiet.
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;

-- Atomically bump a key's counter and report whether it is still within limit.
-- Returns TRUE when the call is allowed, FALSE when the limit is exceeded.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key text, p_limit int, p_window_seconds int
) RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_count int;
BEGIN
  INSERT INTO public.rate_limit_buckets AS b (bucket_key, hit_count, window_start)
  VALUES (p_key, 1, now())
  ON CONFLICT (bucket_key) DO UPDATE
    SET hit_count = CASE
          WHEN b.window_start < now() - make_interval(secs => p_window_seconds)
          THEN 1
          ELSE b.hit_count + 1
        END,
        window_start = CASE
          WHEN b.window_start < now() - make_interval(secs => p_window_seconds)
          THEN now()
          ELSE b.window_start
        END
  RETURNING b.hit_count INTO v_count;

  RETURN v_count <= p_limit;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, int, int) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.check_rate_limit(text, int, int) TO service_role;

-- Daily cleanup of idle buckets (anything untouched for over a day).
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_buckets()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  DELETE FROM public.rate_limit_buckets WHERE window_start < now() - interval '1 day';
$function$;

-- SECURITY DEFINER + default PUBLIC EXECUTE would let anon/authenticated call
-- this as an RPC and flush every limiter bucket. Lock it to the service role.
REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limit_buckets() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.cleanup_rate_limit_buckets() TO service_role;

-- Idempotent (re)schedule: drop any existing job of this name before adding it
-- so re-running the migration doesn't error or duplicate.
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'cleanup-rate-limit-buckets-daily';

SELECT cron.schedule(
  'cleanup-rate-limit-buckets-daily',
  '30 3 * * *',
  $$ SELECT public.cleanup_rate_limit_buckets(); $$
);

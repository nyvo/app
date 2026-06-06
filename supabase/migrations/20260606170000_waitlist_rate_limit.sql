-- F3.4 — server-enforced rate limit on the anonymous waitlist insert.
--
-- The waitlist is an anon direct table INSERT (the public marketing form), with
-- no abuse control — anyone could mass-insert emails. A client-side limit is not
-- enough. This adds a BEFORE INSERT trigger (the only server-side hook for a
-- direct PostgREST insert) that reuses the existing check_rate_limit helper,
-- keyed on the client IP (from the PostgREST request.headers GUC) and the email.
--
-- Contained by design: no new edge function, no grant change, no form rewrite.
-- check_rate_limit is SECURITY DEFINER owned by postgres; this trigger function
-- is also owned by postgres, so it can execute it. Fails OPEN (any limiter error
-- allows the insert) so a hiccup never blocks legitimate signups. Service-role
-- inserts bypass the limit.

CREATE OR REPLACE FUNCTION public.waitlist_rate_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_headers json;
  v_ip text;
  v_email text := lower(trim(NEW.email));
  v_ok boolean;
BEGIN
  -- Server-side inserts (service_role) bypass the limit.
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Client IP from the PostgREST-provided request headers. Absent on non-HTTP
  -- paths -> skip the IP axis rather than fail.
  BEGIN
    v_headers := current_setting('request.headers', true)::json;
  EXCEPTION WHEN OTHERS THEN
    v_headers := NULL;
  END;
  v_ip := nullif(trim(split_part(coalesce(v_headers->>'x-forwarded-for', ''), ',', 1)), '');

  -- Per-IP cap — the axis that stops mass varying-email spam.
  IF v_ip IS NOT NULL THEN
    BEGIN
      v_ok := public.check_rate_limit('waitlist:ip:' || v_ip, 10, 3600);
    EXCEPTION WHEN OTHERS THEN
      v_ok := true; -- fail open
    END;
    IF v_ok = false THEN
      RAISE EXCEPTION 'For mange forsøk. Prøv igjen om litt.' USING ERRCODE = '53400';
    END IF;
  END IF;

  -- Per-email cap.
  BEGIN
    v_ok := public.check_rate_limit('waitlist:email:' || v_email, 5, 3600);
  EXCEPTION WHEN OTHERS THEN
    v_ok := true; -- fail open
  END;
  IF v_ok = false THEN
    RAISE EXCEPTION 'For mange forsøk. Prøv igjen om litt.' USING ERRCODE = '53400';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS waitlist_rate_limit_before_insert ON public.waitlist;
CREATE TRIGGER waitlist_rate_limit_before_insert
  BEFORE INSERT ON public.waitlist
  FOR EACH ROW EXECUTE FUNCTION public.waitlist_rate_limit();

-- Smoke-test fix: 20260612094000 declared find_seller_by_owner_email STABLE,
-- but the internal check_rate_limit call INSERTs into rate_limit_buckets —
-- PostgREST executes STABLE functions in a read-only transaction, so every
-- call failed with "cannot execute INSERT in a read-only transaction".
-- VOLATILE (the default) is correct: the function has a write side effect.

CREATE OR REPLACE FUNCTION public.find_seller_by_owner_email(p_email text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_seller_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  -- 30 lookups/hour per user is far above legitimate invite usage.
  IF NOT public.check_rate_limit('seller-owner-lookup:user:' || auth.uid()::text, 30, 3600) THEN
    RAISE EXCEPTION 'rate_limited' USING ERRCODE = 'P0001';
  END IF;

  SELECT sm.seller_id INTO v_seller_id
  FROM public.profiles p
  JOIN public.seller_members sm ON sm.user_id = p.id AND sm.role = 'owner'
  WHERE lower(p.email) = lower(btrim(p_email))
  LIMIT 1;

  RETURN v_seller_id;
END;
$$;

-- CREATE OR REPLACE cannot change volatility when the prior function was
-- created STABLE in the same database — enforce it explicitly.
ALTER FUNCTION public.find_seller_by_owner_email(text) VOLATILE;

REVOKE ALL ON FUNCTION public.find_seller_by_owner_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_seller_by_owner_email(text) TO authenticated, service_role;

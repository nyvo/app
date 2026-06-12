-- Pre-launch hardening bundle (deferred-scan items; see
-- .context/db-audit/DEFERRED-SCAN.md). All changes are grant/role/constraint
-- hardening or additive — no booking/signup/payment logic is touched.
--
--  1. notifications: column-scoped UPDATE grant (recipients could rewrite
--     body/action_url/dedupe_key of their own rows; the app only ever writes
--     the four timestamp columns)
--  2. is_seller_owner / is_team_admin: role = 'owner' (the owner-only CHECK
--     has made the 'admin' branch dead since 20260606140000 — but if that
--     CHECK is ever relaxed for a new role, the old IN-list would silently
--     grant owner-level access)
--  3. sellers_update_owner: explicit WITH CHECK; protected-columns trigger
--     extended to identity/lifecycle columns so safety no longer depends on
--     column-level grants alone
--  4. team_invite_links: expires_at (30 days) enforced in lookup + redeem
--  5. storage: codify public read policies for the two public buckets
--  6. additive indexes for dashboard and payment-sweep queries
--  7. teacher_locations: explanatory comment (legacy name, no rename)

-- ── 1. Notifications: clients may only touch read-state timestamps ──────────
REVOKE UPDATE ON public.notifications FROM authenticated;
GRANT UPDATE (seen_at, read_at, resolved_at, archived_at)
  ON public.notifications TO authenticated;

-- ── 2. Owner helpers: drop the dead 'admin' branch ───────────────────────────
CREATE OR REPLACE FUNCTION "public"."is_seller_owner"("p_seller_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.seller_members
    WHERE seller_id = p_seller_id AND user_id = p_user_id
      AND role = 'owner'
  );
$$;

CREATE OR REPLACE FUNCTION "public"."is_team_admin"("p_team_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teams t
    JOIN public.seller_members sm ON sm.seller_id = t.owner_seller_id
    WHERE t.id = p_team_id AND sm.user_id = p_user_id
      AND sm.role = 'owner'
  );
$$;

-- ── 3a. sellers UPDATE policy: explicit WITH CHECK ───────────────────────────
DROP POLICY IF EXISTS "sellers_update_owner" ON "public"."sellers";
CREATE POLICY "sellers_update_owner" ON "public"."sellers"
  FOR UPDATE TO "authenticated"
  USING ("public"."is_seller_owner"("id", (SELECT "auth"."uid"())))
  WITH CHECK ("public"."is_seller_owner"("id", (SELECT "auth"."uid"())));

-- ── 3b. Protected-columns trigger: also guard identity/lifecycle columns ────
-- Today authenticated only has UPDATE(name, logo_url) at the grant level, so
-- these columns are unreachable anyway — this makes the protection survive a
-- future grant widening. Server paths (service role, SECURITY DEFINER
-- functions owned by postgres, app.sellers_server_write) bypass as before.
CREATE OR REPLACE FUNCTION "public"."sellers_block_protected_columns"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
BEGIN
  IF current_user IN ('service_role', 'postgres', 'supabase_admin')
     OR current_setting('app.sellers_server_write', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan
     OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.subscription_current_period_end IS DISTINCT FROM OLD.subscription_current_period_end
     OR NEW.subscription_provider IS DISTINCT FROM OLD.subscription_provider
     OR NEW.subscription_customer_id IS DISTINCT FROM OLD.subscription_customer_id
     OR NEW.subscription_external_id IS DISTINCT FROM OLD.subscription_external_id THEN
    RAISE EXCEPTION 'sellers.subscription_* is server-controlled' USING ERRCODE = '42501';
  END IF;

  IF NEW.dintero_seller_id IS DISTINCT FROM OLD.dintero_seller_id
     OR NEW.dintero_approval_id IS DISTINCT FROM OLD.dintero_approval_id
     OR NEW.dintero_contract_url IS DISTINCT FROM OLD.dintero_contract_url
     OR NEW.dintero_onboarding_status IS DISTINCT FROM OLD.dintero_onboarding_status
     OR NEW.dintero_onboarding_complete IS DISTINCT FROM OLD.dintero_onboarding_complete THEN
    RAISE EXCEPTION 'sellers.dintero_* is server-controlled' USING ERRCODE = '42501';
  END IF;

  IF NEW.organization_number IS DISTINCT FROM OLD.organization_number
     OR NEW.seller_type IS DISTINCT FROM OLD.seller_type
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.phone IS DISTINCT FROM OLD.phone
     OR NEW.closed_at IS DISTINCT FROM OLD.closed_at THEN
    RAISE EXCEPTION 'sellers identity/lifecycle columns are server-controlled' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- ── 4. Invite links expire after 30 days ─────────────────────────────────────
ALTER TABLE public.team_invite_links
  ADD COLUMN expires_at timestamptz;

-- Backfill: every existing link (revoked or not) gets a fresh 30-day horizon;
-- revoked links are already dead via revoked_at, so the value is cosmetic.
UPDATE public.team_invite_links SET expires_at = now() + interval '30 days';

ALTER TABLE public.team_invite_links
  ALTER COLUMN expires_at SET DEFAULT now() + interval '30 days',
  ALTER COLUMN expires_at SET NOT NULL;

CREATE OR REPLACE FUNCTION "public"."create_team_invite_link"("p_team_id" "uuid") RETURNS "public"."team_invite_links"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
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
      INSERT INTO public.team_invite_links (team_id, code, created_by, expires_at)
      VALUES (p_team_id, v_code, v_user_id, now() + interval '30 days')
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

CREATE OR REPLACE FUNCTION "public"."lookup_team_invite_link"("p_code" "text") RETURNS TABLE("status" "text", "team_id" "uuid", "team_slug" "text", "team_name" "text", "team_cover_image_url" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
  v_link public.team_invite_links;
BEGIN
  SELECT * INTO v_link FROM public.team_invite_links WHERE code = p_code;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::text, NULL::uuid, NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  IF v_link.revoked_at IS NOT NULL OR v_link.expires_at <= now() THEN
    RETURN QUERY SELECT 'expired'::text, NULL::uuid, NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  RETURN QUERY
    SELECT 'valid'::text, t.id, t.slug, t.name, t.cover_image_url
    FROM public.teams t
    WHERE t.id = v_link.team_id;
END;
$$;

-- redeem: identical guard. Only the expiry condition changes; the rest of the
-- body is reproduced verbatim from the current version (20260611120000).
CREATE OR REPLACE FUNCTION "public"."redeem_team_invite_link"("p_code" "text", "p_force_leave" boolean DEFAULT false) RETURNS TABLE("status" "text", "team_id" "uuid", "existing_team_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
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
  IF v_link.revoked_at IS NOT NULL OR v_link.expires_at <= now() THEN
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

  -- Visibility for the instant-join model: tell the studio owner(s) who just
  -- joined. Day-granularity dedupe suffix: client retries / double-submits
  -- on the same day collapse to one notification, while a genuine
  -- leave→rejoin on a later day still notifies.
  INSERT INTO public.notifications
    (seller_id, recipient_id, actor_id, type, action_required, dedupe_key, title, body, action_url, metadata)
  SELECT
    t.owner_seller_id,
    sm.user_id,
    v_user_id,
    'affiliation.joined',
    false,
    'affiliation.joined:' || v_link.team_id || ':' || v_seller_id || ':' || to_char(now(), 'YYYY-MM-DD'),
    'Ny instruktør på studiosiden',
    s.name,
    '/studio',
    jsonb_build_object('team_id', v_link.team_id, 'joined_seller_id', v_seller_id)
  FROM public.teams t
  JOIN public.seller_members sm
    ON sm.seller_id = t.owner_seller_id AND sm.role = 'owner'
  JOIN public.sellers s ON s.id = v_seller_id
  WHERE t.id = v_link.team_id
    AND sm.user_id <> v_user_id
  ON CONFLICT (recipient_id, dedupe_key) DO NOTHING;

  RETURN QUERY SELECT 'joined'::text, v_link.team_id, NULL::uuid;
END;
$$;

-- ── 5. Storage: codify what the public buckets already allow ─────────────────
-- Both buckets are public=true (objects readable by URL); these policies make
-- the read intent durable in source control rather than dashboard-only state.
CREATE POLICY "course_images_read" ON "storage"."objects"
  FOR SELECT TO "anon", "authenticated"
  USING ("bucket_id" = 'course-images');

CREATE POLICY "seller_logos_read" ON "storage"."objects"
  FOR SELECT TO "anon", "authenticated"
  USING ("bucket_id" = 'seller-logos');

-- ── 6. Additive indexes ───────────────────────────────────────────────────────
-- Seller dashboard: signups filtered by course + status.
CREATE INDEX IF NOT EXISTS idx_signups_course_status
  ON public.signups (course_id, status);

-- sweep-pending-payments scan: pending attempts with a Dintero session in a
-- created_at window.
CREATE INDEX IF NOT EXISTS idx_payment_attempts_pending_sweep
  ON public.payment_attempts (created_at)
  WHERE status = 'pending' AND dintero_session_id IS NOT NULL;

-- ── 7. teacher_locations: name predates the seller model ─────────────────────
COMMENT ON TABLE public.teacher_locations IS
  'Seller-scoped locations (FK seller_id). Legacy name — "teacher" predates the seller model. Do not create a seller_locations table; this is it.';

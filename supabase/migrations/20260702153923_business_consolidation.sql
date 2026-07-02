-- Business consolidation: one business entity.
--
-- The greenfield model, applied. `teams` (the public storefront, strictly 1:1
-- with sellers) folds INTO `sellers` — a storefront is the business's public
-- projection, not a separate entity. In the same change:
--
--   * team_affiliations  → seller_affiliations (host_seller_id, guest_seller_id).
--     The status column is dropped: a row exists = active. Invite-link
--     redemption is the only write path; the email-invite pending/declined
--     flow was dead code (its service functions were never imported).
--   * team_invite_links  → seller_invite_links (host_seller_id)
--   * team_slug_aliases  → seller_slug_aliases (seller_id)
--   * course_team_listings dropped — dead. The storefront read path shows all
--     published courses of owner + guests; nothing ever wrote listings.
--   * courses.instructor_id dropped — dead. Never written (0 rows non-null);
--     instructor_name (free text) is the live label.
--   * sellers.seller_type → sellers.operating_model ('solo'|'studio').
--     TWO-AXIS LOCK: operating_model is self-declared identity — it prices
--     nothing and gates nothing paid. Entitlement lives ONLY in the
--     subscription_* columns. Checkout reads the declaration at purchase time.
--   * set_operating_model(): owner-only toggle with the downgrade guardrail
--     (no studio→solo while hosting affiliates). Returns whether an active
--     Pro subscription needs re-pricing; the set-operating-model edge
--     function performs the Stripe price swap effective next period.
--
-- Money invariant, unchanged and sacred: courses.seller_id → signups.seller_id
-- → the owning seller's Stripe account. Affiliation never touches money.
--
-- Single-host policy note: "a guest can affiliate with at most one host" is
-- enforced ONLY inside redeem_seller_invite_link (the has_other_host branch).
-- The schema (composite PK) supports N hosts — flipping the policy later is a
-- function-only migration.

-- ═══════════════════════════════════════════════════════════════════════════
-- 0. Preconditions — abort loudly if remote state doesn't match assumptions.
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE v_cnt integer;
BEGIN
  SELECT count(*) INTO v_cnt FROM public.sellers s
  WHERE NOT EXISTS (SELECT 1 FROM public.teams t WHERE t.owner_seller_id = s.id);
  IF v_cnt > 0 THEN
    RAISE EXCEPTION 'consolidation: % sellers have no team row', v_cnt;
  END IF;

  SELECT count(*) INTO v_cnt FROM (
    SELECT owner_seller_id FROM public.teams GROUP BY 1 HAVING count(*) > 1
  ) d;
  IF v_cnt > 0 THEN
    RAISE EXCEPTION 'consolidation: % sellers own multiple teams', v_cnt;
  END IF;

  SELECT count(*) INTO v_cnt FROM public.team_affiliations WHERE status <> 'active';
  IF v_cnt > 0 THEN
    RAISE EXCEPTION 'consolidation: % non-active affiliation rows exist', v_cnt;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Drop policies that reference columns/tables about to be reshaped.
-- ═══════════════════════════════════════════════════════════════════════════
DROP POLICY "team_affiliations_read" ON public.team_affiliations;
DROP POLICY "team_affiliations_insert_invite" ON public.team_affiliations;
DROP POLICY "team_affiliations_update_respond" ON public.team_affiliations;
DROP POLICY "team_affiliations_delete" ON public.team_affiliations;
DROP POLICY "team_invite_links_admin_write" ON public.team_invite_links;
DROP POLICY "team_slug_aliases_select" ON public.team_slug_aliases;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Dead weight.
-- ═══════════════════════════════════════════════════════════════════════════
DROP TRIGGER team_affiliations_cleanup_listings ON public.team_affiliations;
DROP TABLE public.course_team_listings;
DROP FUNCTION public.cleanup_course_listings_on_affiliation_change();

-- Never written (verified 0 non-null in production); its FK + partial index
-- die with the column. _account_deletion_blockers loses its instructor branch
-- below (§8) — the branch could never fire.
ALTER TABLE public.courses DROP COLUMN instructor_id;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. sellers gains the storefront columns.
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.sellers
  ADD COLUMN slug text,
  ADD COLUMN cover_image_url text,
  ADD COLUMN default_course_image_url text;

UPDATE public.sellers s
SET slug = t.slug,
    cover_image_url = t.cover_image_url,
    default_course_image_url = t.default_course_image_url
FROM public.teams t
WHERE t.owner_seller_id = s.id;

ALTER TABLE public.sellers ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX sellers_slug_lower_key ON public.sellers (lower(slug));

COMMENT ON COLUMN public.sellers.slug IS
  'Public storefront URL fragment — the seller''s page renders at /<slug>. Server-controlled: changed only via rename_seller_slug(), which archives the old slug in seller_slug_aliases so old links keep working.';
COMMENT ON COLUMN public.sellers.cover_image_url IS
  'Storefront hero image.';
COMMENT ON COLUMN public.sellers.default_course_image_url IS
  'Fallback hero image for this seller''s courses that have no own image_url.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Re-key the children (teams still exists here for the id mapping).
-- ═══════════════════════════════════════════════════════════════════════════

-- 4a. seller_slug_aliases -----------------------------------------------------
ALTER TABLE public.team_slug_aliases RENAME TO seller_slug_aliases;
ALTER TABLE public.seller_slug_aliases ADD COLUMN seller_id uuid;

UPDATE public.seller_slug_aliases a
SET seller_id = t.owner_seller_id
FROM public.teams t
WHERE t.id = a.team_id;

ALTER TABLE public.seller_slug_aliases
  ALTER COLUMN seller_id SET NOT NULL;
ALTER TABLE public.seller_slug_aliases DROP COLUMN team_id;
ALTER TABLE public.seller_slug_aliases
  ADD CONSTRAINT seller_slug_aliases_seller_id_fkey
    FOREIGN KEY (seller_id) REFERENCES public.sellers(id) ON DELETE CASCADE;
ALTER TABLE public.seller_slug_aliases
  RENAME CONSTRAINT team_slug_aliases_pkey TO seller_slug_aliases_pkey;
CREATE INDEX idx_seller_slug_aliases_seller ON public.seller_slug_aliases (seller_id);

COMMENT ON TABLE public.seller_slug_aliases IS
  'Archived storefront slugs. Old /<slug> URLs resolve here and redirect to the seller''s current slug.';

-- 4b. seller_invite_links -----------------------------------------------------
ALTER TABLE public.team_invite_links RENAME TO seller_invite_links;
ALTER TABLE public.seller_invite_links ADD COLUMN host_seller_id uuid;

UPDATE public.seller_invite_links l
SET host_seller_id = t.owner_seller_id
FROM public.teams t
WHERE t.id = l.team_id;

ALTER TABLE public.seller_invite_links
  ALTER COLUMN host_seller_id SET NOT NULL;
ALTER TABLE public.seller_invite_links DROP COLUMN team_id;
ALTER TABLE public.seller_invite_links
  ADD CONSTRAINT seller_invite_links_host_fkey
    FOREIGN KEY (host_seller_id) REFERENCES public.sellers(id) ON DELETE CASCADE;
ALTER TABLE public.seller_invite_links
  RENAME CONSTRAINT team_invite_links_pkey TO seller_invite_links_pkey;
ALTER TABLE public.seller_invite_links
  RENAME CONSTRAINT team_invite_links_code_key TO seller_invite_links_code_key;
CREATE INDEX idx_seller_invite_links_host ON public.seller_invite_links (host_seller_id);

COMMENT ON TABLE public.seller_invite_links IS
  'Invite links a studio (host seller) shares so other sellers can affiliate. Redeeming creates a seller_affiliations row instantly (no approval step; the join notification provides visibility).';

-- 4c. seller_affiliations -----------------------------------------------------
ALTER TABLE public.team_affiliations RENAME TO seller_affiliations;
ALTER TABLE public.seller_affiliations ADD COLUMN host_seller_id uuid;

UPDATE public.seller_affiliations a
SET host_seller_id = t.owner_seller_id
FROM public.teams t
WHERE t.id = a.team_id;

ALTER TABLE public.seller_affiliations
  ALTER COLUMN host_seller_id SET NOT NULL;
ALTER TABLE public.seller_affiliations RENAME COLUMN seller_id TO guest_seller_id;
ALTER TABLE public.seller_affiliations RENAME COLUMN invited_at TO created_at;

ALTER TABLE public.seller_affiliations
  DROP CONSTRAINT team_affiliations_pkey,
  DROP CONSTRAINT team_affiliations_status_check,
  DROP COLUMN team_id,
  DROP COLUMN status,
  DROP COLUMN responded_at;

ALTER TABLE public.seller_affiliations
  ADD CONSTRAINT seller_affiliations_pkey PRIMARY KEY (host_seller_id, guest_seller_id),
  ADD CONSTRAINT seller_affiliations_no_self CHECK (host_seller_id <> guest_seller_id),
  ADD CONSTRAINT seller_affiliations_host_fkey
    FOREIGN KEY (host_seller_id) REFERENCES public.sellers(id) ON DELETE CASCADE;
ALTER TABLE public.seller_affiliations
  RENAME CONSTRAINT team_affiliations_seller_id_fkey TO seller_affiliations_guest_fkey;
ALTER TABLE public.seller_affiliations
  RENAME CONSTRAINT team_affiliations_invited_by_fkey TO seller_affiliations_invited_by_fkey;
ALTER INDEX public.idx_team_affiliations_invited_by RENAME TO idx_seller_affiliations_invited_by;
CREATE INDEX idx_seller_affiliations_guest ON public.seller_affiliations (guest_seller_id);

COMMENT ON TABLE public.seller_affiliations IS
  'Storefront syndication between two businesses: the guest seller''s published courses render on the host seller''s storefront. A row exists = active (created via redeem_seller_invite_link; either side deletes to end it). Marketing only — payments always follow courses.seller_id.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Drop teams (its policies and FK die with it) + its authz helper.
-- ═══════════════════════════════════════════════════════════════════════════
DROP TABLE public.teams;
DROP FUNCTION public.is_team_admin(uuid, uuid);

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. seller_type → operating_model.
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.sellers RENAME COLUMN seller_type TO operating_model;
ALTER TABLE public.sellers DROP CONSTRAINT sellers_seller_type_check;

UPDATE public.sellers
SET operating_model = CASE operating_model WHEN 'business' THEN 'studio' ELSE 'solo' END;

ALTER TABLE public.sellers
  ALTER COLUMN operating_model SET DEFAULT 'solo';
ALTER TABLE public.sellers
  ADD CONSTRAINT sellers_operating_model_check
    CHECK (operating_model IN ('solo', 'studio'));

COMMENT ON COLUMN public.sellers.operating_model IS
  'Self-declared operating model: solo (individual teacher) or studio (venue with several instructors). Identity only — drives UI relevance and copy. It prices NOTHING and gates NOTHING paid; entitlement lives exclusively in subscription_*. Changed via set_operating_model() (owner-only, guardrailed); checkout reads the current declaration at purchase time.';

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. Function rewrites.
-- ═══════════════════════════════════════════════════════════════════════════

-- 7a. Slug normalizer keeps its body; only the name loses "team".
ALTER FUNCTION public._normalize_team_slug(text) RENAME TO _normalize_slug;

-- 7b. ensure_seller_for_user — single insert, slug lives on the seller row.
DROP FUNCTION public.ensure_seller_for_user(text, text, text);
CREATE FUNCTION public.ensure_seller_for_user(
  p_seller_name text,
  p_slug text,
  p_operating_model text DEFAULT 'solo'
) RETURNS TABLE(seller_id uuid, slug text, seller_name text, was_created boolean)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  calling_user uuid := auth.uid();
  v_existing record;
  v_new_id uuid;
  v_slug text;
  v_name text;
BEGIN
  IF calling_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF p_operating_model NOT IN ('solo', 'studio') THEN
    RAISE EXCEPTION 'Invalid operating_model: %', p_operating_model USING ERRCODE = '22023';
  END IF;

  SELECT s.id, s.slug, s.name INTO v_existing
  FROM public.seller_members sm
  JOIN public.sellers s ON s.id = sm.seller_id
  WHERE sm.user_id = calling_user AND sm.role = 'owner'
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT v_existing.id, v_existing.slug, v_existing.name, false;
    RETURN;
  END IF;

  v_name := left(trim(coalesce(p_seller_name, '')), 100);
  IF v_name = '' THEN
    RAISE EXCEPTION 'Seller name is required' USING ERRCODE = '22023';
  END IF;

  v_slug := public._normalize_slug(p_slug);

  IF EXISTS (SELECT 1 FROM public.sellers s WHERE lower(s.slug) = v_slug) THEN
    RAISE EXCEPTION 'Slug already taken' USING ERRCODE = '23505';
  END IF;
  IF EXISTS (SELECT 1 FROM public.seller_slug_aliases a WHERE lower(a.old_slug) = v_slug) THEN
    RAISE EXCEPTION 'Slug already taken' USING ERRCODE = '23505';
  END IF;

  BEGIN
    INSERT INTO public.sellers (name, slug, operating_model)
    VALUES (v_name, v_slug, p_operating_model)
    RETURNING id INTO v_new_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Slug already taken' USING ERRCODE = '23505';
  END;

  INSERT INTO public.seller_members (seller_id, user_id, role)
  VALUES (v_new_id, calling_user, 'owner');

  RETURN QUERY SELECT v_new_id, v_slug, v_name, true;
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_seller_for_user(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_seller_for_user(text, text, text) TO authenticated, service_role;

-- 7c. rename_seller_slug (was rename_team_slug).
DROP FUNCTION public.rename_team_slug(uuid, text);
CREATE FUNCTION public.rename_seller_slug(p_seller_id uuid, p_new_slug text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  calling_user uuid := auth.uid();
  current_slug text;
  new_slug text;
BEGIN
  IF calling_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT s.slug INTO current_slug FROM public.sellers s WHERE s.id = p_seller_id;
  IF current_slug IS NULL THEN
    RAISE EXCEPTION 'Seller not found' USING ERRCODE = '42704';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.seller_members sm
    WHERE sm.seller_id = p_seller_id AND sm.user_id = calling_user AND sm.role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  new_slug := public._normalize_slug(p_new_slug);

  IF lower(current_slug) = new_slug THEN
    RETURN current_slug;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.sellers s
    WHERE lower(s.slug) = new_slug AND s.id <> p_seller_id
  ) THEN
    RAISE EXCEPTION 'Slug already taken' USING ERRCODE = '23505';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.seller_slug_aliases a
    WHERE lower(a.old_slug) = new_slug AND a.seller_id <> p_seller_id
  ) THEN
    RAISE EXCEPTION 'Slug already taken' USING ERRCODE = '23505';
  END IF;

  -- Archive the previous slug so old links keep working.
  INSERT INTO public.seller_slug_aliases (old_slug, seller_id)
  VALUES (current_slug, p_seller_id)
  ON CONFLICT (old_slug) DO NOTHING;

  -- Drop the alias row if the seller is reclaiming its own old slug.
  DELETE FROM public.seller_slug_aliases a
  WHERE a.seller_id = p_seller_id AND lower(a.old_slug) = new_slug;

  UPDATE public.sellers SET slug = new_slug WHERE id = p_seller_id;

  RETURN new_slug;
END;
$$;
REVOKE ALL ON FUNCTION public.rename_seller_slug(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rename_seller_slug(uuid, text) TO authenticated, service_role;

-- 7d. public_storefront_scope (was public_storefront_seller_ids).
DROP FUNCTION public.public_storefront_seller_ids(text);
CREATE FUNCTION public.public_storefront_scope(p_slug text)
RETURNS TABLE(owner_seller_id uuid, seller_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH storefront AS (
    SELECT s.id FROM public.sellers s WHERE lower(s.slug) = lower(trim(p_slug))
  )
  SELECT sf.id, sf.id FROM storefront sf
  UNION
  SELECT sf.id, sa.guest_seller_id
  FROM storefront sf
  JOIN public.seller_affiliations sa ON sa.host_seller_id = sf.id;
$$;
COMMENT ON FUNCTION public.public_storefront_scope(text) IS
  'Public storefront scope: the owner seller plus affiliated guest sellers for a storefront slug.';
REVOKE ALL ON FUNCTION public.public_storefront_scope(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_storefront_scope(text) TO anon, authenticated;

-- 7e. public_studio_location — slug lookup goes straight to sellers.
DROP FUNCTION public.public_studio_location(text);
CREATE FUNCTION public.public_studio_location(p_slug text)
RETURNS TABLE(name text, address text, lat double precision, lon double precision, google_place_id text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT tl.name, tl.address, tl.lat, tl.lon, tl.google_place_id
  FROM public.sellers s
  JOIN public.teacher_locations tl ON tl.seller_id = s.id
  WHERE lower(s.slug) = lower(trim(p_slug))
  ORDER BY tl.created_at ASC
  LIMIT 1;
$$;
COMMENT ON FUNCTION public.public_studio_location(text) IS
  'Public storefront: the seller''s primary (earliest) saved location display fields for a storefront slug.';
REVOKE ALL ON FUNCTION public.public_studio_location(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_studio_location(text) TO anon, authenticated;

-- 7f. Invite-link trio.
DROP FUNCTION public.create_team_invite_link(uuid);
DROP FUNCTION public.lookup_team_invite_link(text);
DROP FUNCTION public.redeem_team_invite_link(text, boolean);

CREATE FUNCTION public.create_seller_invite_link(p_host_seller_id uuid)
RETURNS public.seller_invite_links
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_code text;
  v_attempts int := 0;
  v_row public.seller_invite_links;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.seller_members sm
    WHERE sm.seller_id = p_host_seller_id AND sm.user_id = v_user_id AND sm.role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.seller_invite_links
  SET revoked_at = now()
  WHERE host_seller_id = p_host_seller_id
    AND revoked_at IS NULL;

  LOOP
    v_code := encode(extensions.gen_random_bytes(12), 'hex');

    BEGIN
      INSERT INTO public.seller_invite_links (host_seller_id, code, created_by, expires_at)
      VALUES (p_host_seller_id, v_code, v_user_id, now() + interval '30 days')
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
REVOKE ALL ON FUNCTION public.create_seller_invite_link(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_seller_invite_link(uuid) TO authenticated, service_role;

CREATE FUNCTION public.lookup_seller_invite_link(p_code text)
RETURNS TABLE(status text, host_seller_id uuid, slug text, name text, cover_image_url text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_link public.seller_invite_links;
BEGIN
  SELECT * INTO v_link FROM public.seller_invite_links l WHERE l.code = p_code;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::text, NULL::uuid, NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  IF v_link.revoked_at IS NOT NULL OR v_link.expires_at <= now() THEN
    RETURN QUERY SELECT 'expired'::text, NULL::uuid, NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  RETURN QUERY
    SELECT 'valid'::text, s.id, s.slug, s.name, s.cover_image_url
    FROM public.sellers s
    WHERE s.id = v_link.host_seller_id;
END;
$$;
REVOKE ALL ON FUNCTION public.lookup_seller_invite_link(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_seller_invite_link(text) TO anon, authenticated;

-- Statuses: not_found | expired | no_seller | own_storefront |
-- already_affiliated | has_other_host | joined.
-- The has_other_host branch IS the single-host launch policy (see header).
CREATE FUNCTION public.redeem_seller_invite_link(p_code text, p_force_leave boolean DEFAULT false)
RETURNS TABLE(status text, host_seller_id uuid, existing_host_seller_id uuid)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_link public.seller_invite_links;
  v_user_id uuid := auth.uid();
  v_seller_id uuid;
  v_existing_host uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_link FROM public.seller_invite_links l WHERE l.code = p_code;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::text, NULL::uuid, NULL::uuid;
    RETURN;
  END IF;
  IF v_link.revoked_at IS NOT NULL OR v_link.expires_at <= now() THEN
    RETURN QUERY SELECT 'expired'::text, NULL::uuid, NULL::uuid;
    RETURN;
  END IF;

  SELECT sm.seller_id INTO v_seller_id
  FROM public.seller_members sm
  WHERE sm.user_id = v_user_id AND sm.role = 'owner'
  LIMIT 1;

  IF v_seller_id IS NULL THEN
    RETURN QUERY SELECT 'no_seller'::text, NULL::uuid, NULL::uuid;
    RETURN;
  END IF;

  IF v_link.host_seller_id = v_seller_id THEN
    RETURN QUERY SELECT 'own_storefront'::text, v_link.host_seller_id, NULL::uuid;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.seller_affiliations sa
    WHERE sa.host_seller_id = v_link.host_seller_id
      AND sa.guest_seller_id = v_seller_id
  ) THEN
    RETURN QUERY SELECT 'already_affiliated'::text, v_link.host_seller_id, NULL::uuid;
    RETURN;
  END IF;

  SELECT sa.host_seller_id INTO v_existing_host
  FROM public.seller_affiliations sa
  WHERE sa.guest_seller_id = v_seller_id
  LIMIT 1;

  IF v_existing_host IS NOT NULL AND NOT p_force_leave THEN
    RETURN QUERY SELECT 'has_other_host'::text, v_link.host_seller_id, v_existing_host;
    RETURN;
  END IF;

  IF v_existing_host IS NOT NULL AND p_force_leave THEN
    DELETE FROM public.seller_affiliations sa
    WHERE sa.guest_seller_id = v_seller_id;
  END IF;

  INSERT INTO public.seller_affiliations (host_seller_id, guest_seller_id, invited_by)
  VALUES (v_link.host_seller_id, v_seller_id, v_link.created_by);

  -- Visibility for the instant-join model: tell the host owner(s) who just
  -- joined. Day-granularity dedupe suffix: client retries / double-submits
  -- on the same day collapse to one notification, while a genuine
  -- leave→rejoin on a later day still notifies.
  INSERT INTO public.notifications
    (seller_id, recipient_id, actor_id, type, action_required, dedupe_key, title, body, action_url, metadata)
  SELECT
    v_link.host_seller_id,
    sm.user_id,
    v_user_id,
    'affiliation.joined',
    false,
    'affiliation.joined:' || v_link.host_seller_id || ':' || v_seller_id || ':' || to_char(now(), 'YYYY-MM-DD'),
    'Ny instruktør på studiosiden',
    s.name,
    '/studio',
    jsonb_build_object('host_seller_id', v_link.host_seller_id, 'joined_seller_id', v_seller_id)
  FROM public.seller_members sm
  JOIN public.sellers s ON s.id = v_seller_id
  WHERE sm.seller_id = v_link.host_seller_id
    AND sm.role = 'owner'
    AND sm.user_id <> v_user_id
  ON CONFLICT (recipient_id, dedupe_key) DO NOTHING;

  RETURN QUERY SELECT 'joined'::text, v_link.host_seller_id, NULL::uuid;
END;
$$;
REVOKE ALL ON FUNCTION public.redeem_seller_invite_link(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_seller_invite_link(text, boolean) TO authenticated;

-- 7g. Receipt lookup: storefront slug + image fallback now come off sellers.
CREATE OR REPLACE FUNCTION public.get_signup_by_stripe_id(p_payment_intent_id text DEFAULT NULL::text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  result json;
BEGIN
  IF p_payment_intent_id IS NULL THEN
    RAISE EXCEPTION 'Must supply p_payment_intent_id' USING ERRCODE = '22023';
  END IF;

  SELECT json_build_object(
    'id', s.id,
    'payment_status', s.payment_status,
    'status', s.status,
    'participant_email_masked',
      regexp_replace(s.participant_email, '^(.)[^@]*@', '\1•••@'),
    'amount_paid', s.amount_paid,
    'created_at', s.created_at,
    'course', json_build_object(
      'id', c.id,
      'title', c.title,
      'start_date', c.start_date,
      'time_schedule', c.time_schedule,
      'location', c.location,
      'image_url', COALESCE(c.image_url, sel.default_course_image_url),
      'seller', json_build_object(
        'name', sel.name,
        'logo_url', sel.logo_url,
        'slug', sel.slug
      )
    )
  )
  INTO result
  FROM public.signups s
  JOIN public.courses c ON c.id = s.course_id
  JOIN public.sellers sel ON sel.id = s.seller_id
  WHERE s.stripe_payment_intent_id = p_payment_intent_id
  LIMIT 1;

  RETURN result;
END;
$$;

-- 7h. Operational hydration RPC: seller_type → operating_model in the shape.
DROP FUNCTION public.get_seller_operational(uuid);
CREATE FUNCTION public.get_seller_operational(p_seller_id uuid)
RETURNS TABLE(
  stripe_account_id text, stripe_account_status text, stripe_onboarding_complete boolean,
  operating_model text,
  subscription_plan text, subscription_status text,
  subscription_current_period_end timestamptz, subscription_cancel_at_period_end boolean,
  subscription_customer_id text, uses_integrated_payments boolean, updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT s.stripe_account_id, s.stripe_account_status, s.stripe_onboarding_complete,
         s.operating_model,
         s.subscription_plan, s.subscription_status,
         s.subscription_current_period_end, s.subscription_cancel_at_period_end,
         s.subscription_customer_id,
         s.uses_integrated_payments,
         s.updated_at
  FROM public.sellers s
  WHERE s.id = p_seller_id
    AND public.is_seller_member(p_seller_id, auth.uid());
$$;
REVOKE ALL ON FUNCTION public.get_seller_operational(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_seller_operational(uuid) TO authenticated, service_role;

-- 7i. Protected-columns trigger: operating_model + slug join the guarded set.
--     (slug changes go through rename_seller_slug; operating_model through
--     set_operating_model — both SECURITY DEFINER, owned by postgres, so they
--     pass the role check below.)
CREATE OR REPLACE FUNCTION public.sellers_block_protected_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
  IF current_user IN ('service_role', 'postgres', 'supabase_admin')
     OR current_setting('app.sellers_server_write', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan
     OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.subscription_current_period_end IS DISTINCT FROM OLD.subscription_current_period_end
     OR NEW.subscription_cancel_at_period_end IS DISTINCT FROM OLD.subscription_cancel_at_period_end
     OR NEW.subscription_provider IS DISTINCT FROM OLD.subscription_provider
     OR NEW.subscription_customer_id IS DISTINCT FROM OLD.subscription_customer_id
     OR NEW.subscription_external_id IS DISTINCT FROM OLD.subscription_external_id THEN
    RAISE EXCEPTION 'sellers.subscription_* is server-controlled' USING ERRCODE = '42501';
  END IF;

  IF NEW.stripe_account_id IS DISTINCT FROM OLD.stripe_account_id
     OR NEW.stripe_onboarding_complete IS DISTINCT FROM OLD.stripe_onboarding_complete
     OR NEW.stripe_account_status IS DISTINCT FROM OLD.stripe_account_status THEN
    RAISE EXCEPTION 'sellers.stripe_* is server-controlled' USING ERRCODE = '42501';
  END IF;

  IF NEW.organization_number IS DISTINCT FROM OLD.organization_number
     OR NEW.operating_model IS DISTINCT FROM OLD.operating_model
     OR NEW.slug IS DISTINCT FROM OLD.slug
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.phone IS DISTINCT FROM OLD.phone
     OR NEW.closed_at IS DISTINCT FROM OLD.closed_at THEN
    RAISE EXCEPTION 'sellers identity/lifecycle columns are server-controlled' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- 7j. GDPR export: operating_model key; storefront slug replaces the teams array.
CREATE OR REPLACE FUNCTION public.export_user_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT jsonb_build_object(
    'export_generated_at', now(),
    'subject_user_id', p_user_id,
    'account', (
      SELECT jsonb_build_object(
        'email', u.email,
        'created_at', u.created_at,
        'last_sign_in_at', u.last_sign_in_at
      )
      FROM auth.users u WHERE u.id = p_user_id
    ),
    'profile', (
      SELECT jsonb_build_object(
        'id', p.id,
        'email', p.email,
        'name', p.name,
        'phone', p.phone,
        'role', p.role,
        'created_at', p.created_at,
        'updated_at', p.updated_at,
        'onboarding_completed_at', p.onboarding_completed_at
      )
      FROM public.profiles p WHERE p.id = p_user_id
    ),
    'bookings', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', s.id,
        'course_id', s.course_id,
        'course_title', c.title,
        'participant_name', s.participant_name,
        'participant_email', s.participant_email,
        'participant_phone', s.participant_phone,
        'status', s.status,
        'payment_status', s.payment_status,
        'amount_paid', s.amount_paid,
        'refund_amount', s.refund_amount,
        'refunded_at', s.refunded_at,
        'note', s.note,
        'ticket_label', s.ticket_label_snapshot,
        'created_at', s.created_at
      ) ORDER BY s.created_at), '[]'::jsonb)
      FROM public.signups s
      LEFT JOIN public.courses c ON c.id = s.course_id
      WHERE s.buyer_id = p_user_id
    ),
    'seller_memberships', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'seller_id', sm.seller_id,
        'role', sm.role,
        'member_since', sm.created_at,
        'business', jsonb_build_object(
          'name', se.name,
          'email', se.email,
          'phone', se.phone,
          'organization_number', se.organization_number,
          'operating_model', se.operating_model,
          'storefront_slug', se.slug,
          'created_at', se.created_at,
          'locations', (
            SELECT coalesce(jsonb_agg(jsonb_build_object(
              'name', tl.name,
              'address', tl.address
            ) ORDER BY tl.created_at), '[]'::jsonb)
            FROM public.teacher_locations tl WHERE tl.seller_id = se.id
          )
        )
      ) ORDER BY sm.created_at), '[]'::jsonb)
      FROM public.seller_members sm
      JOIN public.sellers se ON se.id = sm.seller_id
      WHERE sm.user_id = p_user_id
    )
  );
$$;
REVOKE ALL ON FUNCTION public.export_user_data(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.export_user_data(uuid) TO service_role;

-- 7k. Deletion blockers: the instructor branch keyed on the dropped
--     courses.instructor_id (never written → could never fire). The key stays
--     in the payload as an empty array so the delete-account contract is
--     unchanged.
CREATE OR REPLACE FUNCTION public._account_deletion_blockers(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_block   jsonb;
  v_dormant jsonb;
BEGIN
  WITH sole AS (
    SELECT s.id, s.name
    FROM public.sellers s
    WHERE EXISTS (
            SELECT 1 FROM public.seller_members sm
            WHERE sm.seller_id = s.id AND sm.user_id = p_user_id AND sm.role = 'owner')
      AND (SELECT count(*) FROM public.seller_members sm2
           WHERE sm2.seller_id = s.id AND sm2.role = 'owner') = 1
      AND s.closed_at IS NULL
  ), classified AS (
    SELECT so.id, so.name, public._seller_has_unfinished_business(so.id) AS unfinished
    FROM sole so
  )
  SELECT
    coalesce(jsonb_agg(jsonb_build_object('seller_id', id, 'name', name)) FILTER (WHERE unfinished), '[]'::jsonb),
    coalesce(jsonb_agg(jsonb_build_object('seller_id', id, 'name', name)) FILTER (WHERE NOT unfinished), '[]'::jsonb)
  INTO v_block, v_dormant
  FROM classified;

  RETURN jsonb_build_object(
    'blocking_studios',          v_block,
    'dormant_studios',           v_dormant,
    'active_instructor_courses', '[]'::jsonb,
    'deletable',                 jsonb_array_length(v_block) = 0
  );
END;
$$;
REVOKE ALL ON FUNCTION public._account_deletion_blockers(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._account_deletion_blockers(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public._account_deletion_blockers(uuid) TO service_role;

-- 7l. set_operating_model — the identity toggle, owner-only, guardrailed.
CREATE FUNCTION public.set_operating_model(p_seller_id uuid, p_operating_model text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_row public.sellers%ROWTYPE;
  v_repricing boolean := false;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF p_operating_model NOT IN ('solo', 'studio') THEN
    RAISE EXCEPTION 'Invalid operating_model: %', p_operating_model USING ERRCODE = '22023';
  END IF;
  IF NOT public.is_seller_owner(p_seller_id, v_user) THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row FROM public.sellers WHERE id = p_seller_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Seller not found' USING ERRCODE = '42704';
  END IF;

  IF v_row.operating_model = p_operating_model THEN
    RETURN jsonb_build_object(
      'operating_model', p_operating_model,
      'changed', false,
      'repricing_needed', false
    );
  END IF;

  -- Guardrail: a studio hosting affiliates cannot silently become solo — the
  -- guests' courses would keep rendering on a storefront whose management UI
  -- just disappeared. The owner removes the affiliates first.
  IF p_operating_model = 'solo' AND EXISTS (
    SELECT 1 FROM public.seller_affiliations sa WHERE sa.host_seller_id = p_seller_id
  ) THEN
    RAISE EXCEPTION 'has_active_affiliates' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.sellers SET operating_model = p_operating_model WHERE id = p_seller_id;

  -- Two-axis policy: the declaration prices nothing directly, but an active
  -- Pro subscription follows the declaration at the NEXT period. The Stripe
  -- price swap is performed by the set-operating-model edge function when
  -- this flag is true.
  v_repricing := v_row.subscription_plan = 'pro'
    AND v_row.subscription_status IN ('active', 'past_due')
    AND v_row.subscription_external_id IS NOT NULL;

  RETURN jsonb_build_object(
    'operating_model', p_operating_model,
    'changed', true,
    'repricing_needed', v_repricing,
    'subscription_external_id', v_row.subscription_external_id
  );
END;
$$;
COMMENT ON FUNCTION public.set_operating_model(uuid, text) IS
  'Owner-only toggle of the self-declared operating model. Blocks studio→solo while hosting affiliates (has_active_affiliates). Returns repricing_needed when an active Pro subscription should move to the other price at next period — the set-operating-model edge function performs that swap.';
REVOKE ALL ON FUNCTION public.set_operating_model(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_operating_model(uuid, text) TO authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. RLS policies for the re-keyed tables.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE POLICY "seller_affiliations_read" ON public.seller_affiliations
  FOR SELECT TO authenticated
  USING (
    public.is_seller_owner(host_seller_id, (SELECT auth.uid()))
    OR public.is_seller_member(guest_seller_id, (SELECT auth.uid()))
  );

CREATE POLICY "seller_affiliations_delete" ON public.seller_affiliations
  FOR DELETE TO authenticated
  USING (
    public.is_seller_owner(host_seller_id, (SELECT auth.uid()))
    OR public.is_seller_member(guest_seller_id, (SELECT auth.uid()))
  );

-- No INSERT/UPDATE policies: rows are created only via redeem_seller_invite_link
-- (SECURITY DEFINER) and there is no status left to update.
REVOKE INSERT, UPDATE ON public.seller_affiliations FROM authenticated;

CREATE POLICY "seller_invite_links_host" ON public.seller_invite_links
  TO authenticated
  USING (public.is_seller_owner(host_seller_id, (SELECT auth.uid())))
  WITH CHECK (public.is_seller_owner(host_seller_id, (SELECT auth.uid())));

CREATE POLICY "seller_slug_aliases_select" ON public.seller_slug_aliases
  FOR SELECT USING (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. Column grants for the new sellers columns.
--    (sellers uses column-level SELECT grants — a new column is invisible to
--    PostgREST until granted; see the storefront-403 lesson in 20260620140000.)
-- ═══════════════════════════════════════════════════════════════════════════
GRANT SELECT (slug, cover_image_url, default_course_image_url)
  ON public.sellers TO anon, authenticated;
GRANT UPDATE (cover_image_url, default_course_image_url)
  ON public.sellers TO authenticated;

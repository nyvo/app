-- Editable storefront slug. Sellers can rename their public URL post-onboarding
-- from /teacher/studio. Old slugs are archived in team_slug_aliases so previously
-- shared links keep resolving — public pages issue a client-side replace to the
-- canonical slug.
--
-- Uniqueness covers BOTH teams.slug and team_slug_aliases.old_slug. A freed slug
-- never becomes available again, otherwise a stale link could point at the wrong
-- team after someone else claimed the old name.

-- ---------------------------------------------------------------------------
-- Alias table.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_slug_aliases (
  old_slug    TEXT PRIMARY KEY,
  team_id     UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_slug_aliases_team_id_idx
  ON public.team_slug_aliases(team_id);

CREATE UNIQUE INDEX IF NOT EXISTS team_slug_aliases_lower_idx
  ON public.team_slug_aliases (lower(old_slug));

ALTER TABLE public.team_slug_aliases ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.team_slug_aliases TO anon, authenticated;

-- Anon SELECT is required: the public storefront resolves a URL slug to a team
-- by checking this table on miss. Writes only happen through the SECURITY
-- DEFINER RPC below, so no INSERT/UPDATE/DELETE policies.
DROP POLICY IF EXISTS team_slug_aliases_select ON public.team_slug_aliases;
CREATE POLICY team_slug_aliases_select ON public.team_slug_aliases
  FOR SELECT USING (true);

-- ---------------------------------------------------------------------------
-- Shared slug normalization. Extracted out of ensure_seller_for_user so the
-- two RPCs (initial create + rename) can't drift.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._normalize_team_slug(p_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
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
$$;

REVOKE ALL ON FUNCTION public._normalize_team_slug(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._normalize_team_slug(TEXT) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- ensure_seller_for_user is rewritten to use the shared helper. Behavior is
-- unchanged for callers (same RETURNS, same error codes, same idempotence).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_seller_for_user(
  p_seller_name TEXT,
  p_team_slug TEXT,
  p_seller_type TEXT DEFAULT 'individual'
)
RETURNS TABLE(
  seller_id UUID,
  team_id UUID,
  team_slug TEXT,
  seller_name TEXT,
  member_role public.seller_member_role,
  was_created BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  calling_user UUID := auth.uid();
  existing_seller_id UUID;
  existing_team_id UUID;
  existing_team_slug TEXT;
  existing_seller_name TEXT;
  new_seller_id UUID;
  new_team_id UUID;
  candidate_slug TEXT;
  clean_name TEXT;
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
    FROM public.teams t WHERE t.owner_seller_id = existing_seller_id LIMIT 1;
    SELECT s.name INTO existing_seller_name FROM public.sellers s WHERE s.id = existing_seller_id;
    RETURN QUERY SELECT existing_seller_id, existing_team_id, existing_team_slug,
      existing_seller_name, 'owner'::public.seller_member_role, FALSE;
    RETURN;
  END IF;

  clean_name := LEFT(TRIM(COALESCE(p_seller_name, '')), 100);
  IF clean_name = '' THEN
    RAISE EXCEPTION 'Seller name is required' USING ERRCODE = '22023';
  END IF;

  candidate_slug := public._normalize_team_slug(p_team_slug);

  -- Block against current slugs AND archived aliases.
  IF EXISTS (SELECT 1 FROM public.teams WHERE lower(slug) = candidate_slug) THEN
    RAISE EXCEPTION 'Slug already taken' USING ERRCODE = '23505';
  END IF;
  IF EXISTS (SELECT 1 FROM public.team_slug_aliases WHERE lower(old_slug) = candidate_slug) THEN
    RAISE EXCEPTION 'Slug already taken' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.sellers (name, seller_type) VALUES (clean_name, p_seller_type)
  RETURNING id INTO new_seller_id;

  BEGIN
    INSERT INTO public.teams (slug, name, owner_seller_id, invite_code)
    VALUES (
      candidate_slug,
      clean_name,
      new_seller_id,
      upper(substring(md5(random()::text || new_seller_id::text || clock_timestamp()::text) from 1 for 8))
    )
    RETURNING id INTO new_team_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Slug already taken' USING ERRCODE = '23505';
  END;

  INSERT INTO public.seller_members (seller_id, user_id, role)
  VALUES (new_seller_id, calling_user, 'owner');

  RETURN QUERY SELECT new_seller_id, new_team_id, candidate_slug,
    clean_name, 'owner'::public.seller_member_role, TRUE;
  RETURN;
END;
$$;

-- ---------------------------------------------------------------------------
-- Rename RPC. Only the seller's owner can call it. Old slug is archived as
-- an alias so previously shared URLs keep resolving.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rename_team_slug(
  p_team_id UUID,
  p_new_slug TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
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

REVOKE ALL ON FUNCTION public.rename_team_slug(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rename_team_slug(UUID, TEXT) TO authenticated, service_role;

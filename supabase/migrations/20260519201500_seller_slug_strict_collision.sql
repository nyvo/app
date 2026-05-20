-- ensure_seller_for_user previously resolved slug collisions silently by
-- appending -1, -2, ... The slug field is user-facing in the onboarding form,
-- so silent rewriting violates the principle of least surprise: a user picks
-- "inspire-yogastudio" and walks away thinking that's their URL, when in fact
-- they got "inspire-yogastudio-3". It also hides squatters and creates two
-- studios with the same display name and near-identical URLs.
--
-- The frontend already has the error path for this case (toast: "Denne
-- adressen er opptatt. Velg en annen.") — it was just dead code because the
-- RPC never raised. Match behavior to intent: fail loudly on collision and
-- let the user pick another slug.
--
-- The reserved-slug guard also moves from "append -studio" to "raise" for
-- the same reason: don't silently transform the user's input.

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
  IF calling_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;
  IF p_seller_type NOT IN ('individual', 'business') THEN
    RAISE EXCEPTION 'Invalid seller_type: %', p_seller_type USING ERRCODE = '22023';
  END IF;

  -- Idempotent: an existing owner just gets their seller back.
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

  -- Slug normalization. Note: callers always send the slug they showed the
  -- user in the form, so we normalize without falling back to the name.
  candidate_slug := NULLIF(TRIM(LOWER(COALESCE(p_team_slug, ''))), '');
  IF candidate_slug IS NULL THEN
    RAISE EXCEPTION 'Slug is required' USING ERRCODE = '22023';
  END IF;
  candidate_slug := REGEXP_REPLACE(candidate_slug, '[æ]', 'ae', 'g');
  candidate_slug := REGEXP_REPLACE(candidate_slug, '[ø]', 'o',  'g');
  candidate_slug := REGEXP_REPLACE(candidate_slug, '[å]', 'a',  'g');
  candidate_slug := REGEXP_REPLACE(candidate_slug, '[^a-z0-9]+', '-', 'g');
  candidate_slug := REGEXP_REPLACE(candidate_slug, '^-+|-+$', '', 'g');
  candidate_slug := LEFT(candidate_slug, 40);

  IF candidate_slug = '' OR LENGTH(candidate_slug) < 3 THEN
    RAISE EXCEPTION 'Slug must be at least 3 characters' USING ERRCODE = '22023';
  END IF;
  IF candidate_slug = ANY(reserved_slugs) THEN
    RAISE EXCEPTION 'Slug is reserved' USING ERRCODE = '23505';
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
    -- Surface a clean error the frontend can match on. The seller insert
    -- above rolls back with the transaction.
    RAISE EXCEPTION 'Slug already taken' USING ERRCODE = '23505';
  END;

  INSERT INTO public.seller_members (seller_id, user_id, role)
  VALUES (new_seller_id, calling_user, 'owner');

  RETURN QUERY SELECT new_seller_id, new_team_id, candidate_slug,
    clean_name, 'owner'::public.seller_member_role, TRUE;
  RETURN;
END;
$$;

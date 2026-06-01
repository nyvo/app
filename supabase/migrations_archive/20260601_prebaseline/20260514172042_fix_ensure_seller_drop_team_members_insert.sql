-- Fix ensure_seller_for_user: drop the orphan INSERT into public.team_members.
-- That table was dropped in 20260512143602_drop_team_members_table, but the
-- RPC still referenced it — every new seller signup raised 42P01.
-- Team membership is now implicit via teams.owner_seller_id (1:1) and
-- seller_members(role='owner').

CREATE OR REPLACE FUNCTION public.ensure_seller_for_user(
  p_seller_name text,
  p_team_slug text,
  p_seller_type text DEFAULT 'individual'::text
)
RETURNS TABLE(
  seller_id uuid,
  team_id uuid,
  team_slug text,
  seller_name text,
  member_role seller_member_role,
  was_created boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  calling_user UUID := auth.uid();
  existing_seller_id UUID; existing_team_id UUID;
  existing_team_slug TEXT; existing_seller_name TEXT;
  new_seller_id UUID; new_team_id UUID;
  base_slug TEXT; candidate_slug TEXT; clean_name TEXT;
  slug_suffix INT := 0; suffix_text TEXT;
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
  IF calling_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_seller_type NOT IN ('individual', 'business') THEN
    RAISE EXCEPTION 'Invalid seller_type: %', p_seller_type;
  END IF;

  SELECT sm.seller_id INTO existing_seller_id
  FROM public.seller_members sm
  WHERE sm.user_id = calling_user AND sm.role = 'owner' LIMIT 1;

  IF existing_seller_id IS NOT NULL THEN
    SELECT t.id, t.slug INTO existing_team_id, existing_team_slug
    FROM public.teams t WHERE t.owner_seller_id = existing_seller_id LIMIT 1;
    SELECT s.name INTO existing_seller_name FROM public.sellers s WHERE s.id = existing_seller_id;
    RETURN QUERY SELECT existing_seller_id, existing_team_id, existing_team_slug,
      existing_seller_name, 'owner'::public.seller_member_role, FALSE;
    RETURN;
  END IF;

  clean_name := LEFT(TRIM(COALESCE(p_seller_name, '')), 100);
  IF clean_name = '' THEN RAISE EXCEPTION 'Seller name is required'; END IF;

  base_slug := NULLIF(TRIM(LOWER(COALESCE(p_team_slug, ''))), '');
  IF base_slug IS NULL THEN base_slug := LOWER(clean_name); END IF;
  base_slug := REGEXP_REPLACE(base_slug, '[æ]', 'ae', 'g');
  base_slug := REGEXP_REPLACE(base_slug, '[ø]', 'o',  'g');
  base_slug := REGEXP_REPLACE(base_slug, '[å]', 'a',  'g');
  base_slug := REGEXP_REPLACE(base_slug, '[^a-z0-9]+', '-', 'g');
  base_slug := REGEXP_REPLACE(base_slug, '^-+|-+$', '', 'g');
  base_slug := LEFT(base_slug, 40);
  IF base_slug = '' THEN RAISE EXCEPTION 'Could not generate valid slug from name'; END IF;
  IF LENGTH(base_slug) < 3 THEN RAISE EXCEPTION 'Slug must be at least 3 characters'; END IF;
  IF base_slug = ANY(reserved_slugs) THEN
    base_slug := base_slug || '-studio';
  END IF;

  INSERT INTO public.sellers (name, seller_type) VALUES (clean_name, p_seller_type)
  RETURNING id INTO new_seller_id;

  LOOP
    IF slug_suffix = 0 THEN candidate_slug := base_slug;
    ELSE
      suffix_text := slug_suffix::TEXT;
      candidate_slug := LEFT(base_slug, 40 - 1 - LENGTH(suffix_text)) || '-' || suffix_text;
    END IF;
    IF candidate_slug = ANY(reserved_slugs) THEN
      slug_suffix := slug_suffix + 1;
      CONTINUE;
    END IF;
    BEGIN
      INSERT INTO public.teams (slug, name, owner_seller_id, invite_code)
      VALUES (candidate_slug, clean_name, new_seller_id,
        upper(substring(md5(random()::text || new_seller_id::text || clock_timestamp()::text) from 1 for 8)))
      RETURNING id INTO new_team_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      slug_suffix := slug_suffix + 1;
      IF slug_suffix > 50 THEN RAISE EXCEPTION 'Could not generate unique slug after 50 attempts'; END IF;
    END;
  END LOOP;

  INSERT INTO public.seller_members (seller_id, user_id, role) VALUES (new_seller_id, calling_user, 'owner');

  RETURN QUERY SELECT new_seller_id, new_team_id, candidate_slug,
    clean_name, 'owner'::public.seller_member_role, TRUE;
  RETURN;
END;
$function$;

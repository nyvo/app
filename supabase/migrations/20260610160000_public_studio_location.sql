-- Public studio location for storefront pages.
--
-- teacher_locations is member-gated (RLS), so anon can't read it directly.
-- The storefront needs the studio's *canonical* location — the one the teacher
-- sets in the Studio tab — not a value scraped from individual course rows.
-- This RPC exposes only the display fields (name/address/coords, never rooms)
-- of the studio's primary location: the earliest-created teacher_location for
-- the team's owner seller.

CREATE OR REPLACE FUNCTION public.public_studio_location(p_team_slug text)
RETURNS TABLE (
  name text,
  address text,
  lat double precision,
  lon double precision,
  google_place_id text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT tl.name, tl.address, tl.lat, tl.lon, tl.google_place_id
  FROM public.teams t
  JOIN public.teacher_locations tl ON tl.seller_id = t.owner_seller_id
  WHERE lower(t.slug) = lower(trim(p_team_slug))
  ORDER BY tl.created_at ASC
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.public_studio_location(text) IS
  'Public storefront: the studio''s primary (earliest) saved location display fields for a team/storefront slug.';

REVOKE ALL ON FUNCTION public.public_studio_location(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_studio_location(text) TO anon, authenticated;

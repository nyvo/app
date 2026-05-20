-- Public seller scope for storefront pages.
--
-- Storefront pages are public, but team_affiliations itself is private because
-- it also contains workflow/audit fields. This RPC exposes only the seller IDs
-- whose courses may be shown on a given storefront: the owner seller plus active
-- collaborator sellers.

CREATE OR REPLACE FUNCTION public.public_storefront_seller_ids(p_team_slug text)
RETURNS TABLE (
  team_id uuid,
  owner_seller_id uuid,
  seller_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
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

COMMENT ON FUNCTION public.public_storefront_seller_ids(text) IS
  'Public storefront scope: returns the owner seller and active collaborator sellers for a team/storefront slug.';

REVOKE ALL ON FUNCTION public.public_storefront_seller_ids(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_storefront_seller_ids(text) TO anon, authenticated;

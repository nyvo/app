-- A seller owns at most one team. Without this constraint, PostgREST embeds
-- `teams!owner_seller_id` as an array (many-side default), so callers reading
-- `seller.team.slug` as a singular object get undefined and 404 on slug checks
-- (see create-dintero-session). Enforcing uniqueness flips the embed to a
-- single object and matches the business invariant.

alter table public.teams
  add constraint teams_owner_seller_id_key unique (owner_seller_id);

-- Cascade team deletion when its owner seller is deleted.
--
-- teams.owner_seller_id was created with the default NO ACTION, which blocked
-- DELETE on sellers (the orphan team retained the slug, so re-signups bumped
-- to slug-2, -3). A team has no meaning without its owner seller — they're
-- 1:1 via teams_owner_seller_id_key — so CASCADE is the correct behavior.

ALTER TABLE public.teams
  DROP CONSTRAINT teams_owner_seller_id_fkey;

ALTER TABLE public.teams
  ADD CONSTRAINT teams_owner_seller_id_fkey
  FOREIGN KEY (owner_seller_id) REFERENCES public.sellers(id) ON DELETE CASCADE;

-- Rooms gain an optional capacity. Move teacher_locations.rooms from text[]
-- (array of room names) to jsonb (array of { name, capacity }) so each room
-- can carry a capacity used to pre-fill a course's Plasser on room select.
-- Existing room names convert to { name, capacity: null }.
--
-- Postgres forbids a subquery inside an ALTER COLUMN ... USING transform, so we
-- add a new jsonb column, backfill it, then swap it in.

ALTER TABLE public.teacher_locations
  ADD COLUMN rooms_jsonb jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.teacher_locations
SET rooms_jsonb = COALESCE(
  (SELECT jsonb_agg(jsonb_build_object('name', elem, 'capacity', NULL))
     FROM unnest(rooms) AS elem),
  '[]'::jsonb);

ALTER TABLE public.teacher_locations DROP COLUMN rooms;
ALTER TABLE public.teacher_locations RENAME COLUMN rooms_jsonb TO rooms;

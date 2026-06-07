-- Google Places: store coordinates so we can render a real map.
--
-- A studio's saved location (teacher_locations) gets lat/lon + the Google
-- place_id, filled by the Stedsnavn autocomplete. When a teacher picks that
-- location for a course, the coords are copied onto the course row so the
-- public course page can render an embedded map without a join back to
-- teacher_locations.

ALTER TABLE public.teacher_locations
  ADD COLUMN lat double precision,
  ADD COLUMN lon double precision,
  ADD COLUMN google_place_id text;

ALTER TABLE public.courses
  ADD COLUMN location_lat double precision,
  ADD COLUMN location_lon double precision,
  ADD COLUMN location_place_id text;

-- courses anon SELECT is column-level (see
-- 20260606180000_courses_anon_select_drop_idempotency_key). The public course
-- page must read these coords, so grant the three new columns to anon. RLS
-- (courses_select_public: status <> 'draft') still applies on top.
-- teacher_locations needs no grant change: authenticated keeps its table-level
-- grant and the member-only RLS, and coords are never exposed to anon directly.
GRANT SELECT (location_lat, location_lon, location_place_id)
  ON public.courses TO anon;

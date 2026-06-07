-- Denormalized street address for a course's location.
-- Coords (lat/lon/place_id) already ride from the venue onto the course at save
-- time; the address follows the same pattern so the public course page can show
-- it without joining teacher_locations.
alter table public.courses
  add column if not exists location_address text;

comment on column public.courses.location_address is
  'Street address copied from the picked venue (teacher_locations.address) at save time. Denormalized like location_lat/lon/place_id; shown on the public course location card.';

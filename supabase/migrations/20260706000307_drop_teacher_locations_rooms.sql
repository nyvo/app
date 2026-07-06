-- The rooms feature was removed from the app (2026-07-06): no code reads or
-- writes teacher_locations.rooms anymore, so drop the column.
alter table public.teacher_locations drop column if exists rooms;

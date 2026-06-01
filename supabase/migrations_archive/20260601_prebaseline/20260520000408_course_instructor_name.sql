-- Add an explicit display-only instructor name for courses.
-- This avoids inferring a teacher from seller/profile names on the public surfaces.

alter table public.courses
  add column if not exists instructor_name text;

-- Backfill existing rows from the legacy profile FK so current public pages
-- keep showing a teacher name for seeded and historical data.
update public.courses c
set instructor_name = p.name
from public.profiles p
where c.instructor_name is null
  and c.instructor_id = p.id
  and p.name is not null;

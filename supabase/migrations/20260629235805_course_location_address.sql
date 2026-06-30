-- Store the street address of a course location alongside the place name.
--
-- `location` holds the place NAME (e.g. "Flow Studio") picked from Google
-- Places; the formatted street address was captured in the form but discarded.
-- Persisting it lets the course overview's Sted card show name + address, the
-- same split the location picker shows. Nullable + additive; existing RLS on
-- `courses` already covers the new column.
--
-- NB: applied to the shared remote DB as version 20260629235805. This file
-- restores that version so `supabase db push` matches remote history. It
-- supersedes the mis-versioned 20260630120000_course_location_address.sql
-- (same change, wrong timestamp — never recorded on the remote).

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS location_address text;

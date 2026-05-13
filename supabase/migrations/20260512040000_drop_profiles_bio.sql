-- Drop profiles.bio. Description consolidation: teams.description is the
-- single source of truth for the seller/teacher's "about" blurb. Both the
-- Konto page "Om deg" textarea and the Studio page "Beskrivelse" textarea
-- already write to teams.description (different labels, same column).
-- profiles.bio was a vestigial read-target — no UI ever wrote it, no
-- component ever displayed it. The instructor projection in publicCourses
-- referenced it but never surfaced the value.
ALTER TABLE public.profiles DROP COLUMN IF EXISTS bio;

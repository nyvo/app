-- Drop teams.description. Booking platform focus: buyers want
-- when/where/how much, not paragraph-form studio bios. The "Om deg" textarea
-- on the Konto page and "Beskrivelse" on the Studio page are both removed.
-- courses.description stays — that's the per-course pitch which IS
-- essential for the booking decision.
ALTER TABLE public.teams DROP COLUMN IF EXISTS description;

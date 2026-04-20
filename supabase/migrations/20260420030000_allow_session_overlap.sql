-- Allow overlapping course sessions within the same organization.
--
-- Previously, the `enforce_session_conflict_check` trigger on course_sessions
-- refused any INSERT/UPDATE that overlapped an existing session for the same
-- organization. That assumed a single teacher with a single room.
--
-- The product now supports multi-room studios (and the schedule view already
-- renders overlapping sessions side-by-side). Conflict feedback moves to the
-- UI as a soft warning during course creation instead of a hard DB error.
--
-- We only drop the trigger; the `enforce_session_no_conflict()` function and
-- the underlying `check_session_conflict(...)` remain so the UI (or future
-- opt-in validation) can still call them.

DROP TRIGGER IF EXISTS enforce_session_conflict_check ON public.course_sessions;

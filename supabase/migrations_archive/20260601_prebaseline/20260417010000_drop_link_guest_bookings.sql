-- Student accounts were removed from the app; public course signup is now
-- guest-only. The link_guest_bookings() RPC (from 20260226010000) auto-linked
-- a new student's historical guest signups by matching participant_email to
-- auth.users.email. With no student-signup flow, nothing calls it.

DROP FUNCTION IF EXISTS link_guest_bookings();

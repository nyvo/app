-- The waitlist anon/authenticated INSERT grant was already revoked in
-- 20260606190000_waitlist_close_unused_anon_write — the write surface is
-- intentionally closed (unused, 0 rows; the React WaitlistForm is dead UI).
-- This RLS policy was the last layer still implying an open INSERT path,
-- which is misleading. Dropping it closes the surface at both the privilege
-- and policy layers.
drop policy if exists waitlist_insert_valid_email on public.waitlist;

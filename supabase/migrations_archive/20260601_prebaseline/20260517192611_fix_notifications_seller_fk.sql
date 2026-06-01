-- Fix FK on notifications.seller_id (2026-05-17 follow-up to 20260517010000)
--
-- Initial migration referenced profiles(id), which is wrong. Throughout this
-- codebase, *.seller_id references the sellers table (the studio tenant),
-- and per-user fanout is resolved via seller_members. Aligning notifications
-- to the same convention.
--
-- Safe to run as a destructive ALTER because no notification rows exist yet
-- (table created earlier today, no inserts).

alter table public.notifications
  drop constraint notifications_seller_id_fkey;

alter table public.notifications
  add constraint notifications_seller_id_fkey
  foreign key (seller_id) references public.sellers(id) on delete cascade;

-- Per-item dismiss (soft archive) for in-app notifications (2026-06-07)
--
-- Adds a recipient-controlled "clear this row" action that hides a
-- notification from the default feed while retaining it for history/audit —
-- the 2025/26 standard (Slack "Cleared", Linear/GitHub archive): clearing a
-- notification is not a delete. Distinct from read_at (engagement) and
-- resolved_at (action handled). The existing notifications_update_own RLS
-- policy already lets the recipient set this column, so no new policy is
-- needed; the bulk "Marker alle som lest" (mark-all-read) is unchanged.

alter table public.notifications
  add column if not exists archived_at timestamptz;

comment on column public.notifications.archived_at is
  'Set when the recipient dismisses (clears) the row from their feed. Soft archive: hidden from the default feed, retained for history/audit. Distinct from read_at (engagement) and resolved_at (action handled).';

-- Active-feed index: the popover fetches recipient rows where archived_at is
-- null, newest first. Mirrors the existing partial-index pattern on this table.
create index if not exists notifications_recipient_active
  on public.notifications (recipient_id, created_at desc)
  where archived_at is null;

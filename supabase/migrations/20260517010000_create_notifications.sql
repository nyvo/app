-- ===========================================================================
-- Create in-app notifications system (2026-05-17)
--
-- A bell-icon popover on the teacher dashboard. Replaces the previous
-- notifications system dropped on 2026-04-25, which:
--   - split read-state across two tables (notifications + notification_reads)
--   - relied on DB triggers on signups + messages
--
-- This version is intentionally simpler and harder to break:
--   - one table, snapshot copy (Norwegian, pre-rendered with formatKroner)
--   - per-user fanout (one row per recipient)
--   - inserts come from Edge Functions in the same transaction as the
--     business event — no DB triggers
--   - dedupe_key + partial unique index protects against webhook retries,
--     cron reruns, and Edge Function retries
--   - read_at / seen_at / resolved_at separate three distinct UX states:
--       seen_at     → popover was opened (clears the bell dot)
--       read_at     → user clicked the row (dims the row)
--       resolved_at → action-required item was handled (clears amber dot)
--
-- Retention: forever in v1. Volume estimate ~18k rows/year/studio at busy
-- scale. If volume becomes a problem later, add a cleanup cron — not
-- optimizing early.
-- ===========================================================================

create table public.notifications (
  id              bigint generated always as identity primary key,

  -- Who gets notified. Normally the studio owner; future-proofed for team
  -- members getting their own rows when team-fanout ships.
  recipient_id    uuid not null references auth.users(id) on delete cascade,

  -- Tenant scope. Matches courses.seller_id et al — the studio/business
  -- that owns this event. Recipient is normally the seller; the two differ
  -- only when team members are notified about a studio's events (future).
  seller_id       uuid not null references public.profiles(id) on delete cascade,

  -- Optional actor — the person who caused the event (e.g., the customer
  -- who booked, the team member who accepted). Null for system events
  -- (payout, KYC). Future-proofs richer copy without a migration.
  actor_id        uuid references public.profiles(id) on delete set null,

  type            text not null,
  action_required boolean not null default false,

  -- Idempotency key. Stable per real-world event so webhook retries and
  -- cron reruns cannot create duplicates. Pattern: <event_type>:<entity_id>.
  -- Nullable for events that should genuinely fan out (none in v1).
  dedupe_key      text,

  -- Snapshot strings — Norwegian, pre-rendered. Never mutated after insert
  -- so old rows don't change meaning if the underlying entity is edited
  -- or deleted.
  title           text not null,
  body            text,
  action_url      text not null,

  -- Per-type structured fields (amount, bankSuffix, role, etc.). Read-only
  -- after insert; for debugging and future filtering.
  metadata        jsonb not null default '{}'::jsonb,

  seen_at         timestamptz,
  read_at         timestamptz,
  resolved_at     timestamptz,

  created_at      timestamptz not null default now()
);

comment on column public.notifications.seller_id is
  'Tenant scope. Matches courses.seller_id et al — the studio/business that owns the event. Recipient is normally the seller; differs only when team members get fanout (future).';
comment on column public.notifications.dedupe_key is
  'Stable key per real-world event to make inserts idempotent under webhook/cron retries. Pattern: <event_type>:<entity_id>.';
comment on column public.notifications.seen_at is
  'Set when the recipient opens the popover. Clears the bell dot. Distinct from read_at, which requires an explicit row click.';
comment on column public.notifications.read_at is
  'Set when the recipient clicks the row or uses "Marker alle som lest". Dims the row visually but keeps it in the feed.';
comment on column public.notifications.resolved_at is
  'Only meaningful when action_required = true. Set when the underlying action is handled (e.g., KYC docs uploaded). Clears the amber bell dot for that row.';

-- ===========================================================================
-- Indexes
-- ===========================================================================

-- Idempotency. Insert with on conflict (dedupe_key) do nothing.
create unique index notifications_dedupe_key_unique
  on public.notifications (dedupe_key)
  where dedupe_key is not null;

-- Hot read paths
create index notifications_recipient_created
  on public.notifications (recipient_id, created_at desc);

create index notifications_recipient_unread
  on public.notifications (recipient_id)
  where read_at is null;

create index notifications_recipient_unseen
  on public.notifications (recipient_id)
  where seen_at is null;

create index notifications_recipient_action
  on public.notifications (recipient_id)
  where action_required and resolved_at is null;

create index notifications_recipient_read_created
  on public.notifications (recipient_id, read_at, created_at desc);

-- ===========================================================================
-- RLS — recipients can read and update their own rows. No insert from
-- clients; Edge Functions (service_role) write everything.
-- ===========================================================================

alter table public.notifications enable row level security;

create policy notifications_select_own on public.notifications
  for select
  using (recipient_id = auth.uid());

create policy notifications_update_own on public.notifications
  for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- Intentionally NO insert policy and NO delete policy. service_role bypasses
-- RLS for Edge Function writes; user clients cannot create or delete rows.

-- ===========================================================================
-- Realtime — postgres_changes filter on recipient_id powers the live feed.
-- Default replica identity (primary key) is sufficient for our UPDATE patch
-- pattern; we don't need OLD row data.
-- ===========================================================================

alter publication supabase_realtime add table public.notifications;

-- Fix in-app notifications never being written (2026-06-07)
--
-- enqueueNotification() (supabase/functions/_shared/notifications.ts) upserts
-- with `onConflict: 'recipient_id,dedupe_key'`, which PostgREST emits as
-- `INSERT ... ON CONFLICT (recipient_id, dedupe_key) DO NOTHING`. The only
-- matching unique index was PARTIAL (`WHERE dedupe_key IS NOT NULL`), and
-- Postgres will not use a partial index as a conflict arbiter unless the
-- statement also supplies the predicate — which supabase-js does not. So every
-- insert failed with 42P10 and was swallowed by the best-effort helper, leaving
-- the notifications table empty (bell never lit) despite live signups.
--
-- Replace the partial index with a plain (non-partial) unique index so the
-- arbiter matches. dedupe_key is always set by renderNotification(); even if a
-- NULL ever slips through, NULLs are distinct by default so null-dedupe rows
-- still never collide. No edge-function redeploy is needed.

drop index if exists public.notifications_recipient_dedupe_key_unique;

create unique index notifications_recipient_dedupe_key_unique
  on public.notifications (recipient_id, dedupe_key);

-- Enforce the invariants that production code already assumes:
--   * one payment_attempts row per Dintero session id (sweep cron, webhook
--     correlation, finalize-by-merchant-reference all depend on this)
--   * one payment_attempts row per Dintero transaction id (so .maybeSingle()
--     in the webhook + finalize lookups can never error on duplicate rows)
--   * one signup per Dintero transaction id (so we never create two signups
--     for the same captured payment)
--
-- All three had non-unique indexes (or none at all). Replacing them with
-- partial UNIQUE indexes makes the invariant DB-enforced and lets PostgREST
-- short-circuit on duplicate inserts.

drop index if exists public.idx_payment_attempts_dintero_transaction;
create unique index payment_attempts_dintero_transaction_id_key
  on public.payment_attempts (dintero_transaction_id)
  where dintero_transaction_id is not null;

create unique index payment_attempts_dintero_session_id_key
  on public.payment_attempts (dintero_session_id)
  where dintero_session_id is not null;

drop index if exists public.idx_signups_dintero_transaction_id;
create unique index signups_dintero_transaction_id_key
  on public.signups (dintero_transaction_id)
  where dintero_transaction_id is not null;

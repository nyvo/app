# Ops health checks

Copy-pasteable, **read-only** SQL for the Supabase SQL editor (service-role). Run
these on a cadence (e.g. once a day, or when something looks off). No automation is
required; if you later want alerting, wrap the "triage" queries in a tiny daily cron
that emails when a count is non-zero. All were validated against production.

Quick context for thresholds: `payment_attempts.status` is one of
`pending / failed / voided / captured / settled / refunded`; `signups.payment_status`
is `pending / paid / failed / refunded`; `signups.status` is
`confirmed / cancelled / course_cancelled`.

---

## 1. One-shot dashboard (run all checks at once)

Every row should read `0` (or be explained). Anything non-zero → drill in with the
detail query in the matching section below.

```sql
select 'stale_pending_attempts'      as check, count(*) as n
  from public.payment_attempts
  where status='pending' and created_at < now() - interval '1 hour'
union all
select 'attempts_pending_24h+',           count(*)
  from public.payment_attempts
  where status='pending' and created_at < now() - interval '24 hours'
union all
select 'paid_without_txn',               count(*)
  from public.signups where payment_status='paid' and dintero_transaction_id is null
union all
select 'refunded_without_meta',          count(*)
  from public.signups
  where payment_status='refunded' and (refunded_at is null or refund_amount is null)
union all
select 'owed_refund_unpaid',             count(*)
  from public.signups where refund_amount > 0 and refunded_at is null
union all
select 'paid_no_confirmation_1h',        count(*)
  from public.signups
  where status='confirmed' and payment_status='paid' and confirmation_sent_at is null
    and created_at < now() - interval '1 hour'
union all
select 'webhook_events_24h',             count(*)
  from public.processed_webhook_events where processed_at > now() - interval '24 hours'
order by check;
```

## 2. Stale pending payment_attempts

A `pending` attempt older than ~1h usually means a checkout was abandoned (benign) or
a finalize/webhook didn't land (needs attention). `sweep-pending-payments` (every
2 min) and `purge-stale-payment-attempts` (daily) normally clear these.

```sql
select id, status, dintero_transaction_id, dintero_session_id,
       participant_email, course_id, seller_id, created_at, updated_at
from public.payment_attempts
where status = 'pending' and created_at < now() - interval '1 hour'
order by created_at;
```
- Has a `dintero_transaction_id` → look it up at Dintero; if CAPTURED/AUTHORIZED,
  re-drive via `finalize-dintero-transaction` (see runbook §1).
- No transaction id and old → abandoned checkout; the daily purge removes it.

## 3. Webhook activity / failures

`processed_webhook_events` records only **successful** processing (PK
`event_id = '<txn>:<status>'`). **Signature/HMAC rejections are not stored** — they
live in the `dintero-webhook` function logs (Supabase → Edge Functions → Logs;
look for `dintero-webhook: signature rejected`).

```sql
-- recent successful webhook processing
select event_id, event_type, result, processed_at
from public.processed_webhook_events
order by processed_at desc
limit 50;
```
- During live payments, a long gap with no new rows can indicate a delivery problem
  (Dintero callback or gateway). Cross-check against the function logs and the
  `sweep-pending-payments` net, which backstops missed webhooks.
- A near-zero count is normal in pre-launch / sandbox with no real payments.

## 4. Cron health (last run + status per job)

`pg_cron` records every run in `cron.job_run_details`. All jobs should show
`succeeded` with a recent `last_run`.

```sql
select j.jobname, j.schedule,
       d.status, d.start_time as last_run,
       left(coalesce(d.return_message,''), 60) as msg
from cron.job j
left join lateral (
  select status, start_time, return_message
  from cron.job_run_details r
  where r.jobid = j.jobid
  order by r.start_time desc
  limit 1
) d on true
order by j.jobname;
```
Recent failures across all jobs:
```sql
select j.jobname, r.status, r.start_time, left(r.return_message, 120) as msg
from cron.job_run_details r
join cron.job j on j.jobid = r.jobid
where r.status <> 'succeeded' and r.start_time > now() - interval '48 hours'
order by r.start_time desc;
```
Expected jobs (7): `sweep-pending-payments` (*/2m), `send-pending-confirmations`
(*/5m), `sync-dintero-seller-statuses` (*/5m), `reconcile-course-lifecycle` (hourly),
`cleanup-webhook-events-daily`, `purge-stale-payment-attempts`,
`cleanup-rate-limit-buckets-daily`. A job missing from the list, `INACTIVE`, or with a
stale `last_run` (older than ~2× its interval) needs attention.

## 5. Signup paid/refunded state inconsistencies

```sql
-- paid but no Dintero transaction id
select id, course_id, seller_id, participant_email, amount_paid, created_at
from public.signups
where payment_status = 'paid' and dintero_transaction_id is null;
```
> **Expected false positive:** manually/cash-added signups a studio marks paid have
> no `dintero_transaction_id`. Confirm it's a manual entry (no `payment_attempts`
> row for it) before treating it as a defect. There is currently 1 such row.

```sql
-- refunded but missing refund metadata
select id, course_id, participant_email, refund_amount, refunded_at, dintero_transaction_id
from public.signups
where payment_status = 'refunded' and (refunded_at is null or refund_amount is null);

-- a refund is owed (amount set) but not marked paid out
select id, course_id, participant_email, refund_amount, refunded_at
from public.signups
where refund_amount > 0 and refunded_at is null;

-- cancelled but still marked paid (should usually be refunded or explained)
select id, course_id, participant_email, status, payment_status, amount_paid
from public.signups
where status in ('cancelled','course_cancelled') and payment_status = 'paid';
```
For any inconsistency, verify against Dintero and resolve via the cancel/refund
functions — see `support-admin-runbook.md` §2–§3. Don't hand-edit money state in SQL.

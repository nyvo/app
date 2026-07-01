# Support & admin recovery runbook (Stripe)

How to diagnose and recover payment / account issues in production. There is no
admin UI — recovery is via the **edge functions** (preferred) or **direct
service-role SQL** in the Supabase SQL editor (last resort). This replaces the old
Dintero runbook; the app is on **Stripe Connect**.

> ### Golden rules — read before touching anything
> 1. **Stripe is the source of truth for money.** Never mark a signup `paid` or
>    `refunded` in SQL without confirming the matching state at Stripe first.
> 2. **Use the edge functions, not raw SQL, for money state.** They update Stripe
>    **and** the DB atomically + idempotently and write the `payment_audit_log`.
>    Raw `UPDATE`/`DELETE` bypasses all of it and can desync money or oversell.
> 3. **Diagnose before you mutate.** Pull the row by id, read its current
>    `status` / `payment_status`, and check the live Stripe PaymentIntent.
> 4. **Direct SQL writes are a last resort.** If you must, do it in a transaction
>    and re-`select` before `commit`.

## Identifiers you'll use

`signups.id`, `signups.stripe_payment_intent_id`, `payment_attempts.id`,
`payment_attempts.stripe_payment_intent_id` (Stripe PI id, `pi_…`).

## How the money flow works (context)

- **`create-stripe-connect-session`** opens the checkout and creates a
  `payment_attempts` row (`pending`), returning a Stripe PaymentIntent to the buyer.
- **`stripe-connect-webhook`** is the money **authority**: on
  `payment_intent.amount_capturable_updated` it capacity-checks + captures and
  mints the `signup`; on `charge.refunded` it reconciles a refund. It verifies the
  Stripe signature and checks the authorized amount against
  `payment_attempts.total_price_nok` before capturing.
- **`sweep-pending-payments`** (cron, every 2 min) is the **backstop** for attempts
  left `pending`/`authorized` when the webhook was down or killed mid-flight.

### Status vocabulary
- `payment_attempts.status`: `pending` → `authorized` → `captured`; or `failed` /
  `voided` / `refunded`.
- `signups.payment_status`: `pending`, `paid`, `refunded`, `failed`, `external`
  (`external` = manual/off-platform payment, no Stripe).
- Stripe PI status: `requires_capture` (authorized, **not yet charged**),
  `succeeded` (captured/charged), `canceled`, `processing`.

## §1 — Buyer paid but has no signup

1. **Find the attempt / signup by the PaymentIntent id:**
   ```sql
   select id, status, stripe_payment_intent_id, participant_email, course_id, seller_id, created_at
   from public.payment_attempts
   where id = '<attempt_id>' or stripe_payment_intent_id = '<pi_id>';

   select id, status, payment_status, stripe_payment_intent_id, amount_paid, created_at
   from public.signups
   where stripe_payment_intent_id = '<pi_id>';
   ```
2. **Check the live PaymentIntent at Stripe** (Stripe dashboard → Payments → the
   `pi_…`). Note its status:
   - `succeeded` (captured) but **no signup** → the webhook missed the mint. The
     sweep recovers this automatically within ~2 min; if it hasn't, re-invoke it
     (§ below) and check the `stripe-connect-webhook` logs.
   - `requires_capture` (authorized, not charged) + no signup → the sweep will
     capacity-check then capture (creating the signup) or void the authorization.
   - `canceled` → the buyer never completed; no charge occurred. No signup is correct.
3. **Re-invoke the sweep** (idempotent) if you need to force a pass instead of
   waiting — it's the same call the cron makes:
   ```sql
   select net.http_post(
     url := 'https://nollnnkksgicsvuthnjq.supabase.co/functions/v1/sweep-pending-payments',
     headers := jsonb_build_object('Content-Type','application/json',
       'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')),
     body := '{}'::jsonb, timeout_milliseconds := 45000);
   ```
   (`cron_secret` is the shared cron auth secret — not Dintero-specific despite the old name.)

Never `insert` a signup by hand to "fix" this — capacity + capture must go through
the RPC/webhook path.

## §2 — Refund looks wrong / inconsistent

1. Pull the signup: `payment_status`, `refund_amount`, `refunded_at`,
   `stripe_payment_intent_id`.
2. **What does Stripe show?** Look up the PI / its charge; a real refund shows a
   refund on the charge.
3. **Reconcile:**
   - DB `refunded` **and** Stripe refunded → consistent, done.
   - DB `refunded` but Stripe shows a full charge (no refund) → **money was not
     returned.** Issue it through the proper path (§3) — don't leave it.
   - Stripe refunded but DB still `paid` → run `teacher-cancel-signup` with
     `refund: true`; it detects the already-refunded PI and **reconciles without
     issuing a second refund**.

## §3 — Issue a refund / cancel

Use the edge functions — they refund against live Stripe status and update the DB
atomically + idempotently. Authority: studio `owner` (verified org membership).

- **One signup:** `POST /functions/v1/teacher-cancel-signup`
  `{ "signup_id": "<id>", "refund": true, "reason": "<optional>" }`
- **Whole course:** `POST /functions/v1/cancel-course` — bulk refunds, **idempotent
  and re-runnable**; per-signup routing is driven by the live Stripe PI status
  (correctly cancels an uncaptured authorization instead of "refunding" it). Safe to
  re-run if it failed mid-batch.

**Never** issue a refund from the Stripe dashboard alone — the DB won't reconcile,
and the buyer's signup will stay `paid`.

## §4 — Offline / manual payment (cash, Vipps direct, bank transfer)

There is no off-platform payment path anymore: every paid booking goes through
Stripe, on every tier (the `mark-payment-resolved` function is deleted). A
teacher who took payment outside the platform adds the participant themselves
(add-participant flow records `payment_status='paid'`). Don't set
`payment_status='paid'` by hand on student-created rows.

## §5 — Account recovery & GDPR

- **Read a user's account:** `is_platform_admin` can read all `profiles`. Find a
  user by email in `auth.users` / `public.profiles`.
- **GDPR data export** (right of access / portability): in the SQL editor
  (service_role),
  ```sql
  select public.export_user_data('<auth-user-id>');
  ```
  Returns the subject's data as machine-readable JSON (account, profile, their own
  bookings, seller memberships + business identity). Send that to the requester.
- **Account deletion** is self-service but gated behind a 409 until the full flow
  ships — see `account-deletion-design.md`. Don't hand-delete `auth.users`; the
  `profiles` guard will abort it anyway.

## §6 — Health check

Run the same query the daily alert uses to spot money-state anomalies:
```sql
select public.ops_health_check();
```
All zeros = healthy. Non-zero (`paid_without_payment_intent`,
`stuck_payment_attempts`, `refunded_missing_metadata`) → investigate via §1–§2.

## Never do this in SQL

- Issue/cancel refunds (use §3 — Stripe + DB must move together).
- Mark a signup `paid`/`refunded` by hand (bypasses Stripe reconciliation **and**
  the audit log).
- Delete sellers, courses, or signups (CASCADEs destroy financial + audit records).
- Grant studio roles or `is_platform_admin` outside the defined RPCs.

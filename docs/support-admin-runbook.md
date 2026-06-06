# Support / admin recovery runbook

Operational procedures for the founder/operator. There is **no admin UI** — recovery
is done through the existing edge functions (preferred) or, for diagnosis, direct
read-only SQL via the Supabase SQL editor (service-role).

> **Golden rules**
> 1. **Prefer the edge function / RPC over raw SQL for any write.** They encode the
>    safe ordering and invariants (capacity locks, refund-before-DB, idempotency).
>    Raw `UPDATE`/`DELETE` bypasses all of it and can desync money or oversell.
> 2. **Dintero is the source of truth for money.** Never mark a signup `refunded`
>    or `paid` in SQL without confirming the matching state at Dintero first.
> 3. **Diagnose before you mutate.** Pull the row by id, read its current
>    `status` / `payment_status`, and check the live Dintero transaction.
> 4. **Direct SQL writes are a last resort.** If you must, do it in a transaction
>    (`BEGIN; … ;` inspect; `COMMIT`/`ROLLBACK`) and record what/why.

Identifiers you'll use: `signups.id`, `signups.dintero_transaction_id`,
`payment_attempts.id` (this is the Dintero `merchant_reference`).

---

## 1. Stuck payment / signup reconciliation

Symptom: buyer paid but isn't confirmed, or a `payment_attempts` row is stuck
`pending`.

1. **Find the attempt and any signup:**
   ```sql
   select id, status, dintero_transaction_id, dintero_session_id, created_at,
          participant_email, course_id, seller_id
   from public.payment_attempts
   where id = '<merchant_reference>' or dintero_transaction_id = '<txn_id>';

   select id, status, payment_status, dintero_transaction_id, amount_paid, created_at
   from public.signups
   where dintero_transaction_id = '<txn_id>';
   ```
2. **Check the live transaction at Dintero** (Dintero dashboard → transaction by id,
   or the `getTransaction` wrapper). Note its status (AUTHORIZED / CAPTURED /
   REFUNDED / FAILED / …).
3. **Let the system self-heal first.** `sweep-pending-payments` runs every 2 min and
   recovers orphaned authorized/captured payments. Wait a cycle before acting.
4. **Re-drive deterministically (preferred fix).** Re-invoke the idempotent
   finalizer instead of hand-editing rows — it re-checks capacity, captures if
   needed, creates the signup, and is safe to call repeatedly:
   ```
   POST /functions/v1/finalize-dintero-transaction
   { "transaction_id": "<txn_id>", "merchant_reference": "<payment_attempts.id>" }
   ```
   - CAPTURED at Dintero but no signup → it creates the signup.
   - AUTHORIZED → it capacity-checks then captures or voids.
5. **Only if the finalizer can't resolve it** (e.g. Dintero shows FAILED), mark the
   attempt accordingly via `mark-payment-resolved` (owner/admin), not raw SQL.

## 2. Manual refund verification

Never trust `signups.payment_status` alone — verify against Dintero.

1. **What does our DB think?**
   ```sql
   select id, payment_status, refund_amount, refunded_at, amount_paid, dintero_transaction_id
   from public.signups where id = '<signup_id>';
   ```
2. **What does Dintero show?** Look up the transaction; a real refund shows
   `REFUNDED` / `PARTIALLY_REFUNDED` with a refund event.
3. **Reconcile the two:**
   - DB says `refunded` **and** Dintero shows refunded → consistent, done.
   - DB says `refunded` but Dintero shows CAPTURED (no refund) → **money was not
     returned.** Issue the refund through the proper path (§3) — do not leave it.
   - Dintero shows REFUNDED but DB still `paid` → run `teacher-cancel-signup` with
     `refund: true`; it detects the already-REFUNDED state and **reconciles without
     issuing a second refund**.
4. **Never** set `payment_status='refunded'` by hand without a corresponding Dintero
   refund — it desyncs the books.

## 3. Force-cancel a signup or a course

Use the edge functions — they handle the refund (against live Dintero status) and
the DB update atomically and idempotently. Authority: studio `owner`.

- **One signup** (optionally refund):
  ```
  POST /functions/v1/teacher-cancel-signup
  { "signup_id": "<id>", "refund": true, "reason": "<text>" }
  ```
  Idempotent: a retry after a failed DB write reconciles instead of double-refunding.
- **Whole course** (cancels course, refunds all confirmed signups, per-signup
  result, partial-failure resilient):
  ```
  POST /functions/v1/cancel-course
  { "course_id": "<id>", "reason": "<text>" }
  ```
- After either, re-check with the §2 verification query.

## 4. Resend confirmation / check email delivery

1. **Did we ever send it?**
   ```sql
   select id, participant_email, status, payment_status, confirmation_sent_at, created_at
   from public.signups where id = '<signup_id>';
   ```
2. **`confirmation_sent_at` is null on a confirmed+paid signup?** The
   `send-pending-confirmations` cron (every 5 min) retries automatically — wait a
   cycle. To force it, invoke the function (cron-secret or service-role header).
3. **Delivery check:** confirm in the Resend dashboard (search the recipient /
   message id). Sends come from `Openspot <noreply@mail.openspot.no>`. If Resend
   shows delivered but the user didn't get it, it's their inbox/spam — check SPF/
   DKIM/DMARC alignment.
4. **Never** flip `confirmation_sent_at` by hand to suppress a resend unless you've
   confirmed the email actually went out — it's the retry gate.

## 5. Account deletion / GDPR export request

- **Deletion (self-service exists):** the user deletes from settings →
  `delete-account`. It is self-only, blocker-gated, and anonymizes atomically.
- **Why a deletion is blocked (409):** check the blockers for that user:
  ```sql
  select public._account_deletion_blockers('<user_id>');
  ```
  Resolve the listed active courses / unsettled payments first (finish or cancel),
  then the user can delete. Do **not** hand-delete the `auth.users` row to force it —
  the BEFORE DELETE guard exists for retention compliance; let it run.
- **GDPR data export (manual):** there is no export endpoint. Gather the user's data
  read-only and send it:
  ```sql
  select * from public.profiles where id = '<user_id>';
  select id, course_id, seller_id, status, payment_status, amount_paid, created_at,
         participant_name, participant_email
  from public.signups where buyer_id = '<user_id>';
  ```
  Send only to the verified account email. Don't include other people's PII.

## 6. When to use service-role / direct SQL — and what to double-check first

- **Read-only diagnosis:** fine anytime via the SQL editor.
- **Writes:** prefer the edge function that already encodes the invariant. Reach for
  raw SQL only when no function covers the case.
- **Before any manual write, confirm:**
  - the exact row by `id` (not by email/name — duplicates exist),
  - current `status` / `payment_status`,
  - the **live Dintero state** for anything money-related,
  - that no cron will also act on it in the next few minutes (avoid racing the sweep),
  - wrap in a transaction and re-`select` before `COMMIT`.
- **Never via SQL:** issue/cancel refunds (use Dintero + the cancel functions),
  grant studio roles to `admin` (blocked by CHECK; role is `owner`-only),
  re-grant anon write on `waitlist` (intentionally closed).

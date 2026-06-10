---
name: dintero-payments
description: Use when touching Dintero payment flows — checkout sessions, transactions, webhooks, seller onboarding, refunds, captures, settlements, or payouts. Triggers on files in supabase/functions/{create-dintero-session,dintero-webhook,finalize-dintero-transaction,create-dintero-seller,check-dintero-seller-status,get-dintero-settlements,sweep-pending-payments,sync-dintero-seller-statuses,process-refund,cancel-course}, supabase/functions/_shared/dintero.ts, src/lib/dintero.ts, src/services/dintero-seller.ts, src/services/checkout.ts, src/components/public/course-details/EmbeddedPayment.tsx, or tasks mentioning Dintero, payment_attempts, payout, seller approval, webhook signature, or KYC. Dintero replaced Stripe Connect in April 2026 — do not reach for Stripe patterns.
---

# Dintero Payments

## First rule: don't guess

Dintero's hosted docs are thin and some endpoints aren't documented publicly.
Before recommending or writing anything involving a Dintero API call:

1. **Grep the repo first.** The canonical wrapper is [supabase/functions/_shared/dintero.ts](../../../supabase/functions/_shared/dintero.ts) — every request shape, field name, and endpoint path we use lives there.
2. **Consult Dintero docs** (see URLs below) for concepts the wrapper doesn't cover.
3. **If still unclear, ask the user** — don't invent field names or status values. Dintero's API differs from Stripe's in non-obvious ways (no native metadata round-trip, different auth model, split checkout vs api hosts).

## Canonical docs

- Checkout SDK (embed / redirect): https://docs.dintero.com/checkout-api/
- Sessions API (create session, transactions): https://docs.dintero.com/checkout-api/reference/sessions
- Hook subscriptions: https://docs.dintero.com/checkout-api/hooks
- Split payout / seller approvals: https://docs.dintero.com/split-payout/
- Signature verification (session callback): https://docs.dintero.com/checkout-api/signed-callbacks
- Signature mint endpoint: `POST https://checkout.dintero.com/v1/admin/signature` (returns `{ signature: { secret } }`)

## Authority files in this repo

| Concern | File |
|---------|------|
| Deno/edge-function API wrapper (auth, sessions, transactions, approvals, signature verify) | [supabase/functions/_shared/dintero.ts](../../../supabase/functions/_shared/dintero.ts) |
| Browser SDK wrapper (embed, redirect) | [src/lib/dintero.ts](../../../src/lib/dintero.ts) |
| Seller onboarding client service | [src/services/dintero-seller.ts](../../../src/services/dintero-seller.ts) |
| Checkout session creation | [supabase/functions/create-dintero-session/index.ts](../../../supabase/functions/create-dintero-session/index.ts) |
| Webhook (callback_url) handler | [supabase/functions/dintero-webhook/index.ts](../../../supabase/functions/dintero-webhook/index.ts) |
| Client-driven finalizer (embedded flow) | [supabase/functions/finalize-dintero-transaction/index.ts](../../../supabase/functions/finalize-dintero-transaction/index.ts) |
| Seller approval creation | [supabase/functions/create-dintero-seller/index.ts](../../../supabase/functions/create-dintero-seller/index.ts) |
| Seller status polling | [supabase/functions/check-dintero-seller-status/index.ts](../../../supabase/functions/check-dintero-seller-status/index.ts) |
| Settlements / balance | [supabase/functions/get-dintero-settlements/index.ts](../../../supabase/functions/get-dintero-settlements/index.ts) |
| Orphaned pending-payment recovery cron | [supabase/functions/sweep-pending-payments/index.ts](../../../supabase/functions/sweep-pending-payments/index.ts) |
| Seller status sync cron | [supabase/functions/sync-dintero-seller-statuses/index.ts](../../../supabase/functions/sync-dintero-seller-statuses/index.ts) |
| Migration (schema cutover from Stripe) | [supabase/migrations/20260422010000_replace_stripe_with_dintero.sql](../../../supabase/migrations/20260422010000_replace_stripe_with_dintero.sql) |

## Two API hosts, don't mix them up

- `https://checkout.dintero.com` — sessions, transactions, **signature minting**
- `https://api.dintero.com` — auth tokens, accounts, seller/payout-destination approvals

The wrapper takes `baseUrl` explicitly. If you add a new endpoint, pick the right host — getting this wrong returns 404 with no useful hint.

## Environment variables

Required (all edge functions that call Dintero):

- `DINTERO_ACCOUNT_ID` — `T`-prefix = sandbox, `P`-prefix = production (see `isSandbox()`)
- `DINTERO_CLIENT_ID`
- `DINTERO_CLIENT_SECRET`
- `DINTERO_WEBHOOK_SECRET` — HMAC-SHA256 secret for **session callback_url** signature (distinct from hook-subscription secret)
- `DINTERO_PROFILE_ID` — checkout profile, defaults to `default`

## Domain invariants — violate these and things break silently

### Merchant reference is our metadata substitute
Dintero sessions have **no native metadata field that round-trips** on webhooks. We put a `payment_attempts.id` (UUID) into `order.merchant_reference` and look the context up from the `payment_attempts` table. Never try to stash context in a field Dintero doesn't guarantee to echo back — use `merchant_reference`.

### Seller approval state machine
`DinteroCaseStatus` values from `/v1/accounts/{aid}/management/settings/approvals/payout-destinations`:

| Status | Meaning |
|--------|---------|
| `PENDING` | Approval created, waiting for Dintero |
| `WAITING_FOR_DECLARATION` | Teacher needs to fill the declaration form |
| `WAITING_FOR_SIGNATURE` | Declaration done, waiting for e-signature on contract |
| `ACTIVE` | Fully onboarded — can receive payouts |
| `DECLINED` | Rejected |
| `TERMINATED` | Offboarded |

`dintero_onboarding_complete` flips `true` only on `ACTIVE`. The contract URL comes from `links[rel=contract_url]`.

The `organizations.dintero_onboarding_status` CHECK constraint includes `PENDING / WAITING_FOR_SIGNATURE / ACTIVE / DECLINED / TERMINATED`. `WAITING_FOR_DECLARATION` was added as a separate migration — verify the constraint in a fresh DB before adding new states.

### Transaction state machine (what the webhook handles)
`DinteroTransaction.status` values:

- `INITIATED` — session created, no payment yet
- `AUTHORIZED` — card authorized, **not captured**. Must capture or void.
- `CAPTURED` — funds moved. Signup should be `confirmed`, `payment_status=paid`.
- `PARTIALLY_CAPTURED` — treat as captured for our flow
- `REFUNDED` — full refund. Cancel signup, mark `payment_status=refunded`.
- `PARTIALLY_REFUNDED` — signup stays confirmed, `payment_status=refunded`
- `AUTHORIZATION_VOIDED` — no-op
- `FAILED` / `DECLINED` — mark `payment_status=failed` on the signup (payment-link flow only — embedded flow finalizes client-side)

### Two flows, two finalization paths
- **Embedded checkout** (iframe) → [finalize-dintero-transaction](../../../supabase/functions/finalize-dintero-transaction/index.ts) is the authority. Success page calls it synchronously after `onPaymentAuthorized`. The webhook becomes a backup, not the primary path. This function is **idempotent** and **no auth required** — `transaction_id + merchant_reference` is the credential, server verifies the transaction at Dintero and matches merchant_reference to our `payment_attempts` row.
- **Payment-link flow** (redirect) → the webhook is the primary path.

If you change one, think about whether the other needs matching changes.

### Webhook idempotency
`processed_webhook_events.event_id = ${transactionId}:${status}`. Dintero's session `callback_url` lacks a subscription-style event UUID, so we synthesize a deterministic key from the state we're about to write. `insert` with PK conflict (`23505`) = already processed. Don't change this key format without also thinking about replays.

### Signatures — two distinct mechanisms
- **Session callback_url** → `Dintero-Signature` header, HMAC-SHA256, signs canonical string `{timestamp}\n{account_id}\n{METHOD}\n{hostname}\n{pathname}\n{sorted_query}`. Rejects timestamps older than 5 min (replay guard). Query values with spaces encode as `+`, not `%20`. Use `verifyCallbackSignature()`.
- **Hook subscriptions** → `event-signature` header, **HMAC-SHA1**, signs raw JSON body directly. Use `verifyHookSubscriptionSignature()`.
These are not interchangeable. Using SHA-256 on a hook-subscription body will always return `false`.

### Capture is not automatic
`configuration.auto_capture` on the session controls this. Confirm what our session creator sends — current behavior is manual capture (authorized → capacity check → capture or void). Flipping auto_capture on would break the capacity-check pattern.

### Splits
Every `order.items[]` that pays out to a teacher carries `splits: [{ payout_destination_id, amount }]`. The `payout_destination_id` is the teacher's `sellers.dintero_seller_id`. Course-price lines split 100% to the teacher; Openspot does not take a commission from the teacher's course price. The platform's own cut is the student service-fee line, split to the registered payout destination configured as `DINTERO_PLATFORM_PAYOUT_DESTINATION_ID`. Per Dintero's Terms for Sellers (Annex 1), the platform "needs to add themselves as a Seller" to receive splits. Do NOT assume an unsplit line/remainder stays with the platform account: that behavior is undocumented, and splits to unknown destination ids don't fail — the payout is silently **postponed** until a matching approved seller exists.

### Sandbox vs production
`isSandbox()` returns `true` for `T`-prefixed account IDs. Some endpoints behave differently (e.g. sandbox auto-approves sellers if `sandboxAutoApprove=true` is passed to seller creation). Don't hard-code sandbox behavior in production paths.

## Banned patterns (Stripe-era leftovers)

If you find yourself about to write or reference any of these, stop — they were removed in the April 2026 migration:

- `stripe_account_id`, `stripe_onboarding_complete`, `stripe_payment_intent_id`, `stripe_checkout_session_id`, `stripe_receipt_url` columns
- `@stripe/stripe-js`, `@stripe/react-stripe-js`, `stripe` npm packages
- `create-payment-intent`, `stripe-webhook`, `create-stripe-connect-link`, `create-stripe-login-link`, `check-stripe-status`, `get-stripe-balance` edge functions
- `src/services/stripe-connect.ts`, `src/lib/stripe.ts`, `supabase/functions/_shared/stripe.ts`
- Stripe's `metadata` field pattern for round-tripping context — Dintero has no equivalent, use `merchant_reference` + `payment_attempts` table
- Stripe's single-endpoint webhook model — Dintero has both a session `callback_url` and a separate hook-subscription system with different signature algorithms

## When suggesting changes

- **Schema changes** → write a new migration, don't edit existing ones. The Dintero schema lives in migrations dated `20260422010000` onwards.
- **New edge functions** → add to [supabase/config.toml](../../../supabase/config.toml) and mirror the auth/CORS pattern of the existing Dintero functions.
- **New fields on `payment_attempts`** → think about whether the finalizer and the webhook both need to read them. The two paths must stay in sync.
- **Touching idempotency keys or signature verification** → flag it loudly in the diff. These are the "silent failure" surfaces.

## Status — business context

Dintero approval was pending as of 2026-04-20. Don't assume live payments work end-to-end until the user confirms approval landed. Test flows should run in sandbox (`T`-prefix account) first.

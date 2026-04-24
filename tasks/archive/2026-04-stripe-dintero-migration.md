# Stripe → Dintero migration

**Goal:** Replace 100% of Stripe logic (customer payments, teacher onboarding, payouts, refunds, webhooks) with Dintero. Hard cutover, no dual-run.

**Decisions locked in (from planning conversation):**
1. **Marketplace model:** Dintero **Split Payout** (direct equivalent of Stripe Connect Express). Platform fee + teacher share split per order item.
2. **Customer UI:** iframe embed via `@dintero/checkout-web-sdk`. No full-page redirects in the main booking flow (payment-link email is the one exception — it uses the SDK's `redirect({ sid })` named export, or the hosted `session.url`).
3. **Cutover:** hard cutover. Assumes pre-launch / no real Stripe-paid signups to refund. If that assumption is wrong, stop and add a "historical Stripe refund" track.
4. **Capture model:** keep authorize-then-capture. Webhook runs the atomic capacity check *before* calling `POST /v1/transactions/{id}/capture`. Two students racing for the last seat → only one is charged.

**Doc-verified facts (cross-reference while implementing):**
- Session create: `POST https://checkout.dintero.com/v1/sessions-profile`. `profile_id` is a **body field**, not a path segment. Body shape: `{ url: { return_url, callback_url }, order: { amount, currency, merchant_reference, items[] }, profile_id }`. Amounts in minor units (NOK øre).
- Transaction mgmt endpoints (all POST, under `https://checkout.dintero.com`):
  - `/v1/transactions/{id}/capture` — body `{ amount, capture_reference?, items? }`
  - `/v1/transactions/{id}/refund`  — body `{ amount, reason?, items? }`
  - `/v1/transactions/{id}/void`    — body `{}` (only valid if not yet captured)
  - `/v1/transactions/{id}/authorization` — update amount
- Transaction statuses (confirmed): `AUTHORIZED`, `CAPTURED`, `AUTHORIZATION_VOIDED` (NOT `VOIDED`), plus refund states. Transition graph: `AUTHORIZED → CAPTURED | AUTHORIZATION_VOIDED`; `CAPTURED → REFUNDED (full/partial)`.
- Session callback signature: header **`Dintero-Signature`**, format `t={timestamp},v0-hmac-sha256={sig}`. Signed string is newline-separated (`\n`): `{timestamp}\n{account_id}\n{METHOD}\n{hostname}\n{pathname}\n{query}`. Query params sorted; spaces encoded as `+`. HMAC-SHA256. Secret via `POST /v1/admin/signature`. Replay window: 5 minutes.
- Hook-subscription signature (distinct mechanism): header **`event-signature`**, **HMAC-SHA1** over `JSON.stringify(body)` directly (no canonical string). Used for account-level events like `settlement_add`.
- Splits: `order.items[].splits = [{ payout_destination_id, amount }]`, amounts in minor units. Platform's share uses literal string `"platform"`. Seller IDs are **not** validated at session creation — bad IDs fail only at settlement time.
- Web SDK (`@dintero/checkout-web-sdk`):
  - `embed({ container, sid, language?, popOut?, onSession, onPayment, onPaymentError, onSessionCancel, onSessionNotFound, onSessionLocked, onSessionLockFailed, onActivePaymentType, onAddressCallback, onValidateSession })` returns a `checkout` instance.
  - `checkout.destroy()` unmounts the iframe. Also: `setActivePaymentProductType`, `lockSession`, `refreshSession`.
  - Named export `redirect({ sid })` redirects current window to the hosted checkout — useful for the payment-link email flow.
  - `onPayment` fires for `SessionPaymentAuthorized` and `SessionPaymentOnHold` — both branches need handling.

**All previously-unverified items are now confirmed (via real-world Dintero WooCommerce plugin source + SDK type exports):**
- **Authorize-only field:** `configuration.auto_capture: false` on the session body. Top-level `configuration` object. Confirmed in `Dintero.Checkout.WooCommerce.V2/classes/requests/post/class-dintero-checkout-sessions-pay.php:67`.
- **Metadata round-trip:** no native `metadata` field used in practice. Stash our own signup/session UUID in `order.merchant_reference` (standard field, round-trips on webhook), then look up full context from our own DB. This is the pattern the WooCommerce plugin uses — battle-tested.
- **Seller onboarding — programmatic after all:** `POST /v1/accounts/{aid}/management/settings/approvals/payout-destinations` (api.dintero.com). Returns `links[].rel=contract_url` — a hosted Dintero KYC URL we send to the teacher. `form_submitter: { email }` field triggers Dintero to email the merchant the contract link directly. Status polled via `GET` same path; final status is `case_status=ACTIVE`. This is the Stripe-Connect-Express-equivalent we need. The earlier "manual Backoffice only" finding was wrong — the Backoffice flow is the fallback for non-API users, not the only path.
- **Seller-status webhook:** not confirmed to exist. Polling is the safe path — cron-triggered edge function every 5 min checks pending sellers. Fine at scale.
- **Checkout-api paths confirmed via `@dintero/node-sdk` types export** (`CheckoutPaths`): `/sessions-profile`, `/sessions/{session_id}`, `/sessions/{session_id}/cancel`, `/transactions/{id}/capture`, `/transactions/{id}/authorization`, `/transactions/{id}/refund`, `/transactions/{id}/void`, `/transactions/{id}` (GET confirmed), `/transactions` (list).
- **Sandbox seller sandbox triggers:** put `AUTO_APPROVE`, `AUTO_DECLINE`, or `AUTO_WAITING_FOR_SIGNATURE` into the `payout_destination_description` field when creating a test seller. Confirmed in Dintero split-payments testing docs.

**Non-negotiables carried over:**
- Idempotent webhook via `processed_webhook_events` table (provider-agnostic, reuse as-is).
- `create_signup_if_available` RPC stays the atomic capacity gate; params change to reference Dintero IDs but the function's guarantees don't.
- Norwegian copy rules (see CLAUDE.md): no "Stripe" strings left in UI; swap for "Dintero" or generic terms ("betaling", "utbetaling") as appropriate.

---

## Phase 0 — Prerequisites (human/account side)

- [ ] Confirm **Split Payout** is activated on the Dintero account. Current status per user: "pending verification of payments." Planning can proceed in parallel; Phase 5/6 can't fully ship until approved.
- [ ] Obtain sandbox credentials from Dintero Backoffice: `account_id` (T-prefix), API client `client_id` + `client_secret`.
- [ ] Obtain production credentials (P-prefix `account_id`, separate client pair). Don't store these yet — only sandbox during dev.
- [ ] Create Dintero callback signature secret: `POST https://api.dintero.com/v1/accounts/{account_id}/admin/signature` → store as `DINTERO_WEBHOOK_SECRET`.
- [ ] Confirm `default` checkout profile exists in Backoffice (or note the profile ID to use).
- [ ] Sandbox test-card reference: Dintero's built-in test cards work inside the iframe in T-accounts; no separate test-card setup needed.

---

## Phase 1 — DB schema migration

Single migration, additive first then drops at the end of the phase. Run in one transaction.

- [ ] New migration `replace_stripe_with_dintero`:
  - [ ] `organizations`:
    - add `dintero_seller_id TEXT`
    - add `dintero_onboarding_status TEXT` (values: `pending`, `active`, `declined`, `waiting_for_signature`)
    - add `dintero_onboarding_complete BOOLEAN DEFAULT FALSE` (derived: `status='active'`)
    - drop `stripe_account_id`, `stripe_onboarding_complete`
  - [ ] `signups`:
    - add `dintero_transaction_id TEXT` (primary reference — replaces both `stripe_payment_intent_id` and `stripe_checkout_session_id`)
    - add `dintero_session_id TEXT` (session the transaction was created under — useful for reconciliation)
    - drop `stripe_payment_intent_id`, `stripe_checkout_session_id`, `stripe_receipt_url`
    - keep `amount_paid`
    - drop index `idx_signups_stripe_checkout_session_id`, add `idx_signups_dintero_transaction_id`
  - [ ] `processed_webhook_events`: **no change**, provider-agnostic.
  - [ ] RPC `create_signup_if_available`: rename Stripe params to Dintero params. Signature becomes:
        `(p_course_id, p_organization_id, p_participant_name, p_participant_email, p_participant_phone, p_dintero_transaction_id, p_dintero_session_id, p_amount_paid, p_is_drop_in, p_class_date, p_class_time, p_signup_package_id, p_package_weeks)`.
        Logic unchanged.
  - [ ] RPC `get_signup_by_stripe_id` → `get_signup_by_dintero_id(p_transaction_id TEXT)`. SECURITY DEFINER preserved.
- [ ] Regenerate `src/integrations/supabase/types.ts` via `supabase gen types typescript`.

---

## Phase 2 — Shared Dintero client (Deno)

- [ ] Create `supabase/functions/_shared/dintero.ts`:
  - [ ] `getAccessToken()` — OAuth2 client credentials flow.
        POST `https://api.dintero.com/v1/accounts/{account_id}/auth/token` with body `{ grant_type, audience, client_id, client_secret }`. Cache token in module-level `let` keyed on expiry; re-fetch on miss. (Acceptable for edge functions given short cold-start lifetimes.)
  - [ ] `dinteroFetch(method, path, body?)` — thin wrapper that injects bearer token, content-type, and hits the right base URL (`https://checkout.dintero.com` for sessions/transactions, `https://api.dintero.com` for account/hooks). Returns parsed JSON or throws with response body.
  - [ ] `createSession(payload)` → `POST https://checkout.dintero.com/v1/sessions-profile`. `profile_id` is a body field.
  - [ ] `captureTransaction(id, amount, captureReference?)` → `POST /v1/transactions/{id}/capture`. Body `{ amount, capture_reference? }`.
  - [ ] `refundTransaction(id, amount, reason?)` → `POST /v1/transactions/{id}/refund`. Body `{ amount, reason? }`.
  - [ ] `voidTransaction(id)` → `POST /v1/transactions/{id}/void`. Empty body. Only valid if status is `AUTHORIZED`.
  - [ ] `getTransaction(id)` → `GET /v1/transactions/{id}` (confirm path during implementation — not explicitly in the transaction-management doc page, likely correct).
  - [ ] `verifyCallbackSignature(method, host, path, query, rawBody, headerValue, secret)` — HMAC-SHA256 over newline-joined canonical string: `{t}\n{account_id}\n{METHOD}\n{hostname}\n{pathname}\n{sorted_query}`. Query-param spaces → `+`. Header is `Dintero-Signature: t={t},v0-hmac-sha256={sig}`. Enforce 5-minute replay window. Returns boolean. **Never `throw` on invalid — the webhook handler must return 401.**
  - [ ] `verifyHookSubscriptionSignature(rawBody, headerValue, secret)` — HMAC-**SHA1** over `rawBody` directly (whole JSON body, no canonical string). Header is `event-signature`. Used only if we subscribe to `settlement_add` or account-level events.
  - [ ] Typed response interfaces for `Session`, `Transaction`, `Settlement`.
- [ ] Delete `supabase/functions/_shared/stripe.ts`.
- [ ] Env vars (set via `supabase secrets set`):
  - [ ] `DINTERO_ACCOUNT_ID`
  - [ ] `DINTERO_CLIENT_ID`
  - [ ] `DINTERO_CLIENT_SECRET`
  - [ ] `DINTERO_WEBHOOK_SECRET`
  - [ ] `DINTERO_PROFILE_ID` (default `default` — configurable for future multi-profile)
  - [ ] Remove `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.

---

## Phase 3 — Customer payment flow (public booking)

- [ ] `pnpm add @dintero/checkout-web-sdk` / `pnpm remove @stripe/stripe-js @stripe/react-stripe-js`.
- [ ] New edge function `supabase/functions/create-dintero-session/index.ts` (replaces `create-payment-intent`):
  - [ ] Validate course + capacity preview (soft check — hard check is in webhook).
  - [ ] Look up organization's `dintero_seller_id`. 400 if missing / onboarding incomplete.
  - [ ] Build session body:
    - `order.amount` (total, minor units NOK øre), `order.currency='NOK'`, `order.merchant_reference` (our signup/session UUID), `order.items[]` with course line.
    - Per item: `splits = [{ payout_destination_id: teacher_seller_id, amount: teacher_share }, { payout_destination_id: 'platform', amount: platform_fee }]`. Splits per item must sum to item `amount`.
    - `url.callback_url = https://<project>.supabase.co/functions/v1/dintero-webhook`.
    - `url.return_url = https://<app>/checkout/success?transaction_id={{transaction_id}}` (Dintero substitutes `{{transaction_id}}`).
    - `profile_id = 'default'` (or `Deno.env.get('DINTERO_PROFILE_ID')`).
    - `order.merchant_reference = <our signup attempt UUID>` — used as the primary lookup key on webhook; we stash course_id + participant info in our own `payment_attempts` table (new, minimal) keyed on this UUID. This is the pattern used by Dintero's own WooCommerce plugin.
    - `configuration = { auto_capture: false }` — authorize only; explicit capture call fires in webhook after capacity check passes.
  - [ ] Return `{ sid: session.id, url: session.url }` (url only used by the payment-link flow; booking flow uses `sid` to embed).
- [ ] New `src/lib/dintero.ts`:
  - [ ] `embedDintero({ container, sid, onPayment, onSessionCancel, onPaymentError })` — wraps `dintero.embed(...)` from `@dintero/checkout-web-sdk`. Returns the instance (with `.destroy()` for cleanup).
- [ ] Rewrite `src/components/public/course-details/EmbeddedPayment.tsx`:
  - [ ] Remove all `@stripe/react-stripe-js` and `Elements` usage.
  - [ ] On mount: call `create-dintero-session` → receive `sid` → mount SDK into a `<div ref>`.
  - [ ] `onPayment` callback: redirect to `/checkout/success?transaction_id=...` (or call the polling lookup directly — match existing UX).
  - [ ] `onSessionCancel`: surface a "Betaling avbrutt" state, allow retry (new session, new sid).
  - [ ] Cleanup on unmount: call `.destroy()`.
  - [ ] Remove the "Sikker betaling via Stripe" footer.
- [ ] `src/pages/public/CheckoutSuccessPage.tsx`:
  - [ ] Read `transaction_id` (not `session_id` / `payment_intent_id`).
  - [ ] Poll the renamed RPC `get_signup_by_dintero_id`.
  - [ ] Keep the 12× exponential backoff — Dintero webhook delivery latency is similar to Stripe's.
- [ ] Delete `src/lib/stripe.ts`.

---

## Phase 4 — Webhook handler

- [ ] New edge function `supabase/functions/dintero-webhook/index.ts` (replaces `stripe-webhook`):
  - [ ] Read raw body (required for HMAC verify).
  - [ ] Verify `Dintero-Signature` via `verifyCallbackSignature`. 401 on failure.
  - [ ] Parse event. Extract `transaction.id`, `transaction.status`, `transaction.metadata`, `event.id` (use Dintero's event-delivery ID for idempotency).
  - [ ] Idempotency: `INSERT INTO processed_webhook_events(event_id, event_type, result)` — on unique-violation, return 200 (already processed).
  - [ ] Status handling:
    - `AUTHORIZED` + embedded-flow marker (from `order.merchant_reference` or metadata):
      - Call `create_signup_if_available` (new params: transaction_id, session_id, amount).
      - If success → `captureTransaction(id, amount)` → mark signup `payment_status='paid'` → enqueue confirmation email (existing `send-email` function, payload already course-agnostic).
      - If capacity exceeded → `voidTransaction(id)` → log; no signup created, no charge to student.
    - `AUTHORIZED` + payment-link-flow marker (existing pending signup):
      - Skip capacity check, skip signup creation.
      - Capture → update existing signup's `payment_status='paid'`, `dintero_transaction_id`, `amount_paid`.
      - Send confirmation email.
    - `CAPTURED`: idempotent update — no-op if signup already `paid`. (Dintero may send separate AUTHORIZED and CAPTURED events; both route through the same idempotency table.)
    - `REFUNDED` (full): find signup by `dintero_transaction_id`, set `payment_status='refunded'`, `status='cancelled'`.
    - `PARTIALLY_REFUNDED`: set `payment_status='refunded'` but keep `status='confirmed'` (matches current Stripe partial-refund behavior).
    - `FAILED` / `DECLINED`: find signup by `dintero_transaction_id` (payment-link flow only), set `payment_status='failed'`. No signup exists for embedded flow at this point, so no-op.
    - `AUTHORIZATION_VOIDED`: no-op (we void on capacity fail; nothing downstream).
  - [ ] Always return 200 after idempotency write, even on logical no-op.
- [ ] Delete `supabase/functions/stripe-webhook/index.ts`.
- [ ] Set webhook URL in Dintero: either per-session via `callback_url` (preferred, set by `create-dintero-session`) or global hook subscription in Backoffice.

---

## Phase 5 — Teacher onboarding (Dintero Sellers / Split Payout)

**Programmatic self-service, Stripe-Connect-Express style.** Dintero's `payout-destinations` approval endpoint returns a hosted KYC URL we send to the teacher — same UX as Stripe's `account_links`.

- [ ] New edge function `supabase/functions/create-dintero-seller/index.ts` (replaces `create-stripe-connect-link`):
  - [ ] Accept `{ organizationId }` from authed teacher.
  - [ ] If `organizations.dintero_seller_id` exists and `case_status='ACTIVE'` → return early `{ status: 'active' }`.
  - [ ] POST `https://api.dintero.com/v1/accounts/{DINTERO_ACCOUNT_ID}/management/settings/approvals/payout-destinations` with:
    - `country: 'NO'`
    - `currency: 'NOK'`
    - `organization_number: org.org_number`
    - `business_name: org.legal_name`
    - `payout_destination_name: org.display_name`
    - `payout_destination_description: '' or 'AUTO_APPROVE'` (sandbox only — wire behind `DINTERO_SANDBOX_AUTO_APPROVE` env flag so we don't accidentally auto-approve in prod)
    - `seller_id: org.id` (our internal UUID — lets us reconcile)
    - `form_submitter: { email: teacher.email }` (Dintero emails the teacher the contract URL automatically)
    - Bank account + contact nested objects per Dintero schema (exact shape to confirm on first API call; OpenAPI spec page is oversized but SDK types expose the path).
  - [ ] Extract `contract_url` from response `links[]` (where `rel='contract_url'`).
  - [ ] Store returned seller approval id as `organizations.dintero_seller_id`; `dintero_onboarding_status='PENDING'`.
  - [ ] Return `{ sellerId, contractUrl, status: 'PENDING' }` — client navigates the teacher to `contractUrl`.
- [ ] New edge function `supabase/functions/check-dintero-seller-status/index.ts` (replaces `check-stripe-status`):
  - [ ] GET `/v1/accounts/{aid}/management/settings/approvals/payout-destinations` filtered to our seller id (or GET single approval if that path exists — verify on first call).
  - [ ] Update `dintero_onboarding_status` to `case_status` value. Set `dintero_onboarding_complete = (case_status === 'ACTIVE')`.
  - [ ] Return status.
- [ ] New edge function `supabase/functions/sync-dintero-seller-statuses/index.ts` (cron-triggered, every 5 min):
  - [ ] For each org where `dintero_onboarding_status IN ('PENDING', 'WAITING_FOR_SIGNATURE')`: run the status check.
  - [ ] This is the substitute for the (not-confirmed-to-exist) seller-status webhook. Cheap at small scale.
- [ ] **Delete** `create-stripe-login-link` — no Dintero equivalent (no Express-like teacher dashboard). Replace its UI entry point with the settlements view (Phase 6).
- [ ] `src/pages/teacher/PaymentsPage.tsx`:
  - [ ] Replace `createStripeConnectLink` / `checkStripeStatus` with the two new Dintero calls.
  - [ ] On "Set up payments" click: call `create-dintero-seller` → open `contractUrl` in a new tab (or redirect).
  - [ ] Collect any extra fields needed for the Seller API that we don't already have on `organizations` (likely: org number, bank account number). Add a small form step before the API call if missing.
  - [ ] Status states to render:
    - `PENDING` — "Fullfør bekreftelsen hos Dintero. Vi har sendt deg en e-post."
    - `WAITING_FOR_SIGNATURE` — "Signer avtalen fra Dintero for å aktivere utbetalinger."
    - `ACTIVE` — payments section unlocked.
    - `DECLINED` / `TERMINATED` — contact-us state.
- [ ] Create a redirect-back route: after Dintero's hosted KYC completes, the teacher lands on `/teacher/payments?dintero_callback=1`. The page runs `check-dintero-seller-status` once on mount and refreshes UI. (Dintero may not guarantee a redirect back — if not, they return to our app manually; the polling cron catches it either way.)
- [ ] **Delete** `src/pages/teacher/StripeCallbackPage.tsx` — Stripe's callback flow replaced by the above.
- [ ] **Delete** `supabase/functions/create-stripe-connect-link/`, `check-stripe-status/`, `create-stripe-login-link/`.

---

## Phase 6 — Balance & payouts display

- [ ] New edge function `supabase/functions/get-dintero-settlements/index.ts` (replaces `get-stripe-balance`):
  - [ ] Fetch seller's settlement reports via Dintero Reports API (verify path).
  - [ ] Return: current pending (authorized but not yet settled), recent settlements (paid out to bank), upcoming next settlement date if exposed.
- [ ] Rebuild `PaymentsPage.tsx` display section:
  - [ ] Stripe had: available balance, pending balance, recent payouts with arrival date.
  - [ ] Dintero equivalent: pending amount (authorized, not yet in settlement), recent settlements (closest to "payouts"), historical transactions list.
  - [ ] If Split Payout settlement data isn't exposed in sandbox, gate this behind `dintero_onboarding_complete && settlements_available` with a clear "Klar når Dintero har verifisert kontoen din" empty state.
- [ ] Delete `supabase/functions/get-stripe-balance/`.

---

## Phase 7 — Refunds

- [ ] Rewrite `supabase/functions/process-refund/index.ts`:
  - [ ] Keep 24-hour cancellation policy (unchanged business logic, Europe/Oslo tz).
  - [ ] Find signup → get `dintero_transaction_id`.
  - [ ] Call `refundTransaction(transaction_id, amount_paid)`.
  - [ ] Update signup: `payment_status='refunded'`, `status='cancelled'`, `refund_amount`, `refunded_at`.
  - [ ] Webhook will also receive `REFUNDED` and idempotently confirm — no conflict.
  - [ ] Send cancellation email (existing `send-email`).
- [ ] Update `supabase/functions/cancel-course/index.ts` and `teacher-cancel-signup/index.ts` — same substitution pattern (find by dintero_transaction_id, refund via Dintero).

---

## Phase 8 — Payment-link flow (invoice-by-email)

- [ ] Rewrite `supabase/functions/send-payment-link/index.ts`:
  - [ ] Instead of Stripe Checkout Session, create a Dintero session with identical split + metadata config.
  - [ ] Include `metadata.payment_link_signup_id` so the webhook routes to the existing-signup branch.
  - [ ] Send the session's `url` (hosted Dintero checkout page) in the email — this is the legitimate redirect case.

---

## Phase 9 — UI copy sweep

- [ ] Grep `src/**` for "Stripe" / "stripe":
  - [ ] `EmbeddedPayment.tsx` footer — remove or replace with "Sikker betaling via Dintero".
  - [ ] `PaymentsPage.tsx` onboarding CTAs, helper text, error states.
  - [ ] `StripeCallbackPage` (delete, see Phase 5).
  - [ ] Any other scraps flagged in the initial audit.
- [ ] Follow `COPY_STYLE_GUIDE.md` — no exclamation marks, no "Vennligst", `du/deg`, professional/warm.
- [ ] Domain vocabulary: "betaling" (payment), "utbetaling" (payout), "refusjon" (refund), "deltaker" (participant). Keep existing terms.

---

## Phase 10 — Dependency + code cleanup

- [ ] `pnpm remove @stripe/stripe-js @stripe/react-stripe-js stripe`.
- [ ] `pnpm add @dintero/checkout-web-sdk`.
- [ ] Remove `VITE_STRIPE_PUBLISHABLE_KEY` from `.env.example` and any `.env.local`.
- [ ] `supabase secrets unset STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET`.
- [ ] Grep repo for `stripe` one last time — every hit should be either in git history, migration file comments (allowed), or this plan. No runtime references.

---

## Phase 11 — Sandbox verification

Run each flow end-to-end against Dintero's T-account before considering the migration done. Each row needs a real observed pass, not a theoretical one.

- [ ] **Happy path:** public user books course → iframe loads → test card accepted → webhook authorizes → capacity check passes → capture fires → signup appears → confirmation email arrives → success page renders.
- [ ] **Capacity race:** two signups for the last seat, within the same second. Only one captures. The other receives `VOIDED` (no charge to student, no signup).
- [ ] **User cancels mid-embed:** click close in the iframe → `onSessionCancel` fires → UI offers retry → new session created.
- [ ] **Refund within window:** student cancels >24h before class → refund succeeds → webhook marks refunded → email sent.
- [ ] **Refund outside window:** student cancels <24h before → API returns 400 "outside cancellation window" → no Dintero call made.
- [ ] **Course cancelled by teacher:** mass refund via `cancel-course` → every paid signup refunded → emails sent.
- [ ] **Payment-link flow:** teacher sends manual payment link → participant receives email → clicks link → redirects to hosted Dintero checkout → pays → webhook updates the existing pending signup → email confirmation sent.
- [ ] **Webhook signature tamper:** send a webhook with a bad signature → handler returns 401, no DB writes.
- [ ] **Webhook replay:** re-deliver the same event → idempotency table blocks double-processing, returns 200.
- [ ] **Teacher onboarding:** create seller via sandbox `AUTO_APPROVE` trigger (put `AUTO_APPROVE` in `payout_destination_description` per Dintero sandbox docs) → status flips to `active`.
- [ ] **Split configuration validated:** check the settlement report (if exposed in sandbox) to confirm splits match teacher-share / platform-fee amounts. If sandbox doesn't expose settlement data, mark this as "deferred to first production test" and surface in Phase 6's empty state.

---

## Risk register

- **Split Payout activation blocks Phase 5/6.** User's Dintero account is "pending verification." We can build and sandbox-test everything else; Phase 5/6 ship fully only after verification. Mitigation: gate the Payments page's settlement view behind `dintero_onboarding_complete`.
- **No Elements-style custom form.** Iframe is Dintero's chrome. Visual review needed at Phase 3 — confirm the iframe isn't jarring against the rest of the booking surface.
- **Seller API onboarding UX is unknown until we read those docs closely.** If Dintero's Seller API requires fields we can't collect in our UI (e.g. a manually-signed document via Backoffice), Phase 5 needs a "finish in Dintero" handoff step. Expect one iteration there.
- **Sandbox can't test real payouts.** Documented Dintero limitation. Phase 11 leaves a star next to "settlement confirmed" until first production payment.

---

## Review — 2026-04-23

### Status at a glance

| Phase | Status | Notes |
|---|---|---|
| 0 — Prereqs | ✅ | T11116559 sandbox, API client + webhook secret minted |
| 1 — DB migration | ✅ | Applied. Plus two follow-ups: `WAITING_FOR_DECLARATION` added to CHECK constraint; `payment_audit_log.via_stripe` renamed to `via_external` and trigger rewritten |
| 2 — Shared Dintero client | ✅ | `supabase/functions/_shared/dintero.ts` |
| 3 — Customer payment flow | ✅ | Embedded iframe works end-to-end, verified with a real Dintero test card |
| 4 — Webhook handler | ⚠️ | Built but not wired — see **Deviation: webhook → client-driven finalize** below |
| 5 — Teacher onboarding | ⚠️ | Sandbox AUTO_APPROVE path works, full production declaration flow parked. See **Deviation: onboarding parked** below |
| 6 — Settlements | ✅ | Edge function deployed; gated behind `dintero_onboarding_complete` |
| 7 — Refunds | ✅ | Wired through `refundTransaction`; not yet exercised against a real captured txn |
| 8 — Payment-link flow | ✅ | Uses same `createSession` + `finalize-dintero-transaction` as embedded flow |
| 9 — UI copy sweep | ✅ | No "Stripe" strings remain in the UI |
| 10 — Dependency cleanup | ✅ | Stripe packages removed, `@dintero/checkout-web-sdk` added; 6 old Stripe edge functions deleted from remote |
| 11 — Sandbox verification | 🟡 | Happy path (book → pay → signup → success page) verified. Capacity race, refunds, payment-link, etc. deferred |

### Key architectural deviation: webhook → client-driven finalize

Original plan had an async server-to-server webhook as the single source of truth for transaction state. Discovered during testing that Dintero's per-session `callback_url` doesn't fire without a separately-registered hook subscription (and that API path 403'd with our current client audience). Rather than debug the subscription API, we inverted the control flow:

- **`finalize-dintero-transaction` edge function** — client-driven, idempotent endpoint that pulls the transaction from Dintero, runs the capacity-check RPC, captures, creates the signup, and emails. Called from `CheckoutSuccessPage` on mount.
- **`sweep-pending-payments` edge function + cron (every 2 min)** — safety net for the edge case where the customer paid but never hit the success page (closed tab, dropped network). Lists Dintero transactions for any `payment_attempts` stuck in `pending` >2 min and finalizes them. Max customer-side gap = ~4 min.

The original `dintero-webhook` function is deployed but effectively inert for the embedded flow. It'll be repurposed when we later wire a real hook subscription for async events like teacher-initiated refunds from Backoffice.

### Deviation: onboarding parked

The `payout-destinations` approval endpoint required more fields than the plan anticipated (`country_code` not `country`, `payout_destination_id`, `payout_reference`, `bank_accounts` with currency + type). I wired these into the UI form (2 extra fields: Kontonummer + Banknavn) and got AUTO_APPROVE sandbox onboarding working end-to-end. But the Dintero hosted declaration form collects all the same info again anyway (UBO, PEP, signing, bank statement upload) — our UI collection is largely redundant. Decision: park the onboarding UX polish, revisit when preparing for real production launch. Sandbox test org (`Kristoffer Studio`) is ACTIVE so nothing else is blocked.

### Bug fixes along the way

- `payment_audit_log` trigger `log_payment_status_change` still referenced `NEW.stripe_payment_intent_id`; renamed column `via_stripe` → `via_external`, rewrote trigger to use `NEW.dintero_transaction_id IS NOT NULL`. (Migration `fix_payment_audit_log_remove_stripe_refs`.)
- `EmbeddedPayment.tsx` `onPaymentAuthorized` callback only forwards `transactionId`, so the redirect loses the `merchant_reference`. Not fixed because both `get_signup_by_dintero_id` and `finalize-dintero-transaction` accept either field; the success page works with just the transaction_id.
- `CheckoutSuccessPage` polling window tightened from `[1s, 2s, 2s, ...]` to `[500ms, 1s, 2s, ...]` — finalize call creates the signup synchronously, so the first poll should almost always succeed.

### Outstanding / known gaps

1. **Hook subscription for async events** — needed for: teacher-initiated refunds from Dintero Backoffice (bypasses our UI), settlement notifications, any transaction state change originated outside our app. Not blocking booking happy path.
2. **`verifyCallbackSignature` signature mismatch** — my local test-signed request got 401 from our own webhook. Worth an hour of debugging when we pick hook subscriptions back up. Candidate causes: URL hostname differs in Supabase's edge runtime, subtle URL-encoding mismatch in `sortQueryString`, or an accountId env var load timing issue.
3. **Full onboarding UX** — per the deviation above, parked.
4. **Phase 11 remaining scenarios** — capacity race, refund-in-window, refund-out-of-window, teacher cancel-course, payment-link, webhook tamper/replay. Deferred; happy path proven is the gate to start real sandbox QA.


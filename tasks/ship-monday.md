# Ship Monday — 2026-04-27

**Today:** 2026-04-24 (Fri). 3 days. Fri–Sat = remaining systems + sandbox tests. Sun = design/visual/responsiveness/skeletons.

Synthesized from three agent audits (supabase-security, a11y, copy-audit) + manual walkthrough of auth, RLS, messages, routing. Payment test scenarios carried over from `tasks/todo.md` Phase 11.

---

## Progress log — 2026-04-23 (Thu, evening session)

**All P0 + P1 dev work complete and shipped to sandbox Supabase:**

| Area | Status | Evidence |
|---|---|---|
| Migration | ✅ Applied to `nollnnkksgicsvuthnjq` | `public_signup_counts` RPC live; leaky `Anon can view signup counts` policy gone; `course_sessions` anon tightened to non-draft |
| All 15 edge functions | ✅ Redeployed | `npx supabase functions deploy` × 2 |
| Anon PII leak | ✅ Fixed + verified | Live query: anon user → 0 signup rows |
| Free signups (was 500-ing) | ✅ Fixed | `create-free-signup` now passes Dintero RPC params |
| Finalize bypass | ✅ Fixed | Requires `merchant_reference`, hard-fails on mismatch |
| Process-refund IDOR | ✅ Fixed | Email-match fallback removed |
| Send-email raw-HTML path | ✅ Removed | New `teacher-broadcast` template handles escaping server-side |
| UUID validation + ALLOWED_ORIGIN | ✅ Tightened on create-dintero-session + finalize |
| fetchOrganizationBySlug | ✅ Narrowed to `PublicOrganization` type |
| A11y structural (auth forms, spinner, icon buttons, labels, heading hierarchy, unread counts) | ✅ All fixed |
| Copy P0+P1 (emails, formatKroner, anglicisms, domain terms, Stripe leftovers) | ✅ All fixed |
| Cross-org RLS (signups, conversations, messages) | ✅ Verified via direct SQL impersonation — 0 leakage |
| Auth end-to-end | ✅ 9/10 Playwright tests green (1 skipped: stale course-wizard test, non-blocking) |
| Capacity race protection | ✅ Code-verified — `SELECT ... FOR UPDATE` serializes |
| Webhook signature | ✅ Code-verified — signature check before any DB client creation |

**Commits shipped:**
```
3920bb8 test(e2e): refresh auth flow tests against current signup form
9319984 fix(copy): P1 domain-term drift and leftover "tilbakebetalt" hedges
54fbd94 fix(a11y): P1 labels, heading hierarchy, unread-count description
a8e039c fix(security): P1 hardening pass on edge functions + public services
f6c1c42 fix(copy): banned patterns in emails, missing formatKroner, anglicisms
c19989a fix(a11y): wire aria-describedby on auth/profile forms, localize spinner
6d09d45 fix(security): close three ship-blocker holes before launch
b52520d chore(workspace): prune stale agents, split design spec, add dintero skill
```

**Deferred from P1:**
- `markPaymentResolved` → edge function. Agent rated "relies on RLS correctness" — RLS is sound, so this is defense-in-depth only. Post-launch candidate.

---

## Remaining work for Fri–Sun

**Fri (today) — must-fix systems + write-ups:**
1. **Fix `send-email` auth for browser callers** — confirmed broken 2026-04-24: `MessageParticipantsDialog` (teacher-broadcast) and `sendNewMessageNotification` (message-reply alerts) both 401 silently. `verifyServiceRole` rejects user JWTs. Fix: allow authenticated-user callers for the user-facing templates (`teacher-broadcast`, `new-message`); keep service-role-only for all other templates. **Redeploy.**
2. **Add schedule-change email path** — `updateCourseSession` just writes the DB row. `SessionList` UI Alert promises "Endring i dato eller tidspunkt sendes på e-post til alle påmeldte deltakere" but no email actually fires. Either: (a) wire it to `send-email` with a new `course-schedule-change` template, or (b) remove the UI promise. Pick (a) for consistency with cancel flow.
3. **Add booking-confirmation + booking-failed emails on free signups** — `create-free-signup` currently skips email. `signup-confirmation` template already exists; call it after successful RPC.
4. Run sandbox payment scenarios (Phase 11 in `tasks/todo.md`) — requires real Dintero test cards.
5. Global edge cases walkthrough (empty states, long strings, network errors).
6. Debug `verifyCallbackSignature` mismatch bug (1 hr budget).

**Sat — design day:**
- Responsiveness agent pass (mobile + tablet)
- Skeleton loader pattern
- Visual a11y deferred items (focus ring styling, status-by-color-alone, toaster aria-live)
- Freeze end of day.

**Sun — prod flip:**
- Prod Supabase project: migrations applied, edge functions deployed, env vars set.
- Domain + SSL.
- Answer business blockers.
- Smoke test every flow on prod.

**Mon — public launch.**

---

## Refund + cancel + payout mechanics (current state, verified from code)

### Refund flow
- **Student-initiated** ([process-refund/index.ts](../supabase/functions/process-refund/index.ts)) — auth required, user_id match only (guest email-match removed in P1). If within 24h cancellation window: refund request rejected server-side. Otherwise `refundTransaction()` → signup updated → `student-cancellation` email sent via server-to-server service-role call. ✅
- **Teacher-initiated per signup** ([teacher-cancel-signup/index.ts](../supabase/functions/teacher-cancel-signup/index.ts)) — org-member check, optional refund flag, `teacher-cancellation` email sent. ✅
- **Teacher cancels whole course** ([cancel-course/index.ts](../supabase/functions/cancel-course/index.ts)) — org-member check, atomic course status flip → parallel refund + email per confirmed signup → `course-cancelled` template. Returns summary with refunds_processed / refunds_failed / failed_refund_details. ✅
- **Refund execution**: all paths call Dintero's `POST /v1/transactions/{id}/refund` with amount in øre. Partial refunds supported by amount parameter. No platform-side bookkeeping tax — Dintero handles the refund split automatically based on the original session's splits.

### Platform cut (verified: [_shared/pricing.ts](../supabase/functions/_shared/pricing.ts))
Two-layer fee, resolved via Dintero splits at session creation — **not** post-processed in our app:
- **Service fee** — 5% added on top of base price, paid by student. Stays with platform.
- **Platform fee** — 5% taken from teacher's base revenue. Stays with platform.
- **Teacher receives** — 95% of base price (one split to `payout_destination_id: <seller_id>`).
- **Platform receives** — service fee + platform fee (one split to `payout_destination_id: "platform"`).
- Refunds mirror the split proportionally (Dintero behavior).

No app-side reconciliation required — settlements land directly into each party's Dintero account per the split ledger. Platform's cut arrives in the account tied to `DINTERO_ACCOUNT_ID`.

### Email triggers — current state

| Event | Template | Status |
|---|---|---|
| Successful paid signup (embedded / payment-link) | `signup-confirmation` | ✅ Sent via finalize + webhook |
| Successful free signup | `signup-confirmation` | ❌ **NOT SENT** — add this |
| Payment declined / failed | `booking-failed` | ⚠️ Sent from webhook on capacity failures; NOT sent from finalize on card decline (user sees iframe error; no email) |
| Teacher sends broadcast to participants | `teacher-broadcast` | ❌ **BROKEN** — browser call 401s on send-email. Fix auth. |
| Message-reply notification | `new-message` | ❌ **BROKEN** — same 401 issue |
| Student cancels their signup | `student-cancellation` | ✅ |
| Teacher cancels a single signup | `teacher-cancellation` | ✅ |
| Teacher cancels whole course | `course-cancelled` (bulk) | ✅ |
| Teacher edits session date/time | (no template) | ❌ **NOT SENT** — UI promises it. Add `course-schedule-change` template. |
| Payment link sent | `payment-link` | ✅ (from send-payment-link edge function) |
| Course reminder | `course-reminder` | ✅ (available; verify cron triggers exist) |

**Email provider**: Resend via the `send-email` edge function (`RESEND_API_KEY` env).

### 🔴 Resend domain — NOT VERIFIED (confirmed 2026-04-24 via live test)

Live test against the deployed `send-email` function with a valid user JWT and an allowed template returned:

> *"You can only send testing emails to your own email address (hei@framio.no). To send emails to other recipients, please verify a domain at resend.com/domains, and change the `from` address to an email using this domain."*

**Impact:** every email currently goes nowhere except `hei@framio.no`. Signup confirmations, refund emails, cancellation emails, payment links, message notifications — all blocked at the Resend gate until a domain is verified. This is a silent failure; nothing errors in our app UI because each call-site swallows email errors as non-fatal.

**Required before prod (1 hr of paperwork):**
1. Verify a domain at https://resend.com/domains (DNS TXT + DKIM records).
2. Set the `from` address in `send-email/index.ts` (currently `${FROM_NAME} <${FROM_EMAIL}>`) to use that verified domain.
3. Ensure `FROM_EMAIL` / `FROM_NAME` env vars are set on the Supabase project.
4. Re-test one of each template path.

---

## Business blockers — you answer these first

These gate the ship. A "no" on any of them changes the plan.

- [ ] **Dintero production approval** — memory says pending as of 2026-04-20. Status now? If still pending, the ship is a soft-launch (sandbox only, no real payments) or a delay.
- [ ] **Production Supabase project** — separate from dev? Migrations applied, up to date with `supabase/migrations/` HEAD?
- [ ] **Production env vars set** on the prod Supabase project: `DINTERO_ACCOUNT_ID` (P-prefix!), `DINTERO_CLIENT_ID`, `DINTERO_CLIENT_SECRET`, `DINTERO_WEBHOOK_SECRET`, `DINTERO_PROFILE_ID`, `DINTERO_CRON_SECRET`, `ALLOWED_ORIGIN`, `RESEND_API_KEY`, email-from address.
- [ ] **Production domain** — DNS pointed, SSL active, `ALLOWED_ORIGIN` matches it on every edge function (we have an inconsistency flagged below).
- [ ] **Supabase Auth settings** — "Confirm email" toggled ON? Site URL + redirect URLs on prod domain?
- [ ] **Resend (or email provider)** — prod domain verified, sending limits sufficient for Day 1.
- [ ] **Error monitoring** — Sentry/PostHog/etc. wired? If not, flag as ship risk.
- [ ] **Legal** — `/terms` reachable, privacy mention (required under GDPR). Cookie banner if tracking added.

---

## P0 — Ship blockers (must fix before Monday)

### Security / data

- [ ] **Drop `"Anon can view signup counts"` policy on `signups`.** `supabase/migrations/20260323010000_comprehensive_rls.sql:190` — grants anon `SELECT *`. Leaks every participant's name/email/phone/amount to anyone with the anon key (which is public). Capacity counts should use an aggregate RPC that returns `count(*)` only. **New migration required.**
- [ ] **Fix `create-free-signup` → still passes Stripe-era RPC params.** `supabase/functions/create-free-signup/index.ts:67` calls `create_signup_if_available` with `p_stripe_*` params — the Dintero-renamed RPC will reject this at runtime. **Every free-course signup currently 500s.**
- [ ] **Close `finalize-dintero-transaction` merchant_reference bypass.** `supabase/functions/finalize-dintero-transaction/index.ts:161-163` — if the client omits `merchant_reference`, the mismatch check is skipped. An attacker with a leaked transaction_id can front-run payment completion. Require `merchant_reference` when `transaction_id` is supplied; hard-fail on mismatch.

### Auth / a11y (structural — safe to fix now, no visual churn)

- [ ] **`AuthFormField` — wire `aria-describedby` from input to error `<p>`.** `src/components/auth/AuthFormField.tsx` — screen readers currently announce "invalid" without reading the message. Affects every auth form.
- [ ] **`MobileTeacherHeader` — remove `aria-hidden` from the page title.** `src/components/teacher/MobileTeacherHeader.tsx:11` — mobile screen reader users currently get no page heading anywhere.
- [ ] **`Spinner` — translate aria-label.** `src/components/ui/spinner.tsx:23` — `aria-label="Loading"` → `"Laster"`.
- [ ] **`TeacherProfilePage` — delete-confirm input + all form errors need a11y wiring.** `src/pages/teacher/TeacherProfilePage.tsx:694` (delete input missing `htmlFor`/`id`) and lines 376–408, 505, 530 (profile + password errors not linked via `aria-describedby`).

### Copy

- [ ] **Email templates — fix banned patterns.** `supabase/functions/send-email/index.ts`:
  - Line 152: `"Vi beklager, men din påmelding … kunne ikke fullføres"` → active + no "Vi beklager".
  - Lines 384–397, 446: `"tilbakebetalt"` → `"refundert"` (wrong domain verb) + drop `"Vi beklager ulempene"` filler.
  - Line 461: `"kan vi dessverre ikke tilby refusjon"` → drop "dessverre", state plainly.
- [ ] **`QuickOverviewCard` — hardcoded `12 400 kr` bypasses `formatKroner()`.** `src/components/teacher/dashboard/QuickOverviewCard.tsx:86`.
- [ ] **`use-setup-progress.ts` — `"bookinger"` anglicism.** Line 37, line 66. Shown on every new instructor's dashboard. → `"påmeldinger"`.
- [ ] **`COPY_STYLE_GUIDE.md:311` — stale Stripe reference.** Style guide still instructs "Knytt kontoen din til Stripe". Misleads future copy writers. Update to neutral "betalingsløsning".

---

## P1 — Should fix before Monday (defence-in-depth + visible quality)

### Security hardening (not ship-blocking but close)

- [ ] **`process-refund` guest-email match path.** `supabase/functions/process-refund/index.ts:64-68` — if a signup has `user_id = null` (guest booking), authenticated user whose email matches `participant_email` can cancel it. Require a cancellation token emailed to the address, or drop the email-match fallback entirely.
- [ ] **`send-email` raw-HTML path bypasses `escapeHtml()`.** Line 677–689. Gate behind an additional flag or require `template` always.
- [ ] **`sweep-pending-payments` + `sync-dintero-seller-statuses` cron secret.** Both accept `x-cron-secret: <empty>` if `DINTERO_CRON_SECRET` env var is unset. Add `if (!cronSecret) fail` guard.
- [ ] **`create-dintero-session` — UUID validation on `courseId`/`signupPackageId` + basic rate limit per IP.** `payment_attempts` spam prevention.
- [ ] **`fetchOrganizationBySlug` leaks Dintero internals publicly.** `src/services/organizations.ts:8` uses `select('*')`. Explicit column list omitting `dintero_seller_id`, `dintero_approval_id`, `dintero_contract_url`, `dintero_onboarding_status`.
- [ ] **`markPaymentResolved` — route through an edge function.** `src/services/signups.ts:228-236` currently relies on RLS alone. Mirror the `teacher-cancel-signup` pattern (edge function + `verifyOrgMembership`).
- [ ] **Verify `course_sessions` anon SELECT was dropped on production.** Run `SELECT policyname, roles FROM pg_policies WHERE tablename IN ('signups','course_sessions')` on prod Supabase. If the anon policy survived, drop it in the same migration as the `signups` fix.
- [ ] **`ALLOWED_ORIGIN` wildcard fallback** on `finalize-dintero-transaction` — set explicitly in prod. Mitigated by Dintero signature verification but still bad hygiene.

### A11y structural (non-critical)

- [ ] Add `aria-label="Innstillinger"` to Settings icon-button (`TeacherTopBar.tsx:142`).
- [ ] Add `aria-label="Varsler"` to Bell notification trigger (`NotificationDropdown.tsx:104`).
- [ ] `ScheduleHeader` prev/next buttons: `"Forrige"` → `"Forrige uke"`.
- [ ] `DatePicker`/`TimePicker` labels need `aria-labelledby` (CourseSettingsTab, SessionList).
- [ ] `SignupRow` empty-action icon needs `aria-hidden="true"` (line 94).
- [ ] Dashboard heading hierarchy skip: error-state `<h3>` → `<h2>` (`TeacherDashboard.tsx:298`).
- [ ] `ConversationList` unread-count badge needs `aria-label` with context.

### Copy moderate

- [ ] `PaymentsPage.tsx:539` — `"Kansellert"` → `"Avlyst"`.
- [ ] `PaymentsPage.tsx:216` — `"transaksjoner"` → `"betalinger"`.
- [ ] `TeacherProfilePage.tsx:309` — tighten delete-account toast copy.
- [ ] Email template: `"studiet"` → `"studioet"` (line 506, 530).
- [ ] Email template: drop `"Vi må dessverre informere om at"` ceremonial opener (line 377).

---

## P2 — Polish (post-launch or Sunday nice-to-have)

- [ ] Verify `search_path = pg_catalog, public` on SECURITY DEFINER RPCs on prod (`create_signup_if_available`, `get_signup_by_dintero_id`, `count_active_confirmed_signups`, `check_session_conflict`, `check_sessions_conflicts`, `upsert_notification`).
- [ ] `create_course_idempotent` + session-conflict RPCs — check they have `SECURITY DEFINER` + search_path.
- [ ] Consider adding `payment_attempts` TTL cleanup beyond the 24h abandonment (protects against long-tail bloat).
- [ ] `RadioGroup` "Utstyr" missing `aria-label` (CourseSettingsTab).

---

## Manual test scenarios — run these on sandbox before Monday

### Payments — extends `tasks/todo.md` Phase 11

- [ ] **Happy path embedded:** book → iframe → test card → success page → signup appears → email sent.
- [ ] **Happy path payment-link:** teacher sends link → participant clicks → hosted checkout → success.
- [ ] **Capacity race:** two students on the last seat within 1 sec. One captures, one voids. No double charge.
- [ ] **Customer closes tab mid-embed:** `sweep-pending-payments` cron recovers within 4 min.
- [ ] **Customer paid, closed tab before success page:** same sweep recovery.
- [ ] **Refund within cancellation window:** student cancels >24h out. Refund processed. Email sent.
- [ ] **Refund outside window:** student cancels <24h. API rejects. No Dintero call.
- [ ] **Teacher cancels course:** mass refund. All paid signups refunded, emails sent.
- [ ] **Failed card:** declined test card → payment_status=failed, no signup.
- [ ] **Reload on success page before finalize completes:** idempotent behaviour — no duplicate signup.
- [ ] **Webhook signature tamper:** deliver bad signature → 401, no writes.
- [ ] **Webhook replay:** redeliver same event → 200 (already processed).
- [ ] **`verifyCallbackSignature` debug** — per `todo.md` outstanding gap, 401s our own signed test. Budget 1 hr; if not trivially fixed, defer.

### Auth — end-to-end

- [ ] Signup → email confirm → land on `/teacher` → WelcomeFlow or dashboard?
- [ ] Login with correct creds → redirect to `state.from` if present, else `/teacher`.
- [ ] Login with wrong creds → clear error, no redirect.
- [ ] Forgot password → email arrives → reset link → new password saved → can log in.
- [ ] Logout → session cleared → `/teacher/*` redirects to `/login`.
- [ ] Session expiry (leave tab open, token times out) → `TOKEN_REFRESHED` OR graceful redirect.
- [ ] Google OAuth button → redirect → profile created or linked.
- [ ] Hitting `/teacher` unauthenticated → redirect to `/login` with `from` state.
- [ ] Hitting `/reset-password` without a valid token in URL → error state, not blank page.

### Messages

- [ ] Teacher composes new conversation to a participant → participant sees it (if logged in) OR email notification sent.
- [ ] Reply thread preserves pairing; unread counts update correctly.
- [ ] Mark-as-read updates DB (`conversations.last_read_at` or similar).
- [ ] **Cross-org RLS test:** create a second test organization, verify teacher A cannot see org B's conversations via any query path.
- [ ] Long message body (2000+ chars) — no UI overflow, no truncation data loss.

### Edge cases (cross-cutting)

- [ ] Empty states on every teacher page (no courses, no signups, no messages, no payments).
- [ ] Error state on every page (kill network mid-load).
- [ ] Offline handling — does `toast.error` fire for failed saves?
- [ ] Long user-generated strings (very long course name, participant name, description) — table row truncation correct, no overflow.
- [ ] Boundary values: free course (0 kr), max-capacity course (last seat), overlapping sessions (allowed now per recent commit).
- [ ] Concurrent edit: two tabs editing same course → last-write-wins or conflict?

---

## Sunday bucket — design / visual / responsiveness

Flagged now so you know what's deferred. Don't touch Thu–Sat.

- [ ] Run `responsiveness` agent on teacher dashboard (mobile + tablet).
- [ ] Skeleton loader pattern (codify + apply to dashboard, courses, signups, payments, schedule).
- [ ] Visual a11y (deferred from a11y agent):
  - `ConversationList` selected-state ring contrast.
  - `EventCard` colour coding (add text/symbol, not colour alone).
  - `PaymentsPage:488` account status dot — add `sr-only` text label.
  - `<Toaster>` aria-live verification.
- [ ] Any remaining design polish.

---

## Reality check

Rough effort estimate for P0:
- Security/data fixes: ~2–3 hrs (mostly one new migration + one edge-function fix + one check-rewrite).
- A11y structural P0: ~1–2 hrs (mostly wiring `aria-describedby`).
- Copy P0: ~1 hr.
- **P0 total: ~4–6 hrs.** Doable Thursday.

P1 adds another ~4–6 hrs. P2 is post-launch.

Phase 11 testing + auth/messages/edge-case walkthroughs = the rest of Fri + Sat.

**Advice:** knock out P0 Thursday; spend Friday + Saturday on the test scenarios. If Dintero prod approval hasn't landed by Saturday night, plan a sandbox-only soft launch and flip to prod when approval lands.

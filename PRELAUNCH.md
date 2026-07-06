# Pre-launch TODO

Deferred items from the 2026-05-19 DB audit. Everything in this list is
non-blocking — the live DB is materially hardened. Order is rough priority,
not strict dependency.

---

## 2026-07-05 deep backend audit (5-agent) — fixes applied

Full backend audit (payments, billing/Connect, email/cron, DB functions,
schema/RLS/perf/tests). Fixes on branch **main-21**: 10 migrations
(`20260705210000`–`214500`) + 19 files, in 3 commits. Findings artifact + detail
in the session; ongoing state in memory `backend-audit-fixes-jul5.md`.

### Done — migrations APPLIED to remote + committed on main-21

- **P0 double-charge** — duplicate-signup unique index rebuilt on
  `lower(participant_email)` + email normalized in `create_signup_if_available`.
- **P0 oversell** — mint always takes the course lock + session lock for drop-ins.
- **P0 billing clobber** — a stale `subscription.deleted` for an old subscription
  can no longer downgrade a newer active Pro row.
- **P0 ops config** — `ops-health-alert` declared `verify_jwt=false` in config.toml.
- **P1** — `check_email_auth_status` keys on the trusted last XFF hop; aggregate
  `seller_income_series`/`seller_platform_fee_month` RPCs (fix >1000-row income
  truncation); signups financial CHECKs + revoked server-column INSERT grants;
  `subscription_pending_reprice` flag; `ops_health_check` +3 checks; email 15s
  timeout + fan-out pacing; confirmation-sweep run-lock; reminder stamp-unless-all-
  failed; google-places rate-limits before billing Google; connect two-tab orphan.
- **P2** — sweep index coverage; PI-cancel cancels the minted paid signup; sweep
  cancels stale PI on abandon; cancel-course handles `processing` + bounds Stripe
  concurrency; Idempotency-Keys on capture/cancel/refund; dropped dead
  `signups_update_member` policy; `is_platform_admin` self/admin guard; ingress
  text-length CHECKs; NULL capacity = unlimited; notifications purge; constant-time
  cron-secret compares.

All 24 edge functions were redeployed 2026-07-05 (so the shared `stripe.ts`
idempotency keys, `email.ts` timeout, and `auth.ts` timing-safe compare
propagate everywhere, incl. `teacher-cancel-signup`).

### Closed since (2026-07-06)

- **Merge `main-21` → `origin/main`** — done via PRs #84 and #89; all 10 audit
  migrations plus `20260705225951` (course_sessions DELETE grant) and
  `20260706120000` (ops-window bound) are on main and applied to remote.
- **Investigate 5 abandoned paid confirmations** — all five were seed/demo rows
  (no PaymentIntent, `@example.com`, never went through checkout); zero genuine
  cases. Check bounded to a 24h–7d window in `20260706120000` so historical rows
  age out; `ops_health_check()` returns all zeros.
- **`cleanup-old-notifications-monthly` cron** — confirmed live and active in
  `cron.job` (`45 3 1 * *`).

### Still needs human / production action

- **Verify Stripe dunning final action** — `unpaid`→`past_due` grants full Pro.
  If Stripe's dunning final action is "mark unpaid" (not cancel), a non-payer
  keeps Pro forever. Remap `unpaid`→`canceled` if so. (Not changed in code.)
- **Schedule the class-reminder cron** — `send-class-reminders` is deployed but
  has no `cron.job` row (confirmed 2026-07-06); re-run the schedule from
  `20260705170000` before the first course hits T-24h.
- **Set ops-alert env** — `OPS_ALERT_EMAIL` + Resend vars, or `ops-health-alert`
  stays a no-op.
- **Deferred (low)** — backend test suite (sweep/capacity/refund/RLS/webhook);
  re-auth on `delete-account`; anon-RPC rate limits
  (`get_signup_by_stripe_id`, `lookup_seller_invite_link`); advisor unused-index
  drops after a post-launch recheck; yearly Stripe price env vars.

---

## 2026-06-08 prelaunch checklist pass

### Done in this pass

- **Capture-amount defense-in-depth** — `stripe-connect-webhook` compares the
  authorized Stripe amount against `payment_attempts.total_price_nok` before
  capturing an authorization. Mismatched authorizations are voided and logged.
- **E2E smoke coverage refreshed** — Playwright specs now target the current
  `/auth` magic-link flow and current protected routes instead of the removed
  `/signup`, `/login`, `/forgot-password`, and `/teacher/*` routes.
- **Production dependency audit clean** — `npm audit --omit=dev` now reports
  0 vulnerabilities after lockfile updates for React Router, Supabase JS, Vite,
  Vitest, and Supabase CLI.

### Still needs human / production verification

- Run the manual smoke-test runbook below against Stripe test/live mode.
- Confirm production `VITE_PRELAUNCH` is explicitly set for the intended launch
  state.
- Confirm DMARC, PITR/backups, and failure alerting from
  `docs/launch-readiness.md`.
- Full `npm audit` still reports a dev-only moderate advisory in
  `@react-email/ui -> next -> postcss` with no available fix; it is not present
  in `npm audit --omit=dev`.

---

## 2026-06-01 soft-launch readiness review

A code + DB sweep ahead of the soft launch. Findings below; the DB-hygiene
sections further down were re-checked against the live database on this date
and are **all still open** (nothing has been applied since 2026-05-19).

### Done (committed this review)

- **Checkout phone validation** — `isValidPhone()` in `src/lib/utils.ts`, wired
  into `CheckoutPage.tsx` `formValid`. Was `phone.trim().length > 0` (accepted
  any junk). Covers paid + free flows.
- **`/dev/*` preview routes gated behind `import.meta.env.DEV`** —
  `src/App.tsx`. They were public + direct-URL reachable in prod builds.
- **`VITE_PRELAUNCH` documented in `.env.example`** — flag defaults to
  signup-LIVE when unset. **ACTION: confirm `VITE_PRELAUNCH=true` is set in the
  Vercel production environment before deploy.** (Only thing here not closeable
  from the repo.)

### Real, deferred to post-launch (low risk at soft-launch traffic)

- **Additional rate limiting** on authenticated support/course-message email
  functions — a spam vector, but low-risk because callers are logged in and
  self-identifying. Add if abuse appears.

### Investigated and dismissed — do NOT re-open

These were flagged by an automated review and **verified false** by reading the
actual code. Recorded so nobody re-investigates:

- **"HTML injection in emails"** — FALSE. `course-message`/`support-message`
  templates render user text as JSX children (`{...}`), which React escapes.
  No `dangerouslySetInnerHTML`.
- **"send-support-message leaks other users' PII"** — FALSE. `signupId` is only
  honored when the caller is a verified member of the seller that owns the
  course, and the signup lookup is scoped to both. Sender identity comes from
  the authenticated profile, not user input.
- **"delete-account doesn't verify ownership"** — FALSE. Operates only on
  `auth.userId`; deletes sellers only where the caller is the *sole* `owner`.
- **"teachers can cancel courses / refund"** — NOT a bug, a product decision.
  `cancel-course` / `teacher-cancel-signup` allow `owner/admin/teacher`, all
  verified members of that seller. Fine for solo studios; revisit only when
  low-trust staff roles exist.

### Manual smoke-test runbook (run before launch — money path has no e2e coverage)

The public booking + payment flow has zero automated tests and the Stripe Connect
integration is newly wired. Run these by hand against Stripe test/live mode before
opening signups:

1. **Full paid booking on a real phone** — browse → course detail → checkout →
   fill form → Stripe payment embed → success page → confirmation email arrives.
   Watch the checkout layout on a 390px-wide screen.
2. **Free signup** — separate path (`window.location` redirect); confirm success
   page + email.
3. **Webhook-down → sweep recovery** (most important): start a paid checkout,
   authorize, then **close the tab before the redirect**. Wait ~3 min for the
   `sweep-pending-payments` cron. Confirm the signup appears `confirmed` with the
   correct `amount_paid`, and the Stripe payment intent is captured exactly once.
4. **Seller-onboarding gate** — an un-approved seller must NOT be able to take
   payment (checkout button blocked).
5. **Refund / cancel-course as owner** — confirm the buyer is actually refunded
   in the Stripe dashboard, not just marked refunded in the DB.
6. **Teacher onboarding incl. a taken studio slug** — the error path must leave
   the user able to recover, not stuck.

Defer the automated payment e2e test to post-launch — Stripe test-mode e2e is flaky
and wouldn't cover the real webhook/capture/refund money movement anyway.

## Database hygiene

### M2 — Drop duplicate slug indexes

**Prerequisite:** audit the codebase for case-sensitive slug lookups before
applying.

```bash
# Both should match consistently — every read should be lowercased.
rg "\.eq\(['\"]slug['\"]," src/
rg "\.eq\(['\"]invite_code['\"]," src/
```

If all slug lookups are lowercased (recommended for URLs):

```sql
DROP INDEX IF EXISTS public.idx_teams_owner_seller;          -- covered by teams_owner_seller_id_key UNIQUE
DROP INDEX IF EXISTS public.idx_team_invite_links_code;      -- covered by team_invite_links_code_key UNIQUE
ALTER TABLE public.teams   DROP CONSTRAINT IF EXISTS teams_slug_key;
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_slug_unique;
-- The *_slug_lower_idx UNIQUE indexes become the canonical case-insensitive guard.
```

Otherwise drop the lower-case indexes instead.

### L5 — Drop unused indexes flagged by Supabase advisor

```sql
DROP INDEX IF EXISTS public.idx_webhook_events_type;
DROP INDEX IF EXISTS public.idx_payment_attempts_ticket_type;
```

The `notifications_recipient_*` partial indexes show 0 scans only because
the table has 0 rows — keep them; they'll be used post-launch.

### L7 — Consolidate `updated_at` trigger functions

`public.update_updated_at_column()` and
`public.update_course_sessions_updated_at()` are identical. Drop the latter
and re-point its triggers to the canonical function.

```sql
DROP TRIGGER IF EXISTS course_sessions_updated_at ON public.course_sessions;
CREATE TRIGGER course_sessions_updated_at
  BEFORE UPDATE ON public.course_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP FUNCTION IF EXISTS public.update_course_sessions_updated_at();
```

### L3 — Convert text+CHECK status columns to enums

For consistency with the rest of the schema (`course_status`,
`signup_status`, etc.):

- `course_sessions.status` (text + CHECK)
- `payment_attempts.status` (text + CHECK)

```sql
CREATE TYPE public.session_status AS ENUM ('upcoming','completed','cancelled');
ALTER TABLE public.course_sessions
  ALTER COLUMN status TYPE public.session_status USING status::public.session_status,
  ALTER COLUMN status SET DEFAULT 'upcoming'::public.session_status;
ALTER TABLE public.course_sessions DROP CONSTRAINT course_sessions_status_check;

CREATE TYPE public.payment_attempt_status AS ENUM (
  'pending','authorized','captured','failed','voided','refunded'
);
ALTER TABLE public.payment_attempts
  ALTER COLUMN status TYPE public.payment_attempt_status USING status::public.payment_attempt_status;
ALTER TABLE public.payment_attempts DROP CONSTRAINT payment_attempts_status_check;
```

Confirm no functions/views still reference the old text column before applying.

### L2 — Rename `is_seller_owner` (defer until a third role exists)

Today, `is_seller_owner(seller_id, user_id)` filters `role IN ('owner','admin')`
but the enum only has those two values, so the filter is a no-op and the
name misleads. Two safe paths:

- Add a `member` role to `seller_member_role` enum, then the existing function
  becomes meaningfully selective.
- Or rename to `is_seller_admin` and update RLS policies to call the new
  name.

Either way, leave alone until the third role lands.

## Auth

### L6 — Enable HaveIBeenPwned leaked-password protection

One toggle in **Supabase Dashboard → Authentication → Settings → Password
security**. No code change.

## Product calls (not just DB)

### `courses.idempotency_key` — wire it up or remove it

Status: 24/24 courses have NULL. The RPC `create_course_idempotent` accepts
and dedupes on the key, but no client passes one.

Pick one:

- **Wire the client:** generate a UUID once when the create-course form
  mounts; pass to RPC on submit. Real value during double-submit/retry.
- **Remove the dedup:** drop the column, the partial unique index
  `idx_courses_idempotency`, and the dedup branch in
  `create_course_idempotent`.

```sql
-- Option B only
ALTER TABLE public.courses DROP COLUMN IF EXISTS idempotency_key;
DROP INDEX IF EXISTS public.idx_courses_idempotency;
-- Plus edit create_course_idempotent() to remove the dedup branch.
```

## Parked local work (not DB)

Stashes that survived the audit session — preserved non-destructively:

- `wip/pre-h2-course-list-work` — local commit `f56162b`: pre-H2 WIP on
  `CourseListView.tsx`, `CoursesPage.tsx`, `radix-grays-dashboard.html`,
  + the matching `package-lock.json` update.
- `stash@{0}` (on `wip/pre-h2-course-list-work`) — 36MB `.tmp/` of design
  reference screenshots. Not committed (size).
- `stash@{1}` (on `main`) — post-H2 lockfile + CLI scratch leftovers.
- `stash@{2}` (on `main`) — original pre-H2 stash, kept as backup of
  `stash@{0}`'s parent state.

Decide later whether to merge the WIP branch back to main, drop the design
refs to a separate repo / cloud storage, or discard.

# Launch smoke-test harness

Non-browser core of the pre-launch smoke pass. Covers the 🤖/🔧 items in
sections **A (money)**, **E (edge-function security)**, and **F (database/ops)**
of [`docs/smoke-test-checklist.md`](../../docs/smoke-test-checklist.md).
Sections B/C/D (UI flows) are a separate Playwright-based harness.

Everything here runs in **Stripe test mode only** and talks to the **shared,
already-deployed** Supabase project (remote edge functions + the shared DB —
see the checklist's "Modes & targets"). It never touches live money.

## The `--confirm` guard

Every entry point is inert until you explicitly say so:

```
node scripts/smoke/run.mjs                 # prints the plan, does nothing, exits 0
node scripts/smoke/run.mjs --confirm       # actually runs every registered test
node scripts/smoke/run.mjs --confirm --only=A2,A3,E1   # run a subset
```

`cleanup.mjs` mirrors this: with no flags (or `--dry-run`) it only prints what
it would delete/void; only `--confirm` actually touches anything.

```
node scripts/smoke/cleanup.mjs              # dry run
node scripts/smoke/cleanup.mjs --confirm    # actually delete/void manifest rows
```

`assertTestMode()` (in `lib/env.mjs`) additionally hard-refuses to run unless
`VITE_STRIPE_PUBLISHABLE_KEY` starts with `pk_test_`, and actively rejects
`--live` anywhere on the command line. There is no override.

## Shared-DB warning

Local frontend / remote edge functions / **shared Supabase DB** — every test
row this harness creates lands in the real, shared database (per the
checklist). Every created resource is appended to
`scripts/smoke/.manifest.json` (gitignored) as it's created, and

```
node scripts/smoke/cleanup.mjs --confirm
```

deletes/voids **exactly** those manifest rows — never a blanket or
pattern-based delete. **Always run cleanup after a real `--confirm` session.**

## One remaining credential

`SUPABASE_SERVICE_ROLE_KEY` is **not** currently in `.env.local` (by design —
it's not committed anywhere). Add it before running anything that reads
RLS-protected tables (`signups`, `payment_attempts`) or that calls
`cleanup.mjs`:

> Supabase Dashboard → Project Settings → API → `service_role` secret key

Everything that needs it fails with a clear, actionable error the first time
it's actually used — importing the library or printing the plan never
requires it.

## Fixtures

This harness does not seed its own test data (courses/sellers) — it runs
against the shared, already-seeded DB, and the agent that built it was
explicitly told not to create signups or trigger Stripe events while building
it. Money-path tests therefore need real fixture ids from that DB, passed as
env vars (in `.env.local` or the shell environment). A test whose fixture is
unset reports **SKIP**, not FAIL.

| Var | Used by | Needed for |
|---|---|---|
| `SMOKE_SELLER_SLUG` | most of A | storefront slug of a seller with Stripe Connect onboarding complete (`charges_enabled`) |
| `SMOKE_PAID_COURSE_ID` / `SMOKE_PAID_TICKET_TYPE_ID` | A1, A2, A6, A7, A8, A9, A12 | a published paid course with headroom in `max_participants` (repeatedly booked) |
| `SMOKE_FREE_COURSE_ID` | A3 | a published free course (`price <= 0`) |
| `SMOKE_LAST_SEAT_COURSE_ID` / `SMOKE_LAST_SEAT_TICKET_TYPE_ID` | A4 | a course with `max_participants` set and exactly 1 seat left |
| `SMOKE_SOLD_OUT_COURSE_ID` / `_TICKET_TYPE_ID` | A5 | a sold-out course (optional — sub-case skips if unset) |
| `SMOKE_STARTED_SERIES_COURSE_ID` / `_TICKET_TYPE_ID` | A5 | a series course that has already started (optional) |
| `SMOKE_PAST_SESSION_COURSE_ID` / `_TICKET_TYPE_ID` / `SMOKE_PAST_SESSION_ID` | A5 | a drop-in session already in the past (optional) |
| `SMOKE_CANCELLED_COURSE_ID` / `_TICKET_TYPE_ID` | A5 | an already-cancelled course (optional) |
| `SMOKE_CANCELLABLE_COURSE_ID` / `_TICKET_TYPE_ID` | A10 | a **throwaway** paid course — cancel-course permanently cancels it |
| `SMOKE_CANCELLABLE_COURSE_ID_A11` / `_TICKET_TYPE_ID_A11` | A11 | a **second, separate** throwaway paid course (same reason, must not collide with A10's) |
| `SMOKE_SELLER_OWNER_EMAIL` / `SMOKE_SELLER_OWNER_PASSWORD` | A9, A10, A11 | login for the owner of `SMOKE_SELLER_SLUG` (password auth enabled) — `teacher-cancel-signup` / `cancel-course` require a real user JWT, not the anon/service key |
| `SMOKE_DNS_DOMAIN` | F6 | sending domain to check SPF/DKIM/DMARC for (defaults to `raden.no`) |
| `SMOKE_DKIM_SELECTOR` | F6 | DKIM selector (defaults to `resend._domainkey` — a guess; override if wrong) |
| `SMOKE_TARGET_URL` | all edge-function calls | overrides the derived `${VITE_SUPABASE_URL}/functions/v1` base (e.g. to point at a preview deploy) |
| `CRON_SECRET` | A8 | preferred cred for cron-only functions; falls back to `SUPABASE_SERVICE_ROLE_KEY` if unset |

## Test → checklist ID map

| Script | ID | What it verifies |
|---|---|---|
| `tests/a1-happy-path.mjs` | A1 | Paid guest booking, API-driven variant (browser variant is Playwright's job) |
| `tests/a2-declined-card.mjs` | A2 | Declined card surfaces cleanly, no signup/charge |
| `tests/a3-free-signup.mjs` | A3 | Free-course signup + Mailosaur confirmation email |
| `tests/a4-oversell-race.mjs` | A4 | Two concurrent bookings on the last seat → exactly 1 confirmed |
| `tests/a5-blocked-states.mjs` | A5 | Sold-out / started-series / past-session / cancelled rejected server-side |
| `tests/a6-double-submit.mjs` | A6 | Double-submit checkout replay → 1 signup, 1 charge |
| `tests/a7-webhook-idempotency.mjs` | A7 | Same Stripe event id redelivered → processed once, no double email |
| `tests/a8-pending-sweep.mjs` | A8 | `sweep-pending-payments` is a safe no-op on an already-settled attempt |
| `tests/a9-teacher-cancel-refund.mjs` | A9 | `teacher-cancel-signup` full refund; retry doesn't double-refund |
| `tests/a10-cancel-course-refund.mjs` | A10 | `cancel-course` refunds every paid signup exactly once |
| `tests/a11-refund-preserves-cancelled.mjs` | A11 | Redelivered `charge.refunded` doesn't clobber `course_cancelled` |
| `tests/a12-price-tampering.mjs` | A12 | Bogus price fields in the request are ignored; server prices from DB |
| `tests/e1-jwt-gated-401.mjs` | E1 | JWT-gated functions 401 with no Authorization header |
| `tests/e2-cron-401.mjs` | E2 | Cron endpoints 401 with no cron secret |
| `tests/e3-webhook-bad-signature.mjs` | E3 | Webhooks reject missing (400) / invalid (401) signatures |
| `tests/e4-rate-limit.mjs` | E4 | Rate limiting trips on repeated calls — **run last**, burns the IP bucket |
| `tests/e5-send-email-not-open-relay.mjs` | E5 | `send-email` rejects non-service-role callers |
| `tests/e6-cors-preflight.mjs` | E6 | CORS: allowed origins echoed, untrusted origins rejected |
| `tests/f1-migration-drift.mjs` | F1 | `supabase migration list` shows zero drift |
| `tests/f3-rls-spot-check.mjs` | F3 | Anon key can't read signups / payment_attempts / draft courses |
| `tests/f6-email-dns.mjs` | F6 | SPF / DKIM / DMARC records exist for the sending domain |

F2 (advisors) and F4/F5 (ops-health-alert email delivery, Sentry) are done via
MCP/other tooling per the checklist and are not scripted here.

## Layout

```
scripts/smoke/
  lib/
    env.mjs          — .env.local loader + assertTestMode() hard-refusal gate
    db.mjs            — Supabase client factory (service-role + anon)
    mailosaur.mjs      — Mailosaur REST API (search/poll/count inbox)
    stripe-cli.mjs     — child_process wrappers over the `stripe` CLI
    manifest.mjs       — read/write .manifest.json
    edge.mjs           — fetch() helper for calling deployed edge functions
    fixtures.mjs       — env-var-backed test fixtures + seller-owner sign-in
    context.mjs        — assembles the `ctx` object passed to every test
    poll.mjs           — small poll-until-condition helper (webhook-driven state)
  tests/
    a*.mjs, e*.mjs, f*.mjs   — one file per checklist ID, pure exports only
  run.mjs             — the runner (this is what you invoke)
  cleanup.mjs         — deletes/voids exactly what's in the manifest
  .manifest.json      — gitignored, created on first run
```

Every test module exports `meta = { id, title, owner }` and
`async function run(ctx)` returning `{ pass, details }` (or
`{ skipped: true, details }`, or it may just throw a `FixtureError` from
`ctx.fixtures.*` — `run.mjs` catches that centrally and reports SKIP). No test
file has any top-level side effect; importing one does nothing.

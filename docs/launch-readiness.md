# Launch readiness

Outcome of the pre-launch security & ops scan (2026-06). The scan ran area by
area (authorization, payments, public exposure, customer data & account
lifecycle, edge functions, ops). **No launch blockers were found.** This file
records the founder-side items that still need a human, and the risks we
consciously accepted.

## Hardening shipped during the scan

All applied to production and verified; see git history for details.

| Area | Fix |
|------|-----|
| Authorization | `signups` UPDATE restricted to seller members (F2) |
| Payments | Refund reconciliation against live Stripe status (no double-refund on retry); webhook signature replay-window test suite |
| Roles | Collapsed studio roles to a single `owner` role, enforced by a CHECK constraint; dropped dead `teacher` role from allowlists |
| Public storefront | CSPRNG invite codes (was ~32-bit md5); `status <> 'draft'` guards on `available_ticket_types` / `public_signup_counts` (F3.1, F3.3); dropped anon read of `courses.idempotency_key` (F3.2) |
| Customer data | Least-privilege `profiles` UPDATE grant — closes platform-admin self-escalation (F4.1); redact buyer contact PII + clear seller logo on account deletion (F4.2, F4.3) |
| Edge functions | Generic client error messages, detail logged server-side (F5.1) |
| Waitlist | Anon/authenticated INSERT revoked as an unused write surface (F3.4); dead `WaitlistForm` removed from the landing |

**Follow-up pass (2026-07-01).** A second review found two checkout **blockers**,
now fixed: the success page could show "Du er påmeldt" for a paid return with no
confirmed payment (guarded), and a missing Stripe publishable key failed silently
(now a clear error). Also hardened: dropped the public storefront buckets' broad
listing policies, and revoked a stray `PUBLIC EXECUTE` on the
`enforce_course_publish_requires_payment` trigger function. Error monitoring +
payment-anomaly alerting were scaffolded (see the checklist — they need config to
go live).

## Founder checklist — the launch TODO list

**The single place to track what's left.** Nothing here is a launch blocker — these
are founder-side config actions and follow-up builds. Split into "flip on at launch"
(quick config / secrets / DNS) and "build" (needs code or a process).

### Flip on at / around launch (config, secrets, DNS)

- [ ] **`VITE_STRIPE_PUBLISHABLE_KEY` in Vercel (LAUNCH BLOCKER)** — verified
      2026-07-07: no `pk_` key in any deployed JS chunk, so the paid checkout
      card form cannot mount. Add the sandbox key in Vercel env + redeploy now;
      switch to `pk_live_` together with `STRIPE_SECRET_KEY` at real-money
      cutover. Details in `PRELAUNCH.md`.
- [ ] **`VITE_PRELAUNCH` cutover** — verified 2026-07-07: prod is built with
      `VITE_PRELAUNCH=true` (prelaunch CTAs statically compiled into the
      deployed LandingPage chunk), so the flip requires changing the Vercel env
      **and redeploying** — the value is baked in at build time. After the flip,
      confirm `/auth` is reachable and the landing CTAs (`Kom i gang` → `/auth`)
      work.
- [ ] **Schedule the class-reminder cron** — `send-class-reminders` is deployed
      but has no `cron.job` row (verified 2026-07-07; the `20260705170000`
      migration shows as applied, so the schedule was lost after apply). Re-run
      it before the first course hits T-24h.
- [ ] **Leaked-password protection** — still disabled (advisor WARN re-confirmed
      2026-07-07). Enable in Supabase → Auth → Settings → Password security
      (checks HaveIBeenPwned). **Now relevant:** the auth rework reintroduced
      email + password sign-in, so accounts have passwords again.
- [x] **DMARC** — record exists at `_dmarc.openspot.no` (`p=none`, monitor-only;
      verified via live DNS 2026-07-07), covering the `mail.openspot.no` sender
      via org-domain fallback. *Remaining (post-launch): consider tightening to
      `p=quarantine`.*
- [ ] **Supabase PITR / backups** — confirm point-in-time recovery is enabled on the
      current plan. Migrations are forward-only, so rollback = forward migration +
      redeploy of the prior function version.
- [ ] **Sentry error monitoring** — code is wired but dormant (no DSN in the prod
      bundle, re-confirmed 2026-07-07). Set `VITE_SENTRY_DSN` in the prod env to
      start capturing production errors (uncaught + ErrorBoundary crashes +
      `logger.error`). Optionally add sourcemap upload for readable stack
      traces. No DSN = silent no-op.
- [x] **Payment-anomaly alerting** — live: `ops-health-alert` deployed,
      `OPS_ALERT_EMAIL=hei@framio.no` set (2026-07-06), cron active in
      `cron.job` (daily 06:00, verified 2026-07-07). Emails you daily **only
      if** a money-state anomaly appears; `ops_health_check()` currently
      reports all zeros.

### Build (before or shortly after launch)

- [x] **Support / admin recovery runbook** — written (Stripe-based):
      [`support-admin-runbook.md`](./support-admin-runbook.md). Covers missing/stuck
      signups, refund reconciliation, issuing refunds/cancels, offline payments,
      account recovery + GDPR export, and health checks. (Recovery is still via edge
      functions / service-role SQL — there's no admin UI.)
- [x] **GDPR data export (mechanism built)** — support-run RPC: in the Supabase SQL
      editor (service_role), `select public.export_user_data('<auth-user-id>')`
      returns the subject's data as machine-readable JSON (account, profile, their
      own `buyer_id` bookings, seller memberships + business identity). Find the id
      via `auth.users` / `profiles` by email first. Fulfils the privacy page's
      30-day promise. *Remaining (optional): a self-service download button in
      account settings so users don't have to contact support.*
- [x] **Rename `DINTERO_CRON_SECRET` → `CRON_SECRET` / `cron_secret`** — done
      (zero-downtime): vault `cron_secret` created, crons repointed, functions read
      `CRON_SECRET` with a fallback to the legacy env name. *Final cleanup (optional):
      set a `CRON_SECRET` function secret, then drop the fallback + old
      `dintero_cron_secret` vault secret + old `DINTERO_CRON_SECRET` function secret.*
- [x] **Manual payment smoke test** — runbook executed 2026-07-06 against the
      live backend (prod Supabase + Stripe sandbox): Connect KYC onboarding,
      paid checkout + webhook mint, refund, cancel-course, free signup, course
      builder, Pro upgrade, rate limiting and crons all verified. Findings and
      fixes recorded in `PRELAUNCH.md` ("2026-07-06 launch smoke run").
      *Remaining: drop-in tier purchase untested live (no upcoming course has a
      drop-in tier); a human 4242 card click-through in the prod UI still needs
      the publishable key above.*
- [ ] **Payout overview — bank account last4 on rows** (2026-07-13) — the
      onboarded `PaymentsPage` overview (`PayoutStats`) is wired to the existing
      `get-stripe-settlements` function, but that payload has no bank last4, so
      payout rows show the date only. Extend `get-stripe-settlements` to
      `expand[]=data.destination` on the payout list and return `accountLast4`;
      `PayoutStats.PayoutRow.accountLast4` is already optional and will render
      "konto ••1234" once present. Needs a redeploy of the function.
- [ ] **Payout overview — accurate "Utbetalt i år"** (2026-07-13) — the same
      function fetches only the last 20 payouts, so the year-to-date figure in
      `derivePayoutStats` (`PaymentsPage.tsx`) undercounts for a seller on
      Stripe's *daily* payout schedule (~20 days of history). Compute YTD from
      balance-transactions or a date-filtered/paginated payout list instead.
      Not harmful pre-launch (test mode, no high-volume real payouts) but must
      land before real payouts flow. Needs a redeploy of the function.
- [ ] **Smoke-test the onboarded payout overview** (2026-07-13) — needs a
      Stripe-connected test seller with real test-mode payouts; verify the
      Nøkkeltall figures (øre→kr), the "Siste utbetalinger" list, the reused
      income chart, and the "Se kvitteringer … på Stripe" link all render with
      live data. Only the mock `/dev/payout-preview` has been visually verified.

## Accepted risks (no action planned)

- **F4.4 — deletion concurrency race.** A dormant studio could be anonymized while
  a new paid signup lands concurrently. Very low probability (the studio is
  dormant by definition; the delete guard locks owned seller rows). Accepted.
- **F4.5 — buyer self-delete with an upcoming paid booking.** A buyer can delete
  their account while holding a future paid booking; the studio retains the
  signup (participant name kept, contact PII redacted) to honour it, but the
  buyer loses account access. Product-acceptable.
- **F5.2 — `send-support-message` has no per-user rate limit.** It requires login
  and is self-identifying, so abuse is low-risk and traceable. Deferred unless
  abuse appears.
- **Public mutators fail open on rate limiting.** `create-stripe-connect-session` and
  `create-free-signup` allow the request if the limiter itself errors (an
  availability-over-strictness choice). Accepted.

## Supabase advisors & SECURITY DEFINER closeout (2026-06-07)

Ran the Supabase advisors + a full SECURITY DEFINER `search_path` sweep to close the
original brief's "run the advisors" step.

- **`search_path` sweep — clean.** All 38 SECURITY DEFINER functions in `public`
  have a pinned `search_path` (0 missing). `create_team_invite_link` was aligned to
  `pg_catalog, public`.
- **Advisor cleanup shipped:** `waitlist_rate_limit()` is a trigger function, not an
  RPC — `EXECUTE` revoked from `PUBLIC`/`anon`/`authenticated` (trigger firing
  unaffected; service_role retained). Advisor warning cleared.
- **Remaining advisor warnings are intentional / expected:**
  - *Public-executable SECURITY DEFINER* — the 5 storefront RPCs
    (`available_ticket_types`, `get_signup_by_stripe_id`, `lookup_team_invite_link`,
    `public_signup_counts`, `public_storefront_seller_ids`). Intentional public API,
    reviewed in Area #3.
  - *Authenticated-executable SECURITY DEFINER* — app RPCs (`set_user_role`,
    `rename_team_slug`, `redeem_team_invite_link`, `delete_course_cascade`,
    onboarding/seller helpers) that each enforce their own internal authz, **plus**
    the RLS helper functions (`is_seller_member/owner`, `is_team_admin`,
    `is_platform_admin`, `storage_can_write_*`) which **must** stay executable —
    they're called inside RLS policies; revoking would break RLS.
  - `rate_limit_buckets` RLS-enabled-no-policy (INFO) — intentional default-deny;
    only SECURITY DEFINER functions + service_role touch it.
  - Leaked-password protection disabled (WARN) — **now relevant** (was previously
    N/A when the app was passwordless). The auth rework reintroduced email + password
    sign-in, so enable it before launch — see the founder checklist above.
- **Performance advisors:** only INFO "unused index" notices (`notifications_*`,
  `idx_webhook_events_type`) — expected pre-launch with little data. Do not drop
  pre-launch.

## Notes for future work

- **Waitlist is intentionally closed.** `public.waitlist` anon/authenticated
  INSERT is revoked and the `WaitlistForm` is removed. If a waitlist is ever
  needed, build it as a server path (edge function / RPC) like the other public
  mutators — do **not** re-grant anon INSERT on the table.
- **`is_seller_owner()`** returns true for `owner` (the only role now). If a
  lesser studio role is ever reintroduced, re-audit its call sites — it would
  silently widen.
- **Narrowing `authenticated` on `courses`.** F3.2 only narrowed anon. The seller
  dashboard still uses broad `select('*')`; tightening authenticated to explicit
  columns is a larger, separate change.

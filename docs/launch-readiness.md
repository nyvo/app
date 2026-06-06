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
| Payments | Refund reconciliation against live Dintero status (no double-refund on retry); webhook signature replay-window test suite |
| Roles | Collapsed studio roles to a single `owner` role, enforced by a CHECK constraint; dropped dead `teacher` role from allowlists |
| Public storefront | CSPRNG invite codes (was ~32-bit md5); `status <> 'draft'` guards on `available_ticket_types` / `public_signup_counts` (F3.1, F3.3); dropped anon read of `courses.idempotency_key` (F3.2) |
| Customer data | Least-privilege `profiles` UPDATE grant — closes platform-admin self-escalation (F4.1); redact buyer contact PII + clear seller logo on account deletion (F4.2, F4.3) |
| Edge functions | Generic client error messages, detail logged server-side (F5.1) |
| Waitlist | Anon/authenticated INSERT revoked as an unused write surface (F3.4); dead `WaitlistForm` removed from the landing |

## Founder checklist (do before / at launch)

- [ ] **DMARC** — add a DMARC record for `mail.openspot.no`. SPF + DKIM are already
      effective (Resend sends are landing); DMARC is the remaining deliverability
      hardening.
- [ ] **Supabase PITR / backups** — confirm point-in-time recovery is enabled on
      the current plan. Migrations are forward-only, so app-level rollback =
      forward migration + redeploy of the prior function version.
- [ ] **Failure alerting / cron health** — no alerting exists today. The 7 pg_cron
      jobs self-heal (e.g. `sweep-pending-payments` every 2 min recovers orphaned
      payments), but nothing alerts if a cron stops firing or payments fail
      repeatedly. Copy-pasteable checks are in
      [`ops-health-checks.md`](./ops-health-checks.md); run them on a cadence (or
      wrap the dashboard query in a tiny daily cron that emails on non-zero).
- [ ] **Support / admin recovery runbook** — `is_platform_admin` can read all
      profiles, but there is no admin UI; recovery is via the edge functions or
      direct service-role SQL. Procedures are in
      [`support-admin-runbook.md`](./support-admin-runbook.md).
- [ ] **GDPR data export** — the privacy page promises a copy within 30 days, but
      there is no export function. Handle as a manual support process; the export
      query shapes are in [`support-admin-runbook.md`](./support-admin-runbook.md)
      §5. Build an RPC if volume grows.
- [ ] **Launch cutover** — when `VITE_PRELAUNCH` flips to `false`, confirm `/auth`
      is reachable and the landing CTAs (`Kom i gang` → `/auth`) work.

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
- **Public mutators fail open on rate limiting.** `create-dintero-session` and
  `create-free-signup` allow the request if the limiter itself errors (an
  availability-over-strictness choice). Accepted.

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

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

## Founder checklist (do before / at launch)

- [ ] **DMARC** — add a DMARC record for `mail.openspot.no`. SPF + DKIM are already
      effective (Resend sends are landing); DMARC is the remaining deliverability
      hardening.
- [ ] **Supabase PITR / backups** — confirm point-in-time recovery is enabled on
      the current plan. Migrations are forward-only, so app-level rollback =
      forward migration + redeploy of the prior function version.
- [ ] **Failure alerting / cron health** — no alerting exists today. The pg_cron
      jobs self-heal (e.g. `sweep-pending-payments` every 2 min recovers orphaned
      payments), but nothing alerts if a cron stops firing or payments fail
      repeatedly. Add a health-check query run on a cadence (or wrap it in a tiny
      daily cron that emails on non-zero). *(The old ops-health-checks runbook was
      Dintero-specific and has been removed; rewrite the checks against the Stripe
      schema before relying on them.)*
- [ ] **Support / admin recovery runbook** — `is_platform_admin` can read all
      profiles, but there is no admin UI; recovery is via the edge functions or
      direct service-role SQL. *(The old support-admin runbook was Dintero-specific
      and has been removed; write a Stripe-based one before launch.)*
- [ ] **GDPR data export** — the privacy page promises a copy within 30 days, but
      there is no export function. Handle as a manual support process; build an RPC
      if volume grows.
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
  - Leaked-password protection disabled (WARN) — **N/A**, the app is passwordless
    (Google OAuth + passkeys). Optional dashboard toggle.
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

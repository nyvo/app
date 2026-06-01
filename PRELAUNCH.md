# Pre-launch TODO

Deferred items from the 2026-05-19 DB audit. Everything in this list is
non-blocking — the live DB is materially hardened. Order is rough priority,
not strict dependency.

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

- **Capture-amount defense-in-depth** — `finalize-dintero-transaction` captures
  `transaction.amount` from Dintero without asserting it equals the expected
  `payment_attempt` total. Low risk: the amount was set by our own
  `create-dintero-session` and the customer can't alter it in the embedded flow.
  Optional hardening, not a blocker.
- **Rate limiting** on `create-free-signup` and the email functions — a spam
  vector, but negligible at soft-launch volume. Add if abuse appears.

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

The public booking + payment flow has zero automated tests and Dintero is new
(April 2026). Run these by hand against sandbox/live before opening signups:

1. **Full paid booking on a real phone** — browse → course detail → checkout →
   fill form → Dintero embed → success page → confirmation email arrives.
   Watch the checkout layout on a 390px-wide screen.
2. **Free signup** — separate path (`window.location` redirect); confirm success
   page + email.
3. **Webhook-down → sweep recovery** (most important): start a paid checkout,
   authorize, then **close the tab before the redirect**. Wait ~3 min for the
   `sweep-pending-payments` cron. Confirm the signup appears `confirmed` with the
   correct `amount_paid`, and the Dintero transaction is captured exactly once.
4. **Seller-onboarding gate** — an un-approved seller must NOT be able to take
   payment (checkout button blocked).
5. **Refund / cancel-course as owner** — confirm the buyer is actually refunded
   in the Dintero backoffice, not just marked refunded in the DB.
6. **Teacher onboarding incl. a taken studio slug** — the error path must leave
   the user able to recover, not stuck.

Defer the automated Dintero e2e test to post-launch — sandbox e2e is flaky and
wouldn't cover the real webhook/capture/refund money movement anyway.

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

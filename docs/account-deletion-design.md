# Account deletion, studio closure & privacy erasure — design

> Status: **design + step-2 backstop built behind the existing 409.** Self-service
> account deletion stays **disabled** (`delete-account` returns 409) until step 3
> is built and tested. This doc is the source of truth for the work.

## Why three workflows, not one

Conflating these three operations produced a dangerously complex flow. They have
different actors, triggers, and legal bases, and must stay separate:

1. **Account deletion** — a person removes their *login + profile*. Must **never**
   delete or alter business content (sellers, courses, signups, payments, audit
   records) — *except* clearing the deleted profile's own references and
   memberships (`courses.instructor_id`, `team_affiliations.invited_by`,
   `signups.buyer_id` → NULL; `seller_members` rows removed).
2. **Studio closure** — a *business* winds down (stop sales, resolve courses /
   refunds / payouts / Stripe obligations, transfer or close). Separate action under
   studio settings; support-assisted initially.
3. **Privacy erasure (GDPR)** — a verified data-subject request over participant /
   guest PII. Handled with independent identity verification and a field-level
   retention matrix.

### Legal framing
Erasure is **not absolute**: where a legal retention duty applies, keep the
*minimum necessary* for *that purpose* and erase the rest. Norwegian guidance
distinguishes **primary** accounting documentation (≈5 yr) from **secondary**
(≈3.5 yr) — so retention is a **field-level matrix**, not a blanket 5-year hold.
Sources: Datatilsynet (right to erasure; deletion duties), Altinn (accounting
retention).

## Verified schema facts (prod, 2026-06-04)

| Fact | Implication |
|------|-------------|
| `profiles.id → auth.users` **CASCADE** | A `BEFORE DELETE` trigger on `profiles` is an atomic backstop — it aborts even a direct `auth.admin.deleteUser()`. |
| `signups.buyer_id → profiles` **SET NULL** | Paid bookings survive a profile delete untouched. Do **not** alter `participant_*`. |
| `courses.instructor_id` nullable, FK **NO ACTION** | Change FK → `SET NULL` (clears the link on completed courses). |
| `team_affiliations.invited_by` **NOT NULL**, FK **NO ACTION** | Make nullable, FK → `SET NULL`. |
| `seller_members.user_id → profiles` **CASCADE** | Membership auto-removed on profile delete — fine. |
| Every FK into `sellers` is **CASCADE** | Deleting a seller destroys financial + audit records → account deletion must never delete a seller. |
| **4 of 5** prod studios are sole-owned | "Sole owner" is the *normal* blocker, not an edge case → ownership transfer (step 4) is the real unlock. |
| `courses.instructor_name` is a denormalized snapshot | `SET NULL` on the id leaves the name publicly rendered → active-instructor assignment is a hard **blocker**, not an auto-clear. |
| `storage.objects` has `owner` (uuid) **and** `owner_id` (text); buckets `course-images`, `seller-logos` | These are **business assets** → blocker reassigns, never deletes. Auth deletion can fail while the user owns objects. |

### PII inventory (must all be covered by the erasure workflow)
`profiles` (name/email/phone) · `signups.participant_*` · `payment_attempts.participant_*`
· `sellers` (name/email/phone) · `teacher_locations` (name/address) ·
`courses.instructor_name` · `teams.name` · `waitlist.email` ·
**`notifications.body`** (snapshots `buyerName`, `_shared/notifications.ts`).

## ① Account deletion

Removes login + profile only. The DB is the authority; the frontend is thin.

- **Single source of truth for blockers:** private `_account_deletion_blockers(uuid)`
  (SECURITY DEFINER). Both the guard and the preflight call it, so they can't drift.
- **`BEFORE DELETE` guard on `profiles`** (SECURITY DEFINER): locks every seller the
  profile owns (`ORDER BY id FOR UPDATE`) **before** counting owners — serializes
  concurrent co-owner deletes — then refuses if any blocker is present.
- **Public no-arg `account_deletion_preflight()`** using `auth.uid()` only (granted to
  `authenticated`; the arg-taking helper is internal). No cross-user inspection.
- **Blockers:** (a) sole owner of a seller; (b) assigned instructor on a course that
  still runs today or later — derived from non-cancelled `course_sessions` (max
  session day ≥ today); when no live sessions exist it falls back exactly as the app
  does — `start_date`/`end_date` (clamped) when `start_date` is set, otherwise the
  persisted status. Completed courses don't block; an active/upcoming course with no
  usable dates **does** block, on its persisted status. (c) owns Storage objects.
- **FK fixes:** `instructor_id → SET NULL`, `invited_by` nullable + `SET NULL`. Keep
  `buyer_id → SET NULL`. **Do not touch** `participant_*` or notification snapshots.
- **Audit:** intentionally **deferred**, not in step 2. A per-deletion row keyed on
  the (pseudonymous) profile id is itself retained personal data, so it needs an
  explicit legal purpose, a retention deadline, and a cleanup job before it exists.
  When built, it must be an `AFTER DELETE ON profiles` trigger (commits atomically
  with the cascade) — never a "completed" row written from the Edge Function before
  Auth deletion, which risks a false completion record.
- **Step 3 (edge + frontend):** server-enforced **recent authentication** via the
  verified JWT's latest `amr` timestamp (Google + magic-link → a password prompt is
  not sufficient); Storage reassignment; `auth.admin.deleteUser()`; clear session;
  progressive-disclosure UI. Note: the Edge RPC and the Auth API **cannot** share a
  transaction — the `profiles` guard is what makes the outcome atomic.

## ② Studio closure (separate; support-assisted first)
Stop new sales → delist storefront → resolve active courses, refunds, payouts,
Stripe obligations → transfer ownership or mark seller closed → retain only legally
necessary records → purge only after an explicit `retain_until` date. **Never bypass
triggers** during purge — encode the retention clock into the trigger predicate
instead of `session_replication_role = replica`.

## ③ Privacy erasure (separate)
Verify the requester independently. **Never** infer ownership of bookings/payments
from a matching email (a buyer may book for someone else; guest emails aren't an
identity link). Field-level retention matrix. Long term: separate immutable
accounting documents from operational booking/contact PII.

## Delivery order
1. Retention matrix with accountant/DPO *(gates ②/③, not ①)*.
2. **Step 2 — DB backstop (this migration):** FK fixes + TS types, blocker helper,
   no-arg preflight, `profiles` guard with seller locking. Behind 409. (Auditing
   deferred until it has an explicit purpose + retention + cleanup.)
3. Re-enable self-service deletion **only for eligible accounts** (recent-auth,
   Storage reassignment, Auth deletion, frontend).
4. Ownership transfer *(unlocks the 4 sole owners)*.
5. Support-assisted studio closure + tombstoning.
6. Verified erasure + scheduled, trigger-respecting retention cleanup.

Keep the 409 until 2–3 are fully tested (rollback tests **and** a real two-session
concurrency test on the co-owner race).

## Frontend (step 3)
Progressive disclosure from the preflight result:
- Eligible → *"Innloggingen og profilen din slettes permanent. Betalingsdokumentasjon
  vi må oppbevare, beholdes begrenset til dette formålet."* + recent-auth + `SLETT`.
- Blocked → *"Du er eneste eier av Studio X. Overfør eierskapet eller kontakt support
  før kontoen kan slettes."* + the direct action; **no** type-to-confirm.

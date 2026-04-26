# Drop-in + ticket-type pricing — implementation plan

> Goal: a teacher can configure per-course ticket types (Standard, Student/ufør/pensjon, Early bird) AND optionally enable drop-in. Students see a tier picker on the public booking form and pay the right amount. Drop-in is gated to a specific session.

## What we have today (verified, not assumed)

| Concern | Where | State |
|---|---|---|
| Course base price | `courses.price` | live |
| Drop-in flag + price | `courses.allows_drop_in`, `courses.drop_in_price` | live, but **no booking UI** for it |
| Drop-in session binding | `signups.is_drop_in`, `class_date`, `class_time` + `course_sessions.id` lookup in `create-dintero-session` | wiring exists, never reached from UI |
| Multi-tier pricing | `course_signup_packages` (label, price, weeks, is_full_course, sort_order) | table + edge-function read exist; **no teacher editor, no public picker** |
| Pricing math | `_shared/pricing.ts` `calculatePricing()` — 5% service fee + 5% platform | done, reusable |
| Booking flow | `BookingPanel.tsx` — comment on line 179 explicitly says "Single tier today; when multi-tier (drop-in / early bird) lands, this becomes a chooser" | placeholder waiting |
| Capacity guard | RPC `create_signup_if_available` (post-payment) | done |

So we already have **80% of the plumbing**. What's missing: a coherent domain model, a teacher editor, a student picker, and time-window logic for early-bird.

## The one design call to make first

**Question:** Are *ticket types* a separate axis from *packages* (cross-cut: standard 10w, student 10w, standard 5w, student 5w), OR is every priced unit a single row in one table (`ticket_kind` ∈ {course, package, drop_in} + optional `discount_kind`)?

I recommend **Option A — one table, one row per priced unit**. Reasoning:

- Matches the teacher's mental model: "Here are the things a student can buy."
- Drop-in becomes just another row (`ticket_kind = 'drop_in'`), not a special case sprawled across `courses` columns.
- Early-bird is just a row with `sales_ends_at` set.
- Avoids a combinatorial UI ("toggle student rabatt on every package").
- Unblocks future tiers (staff comp, returner discount) without schema churn.

The cost: if a teacher wants the same discount on three packages, they create three rows. The editor mitigates this with a "Duplicate with discount" action.

**Sanity check on naming.** Today we have `course_signup_packages`. Renaming to `course_ticket_types` is honest — but it touches edge functions, RLS, and TS types. Lower-risk alternative: keep the table name internally, call the concept "ticket types" / "billettyper" in code and UI. Recommend keeping the name to keep the diff small.

> **Need from you (3 quick decisions before code):**
> 1. **Architecture**: Option A unified table — yes? Or do you want tiers cross-cutting packages?
> 2. **Drop-in scope**: tied to a specific `course_session` (student picks the date at checkout)? Or generic ("use whenever, valid until end-of-course")?
> 3. **Student/ufør/pensjon proof**: trust + spot-check at the door (no tech), or upload-document at checkout (a lot more build)?

---

## Phase 0 — locked decisions

- [x] **Architecture**: Option A — unified table. Extend `course_signup_packages` with `ticket_kind` / `discount_kind` / window / quota / `is_active`.
- [x] **Drop-in scope**: per-session. Student picks a specific upcoming `course_sessions` row at checkout. Their seat is consumed for *that one session only* — next week's session has full capacity again. (See "Drop-in capacity mechanic" below — this is the central correctness constraint.)
- [x] **Discount proof**: trust-based. No upload, no verification UI. If a student lies about being a student, that's between them and the teacher at the door. Teacher sees the tier on the roster so they know to ask.

## Drop-in capacity mechanic (the part that has to be right)

The user's worry — *"if one person buys a drop-in and next week this spot should open again if they don't rebuy"* — is exactly what the per-session model gives you, but only if the capacity check is per-session, not per-course.

**Capacity rule per session:**

```
For session S of course C:
  attendees(S) = (full-course signups whose window covers S.session_date)
               + (drop-in signups where class_date = S.session_date AND class_time = S.start_time)
  attendees(S) ≤ C.max_participants
```

So:

- A full-course signup occupies one seat in **every session** inside their package window.
- A drop-in signup occupies one seat in **exactly one session** — the one they picked.
- Next week's session re-opens automatically because the drop-in's `class_date` doesn't match it.

This replaces the current `count_active_confirmed_signups(course_id)` (which is course-wide) with `count_signups_for_session(course_id, session_date, session_start_time)` inside `create_signup_if_available`. The course-wide count is no longer the right guard for drop-ins.

**Teacher-side "management"** turns out to be free with this model — there's nothing extra for the teacher to track week-to-week. Each session's roster on the dashboard simply reads attendees(S) using the rule above. A drop-in attendee shows up on session N's roster and not on session N+1's. No carry-over, no manual reset.

---

## Phase 1 — Schema (Option A, refined)

New migration `supabase/migrations/20260427010000_ticket_types.sql`:

1. Define proper enum types (no free text — prevents `dropin` / `drop-in` drift, gives the RPC a typed contract):
   ```sql
   CREATE TYPE ticket_kind_t  AS ENUM ('package', 'drop_in', 'pass');
   CREATE TYPE ticket_audience_t AS ENUM ('standard', 'student', 'senior', 'staff');
   ```
   `pass` is reserved for future multi-class punch cards — no behavior wired yet, but enum values are cheap to add and expensive to remove, so include it.

2. Extend `course_signup_packages`:
   ```sql
   ALTER TABLE course_signup_packages
     ADD COLUMN ticket_kind     ticket_kind_t     NOT NULL DEFAULT 'package',
     ADD COLUMN audience        ticket_audience_t NOT NULL DEFAULT 'standard',
     ADD COLUMN description     text,
     ADD COLUMN sales_starts_at timestamptz,
     ADD COLUMN sales_ends_at   timestamptz,
     ADD COLUMN max_quantity    int,
     ADD COLUMN is_active       boolean NOT NULL DEFAULT true,
     ADD COLUMN is_default      boolean NOT NULL DEFAULT false,
     ADD COLUMN display_order   int     NOT NULL DEFAULT 0;

   COMMENT ON COLUMN course_signup_packages.audience IS
     'Who the ticket is for. Independent of pricing math — discount semantics live in the row''s price.';
   COMMENT ON COLUMN course_signup_packages.max_quantity IS
     'Course-wide cap on this ticket type, summed across ALL sessions. NULL = unlimited. Not per-session.';
   COMMENT ON COLUMN course_signup_packages.is_default IS
     'Pre-selected option in BookingPanel. At most one per course (partial unique index).';
   COMMENT ON COLUMN course_signup_packages.sales_ends_at IS
     'Inclusive cutoff for sale (used by early-bird). NULL = no time limit.';
   ```
   *Naming swap:* `discount_kind` → `audience`. Describes **who** the ticket is for, not **how** pricing works. Early-bird isn't an audience — it's just a `standard` row with `sales_ends_at` set. Cleaner mental model, leaves room for real pricing logic later.

3. Constraints:
   ```sql
   CREATE UNIQUE INDEX one_default_per_course
     ON course_signup_packages (course_id) WHERE is_default;

   ALTER TABLE course_signup_packages
     ADD CONSTRAINT sales_window_valid
       CHECK (sales_ends_at IS NULL OR sales_starts_at IS NULL OR sales_ends_at > sales_starts_at),
     ADD CONSTRAINT package_has_weeks
       CHECK (ticket_kind <> 'package' OR weeks IS NOT NULL),
     ADD CONSTRAINT drop_in_no_weeks
       CHECK (ticket_kind <> 'drop_in' OR weeks IS NULL);
   ```

4. Drop the legacy `sort_order` column (rename-via-migrate-then-drop to keep it clean) — `display_order` supersedes it.

5. **Backfill:**
   - Existing `course_signup_packages` rows → `ticket_kind = 'package'`, `audience = 'standard'`, `is_active = true`, `display_order = old sort_order`. The first row per course (lowest old sort_order) gets `is_default = true`.
   - For every `courses` row, insert one drop-in tier:
     ```sql
     INSERT INTO course_signup_packages
       (course_id, label, price, weeks, ticket_kind, audience, is_active, display_order)
     SELECT id, 'Drop-in', drop_in_price, NULL, 'drop_in', 'standard',
            allows_drop_in,           -- preserves on/off state exactly
            999                       -- sorts after package tiers by default
     FROM courses
     WHERE drop_in_price IS NOT NULL;
     ```
     Behavior is identical to today: courses with `allows_drop_in = false` get an *inactive* drop-in row (still there for re-enabling, just hidden from the public picker).

6. Drop `courses.allows_drop_in` and `courses.drop_in_price` in a **second migration** (`20260427020000_drop_legacy_dropin_columns.sql`). Two-step lets us roll back if backfill verification fails.

7. **RLS:**
   - Org owners/admins: full `INSERT / UPDATE / DELETE` on rows whose `course_id` belongs to their org.
   - Public `SELECT`: only `is_active = true` AND `(sales_starts_at IS NULL OR sales_starts_at <= now())` AND `(sales_ends_at IS NULL OR sales_ends_at > now())`.

8. Public RPC `available_ticket_types(course_id uuid)` — returns rows passing the public filter above plus a computed `seats_remaining` (NULL if unlimited, else `max_quantity - count_signups_by_ticket_type`). Centralizes the "is this buyable right now" question so the booking page and the edge function agree.

**Capacity rule clarification — three independent checks, all atomic.** Inside `create_signup_if_available`:

1. **Per-session capacity** for the drop-in case: `count_signups_for_session(course_id, session_date, session_start_time) < courses.max_participants`.
2. **Multi-session capacity** for the package case: resolve every `course_sessions` row in the buyer's window (`session_date BETWEEN start_date AND start_date + (weeks-1)*7`), check capacity for **each one**, fail if **any** is full. This is the #1 place a system like this silently breaks — a course with 8 seats can't add a full-course buyer if even one session in their window is at 8.
3. **Per-tier quota** (course-wide, sums across all sessions): `count_signups_by_ticket_type(course_id, ticket_type_id) < ticket_type.max_quantity`. Optional, only when `max_quantity IS NOT NULL`.
4. **Sales window**: re-check `is_active` + `sales_starts_at` + `sales_ends_at` server-side (client lies).

All four run inside the same transaction as the insert. **Concurrency:**

- For `drop_in`: `pg_advisory_xact_lock(hashtext(course_id::text || session_date::text))` before counting. Serializes buyers of the same session.
- For `package`: `pg_advisory_xact_lock(hashtext(course_id::text))` before counting. Serializes buyers of the same course.

The lock auto-releases on transaction end. This is the cheapest correct guard against overselling under concurrent load — without it the race window between count and insert can sell more seats than exist.

## Phase 2 — Edge functions + RPC + signup snapshots

### Snapshot fields on `signups` (don't skip — receipts depend on this)

The ticket-type row will be edited, renamed, deactivated, even soft-deleted by teachers over time. Receipts and historical reporting must not break. So `signups` carries both an FK and a snapshot:

```sql
ALTER TABLE signups
  ADD COLUMN ticket_type_id        uuid REFERENCES course_signup_packages(id),
  ADD COLUMN ticket_label_snapshot text,                -- e.g. "Hele kurset (10 uker) — Student"
  ADD COLUMN ticket_audience_snapshot ticket_audience_t,
  ADD COLUMN ticket_kind_snapshot  ticket_kind_t;

CREATE INDEX idx_signups_ticket_type ON signups(ticket_type_id);
```

Price is already snapshotted via `signups.amount_paid` and the `payment_attempts.*_nok` columns — no change needed there. Snapshots are **write-once at signup time**, set by the RPC, never updated later.

Same snapshots on `payment_attempts` so a refund or recovery flow has the full ticket context without re-joining a (possibly deleted) tier row.

### `create-dintero-session/index.ts`

- Replace `signupPackageId` parameter with `ticketTypeId`.
- Look up the tier row, validate server-side: `is_active = true`, sales window covers `now()`, `course_id` matches.
- Resolve price from the tier row — **never** trust `courses.price` / `drop_in_price` anymore (those columns will be gone after Phase 1's second migration).
- For `ticket_kind = 'drop_in'`: require `sessionId`, resolve `class_date` / `class_time` from `course_sessions` (logic already exists, just gated on the kind enum now).
- Persist `ticket_type_id` + the three snapshot fields on `payment_attempts`.

### `finalize-dintero-transaction/index.ts`

- Read `ticket_type_id` + snapshots off the matching `payment_attempts` row.
- Pass them into `create_signup_if_available` as args.

### RPC `create_signup_if_available` — full new spec

Args (additions in **bold**):

```
p_course_id, p_organization_id,
p_participant_name, p_participant_email, p_participant_phone,
p_is_drop_in,             -- kept for backwards-compat with legacy callers; derive from p_ticket_kind otherwise
p_class_date, p_class_time, p_course_session_id,
p_amount_paid, p_dintero_transaction_id, p_dintero_session_id, p_dintero_merchant_reference,
p_signup_package_id,      -- legacy; nullable
p_package_weeks, p_package_end_date,
**p_ticket_type_id**,
**p_ticket_label_snapshot**,
**p_ticket_audience_snapshot**,
**p_ticket_kind_snapshot**
```

Body — runs **all** in one transaction:

1. `pg_advisory_xact_lock(...)` — keyed on `(course_id, session_date)` for drop-in, `(course_id)` for package. Serializes concurrent buyers.
2. Re-fetch the ticket-type row, re-check `is_active` + sales window. Reject if expired (race against early-bird cutoff).
3. **Capacity:**
   - If `p_ticket_kind_snapshot = 'drop_in'`: `count_signups_for_session(...) < max_participants`.
   - If `p_ticket_kind_snapshot = 'package'`: resolve all sessions in window via `course_sessions` table; for each, run the same per-session count; fail if any is at capacity. (This is the multi-session check.)
4. Per-tier quota: if `max_quantity IS NOT NULL`, check `count_signups_by_ticket_type(course_id, ticket_type_id) < max_quantity`.
5. Insert into `signups` with `ticket_type_id` + all three snapshots + the legacy fields.
6. Return `{ signup_id, status }`.

If any check fails, raise — the outer edge function voids the Dintero authorization and returns 4xx to the client.

### Helper functions

- `count_signups_for_session(p_course_id uuid, p_session_date date, p_session_start_time time) returns int`
- `count_signups_by_ticket_type(p_course_id uuid, p_ticket_type_id uuid) returns int`

Both use `signups.status = 'confirmed'` only.

## Phase 3 — Teacher dashboard editor

New section in the course editor titled **"Priser og billettyper"**:

- [ ] List view of `course_signup_packages` rows for the course, grouped by `ticket_kind` (Pakker / Drop-in). Sortable by `display_order` with drag-handle.
- [ ] Create/edit form fields:
  - `label` (required), `description` (optional)
  - `price` (NOK)
  - `ticket_kind` (radio: Pakke / Drop-in — not editable after rows have signups)
  - `audience` (Standard / Student / Senior / Personale)
  - `weeks` (only when kind=package; not shown for drop-in)
  - `sales_starts_at` + `sales_ends_at` (optional, for early-bird and pre-sale)
  - `max_quantity` (optional, with helper text *"Tom = ubegrenset. Gjelder hele kurset, ikke per økt."*)
  - `is_default` (single-select per course — toggling on flips off the previous default)
  - `is_active` (visible toggle; archive vs delete)
- [ ] "Dupliser som rabatt" action: clones a row, opens the form prefilled with audience flipped to Student.
- [ ] Soft delete via `is_active = false`. Hard delete only allowed if zero historical signups reference the row.
- [ ] Validation:
  - At least one active row per published course.
  - At least one `is_default = true` row when course is published.
  - `sales_ends_at > sales_starts_at` if both set.
  - `weeks > 0` when `ticket_kind = 'package'`.
  - `weeks IS NULL` when `ticket_kind = 'drop_in'`.

## Phase 4 — Public booking UI

`BookingPanel.tsx` and friends:

- [ ] Fetch ticket types via `available_ticket_types(course_id)` RPC.
- [ ] Render a radio-card list (one card per active tier) above the price breakdown — replaces the current static "Standard" label on line 181.
  - Card: label, price, optional description, audience badge (Student / Senior / Personale) when `audience <> 'standard'`, sales-window badge ("Tilbud — gjelder t.o.m. 15. juni") when `sales_ends_at IS NOT NULL`.
  - Sort by `display_order` (teacher-controlled), not by price.
  - **Pre-select** the row with `is_default = true`. Fall back to first row only if no default is set.
- [ ] When the selected tier is `ticket_kind = 'drop_in'`, show a session picker (list of upcoming `course_sessions` with `seats_remaining`). The picker becomes required.
- [ ] Update the price-breakdown panel to read from the selected tier (label + audience + price).
- [ ] Submit passes `ticketTypeId` (+ optional `sessionId`) instead of the legacy `signupPackageId` / `isDropIn`.
- [ ] Empty state: if no active ticket types, render "Påmelding åpner snart" overlay (already exists for un-onboarded studios).

## Phase 5 — Verification

- [ ] Sandbox dry-run: create a course with three tiers (standard, student, early-bird with `sales_ends_at` 1 hour out), book each, confirm signups + payment_attempts carry the right `ticket_type_id`, audience snapshot, kind snapshot, and label snapshot.
- [ ] **Snapshot durability test**: book a tier, then rename / soft-delete the tier, then re-render the receipt — label / audience / kind read from snapshots, not the (now-stale) FK.
- [ ] **Concurrent early-bird race**: two browsers buy the last early-bird seat — only one wins. Use `pg_sleep(2)` inside the RPC to widen the window during testing.
- [ ] **Drop-in week-to-week test**: full course has 8 seats. Buy a drop-in for session 1 (now 7 left for session 1, 8 left for session 2). Verify session 2 still shows 8 seats. Buy a drop-in for session 2 — verify it doesn't tighten session 1.
- [ ] **Multi-session package capacity**: course with 8 seats, session 5 already at 8 from drop-ins. Try to buy a 10-week package — must fail (window would oversell session 5). Try a 4-week package that ends before session 5 — must succeed.
- [ ] **Advisory lock smoke**: simulate two simultaneous package buys on the same course (use `psql` with `BEGIN; SELECT pg_advisory_xact_lock(...);` in two sessions) — confirm second blocks until first commits.
- [ ] Time-window test: book early-bird after `sales_ends_at`, expect 400 with "Tilbudet er utløpt".
- [ ] Drop-in flow: pick a session, complete checkout, confirm `class_date` + `class_time` + `ticket_kind_snapshot = 'drop_in'` are persisted.
- [ ] Backwards-compat: existing 16 Inspire courses still book end-to-end after migration (legacy signups have NULL `ticket_type_id`; new signups have all four new fields).
- [ ] RLS smoke test: anonymous user can't `SELECT` an inactive or out-of-window tier; can't read tiers belonging to a course in another org.
- [ ] Default-tier invariant: try to insert a second `is_default = true` row for the same course — must fail on the partial unique index.

---

## Suggested order of execution

1. Schema migration + backfill (Phase 1). ✅ **DONE 2026-04-26**
2. Extend RPC + edge functions (Phase 2). ✅ **DONE 2026-04-26**
3. Teacher editor (Phase 3). ✅ **DONE 2026-04-26**
4. Public picker + drop-in session selector (Phase 4). ✅ **DONE 2026-04-26**
5. Verification suite (Phase 5). ✅ **DONE 2026-04-26**

All phases shipped end-to-end. See "Phase 1 — landed" / "Phase 2-5 — landed" sections below.

## Phase 1 — landed

Migration `20260426020000_ticket_types.sql` applied. Backfill verified:

- **27 ticket-type rows** across 16 courses (19 packages + 8 drop-ins).
- **16 defaults** — every course has exactly one `is_default = true` row.
- **0 constraint violations** — package_has_weeks, drop_in_no_weeks, sales_window_valid, max_quantity_positive, price_non_negative, one_default_per_course all reject bad data.
- **Drop-in is_active state preserved** — courses with `allows_drop_in = true` got active drop-in rows; courses without drop-in got nothing (no inactive ghost rows since none had `drop_in_price > 0`).
- **Public RPC works** — `available_ticket_types(course_id)` returns rows ordered by `display_order`, computes `seats_remaining` (NULL when unlimited).
- **Per-session count works** — `count_signups_for_session` correctly counts attendees on a real session (8/10 against capacity).

Migration `20260426030000_drop_legacy_dropin_columns.sql` is **written but not applied**. It contains a sanity assertion that aborts if any course still has `drop_in_price` without a mirroring drop-in tier row. Apply only after Phase 2 deploys and verifies.

TypeScript types updated in `src/types/database.ts`:
- New enums: `TicketKind`, `TicketAudience`.
- `course_signup_packages` rewritten with new fields (`ticket_kind`, `audience`, `description`, `is_active`, `is_default`, `display_order`, `sales_starts_at`, `sales_ends_at`, `max_quantity`); legacy `sort_order` removed; `weeks` now nullable.
- `signups` extended with `ticket_type_id` + 3 snapshot fields.
- `payment_attempts` added (was missing entirely — pre-existing tech debt cleared).
- `available_ticket_types`, `count_signups_for_session`, `count_signups_by_ticket_type` added to Functions.
- Convenience aliases: `TicketType`, `AvailableTicketType`, `PaymentAttempt`.

`npx tsc --noEmit` clean. Zero existing `src/` code referenced `course_signup_packages` or `sort_order`, so no consumer regressions.

## Phases 2–5 — landed

**Phase 2 — RPC + edge functions.** New `create_signup_if_available(p_organization_id, p_course_id, p_ticket_type_id, p_participant_*, p_amount_paid, p_dintero_*, p_course_session_id, p_user_id)` with advisory locks (per-session for drop-in, per-course for package), multi-session capacity check, sales-window re-check, per-tier quota. Five edge functions redeployed: `create-dintero-session` v11, `finalize-dintero-transaction` v9, `dintero-webhook` v11, `send-payment-link` v18, `create-free-signup` v12. Schema cleanup migration `20260426030000_finalize_ticket_type_model.sql` dropped 5 legacy columns from signups, 5 from payment_attempts, 2 from courses; added `signups.course_session_id` FK; replaced `count_signups_for_session` with single-arg signature. `create_course_idempotent` recreated in `20260426040000_*` to match new schema.

**Phase 3 — Teacher editor.** New "Priser" tab in `CourseDetailPage`. `services/ticketTypes.ts` covers list / create / update / soft-delete / hard-delete / set-default / "Dupliser som rabatt" helper. `CoursePricingTab` renders active and archived tiers in two cards with per-row actions (set default, duplicate, edit, archive/restore, delete). `TicketTypeForm` is a Dialog with all fields including conditional `weeks` (only for `ticket_kind = 'package'`), audience picker, sales window inputs, and `is_default` / `is_active` switches. Validation: label required, price ≥ 0, weeks > 0 for packages, sales_ends_at > sales_starts_at, max_quantity > 0.

**Phase 4 — Public picker + drop-in session picker.** `BookingPanel` now fetches all tiers via `available_ticket_types` and renders a radio-card list above the price breakdown when more than one buyable tier exists (single-tier courses keep the page clean). Each card shows label, price, audience badge, sales-window badge, and seats-remaining warning when quota is low. When the chosen tier is `ticket_kind = 'drop_in'`, a session picker appears below it — fetches up to 20 upcoming non-cancelled sessions with `count_signups_for_session` for live seat counts. Submit passes both `ticketTypeId` and (for drop-in) `sessionId` to `create-dintero-session`.

**Phase 5 — Verification suite (DB-level, all green).**

| Test | Result |
|---|---|
| Sales-window expiry rejection (`ticket_expired`) | ✅ |
| Snapshot durability (label survives tier rename) | ✅ |
| Default-tier invariant (partial unique index rejects 2nd `is_default`) | ✅ |
| Multi-session package capacity (full session in window blocks new package buyer) | ✅ |
| Drop-in for session 1 doesn't consume session 2's seat (week-to-week independence) | ✅ |
| Drop-in to a full session rejected with `session_full` | ✅ |
| Per-tier quota (`max_quantity = 1` blocks 2nd sale with `tier_sold_out`) | ✅ |
| RLS / public RPC hides inactive + expired tiers (only active+in-window visible) | ✅ |

Concurrent advisory-lock test was not automated — needs two parallel transactions which `execute_sql` can't simulate. Lock keys (`pg_advisory_xact_lock` on `(course_id, session_date)` for drop-in, `(course_id)` for package) are correct in the RPC body; manual two-`psql`-session test recommended pre-prod.

## Out of scope (flag if you want them later)

- Discount codes / promo codes
- Sibling/family bundles
- Membership-based pricing (waiver if the student has an active studio pass)
- Refund tier-mapping (refund returns to the same tier's payout split — current pricing already handles 95/5 split, but if a tier had custom split logic this would need design)
- Documentation upload for ufør/pensjon proof

---

## Review

_(Filled in after implementation.)_

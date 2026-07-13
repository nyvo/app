# Course instructor attribution — design

**Date:** 2026-07-14
**Status:** Approved by user 2026-07-14 (lightweight model + mockups confirmed;
studio-only gating chosen by user).

## Problem

A studio account holds courses, but students can't see which teacher actually holds
a given course. The display layer already exists — the course-detail page renders an
"Instruktør" row, and the embed calendar and studio agenda show `instructor_name`
when present — but nothing in the product ever sets it. `CreateCourseDrawer`
hardcodes `instructor_name: null`, `CourseSettingsTab` has no instructor field, and
`courses.instructor_id` (FK → `profiles`) is referenced nowhere in `src/` and is
NULL on every row.

## Goals

- A seller can save a list of instructors (names) and manage it (rename, delete).
- When creating or editing a course, the seller can optionally pick an instructor
  (or add a new one inline).
- Students see the instructor on the public course detail page, embed calendar, and
  studio agenda — which requires no new display work.

Non-goals (YAGNI, revisit later if asked): instructor photos/bios, instructor
logins/invites, per-session instructors, filtering public pages by instructor,
showing the instructor in the seller's own course list.

**Parked for post-launch (user decision 2026-07-14):** exposing the picker to solo
sellers (`operating_model = 'solo'`) — solo teachers do sometimes co-hold courses,
but proper support wants multi-teacher display work on the public course page.
Parking is safe: gating is purely form-level visibility, solo courses keep
`instructor_id`/`instructor_name` NULL exactly as today, and un-gating later touches
no existing rows. `publicCourses.flattenInstructors` already models instructors as
an array, so multi-instructor display has a ready-made shape.

## Approaches considered

1. **Saved instructor list + re-added FK — CHOSEN.** New seller-scoped
   `instructors` table; re-add the dead `courses.instructor_id` pointed at it; keep
   `courses.instructor_name` as the denormalized display copy. Real save/select,
   central rename/delete, minimal schema churn.
2. **Free-text with memory.** Combobox suggesting distinct past `instructor_name`
   values; no table, no migration. Rejected: typos persist forever, no rename or
   delete — the "saved list" is an illusion.
3. **Instructors as user accounts.** Rejected: invites/auth/permissions reverse the
   2026-06 owner-only role simplification; massively over-scoped for "show a name".

## Data model

One migration (`supabase/migrations/<UTC-timestamp>_course_instructors.sql`, with a
timestamp strictly greater than the latest existing file — currently
`20260711131000`):

```sql
CREATE TABLE instructors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON instructors(seller_id);
```

- RLS: full CRUD for the authenticated owner of `seller_id`, following the same
  seller-scoped policy pattern used by the other seller tables (verify the exact
  helper/policy shape against a recent migration when writing it). No anon access —
  public pages read `instructor_name` off `courses`, never this table.
- Grants: follow the repo's explicit-grant style (no PUBLIC).
- Re-add `courses.instructor_id uuid REFERENCES instructors(id) ON DELETE SET NULL`
  plus a partial index. (Correction 2026-07-14: the original profiles-FK column was
  dropped by `20260702153923_business_consolidation.sql` §2 as never-written dead
  weight — there is nothing to repoint.) authenticated's table-level grants on
  courses cover the new column; anon does not need it (public pages read
  `instructor_name`, which still exists and keeps its anon grant).
- `courses.instructor_name` stays the display source of truth on course rows. On
  instructor delete, the FK nulls but the name remains — historical attribution
  stays correct on existing courses. That retention has a limit: it lasts until
  the course's settings are next saved, at which point the form commits whatever
  it currently shows (an unset picker saves as no instructor and clears the
  retained name) — accepted as form-matches-reality, not a bug.

Per CLAUDE.md: the migration is done only when the file is committed and on
`origin/main`; state the apply/merge status explicitly when delivering.

## Services

New `src/services/instructors.ts`:

- `fetchInstructors(sellerId)` — list, ordered by name.
- `createInstructor(sellerId, name)` — trimmed; returns the row.
- `renameInstructor(id, name)` — updates the row, then
  `UPDATE courses SET instructor_name = <name> WHERE instructor_id = <id>` so
  existing courses follow. Two sequential statements, not atomic; acceptable — worst
  case is a stale name on a course until the next rename, and both run under the
  seller's own RLS.
- `deleteInstructor(id)` — plain delete; FK sets `courses.instructor_id` NULL,
  names remain.

`createCourse`/`updateCourse` in `src/services/courses.ts` need no signature work —
creation is a direct insert and `CourseInsert`/`CourseUpdate` already include
`instructor_name`; add `instructor_id` to the generated types
(`src/types/database.ts`).

## UI

**Picker (shared component, used in both places).** Rendered only for studio
accounts (`currentSeller.operating_model === 'studio'` — same gate idiom as
`AffiliationsSection`); solo sellers see no change to their course forms. An
optional "Instruktør" field: a select listing the seller's saved instructors, plus:

- an inline "Legg til ny…" action that takes a name, creates the row, and selects
  it;
- an "Administrer…" action opening a small dialog that lists instructors with
  rename and delete. Deleting an instructor that is on courses is allowed (names
  persist on those courses); the dialog copy says so in one neutral sentence.

No new page or settings section — management lives entirely in the picker's dialog.
Follow the design system: bordered inputs, pill buttons, semantic tokens; UI copy in
Bokmål, one-line neutral errors. Invoke the repo's UI gates (`ux-ui-pro`,
`emil-design-eng`) when building.

**CreateCourseDrawer.** Add the picker as an optional field; on submit pass the
selected `instructor_id` and its `name` as `instructor_name` (replacing the
hardcoded null). No instructor selected → both null, exactly as today.

**CourseSettingsTab.** Add the same picker to the general-info section, wired
through the existing dirty-form/save flow. The settings save goes through the
transactional `save_course_schedule` RPC (not `updateCourse`) — the RPC whitelists
course fields with key-presence guards, so the migration must add
`instructor_id`/`instructor_name` CASE lines to it.

**Copy note:** the StudioPage affiliations section already uses "instruktører" for
affiliated guest sellers. Contexts don't overlap (that's the storefront page; this
is the course form), but keep the picker label simply "Instruktør" and avoid the
word in the management dialog title if it can read as referring to affiliates.

## Error handling

- Picker load failure: field renders with a one-line inline error and the course
  form stays usable — instructor is optional, so saving without one must not be
  blocked (matches the "failed fetch must not read as empty" convention in
  `AffiliationsSection`).
- Create/rename/delete failures: one-line neutral toast via the existing
  `friendlyError` pattern; dialog stays open with state intact.
- Duplicate names are allowed (two instructors may share a name); no uniqueness
  constraint.

## Testing

The repo unit-tests pure functions only (no supabase-client mock harness), and all
new logic here is thin DB/UI glue — so verification is typecheck + the existing
vitest suite + a scripted manual click-through against the dev DB:

- Migration sanity: `courses.instructor_id` re-add applies cleanly (column is
  all-NULL).
- Manual: create with/without instructor; rename propagates to the course's public
  page; delete preserves the name on existing courses and clears the picker;
  «Instruktør» row on course detail + embed calendar show the name; solo sellers
  see no field.

## Open questions for the user

1. Confirm the lightweight model (name only) — or do you want photo/bio now?
2. Is picker-embedded management enough, or do you want a visible management
  surface (e.g. a settings row)?
3. Should the seller's own courses list also show the instructor (out of scope in
  this draft)?

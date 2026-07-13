# Course instructor attribution — design

**Date:** 2026-07-14
**Status:** Draft — awaiting user review
**Decision made without user input (user was away):** instructor = lightweight saved
entry owned by the seller (name only, no login, no invite). Alternatives considered
and rejected below. If the user wants linked accounts or photos/bios, revisit before
planning.

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

## Approaches considered

1. **Saved instructor list + repointed FK — CHOSEN.** New seller-scoped
   `instructors` table; repoint the dead `courses.instructor_id` at it; keep
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
- Repoint the legacy column: drop constraint `courses_instructor_id_fkey`
  (`→ profiles`, per the production baseline) and add
  `REFERENCES instructors(id) ON DELETE SET NULL`. Safe: the column is NULL on
  every row. `instructor_id` is already in the anon column grant, so public reads
  need no grant change. The existing partial index `idx_courses_instructor` and the
  legacy `create_course` RPC (which inserts `p_instructor_id`) are unaffected — the
  column's type doesn't change.
- `courses.instructor_name` stays the display source of truth on course rows. On
  instructor delete, the FK nulls but the name remains — historical attribution
  stays correct on existing courses.

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

**Picker (shared component, used in both places).** An optional "Instruktør" field:
a select listing the seller's saved instructors, plus:

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
through the existing dirty-form/save flow; saving writes both columns via
`updateCourse`.

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

- Service tests: rename propagates `instructor_name` to that instructor's courses
  and no others; delete nulls the FK and preserves names.
- Migration sanity: `courses.instructor_id` repoint applies cleanly on a DB where
  the column is all-NULL.
- Form tests (follow `CoursePage.test.ts` conventions): create with/without
  instructor; settings save writes both columns.
- Manual: course detail shows the "Instruktør" row for an attributed course, embed
  calendar and studio agenda show the name.

## Open questions for the user

1. Confirm the lightweight model (name only) — or do you want photo/bio now?
2. Is picker-embedded management enough, or do you want a visible management
  surface (e.g. a settings row)?
3. Should the seller's own courses list also show the instructor (out of scope in
  this draft)?

# Public booking redesign — v1

**Goal:** Replace the current `/studio/:slug` and `/studio/:slug/:courseId` pages with a schedule-first, drawer-based flow that's easily scannable and minimizes clicks-to-book.

**Constraints:**
- Guest checkout only. No account creation.
- Existing data model: `courses`, `course_sessions`, `signups`, `profiles` (for instructors), `organizations`.
- Payment method for v1: Stripe card inline. Vipps deferred (see `tasks/deferred-work.md`).

**Research basis:** 3-stream research pass (US wellness platforms, event ticketing, EU/Nordic studios). Key convergent patterns baked into this plan.

---

## Phase 0 — Schema [DONE]

Applied via migration `instructor_bio_and_multi_instructor`:

- [x] `profiles.bio TEXT` — instructor biography.
- [x] `organizations.default_course_image_url TEXT` — studio-level image fallback.
- [x] `course_instructors (course_id, profile_id, role, display_order, created_at)` with RLS (org-member manage, public-read for published courses).
- [x] Unique index: at most one `primary` instructor per course.
- [x] Backfilled from existing `courses.instructor_id` (15 rows).
- [x] TypeScript types regenerated.

**Note:** `courses.instructor_id` retained as denormalized "primary instructor" pointer. Keeps existing code working; new multi-instructor code reads through the join table.

---

## Phase 1 — Service layer updates

- [ ] Update `src/services/publicCourses.ts` so `PublicCourseWithDetails` includes **all** instructors from `course_instructors` (name, avatar_url, bio, role, order) rather than just the single `instructor_id` profile.
- [ ] Update `src/services/organizations.ts::fetchOrganizationBySlug` to return `default_course_image_url` (already auto-selected via `*`).
- [ ] Add helper `resolveCourseImage(course, organization)` that returns `course.image_url ?? organization.default_course_image_url ?? null`. Reuse in list + detail.
- [ ] Verify public-RLS: anonymous visitors can read `course_instructors` joined to published courses.

---

## Phase 2 — Studio schedule page (`/studio/:slug`) rebuild

Replace `src/pages/public/PublicCoursesPage.tsx`.

**Layout:**
- Tight studio header: name + city + optional byline. No hero banner.
- Filter chips row: type (Alle / Kursrekke / Arrangement / Online). Reuse `ToggleGroup` segmented variant.
- Day-grouped list:
  - Day heading: `Mandag 14. april`
  - Rows ordered chronologically by time within day.
- Per-row data (scannable left→right):
  - Time · Title · Instructor · Location · Price · `X plasser igjen`
  - Multi-week badge: `Uke 1 av 8` when `course_type === 'course-series' && start_date in past`
  - `Avlyst` badge if `status === 'cancelled'` (show for 30 days after start, then hide)
- No card image on rows (image is for detail page only — kills scanning).

**Visibility rules:**
- Show: `status IN ('active', 'upcoming')`.
- Show (with badge): `status = 'cancelled'` AND `start_date >= today - 30 days`.
- Hide: `completed`, `draft`, cancelled >30d.

**Tasks:**
- [ ] Draft new `PublicCoursesPage.tsx` — keep data-fetching, replace layout.
- [ ] New sub-component `<ScheduleDayList>` with day headings.
- [ ] New sub-component `<ScheduleRow>` (one per course).
- [ ] Type filter chips — reuse `ToggleGroup` segmented variant.
- [ ] Remove unused: `PublicCourseTable.tsx` once new page lands.
- [ ] Empty state: "Ingen planlagte kurs akkurat nå."
- [ ] Sorting: chronological by next upcoming session date.

---

## Phase 3 — Course detail drawer (`/studio/:slug/:courseId`) rebuild

Replace `src/pages/public/PublicCourseDetailPage.tsx`. Introduce hybrid drawer + route pattern.

**Routing — React Router "background location" pattern:**
- `<Routes location={state?.backgroundLocation || location}>` renders the schedule page.
- `<Routes>` (non-background) renders the drawer on top when URL is `/studio/:slug/:courseId`.
- Schedule row click: navigate with `state: { backgroundLocation: location }`.
- Direct-URL visit: no background location → render schedule underneath + drawer on top.
- Close drawer: navigate back to `/studio/:slug`.

**Drawer content (top → bottom, desktop ~520px wide, mobile full-screen sheet):**

1. Hero image (16:9, `image_url ?? organization.default_course_image_url ?? collapsed-title-block`).
2. Key facts strip (sticky under hero): price · plasser igjen · starter · duration · location.
3. **Booking card — above the fold.** Inline form:
   - `Navn`, `E-post`, `Telefon` (required).
   - ☐ `Jeg godtar vilkårene og angreretten` (links to `/vilkar`).
   - "Betal med kort" primary button → Stripe Elements inline.
   - Secondary CTA for drop-in when `allows_drop_in && course-series && start_date < today`.
4. Session list — all `course_sessions` with date + start_time.
5. Om kurset — `courses.description`, `level`, `practical_info`.
6. Om instruktørene — multi-instructor block from `course_instructors`, primary first.
7. Sted — address text. (Map deferred.)
8. Avbestilling — "Gratis avbestilling inntil 24 timer før kursstart".

**Booking flow:**
- Single screen. Stripe Elements inline.
- Submit → create signup + payment intent (existing edge functions) → Stripe confirm → `CheckoutSuccessPage`.
- Guest-only. No account-creation nudge.

**Tasks:**
- [ ] Set up background-location pattern in `App.tsx` + new `<CourseDrawer>` component.
- [ ] Rebuild `PublicCourseDetailPage.tsx` as the drawer.
- [ ] Reuse: `EmbeddedPayment`, `StudentDetailsForm`, `InstructorCard` (update to loop multi).
- [ ] Likely delete / simplify: `BookingSidebar`, `CourseHero`, `CourseMetaGrid`, `PriceHeader`, `PublicCourseHeader`, `TicketSelector`, `CourseDescription`.
- [ ] Add `<CourseSessionsList>` component.
- [ ] Drop-in UI: post-start course-series with `allows_drop_in` shows secondary "Drop-in" CTA per remaining session.

---

## Phase 4 — Image fallback

- [ ] Studio settings page gets a "Standard kursbilde" uploader writing `organizations.default_course_image_url`. Reuse existing image-upload component.
- [ ] Public pages use `resolveCourseImage(course, organization)` helper.

---

## Phase 5 — Instructors v2 (teacher dashboard)

- [ ] "Bio" textarea on teacher profile edit (writes `profiles.bio`).
- [ ] Course edit page "Instruktører" section — add/remove guest instructors from org members. Primary stays synced with `courses.instructor_id`.

---

## Phase 6 — Verification

- [ ] Typecheck clean.
- [ ] Smoke-test as logged-out user: visit studio → click course → drawer → form → Stripe test card → success → confirmation email.
- [ ] Share course URL in new tab — drawer opens on top of schedule.
- [ ] Back button closes drawer.
- [ ] Cancelled course shows with "Avlyst" badge.
- [ ] Course with no image collapses hero cleanly.
- [ ] Multi-instructor display on course with guest instructor.
- [ ] Drop-in CTA: hidden on events, shown on post-start course-series when allowed.

---

## Parked for later → see `tasks/deferred-work.md`

- Klippekort / punch cards (requires accounts).
- Vipps direct integration.
- Delete 5 zombie waitlist edge functions via Supabase dashboard.
- Waitlist v2 (if we ever bring it back).

---

## Review (filled in after implementation)

- Pages replaced:
- Net LoC change:
- Verification outcomes:
- Outstanding issues:

---

# SignupsPage — unify row layout with course-detail participants table

**Goal:** Replace stacked `SignupRow` list on `/teacher/signups` with the table row layout used by `CourseParticipantsTab` so every signup shows status, payment, receipt, and note columns.

## Tasks
- [x] Add `receiptUrl?: string | null` to `SignupDisplay` in `src/types/database.ts`.
- [x] Map `signup.stripe_receipt_url → display.receiptUrl` in `SignupsPage.tsx` (query already selects it via `*`).
- [x] Rewrite `src/components/teacher/SignupRow.tsx` as a `<tr>` with columns: Navn, Kurs, Status, Betaling, Kvittering, Notater, Handlinger. Reuse `NotePopover`, preserve cancelled-row muting and `hasActions` gating. Added `hideCourse` prop for use inside past-course groups.
- [x] Rewrite `SignupListView.tsx` to wrap rows in a `<table>` with `<thead>` (responsive hiding mirrors `CourseParticipantsTab`), use `SkeletonTableRow` for loading, and keep the "Vis flere / Vis færre" controls below.
- [x] Update `PastSignupsList` so each expanded group renders its own `<table>` (group header stays outside as the collapsible button). Kurs column hidden inside groups via `hideCourse` to avoid redundancy with the group header.
- [ ] Manual verify in browser: each tab, note popover, receipt link, action menu, cancelled row, mobile width.

## Review
- Types pass (`tsc --noEmit` clean).
- Row now shows: Navn (avatar + name + email), Kurs (link, hidden < sm), Status, Betaling (hidden < md), Kvittering (hidden < md), Notater (hidden < sm), Handlinger.
- Dropped the "registered at" timestamp from the row (not in course-detail layout; newest-first sort still conveys recency).
- Removed framer-motion from the past grouped rows — didn't fit `<tr>` semantics, and the collapse animation on the group itself still communicates state.

---

# Signup status + payment: collapse to one column + close free-signup forgery hole

**Goals:**
1. Stop showing a "Påmeldt" badge next to "Betaling feilet" — merge into a single derived status badge.
2. Close the hole where any anon caller could POST a free signup for a paid course by calling `signups` directly (RLS only checked `user_id`, not the course's price).

## Tasks
- [x] New component `src/components/ui/signup-status-badge.tsx` — derives one label + variant from `(SignupStatus, PaymentStatus)`. Labels: Påmeldt / Venter betaling / Betaling feilet / Avbestilt / Kurs avlyst / Refundert.
- [x] `SignupRow.tsx` — drop Betaling `<td>`, replace StatusBadge with SignupStatusBadge.
- [x] `SignupListView.tsx` — drop Betaling `<th>`, `COLUMN_COUNT` 7 → 6.
- [x] `CourseParticipantsTab.tsx` — drop Betaling `<th>` + `<td>`, replace StatusBadge with SignupStatusBadge, `colSpan` 6 → 5, skeleton `columns` 6 → 5.
- [x] New edge function `supabase/functions/create-free-signup/index.ts` — verifies course.price ≤ 0 server-side, rejects draft/cancelled courses, calls `create_signup_if_available` RPC with amount_paid=0.
- [x] `src/services/signups.ts` — add `createFreeSignup()` helper invoking the edge function.
- [x] `src/pages/public/PublicCourseDetailPage.tsx` — swap the free-course branch from direct `createSignup` insert to `createFreeSignup`.
- [x] Migration `20260420010000_tighten_signups_insert_rls.sql` — drop old permissive policy, add authenticated-only `is_org_member(organization_id)` policy. Anon inserts are now forbidden; public free bookings flow through the edge function (service role bypasses RLS).
- [x] Typecheck passes.
- [x] Deploy: edge function live (`create-free-signup` v1), migration applied on `nollnnkksgicsvuthnjq`, frontend shipped to main (commit `1a6db7f`).
- [x] Browser verify: free-course signup works end-to-end through the edge function; loading label fixed to "Melder på" for free courses, "Starter betaling" for paid.
- [x] Walked `/teacher/signups` tabs and `CourseDetail → Deltakere` at mobile + desktop — single-status column renders cleanly.
- [ ] Not yet exercised (needs specific data to reach): note popover (requires a signup with a note), receipt icon (requires a Stripe `stripe_receipt_url` on the signup), action menu states, cancelled-row muting, `PastSignupsList` grouping (requires a past/ended course with signups). Code paths unchanged from the pre-refactor behaviour — the table only restyles them.

## Review
- Derived-status logic: refund wins (shows "Refundert" regardless of signup status), then cancellation states, then confirmed + payment sub-state. Matches the natural teacher mental model: "is there anything to do with this row?"
- `CourseOverviewTab.tsx:273` still uses the old `StatusBadge` for a mini participant list — left as-is because that view doesn't carry payment status.
- Free-course forgery: after the migration is applied, an anon POST to `signups` will be rejected by RLS; the only way to create a free signup is the edge function, which verifies price.
- `markPaymentResolved` still writes `payment_status='paid'` directly from the client — org isolation is enforced by the UPDATE RLS policy (`is_org_member(organization_id)`), so that's not a cross-org hole, just a minor audit-trail gap noted earlier. Not addressed in this change.

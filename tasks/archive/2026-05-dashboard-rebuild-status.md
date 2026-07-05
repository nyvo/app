# Post-MVP rebuild — status & next steps

_Last updated: 2026-05-06 · commit `685af1f` on `main`_

This document is the persistent memory of the post-MVP rebuild work. It
exists because conversation context doesn't sync across machines —
re-read this before continuing, or hand it to a fresh Claude session.

**Source of truth for direction:** [`tasks/post-mvp-feedback.md`](./post-mvp-feedback.md).
That doc captures everything the prospect-feedback session decided. This
doc tracks progress against it.

---

## Meeting checklist (against `post-mvp-feedback.md`)

| § | Item | Status | Notes |
|---|---|---|---|
| 1 | Thesis: dashboard register shift (calmer, less dense) | 🔧 partial | Big-IA pieces done (drawer, vertical schedule, slim CourseDetailPage). Text-size sweep + color-tier reduction across components NOT yet swept. |
| 2 | Dashboard calibration sweep — `text-sm` → `text-base`, drop tertiary/disabled tiers, padding tier-up, progressive disclosure | ❌ pending | This is the explicit multi-commit sweep across `src/pages/teacher/**` and `src/components/teacher/**`. Not started. |
| 3 | Premade tier templates replacing `CoursePricingTab` + `TicketTypeForm` | ❌ pending | The toggle-able template panel (Hele kurset / Halvkurs / Drop-in / Early bird). Manual editor still in place. |
| 4 | Unified studio model — drop `/space/` | ✅ shipped (different shape) | Implemented as `team_affiliations` + `course_team_listings` instead of the originally-proposed `studio_members`. Outcome is the same: one course can appear on multiple storefronts; canonical URL is the owner's. **Divergence from spec:** public team page is `/<team-slug>` (flat at root), not `/studio/<slug>`. Vocabulary went orgs→sellers + spaces→teams. The two-toggle onboarding flow is NOT implemented (welcome flow only asks Privatperson/Bedrift). See "Onboarding gap" below. |
| 5 | Late-signup auto-prorate | ❌ pending | Schema column `package_start_date` not added; booking-page math not implemented; `Pågår` chip not added to public list. |
| 6 | Multi-day events — verify "Add another day" affordance | ❓ unverified | `CreateCoursePage` flow needs auditing on Mac. |
| 7 | Phone field on booking form | ❓ likely pending | `signups.participant_phone` exists in schema; `BookingPanel` doesn't collect it (last I read). Worth verifying. |
| 8 | Course thumbnails on the list (`CourseListView`) | ❓ unverified | Check whether thumbnails appear on course rows. |
| 9 | IA disambiguation — Påmeldinger as activity feed; persistent "Vis offentlig side" | 🔧 partial | Both views still exist. Päameldinger hasn't been reshaped into a cleaner chronological feed. "Vis offentlig side" exists on CourseDetailPage but isn't a persistent topbar/chrome affordance. |
| 10 | Open questions | ✅ none open | Spec says all decisions for this round are answered. |
| 11 | Suggested execution order | partial | Items 1, 4 (in modified form) done. Item 9 partial. Items 2, 3, 5, 6, 7, 8 still owed. |
| 12 | Deferred (klippekort, gift cards, multi-org-per-user, online classes, etc.) | 📅 deferred | Explicitly post-launch. Skip. |

### Onboarding gap (worth flagging)

Spec §4 calls for a **two-toggle welcome flow** ("create your own studio?"
+ "join an existing studio?"). What's actually implemented is a single
ENK/AS choice that always creates a seller + a team. There's no UI to
*not* create a team, and no UI to enter an invite code at signup.

For pure shared-studio renters (e.g. someone who only wants to teach at
Inspire and not have their own brand), the current flow doesn't match
spec. Affiliations now solve the "course on multiple storefronts"
problem, but the onboarding question still needs to land.

---

## What just shipped (commit `45c38f9`)

### URL namespace migration

Old `/teacher/*` namespace retired. Slug-less, English URLs, Norwegian
UI copy (Time2Book pattern). No backward-compat redirects — the app
isn't launched yet.

| Concern | URL |
|---|---|
| Dashboard home | `/overview` |
| Schedule | `/schedule` |
| Courses list | `/courses` |
| New course | `/courses/new` |
| Course detail | `/courses/:id` |
| Edit course | `/courses/:id/edit` |
| Course pricing | `/courses/:id/pricing` |
| Signups | `/signups` |
| Studio storefront mgmt | `/studio` |
| Settings — profile | `/settings/profile` |
| Settings — payouts | `/settings/payouts` |

Single source of truth: `src/lib/routes.ts`. **No new `/teacher/...`
literals anywhere** — every nav goes through the route map.

### Storefront syndication (the Inspire/Anna affiliation feature)

Schema: `team_affiliations` (invite/accept), `course_team_listings`
(per-course opt-in). RLS, cleanup trigger, helpers all in place.

UI: `AffiliationsSection` on the Studio page has three panels:

1. **Invitasjoner til deg** — pending invites you've received (Godta/Avslå)
2. **Du samarbeider med** — active affiliations with per-course listing toggles
3. **På din studio-side** — affiliates of your team + invite-by-email form

Public storefront query (`fetchPublicCourses` with `teamSlug`) UNIONs
owner courses with `course_team_listings` entries. Affiliated courses
show on a venue's `/<team-slug>` page, but card links go to the
**owner's** team URL — matches the spec where clicking on Inspire's
page navigates to Anna's storefront.

### Single drawer pattern

One global `<SignupDetailDrawer />` mounted in TeacherLayout via
`<SignupDrawerProvider>`. Opened via `useSignupDrawer()` from anywhere
a participant row lives:
- `SignupRow` (used by `SignupsPage`)
- `CourseParticipantsTab` (used by `CourseDetailPage`)
- `RecentActivityCard` (used by `TeacherDashboard`)

`onMutate` callback re-runs the page's fetch after a drawer action
(cancel/refund/mark-paid) so the underlying list refreshes.

### Other shipped work

- **Old admin/tenant flow retired**: `CreateTeamDialog`, `JoinWithCodeForm`,
  `AdminTeamCard`, `TenantTeamCard`, `useMyTeams` all deleted.
  `services/teams.ts` slimmed to just `updateTeam`.
- **CourseDetailPage refactor**: 1059 → 660 lines. Settings tab moved to
  `/courses/:id/edit` (`CourseEditPage`). Pricing tab moved to
  `/courses/:id/pricing` (`CoursePricingPage`). No more in-page tabs.
- **SchedulePage rebuilt**: ditched 552-line calendar grid + 10
  subcomponents. Now a vertical session-card list grouped by date with
  day-aware labels and course/range filters.
- **Locations relocated**: standalone page deleted; `LocationsSection`
  mounted on Studio page below `AffiliationsSection`.
- **Profile dropped**: `profiles.account_type` column dropped (DB
  migration applied). Was dead schema — no app code ever read it.
  Renamed `accountType` → `sellerType` in `WelcomeFlow` for accuracy.
- **Auth fix**: `state.from` from `ProtectedRoute` is now honored on
  password login. Deep links survive the auth bounce.
  - Caveat: OAuth flow still drops you on `/overview`. Carrying state
    through OAuth round-trip needs URL-encoded redirect; deferred.

---

## Pending / queued (priority order)

### Meeting-driven (highest priority — these are the things the
### post-MVP feedback explicitly asked for)

| # | Item | Source | Effort | Notes |
|---|---|---|---|---|
| 1 | **Onboarding: buyer/seller account-type flow** | superseded §4 | 1-2 days | Replace `WelcomeFlow.tsx`. New shape: New account → Choose account type (Buyer / Seller). Seller branch → Individual teacher / Studio → profile name (org name if studio) → profile photo (optional) → slug (URL-style). Buyer branch → full name + phone → buyer dashboard. **No "join existing studio" / "create your own" toggles** — each account is its own source of truth. Cross-storefront collaboration happens via `team_affiliations` after signup, not at onboarding. |
| 4 | **Late-signup auto-prorate** | §5 | 1 day | See dedicated plan below ([Plan: late-signup auto-prorate](#plan-late-signup-auto-prorate)). |
| 8 | **`CreateCourseDrawer` rewrite — Enkelt / Gjentakende** | superseded §6 | 0.5-1 day | Rename current "Én gang / Flere ganger" to **Enkelt / Gjentakende** (or better Norwegian). `Enkelt` supports multi-day (e.g. weekend retreat: Sat + Sun) but **not** multi-week — adds N `course_sessions` rows under a single course. `Gjentakende` stays weekly-recurring with `total_weeks`. Drop the hard-coded `eventDays: 1` for single events; let the user add additional days inline. |

Items 2, 3, 5, 6, 7 from the original list are **deprioritised** — see [Backlog](#backlog-deprioritised-meeting-items) below.

### Cleanup (completed 2026-05-12)

| # | Item | Status |
|---|---|---|
| 9 | **Drop `team_members` table** | ✅ Dropped via migration `drop_team_members_table`. 7 legacy rows were pre-affiliations self-admin pairs (no cross-org data). |
| 10 | **Stub `team-actions` edge function with 410 Gone** | ✅ Deployed v2 returning 410. Audit verified the other 9 candidate functions were already 410-stubbed (`space-actions`, `space-join-requests`, `join-waitlist`, `promote-waitlist-signup`, `process-expired-offers`, `process-waitlist-promotion`, `validate-claim-token`, `send-payment-link`, `notify-schedule-change`). |
| 11 | **Public course detail redirect for syndicated URLs** | ✅ `PublicCourseDetailPage` now compares URL slug vs `course.seller.slug` after fetch; if they differ, `navigate(canonical, { replace: true })`. Venue URLs (`/inspire/<anna-course>`) bounce to owner's canonical URL (`/anna/<anna-course>`). |
| 12 | **OAuth post-login `state.from` redirect** | ✅ `LoginPage` now passes `redirectAfterLogin` to `GoogleAuthButton` instead of hardcoded dashboard URL. Deep links survive OAuth round-trip. |

### Cosmetic / nice-to-haves

| # | Item | Effort |
|---|---|---|
| 13 | Consolidate `SignupsPage` to use shared `toSignupDisplay` helper | 5 min |
| 14 | Show signup count per course in the affiliation toggle UI | 1 hr |
| 15 | Bundle code-splitting (index.js is 784kb) | 1-2 hr |

### Backlog (deprioritised meeting items)

These came out of the prospect feedback but were deprioritised on 2026-05-12.
Re-promote individually if a real user asks.

| # | Item | Source | Effort | Notes |
|---|---|---|---|---|
| B1 | **Dashboard calibration sweep** | §1, §2 | multi-day | `text-sm` → `text-base` across `src/pages/teacher/**` + `src/components/teacher/**`. Increase row padding. Progressive disclosure for payment / Dintero / refund detail. Reduce KPI density. ✅ Already done via studio-design token migration: `tertiary-foreground` / `disabled-foreground` removed from app code. |
| B2 | **Premade tier templates** | §3 | 1-2 days | Replace `CoursePricingTab` + `TicketTypeForm` with toggle templates: Hele kurset, Halvkurs (only when total_weeks > 16), Drop-in, Early bird. |
| B3 | **IA: reshape Påmeldinger as activity feed + persistent "Vis offentlig side"** | §9 | half day | Päameldinger becomes chronological dated cards. Persistent affordance in topbar/chrome. Note: `TeacherTopBar` no longer exists; chrome is sidebar-only. |
| B4 | **Phone field on booking form** | §7 | 15 min | `signups.participant_phone` and `customerPhone` in `createDinteroSession` already exist. Pure UI plumb-through in `BookingPanel.tsx`. |
| B5 | **Course thumbnails on `CourseListView`** | §8 | 30 min | Use `image_url` falling back to `teams.default_course_image_url`. Both DB columns ready. |

---

## Plan: late-signup auto-prorate

Spec source: `post-mvp-feedback.md` §5. This is the full breakdown for item #4 above.

### Goal

A course already in progress (`start_date <= today <= end_date`) shows a
`Pågår` chip on the public list and a prorated full-course price on the
booking page. Original price struck through. Late signup contributes
to per-session capacity only from the join date forward.

### Phases

**Phase 1 — Schema (one migration, applied locally then to remote)**

```sql
-- 1. Late-signup window start
ALTER TABLE public.signups ADD COLUMN package_start_date DATE;
ALTER TABLE public.payment_attempts ADD COLUMN package_start_date DATE;

-- 2. Per-course opt-out
ALTER TABLE public.courses
  ADD COLUMN allow_late_signup BOOLEAN NOT NULL DEFAULT true;

-- 3. Capacity RPC — extend filter
CREATE OR REPLACE FUNCTION public.count_signups_for_session(...)
-- existing body now also filters: package_start_date <= session_date
--                              AND package_end_date   >= session_date
```

Backfill: existing rows get `package_start_date = course.start_date` via
the migration. Going forward, the signup RPC sets it explicitly.

**Phase 2 — Public course card (`Pågår` chip)**

- `fetchPublicCourses` already returns `start_date` / `end_date`.
- `CourseCard` (or `CourseListItem` — wherever the public card lives now):
  if `start_date <= today <= end_date && allow_late_signup`, render the
  `Pågår` chip via existing `StatusBadge` variants.
- If `allow_late_signup === false` and the course has started, render
  `Påmelding stengt` instead — the tile is non-clickable for booking.

**Phase 3 — BookingPanel math + display**

```ts
const totalWeeks = course.total_weeks ?? 1;
const today = new Date();
const courseHasStarted = course.start_date <= today && today <= course.end_date;
const allowLate = course.allow_late_signup;

const remainingWeeks = Math.max(
  1,
  Math.ceil((+course.end_date - +today) / (7 * 24 * 60 * 60 * 1000)),
);
const proratedPrice = Math.round(
  fullPrice * remainingWeeks / totalWeeks,
);

const showProrated = courseHasStarted && allowLate;
```

UI: when `showProrated`, the full-price option is **replaced** (not added
to) by the prorated card:

```
Hele kurset (N uker igjen)
{proratedPrice} kr   {fullPrice} kr   ← struck through
```

Use `formatKroner()` for both (per CLAUDE.md formatting rule).

**Phase 4 — Server: RPC + Dintero session**

- `createDinteroSession` and `create-free-signup` edge functions:
  compute `package_start_date` server-side. If course has started AND
  `allow_late_signup`, pass `today`. Else pass `course.start_date`.
  Also pass the prorated `amount` so the buyer pays what they see.
- Webhook handler / `finalize-dintero-transaction`: persist
  `package_start_date` to `signups` from the matching `payment_attempts` row.

**Phase 5 — Settings UI**

- `CourseEditPage` or `CourseSettingsTab`: add `allow_late_signup` toggle.
  Default on. Helper text: "La elever melde seg på etter kursstart med
  redusert pris."

### Verification checklist

- [ ] Schema migration applied, RPC updated, rows backfilled
- [ ] Late signup for a started course charges the prorated amount in Dintero test mode
- [ ] `signups.package_start_date` = today after a late signup
- [ ] `count_signups_for_session` returns the late signup only for sessions on/after `package_start_date`
- [ ] `Pågår` chip appears on the public list once `start_date` is past
- [ ] `allow_late_signup = false` suppresses the prorated path, surfaces "Påmelding stengt"
- [ ] No regression on full-price signups for not-yet-started courses

### Out of scope (deferred)

- Per-course minimum-weeks floor (§12 of feedback — "stop showing late signup with fewer than X weeks left"). Add when a teacher asks.
- Tier-aware proration (Drop-in / Early bird tiers when those land via the premade templates work).

---

## Stale items / TODO from 2026-05-12 verification

Surfaced while running the plan against the codebase. Park here until acted on.

- **Doc rename:** `post-mvp-feedback.md` §4 (two-toggle onboarding) is **superseded** by the buyer/seller flow in item #1 above. Add a header note to that section pointing here, so a future re-read doesn't relitigate.
- **Doc rename:** §6 in `post-mvp-feedback.md` references `CreateCoursePage` — file no longer exists. Replace with `CreateCourseDrawer` and reframe as the Enkelt/Gjentakende rewrite (item #8).
- ~~**Drawer-policy wording:** the "ONE drawer in the entire app" locked decision is contradicted by `CreateCourseDrawer`. Either reword the rule ("one *signup-detail* drawer") or accept the carve-out for creation flows.~~ **Resolved 2026-05-12:** reworded to "two drawer roles, kept distinct" — one signup-detail drawer + quick-create drawers.
- **Edge-function audit:** open `team-actions`, `space-actions`, `space-join-requests`, `join-waitlist`, `promote-waitlist-signup`, `process-expired-offers`, `process-waitlist-promotion`, `validate-claim-token`, `send-payment-link`, `notify-schedule-change` and confirm whether they internally return 410 or are still live. The "11 already 410-stubbed" claim was not verifiable from `list_edge_functions` alone.
- **`team_members` rows:** 7 legacy rows exist before drop (item #9). Eyeball them so nothing useful is lost.

---

### Deferred (explicitly post-launch per §12)

- Klippekort + student-buyer accounts (couples together)
- Gift cards (Dintero supports natively)
- Auto-prorate floor (per-course minimum-weeks rule)
- Multi-org-per-user
- Studio team display ("Lærere" section on multi-member studios)
- Online classes (own scope; needs design pass)
- Buyer dashboard build-out (will share TeacherLayout shell)
- Settlements view (after Dintero settlement data is meaningful)

---

## Decisions locked in (don't relitigate)

### URL strategy

- **Slug-less unified namespace.** No `/teacher/*` prefix. Same URL
  pattern works for buyer + seller — auth determines what renders.
- **English URLs, Norwegian UI copy.** Universal SaaS convention.
  Time2Book (the explicit reference) does this.
- **Public storefront URLs at root** (`/<team-slug>` and
  `/<team-slug>/<course-slug>`) protected by `RESERVED_SLUGS` list.
  Add new top-level routes? Add their slugs to the reserved list too.

### Account model

- **One login = one role.** `account_type` column is gone. There's no
  hybrid "I'm both buyer and seller in the same session" mode.
  - A user is a seller if they have a `seller_members` row. Period.
  - A user who wants to teach AND book at someone else's studio
    creates a separate buyer account (just like Time2Book).
- **`seller_type` (`'individual' | 'business'`)** stays — it's the
  legal-entity model collected at welcome flow.

### Drawer policy

- **Two drawer roles, kept distinct.**
  1. **One signup-detail drawer** — multiple call sites (SignupRow, CourseParticipantsTab, RecentActivityCard), single component instance mounted in `TeacherLayout` via `SignupDrawerProvider`. This is the triage-from-list drawer (read-only quick-glance per §15 of the studio-design spec).
  2. **Quick-create drawers** — entry points for new entities (currently `CreateCourseDrawer`; future similar create flows are allowed). Trimmed sectioned form, ≤8 fields, escapes to the full page on success. Each creation entry point gets its own component.
- Everything else — edit, pricing, settings — is a dedicated route, not a drawer. Confirms (delete, refund) are AlertDialogs, not drawers.

### Affiliation model

- Studio invites freelancer (studio-initiated only).
- No revenue share. Money flows 95/5 to the **course owner** regardless
  of where the buyer clicked from.
- Course detail URL is always on the **owner's** team slug, not the
  venue's. Cards on a venue's storefront link to the owner's URL.

---

## Mac-side gotchas

### Migrations applied via MCP without local files

Two migrations were applied with `mcp__supabase__apply_migration` and
**don't have files in `supabase/migrations/`**:

- `team_affiliations_and_course_listings`
- `drop_profiles_account_type`

The remote DB has them. The app works fine. But if you ever
`supabase db reset` to bootstrap a clean local DB, these will be
missing. If that becomes an issue, dump them via:

```sh
supabase db diff --schema public > supabase/migrations/<timestamp>_<name>.sql
```

…or ask Claude to write them based on this doc.

### `team_members` table

Still exists in the database but **never referenced by any
application code**. Pending decision item #1 above is to drop it. Until
then, it just sits there.

### Edge functions still deployed but dead

Beyond the 11 already 410-stubbed (email + waitlist + space-* + ...),
the `team-actions` function is now dead too (its callers were the old
`CreateTeamDialog` / `JoinWithCodeForm` which are deleted). Pending
item #2 above is to 410-stub it. Until then, it's deployed but never
called.

### `.claude/settings.local.json` has Windows paths

Some entries hardcode `C:\\Users\\krist\\...` — those won't apply on
Mac. Most entries (git, npm, supabase, etc.) are platform-agnostic and
will work fine.

---

## Files of note

### New foundations
- `src/lib/routes.ts` — single source of truth for all in-app paths
- `src/lib/reservedSlugs.ts` — extended with new top-level slugs
- `src/contexts/SignupDrawerContext.tsx` — provider + hook for the drawer
- `src/utils/signupDisplay.ts` — shared signup-row projection

### New services
- `src/services/affiliations.ts` — invite/respond/list/revoke + course listings
- `src/services/teams.ts` — slimmed to just `updateTeam`

### New pages
- `src/pages/teacher/CourseEditPage.tsx`
- `src/pages/teacher/CoursePricingPage.tsx`

### New sections
- `src/components/teacher/studio/AffiliationsSection.tsx`
- `src/components/teacher/studio/LocationsSection.tsx`
- `src/components/teacher/signups/SignupDetailDrawer.tsx`

### Heavily modified
- `src/App.tsx` — new route tree, English paths, RootRoute
- `src/pages/teacher/CourseDetailPage.tsx` — slimmed from 1059 → 660 lines
- `src/pages/teacher/TeamsPage.tsx` — rewritten as Studio info + sections
- `src/components/teacher/TeacherSidebar.tsx` — nested expandable nav
- `src/components/teacher/TeacherTopBar.tsx` — breadcrumb path map
- `src/types/database.ts` — regenerated after schema changes

---

## Smoke test checklist (run on Mac after pulling)

```sh
git pull origin main
npm install
npx tsc --noEmit          # should exit 0
npx vite build            # should exit 0
npx vitest run            # should pass 24/24
```

Then in dev mode (`npm run dev`):

- [ ] `/` logged out → landing page
- [ ] `/` logged in → redirects to `/overview`
- [ ] `/overview` → seller dashboard
- [ ] Sidebar nav clicks navigate to all routes (no 404s)
- [ ] `/courses/some-id` → course detail loads
- [ ] `/courses/some-id/edit` → edit page loads
- [ ] `/courses/some-id/pricing` → pricing page loads
- [ ] Click signup row anywhere → drawer opens with full participant context
- [ ] Studio page → Affiliations + Locations sections both render
- [ ] Logged out + visit `/courses` → redirects to `/login`, then back to `/courses` after login (state.from honored)

---

## Glossary

- **Seller** = the legal entity (one per signed-up teacher account).
- **Team** = the seller's public storefront (one per seller, auto-created).
- **Affiliation** = an invite from one team to a foreign seller, letting
  that seller's courses appear on the team's storefront.
- **Course listing** = a per-course opt-in by the affiliated seller
  to actually show that course on the team's storefront.
- **Studio** = UI copy for what the data model calls a Team (the public
  storefront). Norwegian: "Studio". Don't confuse with `seller_type`
  (which is `'individual' | 'business'`).

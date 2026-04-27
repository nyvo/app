# Post-MVP feedback — direction shift

> Notes from the first prospect-feedback session, April 2026. The thesis below
> changes the design direction for the dashboard. Public surfaces are
> unaffected — they tested well.
>
> All decisions in this doc are locked. Open questions are in §10.

## 1. Thesis

**Yoga teachers are not power users.**

The dashboard was built for a power-user persona — dense tables, four-tier text
hierarchy, info-dense KPIs, four-tab course detail. Feedback says this reads as
intimidating to actual teachers. Several individual notes (text too small, too
much on screen at once, "loud", "confused") all express the same calibration
miss.

The fix isn't a tweak. It's a **register shift**, applied surgically:

| Surface | Before | After |
|---|---|---|
| Public (`/`, `/studio/...`) | already calm at `text-base` | **unchanged** — they liked it |
| Dashboard (`/teacher/...`) | dense, `text-sm`, four text tiers | calm, `text-base`, two text tiers, progressive disclosure for technical detail |

CLAUDE.md design rules update to reflect this. Dashboard rules invert; public
rules stay.

## 2. Dashboard calibration (the big sweep)

Concrete changes across `src/pages/teacher/**` and `src/components/teacher/**`:

- **Body text:** `text-sm` → `text-base` on most surfaces.
- **Text colour tiers:** drop `tertiary-foreground` and `disabled-foreground`
  in normal use. Two tiers: `foreground` + `muted-foreground`.
- **Spacing:** more breathing room. Card row padding tier up (`px-4 py-3` →
  `px-5 py-3.5` or `px-6 py-4` where rows are dense info).
- **Progressive disclosure:** payment / refund / Dintero transaction details
  go behind "Detaljer" expanders. Surface only what the teacher acts on
  daily — name, course, status, paid/unpaid.
- **KPI density:** fewer KPI tiles per row by default. Bigger numbers, calmer
  labels, fewer simultaneous signals.

Order of operations:

1. Update CLAUDE.md design-system rules (the inversion). One commit.
2. Sweep components surface-by-surface. Probably 4-6 commits across a couple of
   days, one logical surface per commit.

## 3. Premade tier templates (replace the editor)

`CoursePricingTab` + `TicketTypeForm` go away. Replaced by a panel of
toggle-able templates, each with an editable price:

```
[✓]  Hele kurset                       13 uker      2 200 kr
[ ]  Halvkurs                            6 uker      1 200 kr     ← only shows when total_weeks > 16
[✓]  Drop-in                            1 økt          250 kr
[✓]  Early bird                          t.o.m. 25. mai   -10 %        1 980 kr
```

- Each card: toggle (active/inactive) + price input. Price is required if
  toggled on.
- "Halvkurs" template is **conditional** — only renders when the course's
  `total_weeks > 16`. Computes weeks as `ceil(total_weeks / 2)`.
- "Early bird" template auto-fills `sales_ends_at` to `start_date - 14 days`
  on activation, and a -10% discount of the full-course price.
- **Audience tier** (`student` / `senior` / `staff`) goes away from the UI.
  Schema column stays for forward-compat.

The deferred Phase 3 editor work doesn't apply — we're replacing it, not
extending it.

## 4. Unified studio model — drop `/space/` entirely

The current split between `/studio/<org-slug>` (solo teacher's page) and
`/space/<slug>` (multi-tenant aggregate) is the source of multiple confusions
in the feedback. Both teachers AND students struggle with the URL fork.

### Decision

**Everything is `/studio/<slug>`.** No `/space/` URL exists.

- The `space_members` table stays (rename to `studio_members`). Multi-tenant
  relationship still works exactly the same.
- A "studio" is the public-facing concept. An "organization" is the private
  billing entity (Dintero seller, refund handler), invisible to students.
- Every teacher belongs to **at least one studio** at signup.

### Onboarding flow (post-signup wizard, two independent toggles)

Both questions are available to every new teacher:

1. **Create your own studio page?**
   - Yes → pick a slug. Get `/studio/<your-slug>` for your own brand.
   - No → skip. Your courses appear only on studios you join.
2. **Join an existing studio?**
   - Yes → enter the invite code. Now your courses also appear on that studio.
   - No → skip.

A teacher who runs solo turns `1 = yes`, `2 = no`. A teacher who only rents at
a shared studio turns `1 = no`, `2 = yes`. Ina (rents space at Inspire AND
wants her own brand) turns both yes. Inspire's admins (no individual brand,
just the shared studio) — actually they pick yes for #1 since their studio
*is* their brand.

We **don't** ask "are you a studio or an individual teacher?" because the
answer turned out to be cosmetic — same data model either way.

### Course ownership rule

A course is owned by an **organization**. When that org is a member of multiple
studios, the course appears on each studio's public page. Ownership stays with
the teacher's org — Inspire's admins can't edit Ina's course content, only
approve or remove her membership.

### Canonical URL rule (cross-studio courses)

The course detail URL **always uses the owner's slug**, regardless of where
the click came from:

- Ina's course on Inspire's page → link target `/studio/ina-studio/<course-id>`
- One canonical URL per course. No redirects, no duplicate-content SEO problems,
  bookmarks always work.
- Course detail page is branded as the **owner's** (Ina's image, Ina's
  instructor card, "Andre kurs fra Ina studio" rail).
- Browser back button gets the student back to where they came from.

Concretely: link-builder is `\`/studio/${course.owner_organization.slug}/${course.id}\``,
never the current studio's slug.

### Worked example (Ina + Inspire)

- **Ina** signs up → onboarding creates org `ina-studio` + studio
  `/studio/ina-studio`. She's the only admin member.
- **Inspire admins** (2 humans) sign up under one shared org `inspire-yogastudio`
  with both as `org_members`, role=admin → studio `/studio/inspire-yogastudio`.
- Inspire generates an invite code → Ina enters it → Ina's *org* becomes a
  non-admin member of Inspire's studio.
- Ina's course "Vinyasa Onsdag" appears on **both** `/studio/ina-studio` AND
  `/studio/inspire-yogastudio`. No duplication; one course, two discovery
  surfaces.
- Inspire's own course "Lørdagsrytme" (owned by Inspire's org) appears only
  on `/studio/inspire-yogastudio` (since Inspire's org isn't a member of Ina's
  studio).

### Migration plan (high-level — to be detailed before execution)

1. New migration: rename `spaces` → `studios`, `space_members` → `studio_members`.
2. App code: rename Space → Studio, update routes (`/space/<slug>` → redirect
   to `/studio/<slug>`).
3. Public-page logic: a single component handles both "1-member studio" and
   "many-member studio" — same data shape, same renderer.
4. Onboarding: replace the current wizard with the two-toggle flow described
   above.
5. Dashboard nav: `Mitt studio` is conditional on the user being an admin of
   their studio. For non-admin members of a shared studio, hide it.
6. Old `/space/<slug>` URLs → 301 redirect to `/studio/<slug>` (same slug,
   same target).

This refactor is the biggest piece in the doc. Plan it before executing.

## 5. Late-signup auto-prorate

Course-card on public list shows a **`Pågår`** chip when
`start_date <= today <= end_date`. Booking page shows the auto-prorated price
with the original price struck through:

```
Hele kurset (8 uker igjen)
1 354 kr   2 200 kr
```

### Math

```ts
const remainingWeeks = Math.max(1, Math.ceil((endDate - today) / 7))
const proratedPrice = Math.round(originalPrice * remainingWeeks / totalWeeks)
```

### Decisions

- **Default behaviour:** auto-prorate is on. Course-level toggle
  `allow_late_signup` (default `true`). Teachers can turn it off per course.
- **No price floor.** Math runs all the way to 1 week remaining at one-Nth the
  price. Teachers said they want bums on seats; let the math be honest.
- **(a) auto-prorate replaces full-price option.** Once a course has started,
  the prorated price is the only one shown. The full-price option disappears.
  Simplest mental model for the student.

### Schema gotcha

`signups.package_end_date` is currently computed in the RPC from
`course.start_date + (weeks - 1) * 7`. For a late buyer joining at week 5 of
a 13-week course, their effective window is **week 5 → end**, not
**start → end**. To get per-session capacity right, add:

```sql
ALTER TABLE signups ADD COLUMN package_start_date DATE;
ALTER TABLE payment_attempts ADD COLUMN package_start_date DATE;
```

Default: `course.start_date`. Late signups override to `today`. Update
`count_signups_for_session` to filter by both `package_start_date` and
`package_end_date`.

## 6. Multi-day events

A weekend retreat is one event running Sat + Sun. Data model already supports
it — `course_sessions` per course, regardless of `course_type`. **Verify** the
`CreateCoursePage` flow exposes "Add another day" for events. If not, surface
the affordance.

Sized: 2 hours.

## 7. Phone field on the booking form

`signups.participant_phone` exists in the schema, but `BookingPanel` only
collects name + email + terms. Add an **optional** phone field to the booking
form. Plumb through `createDinteroSession` (the param `customerPhone` already
exists in the RPC).

Sized: 15 minutes.

## 8. Course thumbnails on the list

`CourseListView.tsx` shows courses as text-heavy rows. Add a thumbnail (the
course's `image_url`, falling back to the studio's `default_course_image_url`).
Helps teachers scan the list visually.

Sized: 30 minutes.

## 9. IA disambiguation — Påmeldinger vs Deltakere tab

Two views into signup data is fine — they serve different mental models:

- **`/teacher/signups` (Påmeldinger)** — chronological activity log across all
  courses. "What's been happening?"
- **Course detail → `Deltakere` tab** — per-course roster. "Who's in this
  course?"

The fix is **lean into the distinction visually**, not delete one. Päameldinger
becomes more activity-feed-shaped (chronological, dated cards) than
table-shaped. Course → Deltakere stays as a roster table. Same data, different
shape.

Plus: persistent **"Vis offentlig side"** affordance somewhere always-visible
in the dashboard chrome (topbar or course header), so teachers always have a
direct path to "what students see."

Sized: half day for both combined.

## 10. Open questions (decide before each piece starts)

- **(none — all questions for this round are answered. Add to this section if
  new ones surface during execution.)**

## 11. Suggested execution order

1. **CLAUDE.md design-system rewrite** — calibration shift rules (dashboard
   inverted, public unchanged). One commit. Sets the rule for everything else.
2. **Phone field on booking form** — 15-min correctness fix.
3. **Course thumbnails** — easy, satisfying.
4. **Multi-day events** — verify + minimal UI add.
5. **Dashboard sweep** — apply the new CLAUDE.md rules across `/teacher/**`.
   Multi-day chunked work, one surface per commit.
6. **IA disambiguation** — Päameldinger reshape + persistent public-view affordance.
7. **Premade tier templates** — replace `CoursePricingTab` + `TicketTypeForm`.
8. **Late-signup auto-prorate** — schema column + booking-page UX + RPC math.
9. **Spaces → Studios refactor** — biggest, last because URLs change. We want
   URLs stable for the demo first.

## 12. Deferred (post-launch)

| Item | Notes |
|---|---|
| **Klippekort + student accounts** | Punch cards (`ticket_kind = 'pass'` is reserved). Couples with student-user accounts (a real auth identity for buyers, not just guest signups). Both deferred together. |
| **Gift cards** | Dintero supports natively. Worth flagging the integration when we get to it. |
| **Auto-prorate floor** | Per-course minimum-weeks rule (e.g. "stop showing late signup with fewer than X weeks left"). Add if any teacher asks. |
| **Multi-org-per-user** | Currently one user → one org. Constraint relaxation needed if a teacher wants to be both a freelance brand AND an admin of a shared studio AND a renter at a third studio with separate billing. None of the current prospects need this. |
| **Studio team display** | Multi-member studios show a "Lærere" section listing actual humans (instructors aggregated from `course_instructors`). Privacy toggle on `studio_members.show_on_public_page` (default `true`). Sort order TBD. Skip the section entirely on solo studios. |
| **Online classes (own scope)** | `course_type = 'online'` already exists in the enum, but the experience needs its own design pass. Distinct from physical: streaming infra (Zoom / Mux / Daily / something else), recording storage + replay access, subscription pricing not per-course, capacity model often N/A, no physical location, couples with student-account flow. Treat as a v2 product feature, not a bolt-on. |

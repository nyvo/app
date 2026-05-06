# Post-MVP information architecture & user journeys

> Companion to `tasks/post-mvp-feedback.md`. Maps every page that exists in
> the *new* direction (post-Studios refactor, post-tier-templates, post-IA
> split) and the user paths through them. Source of truth for routes and
> dead-end checks before any visual work starts.
>
> Conventions:
> - **bold** = page exists today.
> - _italic_ = new in the post-MVP direction.
> - `~~strike~~` = removed in the post-MVP direction.
> - `[A]` = auth required (teacher). `[P]` = public (no auth).

---

## 1. Sitemap

### 1.1 Public surface `[P]`

```
/                                  Landing page (marketing)
/signup                            Teacher signup (start trial)
/login                             Teacher login
/forgot-password                   Password reset request
/reset-password                    Password reset (token in URL)
/confirm-email                     Email confirmation landing
/terms                             Terms of service

/studio/<slug>                     Studio overview (was: /studio + /space — unified)
                                     ├─ Hero: studio name, image, blurb
                                     ├─ Upcoming-courses grid
                                     ├─ (deferred) Lærere section on multi-member studios
                                     └─ Footer: contact, links
/studio/<slug>/<courseId>          Course detail (canonical URL = OWNER's slug)
                                     ├─ Hero: image, title, schedule summary
                                     ├─ Description, instructor card
                                     ├─ Booking panel (right rail or sticky bottom)
                                     │    ├─ Tier picker (templates from §3 of feedback)
                                     │    ├─ "Pågår — siste N uker" prorated price (§5)
                                     │    ├─ Name + email + (NEW) optional phone (§7)
                                     │    └─ Terms + pay
                                     └─ "Andre kurs fra <owner studio>" rail

/checkout/success                  Post-Dintero return — confirms signup, shows email-sent state

~~/space/<slug>~~                  Removed; 301 → /studio/<slug>
```

Notes on the unified `/studio/<slug>`:
- One renderer covers solo studio (1 member org) and shared studio (N member
  orgs). Same data shape; member count is just a number.
- Course tiles link to `/studio/<owner-org-slug>/<courseId>`, never the
  current studio's slug. Bookmarks always land on the canonical page.
- Direct-URL hits render the course page as a normal scrollable document.
  Card clicks within `/studio/<slug>` mount the detail page as an overlay
  on top of the studio overview (current `backgroundLocation` pattern stays).

### 1.2 Auth surface `[A]` — teacher dashboard

Top-level navigation (left sidebar, two groups):

```
Oversikt
  Hjem                             /teacher              Dashboard home
  Timeplan                         /teacher/schedule     Calendar of all sessions

Administrer
  Kurs                             /teacher/courses      Course list
  Påmeldinger                      /teacher/signups      Activity feed (NEW shape — §9)
  Adresser                         /teacher/locations    Location library
  Betalinger                       /teacher/payments     Payouts + transactions
  Studio                           /teacher/studio       Studio settings (admin only — §4)
                                                         Hidden for non-admin members.
```

Detail pages (not in sidebar):

```
/teacher/new-course                Create course wizard
/teacher/courses/<id>              Course detail
  ├─ tab: Oversikt                 KPIs, sessions, quick actions
  ├─ tab: Deltakere                Per-course roster (table — §9)
  ├─ tab: Priser                   Tier templates panel (REPLACES editor — §3)
  └─ tab: Innstillinger            Course-level settings + DELETE
/teacher/profile                   Account + organization profile
```

`/teacher/messages` stays disabled pre-launch (`MESSAGES_DISABLED_PRE_LAUNCH`).

Persistent dashboard chrome (every `/teacher/**` page):
- Sidebar (collapsible)
- Topbar with breadcrumb + _**"Vis offentlig side"** affordance (§9)_ —
  always visible, deep-links to the teacher's primary studio when on a
  general page, and to the course's public page when on `/teacher/courses/<id>`.

### 1.3 Onboarding (§4 — replaces the current wizard)

Triggered post-signup, before first dashboard view, when
`profile.onboarding_completed_at IS NULL`:

```
WelcomeFlow (modal, two independent toggles, no skip on the wizard itself)
  Step 1: "Lag din egen studio-side?"
    ├─ Yes → slug picker → creates org + studio → /studio/<slug>
    └─ No  → no studio created under this teacher's org
  Step 2: "Bli med i en eksisterende studio?"
    ├─ Yes → invite-code input → joins existing studio
    └─ No  → skip
  Step 3 (terminal): "Du er klar." → /teacher
```

A teacher MUST have at least one path: either own studio (Step 1 = yes) OR
membership in a shared one (Step 2 = yes). If both = no, hold the wizard
open with a one-line nudge — there is no orphan-teacher state.

---

## 2. Core user journeys

Each journey lists the steps the user actually takes. Numbered = pages or
modals. Indented bullets = decisions or sub-steps. **Bold** = primary path.

### 2.1 Teacher: first-time setup → first course live

1. **`/signup`** — name, email, password
2. → email confirmation link → **`/confirm-email`** → **`/login`**
3. → first **`/teacher`** load triggers WelcomeFlow (§1.3)
   - Toggle 1 yes → pick slug → org + studio created
   - Toggle 2 no → skip
4. → **`/teacher`** dashboard home, empty state with "Opprett ditt første kurs" CTA
5. → **`/teacher/new-course`** wizard
   - Type: kurs / event / drop-in
   - Title, description, image
   - Schedule: weeks, weekday, time, **"Legg til en dag til" for multi-day events (§6)**
   - Location: pick from `/teacher/locations` or add new inline
   - Capacity
   - **Pricing: tier-template panel (§3) — toggle on Hele kurset, edit price, add Drop-in if relevant**
   - Late-signup: `allow_late_signup` toggle (default on, §5)
   - Publish
6. → **`/teacher/courses/<id>`** Oversikt tab — confirmation, share link, "Vis offentlig side" deep-links to `/studio/<slug>/<id>`

**No dead ends:** every step has a Back. The wizard's "Avbryt" returns to
`/teacher/courses` (or `/teacher` if it was empty). Save-and-exit drafts the
course (status = `draft`) and lands on `/teacher/courses` filtered to drafts.

### 2.2 Teacher: schedule a one-off session inside an existing course

The data model puts sessions under a course — there's no standalone
"schedule a session" entry point. Two paths reach the same modal:

- **From `/teacher/schedule`** — click an empty slot → "Velg kurs" → opens session-add modal scoped to that course.
- **From `/teacher/courses/<id>` Oversikt tab** — "Legg til økt" → session-add modal (course pre-selected).

Modal fields: date, start/end, location override (optional), notes. Save →
modal closes → calling page re-fetches → toast confirms.

**Edge cases without dead ends:** no courses exist yet on
`/teacher/schedule`? Empty-state CTA → `/teacher/new-course`. Course is
archived? Session-add disabled with tooltip explaining why.

### 2.3 Teacher: manage a booking (refund / cancel a signup)

1. **`/teacher/signups`** (activity feed, §9) — chronological list, search/filter by course, status, date.
2. Click a row → **signup detail modal** (overlay, doesn't break the feed scroll position).
   - Shows: participant name, email, phone (if given), course, paid status, payment timestamp.
   - **Progressive disclosure (§2):** "Detaljer" expander reveals Dintero transaction id, refund history, raw timestamps.
3. Actions in the modal: **Refunder**, **Avbestill (uten refundering)**, **Send melding** (disabled pre-launch).
4. → Confirm dialog (AlertDialog, destructive variant) → calls `process-refund` or `cancel-course` edge function → toast → modal stays open with updated state.

Same modal is reachable from **`/teacher/courses/<id>` → Deltakere tab** (per-course roster). Two surfaces, one modal — no duplicate-flow drift.

### 2.4 Teacher: edit pricing on an existing course

1. **`/teacher/courses/<id>`** → **Priser tab**.
2. Tier-template panel (§3): each row = template card with toggle + price input.
   - Hele kurset (always visible)
   - Halvkurs (visible only if `total_weeks > 16`)
   - Drop-in (always visible)
   - Early bird (always visible; toggling on auto-fills `sales_ends_at` and -10%)
3. Save → debounced or explicit "Lagre"; dirty-state badge in tab title; "Forkast endringer" available.
4. Validation errors render inline under the offending tier with `text-xs font-medium text-destructive`.

No dead ends: every error path stays on the tab. Save success → toast, no navigation.

### 2.5 Teacher: cancel an entire course

1. `/teacher/courses/<id>` → **Innstillinger tab** → "Avbestill kurs" (`destructive` button, bottom of tab).
2. AlertDialog: "Dette refunderer alle betalte påmeldinger og varsler deltakerne."
3. Confirm → calls `cancel-course` → background email job → spinner → success state shows refund summary.
4. Course status → `cancelled`. Card surfaces (this card and across `/teacher/courses`) flip to inactive treatment per design system.

### 2.6 Teacher: studio admin invites a renter (multi-member studio path)

1. `/teacher/studio` (admin only) → **Medlemmer** section.
2. "Generer invitasjonskode" → modal shows one-time code + copy button.
3. Admin shares the code out-of-band (email, SMS).
4. Renter goes through 2.1; in WelcomeFlow Step 2, enters the code → their org joins the studio.
5. Admin sees the renter under `Medlemmer` → can approve / remove (does NOT edit their courses — §4 ownership rule).

Non-admin members of the studio do NOT see `/teacher/studio` in the sidebar.

### 2.7 Student: browse → book a course (happy path)

1. **`/`** (landing) or direct link to **`/studio/<slug>`** → see grid of courses.
2. Click a course tile → **`/studio/<owner-slug>/<courseId>`** (canonical URL — §4).
3. Read description, see schedule, pick a tier in the **booking panel**.
   - If course is in progress (`Pågår` chip on the tile), tier picker only shows the prorated full-course price (§5: option (a) — full-price option disappears).
4. Enter name + email + **(optional) phone (§7)** + accept terms.
5. → Dintero session opens (embedded or redirect, depending on `dinteroEnvironment`).
6. → **`/checkout/success`** — confirmation page, "Vi har sendt en kvittering til <email>".
7. Welcome email + receipt arrive via `send-email` edge function.

**No dead ends:**
- Dintero failure → returns to course page with error toast and the form pre-filled.
- Already booked (same email)? RPC returns existing signup id → success page reads "Du er allerede påmeldt" instead of re-charging.
- Course full → tier card disabled, "Venteliste" CTA where wired (deferred to post-launch if not yet built).

### 2.8 Student: late signup to a course already started (§5)

1. `/studio/<slug>` → tile shows **`Pågår`** chip.
2. Click → `/studio/<owner-slug>/<courseId>` → booking panel shows
   "Hele kurset (8 uker igjen)" with the prorated price; original price
   struck through above.
3. Same form + Dintero flow as 2.7.
4. RPC sets `package_start_date = today`, `package_end_date = course.end_date`.
5. Per-session capacity uses both columns to scope counts (§5 schema gotcha).

If the teacher has set `allow_late_signup = false` on this course, the
prorated path is suppressed and the course tile shows "Påmelding stengt"
instead of the price.

### 2.9 Student: book a multi-day event / weekend retreat (§6)

Same as 2.7, except the booking panel shows the full session list ("Lør 3.
mai · 10:00–13:00", "Søn 4. mai · 10:00–13:00") above the tier picker. One
tier (Hele kurset) covers both days.

### 2.10 Teacher: change which studios their courses appear on

1. `/teacher/studio` → **Mine medlemskap** section — lists every studio this
   teacher's org belongs to.
2. "Forlat studio" on a row → AlertDialog confirming the courses will be
   removed from that studio's public page (but stay live on the teacher's
   own `/studio/<own-slug>`).
3. Confirm → `studio_members` row deleted → toast.

Reverse direction (joining a new studio) goes through invite code →
"Bruk invitasjonskode" CTA in the same section, opens the same input modal
the WelcomeFlow uses.

### 2.11 Teacher: see what students see (§9 persistent affordance)

Any `/teacher/**` page → topbar **"Vis offentlig side"** button:
- On `/teacher` / `/teacher/courses` / `/teacher/signups` / `/teacher/schedule` → opens `/studio/<own-slug>` in a new tab.
- On `/teacher/courses/<id>` → opens `/studio/<owner-slug>/<courseId>` in a new tab.
- Hidden in onboarding (no studio yet).

Single click, opens new tab → never traps the teacher away from the dashboard. Returns the same way every time.

---

## 3. Cross-cutting flows

### 3.1 Auth states the dashboard handles

| State | Behaviour |
|---|---|
| Not logged in, hits `/teacher/**` | `ProtectedRoute` → `/login?redirect=<path>` |
| Logged in, no `onboarding_completed_at` | `WelcomeFlow` covers the layout, sidebar suppressed |
| Logged in, completed | Standard dashboard |
| Logged in, but no studio (impossible post-onboarding) | Empty-state on `/teacher` with "Lag studio-side eller bli med i en" — cannot happen via the wizard but defended for safety |

### 3.2 Empty states (no dead ends)

| Where | Empty trigger | CTA path |
|---|---|---|
| `/teacher` | No courses | "Opprett ditt første kurs" → `/teacher/new-course` |
| `/teacher/schedule` | No sessions | "Opprett kurs for å fylle timeplanen" → `/teacher/new-course` |
| `/teacher/signups` | No signups | "Del din studio-side" → copy link to `/studio/<own-slug>` |
| `/teacher/courses/<id>` Deltakere tab | No signups for this course | Same copy-link CTA, scoped to course canonical URL |
| `/teacher/locations` | No saved locations | "Legg til en adresse" inline form |
| `/teacher/payments` | No payouts yet | Onboarding-status panel (Dintero seller approval state — pre-MVP feedback memory says approval pending 2026-04-20) |
| `/teacher/studio` (admin, no members) | Solo studio | Invite-code generator visible; "Ingen andre lærere ennå" copy |
| `/studio/<slug>` (public) | No upcoming courses | "Ingen kurs akkurat nå" — landing CTA still present |

### 3.3 404 / not-found

`/teacher/courses/<id>` with bad id → render the page's existing
error-state (course not found copy + "Tilbake til kurs" → `/teacher/courses`).
`/studio/<bad-slug>` and `/studio/<slug>/<bad-id>` → the existing public
`NotFoundPage` with "Tilbake til forsiden" → `/`.

### 3.4 Mobile vs desktop

Same routes, same flows. Sidebar collapses to a hamburger on `<md`. Course
detail tabs become a `<select>` or stacked sections (existing pattern).
Booking panel becomes sticky bottom sheet on mobile course detail.

---

## 4. Dead-end audit (every dead-end potential checked)

| Risk | Mitigation |
|---|---|
| WelcomeFlow with both toggles = no | Wizard refuses to complete, holds on Step 1 with helper text |
| Course in `cancelled` state, click from feed | Detail page renders read-only with "Avbestilt" banner; no actions |
| Refunded signup in feed | Modal opens, all action buttons disabled with explanation |
| Dintero seller not yet approved | `/teacher/payments` shows pending-approval panel, blocks payouts but does NOT block course creation |
| Public link clicked while course full | Tier picker disabled with "Fullt" — page itself stays viewable |
| `/space/<slug>` deeplink in the wild | 301 → `/studio/<slug>` (slug carries over) |
| Browser back from overlay course detail | Returns to `/studio/<slug>` at exact scroll position (existing `backgroundLocation` pattern) |
| Browser back from `/checkout/success` | Lands on the course page, not back into Dintero |
| Teacher leaves their last studio | Same defensive empty-state as §3.1 last row |

---

## 5. What's NOT in this map

These are intentional omissions, not gaps:

- **Klippekort / passes** — deferred (§12 of feedback).
- **Student accounts** — deferred; current flow is guest-checkout via email.
- **Online courses** — `course_type = 'online'` exists in the enum but the experience is its own v2 design pass.
- **Studio team display ("Lærere" section)** — deferred, will slot into `/studio/<slug>` later with a privacy toggle.
- **Messages** — `MESSAGES_DISABLED_PRE_LAUNCH`, route + sidebar entry stay commented.

---

## 6. What this unlocks

With this map locked, downstream work can proceed independently:

1. Wireframes for `/studio/<slug>` (one renderer, both topologies).
2. The `/teacher/courses/<id>` Priser tab redesign (§3) has a clear scope.
3. The `/teacher/signups` activity-feed reshape (§9) has a clear scope and a
   per-row modal contract shared with Course → Deltakere.
4. The Studios refactor (§4) has a complete URL inventory + redirect plan.
5. The dashboard sweep (§2 of feedback) can sweep page-by-page with the
   list above as the surface inventory.

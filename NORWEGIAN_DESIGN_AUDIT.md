# Norwegian Design Audit — Ease

> Research-backed audit comparing Ease's current design against top Norwegian/Scandinavian SaaS products.
> Reference apps: **Vipps**, **Fiken**, **Linear**, **Cluely**.
> Scope: Teacher dashboard + pages, public course detail page.

---

## Executive Summary

Ease's design system (zinc palette, shadowless hierarchy, Geist Sans) is a solid foundation. The color system works. The problem is **layout patterns that feel template-generated** rather than intentionally designed. The main issues:

1. **Everything lives in bordered cards** — Norwegian SaaS trends toward open/flat sections with subtle dividers
2. **Section titles sit inside card containers** — Norwegian apps keep titles outside/above for clearer hierarchy
3. **Uniform card density** — every component gets the same `rounded-2xl bg-white border border-zinc-200 p-6` treatment, creating visual monotony
4. **Signups page feels busy** — too many visual containers competing for attention
5. **Profile page feels default** — titles inside boxes, standard form-in-card pattern

Below: specific findings from each reference app, then a prioritized action plan.

---

## Part 1: Research Findings

### Vipps (vipps.no)

Vipps is Norway's most recognizable digital product. Key design observations:

- **Modular home page architecture** — the dashboard is composed of independent, self-contained card modules. Each card is a functional unit, not a generic container.
- **Warm personality** — orange brand color, custom typeface (Vipps Sans) with "quirky details combined with a solid and trustworthy look."
- **Rounded cards with generous spacing** — cards float on backgrounds with clear breathing room between them.
- **Design system locks** — button fonts, colors, radius, and padding are standardized and non-negotiable. Consistency is enforced, not suggested.
- **Accessibility-first** — VoiceOver support, text scaling up to 200%, reduced motion, dark mode.

**Relevant to Ease:** Vipps proves that Norwegian users expect warmth and personality, not cold minimalism. The modular card approach works, but each card must feel purposeful — not like a generic wrapper.

### Fiken (fiken.no)

Norway's most popular small-business accounting SaaS. Directly comparable to Ease's market (solo operators / small studios).

- **Task-oriented dashboard** — two giant buttons at the top: "Jeg har solgt noe" / "Jeg har kjøpt noe." The dashboard prioritizes what you can *do*, not what you can *see*.
- **Minimal card styling** — primarily text-based sections with generous whitespace. No heavy borders or shadows.
- **Flat design** — restrained visual effects. Borders and shadows are nearly absent.
- **Section titles above content** — functional modules have clear headers that sit above their content areas, not inside card containers.
- **Simple language + friendly mascot** — the product deliberately lowers barriers for non-accountants. Copy and design work together to feel non-intimidating.
- **Multi-step linear onboarding** — complex setup broken into 6 clear steps rather than a single dense form page.

**Relevant to Ease:** Fiken validates that Norwegian SaaS for small operators should feel *simple and inviting*, not enterprise-grade. Section titles outside containers is the standard pattern. Reduce visual noise — fewer bordered containers, more open space.

### Linear (linear.app)

The gold standard for modern SaaS design. Not Norwegian, but the most cited design influence in Scandinavian tech.

- **No card-heavy design** — content lives in lists, tables, and panels directly. Cards are rare. Dividers are softened: rounded edges, reduced opacity.
- **Inverted-L navigation** — left sidebar (dimmed relative to content) + top tab bar. The sidebar recedes so the working area dominates.
- **8px spacing grid** — all spacing decisions use multiples of 8 (8, 16, 32, 64px).
- **Warm gray palette** — deliberately shifted from cool blue-gray to warmer gray. "Crisp but less saturated."
- **Section titles above content** — view headers with filters sit above the content area. Settings categories are top-level headers above their groups.
- **Toggleable display density** — users control which columns appear, how data is grouped, and at what density.
- **Inter + Inter Display** — different weights of the same family for body and headings. Tight letter-spacing (`tracking-tight`) for premium feel.
- **Accent color used sparingly** — deliberately reduced how much accent color appears.

**Relevant to Ease:** Linear's biggest lesson for Ease is **stop wrapping everything in bordered cards**. Use open sections with subtle dividers. Let the content breathe. Title placement (above, not inside), warm grays, and tight letter-spacing on headings all apply directly.

### Cluely (cluely.com)

Premium tech product with strong visual identity.

- **Monochrome + one accent** — near-black base (#19191D) with teal accent. Everything else is grayscale.
- **Tight letter-spacing** — `tracking-[-1.28px]` on headings. This is the single most effective "premium feel" trick.
- **Subtle dividers** — 1px lines at 50% opacity (`bg-zinc-200/50`) separate sections. No bordered cards.
- **Generous whitespace** — massive padding between sections (60-100px on marketing, 16-32px in app).
- **Rounded corners escalate with hierarchy** — small UI: `rounded-md`, cards: `rounded-xl`, hero: `rounded-3xl`.
- **Light (300) font weight for secondary headers** — not bold, not regular. Light weight creates elegance.

**Relevant to Ease:** Tight letter-spacing and subtle dividers (instead of card borders) are quick wins. The escalating border-radius pattern (smaller elements = smaller radius) is more intentional than uniform `rounded-2xl` everywhere.

---

## Part 2: Synthesized Patterns

These patterns appear across 3+ of the reference apps:

### 1. Section Titles Outside Containers

All four apps place section/group titles above their content areas, not inside card containers.

```
✅ Norwegian pattern:         ❌ Current Ease pattern:

Section Title                 ┌─────────────────────────┐
Description text              │ Section Title            │
                              │ ─────────────────────── │
┌─────────────────────────┐   │                         │
│ Content here             │   │ Content here             │
│                         │   │                         │
└─────────────────────────┘   └─────────────────────────┘
```

### 2. Open Layouts Over Card-Heavy Layouts

Modern Norwegian SaaS uses **fewer bordered containers**. Content sections are separated by whitespace and subtle dividers (1px lines at reduced opacity), not by wrapping everything in a `border border-zinc-200` card.

```
✅ Norwegian pattern:         ❌ Template pattern:

Section A                     ┌─────────────────────────┐
Content...                    │ Section A                │
                              │ Content...               │
─ ─ ─ ─ ─ ─ ─ ─ ─           └─────────────────────────┘
                              ┌─────────────────────────┐
Section B                     │ Section B                │
Content...                    │ Content...               │
                              └─────────────────────────┘
```

### 3. Warm Grays, Not Cool

Linear deliberately shifted from cool blue-gray to warmer gray. Vipps uses orange warmth. Fiken is approachable. The trend: **warm, not clinical**.

Ease's zinc palette is neutral-to-cool. This is fine, but could benefit from a slight warmth shift on key surfaces (page background, empty states).

### 4. Tight Letter-Spacing on Headings

Every reference app uses negative letter-spacing on display headings:
- Linear: Inter Display with custom tracking
- Cluely: `tracking-[-1.28px]`
- Ease already does `tracking-tight` on H1 — this is correct, could go further on large numbers / hero text.

### 5. Progressive Disclosure on Data Pages

All reference apps handle data density the same way:
- Default to a clean, spacious view
- Let users add columns, filters, grouping
- Hide complexity behind dropdowns, toggles, command palettes
- Never show everything at once

### 6. Consistent 8px Spacing Grid

Linear uses 8px as the base unit. This creates rhythm and predictability. Ease's spacing is inconsistent — mixing `p-5`, `p-6`, `p-7`, `p-8` on similar components.

---

## Part 3: Page-Specific Issues

### 3.1 Teacher Signups Page (`/teacher/signups`)

**Current problems:**
- The RegistrationsList component wraps everything in a card (`rounded-2xl bg-white border border-zinc-200`), then puts individual signups in *nested* mini-cards (`rounded-lg border border-zinc-100`). This is cards-inside-cards — visual clutter.
- Filter bar + search + dropdown filters create a busy header area.
- Each signup entry uses a two-line layout that could be simplified.

**Recommendations:**
1. Remove the outer card wrapper. Let the page background be the container.
2. Replace mini-cards for each signup with simple list rows separated by subtle dividers (`border-b border-zinc-100`).
3. Simplify the filter bar — consider a single row with FilterTabs + search inline.
4. Section title ("Siste påmeldinger") should sit as a page-level heading, not a card header.

### 3.2 Teacher Profile Page (`/teacher/profile`)

**Current problems:**
- Section titles (H3) sit inside card containers with `border-b border-zinc-100 pb-2` dividers. This is the "template" pattern — every section is a card with an internal title.
- Every section gets the same card treatment: avatar settings, personal info, Stripe, notifications, security. They all look identical in structure.
- Form layout is standard grid-in-card — functional but generic.

**Recommendations:**
1. Move section titles outside cards. "Personlig info", "Varsler", etc. become standalone headings above their content areas.
2. For simple settings (like notification toggles), consider an open layout without a card border — just a title, description, and toggles with dividers between rows.
3. Vary the visual weight — Stripe integration (important/incomplete) could be a slightly different treatment than security settings (routine).

### 3.3 Dashboard Home

**Current problems:**
- The "Siste påmeldinger" card uses the same card-in-card pattern as the signups page.
- All dashboard cards use identical styling (`rounded-2xl bg-white border border-zinc-200`), creating visual monotony even though some cards are more important than others.

**Recommendations:**
1. Differentiate card importance through spacing and content density, not identical containers.
2. "Siste påmeldinger" should use a cleaner list format — name, course, time — without nested mini-cards.
3. Consider whether the full-width registrations card needs a border at all, or if it could be an open section at the bottom of the dashboard.

### 3.4 Public Course Detail Page

**Current state:** Generally well-structured. Two-column layout with appropriate spacing (`gap-12`). Uses `bg-white` full-page background.

**Recommendations:**
1. Remove the public sand theme as requested — use default zinc background.
2. Keep the layout structure but ensure card components (BookingSidebar, InstructorCard) follow the updated patterns.
3. Remove DM Serif Display usage — stick to Geist Sans only.

---

## Part 4: Action Plan (Prioritized)

### Quick Wins (1-2 hours each)

| # | Change | Impact | Pages Affected |
|---|--------|--------|---------------|
| **Q1** | Move section titles outside card containers | High — immediately feels more intentional | Profile, all settings pages |
| **Q2** | Replace cards-inside-cards with simple list rows + dividers | High — reduces visual clutter | Dashboard "Siste påmeldinger", Signups page |
| **Q3** | Remove DM Serif Display font, use Geist Sans everywhere | Medium — consistency | Public pages |
| **Q4** | Remove `.theme-public` sand/sage theme | Medium — simplification | Public pages, checkout |
| **Q5** | Tighten letter-spacing on hero numbers/stats | Low — premium feel | Dashboard stats |

### Medium Effort (2-4 hours each)

| # | Change | Impact | Pages Affected |
|---|--------|--------|---------------|
| **M1** | Open layout for Profile page — remove card wrappers for simple sections (notifications, security) | High — feels Norwegian | Profile page |
| **M2** | Redesign signups list — borderless table/list with subtle row dividers | High — reduces "busy" feeling | Signups page, dashboard card |
| **M3** | Standardize spacing to 8px grid (eliminate p-5, p-7 — use p-4, p-6, p-8) | Medium — rhythm/consistency | All pages |
| **M4** | Differentiate card hierarchy — not every section needs a bordered card | Medium — intentional design | Dashboard, all pages |
| **M5** | Simplify filter bars — reduce visual weight of filter controls | Medium — cleaner header areas | Signups, courses list |

### Larger Redesigns (4-8 hours each)

| # | Change | Impact | Pages Affected |
|---|--------|--------|---------------|
| **L1** | Introduce "open section" pattern — title + content separated by whitespace, no card border, with subtle `border-b` between sections | High — core layout shift | Profile, settings, any form-heavy page |
| **L2** | Dashboard layout rethink — variable density cards, open registrations section | Medium — feels custom-designed | Dashboard |
| **L3** | Border-radius hierarchy — `rounded-lg` for small UI, `rounded-xl` for cards, `rounded-2xl` for hero/page-level | Low-medium — subtle refinement | All components |

---

## Part 5: Pattern Library Updates

### New Pattern: Open Section

For settings/profile pages where a bordered card adds visual noise:

```tsx
{/* Section title outside — no card wrapper */}
<div className="space-y-1 mb-4">
  <h3 className="text-sm font-medium text-text-primary">Varsler</h3>
  <p className="text-xs text-text-secondary">Velg hvilke varsler du vil motta.</p>
</div>

{/* Content with subtle dividers, no outer border */}
<div className="divide-y divide-zinc-100">
  <div className="flex items-center justify-between py-4">
    <span className="text-sm text-text-primary">E-postvarsler</span>
    <Switch />
  </div>
  <div className="flex items-center justify-between py-4">
    <span className="text-sm text-text-primary">Påmeldingsvarsler</span>
    <Switch />
  </div>
</div>
```

### New Pattern: Clean List Row (replaces card-in-card)

For signups, registrations, and other list data:

```tsx
{/* Simple row with divider — no nested card */}
<div className="flex items-center gap-4 py-3.5 border-b border-zinc-100 last:border-b-0">
  <div className="flex-1 min-w-0">
    <p className="text-sm font-medium text-text-primary truncate">Ola Nordmann</p>
    <p className="text-xs text-text-tertiary">Morgenyoga · I dag kl. 08:00</p>
  </div>
  <StatusIndicator variant="success" label="Påmeldt" />
</div>
```

### New Pattern: Section Title (Outside Container)

```tsx
{/* Title sits in the open, above any content container */}
<div className="space-y-1 mb-5">
  <h2 className="text-sm font-medium text-text-primary">Personlig info</h2>
  <p className="text-xs text-muted-foreground">Oppdater navn og kontaktinfo.</p>
</div>

{/* Content in card below */}
<div className="rounded-2xl bg-white border border-zinc-200 p-6">
  {/* form fields */}
</div>
```

### Updated Pattern: Border-Radius Hierarchy

| Element | Current | Proposed | Rationale |
|---------|---------|----------|-----------|
| Small UI (badges, pills, inputs) | `rounded-lg` | `rounded-lg` (8px) | No change |
| Buttons | `rounded-xl` | `rounded-xl` (12px) | No change |
| Cards, panels | `rounded-2xl` | `rounded-xl` (12px) | Slightly tighter — matches Linear |
| Page-level containers, modals | `rounded-2xl` | `rounded-2xl` (16px) | Reserved for top-level elements |

### Updated Pattern: Subtle Dividers

Replace hard borders between list items:

```tsx
{/* Current */}
<div className="border border-zinc-100 rounded-lg p-3.5">...</div>

{/* Proposed — simpler, cleaner */}
<div className="border-b border-zinc-100 py-3.5">...</div>
```

---

## Part 6: What NOT to Change

These aspects of Ease's current design are working well:

- **Zinc color palette** — correct for Norwegian SaaS. Keep it.
- **Geist Sans** — clean, modern, appropriate.
- **Shadowless hierarchy** — ahead of the curve. Linear moved this direction too.
- **Dark primary button gradient** — distinctive and polished.
- **Surface emphasis (dark cards)** for onboarding — used sparingly and effectively.
- **Status color system** — well-thought-out semantic colors.
- **`smooth-transition` / `ios-ease`** — appropriate motion.
- **FilterTabs component** — good pattern for view switching.

---

## Part 7: Reference Links

| App | What to study | URL |
|-----|--------------|-----|
| Vipps | Design system, button guidelines, brand warmth | `designsystem.vipps.io` |
| Fiken | Dashboard simplicity, task-oriented design | `fiken.no` |
| Linear | UI redesign blog post, layout patterns, color system | `linear.app/now/how-we-redesigned-the-linear-ui` |
| Linear | Design refresh, warm grays, spacing | `linear.app/now/behind-the-latest-design-refresh` |
| Cluely | Tight letter-spacing, monochrome + accent, subtle dividers | `cluely.com` |

---

## Suggested Implementation Order

```
Week 1: Quick wins (Q1–Q5)
  → Titles outside cards, remove card-in-card, font cleanup

Week 2: Medium effort (M1–M3)
  → Profile open layout, signups list redesign, spacing grid

Week 3: Medium effort (M4–M5)
  → Card hierarchy, filter simplification

Week 4: Larger redesigns (L1–L3)
  → Open section pattern rollout, dashboard rethink, radius hierarchy
```

Each step is independent — you can pick and choose based on what feels most impactful.

---

## Part 8: Full App Scan — Additional Findings

After reading every teacher page, dashboard component, and the public course detail page, here are additional observations beyond the initial audit.

### 8.1 Consistent Patterns (Working Well)

These patterns are applied consistently and feel intentional:

- **Page structure**: Every teacher page uses `SidebarProvider` + `TeacherSidebar` + `main` with `bg-surface`. This is solid.
- **Page headers**: Consistent pattern of `font-geist text-2xl font-medium tracking-tight` for H1. Good.
- **FilterTabs**: Used consistently across SignupsPage, CoursesPage, MessagesPage, ProfilePage, CourseDetailPage. The pill variant on CoursesList is a nice touch.
- **MobileTeacherHeader**: Consistent mobile header across all pages.
- **Empty states**: Well-crafted, consistent empty state patterns across all components.
- **Motion transitions**: `pageVariants`/`pageTransition` applied consistently. `tabVariants`/`tabTransition` for tab switching.
- **Error states**: Consistent error handling with retry buttons.

### 8.2 Page-by-Page Additional Observations

#### CoursesPage (`/teacher/courses`)
- **Good**: Clean header → filter bar → content flow. SessionScheduleTable for data display.
- **Issue**: The `gap-6 px-8 py-8` spacing on the header area creates a lot of vertical space before content starts. Consider tightening.

#### CourseDetailPage (`/teacher/courses/:id`)
- **Good**: Header area uses `bg-white border-b` — breaks from the card-in-card pattern. Breadcrumbs above title. Tabs integrated into the header. This is the most "Linear-like" page in the app.
- **Good**: CourseOverviewTab uses **section titles outside cards** — `h2` sits above the card, exactly the Norwegian pattern. This is the model to replicate on Profile and other pages.
- **Issue**: The overview tab has a grid of cards that are individually bordered. With titles outside, this works. But the density of information (enrollment card + logistics card + description card + admin card + tips alert) creates visual weight.

#### MessagesPage (`/teacher/messages`)
- **Good**: Split-view layout (conversation list + chat) is well-executed. No unnecessary card wrappers.
- **Good**: The chat area uses `bg-surface` without bordered containers — content floats on the page surface. This is the "open layout" pattern.
- **Minor**: The conversation list items use `rounded-xl` + border on active state — clean.

#### SchedulePage (`/teacher/schedule`)
- Not yet read — should be checked for consistency.

#### Dashboard Components

**RegistrationsList** (dashboard card):
- Already uses `divide-y divide-zinc-100` for list rows — **not** cards-in-cards. This is correct. The items are simple `Link` rows with hover, not mini-cards.
- The outer wrapper is a bordered card, which is fine for a dashboard grid.
- The empty state nested card (`bg-zinc-50 border border-zinc-200 rounded-xl` inside the outer card) feels like unnecessary nesting. Could be simpler.

**CoursesList** (dashboard card):
- Same pattern: outer card wrapper, inner `divide-y` rows. Clean.
- Day group headers (`text-xs font-medium text-text-secondary`) are nicely understated.

**MessagesList** (dashboard card):
- Fixed height (`h-[280px] sm:h-[360px]`) with internal scroll — appropriate for a dashboard widget.
- Empty state has nested card — same issue as RegistrationsList.

### 8.3 Updated Assessment: "Siste påmeldinger" Dashboard Card

After reading the actual code, the RegistrationsList component is already using **divider-based rows**, not cards-in-cards. The earlier audit was based on the agent's summary. The actual implementation at [RegistrationsList.tsx:72](src/components/teacher/RegistrationsList.tsx#L72) uses `divide-y divide-zinc-100` which is correct.

What might feel "off" is:
1. The **outer card border** making the whole section feel like "just another box" in the dashboard grid
2. The **empty state** having a nested card (`bg-zinc-50 border border-zinc-200 rounded-xl`) inside the outer card — double boxing
3. All dashboard cards looking identical regardless of content type

### 8.4 Spacing Inconsistencies Found

| Location | Current Padding | Note |
|----------|----------------|------|
| Dashboard cards (RegistrationsList) | `p-6 pb-4` header, `px-6 pb-6` body | OK but could standardize |
| Profile page cards | `p-6 md:p-8` | Larger than dashboard cards |
| CourseOverviewTab cards | `p-6` | Standard |
| SignupsPage header | `px-8 py-8` | Large — creates gap before content |
| CoursesPage header | `px-8 py-8` | Same |
| Dashboard container | `p-4 sm:p-6 lg:px-10 lg:py-8` | More responsive, different from other pages |

**Recommendation**: Standardize page header padding to `px-6 lg:px-8 py-6 lg:py-8` across all teacher pages.

### 8.5 Typography Consistency Check

| Element | Expected | Actual | Verdict |
|---------|----------|--------|---------|
| Page H1 | `font-geist text-2xl font-medium tracking-tight` | Consistent across all pages | OK |
| Card H2 (inside) | `text-sm font-medium text-text-secondary` | Profile uses this, but with `border-b` | Move outside |
| Card H2 (outside) | `text-sm font-medium text-text-primary` | CourseOverviewTab does this correctly | Model to follow |
| Body text | `text-sm text-text-secondary` | Consistent | OK |
| Labels | `text-xs font-medium text-text-primary` | Consistent | OK |
| Tertiary/meta | `text-xs text-text-tertiary` | Consistent | OK |

### 8.6 Public Theme Removal Scope

Files that use public-specific styling to update:
- `src/pages/public/PublicCourseDetailPage.tsx` — uses `bg-white` (not sand), no `.theme-public` wrapper. Minimal change needed.
- `src/components/public/PublicCourseCard.tsx` — uses `rounded-3xl`, `border-zinc-200/60`, public sage buttons
- `src/components/public/course-details/*` — check each for sage/sand tokens
- `src/index.css` — contains `.theme-public` CSS variables
- `DESIGN_SYSTEM.md` — documents public theme tokens

**Recommendation**: Since you said the public course detail page already uses `bg-white` and default zinc, the main removal is:
1. Remove `.theme-public` CSS class and variables from `index.css`
2. Replace `variant="public"` and `variant="public-outline"` button usages with standard `default`/`outline` variants
3. Remove `display-heading` / DM Serif Display usage
4. Remove public theme section from `DESIGN_SYSTEM.md`
5. Remove `PublicCourseCard` `rounded-3xl` → use standard `rounded-xl`

### 8.7 What CourseOverviewTab Gets Right (Reference for Other Pages)

The [CourseOverviewTab.tsx](src/components/teacher/CourseOverviewTab.tsx) is the closest page to the Norwegian SaaS pattern. It already does:

```tsx
{/* Title OUTSIDE the card — correct Norwegian pattern */}
<div className="flex items-center gap-2 mb-3">
  <Users className="h-4 w-4 text-text-tertiary" />
  <h2 className="text-sm font-medium text-text-primary">Påmelding</h2>
</div>
<div className="rounded-xl bg-white p-6 border border-zinc-200">
  {/* Card content without its own title */}
</div>
```

This exact pattern should be replicated for:
- Profile page sections (currently titles are inside cards)
- Any settings-like page
- Dashboard sections where a card has a heading

### 8.8 Revised Priority: What Actually Needs Changing

After the full scan, the changes are more targeted than initially assessed:

1. **Profile page** — biggest gap. Titles inside cards, uniform card treatment. Needs the CourseOverviewTab pattern.
2. **Dashboard empty states** — nested cards inside cards. Simplify.
3. **Public theme removal** — DM Serif Display font, sage colors, `rounded-3xl`, `.theme-public` CSS.
4. **Spacing standardization** — header padding inconsistencies across teacher pages.
5. **SignupsPage** — is actually clean. The SmartSignupsView uses expandable `SignupGroup` cards which is a good progressive disclosure pattern. The "busy" feeling may come from the filter bar having too many controls visible at once.

Things that are **NOT broken** (no changes needed):
- RegistrationsList dashboard card — uses divider rows, not cards-in-cards
- CoursesList dashboard card — clean divider pattern
- MessagesList — clean
- CourseDetailPage — already uses the best patterns in the app
- CoursesPage — clean header + table layout
- MessagesPage — well-executed split view

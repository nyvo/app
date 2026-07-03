# Responsiveness Audit — Plan & Handoff

> **For:** the auditing agent. **Goal:** find and document every place the app
> breaks, degrades, or feels wrong across viewport sizes — then propose fixes
> that respect the existing design system. This is an **audit-and-report** task
> first; do not start editing until the findings are reviewed unless told otherwise.

---

## 1. Stack & constraints (read before touching anything)

- **React 19 + Vite + React Router 7.** Tailwind **v4** (CSS-first — config lives in
  `src/index.css` under `@theme inline`, there is **no `tailwind.config.js`**).
- **Breakpoints are Tailwind defaults** (no overrides in `index.css`):
  `sm 640`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1536`.
- **The app's own mobile cutoff is `768px`** — `src/hooks/use-mobile.ts`
  (`MOBILE_BREAKPOINT = 768`). The sidebar, notifications popover, and confirm
  dialog all branch on this. Treat **`md` (768px) as the primary phone↔desktop
  seam.**
- **shadcn/ui + Radix** primitives, **framer-motion**, **recharts**, **sonner**
  (toasts), **vaul** (drawer), **Geist Variable** font.
- **Design system is fixed** — do not introduce new colors, font weights, or
  widths. Honor these (from `CLAUDE.md` + design memory):
  - Currency via `formatKroner()` only.
  - Every heading `font-medium tracking-tight` — **never** `font-semibold`/`font-bold`.
  - Teacher pages are always `mx-auto max-w-6xl`, centered, via `PageShell`.
    Inner constraint is `narrow="centered"` (`max-w-3xl`) or `narrow="left"`.
  - Selectable cards use `ring-foreground`, never brand/periwinkle.
  - Don't mix text colors on one line.
- **Existing responsive utilities** already in `index.css` — reuse, don't reinvent:
  `.touch-target` (44px min), `.safe-area-bottom` / `.safe-area-top`
  (`env(safe-area-inset-*)`), `.no-scrollbar`, `.custom-scrollbar`,
  `.no-select`, `.touch-manipulation`.

---

## 2. The two surfaces (audit them separately — different bars)

### A. Public / customer-facing (mobile is CRITICAL — buyers book on phones)
Already has the most responsive work; bugs here cost real bookings.
- Pages: `LandingPage`, `PublicCoursesPage` (`/:slug`),
  `PublicCourseDetailPage` (`/:slug/:courseSlug`),
  `CheckoutPage` (`/:slug/:courseSlug/pamelding`), `CheckoutSuccessPage`,
  `AuthPage`, `JoinPage`, `AboutPage`, `TermsPage`, `PrivacyPage`, `NotFoundPage`,
  `OnboardingPage`.
- Components:
  `components/public/studio/*` (CourseCard, StudioMonthGrid, StudioMonthSchedule),
  `components/public/course-details/*` (CourseHero, CourseSessions, LocationCard,
  BookingRailLite).
- Chrome: there is **no shared public layout** — public pages compose their own
  page chrome.

### B. Teacher / dashboard app (authenticated, behind `TeacherLayout`)
Desktop-first historically — **this is where the risk concentration is** (most
pages use few/no responsive prefixes; see §4). Bar: must be *usable* and not
broken on phone/tablet, even if not as polished as the public side.
- Layout: `TeacherLayout` → shadcn **`Sidebar`** (`components/ui/sidebar.tsx`).
  Desktop = fixed 16rem rail (`md:block`); mobile = off-canvas **Sheet**
  (18rem) toggled by `SidebarTrigger`. The trigger lives in
  **`MobileTeacherHeader`** (`flex md:hidden`), which each page renders itself
  with a title string.
- Page frame: **`PageShell`** (`components/teacher/PageShell.tsx`) —
  `mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-6 md:pb-12 lg:px-8 lg:pt-12`.
- Pages: `TeacherDashboard` / `BuyerDashboard` (via `DashboardRouter`),
  `SchedulePage`, `CoursesPage`, `CoursePage`, `StudioPage`, `CollaborationPage`,
  `PaymentsPage`, `TeacherProfilePage`, `GetStartedPage`, `HelpPage`.
- Heavy interactive surfaces (common mobile pain points): the drawer family —
  `CourseDrawer`, `ParticipantDetailDrawer`, `AddParticipantDrawer`,
  `CreateCourseDrawer`, `SendCourseMessageDrawer`; tables via `CourseListView`
  + `ui/table.tsx`; charts via `dashboard/IncomeChart.tsx` (recharts);
  `SessionsModal`, `PublishCourseDialog`, notifications popover/feed.

### Excluded
`src/pages/dev/*` (DEV-only preview galleries, tree-shaken from prod — `App.tsx`
gates them on `import.meta.env.DEV`). **Do not audit `/dev/*`.**

---

## 3. Method

### Viewport matrix (test each surface at all of these)
| Width | Represents | Why |
|------|------------|-----|
| **320px** | small phone (iPhone SE) | worst-case overflow |
| **375–390px** | typical phone | the common case |
| **768px** | the `md` seam / small tablet portrait | sidebar & header swap here — test 767 **and** 768 |
| **1024px** | tablet landscape / small laptop | `lg` kicks in |
| **1280px+** | desktop | the design baseline |

Also check: **landscape phone** (short height — watch sticky bars, modals,
`100dvh`) and **text-zoom / 200%** if time allows.

### How to run it
- Prefer the live app over static reading. Dev server: check `vite-dev.out.log`
  / run the project's start command, then drive Chrome at each width
  (chrome-devtools MCP tools are available: navigate, resize via `evaluate`,
  screenshot). Capture a screenshot per page per breakpoint for the report.
- Auth: the teacher surface needs a logged-in session. Note in the report if you
  can't reach a route and audit it statically instead.
- Pair live observation with code reading so each finding cites `file:line`.

### What to look for (checklist per page)
1. **Horizontal overflow** — any element forcing a sideways scroll at 320/375.
   Prime suspects: fixed `w-[…px]`, `min-w-[…]`, wide tables, `whitespace-nowrap`,
   images without `max-w-full`, long unbroken Norwegian compound words.
2. **Touch targets** — interactive elements <44px on phone (apply `.touch-target`).
3. **The `md` swap** — at 767↔768, does the sidebar→Sheet and
   header→MobileTeacherHeader transition cleanly? Any double headers, missing
   triggers, or content hidden under chrome?
4. **Modals / drawers / sheets** on small screens — full-height scroll, reachable
   close button, no content clipped, `max-h`/`dvh` correct, keyboard doesn't cover
   inputs. (Dialog base is good: `w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)]
   sm:max-w-lg`; Sheet is `w-3/4 sm:max-w-[480px]` — verify content fits at 320.)
5. **Grids that don't reflow** — `grid-cols-N` with no responsive prefix
   collapsing too tight (see §4 list).
6. **Tables** — `ui/table.tsx` has fixed `w-[360px]`/`w-[220px]` cells; confirm
   they scroll or restack rather than overflow the viewport.
7. **Charts** (recharts/IncomeChart) — must use a responsive container, not a
   fixed pixel width, on phone.
8. **Sticky / fixed bars** — checkout booking rail, `dirty-form-bar`,
   `MobileTeacherHeader` — no overlap, respect safe-area insets, don't trap scroll.
9. **Typography** — display/hero sizes (`text-5xl`, `text-3xl`) shrinking
   appropriately; line-length and wrapping readable on phone.
10. **Images / media** — `map-embed`, `image-upload`, hero images, course images:
    intrinsic ratio held, no layout shift, no overflow.

---

## 4. Known risk areas (verify these first — found in the pre-scan)

**Fixed pixel widths in public pages** (can overflow <viewport):
- `pages/public/PublicCourseDetailPage.tsx` — `w-[1100px]`, `w-[640px]` (×2 each).
- `pages/public/CheckoutPage.tsx` — `w-[560px]`, `w-[552px]`.
- `components/ui/table.tsx` — `w-[360px]`, `w-[220px]`.
- `components/teacher/dashboard/IncomeChart.tsx` — `w-[180px]`.
Confirm each is wrapped/guarded (e.g. inside `max-w-full`, a scroll container, or
overridden below `md`) and doesn't force horizontal scroll at 320–375.

**Non-responsive `grid-cols-N`** (verify they don't crush on phone):
- `components/teacher/ParticipantDetailDrawer.tsx:296` — `grid-cols-2` inside a
  drawer that's `w-3/4` on mobile.
- `components/public/studio/StudioMonthGrid.tsx:112,118` — `grid-cols-7` calendar
  (7 cols is intrinsic to a month grid; check legibility at 320, not reflow).

**Teacher pages thin on responsive prefixes** — these barely use `sm:/md:/lg:`,
so they likely assume desktop. Walk each at 375px and confirm nothing breaks:
`SchedulePage`, `CoursesPage`, `CoursePage` (largest — 600+ lines, multiple
MobileTeacherHeader instances at lines 71/560/632), `StudioPage`, `PaymentsPage`,
`TeacherProfilePage`, `CollaborationPage`, `TeacherDashboard`.

**Heaviest existing responsive files** (regression-check these still work — they
carry the most breakpoint logic, so they're easiest to subtly break):
`LandingPage` (26 responsive prefixes), `CheckoutPage` (11), `sidebar.tsx` (9),
`PublicCourseDetailPage` (8), `OnboardingPage` (8).

---

## 5. Deliverable

Produce `RESPONSIVENESS_AUDIT_FINDINGS.md` with:

1. **Summary** — overall state per surface (public vs teacher), top themes.
2. **Findings table** — one row per issue:
   `Severity · Surface · Page/Component · file:line · Viewport(s) · What breaks ·
   Screenshot ref · Proposed fix (in design-system terms)`.
   Severity: **P0** = unusable/blocks a booking or core action; **P1** = visibly
   broken but workaroundable; **P2** = polish/awkward.
3. **Cross-cutting recommendations** — shared component fixes that resolve many
   findings at once (e.g. a table-wrapper, a chart container, a drawer width rule)
   ranked by leverage.
4. **Screenshots** — per page × breakpoint, named `<surface>-<page>-<width>.png`.

Order fixes by: **P0 public booking flow → P0 teacher core → P1 → P2.** Propose
every fix in terms of the existing tokens/utilities (§1) — no new design
primitives without flagging it explicitly.

### Guardrails
- This is a senior-developer, root-cause audit (per `CLAUDE.md`): no band-aids,
  minimal-impact fixes, reuse existing utilities.
- Don't "fix" things that are intentionally desktop-only without flagging the
  tradeoff first.
- Verify before asserting — pre-existing prefixes/TODOs are hypotheses; check
  live behavior at the actual breakpoint before writing a finding.

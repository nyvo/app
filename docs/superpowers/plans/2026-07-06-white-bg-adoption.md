# White-Background UI Adoption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Flip the dashboard from grey-canvas + white-bordered-cards to a white page background with demo-style separation (grey utility fills, hairlines, azure-tinted interactive cards), matching `style-demo.html` / `patterns-demo.html` while keeping the token architecture.

**Architecture:** One token flip makes every page white (`--canvas` → alias of `--background`), then each carded surface is converted to one of five recipes (table below). Primitives (`card.tsx`, `input.tsx`) change once at the source; ad-hoc `border-card` panels are converted per-file using the inventory in each task. Floating focal cards (booking rail, checkout, landing hero) are explicitly NOT changed.

**Tech Stack:** React + Tailwind v4 (`@theme` tokens in `src/index.css`), Vite dev server, Playwright visual regression (`e2e/visual-previews.spec.ts`).

## Global Constraints

- **Recipe table — every converted surface must land on exactly one of these:**
  - **R1 Invisible list** (homogeneous rows): NO wrapper border/fill. Rows: `divide-y divide-border-subtle`, generous padding, `hover:bg-hover` + `rounded-lg` on interactive rows. Header rows: no `bg-*` fill.
  - **R2 Tinted interactive card** (bookable/schedule items): `rounded-xl bg-primary-subtle px-5 py-4`, no border, no shadow; interactive hover = `hover:bg-selection` (token added in Task 1).
  - **R3 Utility panel** (secondary content, help blocks, status panels): `rounded-xl bg-panel` (token added in Task 1), no border, no shadow.
  - **R4 Floating focal card** (UNCHANGED — allowlist below): `rounded-2xl border border-card bg-surface shadow-soft`.
  - **R5 Plain section** (primary content, forms): no card at all — whitespace (`space-y-8`/`mt-8`) + a `text-base font-medium` section title.
- **R4 allowlist (do not touch):** `BookingRailLite.tsx:80`, `CheckoutPage.tsx:743`, `CheckoutSuccessPage.tsx:378`, `LandingPage.tsx:33`, `IncomeChart.tsx:294` (tooltip), `EmbedCalendar.tsx:153` (embeds need an edge on unknown host pages), `LocationCard.tsx:31` (image card needs containment), plus all overlays (Dialog/Popover/Dropdown/Toast).
- **FramedCard in `CourseOverviewTab.tsx` is already the target pattern** (tinted frame + white inner panel) — verify visually, do not convert.
- **AA rules (verified values, keep them):** muted text (`text-foreground-muted`, neutral-11) is 4.86:1 on white and 4.53:1 on `--panel` (neutral-2). It is 4.25:1 on `bg-muted` (neutral-3) — **FAILS**. Therefore: never `text-foreground-muted` on `bg-muted` (existing project rule); utility panels use `bg-panel`, not `bg-muted`.
- Tokens only — no hex/oklch literals in components. No `tracking-*` utilities. Currency via `formatKroner()`. No "·" interpunct in copy.
- Buttons/inputs stay `rounded-xl` (10px) — do NOT adopt the demo's pill buttons or 16px card radii.
- Dark mode: tokens are defined so everything tracks automatically (`--canvas` is already `= background` in dark). Each visual verification step checks light mode only; Task 9 does one dark-mode sweep.
- Dev server for verification: `npm run dev -- --port 5273 --strictPort` (assume running; start if not). Screenshot via chrome-devtools MCP (`navigate` + `screenshot`).
- Commits: one per task, message style `feat(ui): ...` / `refactor(ui): ...`, ending with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Token flip — white canvas, panel fill, quieter hairline, selection hover

**Files:**
- Modify: `src/index.css` (light `:root` ~lines 222–300, dark `.dark` ~lines 358–362, `@theme inline` surfaces block ~lines 33–45)
- Modify: `docs/design-language.md` (token table + cards section)

**Interfaces:**
- Produces: `bg-panel` (utility-panel fill, AA-safe under muted text), `bg-selection` (tinted-card hover), `bg-canvas` now renders white. Later tasks use these exact utility names.

- [ ] **Step 1: Flip `--canvas` to white and add the two new semantic tokens (light mode)**

In `src/index.css` `:root`, replace:

```css
  --canvas: var(--neutral-2);                      /* dampened dashboard page canvas — white surfaces (--surface) float on it */
```

with:

```css
  --canvas: var(--background);                     /* white page bg (2026-07 white-bg adoption) — separation now comes
                                                      from fills/hairlines, not card borders on grey. Kept as a token so
                                                      the role can diverge again without touching pages. */
  --panel: var(--neutral-2);                        /* utility-panel fill (R3) — the ONLY grey fill muted text is AA on
                                                      (4.53:1). bg-muted (neutral-3) stays for chips/hover/active where
                                                      text is full foreground. */
  --selection: color-mix(in oklab, var(--primary) 10%, var(--background));
                                                    /* opaque hover step for tinted cards — one notch deeper than
                                                       --primary-subtle (#F2F7FB), same family as --selection-light. */
```

- [ ] **Step 2: Quieter hairline**

In `src/index.css` `:root`, replace:

```css
  --border-subtle: var(--neutral-6);
```

with:

```css
  --border-subtle: var(--neutral-4);                /* hairline — lightened from neutral-6 for the white-bg system
                                                       (rows/dividers whisper; --border stays for visible dividers). */
```

- [ ] **Step 3: Dark-mode equivalents**

In the `.dark` block, after `--surface: var(--neutral-1);` add:

```css
  --panel: var(--neutral-2);
  --selection: color-mix(in oklab, var(--primary) 14%, var(--background));
```

(`--canvas` in `.dark` already equals background — leave it.)

- [ ] **Step 4: Expose utilities**

In the `@theme inline` surfaces block (after `--color-surface-on-dark`), add:

```css
  --color-panel: var(--panel);
  --color-selection: var(--selection);
```

- [ ] **Step 5: Update `docs/design-language.md`**

In the §2 table: change the canvas row to `| Dashboard page background | bg-canvas (= white; legacy name) |`, add rows `| Utility panel fill (secondary content) | bg-panel — the only grey fill muted text is AA on |` and `| Tinted interactive card + hover | bg-primary-subtle → hover:bg-selection |`. In §3 Cards, replace recipe 3's "bg-surface on bg-canvas with border-border-card edge" with: "**Utility panel:** `bg-panel`, `rounded-xl`, no border, no shadow — page background is white; `border-card` + `shadow-soft` survives only on floating focal cards (booking rail, checkout, landing hero)."

- [ ] **Step 6: Visual verification**

Run dev server, screenshot `http://localhost:5273/dev/schedule-preview` and `/dev/settings-rows-preview`.
Expected: page background is pure white; previously-grey canvas is gone; sidebar divider (if visible) is a faint hairline; nothing looks broken (cards may look border-heavy — that's Tasks 3–8).

- [ ] **Step 7: Commit**

```bash
git add src/index.css docs/design-language.md
git commit -m "feat(ui): white page canvas + panel/selection tokens, quieter hairline"
```

---

### Task 2: Inputs — filled, borderless

**Files:**
- Modify: `src/components/ui/input.tsx:23` and `:37` (both className strings)
- Modify: `src/components/ui/textarea.tsx` (same border/bg fragment)
- Modify: `src/components/ui/select.tsx` (SelectTrigger className, same fragment)

**Interfaces:**
- Consumes: nothing new.
- Produces: the canonical filled-input recipe other form controls copy: `border-transparent bg-muted` at rest, unchanged focus (`focus-visible:border-foreground focus-visible:ring-2 focus-visible:ring-foreground/15`) and invalid (`aria-invalid:border-danger …`) treatments.

- [ ] **Step 1: Change the Input recipe (both occurrences in input.tsx)**

In `src/components/ui/input.tsx`, in BOTH className strings, replace the fragment:

```
rounded-xl border border-border bg-surface
```

with:

```
rounded-xl border border-transparent bg-muted
```

and replace the disabled fragment `disabled:bg-muted` with `disabled:bg-muted/60`.
Leave focus-visible, aria-invalid, sizing, and icon variant untouched (the transparent border keeps layout stable and lets focus/invalid recolor it).

- [ ] **Step 2: Same fragment in Textarea and SelectTrigger**

Open `src/components/ui/textarea.tsx` and `src/components/ui/select.tsx`; find the same `border-border bg-surface` (or `border-input`) rest-state fragment on the field surface and apply the identical replacement (`border-transparent bg-muted`, `disabled:bg-muted/60`). Do not touch dropdown content panels (those are overlays, R4).

- [ ] **Step 3: Visual verification**

Screenshot `/dev/checkout-form-rework` and `/dev/create-course-preview`.
Expected: fields render as soft grey filled boxes with no visible border; focused field shows dark border + soft ring; error field shows red border. Placeholder text must remain readable (`placeholder:text-foreground-muted` on `bg-muted` is a placeholder, not content — acceptable; flag to user if it looks weak).

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/input.tsx src/components/ui/textarea.tsx src/components/ui/select.tsx
git commit -m "feat(ui): filled borderless inputs (demo recipe)"
```

---

### Task 3: Card primitive → utility panel; unbox the course builder

**Files:**
- Modify: `src/components/ui/card.tsx:15`
- Modify: `src/components/ui/skeleton.tsx:17`
- Modify: `src/pages/teacher/BillingPage.tsx:384`
- Modify: `src/pages/teacher/CourseBuilderPage.tsx:395`

**Interfaces:**
- Consumes: `bg-panel` from Task 1.
- Produces: `<Card>` = R3 utility panel. All Card consumers (GetStartedPage, HelpPage, PayoutSetupCard, AffiliationsSection) restyle automatically.

- [ ] **Step 1: Change the Card recipe**

In `src/components/ui/card.tsx:15`, replace:

```
"group/card flex flex-col gap-6 overflow-hidden rounded-xl border border-card bg-surface py-6 text-sm text-foreground …"
```

with the border removed and panel fill:

```
"group/card flex flex-col gap-6 overflow-hidden rounded-xl bg-panel py-6 text-sm text-foreground …"
```

(keep everything after `text-foreground` identical).

- [ ] **Step 2: Match the card-shaped skeleton**

`src/components/ui/skeleton.tsx:17`: `"rounded-lg border border-card bg-surface"` → `"rounded-xl bg-panel"` (skeletons must mirror what they load into — the Card is now a borderless panel).

- [ ] **Step 3: Remove the Billing override**

`src/pages/teacher/BillingPage.tsx:384`: `<Card className="h-full border-card">` → `<Card className="h-full">`.

- [ ] **Step 4: Unbox the course-builder form section (R5)**

`src/pages/teacher/CourseBuilderPage.tsx:395`: forms don't sit in grey boxes (filled inputs would vanish against the fill). Replace `<Card className="gap-0 overflow-hidden p-0">…</Card>` with `<div className="flex flex-col">…</div>` (keep children as-is; if the Card provided the only horizontal padding, add `px-0` equivalents — check render). Remove the now-unused `Card` import if nothing else in the file uses it.

- [ ] **Step 5: Visual verification**

Screenshot `/dev/payout-preview`, `/dev/billing-preview`, `/dev/course-builder-preview`, and `/dev/onboarding-preview`.
Expected: Cards are soft grey panels without borders; course-builder form is plain on white with filled inputs; no muted-grey text sitting on the grey panels (if you spot `text-foreground-muted` inside a Card that now fails against `bg-panel` — it doesn't, 4.53:1 — leave as is).

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/card.tsx src/components/ui/skeleton.tsx src/pages/teacher/BillingPage.tsx src/pages/teacher/CourseBuilderPage.tsx
git commit -m "refactor(ui): Card primitive becomes borderless utility panel"
```

---

### Task 4: Teacher dashboard — sections, tinted upcoming rows, unframed chart

**Files:**
- Modify: `src/pages/teacher/TeacherDashboard.tsx:277,352`
- Modify: `src/components/teacher/dashboard/IncomeChart.tsx:127`

**Interfaces:**
- Consumes: `bg-primary-subtle`, `hover:bg-selection` (Task 1).

- [ ] **Step 1: Convert the two dashboard panels**

`TeacherDashboard.tsx:277` and `:352` — both are `rounded-xl border border-card bg-background p-3` wrappers holding a titled list. Convert each to R5 + R2: remove the wrapper's border/bg/padding classes (wrapper becomes `<section className="flex flex-col gap-3">`, keep the existing section title element), and give each list item inside `rounded-xl bg-primary-subtle px-5 py-4` (+ `hover:bg-selection transition-colors duration-150` if the item is a link/button; if items were separated by dividers, remove the dividers — tinted cards stack with `gap-2.5`). Non-interactive metadata lists ("Siste påmeldinger"-type) use R1 instead: no fill, `divide-y divide-border-subtle`, row padding `py-4`.

- [ ] **Step 2: Unframe the income chart**

`IncomeChart.tsx:127`: `<section>` classes `rounded-xl border border-card bg-background p-6 sm:p-8` → `rounded-xl p-0` (chart sits directly on the white page, like the demo; keep internal header/figure spacing — move needed padding onto the inner header block, e.g. add `pb-4` to the header row if it collapses). Tooltip at `:294` unchanged (R4 allowlist).

- [ ] **Step 3: Visual verification**

Screenshot `/dev/dashboard-preview` and `/dev/income-chart-preview`.
Expected: chart floats border-free on white with the stat figure top-left; "Neste kurs" items are azure-tinted rounded cards (`#F2F7FB`); enrollment list is plain hairline rows. Compare against `patterns-demo.html` archetype 2.5.

- [ ] **Step 4: Commit**

```bash
git add src/pages/teacher/TeacherDashboard.tsx src/components/teacher/dashboard/IncomeChart.tsx
git commit -m "refactor(ui): dashboard on white — tinted upcoming cards, unframed chart"
```

---

### Task 5: Schedule page — tinted interactive rows

**Files:**
- Modify: `src/pages/teacher/SchedulePage.tsx:280,384`

- [ ] **Step 1: Convert schedule cards to R2**

`:280` (skeleton/static) and `:384` (interactive link row): replace `rounded-xl border border-card bg-surface px-5 py-4` with `rounded-xl bg-primary-subtle px-5 py-4`; on the interactive one (`:384`) also ensure `transition-colors` targets colors only and add `hover:bg-selection`. Keep `outline-none` + focus-visible ring classes exactly as they are.

- [ ] **Step 2: Visual verification**

Screenshot `/dev/schedule-preview` (and `/dev/session-days-preview` if it renders these rows).
Expected: schedule entries are azure-tinted cards on white, matching the demo's `card-tinted` recipe and the booking-rail tier selection.

- [ ] **Step 3: Commit**

```bash
git add src/pages/teacher/SchedulePage.tsx
git commit -m "refactor(ui): schedule entries as tinted interactive cards"
```

---

### Task 6: List wrappers → invisible lists (R1)

**Files:**
- Modify: `src/components/teacher/CourseListView.tsx:96,178,191,192`
- Modify: `src/pages/teacher/CoursePage.tsx:993,1020,1027`
- Modify: `src/pages/teacher/TeacherProfilePage.tsx:157`
- Modify: `src/pages/teacher/BuyerDashboard.tsx:135,158,218,232`
- Modify: `src/pages/teacher/StudioPage.tsx:375`
- Modify: `src/components/teacher/studio/AffiliationsSection.tsx:279,310,320,490`

**Interfaces:**
- Consumes: `divide-border-subtle` hairline (Task 1 made it quieter), `bg-panel` (Task 1).

- [ ] **Step 1: CourseListView**

`:178` and `:191`: `rounded-lg border border-card bg-surface overflow-hidden` → `overflow-hidden` only (list becomes full-width invisible rows). Header rows `:96`/`:192`: remove `bg-surface`, change `border-b border-border` → `border-b border-border-subtle`. Interior `divide-border` → `divide-border-subtle` if present. Row hover (if defined on rows) → `hover:bg-hover`.

- [ ] **Step 2: CoursePage participant roster**

`:993`: `rounded-lg border border-card bg-surface overflow-hidden` → remove all three (keep `overflow-hidden` only if inner rounding depends on it — it no longer does; drop it). `:1020` header: remove `bg-surface`, `border-b border-border` → `border-b border-border-subtle`. `:1027`: `divide-y divide-border` → `divide-y divide-border-subtle`.

- [ ] **Step 3: TeacherProfilePage settings list**

`:157`: `divide-y divide-border overflow-hidden rounded-xl border border-card bg-surface` → `divide-y divide-border-subtle`.

- [ ] **Step 4: BuyerDashboard**

`:135`/`:158` (`<ul>`): `divide-y divide-border rounded-xl border border-card bg-background` → `divide-y divide-border-subtle`. Empty/error panels `:218`/`:232`: `rounded-xl border border-card bg-background p-6 sm:p-10` → `rounded-xl bg-panel p-6 sm:p-10` (R3).

- [ ] **Step 5: StudioPage + AffiliationsSection**

`StudioPage.tsx:375` error panel → `rounded-xl bg-panel p-6 sm:p-10`. `AffiliationsSection.tsx:279` and `:310` status panels: `rounded-xl border border-card bg-surface p-6` → `rounded-xl bg-panel p-6`. `:320`/`:490` list wrappers: `rounded-md border border-border bg-surface overflow-hidden` → remove border/bg (rows get `divide-y divide-border-subtle` if not already).

- [ ] **Step 6: Visual verification**

Screenshot `/dev/courses-list-preview`, then the real routes need auth — verify what previews exist; otherwise rely on `/dev/settings-rows-preview` + Task 9's full sweep.
Expected: lists are full-width hairline-divided rows on white, no boxes; empty states are soft grey panels.

- [ ] **Step 7: Commit**

```bash
git add src/components/teacher/CourseListView.tsx src/pages/teacher/CoursePage.tsx src/pages/teacher/TeacherProfilePage.tsx src/pages/teacher/BuyerDashboard.tsx src/pages/teacher/StudioPage.tsx src/components/teacher/studio/AffiliationsSection.tsx
git commit -m "refactor(ui): invisible hairline lists, panel empty-states"
```

---

### Task 7: Public surfaces (non-focal)

**Files:**
- Modify: `src/pages/public/PublicCourseDetailPage.tsx:350`
- Modify: `src/pages/public/CheckoutPage.tsx:666`
- Modify: `src/pages/public/LandingPage.tsx:564`

- [ ] **Step 1: Course detail info rows**

`PublicCourseDetailPage.tsx:350`: `rounded-xl border border-card bg-surface px-4 py-3.5` → `rounded-xl bg-panel px-4 py-3.5`.

- [ ] **Step 2: Checkout section block**

`CheckoutPage.tsx:666`: `rounded-xl border border-card bg-surface p-5` → `rounded-xl bg-panel p-5`. Do NOT touch `:743` (focal card, R4 allowlist).

- [ ] **Step 3: Landing pricing tile**

`LandingPage.tsx:564`: `flex flex-col rounded-xl border border-card bg-surface p-8` → `flex flex-col rounded-xl bg-panel p-8`. Do NOT touch `:33` (hero, R4).

- [ ] **Step 4: Visual verification**

Screenshot `/dev/detail-rework` and `/dev/checkout-rework` (or `/dev/checkout-form-rework`).
Expected: focal cards (booking rail, checkout main card) still float with border+shadow; secondary blocks are grey panels; no double-framing.

- [ ] **Step 5: Commit**

```bash
git add src/pages/public/PublicCourseDetailPage.tsx src/pages/public/CheckoutPage.tsx src/pages/public/LandingPage.tsx
git commit -m "refactor(ui): public secondary blocks to panel fills"
```

---

### Task 8: GetStarted + Help + FramedCard check

**Files:**
- Verify (likely no edit): `src/pages/teacher/GetStartedPage.tsx:93,105,116`, `src/pages/teacher/HelpPage.tsx:142`, `src/components/teacher/CourseOverviewTab.tsx:208-228`

- [ ] **Step 1: Verify Card consumers landed well**

GetStarted/Help use `<Card>` and inherited the panel recipe in Task 3. Screenshot `/dev/onboarding-preview` and the Help preview if one exists. Check specifically: onboarding step cards (2.7 checklist) read as grey panels with full-contrast text; if any `text-foreground-muted` line sits directly on `bg-panel` it's AA-safe (4.53:1) — fine.

- [ ] **Step 2: Verify FramedCard**

Screenshot `/dev/oversikt-wireframe`. The tinted frame (`bg-primary-subtle`) + inner white panel (`border-primary-border bg-surface`) must read correctly on the white page. Expected: it does (frame supplies the contrast). Only if the inner border now looks like double-framing, change inner `border border-primary-border` → borderless `bg-surface` and report it in the summary.

- [ ] **Step 3: Commit (only if edits were needed)**

```bash
git add -A && git commit -m "refactor(ui): white-bg polish for onboarding/framed cards"
```

---

### Task 9: Sweep, dark mode, baselines

**Files:**
- Verify: whole repo; Modify: `e2e` snapshot PNGs (regenerated), `.claude/skills/ux-ui-pro/SKILL.md`, `docs/ui-patterns.md`

- [ ] **Step 1: Leftover sweep**

Run: `grep -rn "border-card" src/ --include="*.tsx" | grep -v "pages/dev"`.
Expected: ONLY the R4 allowlist files (BookingRailLite, CheckoutPage:743, CheckoutSuccessPage:378, LandingPage:33, EmbedCalendar, LocationCard) + `card.tsx` none. Anything else → convert per recipe table.

- [ ] **Step 2: Type/build check**

Run: `npm run build` (or `npx tsc --noEmit` if faster). Expected: clean — this was a class-string refactor, so failures mean an accidental syntax edit.

- [ ] **Step 3: Dark-mode sweep**

Toggle `.dark` on `/dev/schedule-preview`, `/dev/dashboard-preview`, `/dev/checkout-form-rework` (add `document.documentElement.classList.add('dark')` via devtools evaluate). Expected: panels use dark neutral-2, tinted cards use the dark `--primary-subtle`, nothing goes invisible.

- [ ] **Step 4: Update the two governing docs**

`.claude/skills/ux-ui-pro/SKILL.md`: change the line "**Flat by default.** White-on-white + border. No arbitrary…" to "**Flat by default.** White page; separation via `bg-panel` fills and `border-subtle` hairlines — card borders only on floating focal surfaces (`shadow-soft` allowlist). No arbitrary…". `docs/ui-patterns.md` §2.2: delete the sentence "the page's wrapper card (white surface on canvas with `border-card`) already frames the content" and replace with "content sits directly on the white page; secondary groupings use `bg-panel`."

- [ ] **Step 5: Regenerate visual baselines**

Run: `$env:PW_PORT='5199'; npm run test:visual -- --update-snapshots` (PowerShell). Expected: all curated previews re-snapshot; inspect a couple of diffs manually to confirm they are the intended restyle, not layout breakage.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat(ui): complete white-bg adoption — docs, dark mode, visual baselines"
```

---

## Decision log (why, for the reviewer)

- **`--canvas` aliases white instead of deleting the token/classes** — 24 call sites keep their semantic role; reversible with one line.
- **`--panel` = neutral-2, not neutral-3** — muted text is AA on neutral-2 (4.53:1) but fails on neutral-3 (4.25:1); the demo's own utility card fails AA here, we don't copy that mistake. `bg-muted` remains the chip/hover/active fill where text is full-foreground (existing project rule).
- **`--selection` added as an opaque 10%-primary mix** — the demo hard-codes `#E9F1F8` for tinted-card hover; deriving from `--primary` keeps it drift-proof, same trick as `--selection-light`.
- **Hairline = neutral-4** — demo hairline `#ECECEE` ≈ L 0.944; neutral-4 (0.932) is the nearest step. `--border` (neutral-7) is unchanged for dividers that must be clearly visible on white.
- **Buttons/inputs keep 10px radius; no pills** — decided in the earlier design-language adoption; the demo's 16px/pill geometry stays out.
- **Focal floating cards keep border+shadow** — on a white page the shadow is what separates them; this matches the demo's "preview/overlay card" recipe verbatim.
- **Emails (`supabase/functions/send-email/templates/_layout.tsx`) intentionally out of scope** — old grey hexes are imperceptibly different; separate follow-up if strict parity is wanted.

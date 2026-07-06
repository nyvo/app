# UI Patterns: Screen Archetypes & Structure

Companion to `docs/design-language.md`. That file governs how things look; this
file governs **what gets built**. When building or refactoring a screen, first
identify its archetype below and follow that recipe.

**Precedence:** `src/index.css` (tokens) and `CLAUDE.md` win over both docs.
Existing canonical primitives (`src/components/ui/`, `src/components/teacher/`)
win over ad-hoc reinvention.

Guiding rule: **the default output of an AI agent is a stat-card grid, a wall of
bordered cards, and a modal. Assume that instinct is wrong and consult this file.**

---

## 1. Structural principles

1. **Compose, don't invent.** Build screens exclusively from the canonical
   components (`@/components/ui`, plus project primitives like `EmptyState`,
   `StatusBadge`, `PageShell`, `SettingsRows`, `FramedCard`). Never restyle a
   primitive inline. If a screen genuinely needs a new primitive, flag it in
   the summary instead of silently creating it.
2. **Lists are the default data shape.** Homogeneous data = full-width rows
   (invisible-card recipe: hairline dividers, tall padding, `bg-hover` on
   hover). Grids of cards are only for visual content (images, previews) or
   genuinely independent objects. Never grid what you can list.
3. **Cards are earned.** A card groups multiple related elements into one
   interactive or semantic unit. Never wrap a single element in a card. Never
   nest cards. If everything on a screen is a card, nothing is.
4. **One primary action per screen.** It lives in the page header (top-right)
   or at the end of a form — the near-black `default` button variant.
   Everything else is `secondary`/`ghost`.
5. **Prefer inline over overlay.** Inline expansion > drawer/sheet > modal, in
   that order. Modals are for confirmations and short, focused create-flows
   only. Never a modal inside a modal.
6. **Progressive disclosure over completeness.** Show the 20% used 80% of the
   time; tuck the rest behind "Avansert", expandable rows, or a details screen.
7. **Whitespace is the grouping mechanism.** Sections are separated by vertical
   space (48–64px) and a section title — not by boxes, rules, or background bands.

---

## 2. Screen archetypes

### 2.1 List / index screen (the workhorse)
```
Page title ....................... [Primary action]
[Tab bar — only if 2+ real subsets]
[Filter row: 1–3 dropdown pills + search]
─────────────────────────────────────────────────
Row (72px+): [icon/avatar] Name(weighted)  meta meta   status   [chevron/action]
─────────────────────────────────────────────────
Row ...
```
- Rows are the invisible-card recipe: `border-subtle` hairline dividers, tall
  padding, `bg-hover` fill on hover, `rounded-lg`.
- Group rows by a meaningful key (date, status) with small weighted group
  headers ("I morgen — fredag 28. nov") rather than showing a grouping column.
- Metadata inside a row: small stroke icon + text pairs, muted, inline. Max 3–4
  per row; more belongs on the detail screen. No "·" interpunct separators —
  use spacing/layout.
- No pagination UI below ~50 items; prefer load-more or infinite scroll.
- Zero results after filtering: one muted sentence + "Nullstill filtre" ghost
  button (use `EmptyState`).

### 2.2 Detail screen
```
[← Back]
Title (text-2xl) + status badge        [secondary] [Primary action]
meta   meta   meta (muted row)
                                      ← 48px gap
Section title
content ...
                                      ← 48px gap
Section title
content ...
```
- Sections stack vertically, separated by whitespace + title. No
  card-per-section — content sits directly on the white page; secondary
  groupings use `bg-panel`.
- Tabs (`PageTabs`) only when there are 3+ genuinely distinct facets. Two
  facets = stack them.
- Related-object lists inside a detail screen reuse the list-row recipe,
  capped at ~5 rows + "Vis alle".

### 2.3 Form / create / edit
```
Title
[optional stepper if 3+ steps]
Label
[input]
Label
[input]
...
[Primary action]  [secondary Avbryt]
```
- Single column, always. Max width ~480–560px.
- ≤ 7 visible fields per step. More → split into steps (numbered stepper) or
  group under section titles with rare fields behind a collapsed "Avansert".
- Dashboard forms: static label above the input (public pages may keep their
  floating-label treatment). Placeholder is an example, never the label.
- Inline validation on blur; `FieldError` under the field. Never a toast for
  field errors.
- One primary button; the paired "Avbryt" uses the `secondary` variant (per
  `button.tsx` convention).
- Multi-step: steps show number + short name; completed = `--success` check
  circle.

### 2.4 Settings
- Use `SettingsRows` (label + one-line muted description left, control right,
  hairline-separated). This row pattern is for SETTINGS content only — one-shot
  forms and status surfaces keep a focused card column.
- Destructive zone: last section, plain rows with `text-danger` actions — no
  red-tinted panel.

### 2.5 Dashboard / overview
- **Lead with the most actionable thing** — usually a short list ("I dag",
  "Trenger oppmerksomhet", "Kommende"), not numbers.
- Stats are earned: max one row of 3–4, and only figures that drive a decision.
  Figure large + `text-foreground`, label muted below, `tabular-nums`. No
  sparkline-in-every-card, no delta-badge-per-stat unless the delta is acted on.
- No chart by default. A chart appears only when trend is the actual question.
- Setup/onboarding state: the sidebar setup card is the single persistent
  onboarding anchor — don't add a second dashboard-home setup card.

### 2.6 Empty states
- Use `EmptyState`: one muted sentence stating what will appear here + one
  action (primary if it's the screen's purpose, ghost otherwise). Optionally
  one small stroke icon.
- No illustrations, no multi-paragraph explainers, no card around it.
- First-run empties may add a second line linking to docs — nothing more.

### 2.7 Onboarding / checklist
- Vertical numbered list: number circle, weighted title, one-line muted
  description, state on the right (`--success` check when done, button when
  actionable).
- Completed steps stay visible and checked — don't remove them.
- End with the "graduation" action (e.g. "Del profil") separated by whitespace.

### 2.8 Modal / confirm
- Confirmations: `ConfirmDialog` — title, one sentence, [secondary Avbryt]
  [primary/destructive action]. Action verb matches the trigger ("Slett time",
  not "OK").
- Create-in-context: only for objects with ≤ 5 fields; otherwise navigate to a
  form screen.
- No modal launches another modal. No modal for viewing content that a detail
  screen or inline expansion can show.

### 2.9 Tables (dense data)
- Only when users compare across ≥ 4 attributes; otherwise use list rows.
- Left-align text, right-align numbers (`tabular-nums`). One weighted cell per
  row.
- Sort on ≤ 3 key columns, indicated by a small chevron. No zebra striping, no
  vertical rules, no boxed header.
- Row click opens detail; row-level actions behind a trailing "…" menu, max
  1–2 inline icons otherwise.

### 2.10 Notifications / toasts
- Toasts use the dark-chrome toast surface: one line + optional single action,
  auto-dismiss 4–6s. Confirmation copy echoes the action ("Timen er
  planlagt"). One terse neutral sentence — never two crammed on a line.
- Never toast validation errors, never stack more than 2, never block content.

---

## 3. Layout skeleton

- App frame: fixed left sidebar (white rail per design-language §Sidebar) +
  single content area (`PageShell`). No topbar unless it carries global
  search/actions that genuinely don't fit the sidebar.
- Content area: max-width 1040–1200px for mixed content; full-width permitted
  for tables/lists. Horizontal padding 32–48px.
- Page header (title + actions) is plain text on the page — never a banded or
  bordered header bar.
- Responsive: sidebar collapses to icons then to a sheet; list rows stack their
  metadata; tables become list rows. Never horizontal scroll for primary
  content.

---

## 4. Anti-patterns — find and replace

| Never build | Build instead |
|---|---|
| Stat-card grid as default dashboard opener | Actionable list first; one earned stat row at most (2.5) |
| Grid of bordered cards for homogeneous data | Full-width invisible-card list rows (2.1) |
| Card wrapping a single element / nested cards | Unwrap; whitespace + section title |
| Icon-per-feature grid ("features" sections) | Plain list or drop entirely |
| Chart on every dashboard | Chart only when trend answers a real question |
| Two side-by-side filled buttons | One near-black primary + secondary/ghost |
| Modal for editing/viewing rich content | Inline expansion, drawer/sheet, or detail screen |
| Every field visible on a long form | ≤ 7 per step; sections; "Avansert" collapsed |
| Two-column forms | Single column, 480–560px |
| Tabs to split content that fits on one screen | Stacked sections with whitespace |
| Empty state with illustration + paragraphs | One sentence + one action (2.6) |
| Banded/bordered page-header bars | Plain title + actions on the page |
| Badges/pills for every status everywhere | `StatusBadge`/status dot + muted text; pills only for filters/categories |
| Toast for form validation | Inline `FieldError` under the field |
| Skeleton screens with heavy shimmer everywhere | `Skeleton`/`PageSkeleton` — simple muted bars, content-shaped |
| A second persistent onboarding surface | The sidebar setup card is the single anchor (2.5) |

---

## 5. Agent workflow

1. Identify the archetype(s) for the requested screen; name them in your plan.
2. Compose from canonical components only; list any new primitive you believe
   is needed and why, before building it.
3. After building: render/screenshot (`/dev/*` preview routes), compare against
   the archetype recipe and the anti-pattern table, list violations, fix, then
   summarize what was built and which archetype it follows.

---

## 6. One-line summary (for quick prompts)

> Screens are composed from canonical primitives by archetype: tall
> invisible-row lists grouped by date/status, whitespace-sectioned detail pages,
> single-column ≤7-field forms with one near-black action, list-first dashboards
> with earned stats, one-sentence empty states, inline-over-modal — never
> stat-card grids, card walls, decorative charts, or two-column forms.

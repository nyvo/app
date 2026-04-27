# Design System — Reference

Exhaustive lookup material for the shadcn preset `b1Z5aAzb6` (radix-vega). CLAUDE.md contains the *rules*; this file contains the *spec* — variant matrices, code templates, padding tables. Referenced from CLAUDE.md.

If a rule here conflicts with CLAUDE.md, CLAUDE.md wins.

> **Heads-up (2026-04-27):** The dashboard register shifted from "dense `text-sm`" to "calm `text-base`, two text tiers" — see CLAUDE.md's "Two registers, by design" thesis at the top of the Design System section, and `tasks/post-mvp-feedback.md` for context. Some tables below are still phrased for the pre-shift register (e.g. card padding, row padding, type scale). They get reconciled as the dashboard sweep lands surface-by-surface. Until then: **for dashboard work, follow CLAUDE.md, not this doc**. Public surfaces are unaffected.

---

## `<Button>` — full variant/size spec

Three dimensions: `variant`, `shape`, `size`.

### Variant decision tree

- `default` → **primary** action per section. Max 1–2 per screen. Solid primary-colour fill.
- `secondary` → alternative action (e.g. "Avbryt" paired with a default). Subtle gray fill.
- `outline` → secondary action with more chrome (toolbars, filter buttons). Border + full text colour.
- `outline-soft` → tertiary / cancel in dialogs. Same shape as `outline` but text is `muted-foreground` — softer than `outline`.
- `ghost` → icon buttons, nav items, close buttons, hover-revealed actions.
- `destructive` → destructive action (delete, cancel-with-refund, remove). **Solid red** — use in both menus/inline AND AlertDialog confirmations. Don't pair two destructive buttons in the same action row.
- `link` → inline text link styled as button (rare).
- `plain` → **inline text action** with button semantics but no chrome (no background, no border, no height). Renders `h-auto p-0` with `muted-foreground` → `foreground` on hover. Use for "Vis alle", "Nullstill", "Tilbake", "Legg til punkt" — actions that read as text inside a card/row, not as a pill. Size prop still controls font-size (`xs` for `text-xs`, `sm` for `text-sm`). Do not reach for this when a real button is warranted.

### Size decision tree

- `xs` (h-6) → dense toolbars, chip-adjacent actions.
- `sm` (h-8) → default for in-table / in-card actions.
- `default` (h-9) → standard page actions.
- `lg` (h-10) → rare, emphasised actions.
- `cta` (h-11) → **full-width CTA in auth forms / modal primary / hero**. Replaces ad-hoc `className="h-11"` — always use this size.
- `icon` / `icon-xs` / `icon-sm` / `icon-lg` → square icon-only buttons.

### Shape rule

`shape="pill"` is permitted on `src/pages/public/**` and marketing-adjacent contexts for hero CTAs. Everywhere else stays default rect so buttons visually pair with inputs/fields. **Never mix pill and rect in the same form, toolbar, or action group.**

### AlertDialog confirmations

`AlertDialogAction` accepts `variant` + `size` props that flow to the underlying Button. For a destructive confirmation, use `<AlertDialogAction variant="destructive">` — **do not** hand-roll `className="bg-destructive text-destructive-foreground"`.

### Anti-patterns

- ❌ `<Button className="h-11 w-full">` → ✅ `<Button size="cta" className="w-full">`
- ❌ `<Button className="bg-destructive text-destructive-foreground">` → ✅ `<Button variant="destructive">`
- ❌ `<Button className="rounded-full">` → ✅ `<Button shape="pill">`
- ❌ `<Button className="active:scale-[0.95]">` — press feedback via className is inconsistent; the primitive already provides subtle `active:translate-y-px`. Don't add more.
- ❌ Icon-only buttons with `className="size-8"` → ✅ `<Button size="icon-sm">`
- ❌ `<Button variant="ghost" className="h-auto p-0 text-muted-foreground hover:bg-transparent hover:text-foreground">` → ✅ `<Button variant="plain" size="xs">` (or `size="sm"` for `text-sm`)

---

## `<Table>` — canonical template + column-width rule

```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

<Table>
  <TableHeader>
    <tr>
      <TableHead className="min-w-[220px] max-w-[360px] w-[40%]">Navn</TableHead>
      <TableHead className="w-40">Status</TableHead>
      <TableHead className="w-12"><span className="sr-only">Handlinger</span></TableHead>
    </tr>
  </TableHeader>
  <TableBody>
    {rows.map(row => (
      <TableRow key={row.id}>
        <TableCell>…</TableCell>
        …
      </TableRow>
    ))}
  </TableBody>
</Table>
```

The primitives bake in wrapper overflow, `w-full` sizing, header styling, body dividers, row hover, cell padding. **Width constraint is the page's job, not the table's** — the primitive fills its parent; if the page should cap dashboard content at e.g. `max-w-6xl` on ultra-wide screens, set that on the page's `<main>` or wrapper div. Don't re-declare any of the baked-in properties on raw `<table>` / `<th>` / `<td>`.

### Column-width rule — prevents the "columns clumped on the right" problem

- **Identity column** (avatar + name + email block) — `className="min-w-[220px] max-w-[360px] w-[40%]"`. The `max-w` is critical; without it the column sprawls on wide screens and pushes everything else into a strip on the right.
- **Fixed-content columns** (status, counts, actions) — fixed width: `w-40`, `w-12`, etc.
- **Secondary-text columns** (email-as-a-column, course name, etc.) — `w-40` fixed or `hidden sm:table-cell` for mobile hiding.
- **Action column** (menu trigger) — `w-12` or `w-16`, always last.
- If columns total less than the container, the identity column absorbs the slack (up to its max-w). Past the max-w, the table stops growing — `max-w-6xl` on the page caps the outer bound.

### Responsive hiding

Use `hidden sm:table-cell` (show from sm up) or `hidden md:table-cell` (show from md up) on optional columns. Mobile collapses to identity + status + actions.

**Don't skip the primitive.** Writing raw `<table>` or a plain `<div className="grid">` for a "simple" table is the reason this app had two near-identical hand-rolled tables. Every data table goes through `<Table>`.

---

## `<Badge>` — canonical status → variant map

The primitive has three dimensions (`variant` / `shape` / `size`) — see CLAUDE.md for the decision tree. This is the exhaustive status-label lookup table.

| State | Variant | Example |
|-------|---------|---------|
| Positive, ongoing | `success` | Betalt, Påmeldt, Pågår, Kommende, Fullført (success badge in schedule) |
| Attention needed | `warning` | Venter betaling, Kurs avlyst, Få plasser igjen |
| Action required | `destructive` | Betaling feilet |
| Informational | `info` | Generic notifications, unread count dot, "Gjesteinstruktør" |
| Resolved / archived / neutral fact | `neutral` | Avbestilt, Refundert, Utkast, Fullt, "Neste" session marker |
| Category / feature accent (not a state) | `accent` | Course type/progress chips ("Uke 6 av 8", "Arrangement"). Blue-violet via `chart-2`. Use sparingly — one accent moment per surface, not on every chip. |

**Rule: don't hand-roll status pills.** Never write `<Badge variant="secondary" className="bg-success/10 text-success ring-success/20">` — that's `<Badge variant="success" shape="rect" size="sm">`. The primitive owns the colour/shape mapping. If you reach for `className` overrides on a status badge, something is wrong.

**Shape-by-context rule:** card meta like "Denne måneden" / "Siste 7 dager" / "{N} av {M}" uses the default `pill` shape with `variant="secondary"`. Status in a table row / list — anything rendered via the typed wrappers — always uses `shape="rect"`. Don't mix.

---

## Card padding tiers

Surface determines the tier, not designer preference. No `p-5`, no `p-7`.

| Tier | Padding | Use for |
|------|---------|---------|
| Compact | `p-3` | Inline mini-panels (notification bubble, small decorative tiles) |
| Dense dashboard | `p-4` | In-Card-primitive panels, chat bubbles, inline edit panels, small forms |
| Standard | `p-6` | Default dashboard cards (collapsible panels, empty states, standard public cards like course signup) |
| Form hero | `p-6 sm:p-8` | Primary page forms (create-course, welcome-flow onboarding) |
| Marketing card | `p-8` | Landing feature cards |
| Mega hero | `p-8 md:p-12` | Full-bleed landing hero cards |

The `<Card>` primitive itself bakes in `py-6 px-6` (default) or `py-4 px-4` (`size="sm"`) via its sub-components — consumers of `<Card>` don't need to hand-add padding. These tiers apply to **hand-rolled card-like surfaces** (`<div className="rounded-lg border bg-card ...">`).

---

## Row padding tiers

Two valid patterns, pick by container:

| Container | Row padding | Rationale |
|-----------|-------------|-----------|
| `<Card>` primitive (already has `px-6`) or hand-rolled card with its own padding | `px-4 py-3` | Card provides outer gutter; rows are dense. Used in MessagesList, RegistrationsList, ConversationList. |
| Zero-padded card (`<Card className="p-0">` or hand-rolled without `p-*`) | `px-6 py-4` | Rows own the gutter. Used in PaymentsPage transactions, TeacherProfilePage settings rows. |

Don't invent `py-3.5`, `py-2.5`, `px-5` — if you need denser rows, drop to the compact chip size (`px-3 py-2.5` for tight nested metadata rows); if you need roomier, step up the card's tier instead of hand-tuning the row.

---

## Page container scale

Pick the pattern by surface:

| Surface | Pattern |
|---------|---------|
| Dashboard page | `<div className="mx-auto max-w-5xl space-y-8">` (or `max-w-6xl` for data-heavy pages like CoursesPage, SignupsPage) |
| Public content page (course detail, docs) | `<main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">` |
| Public listing | `<main className="mx-auto max-w-4xl px-6 py-8 sm:py-12">` |
| Prose / terms / legal | `<main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">` + `space-y-10` inside |

`CourseDetailPage` is the deliberate exception — full-width layout with its own sidebar framing, no `mx-auto max-w-*`. Don't use it as a template for normal pages.

---

## Icon size ↔ text size table

Icons inside a text row should match the line-box so nothing looks offset:

| Text size | Icon size class | Notes |
|-----------|-----------------|-------|
| `text-xxs` / `text-xs` | `size-3.5` | 14px — meta rows, chip icons |
| `text-sm` | `size-4` | 16px — standard button/label icons |
| `text-base` | `size-4` or `size-5` | 16–20px |
| `text-lg` | `size-5` | 20px |
| `text-xl` / `text-2xl` | `size-6` | 24px — card title icons, stat card icons |

Decorative/hero icons (empty state, onboarding) can go larger (`size-8` etc.) — this table is specifically for icons sitting next to text.

---

## Focus ring — one pattern + three sanctioned deviations

**Default:** `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background` (use the `.focus-ring` utility on custom surfaces).

Deviations:

- **Dense list rows** (conversation list, command menu, message rows): `ring-2 ring-inset ring-ring/50` — inset avoids overlapping neighbors in a tight stack.
- **Form inputs** keep the shadcn pattern (`ring-3 ring-ring/50` without offset). Muscle memory — don't touch.
- **Menu items** (dropdown, combobox, select popover) use `focus:bg-accent` with no visible ring — Radix/shadcn convention.

---

## Whole-card-clickable tiles — deepen-ring pattern

Course tiles, event cards, and other whole-card-clickable tiles **deepen the ring instead of swapping fill** — their elevation is part of the identity.

- Hover: `ring-1 ring-foreground/20`
- Selected: `ring-2 ring-foreground/20` (neutral — default for editor/calendar selections) or `ring-2 ring-selection` (brand, only for genuine commitment-style picks)
- Inactive: fill becomes `bg-muted` instead of `bg-card`, ring thins to `ring-foreground/5`

---

## Category-tinted cards — selection ring colour map

When a card body is already tinted with a category color (schedule events, success-tinted single events), a neutral `ring-foreground/20` selection ring looks alien against the tint. The ring uses the **solid** category color:

| Card category | Body | Selected ring |
|---------------|------|---------------|
| Series / chart-3 tinted | `bg-chart-3/8 border-chart-3/25` | `ring-2 ring-chart-3` |
| Single event / success tinted | `bg-success/8 border-success/25` | `ring-2 ring-success` |
| Completed / neutral | `bg-muted/50 border-border` | `ring-2 ring-foreground/20` |

Solid (no opacity) on a 2px ring gives a crisp "THIS is selected" signal that still reads as part of the card's color family. Sanctioned deviation from the default opacity vocabulary because a tinted card beneath the ring already absorbs intensity.

---

## Chart-2 accent — five canonical uses

`chart-2` (blue-violet) is the app's *one* chromatic accent for non-semantic emphasis. These five uses only — nothing else:

1. **Data viz** — line/area/bar strokes and fills in recharts. Use `var(--color-chart-2)` in SVG / chart config.
2. **Tinted icon container** (`bg-chart-2/10 text-chart-2` on a rounded square, `size-9`/`size-10`) — the icon is the chart-2-coloured element on a faint chart-2 wash. Used for "this row represents X" glyphs (activity icons, location pin).
3. **Tinted interactive chip/toggle** — same tinted surface plus `border-chart-2/20` for button-like chrome, `hover:bg-chart-2/20 hover:text-chart-2` on hover. Used for favourite-toggles and accent chips.
4. **Full-row tint** (`bg-chart-2/10`) where content on top is **normal** `text-foreground` / `text-tertiary-foreground`, not chart-2. The blue is ambient emphasis ("next up"), not content colour. One highlighted row per list, maximum.
5. **Solid live-indicator dot** (`bg-chart-2` + `animate-ping`) for "happening now" signals in dense lists. Never solid chart-2 elsewhere.

**Badge consumers:** don't hand-roll the tinted surface — use `<Badge variant="accent">` (bakes in `bg-chart-2/10 text-chart-2 border-transparent`).

**Don't mix with semantic state.** If a row is `success` (paid), don't also tint it chart-2. Accent is for category/emphasis, not state — status tokens win.

**Opacity rule reminder:** `/10` bg + `/20` border/hover. No `/15`, `/30`, `/25`.

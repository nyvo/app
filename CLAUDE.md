## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately – don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution
- Run multiple agents in parallel when a task has independent subtasks — don't serialize what can be concurrent

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes – don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests – then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Formatting & Copy Rules

- **Currency**: Always use `formatKroner()` from `@/lib/utils` to display NOK amounts. Never write `${amount} kr` inline — it skips the Norwegian thousands separator (e.g. `2200 kr` vs correct `2 200 kr`).
  - Returns `"0 kr"` for 0/null/undefined, otherwise `"1 200 kr"` with proper `nb-NO` locale formatting.
  - In Supabase Edge Functions: use the local `formatKr()` helper in `send-email/index.ts` (same logic, can't import from `@/lib`).
- **Copy/text**: Follow `COPY_STYLE_GUIDE.md` for all Norwegian text.
- **Dates**: `nb-NO` locale. Format: `22. mars 2026`, `kl. 18:00`
- **Tone**: Professional but warm. `du/deg` (informal). Active voice.
- **Domain terms**: Kurs, deltaker, påmelding, avbestilling, instruktør
- **Emojis**: Never use emojis in the UI
- **Banned copy**: "Vennligst", exclamation marks, translated English patterns

## Git

- Commit after each completed fix or feature, not in bulk
- After committing, suggest pushing to GitHub (but wait for user confirmation)
- Don't amend previous commits — always create new ones

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

## Design System

- The shadcn preset `b1Z5aAzb6` (radix-vega) in `src/index.css` is the single source of truth for colors, radius, and font. `components.json` pins style to `radix-vega` and `iconLibrary` to `lucide`.
- Use shadcn primitives from `@/components/ui/` over custom UI.
- Icons: **always import from `@/lib/icons`** (never from `lucide-react` directly). The barrel re-exports the set of lucide icons the app uses and inlines a few brand marks (`Facebook`, `Linkedin`, `Twitter`) that lucide dropped. If you need an icon that isn't exported, add it to `src/lib/icons.tsx` rather than importing `lucide-react` elsewhere.
- Typography: use raw Tailwind utilities (`text-sm font-medium`, `text-3xl font-semibold tracking-tight`, etc.) — no `type-*` classes. Line-height and letter-spacing are baked into the `--text-*` tokens in `src/index.css`; don't hand-tune `leading-*` or `tracking-*` unless you deliberately need to break the scale.
- **Font families:**
  - **Geist** (`font-sans`, default) — everything. Body, headings, UI labels, form fields, prose.
  - **Geist Mono** (`font-mono`) — use *sparingly*. Only where visual weight or column alignment actually benefits the reader. Over-applying mono makes a consumer product feel like a dev tool.
  - **Apply `font-mono` when:**
    - The value is prominent (`text-sm` 14px or larger) AND the content is clearly data a user copy-pastes or scans column-wise. Canonical: big KPI values (`42 800 kr`, `148`, `82%`), dialog price totals, payments-page transaction/payout amounts in a list.
    - The content is a long alphanumeric identifier regardless of size: emails, Stripe IDs (`pi_...`, `py_...`), org numbers, course codes, reference numbers, file paths. Identifiers are always mono — humans don't read them as sentences.
    - Code blocks, shell commands, inline technical tokens.
  - **Do NOT apply `font-mono` when:**
    - The value is small (`text-xs` 12px) meta — timestamps in activity rows (`2m`, `14m`, `1t`), inline dates in cards, delta chips inside coloured pills, character counters. Use `tabular-nums` alone for digit alignment.
    - The value is inline in a sentence where mono would interrupt reading flow.
    - The label describes the number (`Revenue`, `Fill rate`) — only the number itself gets mono, never the label.
  - **Rule of thumb:** "small data = sans + `tabular-nums`; big data or identifiers = `font-mono` + `tabular-nums`." Mono should feel earned, not default.
- **Surface context — how to know whether you're in "landing" or "dashboard" when editing:**

  | Path | Surface | Body size | Notes |
  |------|---------|-----------|-------|
  | `src/pages/public/**` | Public / landing / booking | `text-base` (16px) | Marketing voice. More breathing room. Display tier allowed on hero. |
  | `src/components/public/**` | Public components | `text-base` (16px) | Same rules as public pages. |
  | `src/pages/teacher/**` | Dashboard | `text-sm` (14px) | Dense, information-first. No display tier — max heading is `text-3xl`. |
  | `src/components/teacher/**` | Dashboard components | `text-sm` (14px) | Same rules as dashboard pages. |
  | `src/components/auth/**` | Auth (login, signup, reset) | `text-base` (16px) | Treat as public — users are not yet in the app shell. |
  | `src/components/ui/**` | Shadcn primitives | context-aware | Don't hardcode body sizes here; let consumers decide. |

  **Rule:** identify the surface from the file path before picking text utilities. If a component is truly shared (used in both surfaces), keep text sizes out of the primitive and let consumers pass className.

- **Type scale roles** — reach for the utility whose role matches the text, not what "looks big enough":

  | Role | Utility | Size | Use for |
  |------|---------|------|---------|
  | Display | `text-6xl` / `text-5xl` | 72 / 52px | Landing hero headline only. Max 1 per page. |
  | Page title | `text-3xl` | 30px | Dashboard page heading, landing section heading |
  | Section | `text-2xl` / `text-xl` | 24 / 20px | Major section headings outside cards |
  | **Card sub-section** | `text-base font-semibold` | 16px / 600 | `<h2>` / `<h3>` **inside** a `<CardContent>` or panel, stepping down from `<CardTitle>`. Never use `font-medium` here — the weight step is the visual cue that it's a heading, not bold body. |
  | Subsection (standalone) | `text-lg` | 18px | Subsection headings outside cards, prominent labels |
  | Body (landing/public) | `text-base` | 16px | Marketing prose, public-page body |
  | Body (dashboard/app) | `text-sm` | 14px | Teacher-area body, form labels, list items |
  | Meta | `text-xs` | 12px | Timestamps, table cells, captions, tertiary meta |
  | Micro label | `text-xxs` | 11px | Uppercase tracked labels, KPI labels, indicators |

  Pair with weight + tracking conventions: `font-medium` (500) for UI labels, `font-semibold` (600) for headings — never `font-bold` (700), that reads marketing-heavy.
- **Text colour tiers** — four tiers, not two:

  | Token | Tailwind class | Use for |
  |-------|---------------|---------|
  | `--foreground` | `text-foreground` | Primary: headings, body |
  | `--muted-foreground` | `text-muted-foreground` | Secondary: descriptions, form labels |
  | `--tertiary-foreground` | `text-tertiary-foreground` | Tertiary: timestamps, row meta, helper text |
  | `--disabled-foreground` | `text-disabled-foreground` | Disabled state, bullet separators, very muted meta |

  Don't use `opacity-*` on text to fake a tier — pick the right token.
- **Meta rows sit on one tier, not two.** If a card/row has multiple lines of metadata under a primary title (e.g. "type + location" on one line, "next session date" on the next), they're equal-weight information — both go on `text-muted-foreground`. Don't drop one line to `text-tertiary-foreground` just because it contains a timestamp. Tertiary is for meta that's genuinely *less* important than the line above it (e.g. a timestamp in the corner of an activity row, next to a primary+secondary pair).
- **Weight discipline:** `font-medium` (500) for UI labels, chips, button text. `font-semibold` (600) for headings and emphasised body. **Never `font-bold` (700)** — it reads marketing at dashboard sizes and breaks the calm feel. If you need more emphasis, step up the size token before reaching for a heavier weight.
- **Inline numbers in sans copy:** if a number appears inside a sentence where `font-mono` would look out of place (e.g. "12 av 14 påmeldte"), add `tabular-nums` to the containing element so digits still align across rows.
- **Corner radius convention** — four tiers:

  | Radius | Where | Use for |
  |--------|-------|---------|
  | `rounded-md` (`--radius-md`, ~6px) | Buttons, inputs, chips, small controls | Interactive elements sized ≤40px |
  | `rounded-lg` (`--radius-lg`, ~7px) | Cards, panels, list containers, surface tiles | **All card-like surfaces — `<Card>` primitive, hand-rolled panels, feature grids.** One radius for every "surface" in the app. |
  | `rounded-xl` (`--radius-xl`, ~10px) | Dialogs, alert-dialogs, modal content, floating sidebar inset | Elevated overlays only — never plain surfaces. The extra roundness is the signal that this is lifted above the page. |
  | `rounded-full` (9999px) | Avatars, live-indicator dots, pill badges, pill-shape button | Circular/pill by definition |

  **Rule:** if you're rendering a surface with `border` and/or `bg-card`/`bg-background`/`bg-muted`, it's `rounded-lg`. No exceptions. The `<Card>` primitive is aligned to this — do not override to `rounded-xl` on a plain card. Reserve `rounded-xl` for things that genuinely *float* (dialogs, modals).

  **Don't reach for `rounded-[Npx]`.** The two legitimate reasons are already in shadcn primitives (`button.tsx` capping small-button radius with `min(var(--radius-md), 8-10px)`; decorative swatches under 10px using `rounded-[2px]`). If you think you need a new arbitrary value, the answer is usually a different semantic size.

- **Border tier discipline:** two tokens, clear split.
  - `border-border` — default for cards, inputs, row separators. Use for anything that needs visible structure. `<Separator />` uses this too.
  - `border-border-subtle` — only for **repeating structural lines** where `border-border` would accumulate into visual noise: schedule gridlines (100px time-slot rows stacked), calendar grids, skeleton dividers in loading states. If you're tempted to reach for this on a single separator, use `border-border` instead — the subtle tier is earned by repetition, not by one-off preference.
  - Do not introduce one-off border colors and do not reach for `border-muted-foreground` to "make it visible" — that's a hierarchy smell, usually the right answer is a `<Separator />` or different spacing.
- **Surface states — how rows, tiles, and cards handle hover / active / selected / disabled.** The three interactive states must look visibly different. The #1 bug in the system was "hover and selected both use `bg-muted`, so you can't tell them apart." The fix is a three-tier fill ladder:

  | State | Meaning | Fill + chrome |
  |-------|---------|---------------|
  | Rest | Default | none |
  | **Hover** | "About to act" | `hover:bg-muted/50` |
  | **Active** (current) | "What I'm viewing" — open conversation, current tab, expanded section | `bg-muted` (+ `ring-1 ring-inset ring-border` if parent is `bg-background`) |
  | **Selected** (chosen) | "I've committed" — multi-selected rows, picked date, chosen radio card | `bg-selection-light` + `ring-1 ring-inset ring-selection/20` |
  | **Disabled / inactive** | Archived, cancelled, draft | `bg-muted/50` + `text-muted-foreground`; hover suppressed |
  | **Focus-visible** | Keyboard focus | `ring-2 ring-ring ring-offset-2 ring-offset-background` (overrides other rings) |

  **Active vs Selected — how to choose.** Most of the dashboard is *Active* (navigation — which conversation is open, which tab is on, which day is viewed). Reserve *Selected* for genuine user-authored commitments (multi-select for bulk actions, a picked date that applies on submit, a chosen radio card). If unsure, it's Active → `bg-muted`.

  **Active on low-contrast parents.** When an active row sits directly on `bg-background` (the page canvas, not an elevated `bg-card`), `bg-muted` alone is only a ~1.5% lightness delta and reads flat. Add `ring-1 ring-inset ring-border` for edge definition. On an elevated `bg-card` parent, `bg-muted` reads by itself — the white→gray delta is much more visible, skip the ring. Canonical pattern: the messages conversation list (rows on `bg-background`) uses the ring; table rows inside a `<Card>` do not.

  **Sidebar nav keeps its own tokens** (`bg-sidebar-accent`) — that surface has a dedicated palette, don't swap to `bg-muted` there.

  **Hover fill is always `bg-muted/50`.** One opacity, whether the row sits on `bg-background` or on a white `bg-card`. Don't invent `/40` or `/60` — the difference with /50 is below the just-noticeable threshold.

  **Ring vs border — one decision tree.** A ring doesn't shift layout — use it for *state chrome* (selection, hover-deepen, focus). A border is structural — use it for permanent visual boundaries. The `<Card>` primitive already uses `ring-1 ring-foreground/10` so it reads in dark mode where `--card == --background`; don't override.

  **Whole-card-clickable tiles** (course tiles, event cards) deepen the ring instead of swapping fill — their elevation is part of the identity:
  - Hover: `ring-1 ring-foreground/20`
  - Selected: `ring-2 ring-foreground/20` (neutral — default for editor/calendar selections) or `ring-2 ring-selection` (brand, only for genuine commitment-style picks)
  - Inactive: fill becomes `bg-muted` instead of `bg-card`, ring thins to `ring-foreground/5`

  **Category-tinted cards — selection ring matches the card's color family.** When a card body is already tinted with a category color (schedule events: `bg-chart-3/8` series, `bg-success/8` single events, `bg-muted/50` completed), a neutral `ring-foreground/20` selection ring looks alien against the tint. Instead, the ring uses the solid category color:

  | Card category | Body | Selected ring |
  |---------------|------|---------------|
  | Series / chart-3 tinted | `bg-chart-3/8 border-chart-3/25` | `ring-2 ring-chart-3` |
  | Single event / success tinted | `bg-success/8 border-success/25` | `ring-2 ring-success` |
  | Completed / neutral | `bg-muted/50 border-border` | `ring-2 ring-foreground/20` |

  Solid (no opacity) on a 2px ring gives a crisp "THIS is selected" signal that still reads as part of the card's color family. This is a sanctioned deviation from the default opacity vocabulary because a tinted card beneath the ring already absorbs intensity — /20 or /50 on the ring would sit weaker than the card's own border.

  **Inactive card is a `bg-muted` shift, not `opacity-60`.** Opacity reads as a loading skeleton and kills text contrast for screen readers. Pattern for archived / cancelled / draft: `bg-muted/50` fill + `text-muted-foreground` title + hover suppressed, but the item remains clickable. Reserve `opacity-60 pointer-events-none cursor-not-allowed` for genuinely *unavailable controls* ("Send" mid-submit, a radio option gated by a prior answer).

  **Focus ring — one pattern + three sanctioned deviations.** Default is `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background` (use the `.focus-ring` utility on custom surfaces). Deviations:
  - **Dense list rows** (conversation list, command menu, message rows): `ring-2 ring-inset ring-ring/50` — inset avoids overlapping neighbors in a tight stack.
  - **Form inputs** keep the shadcn pattern (`ring-3 ring-ring/50` without offset). Muscle memory — don't touch.
  - **Menu items** (dropdown, combobox, select popover) use `focus:bg-accent` with no visible ring — that's the Radix/shadcn convention.

  **Status ≠ selection.** "Live now", "currently being processed", "last saved" are *status* concepts — use a `<Badge>` or dot indicator, never a ring. Rings are reserved for interaction state (hover/selected/focus). Mixing them confuses users into thinking an in-progress item is selected.

- **Status colors are signals, not decoration.** Four semantic tokens exist: `success` (positive state, delta up, payout sent), `destructive` (error, refund, delete), `warning` (caution, pending, under review), `info` (neutral notification, non-urgent). Never use raw Tailwind colour utilities (`bg-green-100`, `text-red-700`, `text-amber-500`, `bg-blue-100`) for semantic state — always use the token. Rule: max 1 chromatic color per card body (DeltaChip is its own element and doesn't count).
- **Accent colour (`chart-2`, blue-violet)** — the app's *one* chromatic accent for non-semantic emphasis. Five canonical uses, nothing else:
  1. **Data viz** — line/area/bar strokes and fills in recharts. Use `var(--color-chart-2)` in SVG / chart config.
  2. **Tinted icon container** (`bg-chart-2/10 text-chart-2` on a rounded square, size-9/10) — the icon is the chart-2-coloured element on a faint chart-2 wash. Used for "this row represents X" glyphs (activity icons, location pin).
  3. **Tinted interactive chip/toggle** — same tinted surface plus `border-chart-2/20` for button-like chrome, `hover:bg-chart-2/20 hover:text-chart-2` on hover. Used for favourite-toggles and accent chips.
  4. **Full-row tint** (`bg-chart-2/10`) where the content on top is **normal** `text-foreground` / `text-tertiary-foreground`, not chart-2. The blue is ambient emphasis ("next up"), not the content colour. Used sparingly — one highlighted row per list.
  5. **Solid live-indicator dot** (`bg-chart-2` + `animate-ping`) for "happening now" signals in dense lists. Never solid chart-2 elsewhere.
  - **Badge consumers:** don't hand-roll the tinted surface. Use `<Badge variant="accent">` — it bakes in `bg-chart-2/10 text-chart-2 border-transparent`.
  - **Don't mix with semantic state.** If a row is `success` (paid), don't also tint it chart-2. The accent is for category/emphasis, not state. Status tokens win.
  - **Opacity rule reminder:** stick to `/10` bg + `/20` border / hover. No `/15`, `/30`, `/25`, etc.
- **Form validation errors** use `text-xs font-medium text-destructive`. Keep 500 weight (colour alone isn't enough for colour-blind users) but DO NOT add `tracking-wide` — errors are sentences, not labels. Matches shadcn's own `<FormMessage>` convention.
- **Sentences vs labels at `text-xs` size** — the single biggest inconsistency to watch for.
  - **Label** (short, scannable, sits above a value or in a table header): `text-xs font-medium tracking-wide text-muted-foreground`. Examples: KPI labels ("Inntekter", "Kapasitet"), table column headers ("Navn", "Status"), dropdown menu section labels ("Betaling feilet"), chips ("Valgfritt", "per person"), short status tags.
  - **Sentence / descriptive prose** (flowing, reads left-to-right, ends in a period): `text-xs text-muted-foreground`. Drop both `font-medium` AND `tracking-wide`. Examples: settings row descriptions ("Oppdater passordet ditt."), form helper text under inputs, notification body text, banner body text, auth-page taglines, empty-state descriptions.
  - **The test:** read it out loud. If you'd hear it as a complete sentence, it's prose — no label styling. If it's a column header or 1–2 words describing a number, it's a label — keep `font-medium tracking-wide`.
  - **Don't mix:** `font-medium tracking-wide text-muted-foreground` is *label* styling applied to prose, which is the bug this rule prevents.
- **Interactive text (inline links):** inside dashboard surfaces use `text-foreground underline decoration-muted-foreground/40 underline-offset-2 hover:decoration-muted-foreground`. Don't use `text-accent` for inline dashboard links — reserve the accent for CTAs and the one-per-card signal role. On public/landing surfaces, accent-colored links are fine.
- **Canonical empty state pattern:**

  ```tsx
  <div className="flex flex-col items-center gap-1 py-8 text-center">
    <p className="text-sm font-medium text-foreground">{title}</p>
    <p className="text-xs text-muted-foreground">{description}</p>
    {/* optional CTA */}
    <Button size="sm" className="mt-3 gap-1.5">…</Button>
  </div>
  ```

  Don't invent new empty-state layouts — copy this and adjust copy only. The one exception is full-page empty states (no cards exist yet), which use `text-xl font-semibold` title + `text-sm text-muted-foreground` description and a primary `<Button>`.
- **Icon stroke width** — all lucide icons default to `stroke-width: 1.75` globally (set on `svg.lucide` in `src/index.css`). This pairs visually with Geist at weight 400–500 and stays crisp at small sizes (size-3.5 / size-4). 1.5 is too thin and sub-pixel-jagged at 16px; 2 is Tailwind-vanilla heavy. 1.75 is the sweet spot Vercel/Geist UI, modern Stripe, and Notion use.
  - **Do not write `stroke-[1.75]` manually** — it's redundant.
  - **Override with `stroke-[2]`** on icons paired with a `font-semibold` heading so icon weight tracks text weight (SF Symbols principle: 400 text ↔ 1.5, 500 ↔ 1.75, 600 ↔ 2).
  - **Override with `stroke-[1.5]`** only on large decorative icons (`size-8+`) where the heavier stroke feels clunky.
- **Icon size utility** — always use `size-*` (e.g. `size-4`, `size-3.5`), never the legacy `h-* w-*` pair. Tailwind v4's `size-*` is the canonical way.
- **Opacity on colour tokens** — only three allowed values: `/10` for tinted card/badge backgrounds, `/20` for borders on tinted surfaces, `/50` for subtle hover surfaces on `bg-muted`. Do NOT invent other percentages (`/40`, `/60`, `/70`, `/90`) — they read as arbitrary. If none of the three fit the case, the answer is either a dedicated token or the solid token (no opacity).
  - **Translucent glass bars** (sticky footers, floating topbars with backdrop-blur): use the `bg-surface-elevated` token, which has opacity pre-baked. Pair with `backdrop-blur-md` (default) or `backdrop-blur-xl` (heavier glass). Don't use `bg-background/80` — that's the pattern this token replaces.
  - **Muted text on a `bg-primary` surface** (dark CTA sections, stat cards on primary): use `text-primary-muted-foreground` instead of `text-muted-foreground`. Regular `muted-foreground` is tuned for white backgrounds and fails contrast on dark primary. The token is pre-baked at 70% primary-foreground so it reads correctly on the primary bg without random `/70` opacity noise.
- **Icon sizing matched to text** — icons inside a text row should match the line-box so nothing looks offset:

  | Text size | Icon size class | Notes |
  |-----------|-----------------|-------|
  | `text-xxs` / `text-xs` | `size-3.5` | 14px — meta rows, chip icons |
  | `text-sm` | `size-4` | 16px — standard button/label icons |
  | `text-base` | `size-4` or `size-5` | 16–20px |
  | `text-lg` | `size-5` | 20px |
  | `text-xl` / `text-2xl` | `size-6` | 24px — card title icons, stat card icons |

  Decorative/hero icons (empty state, onboarding) can go larger (`size-8` etc.) — this table is specifically for icons sitting next to text.
- **Data tables** — use the `<Table>` primitive set in `@/components/ui/table`:

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

  **The primitives bake in** the wrapper overflow, `w-full` sizing, header styling, body dividers, row hover, cell padding. **Width constraint is the page's job, not the table's** — the primitive fills its parent; if the page should cap dashboard content at e.g. `max-w-6xl` on ultra-wide screens, set that on the page's `<main>` or wrapper div (PaymentsPage already does this with `<div className="mx-auto max-w-5xl">`). Don't re-declare any of the baked-in properties on raw `<table>` / `<th>` / `<td>`.

  **Column-width rule — prevents the "columns clumped on the right" problem:**
  - **Identity column** (avatar + name + email block) — `className="min-w-[220px] max-w-[360px] w-[40%]"`. The `max-w` is critical; without it the column sprawls on wide screens and pushes everything else into a strip on the right.
  - **Fixed-content columns** (status, counts, actions) — fixed width: `w-40`, `w-12`, etc.
  - **Secondary-text columns** (email-as-a-column, course name, etc.) — `w-40` fixed or `hidden sm:table-cell` for mobile hiding.
  - **Action column** (menu trigger) — `w-12` or `w-16`, always last.
  - If columns total less than the container, the identity column absorbs the slack (up to its max-w). Past the max-w, the table stops growing — `max-w-6xl` on the `<Table>` itself caps the outer bound.

  **Responsive hiding** — use `hidden sm:table-cell` (show from sm up) or `hidden md:table-cell` (show from md up) on optional columns. Mobile collapses to identity + status + actions.

  **Don't skip the primitive.** Writing raw `<table>` or a plain `<div className="grid">` for a "simple" table is the reason this app had two near-identical hand-rolled tables. Every data table goes through `<Table>`.

- **Badges and pills** — one primitive (`<Badge>`) with three dimensions:

  | Prop | Options | Meaning |
  |------|---------|---------|
  | `variant` | `default` / `secondary` / `outline` / `ghost` / `link` (decorative) · `success` / `warning` / `destructive` / `info` / `neutral` (semantic) · `accent` (chart-2 tinted, for category tags) | Colour + emphasis |
  | `shape` | `pill` (default, `rounded-4xl`) · `rect` (`rounded-md`) | **`pill`** for card meta / counts / decorative chips · **`rect`** for status in tables / rows |
  | `size` | `xs` (11px) · `sm` (default, 12px) · `md` (12px, roomier) | Density |

  **Decision tree:**
  1. Payment status (`paid` / `pending` / `failed` / `refunded`) → **`<PaymentBadge>`**. Silent on `paid` by default (teacher/admin); pass `visibility="always"` for student-facing confirmations.
  2. Combined signup + payment state → **`<SignupStatusBadge>`** (derives the right label + variant, e.g. a cancelled-and-refunded signup reads as "Refundert").
  3. Course state (`draft` / `active` / `upcoming` / `completed` / `cancelled`) → **`<StatusBadge>`**.
  4. KPI delta (+12 %, −5 %) → **`<DeltaChip>`**.
  5. Anything else (counts, meta, decorative, tags) → **`<Badge>`** directly, picking variant + shape + size.

  **Canonical status → variant map** (baked into the typed wrappers — don't reinvent it per-usage):

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

  **Silence-on-success pattern:** `PaymentBadge` with default `visibility="exceptions"` renders NOTHING for `paid`. Use this in dense admin lists where the success state is the expected happy path — the badge should only appear when there's a problem to flag. Applied analogously: if you're tempted to show "Active" on every row of a list, consider whether silence on the happy path is clearer.

- **Buttons** — one primitive (`<Button>`) with three dimensions:

  | Prop | Options | Meaning |
  |------|---------|---------|
  | `variant` | `default` · `secondary` · `outline` · `outline-soft` · `ghost` · `destructive` · `link` · `plain` | Colour + emphasis |
  | `shape` | `default` (rect, `rounded-md`) · `pill` (`rounded-full`) | **`pill` only on hero CTAs in marketing / landing contexts.** Dashboard + forms always use rect so buttons share geometry with adjacent inputs. |
  | `size` | `xs` · `sm` · `default` · `lg` · `cta` · `icon` · `icon-xs` · `icon-sm` · `icon-lg` | Density |

  **Variant decision tree:**
  - `default` → **primary** action per section. Max 1–2 per screen. Solid primary-colour fill.
  - `secondary` → alternative action (e.g. "Avbryt" paired with a default). Subtle gray fill.
  - `outline` → secondary action with more chrome (toolbars, filter buttons). Border + full text colour.
  - `outline-soft` → tertiary / cancel in dialogs. Same shape as `outline` but text is `muted-foreground` — softer than `outline`.
  - `ghost` → icon buttons, nav items, close buttons, hover-revealed actions.
  - `destructive` → destructive action (delete, cancel-with-refund, remove). **Solid red** — use in both menus/inline AND AlertDialog confirmations. Don't pair two destructive buttons in the same action row.
  - `link` → inline text link styled as button (rare).
  - `plain` → **inline text action** with button semantics but no chrome (no background, no border, no height). Renders `h-auto p-0` with `muted-foreground` → `foreground` on hover. Use for "Vis alle", "Nullstill", "Tilbake", "Legg til punkt" — actions that read as text inside a card/row, not as a pill. Size prop still controls font-size (`xs` for `text-xs`, `sm` for `text-sm`). Do not reach for this when a real button is warranted.

  **Size decision tree:**
  - `xs` (h-6) → dense toolbars, chip-adjacent actions.
  - `sm` (h-8) → default for in-table / in-card actions.
  - `default` (h-9) → standard page actions.
  - `lg` (h-10) → rare, emphasised actions.
  - `cta` (h-11) → **full-width CTA in auth forms / modal primary / hero**. Replaces ad-hoc `className="h-11"` — always use this size.
  - `icon` / `icon-xs` / `icon-sm` / `icon-lg` → square icon-only buttons.

  **Shape rule:** `shape="pill"` is permitted on `src/pages/public/**` and marketing-adjacent contexts for hero CTAs. Everywhere else stays default rect so buttons visually pair with inputs/fields. **Never mix pill and rect in the same form, toolbar, or action group.**

  **AlertDialog confirmations:** `AlertDialogAction` accepts `variant` + `size` props that flow to the underlying Button. For a destructive confirmation, use `<AlertDialogAction variant="destructive">` — **do not** hand-roll `className="bg-destructive text-destructive-foreground"`.

  **Anti-patterns:**
  - ❌ `<Button className="h-11 w-full">` → ✅ `<Button size="cta" className="w-full">`
  - ❌ `<Button className="bg-destructive text-destructive-foreground">` → ✅ `<Button variant="destructive">`
  - ❌ `<Button className="rounded-full">` → ✅ `<Button shape="pill">`
  - ❌ `<Button className="active:scale-[0.95]">` — press feedback via className is inconsistent; the primitive already provides subtle `active:translate-y-px`. Don't add more.
  - ❌ Icon-only buttons with `className="size-8"` → ✅ `<Button size="icon-sm">`
  - ❌ `<Button variant="ghost" className="h-auto p-0 text-muted-foreground hover:bg-transparent hover:text-foreground">` → ✅ `<Button variant="plain" size="xs">` (or `size="sm"` for `text-sm`)

- **Spacing inside cards:** stick to three values, applied consistently:
  - Title → subtitle: `mt-0.5` (single-line descriptions) or `mt-1` (two-line descriptions)
  - Header → content: `CardHeader` + `CardContent` already handle this — don't hand-add margins
  - Row → row in dense lists: `space-y-1` (activity, signups) or `space-y-3` (upcoming classes with visual chunks)
- **Card padding tiers** — surface determines the tier, not designer preference. No `p-5`, no `p-7`.

  | Tier | Padding | Use for |
  |------|---------|---------|
  | Compact | `p-3` | Inline mini-panels (notification bubble, small decorative tiles) |
  | Dense dashboard | `p-4` | In-Card-primitive panels, chat bubbles, inline edit panels, small forms |
  | Standard | `p-6` | Default dashboard cards (collapsible panels, empty states, standard public cards like course signup) |
  | Form hero | `p-6 sm:p-8` | Primary page forms (create-course, welcome-flow onboarding) |
  | Marketing card | `p-8` | Landing feature cards |
  | Mega hero | `p-8 md:p-12` | Full-bleed landing hero cards |

  The `<Card>` primitive itself bakes in `py-6 px-6` (default) or `py-4 px-4` (`size="sm"`) via its sub-components — consumers of `<Card>` don't need to hand-add padding. These tiers apply to **hand-rolled card-like surfaces** (`<div className="rounded-lg border bg-card ...">`).

- **Row padding tiers** — two valid patterns, pick by container:

  | Container | Row padding | Rationale |
  |-----------|-------------|-----------|
  | `<Card>` primitive (already has `px-6`) or hand-rolled card with its own padding | `px-4 py-3` | Card provides outer gutter; rows are dense. Used in MessagesList, RegistrationsList, ConversationList. |
  | Zero-padded card (`<Card className="p-0">` or hand-rolled without `p-*`) | `px-6 py-4` | Rows own the gutter. Used in PaymentsPage transactions, TeacherProfilePage settings rows. |

  Don't invent `py-3.5`, `py-2.5`, `px-5` — if you need denser rows, drop to the compact chip size (`px-3 py-2.5` for tight nested metadata rows); if you need roomier, step up the card's tier instead of hand-tuning the row.

- **Stack gap scale** — use `0.5 / 1 / 2 / 3 / 4 / 6 / 8 / 10` on `space-y-*` and `gap-*`. **Skip 5 and 7** — they signal hand-tuning. If `space-y-4` feels too tight and `space-y-6` feels too loose, the answer is usually that the content tiers are off, not the gap.
  - `space-y-1` / `space-y-2` — tight meta rows, dense activity lists
  - `space-y-3` / `space-y-4` — default list and form field stacks
  - `space-y-6` — card sections inside a page
  - `space-y-8` — top-level page sections (dashboard page → standard)
  - `space-y-10` — public marketing-style sections only

- **Page container scale** — pick the pattern by surface:

  | Surface | Pattern |
  |---------|---------|
  | Dashboard page | `<div className="mx-auto max-w-5xl space-y-8">` (or `max-w-6xl` for data-heavy pages like CoursesPage, SignupsPage) |
  | Public content page (course detail, docs) | `<main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">` |
  | Public listing | `<main className="mx-auto max-w-4xl px-6 py-8 sm:py-12">` |
  | Prose / terms / legal | `<main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">` + `space-y-10` inside |

  `CourseDetailPage` is the deliberate exception — full-width layout with its own sidebar framing, no `mx-auto max-w-*`. Don't use it as a template for normal pages.
- The **shadcn skill** is the #1 authority on component patterns — never overwrite its guidance.
- If there is a conflict between existing code and shadcn skill recommendations, ask for user approval before changing.

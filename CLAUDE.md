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
- **Placeholders**: default to **no placeholder**. The visible label above the input is the primary signal — placeholder is only allowed when it adds something the label can't convey.
  - **Forbidden**: `F.eks. X` prefixes, example data (`ola@eksempel.no`, `Ola Nordmann`, `Inspire Yogastudio`), placeholder-as-label (input with no visible label, only ghost text), redundant instructions (`Skriv inn navn` when the label already says `Navn`).
  - **Allowed**: format hints when the format isn't obvious (`9xx xx xxx`, `X4P-7K9`, `dd.mm.åååå`, `MM / ÅÅ`); action prompts in genuine search/action inputs (`Søk …`, `Skriv en melding …`, `Skriv en kort begrunnelse …`).
  - **Why**: example-data placeholders look like the field is already filled, get confused with real data on scan, fail accessibility (low-contrast ghost text + screen readers), and strain short-term memory (label vanishes on focus). Modern SaaS (Stripe, Linear, Vercel, Notion) avoid `e.g. …` placeholders entirely.
  - **Test**: read the label out loud, then read the placeholder. If the placeholder repeats or paraphrases the label, drop it. If it adds a format constraint or a verb the label can't carry, keep it.

## Git

- Commit after each completed fix or feature, not in bulk
- After committing, suggest pushing to GitHub (but wait for user confirmation)
- Don't amend previous commits — always create new ones

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

## Integrations & External APIs

- **Don't guess API shapes, field names, or endpoint paths.** Before recommending or writing integration code: (1) grep the codebase for existing usage, (2) consult the official docs for the integration, (3) if both are silent, ask before committing to a shape.
- **Cite the source** when recommending integration details — "per `supabase/functions/_shared/dintero.ts`" or "per Dintero docs `/v1/sessions-profile`". An uncited API fact is a guess.
- **Don't reach for patterns from superseded integrations.** Stripe Connect was replaced by Dintero in April 2026. `stripe_*` columns, `create-payment-intent`, `stripe-webhook`, and `@stripe/*` SDKs no longer exist — if you're about to import or reference any of these, stop.
- **Prefer reading over running** for investigation. A focused `Grep` or `Read` on the integration module beats spinning up the integration to observe behavior.
- For Dintero specifically, see the `dintero-payments` skill.

## Design System

- **Two registers, by design.** The app has two visual surfaces with different calibration:
  - **Public** (`src/pages/public/**`, `src/components/public/**`, `src/components/auth/**`) — calm, confident, marketing-leaning. `text-base` body. More breathing room. Up to four text tiers available. This register is **stable** — prospects validated it.
  - **Dashboard** (`src/pages/teacher/**`, `src/components/teacher/**`) — calm and *readable*, **not dense**. `text-base` body. Two text tiers. Progressive disclosure for technical/admin detail (payment IDs, refund mechanics, raw timestamps) — keep them behind "Detaljer" expanders, not surface them by default. (This is post-feedback recalibration as of 2026-04-27 — see `tasks/post-mvp-feedback.md`. Pre-shift, dashboard was deliberately dense at `text-sm`. That direction was wrong for the actual user persona.)
  - The rules below are tagged **(public)** or **(dashboard)** where they differ. Untagged rules apply to both.
- The shadcn preset `b1Z5aAzb6` (radix-vega) in `src/index.css` is the single source of truth for colors, radius, and font. `components.json` pins style to `radix-vega` and `iconLibrary` to `lucide`.
- Use shadcn primitives from `@/components/ui/` over custom UI.
- Icons: **always import from `@/lib/icons`** (never from `lucide-react` directly). The barrel re-exports the set of lucide icons the app uses and inlines a few brand marks (`Facebook`, `Linkedin`, `Twitter`) that lucide dropped. If you need an icon that isn't exported, add it to `src/lib/icons.tsx` rather than importing `lucide-react` elsewhere.
- Typography: use raw Tailwind utilities (`text-sm font-medium`, `text-3xl font-semibold tracking-tight`, etc.) — no `type-*` classes. Line-height and letter-spacing are baked into the `--text-*` tokens in `src/index.css`; don't hand-tune `leading-*` or `tracking-*` unless you deliberately need to break the scale.
- **Font family:** **Geist** (`font-sans`, default) — used for *everything*. Body, headings, UI labels, form fields, prose, KPI values, identifiers, codes, prices. There is no monospace font in the app (Geist Mono was removed 2026-04-25 to keep the visual register consistent). Don't reach for `font-mono` — Tailwind's `font-mono` utility no longer maps to a custom token.
- **Digit alignment**: when numeric values need to align across rows (KPI cards, table cells, prices, time columns), add `tabular-nums` to the containing element. This works on Geist sans and gives column-stable digits without switching font family.
- **Surface context — how to know whether you're in "landing" or "dashboard" when editing:**

  | Path | Surface | Body size | Notes |
  |------|---------|-----------|-------|
  | `src/pages/public/**` | Public / landing / booking | `text-base` (16px) | Marketing voice. More breathing room. Display tier allowed on hero. |
  | `src/components/public/**` | Public components | `text-base` (16px) | Same rules as public pages. |
  | `src/pages/teacher/**` | Dashboard | `text-base` (16px) | Calm and readable — **not dense**. Two text tiers in normal use. Progressive disclosure for admin detail. No display tier — max heading is `text-3xl`. |
  | `src/components/teacher/**` | Dashboard components | `text-base` (16px) | Same rules as dashboard pages. |
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
  | Body (dashboard/app) | `text-base` | 16px | Teacher-area body, form labels, list items. **Was `text-sm` before the 2026-04-27 calibration shift** — see thesis at top of Design System. |
  | Meta | `text-sm` (dashboard) / `text-xs` (public) | 14px / 12px | Timestamps, table cells, captions. Dashboard meta steps down to `text-sm` so it stays readable; public meta can drop further. |
  | Micro label | `text-xs font-medium tracking-wide` (dashboard) / `text-xxs` (public) | 12px / 11px | Uppercase tracked labels, KPI labels, indicators. Dashboard avoids `text-xxs` (too small for the audience). |

  Pair with weight + tracking conventions: `font-medium` (500) for UI labels, `font-semibold` (600) for headings — never `font-bold` (700), that reads marketing-heavy.
- **Text colour tiers** — four tokens exist, but **dashboard uses two**, public can use up to four:

  | Token | Tailwind class | Use for |
  |-------|---------------|---------|
  | `--foreground` | `text-foreground` | Primary: headings, body |
  | `--muted-foreground` | `text-muted-foreground` | Secondary: descriptions, form labels, row meta |
  | `--tertiary-foreground` | `text-tertiary-foreground` | **(public only)** Tertiary timestamps, row meta on marketing surfaces |
  | `--disabled-foreground` | `text-disabled-foreground` | Disabled state, bullet separators (any surface) |

  - **(dashboard)** Stick to `text-foreground` + `text-muted-foreground`. Don't reach for `tertiary-foreground` — the calm-register direction calls for two clear tiers, not four. `disabled-foreground` is fine when a control is genuinely disabled.
  - **(public)** All four tiers are available. Tertiary is fine on marketing pages where layered meta reads as polish.
  - Don't use `opacity-*` on text to fake a tier — pick the right token.
- **Meta rows sit on one tier, not two.** If a card/row has multiple lines of metadata under a primary title (e.g. "type + location" on one line, "next session date" on the next), they're equal-weight information — both go on `text-muted-foreground`. Don't drop one line to `text-tertiary-foreground` just because it contains a timestamp. **(public)** Tertiary is reserved for meta that's genuinely *less* important than the line above it (e.g. a timestamp in the corner of an activity row, next to a primary+secondary pair). **(dashboard)** This case rarely arises since dashboard avoids tertiary — keep meta on `text-muted-foreground`.
- **Weight discipline:** `font-medium` (500) for UI labels, chips, button text. `font-semibold` (600) for headings and emphasised body. **Never `font-bold` (700)** — it reads marketing at dashboard sizes and breaks the calm feel. If you need more emphasis, step up the size token before reaching for a heavier weight.
- **Inline numbers in sentences:** for numbers that appear inside copy ("12 av 14 påmeldte"), add `tabular-nums` to the containing element so digits align across rows even though the surrounding text is variable-width.
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

  **Whole-card-clickable tiles** (course tiles, event cards) deepen the ring instead of swapping fill. **Category-tinted cards** (schedule events, success-tinted tiles) use a solid-colour selection ring that matches the card's colour family — sanctioned opacity deviation because the tint already absorbs intensity. Full state tables for both → [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md#whole-card-clickable-tiles--deepen-ring-pattern).

  **Inactive card is a `bg-muted` shift, not `opacity-60`.** Opacity reads as a loading skeleton and kills text contrast for screen readers. Pattern for archived / cancelled / draft: `bg-muted/50` fill + `text-muted-foreground` title + hover suppressed, but the item remains clickable. Reserve `opacity-60 pointer-events-none cursor-not-allowed` for genuinely *unavailable controls* ("Send" mid-submit, a radio option gated by a prior answer).

  **Focus ring** — default is the `.focus-ring` utility (offset-2, `ring-ring`). Three sanctioned deviations for dense list rows, form inputs, and menu items — [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md#focus-ring--one-pattern--three-sanctioned-deviations).

  **Status ≠ selection.** "Live now", "currently being processed", "last saved" are *status* concepts — use a `<Badge>` or dot indicator, never a ring. Rings are reserved for interaction state (hover/selected/focus). Mixing them confuses users into thinking an in-progress item is selected.

- **Status colors are signals, not decoration.** Four semantic tokens exist: `success` (positive state, delta up, payout sent), `destructive` (error, refund, delete), `warning` (caution, pending, under review), `info` (neutral notification, non-urgent). Never use raw Tailwind colour utilities (`bg-green-100`, `text-red-700`, `text-amber-500`, `bg-blue-100`) for semantic state — always use the token. Rule: max 1 chromatic color per card body (DeltaChip is its own element and doesn't count).
- **Accent colour (`chart-2`, blue-violet)** — the app's *one* chromatic accent for non-semantic emphasis. Consume via `<Badge variant="accent">` or a `bg-chart-2/10 text-chart-2` tinted container; never hand-roll the surface. Don't mix with semantic state — if a row is `success`, it doesn't also get tinted chart-2. Five canonical uses only (data viz, tinted icon container, tinted chip, full-row tint, live-indicator dot) — [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md#chart-2-accent--five-canonical-uses).
- **Wellness pastel palette** — five categorical tones for the public/booking flow only: `sage` (neutral category), `rose` (lively positive), `lavender` (premium/featured), `sand` (calm fallback / generic info container), `sky` (info / "ny"). Each has a tinted variant (default, for inline badges and panel surfaces) and a `*-solid` companion (for image overlays only — never on panel backgrounds). Consume via `<Badge variant="sage|rose|lavender|sand|sky">` or `bg-{tone} text-{tone}-foreground` for panels.
  - **Sentence case only** — never paired with `uppercase` or `tracking-[0.12em]`. The whole point is the calmer treatment.
  - **Max 1 tone per section.** Adjacent info panels share one tone (e.g. all sand) so the eye reads them as a related family. Never stack three different pastel panels next to each other — that's fruit salad.
  - **Never colour both a badge and a panel inside the same card.** Same-coloured badge + panel reads as "they mean the same thing"; different colours read as competing for attention. Pick one element per card to carry the pastel.
  - **Solid variants are overlay-only.** `bg-rose-solid`, `bg-sand-solid`, etc. exist for image overlays where tints disappear against photos. They'd read as alarming at panel scale — never use them for backgrounds.
  - **Dashboard surfaces stay neutral.** This palette is wellness-themed, intended for public and booking surfaces. Inside `src/pages/teacher/**` and `src/components/teacher/**`, keep using `bg-muted` / semantic tokens — the dashboard density doesn't tolerate categorical pastels well.
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
- **Icon size matches text line-box.** Quick map: `text-xs` → `size-3.5`; `text-sm` → `size-4`; `text-lg` → `size-5`; `text-xl`/`text-2xl` → `size-6`. Decorative/hero icons can go larger (`size-8+`). Full table → [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md#icon-size--text-size-table).
- **Data tables** — always use the `<Table>` primitive set in `@/components/ui/table`. The primitives bake in wrapper overflow, `w-full`, header styling, dividers, hover, cell padding. Width constraint is the *page's* job (e.g. `<main className="mx-auto max-w-6xl">`), not the table's. Identity column needs `min-w-[220px] max-w-[360px] w-[40%]` (the `max-w` prevents "columns clumped on the right" on wide screens); fixed columns use `w-40`/`w-12`; optional columns use `hidden sm:table-cell` or `hidden md:table-cell`. **Never hand-roll a `<table>` or `<div className="grid">` for data.** Full template + column-width rules → [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md#table--canonical-template--column-width-rule).

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

  **Don't hand-roll status pills.** Never write `<Badge variant="secondary" className="bg-success/10 text-success ring-success/20">` — that's `<Badge variant="success" shape="rect" size="sm">`. The primitive owns the colour/shape mapping. Reach for `className` overrides on a status badge and something is wrong.

  **Shape-by-context:** card meta like "Denne måneden" / "Siste 7 dager" / "{N} av {M}" uses `shape="pill"` + `variant="secondary"`. Status in a table/list — anything rendered via the typed wrappers — uses `shape="rect"`. Don't mix.

  Full status → variant lookup table → [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md#badge--canonical-status--variant-map).

  **Silence-on-success pattern:** `PaymentBadge` with default `visibility="exceptions"` renders NOTHING for `paid`. Use this in dense admin lists where the success state is the expected happy path — the badge should only appear when there's a problem to flag. Applied analogously: if you're tempted to show "Active" on every row of a list, consider whether silence on the happy path is clearer.

- **Buttons** — one primitive (`<Button>`) with three dimensions:

  | Prop | Options | Meaning |
  |------|---------|---------|
  | `variant` | `default` · `secondary` · `outline` · `outline-soft` · `ghost` · `destructive` · `link` · `plain` | Colour + emphasis |
  | `shape` | `default` (rect, `rounded-md`) · `pill` (`rounded-full`) | **`pill` only on hero CTAs in marketing / landing contexts.** Dashboard + forms always use rect so buttons share geometry with adjacent inputs. |
  | `size` | `xs` · `sm` · `default` · `lg` · `cta` · `icon` · `icon-xs` · `icon-sm` · `icon-lg` | Density |

  **Variant quick map:** `default` (primary, 1–2/screen) · `secondary` (paired alternative) · `outline` (toolbar/filter) · `outline-soft` (dialog cancel) · `ghost` (icon, nav) · `destructive` (solid red, used in menus AND AlertDialogs) · `link` (rare inline) · `plain` (inline text action with button semantics — `h-auto p-0`, for "Vis alle"/"Nullstill"/"Tilbake" inside a card).

  **Size quick map:** `xs` (h-6, dense toolbar) · `sm` (h-8, in-table/in-card default) · `default` (h-9, page action) · `lg` (h-10, rare) · `cta` (h-11, full-width form/modal/hero primary) · `icon*` (square icon-only). **Never** use `className="h-11"` — use `size="cta"`.

  **Shape rule:** `shape="pill"` only on `src/pages/public/**` hero CTAs. Dashboard + forms stay rect so buttons pair with inputs. Never mix pill and rect in the same form/toolbar/action group.

  **AlertDialog:** `<AlertDialogAction variant="destructive">` — don't hand-roll `className="bg-destructive..."`.

  **Never reach for `className` when a prop exists:** `rounded-full`→`shape="pill"`; `bg-destructive`→`variant="destructive"`; `size-8` on icon button→`size="icon-sm"`; `h-auto p-0 text-muted-foreground hover:text-foreground`→`variant="plain"`; `active:scale-[0.95]`→primitive already does `active:translate-y-px`. Full variant/size reference + anti-pattern examples → [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md#button--full-variantsize-spec).

- **Spacing inside cards:** stick to three values, applied consistently:
  - Title → subtitle: `mt-0.5` (single-line descriptions) or `mt-1` (two-line descriptions)
  - Header → content: `CardHeader` + `CardContent` already handle this — don't hand-add margins
  - Row → row in lists: `space-y-2` is the new dashboard default (was `space-y-1` pre-calibration). Tight `space-y-1` is for genuinely dense activity feeds; `space-y-3` for upcoming-classes-style chunks; `space-y-4` for roomy lists where each row is a meaningful unit. **(dashboard) lean roomier** unless density actually serves the content.
- **Card padding:** `<Card>` primitive bakes in `py-6 px-6` (or `py-4 px-4` for `size="sm"`) — consumers don't add padding. For hand-rolled card surfaces (`<div className="rounded-lg border bg-card ...">`), pick from the fixed tier set: `p-3` (compact mini-panels), `p-4` (dense dashboard panels — **(dashboard) avoid for primary surfaces post-calibration; use `p-6`**), `p-6` (standard, dashboard default), `p-6 sm:p-8` (form hero), `p-8` (marketing), `p-8 md:p-12` (mega hero). **No `p-5`, no `p-7`.** Full table → [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md#card-padding-tiers).

- **Row padding** — pick by container: rows inside a padded card → **(dashboard)** `px-4 py-3.5` is the new default (was `px-4 py-3`); the extra 2px lets `text-base` body breathe. Rows inside a zero-padded card (`<Card className="p-0">`) → `px-6 py-4`. Don't invent `py-3.5`/`px-5` (besides the sanctioned `py-3.5`); if denser, drop to `px-3 py-3`; if roomier, step up the card tier. See [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md#row-padding-tiers).

- **Stack gap scale** — use `0.5 / 1 / 2 / 3 / 4 / 6 / 8 / 10` on `space-y-*` and `gap-*`. **Skip 5 and 7** — they signal hand-tuning. If `space-y-4` feels too tight and `space-y-6` feels too loose, the answer is usually that the content tiers are off, not the gap.
  - `space-y-1` / `space-y-2` — tight meta rows, dense activity feeds
  - `space-y-3` / `space-y-4` — default list and form field stacks (**(dashboard)** lean toward `space-y-4`)
  - `space-y-6` — card sections inside a page
  - `space-y-8` — top-level page sections (dashboard page → standard)
  - `space-y-10` — public marketing-style sections only

- **Page containers:** dashboard page content uses `max-w-5xl space-y-8` (left-aligned, NOT `mx-auto`-centered — the heading sits at the left edge of the page padding, and the content cards align directly under it). Bump to `max-w-6xl` for data-heavy pages. Public content → `mx-auto max-w-5xl` (centered is correct on landing/booking surfaces). Public listing → `mx-auto max-w-4xl`. Prose/legal → `mx-auto max-w-3xl space-y-10`. `CourseDetailPage` is the deliberate full-width exception — don't template from it. Full patterns → [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md#page-container-scale).
- The **shadcn skill** is the #1 authority on component patterns — never overwrite its guidance.
- If there is a conflict between existing code and shadcn skill recommendations, ask for user approval before changing.

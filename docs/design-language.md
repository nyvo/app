# Design Language: Monochrome Minimal

How UI in this app should look and behave. When refactoring existing components or
building new ones, conform to these rules.

**Precedence:** `src/index.css` is the single source of truth for tokens (colors,
radius, type scale) — this document never redefines a value, it tells you which
token to reach for. `CLAUDE.md` rules override this document. This document
overrides ad-hoc styling habits.

Reference aesthetic: Time2book, Mercury, Linear. Airy, soft-rounded, monochrome.
**Near-black is the action color.** Azure blue (`--primary`, hue-matched to the
cool neutral ramp) is a sprinkle accent — links and selected states, never
buttons or decoration. Green/amber/red are status
only. Categorical blues (`--category-*`) are identity markers only.

---

## 1. Core principles

1. **Separation by an escalation ladder — use the earliest step that works,
   never skip ahead:** whitespace → hairline (`border-subtle`) → background tint
   (`bg-muted` / `--primary-subtle`) → visible border (`border-card` / `border`)
   → shadow (`shadow-soft` on focal floating cards; `shadow-float` on overlays).
   Borders are a legitimate rung here, not a smell, but `border-card` is
   reserved exclusively for the floating-focal-card edge (booking rail,
   checkout) — it is not a general card border. Plain `border` is for
   dividers and form-control boundaries on white, not for framing cards.
2. **No brand color on chrome.** Primary actions are near-black fills
   (`bg-foreground text-background`). Active states are grey fills
   (`bg-muted`) or foreground text. The blue primary appears only as sprinkle:
   inline links, selected-state tint (`--selection-light`), framed-card tint
   (`--primary-subtle` + `--primary-border`).
3. **Hierarchy through spacing and the tier gaps, not bold weights.** The tiers:
   surface → border → muted text (`text-foreground-muted`) → foreground. Weight
   contrast is `font-medium` vs normal; `font-semibold` is rare (stat figures,
   page titles), `font-bold` is effectively banned in app UI.
4. **Soft-rounded, not pill-everything.** Surfaces use the 4–10px radius scale;
   text buttons share the input radius (`rounded-xl`, 10px) so they sit flush
   with form fields; only icon-only buttons, chips, badges, and avatars are
   fully round.
5. **Flat with subtle depth.** No shadows on resting cards. Two sanctioned
   exceptions: `shadow-soft` on the focal floating cards (booking rail, checkout
   summary, receipt pane — paired with `rounded-2xl`), and `shadow-float` on
   overlays (dialogs, popovers, dropdowns, toasts).

---

## 2. Tokens — what to reach for

All tokens live in `src/index.css` (3-layer OKLCH: primitives → semantic →
`@theme` utilities). Consume **semantic** tokens only, never `--neutral-*` /
`--jade-*` primitives. Never hard-code hex or raw `oklch()` in components.

| Need | Token / utility |
|---|---|
| Page background | `bg-background` (white) |
| Dashboard page background | `bg-canvas` (= white; legacy name) |
| Utility panel fill (secondary content) | `bg-panel` — the only grey fill muted text is AA on |
| Tinted interactive card + hover | `bg-primary-subtle` → `hover:bg-selection` |
| Floating focal card (booking rail, checkout) | `bg-surface` + `border-border-card` + `shadow-soft` — the ONLY carded surface |
| THE light neutral fill (secondary buttons, active nav, chips) | `bg-muted` |
| Hover / pressed fill on any surface, any theme | `bg-hover` / `bg-pressed` (foreground ink @ 6% / 12%) |
| Primary text | `text-foreground` |
| Secondary text (AA on white) | `text-foreground-muted` |
| Decorative glyphs/icons only (fails AA for text) | `text-foreground-subtle` |
| Primary action fill | `bg-foreground text-background` |
| Sprinkle accent (links, selected) | `text-primary`, `--selection-light`, `bg-primary-subtle` + `border-primary-border` |
| Status | `text-success` / `-warning` / `-danger` / `-info`; tinted fills via the `-subtle` pair (never `/10` opacity hacks) |
| Categorical identity markers (tags, chart series) | `bg-category-1/2/3` — small marker fills only, never text/surfaces/actions |
| Dividers | `border-border-subtle` (hairline) or `border-border` (visible, on white) |
| Form-control boundary | `border-border-strong` (checkbox, switch track); text fields are borderless (filled) |
| Focus ring | `ring-2 ring-ring` (neutral foreground — never brand-colored) + offset; soft halo = `ring-ring-subtle`, never as the only cue |
| Dark chrome (toasts, marketing bands — NOT the sidebar) | `--chrome-*` |
| Currency | `formatKroner()` from `@/lib/utils`, always |

### Radius

App scale (do not import 16–20px card radii from other systems):

- `rounded-sm` 4px — tight chips, mini thumbs
- `rounded-md` 6px — inputs
- `rounded-lg` 8px — list rows, badges, image thumbs
- `rounded-xl` 10px — **THE surface radius**: cards, panels, dialogs, text buttons
- `rounded-2xl` 12px — marketing surfaces + focal floating cards (with `shadow-soft`)
- `rounded-3xl` 16px — oversized marketing bands
- `rounded-full` — icon-only buttons, chips/badges, avatars, status dots

### Spacing

4px grid. Card padding 20–24px; section vertical gap 48–64px; related elements
8–12px. Primary list rows are tall and airy — density comes from removing
columns, not shrinking rows. Err generous.

### Typography

Use the built-in scale (`text-xs` … `text-5xl`) — per-size letter-spacing is part
of the token; **never add `tracking-*` on top**. Display caps at `text-5xl`
(48px); 6xl+ won't compile.

- App body: `text-base`. Meta/labels/controls: `text-sm`. Captions/chips: `text-xs`.
- Page titles: `text-2xl`; dashboard hero: `text-3xl`. Public h1: `text-4xl`.
- Weights: normal (body) and `font-medium` (labels, nav, buttons, emphasis).
  `font-semibold` sparingly — stat figures, page titles. `font-bold`: no.
- Three-tier rule: titles = medium/semibold + `text-foreground`; body = normal +
  `text-foreground`; supporting = normal + `text-foreground-muted`. Don't invent
  extra tiers with size.
- In table rows and list items, exactly one element carries weight (the
  name/primary cell); everything else is normal, metadata muted.
- Stat pattern: figure large + `text-foreground`, label small + muted. Be
  consistent within a component type.
- `tabular-nums` for any column of numbers.

---

## 3. Components

### Buttons (`src/components/ui/button.tsx` is authoritative)

- Variants: `default` (near-black fill — max 1–2 per screen), `secondary`
  (muted fill, the pairing for "Avbryt"), `ghost` (transparent → `bg-muted` on
  hover; row actions, nav), `soft` (persistent muted circle for icon controls:
  close ×, kebab, share), `outline` (special-case emphasis on filled/photo
  surfaces — default to `secondary` instead), `destructive`, `link`, `plain`.
- Text buttons are `rounded-xl` (sit flush with inputs); icon-only are circular.
- Heights: 44px default/cta, 40px `lg` (modal footers). Touch surfaces: minimum 44px.
- No hover scale/lift; the default variant deliberately has no hover darken
  (near-black + darken reads as noise).

### Cards

Three recipes — pick by role:

1. **Invisible card (table/list rows):** no fill, no border. Separation =
   `border-subtle` hairline + tall padding. Hover: `bg-hover`, `rounded-lg`.
2. **Framed/tinted card (interactive or selected list items):** selected state
   uses `--selection-light`; framed emphasis cards use `bg-primary-subtle` +
   `border-primary-border`. No shadow.
3. **Utility panel:** `bg-panel`, `rounded-xl`, no border, no shadow — page
   background is white; `border-card` + `shadow-soft` survives only on floating
   focal cards (booking rail, checkout, landing hero).

Focal floating cards (booking rail, checkout summary, receipt) additionally get
`rounded-2xl` + `shadow-soft`. Hover on interactive cards: `bg-hover` overlay —
no lift, no shadow.

### Sidebar

White rail (`--sidebar` = background), separated by a `border-subtle` divider.
Items: 20px stroke icons + medium label, muted when inactive, foreground when
active. Hover fill `--sidebar-accent` (= `--hover`), active fill
`--sidebar-active` (= `--muted`), soft-rounded. Never a left bar, never an
underline, never colored text alone. `--chrome-*` dark surfaces are for toasts
and marketing bands only — not the sidebar.

### Tabs

Text labels: muted inactive, `font-medium text-foreground` active with a 2px
foreground underline. No pill tabs, no boxed tabs.

### Inputs

Filled and borderless: `bg-muted` with a transparent border, `rounded-xl`.
Focus: `border-foreground` + soft ring. Inside grey panels, fields override to
`bg-background dark:bg-muted` so they don't vanish. `--input` no longer edges
text fields. Labels above inputs: `text-sm font-medium text-foreground` (not
muted — labels are read).

### Chips / badges / status

Soft-rounded or full pill, `bg-muted` fill, foreground or muted text, `text-xs`,
medium. Status = a small `bg-success` / `bg-danger` dot beside muted text, or a
`-subtle` tinted pill (`bg-success-subtle text-success`) — never a saturated
filled badge, never color alone (pair with text). Selection on choice chips =
fill change (`--selection-light` or `bg-muted`), never a colored border alone.

### Tables / lists

No vertical rules ever. Row separation: `border-subtle` hairline or spacing.
Header row: `text-xs`/`text-sm`, muted, no fill. Tall rows; one weighted cell
per row; metadata as small muted stroke-icon+text pairs. Row hover: `bg-hover`.

### Progress bars

Track `bg-muted` (or `--neutral-4` equivalents already in use), fill
`bg-foreground` — brand color only when the bar itself is the sprinkle (rare).
6–8px, rounded ends.

### Charts

No axis lines, no gridlines, no boxed legends where labels can sit inline.
Monochrome by default: inactive series in light neutral, active/current in
`--foreground`. Series identity via `--category-1/2/3` (blue family) markers.
Green/red only when the data itself is positive/negative. Rounded bar caps;
small muted labels under the data.

### Overlays

Dialogs, popovers, dropdowns, toasts: `bg-surface`, `rounded-xl`,
`shadow-float`. Toasts use `--toast-surface` (dark chrome).

### Icons

One stroke set (Lucide), 1.5–2px stroke, 16–20px in UI. Decorative icons
`text-foreground-subtle`; informative icons `text-foreground-muted`. Never mix
in filled/solid sets.

---

## 4. Motion

- Transitions: 150–200ms `ease-out` on background-color, color, opacity
  (`transition-colors duration-150` is the house pattern).
- No scale, bounce, or translate on hover. Buttons may keep the existing
  1px `active:translate-y-px` press affordance.
- Page/panel entrances: fade + 4–8px rise, ~200ms, optional.

---

## 5. Refactor rules — patterns to find and replace

When touching existing code, hunt for these and convert them:

| Remove / find | Replace with |
|---|---|
| Hard-coded hex / raw `oklch()` / `--neutral-*` primitives in components | Semantic tokens (§2) |
| Brand-blue fills on buttons or active nav | `bg-foreground` fill; `bg-muted` active states; brand blue stays on links + selected tints |
| Saturated filled status badges | `-subtle` tinted pill or status dot + text |
| `bg-success/10`-style opacity hacks | The opaque `-subtle` token |
| Per-surface bespoke hover colors | `bg-hover` / `bg-pressed` overlays |
| `font-bold`; more than one weighted cell per row | `font-medium`/`font-semibold` per §2; one weighted cell |
| `tracking-*` stacked on scale sizes | Delete — letter-spacing is in the type token |
| Pure black `#000` text | `text-foreground` |
| `box-shadow` on resting cards/buttons | Delete; shadows only on overlays + the sanctioned focal floating cards |
| Radii outside the scale (arbitrary `rounded-[14px]` etc.) | Nearest scale step (§2) |
| Pill-shaped text buttons | `rounded-xl` per button.tsx |
| Brand-colored focus rings | `ring-ring` (neutral) |
| Left-bar / underline / colored-text active nav | `--sidebar-active` fill behind the item |
| Colored border as selection cue | Fill change (`--selection-light` / `bg-muted`) |
| Charts with axes, gridlines, boxed legends | Axis-free monochrome bars/lines, inline labels, `--category-*` markers |
| Dense layouts (card padding ≤ 12px, cramped rows) | 20–24px card padding, tall rows, 48px+ section gaps |
| Mixed filled + stroke icon sets | Lucide stroke only |
| `transition: all`, hover scale | Targeted 150–200ms color/bg transitions |
| Inline `${amount} kr` | `formatKroner()` |

Do not change layout structure, copy, or behavior unless asked — visual refactor
only. Preserve accessibility: muted text stays AA (that's what the token L
values are tuned for — never lighten them); status never communicated by color
alone; form-control boundaries keep 3:1 (`--border-strong`).

---

## 6. One-line summary (for quick prompts)

> Monochrome UI on a white page: near-black `bg-foreground` primary buttons at
> `rounded-xl`, separation via `bg-panel` fills and hairline dividers (border +
> `shadow-soft` only on floating focal cards like the booking rail and checkout),
> `bg-hover`/`bg-pressed` ink overlays for interaction, compressed type scale
> with medium-weight hierarchy and muted-grey supporting text (bold banned),
> azure blue only as sprinkle on links/selected tints, jade/amber/red as status
> dots and `-subtle` pills, blue `--category-*` markers for identity, Lucide
> stroke icons, 150–200ms color-fade motion, `formatKroner()` for all NOK.

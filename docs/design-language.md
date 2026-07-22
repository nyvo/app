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
   → shadow (`shadow-soft` on focal floating cards ONLY — overlays are
   bordered, not lifted).
   Borders are a legitimate rung here, not a smell, but `border-card` is
   reserved exclusively for the floating-focal-card edge (booking rail,
   checkout) — it is not a general card border. Plain `border` is for
   dividers and form-control boundaries on white, not for framing cards.
2. **No brand color on chrome.** Primary actions are near-black fills
   (`bg-foreground text-background`). Active states are grey fills
   (`bg-muted`) or foreground text. The blue primary appears only as sprinkle:
   inline links and genuine SELECTED/semantic states (`--selection-light`,
   `bg-primary-subtle` on a chosen booking tier, calendar days with
   availability). Never on containers, cards, or list-item fills — those are
   neutral (`bg-muted` shells / white insets). ONE ratified exception
   (2026-07-18): the dashboard first-run `WelcomeBand` carries the landing
   hero's azure gradient (`.bg-gradient-brand`) — a rare marketing moment that
   disappears once setup completes. It stays the only gradient container; do
   not extend the gradient to nav, headers, upsell/Pro surfaces (Pro = chrome),
   or data surfaces.
3. **Hierarchy through spacing and the tier gaps, not bold weights.** The tiers:
   surface → border → muted text (`text-foreground-muted`) → foreground. Weight
   contrast is `font-medium` vs normal; `font-semibold` is rare (stat figures,
   page titles), `font-bold` is effectively banned in app UI. (A semibold-
   headings system shipped 2026-07-18 in PR #179 and was reverted same day —
   don't reintroduce without a fresh decision.)
4. **Soft-rounded surfaces, pill actions.** Surfaces (cards, panels, fields)
   use the 4–10px radius scale; ALL buttons are pills (`rounded-full`) — the
   pill is the action affordance, the soft rectangle is the surface/field
   affordance. Chips, badges, and avatars are also fully round.
5. **Flat with subtle depth.** No shadows on resting cards. ONE sanctioned
   exception: `shadow-soft` on the focal floating cards (booking rail, checkout
   summary, receipt pane — paired with `rounded-2xl`). Overlays (dialogs,
   popovers, dropdowns, toasts) are separated by a plain `border-border` edge
   on `bg-surface` — never a shadow (2026-07-11; the old `shadow-float` overlay
   shadow was removed).

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
| Grouped-content container (dashboard sections, course-detail overview) | `FramedCard` (`@/components/teacher/FramedCard`): `rounded-2xl bg-muted p-2` shell, title in header, white inset with hairline rows → `hover:bg-hover` |
| Interactive item card directly on white (schedule entries, modal rows) | `bg-muted` → `hover:bg-pressed`; full `text-foreground` inside |
| Selected-state / semantic tint | `bg-primary-subtle` + `--selection-light` — chosen booking tier, calendar availability; never a generic card fill |
| Floating focal card (booking rail, checkout) | `bg-surface` + `border-border-card` + `shadow-soft` — the ONLY carded surface |
| THE light neutral fill (secondary buttons, active nav, chips) | `bg-muted` |
| Hover / pressed fill on any surface, any theme | `bg-hover` / `bg-pressed` (foreground ink @ 6% / 12%) |
| Primary text | `text-foreground` |
| Secondary text (AA on white) | `text-foreground-muted` |
| Decorative glyphs/icons only (fails AA for text) | `text-foreground-subtle` |
| Primary action fill | `bg-foreground text-background` |
| Sprinkle accent (links, selected states only) | `text-primary`, `--selection-light`, `bg-primary-subtle` (selected tier / availability) |
| Checked/on state of selection controls (Switch track, Checkbox, radio dot/square) | `bg-primary` + `text-primary-foreground` ink — azure = selected; the radio CARD row fill stays neutral `bg-muted` (2026-07-08 decision), only the check square is azure. Segmented tabs / nav active states stay grey. |
| Status | `text-success` / `-warning` / `-danger` / `-info`; tinted fills via the `-subtle` pair (never `/10` opacity hacks) |
| Categorical identity markers (tags, chart series) | `bg-category-1/2/3` — small marker fills only, never text/surfaces/actions |
| Dividers | `border-border-subtle` (hairline) or `border-border` (visible, on white) |
| Form-control boundary | `border-border-strong` (checkbox, switch track); text fields are bordered white (`border-border` + `bg-surface`) — grey fill = disabled only |
| Focus ring | `ring-2 ring-ring` (neutral foreground — never brand-colored) + offset; soft halo = `ring-ring-subtle`, never as the only cue |
| Dark chrome (toasts, marketing bands — NOT the sidebar) | `--chrome-*` |
| Currency | `formatKroner()` from `@/lib/utils`, always |

### Inline links (the two canonical recipes — no others)

Every textual link is azure. Exactly two treatments, chosen by placement:

- **Standalone action link** (its own line/row — "Send på nytt", "Få veibeskrivelse",
  "Se alle timer"): `font-medium text-primary underline-offset-4 hover:underline`.
  This is also `Button variant="link"` — prefer the variant for button-element
  pseudo-links (loading states, `onClick` actions).
- **Link inside a sentence** (legal prose, consent lines, help text):
  `text-primary underline underline-offset-2 hover:decoration-2` — resting
  underline so it scans as a link mid-text; decoration thickens on hover
  (same idiom as rich-text `.prose-content a`).

Icons inside a link (`ExternalLink`, `ArrowUpRight`) take `currentColor` — never
give them their own text color. Container-scoped anchor rules (Alert, Dialog,
AlertDialog, Accordion, EmptyState, prose CSS) already apply the in-sentence
recipe. NOT links: nav/sidebar/footer chrome (muted → foreground), whole-card
row wrappers, and list-item titles — those stay neutral; the embed-widget
attribution credit stays muted chrome on purpose.

### Radius

App scale (do not import 16–20px card radii from other systems):

- `rounded-sm` 4px — tight chips, mini thumbs
- `rounded-md` 6px — small controls (text fields themselves are `rounded-xl`)
- `rounded-lg` 8px — list rows, badges, image thumbs
- `rounded-xl` 10px — **THE surface radius**: cards, panels, dialogs, fields
- `rounded-2xl` 12px — marketing surfaces + focal floating cards (with `shadow-soft`)
- `rounded-3xl` 16px — oversized marketing bands
- `rounded-full` — ALL buttons (text + icon-only), chips/badges, avatars, status dots

### Spacing

4px grid (Tailwind steps). Two rules before the ladder:

1. **Pick the step by role, not by eye.** Same role → same step, everywhere.
2. **One mechanism per gap.** A gap lives in the parent (`gap-*` / `space-y-*`)
   OR the child (`mt-*` / `mb-*`), never both. Built-in margins on primitives
   (`FieldError mt-2`, `TableCaption mt-4`) own their gap — don't stack a
   parent gap on top.

The ladder (step → px → role):

| Step | px | Role |
|---|---|---|
| `0.5–1.5` | 2–6 | micro-optics: icon↔count, compact popover title↔sub |
| `2` | 8 | label↔input · input↔error (`FieldError` owns it) · title↔description in overlay headers · icon↔text |
| `3` | 12 | section heading↔its content (`mb-3`) · avatar↔text · chip clusters · stacked tinted cards |
| `4` | 16 | fields in overlay forms · form pair grids (`gap-4 sm:grid-cols-2`) · cards within one group · toolbar↔content |
| `5` | 20 | fields in page forms (`space-y-5`) · FramedCard content (`p-5`) · control-row padding (`py-5 first:pt-0 last:pb-0`) |
| `6` | 24 | card + dialog padding (`p-6`) · drawer body sections · independent grid columns |
| `8` | 32 | alert↔content (`mb-8`) · page-header bottom (`mb-8`/`mb-10`) · detail-page section step (`border-t pt-8` on `space-y-8`) |
| `12` | 48 | **THE page section gap** (`space-y-12` between major dashboard sections; landing section-header→content `mb-12`) |
| `16+` | 64+ | marketing bands only |

Half-steps `*-0.5`–`*-2.5` are allowed for micro-optics below 12px. **No
half-steps from `*-3.5` up** (`p-3.5`, `gap-3.5` → snap to `3` or `4`).
Arbitrary `p-[Npx]` values only for optical nudges, with a comment saying what
they align to.

**Role recipes (the canon — deviations are bugs):**

- **Dashboard page**: `PageShell` owns the shell (`max-w-6xl px-4 sm:px-6
  lg:px-8 pt-6 lg:pt-12 pb-24 md:pb-12`, header `mb-8`/`mb-10`, tabs `mb-8`).
  Major sections: `space-y-12`. Section heading→content: `mb-3` (heading rows:
  `gap-3`).
- **Public page**: shell header `px-4 py-8 sm:px-6`; container `max-w-6xl px-4
  sm:px-6 lg:px-8 pb-16`. Detail sections: column `space-y-8` + each section
  `border-t border-border pt-8` (≈64px visual), heading `mb-3`. Landing is the
  exception: fixed `px-6` gutter (marketing), bands `py-20 md:py-28`, eyebrow
  `mb-3`, headline→sub `mt-4`, centered section header `mb-12`.
- **Legal/long-form**: `max-w-3xl`, page blocks `space-y-10`, sections
  `space-y-8`, h2→p and p→p `space-y-4` (Terms/Privacy/About all match — keep
  it that way).
- **Cards**: `Card` primitive `p-6`; FramedCard frame `p-2` / header `px-3
  py-2` / content `p-5`; utility `bg-panel` panels `p-6` (single-row hints:
  `px-5 py-4`); focal floating cards (booking rail, checkout summary) `p-6`,
  small media-object cards `p-5`.
- **List rows**: page-level rows `px-4 py-4` (≥72px with two lines), hairline
  `divide-border-subtle`, hover `bg-hover`. Overlay lists (drawers, dialogs)
  may be one step denser: `py-2`–`py-3`. Control rows (label + switch/action):
  `py-5 first:pt-0 last:pb-0`.
- **Forms**: label↔input `8px` (`grid gap-2` or `Label` + `mb-2` — never
  `mb-1.5`). Input↔error `8px` — `FieldError`'s built-in `mt-2` owns it; inside
  a `gap-2` grid use `mt-0`. Field stacks: page forms `space-y-5`, overlay
  forms `space-y-4`. Pair grids: `gap-4 sm:grid-cols-2`. Standalone-page
  submit: `mt-8` below the stack.
- **Overlays**: dialog `p-6 gap-6`, header `gap-2`. Drawers: `sm:max-w-[480px]`,
  header `px-6 py-5`, body sections `px-6 py-6` (dense `dl` groups `py-5`),
  footer `px-6 py-4`. Popover `p-4 gap-4`, header `gap-1.5`.
- **Settings**: `SettingsRows` is canon — rows `py-8`, `md:grid-cols-[220px_
  minmax(0,42rem)] md:gap-12`, control column `space-y-6`, anchors
  `scroll-mt-24`.
- **Feedback states**: `EmptyState` owns its padding (`py-12`, compact `py-8`)
  — don't override with `py-16`. Skeletons must mirror the real layout's
  spacing exactly (same paddings, same gaps) or the swap jumps.

Primary list rows are tall and airy — density comes from removing columns, not
shrinking rows. Err generous.

### Typography

Faces (ratified 2026-07-22 — supersedes the 2026-07-15 all-Geist decision):

- **Inter** (`--font-sans`, `@fontsource-variable/inter`) is the base sans —
  body, labels, table headers, badges, buttons, nav items, form labels, helper
  text, stat figures.
- **Open Sauce One** (`--font-display`, weights 500/600 only) is the display
  face — page-level headlines ONLY (the `h1` per screen, `text-2xl`+) plus the
  landing's large marketing h2s. Section headings, card titles, and
  dialog/sheet/drawer titles (14–18px) stay on Inter: below ~24px the display
  face is indistinguishable from the base face and only creates drift. Applied
  via ONE mechanism: the `@layer base` rule on `h1` in `src/index.css`
  (landing.css opts its big h2s in). Never sprinkle raw `font-family` or the
  `font-display` utility per page. Headings keep their existing weights
  (`font-medium` in-app; 600 on landing display).
- **Geist Mono** (`--font-mono`) is unchanged — code surfaces only (embed-code
  snippet, /dev pages).

Use the built-in scale (`text-xs` … `text-5xl`) — per-size letter-spacing is part
of the token; **never add `tracking-*` on top**. One sanctioned exception:
uppercase micro-labels at 12px or below (table headers, tiny badges) may add
`tracking-wide` — wide tracking on uppercase is correct optics, and the scale's
baked spacing assumes mixed case. Display caps at `text-5xl` (48px); 6xl+ won't
compile. Arbitrary sizes only below 12px (`text-[11px]` etc.) — never in the
12–48px range the scale covers.

- App body: `text-base`. Meta/labels/controls: `text-sm`. Captions/chips: `text-xs`.
- Page titles: `text-2xl`; dashboard hero: `text-3xl`. Public h1: `text-4xl`.
- Weights: normal (body) and `font-medium` (labels, nav, buttons, emphasis,
  titles, stat figures). Medium is the working ceiling — the app ships zero
  bold and near-zero semibold; reach for `font-semibold` only when a display
  figure genuinely needs it and say why. `font-bold`: no.
- Long-form prose (public/legal pages, descriptions) may add `leading-relaxed`;
  UI text keeps the token line-heights.
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
- ALL buttons are pills (`rounded-full`) — text and icon-only alike.
- Heights: 40px `default`/`lg` (app chrome, shares rows with 40px fields);
  44px `cta` — public/mobile primary CTAs and ALL auth controls. On /auth every
  input and button is 44px (`h-11` inputs, `size="cta"` buttons, OTP slots
  already `size-11`). Touch surfaces: minimum 44px.
- No hover scale/lift; the default variant deliberately has no hover darken
  (near-black + darken reads as noise).

### Cards

Three recipes — pick by role:

1. **Invisible card (table/list rows):** no fill, no border. Separation =
   `border-subtle` hairline + tall padding. Hover: `bg-hover`, `rounded-lg`.
2. **Grouped-content container — `FramedCard`:** the ONE container pattern,
   used identically on the dashboard home (incl. the Inntekt chart) and the
   course-detail overview. Neutral `rounded-2xl bg-muted p-2` shell,
   `text-sm font-medium` title (+ optional action) in the frame header.
   Block content (chart, stat spine, copy) sits in ONE white
   `FramedCardPanel` inset; list content renders each item as its OWN
   white `rounded-xl bg-surface` card in the gap-1.5 column. Interactive
   items do NOT change fill on hover — affordance is cursor, chevron nudge,
   focus ring. Never azure — container color carries no meaning. Items
   sitting DIRECTLY on the white page (schedule entries, modal rows)
   invert: `bg-muted` fill, `hover:bg-pressed`, full `text-foreground`
   inside. A row's SELECTED state — and only that — uses the azure tint.
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
foreground underline. No pill tabs, no boxed tabs. Sanctioned exception:
`PageTabs`' active tab pairs the underline with a `bg-muted` chip (deliberate
double signal, kept 2026-07-07) — don't remove it, and don't copy the chip
into new tab components.

### Inputs

Bordered and white: `bg-surface` with a `border-border` edge, `rounded-xl`.
Focus: `border-foreground` + soft ring. Disabled: `bg-muted` grey fill — the
filled look is the DISABLED affordance, which is why resting fields are never
filled. Labels above inputs: `text-sm font-medium text-foreground` (not
muted — labels are read).

**Binary controls (switch, checkbox, radio, selected calendar day):** the
checked/on fill is neutral near-black — `bg-foreground` with a
`text-background` glyph / `bg-background` thumb — matching the primary-action
fill, per the monochrome direction (decided 2026-07-11; extends the 2026-07-08
neutral `RadioGroupCardItem` call). Never brand-azure on control fills.

### Chips / badges / status

Soft-rounded or full pill, `bg-muted` fill, foreground or muted text, `text-xs`,
medium.

**Status colour is always the light treatment — never a saturated fill.** This
applies to *every* status indicator, not just badges: badges, chips,
**stepper/step markers**, status dots. Each is one of: (a) a small solid
`bg-success` / `bg-danger` **dot** beside muted text, or (b) a `-subtle` tinted
pill or circle — `bg-{success,warning,danger,info}-subtle` fill + the matching
`text-*` glyph/ink (e.g. a done step marker is `bg-success-subtle text-success`,
a step that needs action `bg-warning-subtle`/`bg-danger-subtle`). Settled /
historical states (Refundert, Betales direkte) use the quietest tier — the Badge
`subtle` variant, plain muted text with no fill. **Never** a saturated filled
badge, **never** a solid `bg-success` / `bg-warning` / `bg-danger` circle behind
a check/glyph, never colour alone (always pair with text or a glyph). Solid
semantic fills (`bg-danger`, …) are reserved for action affordances — the
destructive button — not for status display. Selection on choice chips = fill
change (`--selection-light` or `bg-muted`), never a colored border alone.

### Tables / lists

No vertical rules ever. Row separation: `border-subtle` hairline or spacing.
Header row: `text-xs`/`text-sm`, muted, no fill. Tall rows; one weighted cell
per row; metadata as small muted stroke-icon+text pairs. Row hover: `bg-hover`.
Interpunct rule (2026-07-11): ONE "·" may pair two related values in a string
("fredag 28. nov · kl. 18:00", "adresse · Veibeskrivelse", "8 økter ·
Ingrid Larsen"). More than one "·" in the same string is banned — a third
value means the string is a list, so use commas or layout instead. Never use
"·" as a generic column separator across a row's metadata fields.

### Progress bars

Track `bg-muted` (or `--neutral-4` equivalents already in use), fill
`bg-foreground` — brand color only when the bar itself is the sprinkle (rare).
6–8px, rounded ends.

### Charts

No axis lines, no gridlines, no boxed legends where labels can sit inline.
Monochrome by default: inactive series in light neutral, active/current in
`--foreground`. Series identity via `--category-1/2/3` (blue family) markers.
Green/red only when the data itself is positive/negative. Rounded bar caps;
small muted labels under the data. Sanctioned exception: the dashboard
`IncomeChart` keeps its faint dashed horizontal gridlines and azure
(`--primary`) active series (deliberate, kept 2026-07-07) — the rule above
still applies to every new chart.

### Overlays

Dialogs, popovers, dropdowns, toasts: `bg-surface`, `rounded-xl`,
`border border-border` — no shadow (overlays are bordered, not lifted).
Toasts use `--toast-surface` (dark chrome) with the `ring-chrome-foreground/10`
hairline as their edge. Modal scrims are `bg-foreground/40` — sanctioned:
foreground-ink at alpha adapts to theme like `--hover`/`--pressed` do; use
exactly this value, don't invent per-surface scrims.

### Icons

One stroke set (Lucide), 1.5–2px stroke, 16–20px in UI. Sanctioned exception:
inline meta-row icons (clock/map-pin/users beside `text-xs`/`text-sm` metadata)
are 14px (`size-3.5`) — the app-wide convention pairs the icon to the small
text's cap height. Decorative icons `text-foreground-subtle`; informative
icons `text-foreground-muted`. Never mix in filled/solid sets.

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
| Saturated filled status badges **or markers** (solid `bg-success`/`bg-warning`/`bg-danger` circle behind a glyph) | `-subtle` tinted pill / circle, or a small status dot + text |
| `bg-success/10`-style opacity hacks | The opaque `-subtle` token |
| Per-surface bespoke hover colors | `bg-hover` / `bg-pressed` overlays |
| `font-bold`; more than one weighted cell per row | `font-medium`/`font-semibold` per §2; one weighted cell |
| `tracking-*` stacked on scale sizes | Delete — letter-spacing is in the type token |
| Pure black `#000` text | `text-foreground` |
| `box-shadow` on resting cards/buttons/overlays | Delete; `shadow-soft` on the sanctioned focal floating cards is the only shadow — overlays get `border border-border` |
| Radii outside the scale (arbitrary `rounded-[14px]` etc.) | Nearest scale step (§2) |
| Non-pill buttons (`rounded-xl`/`rounded-lg` on any button) | `rounded-full` per button.tsx — all buttons are pills |
| Brand-colored focus rings | `ring-ring` (neutral) |
| Left-bar / underline / colored-text active nav | `--sidebar-active` fill behind the item |
| Colored border as selection cue | Fill change (`--selection-light` / `bg-muted`) |
| Charts with axes, gridlines, boxed legends | Axis-free monochrome bars/lines, inline labels, `--category-*` markers |
| Dense layouts (card padding ≤ 12px, cramped rows) | 20–24px card padding, tall rows, 48px+ section gaps |
| Half-step spacing at 3.5+ (`p-3.5`, `gap-x-3.5`) | Snap to step 3 or 4 (§2 Spacing ladder) |
| Parent `gap-*`/`space-y-*` stacked with child `mt-*` for the same gap | One mechanism owns the gap (§2 Spacing rule 2) |
| Skeleton spacing that doesn't mirror the real layout | Copy the real paddings/gaps into the skeleton |
| `mb-1.5` label gaps, one-off section gaps (`space-y-10`, `mt-7`) | The role's ladder step (§2 Spacing) |
| Mixed filled + stroke icon sets | Lucide stroke only |
| `transition: all`, hover scale | Targeted 150–200ms color/bg transitions |
| Inline `${amount} kr` | `formatKroner()` |

Do not change layout structure, copy, or behavior unless asked — visual refactor
only. Preserve accessibility: muted text stays AA (that's what the token L
values are tuned for — never lighten them); status never communicated by color
alone; form-control boundaries keep 3:1 (`--border-strong`).

---

## 6. One-line summary (for quick prompts)

> Monochrome UI on a white page: near-black `bg-foreground` primary buttons as
> pills (`rounded-full`), separation via `bg-panel` fills and hairline dividers (border +
> `shadow-soft` only on floating focal cards like the booking rail and checkout),
> `bg-hover`/`bg-pressed` ink overlays for interaction, compressed type scale
> with medium-weight hierarchy and muted-grey supporting text (bold banned),
> azure blue only as sprinkle on links/selected tints, jade/amber/red as status
> dots and `-subtle` pills, blue `--category-*` markers for identity, Lucide
> stroke icons, 150–200ms color-fade motion, `formatKroner()` for all NOK.

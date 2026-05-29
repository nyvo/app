# Studio — Tokens

Every value here is sourced from `design-model.yaml`. If a value isn't documented here, it's not in the system.

---

## Color

### Neutral (Radix `sand`, light)

| Token | Hex | Use |
|-------|-----|-----|
| `--background` | `#ffffff` | Page canvas — the white surface everything sits on |
| `--surface` | `#ffffff` | Cards (when used deliberately) — same value, different role |
| `--muted` | `#f1f0ef` (sand-3) | Hover fill — sidebar item hover, button-secondary hover, muted surface |
| `--active` | `#f1f0ef` (sand-3) | Selected fill — current sidebar item. Shares fill with hover; selected differs via `font-medium` + foreground text |
| `--border` | `#dad9d6` (sand-6) | Default border, divider, separator (sidebar/main divider, list dividers, card border) |
| `--foreground-disabled` | `#bcbbb5` (sand-8) | Disabled text, bullet separators, very muted meta |
| `--foreground-muted` | `#63635e` (sand-11) | Secondary text — descriptions, form labels, captions, unselected nav items |
| `--foreground` | `#21201c` (sand-12) | Primary text — headings, body |
| `--ring` | `#21201c` (sand-12) | Focus ring |

**Note:** `--background` and `--surface` are both `#ffffff` in light mode but have different semantic roles. `--background` is the page canvas; `--surface` is what cards sit on. They'd diverge in a future dark mode. Same value today, different contracts.

**The sand scale (1–12) backs the system as primitives.** We consume sand-3, 6, 8, 11, and 12 as semantic tokens; sand-1, 2, 4, 5, 7, 9, 10 are available as primitives if a future need arises.

### Status

| Token | Hex | Use |
|-------|-----|-----|
| `--success-subtle` | `#e6f7ed` (jade-3) | Tinted background for "paid", "confirmed", "active" pills |
| `--success-fg` | `#208368` (jade-11) | Text/icon on success surfaces |
| `--warning-subtle` | `#fff7c2` (amber-3) | Tinted background for "pending", "review" |
| `--warning-fg` | `#ab6400` (amber-11) | Text/icon on warning surfaces |
| `--danger-subtle` | `#feebec` (red-3) | Tinted background for "failed", "cancelled", "refunded" |
| `--danger-fg` | `#ce2c31` (red-11) | Text/icon on danger surfaces |

Studio has **no chromatic accent palette** (no sky / mint / iris pop tints). The system is strictly monochrome sand neutrals + the three status colors above. Category coding (course type, lesson delivery mode, etc.) uses text labels, not colored fills.

---

## Typography

### Family

`Geist` (Google Fonts). Three weights only: 400 (regular), 500 (medium), 600 (semibold). No 700.

```html
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap" rel="stylesheet">
```

There is no monospace token. For tabular alignment, use `tabular-nums` on Geist sans.

### Canonical scale

7 sizes total. Same scale on both surfaces; usage maps differ.

| Token | Size | Line-height | Tracking | Tailwind |
|-------|------|-------------|----------|----------|
| `--text-xs` | 12px | 16px | +0.0025em | `text-xs` |
| `--text-sm` | 14px | 20px | 0 | `text-sm` |
| `--text-base` | 16px | 24px | 0 | `text-base` |
| `--text-xl` | 20px | 28px | -0.005em | `text-xl` |
| `--text-2xl` | 24px | 30px | -0.01em | `text-2xl` |
| `--text-3xl` | 30px | 36px | -0.015em | `text-3xl` |
| `--text-5xl` | 48px | 52px | -0.025em | `text-5xl` |

**Banned sizes:** `text-lg` (18px), `text-4xl` (36px), `text-6xl` (60px), `text-7xl` (72px). Gaps are intentional.

**Restraint over spectacle.** Display tops out at 48px — no hero text bigger than that. Reference: Time2book's "measured boldness, confident without being aggressive." The system has no 60px or 72px tier on purpose.

### Dashboard usage map (16px body)

| Role | Token | Weight |
|------|-------|--------|
| Page title (h1) | `text-3xl` (30px) | 600 |
| Section heading (h2) | `text-2xl` (24px) | 600 |
| Subsection (h3) | `text-xl` (20px) | 600 |
| Card title (h4) | `text-base` (16px) | 600 |
| **Body / helper copy / row subtitles** | **`text-base` (16px)** | **400 / 500** |
| Dense UI / page tabs / table headers / controls / tooltips | `text-sm` (14px) | 400 / 500 |
| Caption / KPI label / chip | `text-xs` (12px) | 400 / 500 |

`text-6xl` is **banned** on dashboard. Max heading is `text-3xl`.

### Landing/public usage map (16px body)

| Role | Token | Weight |
|------|-------|--------|
| Display (hero only, 1/page) | `text-5xl` (48px) | 600 |
| Page title (h1) | `text-3xl` (30px) | 600 |
| Section (h2) | `text-2xl` (24px) | 600 |
| Subsection (h3) | `text-xl` (20px) | 600 |
| Card title | `text-xl` (20px) | 600 |
| Lead paragraph | `text-base` (16px) | 400 |
| **Body** | **`text-base` (16px)** | **400** |
| Meta | `text-sm` (14px) | 400 |
| Caption | `text-xs` (12px) | 400 |

### The small-label rule (replaces uppercase tracked)

For KPI labels, table headers, chips, status pills, eyebrow text:

```html
<span class="text-xs font-medium text-foreground-muted">Inntekter</span>
```

Sentence case. 500 weight. Muted color. **Never** `uppercase` or `tracking-wider`.

---

## Spacing

4pt base unit, opinionated scale, **9 values**.

| Token | Px | Tailwind | Default use |
|-------|-----|----------|-------------|
| `--space-xs` | 4 | `1` | Icon-text gap, fine spacing |
| `--space-sm` | 8 | `2` | Inside compact components |
| `--space-md` | 12 | `3` | Row gap, label-field gap |
| `--space-lg` | 16 | `4` | Tight card padding, paragraph rhythm |
| `--space-xl` | 24 | `6` | **Default card padding (`p-6`)** |
| `--space-2xl` | 32 | `8` | Between cards, between major elements |
| `--space-3xl` | 40 | `10` | Page-section breaks (dashboard) |
| `--space-4xl` | 48 | `12` | Page-section breaks (landing) |
| `--space-5xl` | 64 | `16` | Hero breathing (landing only) |

**Banned values:** `p-5`, `p-7`, `space-y-5`, `space-y-7`, `space-y-9`, `space-y-11`. Hand-tuning temptation.

### Default usage patterns (airy)

| Pattern | Value |
|---------|-------|
| Card padding (default) | `p-6` (24px) |
| Card padding (dense list inside) | `p-4` (16px) |
| Card padding (compact mini-panel) | `p-3` (12px) |
| Card-to-card vertical | `space-y-6` (24px) |
| Section-to-section (dashboard) | `space-y-8` (32px) |
| Section-to-section (landing) | `space-y-12 sm:space-y-16` (48–64px) |
| Form field stack | `space-y-4` (16px) |
| Inside button | `px-4` (16px default) |
| Page container side padding | `px-6 sm:px-8` (24–32px) |

---

## Radius

4 tokens.

| Token | Px | Tailwind | Use |
|-------|-----|----------|-----|
| `--radius-sm` | 6 | `rounded-md` | **Inputs only** (text fields, selects, textareas) |
| `--radius-md` | 8 | `rounded-lg` | Tight surfaces only — list rows, badges, image thumbs, skeletons |
| `--radius-lg` | 12 | `rounded-xl` | **Cards, panels, list containers, dialogs, modals, sheets (THE surface radius)** |
| `--radius-full` | 9999 | `rounded-full` | **Buttons, badges, chips, avatars, indicator dots — pill is the button shape** |

**Rules:**
- **Buttons are pill-shaped.** Every button — primary, secondary, ghost, destructive — uses `rounded-full`. Adjacent buttons in a row read as one cluster of pills. The pill shape is the system's signature interactive shape.
- **Inputs stay rect** (`rounded-md`, 6px). Text fields don't pill — pill inputs feel weird at 36px height with text inside. Inputs and buttons differ on shape, and that's intentional.
- **Every surface is `rounded-xl` (12px).** Cards, panels, list containers, dialogs, modals — one radius for every surface. The softer corner reads warmer and matches the Hashnode/Linear card era.
- **`rounded-lg` (8px) is for tight surfaces only** — list rows inside a card, badges, image thumbs, skeletons. Anything ≤ 48px tall where 12px would dominate the shape.

**Banned:** `rounded-[Npx]` arbitrary values. Use the four named tokens.

---

## Elevation

**Strategy: flat.** Cards use border, not shadow.

| Token | Value | Use |
|-------|-------|-----|
| `--shadow-xs` | `0 1px 2px 0 rgb(0 0 0 / 0.04)` | Reserved — popover hover state |
| `--shadow-sm` | `0 1px 3px 0 rgb(0 0 0 / 0.05)` | Dialogs, popovers, dropdown menus |

Plain cards: `bg-surface border border-border rounded-xl` — no shadow.

---

## Motion

Smooth, calm. No spring physics. No bounce.

| Token | Value | Use |
|-------|-------|-----|
| `--duration-fast` | `150ms` | Button press, instant feedback |
| `--duration-normal` | `200ms` | Hover, fade, default transitions |
| `--duration-slow` | `300ms` | Modal open, page transitions |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Default — calm settling |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Back-and-forth (modal open/close) |

**Default:** `transition-colors duration-200 ease-out`.

---

## Focus

`ring-2 ring-foreground ring-offset-2 ring-offset-background` (shadcn pattern). 2px sand-12 ring + 2px white offset = visually distinct against any background.

```css
button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--background), 0 0 0 4px var(--foreground);
}
```

---

## Iconography

The user's app uses **Lucide** (already in their `/lib/icons` barrel). Stroke width set globally to `1.75` to pair with Geist. Icon sizes follow the text size:

| Text | Icon |
|------|------|
| `text-xs` | `size-3.5` |
| `text-sm` | `size-4` |
| `text-base` | `size-4` |
| `text-xl` | `size-5` |
| `text-2xl`+ | `size-6` |

Override `stroke-[2]` on icons paired with `font-semibold` headings. `stroke-[1.5]` on decorative icons `size-8+`.

# Studio — Tokens

> **SUPERSEDED COLOR MODEL** — this document predates the current system. Authoritative: `src/index.css` (+ CLAUDE.md §Design tokens). Current reality: pure-neutral grey (chroma 0) neutrals, periwinkle primary `oklch(0.540 0.150 274)`, WHITE sidebar rail, beige as the one warm accent, ring = foreground. Any sand-\*/Slate/indigo/dark-sidebar/monochrome-primary guidance below is historical — do not apply. Layout, spacing, and craft rules remain valid unless they contradict `src/index.css` or newer primitives (e.g. SettingsRows for settings pages; the primary-tinted FramedCard on course Oversikt is sanctioned).

**Source of truth: `src/index.css`.** This document described the *gen-2* system (cool Slate neutrals + indigo brand + dark Slate chrome) — see the banner above; it no longer asserts authority. If this doc and `index.css` ever disagree, `index.css` wins; fix the doc.

Architecture (three layers, all in `index.css`):

1. **Primitives** — Radix-derived OKLCH scales (`--neutral-1…12`, `--jade-*`, `--amber-*`, `--red-*`). Never consumed directly in components. Dark mode overrides primitives, so semantic tokens stay stable.
2. **Semantic tokens** — role-based (`--foreground`, `--surface`, `--danger-subtle`…). This is what components consume.
3. **Tailwind `@theme inline`** — exposes semantics as utilities (`bg-surface`, `text-foreground-muted`…).

---

## Color

### Neutrals (Radix Slate, light)

| Token | Value | Use |
|-------|-------|-----|
| `--background` | white | Page canvas |
| `--surface` | white | Cards/panels (same value, different role; diverges in dark) |
| `--muted` | neutral-3 | Hover fill, muted surface |
| `--color-active` | neutral-3 | Selected fill (selected differs from hover via `font-medium` + foreground text) |
| `--border` | neutral-7 | Visible divider / card border |
| `--border-subtle` | neutral-6 | Faint divider |
| `--input` | neutral-7 | Field edge |
| `--foreground-disabled` | neutral-8 | **Disabled UI only — 1.91:1 on white. Never readable content.** |
| `--foreground-muted` | neutral-11 | Secondary text (5.9:1, AA) |
| `--foreground` | neutral-12 | Primary text |

### Brand / interaction

| Token | Value | Use |
|-------|-------|-----|
| `--primary` / `--brand` | indigo `oklch(0.515 0.237 270)` ≈ `#3a4dec` | Primary buttons, brand accents. White text = 6.1:1 AA |
| `--ring` | `var(--primary)` | **The only focus ring.** Pattern: `ring-2 ring-ring ring-offset-2 ring-offset-background` |
| `--secondary` / `--accent` | neutral-3 | Secondary button fill |
| `--surface-tinted` (+ `-border`) | indigo-tinted wash | Highlighted panels; marketing section washes |

### Status (solid + subtle pairs)

| Pair | Solid (text/bg) | Subtle (pill bg) | Contrast |
|------|-----------------|------------------|----------|
| success | jade-11 | jade-3 | 4.8:1 ✓ |
| warning | amber-11 | amber-3 | 4.5:1 ✓ |
| danger | red-11 `oklch(0.540 0.215 25)` | red-3 | 4.8:1 ✓ |
| info | `oklch(0.520 0.180 270)` | info-subtle | 5.0:1 ✓ |

Solid usage: `bg-danger text-danger-foreground`. Subtle usage: `bg-danger-subtle text-danger`. Don't recreate `bg-danger/10` alpha hacks. **Don't lighten red-11/info** — the L values are set to keep AA on the subtle backgrounds at 12px pill text.

### Dark chrome (shared, dark in BOTH themes)

`--chrome-surface / -hover / -active / -foreground / -foreground-muted / -border` — the Slate-dark scale behind the sidebar and toasts. Marketing dark bands also use this scale (the landing page previews the app's chrome — that's the brand bridge).

---

## Typography

### Families

- `--font-sans` — **Geist Variable** (self-hosted via fontsource). Weights in use: 400 / 500 / 600. No 700.
- `--font-serif` — **EB Garamond**. *Marketing display only*: landing hero h1, landing section h2s, price figures. Never in the dashboard, never below 24px, never for body copy.

### Scale (rem-based; px at 16px default)

| Token | Size | Line | Tracking | Role |
|-------|------|------|----------|------|
| `text-xs` | 12 | 16 | +0.0025em | captions, KPI labels, chips |
| `text-sm` | 14 | 20 | 0 | meta, controls, dense UI |
| `text-base` | 16 | 24 | 0 | body (DEFAULT) |
| `text-lg` | 18 | 28 | −0.0025em | lead paragraphs, legal-page h2s |
| `text-xl` | 20 | 28 | −0.005em | h3 / large card titles |
| `text-2xl` | 24 | 30 | −0.01em | h2 / page titles |
| `text-3xl` | 30 | 36 | −0.015em | h1 / dashboard hero |
| `text-4xl` | 36 | 44 | −0.02em | public h1 / mobile display |
| `text-5xl` | 48 | 52 | −0.025em | display, 1 per landing hero |

**Letter-spacing is baked into each tier. Never add `tracking-tight`/`tracking-wide` on top.** Display caps at 48px — no 60/72px tiers. `text-6xl`+ is banned. Max dashboard heading is `text-3xl`.

### Small-label rule

Eyebrows, KPI labels, table headers, chips: `text-xs font-medium text-foreground-muted`, sentence case. **Never** `uppercase` or `tracking-wider`.

---

## Radius

Explicit integer px (no multiplier math — fractional radii render soft).

| Token | Px | Use |
|-------|----|-----|
| `rounded-sm` | 4 | tight chips, mini thumbs |
| `rounded-md` | 6 | **inputs** |
| `rounded-lg` | 8 | list rows, badges, image thumbs |
| `rounded-xl` | 10 | **cards, panels, dialogs (THE surface radius)** |
| `rounded-2xl` | 12 | large marketing surfaces, product frames |
| `rounded-3xl` | 16 | oversized marketing bands |
| `rounded-4xl` | 20 | reserved |
| `rounded-full` | — | **every button, badge, chip, avatar — pill is the signature shape** |

Inputs stay rect (`rounded-md`); buttons pill. `rounded-[Npx]` arbitrary values are banned.

---

## Elevation

Flat by default: `bg-surface border border-border rounded-xl`, no shadow. One exception class:

- `.shadow-soft` — reserved for focal floating surfaces (booking card, checkout summary, marketing product frames). **No arbitrary `shadow-[…]` values.**

---

## Motion

`transition-colors duration-200` default; `duration-150` for presses; `cubic-bezier(0.16, 1, 0.3, 1)` (`.ios-ease` covers inputs). Marketing scroll reveals via `framer-motion` with the same easing. No spring/bounce.

---

## Focus

One ring everywhere: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background` (indigo). Custom clickable surfaces use the `.focus-ring` helper.

---

## Iconography

Lucide, global `stroke-width: 1.75`. Icon size follows text size (`text-xs`→`size-3.5`, `text-sm`/`base`→`size-4`, `text-xl`→`size-5`, `text-2xl`+→`size-6`). `stroke-[2]` next to `font-semibold` headings; `stroke-[1.5]` on decorative `size-8+`.

---

## Marketing expression layer (public pages only)

The marketing/landing surfaces dial **amplitude, not grammar** — same tokens, bigger ends of the scales:

- Serif display tier (`font-serif text-4xl md:text-5xl`) — the dashboard deliberately lacks it
- Eyebrows per the small-label rule above section h2s
- Dark bands on `--chrome-surface` (the sidebar/toast surface) with `<Grain>` texture
- `--surface-tinted` washes for highlighted sections
- `<Grain>` is the cross-surface signature (product frames, dark bands; whisper-opacity on dashboard empty states)

Gradient of expression: **landing (high) → studio/course storefronts (neutral frame — the teacher's brand is the hero) → checkout (zero — dashboard rules) → dashboard (baseline)**. Interactive primitives (buttons, inputs, status colors) are pixel-identical across all four.

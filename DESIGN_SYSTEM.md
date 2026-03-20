# Ease Design System (V2.5 - Norwegian Polish)

> **Important**: Always use design tokens (semantic class names) instead of hardcoded hex values. This ensures consistency and makes theme updates easier.

---

## V2.5 "Norwegian Polish" Key Changes

1. **Section titles outside cards** — Following Scandinavian SaaS convention (Vipps, Fiken), section headers sit above their card containers, not inside them.
2. **No nested empty states** — Empty states inside dashboard cards use centered content with padding only, no inner bordered containers (double-boxing).
3. **Unified border tokens** — All borders use `border-zinc-200` at full opacity. No `border-zinc-200/60` opacity variants.
4. **Card radius standardized** — `rounded-xl` everywhere. No `rounded-3xl` (removed from public/student pages).
5. **Consistent page padding** — Teacher pages use `px-8 py-8` for header areas.
6. **Single font family** — Geist Sans only. No DM Serif Display or serif fonts anywhere.

---

## V2.4 "Shadowless Hierarchy" Key Changes

**Philosophy:** "Yoga-Calm" - Hierarchy is achieved through borders and background contrast, never elevation-based shadows. This creates a flatter, more modern SaaS aesthetic (ref: Linear, Raycast).

**From V2.1:**
1. **Darker page surface** (`#F4F4F5` Zinc-100) - the "floor" that makes white cards pop
2. **Dark primary** (`#09090B` Zinc-950) - strong button contrast
3. **White sidebar** stays `#FFFFFF` for clean navigation

**From V2.2 & V2.3:**
1. **Input borders** - `border-zinc-300` (darker than cards) so inputs look "cut into" the surface
2. **List dividers** - `border-zinc-100` for subtle row separation without harsh breaks
3. **Card radius** - `rounded-xl` (12px) for all cards. Bolder, more structured look
4. **Card borders** - `border-zinc-200` for clean, consistent definition
5. **Focus rings** - Softened offset ring: `focus-visible:ring-2 focus-visible:ring-zinc-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white` with `focus:border-zinc-400`

**New in V2.4 - Shadowless Hierarchy:**
1. **No Shadows** - `shadow-sm`, `shadow-md`, and default `shadow` are disabled (set to `none`).
2. **Border-Based Definition** - Cards use `border-zinc-200`, inputs use `border-zinc-300` for definition.
3. **Overlay Elevation** - Modals, popovers, and toasts use a high-contrast border (`border-zinc-200`) and a very subtle 1px ring instead of heavy shadows.
4. **Interactive States** - Hover states use border color shifts (`hover:border-zinc-400`) or background shifts (`hover:bg-zinc-50`) instead of shadow increases.

**Goal:** The UI feels like a single, cohesive plane where depth is communicated through layering and contrast rather than artificial light sources.

---

## Surface Hierarchy

### Principle

Every surface in the UI has a semantic role. Surfaces form a three-tier hierarchy from recessive to emphatic. This hierarchy replaces ad-hoc background color choices with intentional, enforceable tokens.

Dark surfaces are **semantic emphasis** — they signal importance within the light UI. They are not a theme, mode, or decorative choice. A dark card says "this matters right now."

```
┌─────────────────────────────────────────────────────┐
│  bg-canvas  (Zinc-100 #F4F4F5)                      │
│  The floor. Recedes. Everything sits on top of this. │
│                                                      │
│  ┌─────────────────────────────────────────────┐     │
│  │  bg-surface  (White #FFFFFF)                 │     │
│  │  Default content. Cards, panels, lists.      │     │
│  │  Pops against canvas via border contrast.    │     │
│  └─────────────────────────────────────────────┘     │
│                                                      │
│  ┌─────────────────────────────────────────────┐     │
│  │  bg-surface-emphasis  (Zinc-900 #09090B)     │     │
│  │  High-emphasis. Demands attention.            │     │
│  │  Inverted text. Used sparingly.               │     │
│  └─────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────┘

Depth (recessive → emphatic):
  canvas ──→ surface ──→ surface-emphasis
  (floor)    (content)    (attention)
```

### Token Definitions

#### `bg-canvas` — Application Background

| Property | Value |
|----------|-------|
| **Color** | `#F4F4F5` (Zinc-100) |
| **CSS variable** | `--color-surface` (existing) |
| **Purpose** | The neutral "floor" that all content sits on. It recedes so that surfaces pop. |

**When to use:**
- Page-level background behind all cards and content
- Full-bleed areas outside the content well
- Behind scrollable content regions

**When NOT to use:**
- Never as a card or container background (too low-contrast against itself)
- Never for interactive elements or form fields

**Text tokens on canvas:**
- Allowed: `text-text-primary`, `text-text-secondary`, `text-muted-foreground`
- Avoid: `text-text-tertiary` (insufficient contrast against Zinc-100)

---

#### `bg-surface` — Default Content Surface

| Property | Value |
|----------|-------|
| **Color** | `#FFFFFF` (White) |
| **CSS variable** | `--color-card` (existing) |
| **Border** | `border-zinc-200` required for definition |
| **Radius** | `rounded-xl` (12px) |
| **Purpose** | The standard container for content. White cards "pop" against the canvas floor. This is the workhorse surface for all data display, forms, and navigation. |

**When to use:**
- Dashboard cards, stats panels, list containers
- Form containers, settings panels
- Sidebar navigation
- Table containers
- Modal and dialog content areas
- Empty states

**When NOT to use:**
- Never stack `bg-surface` on `bg-surface` (white on white has no definition)
- Never use without a border — an unbounded white surface has no hierarchy

**Text tokens on surface:**
- Allowed: `text-text-primary`, `text-text-secondary`, `text-text-tertiary`, `text-muted-foreground`
- All standard text tokens have sufficient contrast on white

---

#### `bg-surface-emphasis` — High-Emphasis Surface

| Property | Value |
|----------|-------|
| **Color** | `#09090B` (Zinc-900), optionally with gradient `from-zinc-800 to-zinc-900` |
| **CSS variable** | Uses `bg-zinc-900` or gradient directly |
| **Border** | `border-zinc-800` for subtle edge definition |
| **Radius** | `rounded-xl` (12px), matching standard cards |
| **Purpose** | A dark surface that demands attention within the light UI. Used sparingly to create a clear focal point — the one thing the user should notice first. |

**When to use:**
- **Onboarding/setup cards** — "Kom i gang" checklist, first-run guidance
- **Hero cards** — the single most important card on a dashboard (e.g., next upcoming class)
- **Grouped call-to-action blocks** — a block of related actions that need to stand out as a unit
- **Critical attention moments** — time-sensitive or high-priority information that requires immediate notice

**When NOT to use:**
- Never for standard data display (tables, lists, stats)
- Never for more than one card per viewport — emphasis is lost when repeated
- Never as a section background or page-level region
- Never for decorative purposes — dark is semantic, not aesthetic
- Never for form containers or settings panels
- Never for navigation surfaces (sidebar, tabs)

**Inner-element color map on emphasis:**

When a container uses `bg-surface-emphasis`, every nested element must use the inverted palette below. Standard light-mode tokens (`text-text-primary`, `border-zinc-200`, `bg-white`) are invalid inside emphasis surfaces unless explicitly listed.

| Element | Token | Zinc equivalent | Notes |
|---------|-------|----------------|-------|
| **Primary text** | `text-white` | — | Headings, titles, key values |
| **Secondary text** | `text-zinc-400` | #A1A1AA | Descriptions, metadata, timestamps |
| **Muted/struck text** | `text-zinc-500` | #71717A | Finished checklist items (pair with `line-through`) |
| **Icons (structural)** | `text-zinc-500` | #71717A | Lucide icons beside text. Alternatively `opacity-70` on the icon element |
| **Icons (semantic)** | `text-success`, `text-destructive` | — | Status icons keep their semantic color unchanged |
| **Sub-cards / list items** | `bg-zinc-700/20 border border-zinc-700 rounded-xl` | — | Lighter wash on dark surface. The `/20` creates visible lift against zinc-900 |
| **Badges / pills** | `bg-zinc-700/20 border border-zinc-700` with `text-white` | — | Status pills inside hero cards. Same wash as sub-cards |
| **Dot indicators** | Original semantic color (e.g., `bg-success`) | — | Small dots keep their color for meaning |
| **Buttons (primary action)** | `bg-white text-zinc-900 border-zinc-300` | — | Inverted — white button on dark surface |
| **Buttons (hover)** | `hover:bg-zinc-100` | #F4F4F5 | Subtle darken on the white button |
| **Dividers** | `border-zinc-700` | #3F3F46 | Not `border-zinc-200` — must be visible but subtle on dark |
| **Focus rings** | `ring-zinc-400 ring-offset-zinc-900` | — | Ring offset must match the dark surface, not white |

> **Sub-card rule:** Use `bg-zinc-700/20` for inset containers — the low-opacity lighter zinc creates a visible lift against the zinc-900 parent while letting the gradient bleed through. Avoid `bg-zinc-800` (too close in value, sub-cards disappear) and fully opaque backgrounds (hard seams against gradients).

**Hover on emphasis surfaces:**
- Container-level: `hover:bg-zinc-800/50` (background shift only)
- Sub-card items: no hover, or `hover:bg-zinc-700/50` for interactive rows
- Never use `hover:bg-zinc-50` or other light hovers on dark surfaces

> **One-per-viewport rule:** If a dashboard has a `bg-surface-emphasis` hero card, no other card in the visible viewport should also use emphasis. The power of emphasis comes from scarcity.

### Correct Usage Examples

#### 1. Setup Checklist (Onboarding)
```tsx
// bg-surface-emphasis — first-run guidance demands attention
<div className="rounded-xl bg-zinc-900 text-white border border-zinc-800 p-8">
  <h2 className="text-xl font-medium text-white">Kom i gang</h2>
  <p className="text-sm text-zinc-400">Fullfør disse stegene for å publisere.</p>

  {/* Sub-card: bg-zinc-700/20 + border-zinc-700 */}
  <div className="rounded-xl bg-zinc-700/20 border border-zinc-700 px-4 py-3 flex items-center gap-4">
    <StepIcon className="h-5 w-5 text-zinc-500" />          {/* structural icon */}
    <span className="text-sm font-medium text-white">Opprett et kurs</span>
    <Button variant="outline-soft" size="xs"
      className="bg-white text-zinc-900 border-zinc-300 hover:bg-zinc-100">
      Start
    </Button>
  </div>
</div>
```
> Correct: Onboarding is a temporary, high-priority state. Emphasis signals "do this first." Inner elements use zinc tokens, not white-opacity values.

#### 2. Upcoming Class Hero Card (Dashboard)
```tsx
// bg-surface-emphasis — the single most important item on the dashboard
<div className="rounded-xl bg-zinc-900 text-white border border-zinc-800 p-8 smooth-transition hover:bg-zinc-800/50 cursor-pointer">
  <p className="text-xs text-zinc-400">Neste time</p>
  <h2 className="text-2xl font-medium text-white">Morgenyoga</h2>
  <p className="text-sm text-zinc-400">I dag kl. 08:00 · 12 påmeldte</p>
</div>
```
> Correct: One hero card per dashboard. Navigates to the class detail.

#### 3. Stats Card (Standard Data)
```tsx
// bg-surface — stats are standard content, not emphasis
<div className="rounded-xl bg-white border border-zinc-200 p-6">
  <p className="text-xs font-medium text-text-tertiary">Aktive studenter</p>
  <p className="text-2xl font-medium text-text-primary">47</p>
</div>
```
> Correct: Stats recede. They are reference data, not calls to action.

#### 4. Modal Content
```tsx
// bg-surface — modals are standard content containers
<DialogContent className="rounded-2xl bg-white border border-zinc-200">
  <DialogHeader>
    <DialogTitle className="text-text-primary">Legg til deltaker</DialogTitle>
  </DialogHeader>
  {/* form fields */}
</DialogContent>
```
> Correct: Modals use `bg-surface`. The overlay provides sufficient emphasis; the modal itself stays neutral.

#### 5. Selected Radio Card (Interactive State)
```tsx
// bg-surface-emphasis applied to a small interactive element, not a card
<div className={cn(
  "rounded-xl border p-4",
  selected ? "bg-zinc-900 border-zinc-900 text-white" : "bg-white border-zinc-200"
)}>
  <span className={selected ? "text-white" : "text-text-primary"}>Kursrekke</span>
</div>
```
> Correct: Dark as a selection indicator on a form control is a valid use of emphasis at the element level.

### Misuse Examples

#### 1. Dark Table Container
```tsx
// WRONG — tables are standard data display, never emphasis
<div className="rounded-xl bg-zinc-900 text-white border border-zinc-800 p-6">
  <table>
    <thead><tr><th className="text-zinc-400">Navn</th></tr></thead>
    <tbody>{/* rows */}</tbody>
  </table>
</div>
```
> Why it's wrong: Tables are reference content. Dark surfaces impair scanability and create false urgency. Use `bg-surface` (white) for all tabular data.

#### 2. Multiple Dark Cards in One Viewport
```tsx
// WRONG — two emphasis cards compete for attention
<div className="grid grid-cols-2 gap-6">
  <div className="rounded-xl bg-zinc-900 text-white p-8">Hero Card A</div>
  <div className="rounded-xl bg-zinc-900 text-white p-8">Hero Card B</div>
</div>
```
> Why it's wrong: Emphasis is lost when repeated. If everything is important, nothing is. Use emphasis for one card; make the other `bg-surface`.

#### 3. Dark Settings Panel
```tsx
// WRONG — settings are routine content, not attention-demanding
<div className="rounded-xl bg-zinc-900 text-white border border-zinc-800 p-8">
  <h2 className="text-white">Kursinnstillinger</h2>
  <Input className="bg-zinc-800 border-zinc-700" />
</div>
```
> Why it's wrong: Dark surfaces invert the entire form contract (input borders, focus rings, label colors). Settings are calm, persistent UI — they should recede, not demand attention.

### Relationship to Existing Tokens

The surface hierarchy aligns with existing tokens as follows:

| Surface | Existing Token | Role |
|---------|---------------|------|
| `bg-canvas` | `bg-surface` (Zinc-100) | Page floor — **note: the existing `bg-surface` CSS var maps to canvas** |
| `bg-surface` | `bg-white` / `--color-card` | Content containers |
| `bg-surface-emphasis` | `bg-zinc-900` | Attention surfaces |
| `bg-surface-elevated` | `bg-surface-elevated` (Zinc-200) | Secondary surfaces, inputs (unchanged) |

> **Migration note:** The existing `--color-surface` CSS variable (`#F4F4F5`) maps to what this framework calls `bg-canvas`. The naming divergence is historical. When referencing surfaces in code, use the class names (`bg-white`, `bg-zinc-900`) directly. The semantic framework above is for decision-making, not a CSS rename.

---

## Quick Reference: Design Tokens

### Zinc Scale (Neutral UI)
The "Zinc" scale provides the cool, professional feel required for a modern SaaS platform while maintaining high contrast for data-heavy views.

| Token | Hex | Usage |
|-------|-----|-------|
| `zinc-50` | #FAFAFA | Cards, sidebar, white surfaces |
| `zinc-100` | #F4F4F5 | `bg-surface`. **Page background "floor"** |
| `zinc-200` | #E4E4E7 | `bg-surface-elevated`. Secondary surfaces, borders |
| `zinc-300` | #D4D4D8 | `ring`. Disabled states, subtle borders. |
| `zinc-400` | #A1A1AA | Icons, placeholder text. |
| `zinc-500` | #71717A | `text-muted-foreground`. Secondary text, inactive tabs. |
| `zinc-600` | #52525B | `text-text-secondary`. Body text, hover icon states. |
| `zinc-700` | #3F3F46 | Primary button text, sidebars. |
| `zinc-800` | #27272A | Dark backgrounds, dark mode surfaces. |
| `zinc-900` | #09090B | `text-text-primary`. Darkest text, **primary buttons**. |

### Brand Colors (Dark Primary)
| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | #09090B | Primary Action Color. Buttons & brand moments. |
| `primary-soft` | #18181B | Hover states for primary buttons. |
| `primary-muted` | #FEF3C7 | Selected backgrounds, highlight states. |

### Text Colors (Semantic)
| Token | Hex | Usage |
|-------|-----|-------|
| `text-text-primary` | #09090B | Headings, primary text (deeper contrast) |
| `text-text-secondary` | #52525B | Body text, secondary content (cooler) |
| `text-text-tertiary` | #A1A1AA | Tertiary text, timestamps, placeholders |
| `text-muted-foreground` | #71717A | Muted text, descriptions |

### Background Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `bg-surface` | #F4F4F5 | **Page background "floor"** (Zinc-100) |
| `bg-surface-elevated` | #E4E4E7 | Secondary surfaces, inputs (Zinc-200) |
| `bg-white` | #FFFFFF | **Cards, sidebar** - pops against surface |
| `bg-zinc-800` | #27272A | Dark backgrounds (Zinc-800) |
| `bg-zinc-900` | #09090B | Darkest backgrounds (Zinc-950) |

### Border Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `border-zinc-200` | #E4E4E7 | **Card borders**, major section dividers |
| `border-zinc-300` | #D4D4D8 | **Input/Textarea borders** - "cut into" surface effect |
| `border-zinc-100` | #F4F4F5 | List item dividers, subtle row separation |

> **V2.2 Rule:** Inputs use `border-zinc-300` (darker) so they appear "cut into" the page surface. Cards use `border-zinc-200` (lighter).

### Status Colors (Semantic Colorways)

All status colors reference Tailwind's built-in palette via CSS custom properties. Never use raw hex — always use these semantic tokens.

| Colorway | Tailwind Source | Tokens (bg / border / text) | When to Use |
|----------|----------------|----------------------------|-------------|
| **Success** (green) | `green-100/200/700` | `status-confirmed-*` | Confirmed enrollments, completed actions, positive states ("Påmeldt", "Fullført", "Betalt") |
| **Warning** (amber) | `amber-100/300/800` | `status-warning-*` | Pending actions, awaiting attention ("Venter betaling", "Kommende") |
| **Error** (red) | `red-100/200/600` | `status-error-*` | Failed actions, destructive states ("Betaling feilet", "Avlyst") |
| **Info** (blue) | `blue-100/200/900` | `status-info-*` | Tips, informational callouts, neutral guidance ("Tips for synlighet", help text) |
| **Neutral** (zinc) | `zinc-200/300/600` | `status-cancelled-*` | Inactive/past states, de-emphasized items ("Avbestilt", "Kurs avlyst", "Refundert") |

#### Usage Rules
1. **Badges/pills**: Use via `<StatusIndicator>`, `<StatusBadge>`, or `<PaymentBadge>` components.
2. **Callout cards**: Apply tokens directly — `bg-status-info-bg border border-status-info-border` with `text-status-info-text` for icon/title and `text-status-info-text/70` for body text.
3. **Danger zones**: Use `status-error-*` tokens for cancel/delete sections.
4. **Never rely on color alone**: Always pair with a text label or icon for accessibility.
5. **Text/icon darkness**: The `*-text` token for each colorway should use the darkest available shade (e.g., `blue-900` for info, `amber-800` for warning) so that icon and text read as near-black on the tinted background. Avoid mid-range shades like `blue-700` — they look too saturated and pull attention away from the content.

### Feedback Colors

Single-tone semantic colors for icons, text accents, and button states. These also reference Tailwind's palette.

| Token | Tailwind Source | Usage |
|-------|----------------|-------|
| `bg-success` / `text-success` | `green-500` | Inline success indicators, icons |
| `bg-warning` / `text-warning` | `orange-500` | Inline warning indicators, icons |
| `bg-destructive` / `text-destructive` | `red-500` | Error text, destructive button backgrounds |

### Growth/Trend Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `text-growth-text` | #15803D | Positive growth percentage text |
| `bg-growth-bg` | #F0FDF4 | Positive growth badge background |

### Shadows (V2.4 - Disabled)
**Principle:** Shadows are disabled for structural elements. Hierarchy is achieved through borders.

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-xs` | `none` | Disabled |
| `shadow-sm` | `none` | Disabled |
| `shadow` | `none` | Disabled |
| `shadow-md` | `none` | Disabled |
| `shadow-lg` | `0 0 0 1px rgba(9,9,11,0.1)` | Modals, Popovers (Border only) |
| `shadow-xl` | `0 0 0 1px rgba(9,9,11,0.1)` | Large Overlays (Border only) |

---

## Typography

### Quick Reference — Copy-Paste Patterns

When building new UI, use these exact classes. Do not deviate.

| Element | Classes | When to use |
|---------|---------|-------------|
| **Page title** | `font-geist text-2xl font-medium tracking-tight text-text-primary` | Every page's main `<h1>` |
| **Section header** | `text-sm font-medium text-text-primary mb-3` | Above a card, never inside |
| **Card header** | `text-sm font-medium text-text-primary` | First heading inside a card |
| **Body text** | `text-sm text-text-secondary` | Descriptions, paragraphs, list content |
| **Micro-label** | `text-xs font-medium text-text-tertiary` | Timestamps, metadata, form labels |
| **Form label** | `text-xs font-medium text-text-primary mb-1.5` | Above form inputs |
| **Table header** | `text-xs font-medium text-text-secondary` | Table column headers (sentence case) |
| **Badge** | `text-xxs font-medium` or `text-xs font-medium` | Status indicators, counts |
| **Empty/error state (in card)** | `text-sm font-medium text-text-primary` | Title inside card overlay |
| **Empty/error state (standalone)** | `font-geist text-2xl font-medium tracking-tight text-text-primary` | Full-page error/empty |
| **Dialog title** | `text-lg font-medium text-text-primary` | Dialog/sheet headers |
| **Display number** | `text-xl`–`text-3xl font-medium tracking-tight` | Stats, prices, large counters |

### Typography Scale

| Class | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `text-xxs` | 11px | 16px | Tiny badges (status-indicator, avatar initials) |
| `text-xs` | 12px | 16px | Labels, metadata, hints, form validation |
| `text-sm` | 14px | 20px | **Main UI Workhorse**. Body text, card headers, section headers, inputs |
| `text-base` | 16px | 24px | Lead text on marketing pages only |
| `text-lg` | 18px | 28px | Dialog/sheet titles only |
| `text-xl` | 20px | 28px | Display numbers, public-facing card titles (PublicCourseCard) |
| `text-2xl` | 24px | 32px | **Page Titles**. Always with `font-geist tracking-tight` |
| `text-3xl` | 30px | 36px | Large display numbers, marketing section headers (md: breakpoint) |

> **Landing / Marketing Pages:** Marketing pages (LandingPage) may use sizes up to `text-5xl` for the hero headline and `text-3xl` for section h2s at the `md:` breakpoint, but the heading-to-description ratio should stay ≤ 1.7×. App UI pages always cap at `text-2xl` for page titles.

### Strict Rules (DO NOT break these)

1. **`font-semibold` is banned.** Use `font-medium` (500) for all hierarchy. Use `font-normal` (400) for body.
2. **`uppercase` is banned on labels.** Only exception: brand logo marks (e.g. studio initials in PublicCourseHeader).
3. **`tracking-wider` / `tracking-widest` are banned on labels.** Only exception: brand logo marks.
4. **`tracking-tight` is only for `text-2xl` page titles.** Do not add it to text-sm, text-lg, or any other size.
5. **`text-base` is not for body text.** It is only for lead/marketing text. Body text is always `text-sm`.
6. **`text-lg` is not for card headers or section headers.** It is only for dialog/sheet titles.
7. **`text-xl` is not for section headers in the app UI.** It is for display numbers and public-facing marketing card titles.
8. **Use semantic color tokens**, never hardcoded zinc values for text. Use `text-text-primary`, `text-text-secondary`, `text-text-tertiary`, `text-muted-foreground`. Exception: dark surfaces (`bg-zinc-900`) use `text-white`, `text-zinc-400`.
9. **Heading-to-description ratio must stay ≤ 1.7×.** A `text-2xl` (24px) heading pairs with `text-sm` (14px) description = 1.7×. Never pair `text-3xl` with `text-xs`.

### Font Weights

| Class | Weight | Usage |
|-------|--------|-------|
| `font-normal` | 400 | Body text, large display numbers, secondary text |
| `font-medium` | 500 | Headings, buttons, table headers, labels |
| `font-semibold` | 600 | **Banned** — do not use |

### Font Family
- **Primary**: Geist Sans (loaded via CDN)
- **Class**: `font-geist` adds tighter letter-spacing (-0.02em)
- **Usage**: Apply `font-geist` only to page titles (`text-2xl`) and marketing hero sections

### Typography Hierarchy

#### Page Headers
```tsx
<p className="text-xs font-medium text-text-tertiary mb-2">
  Oversikt
</p>
<h1 className="font-geist text-2xl font-medium tracking-tight text-text-primary">
  God morgen, Elena
</h1>
```

#### Section Headers (Norwegian Pattern — Title Outside Card)
Section titles sit **above** their card container, not inside. This follows the Scandinavian SaaS convention (Vipps, Fiken, Linear). The `CourseOverviewTab` is the reference implementation.

```tsx
{/* ✅ Correct: title outside, card below */}
<div>
  <h2 className="text-sm font-medium text-text-primary mb-3">Section Title</h2>
  <div className="rounded-xl bg-white p-6 border border-zinc-200">
    {/* card content */}
  </div>
</div>

{/* ✅ With icon (CourseOverviewTab pattern) */}
<div>
  <div className="flex items-center gap-2 mb-3">
    <Icon className="h-4 w-4 text-text-tertiary" />
    <h2 className="text-sm font-medium text-text-primary">Section Title</h2>
  </div>
  <div className="rounded-xl bg-white p-6 border border-zinc-200">
    {/* card content */}
  </div>
</div>

{/* ❌ Wrong: title inside card */}
<div className="rounded-xl bg-white p-6 border border-zinc-200">
  <h2>Section Title</h2>
  {/* content */}
</div>
```

#### Card Headers
```tsx
<h3 className="text-sm font-medium text-text-primary">
  Card Title
</h3>
```

#### Body Text
```tsx
<p className="text-sm text-text-secondary">
  Regular body text content.
</p>
```

#### Micro-labels
```tsx
<span className="text-xs font-medium text-text-tertiary">
  Label
</span>
```
> **Note:** Labels use sentence case and `text-xs` (12px) for a visually quiet style. No uppercase or tracking-wider.

#### Empty / Error States
```tsx
{/* Inside a card or overlay — card-level sizing */}
<h3 className="text-sm font-medium text-text-primary mb-1">Ingen data</h3>
<p className="text-sm text-text-secondary">Beskrivelse her.</p>

{/* Standalone full-page error — page-level sizing */}
<h1 className="font-geist text-2xl font-medium tracking-tight text-text-primary mb-2">
  Noe gikk galt
</h1>
<p className="text-sm text-text-secondary">Feilmelding her.</p>
```

#### Dialog / Sheet Titles
```tsx
<DialogTitle className="text-lg font-medium text-text-primary">
  Legg til deltaker
</DialogTitle>
```

#### Dark Surfaces (bg-zinc-900)
```tsx
<div className="bg-zinc-900 text-white">
  <h2 className="text-xl font-medium text-white">Heading</h2>
  <p className="text-sm text-zinc-400">Description on dark bg.</p>
</div>
```

---

## Components

### Buttons (V2.6 - Shadowless Zinc)

> **V2.6 Geometry:** Buttons use `rounded-xl` (12px) for softer corners. Inputs keep `rounded-lg` (8px). Cards use `rounded-xl` (12px). Modals use `rounded-2xl` (16px).

**Philosophy:** Buttons stay shadowless. The primary button uses a vertical gradient (`from-zinc-800 to-zinc-950`) with three layers of edge definition: outer ring (`ring-1 ring-black/5`), border (`border-zinc-700/70`), and an inner white ring via `after:` pseudo-element (`after:ring-1 after:ring-white/10`). This creates depth without box-shadow. Hover shifts the gradient and border one step lighter. Icons inside buttons use `opacity-70` for a muted, refined look.

#### Primary Button (Dark)
```tsx
className="relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-zinc-800 to-zinc-950 text-white border border-zinc-700/70 ring-1 ring-black/5 hover:from-zinc-700 hover:to-zinc-900 hover:border-zinc-600/80 after:absolute after:inset-0 after:rounded-[inherit] after:ring-1 after:ring-white/10 after:pointer-events-none transition-all duration-200 [&_svg]:opacity-70"
```

#### Outline Button
```tsx
className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white text-text-primary hover:bg-zinc-50 transition-all duration-200"
```

#### Ghost Button
```tsx
className="rounded-xl px-3 py-2 text-xxs font-medium text-muted-foreground hover:bg-surface-elevated hover:text-text-primary transition-all duration-200"
```

#### Icon Sizes in Buttons
| Button Size | Icon Size |
|-------------|-----------|
| Compact (text-xxs) | `h-3.5 w-3.5` |
| Standard (text-sm) | `h-4 w-4` |

#### Button Component Variants
The `<Button>` component supports these variants and sizes:

**Variants:**
- `default` - Dark gradient (zinc-800→zinc-950), border-zinc-700/70, ring-1 ring-black/5 outer edge, after: ring-white/10 inner glow, hover lightens gradient + border
- `outline` - White with zinc-200 border, hover → zinc-50 bg
- `outline-soft` - White with zinc-200 border, text-secondary → text-primary on hover
- `secondary` - Surface-elevated bg with border
- `ghost` - No background or border, hover reveals bg
- `destructive` - Red bg with border, hover darkens
- `link` - Text only with underline on hover

**Sizes:**
- `default` - Standard (h-10, px-5, text-sm, rounded-xl)
- `compact` - Refined smaller (h-10, px-3, text-xs, rounded-xl)
- `xs` - Extra small (h-8, px-3, text-xs, rounded-lg)
- `sm` - Small (h-9, px-4, text-xs, rounded-xl)
- `lg` - Large (h-12, px-6, rounded-xl)
- `pill` - Pill shape (rounded-full)
- `icon` / `icon-sm` - Icon-only (rounded-full)

### Cards

> **V2.3 Geometry Rule:** All cards use `rounded-xl` (12px) for a structured, premium feel.

#### Standard Card (Static)
```tsx
className="rounded-xl bg-white p-8 border border-zinc-200"
```
> **Usage:** Dashboard cards, stats, list containers. White cards "pop" against the Zinc-100 page background. No hover effect — cards are static containers.

#### Clickable Card
```tsx
className="rounded-xl bg-white p-6 border border-zinc-200 smooth-transition hover:bg-zinc-50/50 cursor-pointer"
```
> **Usage:** Course cards, schedule items — anything that navigates on click. Background-only hover.

#### Hero Card (Dark)
```tsx
className="relative rounded-xl bg-zinc-900 text-white border border-zinc-800 smooth-transition hover:bg-zinc-800/50"
```

### Tables (Data Density)
To maximize vertical space in the dashboard, we use tight borders and specific contrast for headers.

#### Table Header Row
```tsx
className="flex items-center border-b border-zinc-100 bg-surface/50 px-6 py-3"
```

#### Table Header Text
```tsx
className="text-xs font-medium text-text-secondary"
```
> **Note:** Use `font-medium` (not `font-semibold`) for table headers. Sentence case, no uppercase. Use `text-text-secondary` for improved contrast.

#### Table Row
```tsx
className="group hover:bg-zinc-50/50 transition-colors"
```

#### Table Cell
```tsx
className="py-4 px-6"
```

### Form Inputs

> **IMPORTANT:** Always use the shared `<Input>`, `<Textarea>`, and `<Checkbox>` components.
> **V2.2:** Inputs use `border-zinc-300` to appear "cut into" the surface (darker than card borders).

#### Form Field Labels
```tsx
className="block text-xs font-medium text-text-primary mb-1.5"
```

#### Text Input
```tsx
import { Input } from '@/components/ui/input';

// Basic usage - styles are built-in
<Input type="text" placeholder="Enter text..." />

// With leading icon
<div className="relative group">
  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary group-focus-within:text-text-primary transition-colors pointer-events-none" />
  <Input type="email" placeholder="email@example.com" className="pl-10" />
</div>
```

#### Textarea
```tsx
import { Textarea } from '@/components/ui/textarea';

// Basic usage - matches Input styling (border-zinc-300, focus ring, ios-ease)
<Textarea placeholder="Skriv her..." />

// With rows override
<Textarea rows={5} placeholder="Beskrivelse..." />
```
> **Note:** Default `resize-none` and `min-h-[80px]`. Override via `className` if needed. Uses `aria-invalid` for error state styling.

#### Checkbox
```tsx
import { Checkbox } from '@/components/ui/checkbox';

// Basic usage
<label className="flex items-center gap-2">
  <Checkbox checked={agreed} onChange={handleChange} />
  <span className="text-sm text-text-secondary">Jeg godtar vilkårene</span>
</label>
```
> **Note:** Uses `accent-primary` for checked color. Supports `aria-invalid` for error states.

#### Search Input
```tsx
import { SearchInput } from '@/components/ui/search-input';

<SearchInput
  value={searchQuery}
  onChange={setSearchQuery}
  placeholder="Søk..."
  aria-label="Søk"
/>
```

#### Form Validation Hook
```tsx
import { useFormValidation } from '@/hooks/use-form-validation';

const { formData, errors, touched, handleChange, handleBlur, validateForm, resetForm } =
  useFormValidation({
    initialValues: { email: '', password: '' },
    rules: {
      email: { validate: (v) => (!v ? 'E-post er påkrevd' : undefined) },
      password: { validate: (v) => (v.length < 6 ? 'Minimum 6 tegn' : undefined) },
    },
  });
```
> **Usage:** All auth pages (login, signup, forgot/reset password) use this hook. Supports cross-field validation via the `formData` parameter in each rule's `validate` function.

### Loading & Spinners

#### Spinner Component
```tsx
import { Spinner } from '@/components/ui/spinner';

// Standalone spinner (default: md)
<Spinner />
<Spinner size="xs" />  // h-3 w-3
<Spinner size="sm" />  // h-3.5 w-3.5
<Spinner size="md" />  // h-4 w-4
<Spinner size="lg" />  // h-6 w-6
<Spinner size="xl" />  // h-8 w-8
```

#### Button Loading States
```tsx
import { Button } from '@/components/ui/button';

// Shows spinner + existing children
<Button loading={isSubmitting}>Lagre</Button>

// Shows spinner + custom loading text
<Button loading={isSubmitting} loadingText="Lagrer...">Lagre</Button>
```
> **Rule:** Use Button's `loading` prop for async button states. Use standalone `<Spinner>` for page/section loading. Never use raw `<Loader2 className="animate-spin" />`.

#### Page & Section Loaders
```tsx
import { PageLoader } from '@/components/ui/page-loader';
import { SectionLoader } from '@/components/ui/section-loader';

// Full page loading
<PageLoader message="Laster..." />
<PageLoader variant="fullscreen" />  // h-screen
<PageLoader variant="overlay" />     // Absolute overlay

// Section loading (within cards/panels)
<SectionLoader size="sm" />   // h-24
<SectionLoader size="md" />   // h-40
<SectionLoader size="lg" />   // h-64
```

### Badges & Status Indicators

Use the `<StatusIndicator>` component for all status, payment, and exception badges.

#### Variants
- **success** - Confirmed signups, successful payments, active courses
- **warning** - Pending payments, upcoming events
- **error** - Failed payments, cancelled signups, expired offers
- **neutral** - Completed courses, refunded payments, archived items
- **critical** - Exceptions requiring immediate attention

#### Usage
```tsx
import { StatusIndicator } from '@/components/ui/status-indicator';

<StatusIndicator variant="success" label="Påmeldt" />
<StatusIndicator variant="warning" mode="inline" label="Venter" />
```

#### StatusBadge (Convenience Wrapper)
Maps signup/course statuses to StatusIndicator variants automatically.
```tsx
import { StatusBadge } from '@/components/ui/status-badge';

// Signup statuses: confirmed, cancelled, course_cancelled
<StatusBadge status="confirmed" />

// Course statuses: active, upcoming, completed
<StatusBadge status="upcoming" size="sm" />
```

#### PaymentBadge (Convenience Wrapper)
Maps payment statuses with configurable visibility ("silence is success" pattern).
```tsx
import { PaymentBadge } from '@/components/ui/payment-badge';

// Default: paid renders nothing (exceptions-only)
<PaymentBadge status="paid" />        // → null
<PaymentBadge status="pending" />     // → warning badge

// Show all statuses including paid
<PaymentBadge status="paid" visibility="always" />
```

## Interaction Design

### Hover & Interaction Patterns (V2.6)

**Philosophy:** Only add hover effects to elements that are actually clickable. Static display cards (stats, container wrappers, info cards) should **not** have hover effects. Hover feedback is reserved for confirming interactivity — not decorating the UI.

**Rule:** Never change both border and background on hover. Pick one. Background-only shifts are preferred for a calmer feel.

#### 1. Clickable Card Hover
Used for cards that navigate somewhere (course cards, schedule items, participant rows).
- **Classes:** `smooth-transition hover:bg-zinc-50/50`
- **Logic:** Background-only fill. No border change.
- **Transition:** `smooth-transition` (0.2s).

#### 2. Row/List Item Hover
Used for table rows, list items, and nested interactive elements.
- **Classes:** `smooth-transition hover:bg-zinc-50`
- **Logic:** Background-only fill. No border change to keep nested lists clean.
- **Transition:** `smooth-transition` (0.2s).

#### 3. Dark Card Hover
Used for clickable dark-themed cards (e.g., hero/featured course card).
- **Classes:** `smooth-transition hover:bg-zinc-800/50`
- **Logic:** Background shift within the dark scale. No border change.
- **Transition:** `smooth-transition` (0.2s).

#### 4. Action Hover (Buttons & Links)
Used for primary/secondary buttons and standalone links.
- **Classes:** Color/background shifts only (e.g., `hover:from-zinc-700 hover:to-zinc-900` for primary, `hover:bg-zinc-50` for outline).
- **Logic:** Color-based feedback. No scale or translate — states change color or fill, not size or position.
- **Transition:** `smooth-transition` (0.2s).

#### 5. Static Cards (No Hover)
Stats cards, container wrappers (CoursesList, MessagesList, RegistrationsList), info cards, and any non-clickable card should have **no hover effect**. Just `border border-zinc-200`.

---

### Focus States (V2.5 Flush Ring)

> **DEPRECATED:** `ring-4` and `ring-border/30` (fuzzy). Also deprecated: `ring-offset-2 ring-offset-white` (offset gap creates visual disconnect).
>
> **STANDARD:** A flush 2px ring that hugs the element — no offset gap. Matches Stripe's embedded input styling for a cohesive, modern feel.

#### Standard Focus Ring
```tsx
// For inputs, buttons, and interactive elements
// Ring: 2px zinc-400 at 50% opacity, flush against the border
// Border shifts to zinc-400 when focused
className="focus:outline-none focus:border-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-400/50"
```

#### Focus-Within (for compound inputs like TimePicker, DurationInput)
```tsx
// When the focus state needs to apply to a container
className="focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-400/50"
```

#### Error State Focus
```tsx
// For inputs in error state
className="focus-visible:ring-2 focus-visible:ring-destructive"
```

**Logic:** The ring sits flush against the element's border (no `ring-offset`). This creates a tight, precise highlight that feels integrated with the input rather than floating around it. The `zinc-400/50` is calm and sophisticated — visible enough to guide focus without being heavy. This matches the Stripe Payment Element focus style for consistency across native and embedded inputs.

> **Never use:** `ring-offset-2`, `ring-offset-white`, or `ring-offset-background` on focus rings. The flush ring is the standard across all interactive elements.

### Transition Utilities

| Class | Timing | Easing | Usage |
|-------|--------|--------|-------|
| `smooth-transition` | 0.2s | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Buttons, inputs, table rows |
| `ios-ease` | 0.3s | `cubic-bezier(0.25, 1, 0.5, 1)` | Modals, cards, larger surfaces |
| `transition-colors` | 0.15s | ease | Color changes only |
| `transition-all` | 0.15s | ease | All properties (Tailwind default) |

```tsx
// For buttons, table rows, list items
className="smooth-transition"

// For cards, modals, page transitions
className="ios-ease"

// Simple color changes
className="transition-colors"
```

### Hover Effects
> **Rule:** Hover and active states use color or fill changes only — never scale, translate, or rotate. See DESIGN_LANGUAGE.md §6: "Active states change color or fill, not size or position."

| Effect | Class |
|--------|-------|
| Color shift | `hover:text-text-primary` / `group-hover:text-text-secondary` |
| Background fill | `hover:bg-zinc-50` / `hover:bg-zinc-50/50` |
| Border shift | `hover:border-zinc-300` |

### Scrollbars
Scrollbars are globally styled to be non-intrusive.

| Property | Value |
|----------|-------|
| Width | 4px |
| Thumb | `#D4D4D8` (Zinc-300) |
| Thumb Hover | `#A1A1AA` (Zinc-400) |
| Track | transparent |

```tsx
// Hide scrollbar completely
className="no-scrollbar"

// Custom scrollbar (inherits global style)
className="custom-scrollbar"
```

---

## Notifications (Sonner)

Toasts use a **neutral card** for all types. Only the icon carries the status color.

| Element | Token | Usage |
|---------|-------|-------|
| Background | `var(--color-card)` | White card, same as UI cards |
| Border | `var(--color-border)` | Zinc-200, consistent card definition |
| Title | `var(--color-text-primary)` | Zinc-950, strong readability |
| Description | `var(--color-muted-foreground)` | Zinc-500, secondary text |
| Action Button | `var(--color-primary)` bg / `var(--color-primary-foreground)` text | Dark primary button |
| Cancel Button | `var(--color-border)` border / `var(--color-muted-foreground)` text | Subtle outline |

**Icon Colors by Type (only the icon changes):**
- Success: `var(--color-green-600)`
- Error: `var(--color-red-600)`
- Warning: `var(--color-amber-600)`
- Info: `var(--color-blue-600)`

**Layout:** `padding: 10px 12px`, `gap: 8px`, `border-radius: 12px`, `box-shadow: none`.

---

## Special Effects

### Frosted Glass (Structural Only)
```tsx
className="p-6 border-t border-border bg-white/80 backdrop-blur-md z-10"
```
Used for sticky action bars and fixed headers where content scrolls behind. This is structural (legibility), not decorative.

> **Rule:** `backdrop-blur` is only used on sticky/fixed navigation and action bars. Never use blur, grain, or glass effects for decorative purposes (badges, card accents, empty states).

### Safe Areas (iOS)
```tsx
// Ensure content isn't cut off by iOS home indicator
className="safe-area-bottom"

// For notch-aware top spacing
className="safe-area-top"
```

---

## Spacing

### Card Spacing
- **Card gap**: `gap-6` (grid)
- **Stats cards**: `space-y-6` (vertical)
- **List items**: `space-y-1` (tight)

### Internal Spacing
- **Section margin**: `mb-6` (standard section gap)
- **Tight margin**: `mb-2` (label to title)
- **Element gap**: `gap-2` (tight), `gap-3` (default), `gap-3.5` (comfortable)

### Padding
- **Small cards**: `p-6`
- **Large cards**: `p-8` or `p-10`
- **List items**: `p-3`
- **Buttons**: `px-3 py-2` (compact), `px-5 py-2.5` (standard)
- **Table cells**: `py-4 px-6`

---

## Icons

### Icon Sizes
| Size | Class | Usage |
|------|-------|-------|
| Tiny | `h-3.5 w-3.5` | Button icons |
| Small | `h-4 w-4` | Standard icons |
| Medium | `h-5 w-5` | Card icons, nav icons |
| Large | `h-6 w-6` | Mobile menu |
| Avatar | `h-10 w-10` | Message avatars |

### Icon Colors
```tsx
// Muted with hover
className="text-text-tertiary group-hover:text-muted-foreground"

// Light with hover
className="text-ring group-hover:text-text-tertiary"
```

---

## Empty States

### Design Principles
1. Use solid `border-zinc-200` (no dashed borders)
2. Flat white background — no gradients or blur decorations
3. Calm, inviting copy that explains what to do next
4. **No double-boxing** — when an empty state sits inside an already-bordered container (e.g. a dashboard card), render centered content with padding only. No inner `bg-zinc-50 border border-zinc-200` wrapper.

### Pattern — Standalone
```tsx
<div className="rounded-xl border border-zinc-200 bg-white p-6">
  <h2 className="text-2xl font-medium tracking-tight text-text-primary mb-2">
    Klar til å planlegge din første time?
  </h2>
  <p className="text-sm text-text-secondary">
    Opprett en yogaøkt og bygg din timeplan.
  </p>
</div>
```

### Pattern — Inside a Card (Dashboard Widgets)
```tsx
{/* ✅ Correct: no inner border, just centered content */}
<div className="flex flex-col items-center justify-center py-10 px-6 text-center">
  <div className="w-10 h-10 bg-surface-elevated rounded-xl flex items-center justify-center mb-3">
    <Icon className="w-4 h-4 text-text-tertiary" />
  </div>
  <p className="text-sm font-medium text-text-primary">Ingen data</p>
  <p className="text-xs text-text-secondary mt-1">Beskrivelse her.</p>
</div>

{/* ❌ Wrong: bordered box inside an already-bordered card */}
<div className="bg-zinc-50 border border-zinc-200 rounded-xl p-8">
  ...
</div>
```

---

## Sidebar Navigation

### Active Nav Item
```tsx
className="bg-white border border-zinc-200 text-text-primary"
```

### Inactive Nav Item
```tsx
className="text-text-secondary border border-transparent hover:bg-zinc-50 hover:text-text-primary ios-ease"
```

---

## Course Type Colors

| Type | Background | Ring | Hex |
|------|------------|------|-----|
| Course Series | `bg-course-series` | `ring-course-series-ring` | #2DD4BF |
| Event | `bg-muted` | `ring-border` | (neutral) |

**Usage pattern:**
```tsx
<div className="h-2 w-2 rounded-full bg-course-series ring-2 ring-course-series-ring" />
```

---

## Grid Layout

### Bento Grid
```tsx
className="grid auto-rows-min grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4"
```

### Span Rules
- **Hero card**: `col-span-1 md:col-span-2 lg:col-span-2`
- **Stats column**: `col-span-1 md:col-span-1 lg:col-span-1`
- **Messages**: `col-span-1 md:col-span-3 lg:col-span-1`
- **Courses list**: `col-span-1 md:col-span-3 lg:col-span-4`

---

## Norwegian Language Patterns

Standard UI text:
- **Buttons**: "Opprett", "Start time", "Se alle", "Hele uken", "I dag"
- **Labels**: "Neste time", "Kursrekke", "Denne uken", "Påmeldte"
- **Headers**: "Oversikt", "Meldinger", "Dine kurs", "Aktive studenter", "Oppmøte"
- **Empty states**: "Ingen planlagte kurs", "Ingen meldinger"
- **Greetings**: "God morgen", "God dag", "God kveld"

---

## Framer Motion Variants

Shared animation presets live in `src/lib/motion.ts`. They respect `prefers-reduced-motion`.

| Export | Movement | Duration | Usage |
|--------|----------|----------|-------|
| `pageVariants` + `pageTransition` | 4px translateY + fade | 180ms | Dashboard page transitions |
| `tabVariants` + `tabTransition` | 3px translateY + fade | 140ms | Tab content switching |
| `authPageVariants` + `authPageTransition` | 20px translateY + fade | 500ms | Auth pages (login, signup, reset) |

```tsx
import { motion } from 'framer-motion';
import { pageVariants, pageTransition } from '@/lib/motion';

<motion.div
  variants={pageVariants}
  initial="initial"
  animate="animate"
  exit="exit"
  transition={pageTransition}
>
  {/* page content */}
</motion.div>
```

---

## Component Catalog

Complete inventory of `src/components/ui/` — 37 components.

### Core Form Primitives
| Component | File | Description |
|-----------|------|-------------|
| `<Button>` | `button.tsx` | 7 variants, 7 sizes, loading/loadingText props |
| `<Input>` | `input.tsx` | Text input with zinc-300 border, focus ring, autofill override |
| `<Textarea>` | `textarea.tsx` | Multiline input, matches Input styling |
| `<Checkbox>` | `checkbox.tsx` | Native checkbox with accent-primary, focus ring |
| `<Label>` | `label.tsx` | Form label |
| `<SearchInput>` | `search-input.tsx` | Input with built-in search icon |
| `<ImageUpload>` | `image-upload.tsx` | Drag-and-drop image uploader with preview |
| `<DatePicker>` | `date-picker.tsx` | Calendar-based date picker (Radix Popover + Calendar) |
| `<Calendar>` | `calendar.tsx` | Month calendar grid |

### Feedback & Loading
| Component | File | Description |
|-----------|------|-------------|
| `<Spinner>` | `spinner.tsx` | Animated spinner, sizes: xs/sm/md/lg/xl |
| `<PageLoader>` | `page-loader.tsx` | Full-page spinner, variants: default/fullscreen/overlay |
| `<SectionLoader>` | `section-loader.tsx` | Section spinner, sizes: sm/md/lg |
| `<Skeleton>` | `skeleton.tsx` | Content placeholder shimmer |
| `<EmptyState>` | `empty-state.tsx` | Icon + title + description + optional action |
| `<EmptyStateToggle>` | `EmptyStateToggle.tsx` | Toggle-based empty state |
| `<ErrorState>` | `error-state.tsx` | Error display with retry button, variants: default/inline/card |

### Status & Badges
| Component | File | Description |
|-----------|------|-------------|
| `<StatusIndicator>` | `status-indicator.tsx` | Core badge: 5 variants, 3 modes (badge/inline/text-icon), 3 sizes |
| `<StatusBadge>` | `status-badge.tsx` | Convenience wrapper mapping signup/course statuses |
| `<PaymentBadge>` | `payment-badge.tsx` | Payment status with visibility control |

### Layout & Navigation
| Component | File | Description |
|-----------|------|-------------|
| `<Sidebar>` | `sidebar.tsx` | App sidebar with mobile responsive behavior |
| `<Tabs>` | `tabs.tsx` | Radix tabs |
| `<FilterTabs>` | `filter-tabs.tsx` | Custom tabs with 3 variants: default/contained/pill |
| `<Accordion>` | `accordion.tsx` | Radix accordion |
| `<Separator>` | `separator.tsx` | Horizontal/vertical divider |
| `<Breadcrumb>` | `breadcrumb.tsx` | Navigation breadcrumb |
| `<Collapsible>` | `collapsible.tsx` | Radix collapsible |

### Overlays & Dialogs
| Component | File | Description |
|-----------|------|-------------|
| `<Dialog>` | `dialog.tsx` | Radix modal dialog |
| `<AlertDialog>` | `alert-dialog.tsx` | Radix confirmation dialog |
| `<Sheet>` | `sheet.tsx` | Slide-out panel (mobile drawer) |
| `<Popover>` | `popover.tsx` | Radix popover |
| `<DropdownMenu>` | `dropdown-menu.tsx` | Radix dropdown |
| `<Tooltip>` | `tooltip.tsx` | Radix tooltip |

### Specialized
| Component | File | Description |
|-----------|------|-------------|
| `<Avatar>` | `avatar.tsx` | User avatar with fallback |
| `<UserAvatar>` | `user-avatar.tsx` | Extended avatar with initials/role |
| `<InfoTooltip>` | `info-tooltip.tsx` | Info icon with tooltip |
| `<NotePopover>` | `note-popover.tsx` | Note editing popover |
| `<ShareCoursePopover>` | `share-course-popover.tsx` | Course sharing popover |

---

## Token → Hex Reference (V2.4 - Shadowless Zinc)

```
Zinc Scale (Neutral UI):
#FAFAFA → zinc-50 / bg-white (cards, sidebar)
#F4F4F5 → zinc-100 / bg-surface (PAGE FLOOR)
#E4E4E7 → zinc-200 / bg-surface-elevated / border-zinc-200 (CARDS)
#D4D4D8 → zinc-300 / ring / border-zinc-300 (INPUTS)
#A1A1AA → zinc-400 / text-text-tertiary
#71717A → zinc-500 / text-muted-foreground
#52525B → zinc-600 / text-text-secondary
#3F3F46 → zinc-700
#27272A → zinc-800 / bg-primary-soft (hover)
#09090B → zinc-950 / text-text-primary / bg-primary (BUTTONS)

Brand Accent (Dark Primary):
#09090B → bg-primary (buttons, brand actions)
#18181B → bg-primary-soft (hover)
#FEF3C7 → bg-primary-muted (selected backgrounds)

Feedback:
#22C55E → bg-success / text-success
#F97316 → bg-warning / text-warning
#EF4444 → bg-destructive / text-destructive

Status Colors:
Confirmed: #DCFCE7 bg, #BBF7D0 border, #15803D text
Warning: #FEF3C7 bg, #FCD34D border, #92400E text
Cancelled: #E4E4E7 bg, #D4D4D8 border, #52525B text
Error: #FEE2E2 bg, #FECACA border, #DC2626 text
Info: #DBEAFE bg, #BFDBFE border, #1E3A5F text

Shadows (V2.4 - Disabled):
none
```
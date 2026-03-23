# Ease Design System V2.7

> Use design tokens (semantic class names) instead of hardcoded hex values. This ensures consistency and makes theme updates easier.

---

## Changelog

| Version | Name | Key Changes |
|---------|------|-------------|
| V2.7 | Systematic Tightening | Clean surface naming, typography token ladder, layout primitives, density guidance, keyboard standards, accessibility governance, icon policy |
| V2.5 | Norwegian Polish | Section titles outside cards, no nested empty states, unified borders, `rounded-xl` everywhere |
| V2.4 | Shadowless Hierarchy | All shadows disabled, hierarchy via borders and background contrast |

---

## Surface Hierarchy

Every surface has a semantic role. Five tokens, no ambiguity.

| Token | Color | CSS Variable | Tailwind Class | Purpose |
|-------|-------|-------------|----------------|---------|
| **canvas** | `#F4F4F5` (Zinc-100) | `--color-canvas` | `bg-surface` | Page floor. Everything sits on this. |
| **surface** | `#FFFFFF` (White) | `--color-card` | `bg-white` | Content containers. Cards, panels, lists. Always with `border border-zinc-200`. |
| **emphasis** | `#09090B` (Zinc-900) | — | `bg-zinc-900` | High-attention surface. One per viewport. Inverted text (`text-white`, `text-zinc-400`). |
| **field** | `rgba(255,255,255,0.5)` | `--color-field` | `bg-input-bg` | Input backgrounds. Uses `border-zinc-300` (darker than cards). |
| **overlay** | `rgba(0,0,0,0.3)` | `--color-overlay` | — | Modal/dialog backdrops. |

> **Decision rule:** If you're unsure which surface to use — it's `surface` (white card with `border-zinc-200`).

### Surface Rules

- **canvas** is the page background. Never use it as a card or container background.
- **surface** (white) must always have `border border-zinc-200` for definition. Never stack white on white.
- **emphasis** (dark) is for one card per viewport: onboarding, hero cards, critical attention. See "Dark Surface" section below.
- **field** is for input containers. Inputs use `border-zinc-300` to appear "cut into" the surface.

### Dark Surface (emphasis) — Inner Element Colors

| Element | Token | Notes |
|---------|-------|-------|
| Primary text | `text-white` | Headings, titles, key values |
| Secondary text | `text-zinc-400` | Descriptions, metadata |
| Muted text | `text-zinc-500` | Finished items, struck-through |
| Icons | `text-zinc-500` | Structural icons |
| Sub-cards | `bg-zinc-700/20 border border-zinc-700 rounded-xl` | Lighter wash on dark |
| Buttons | `bg-white text-zinc-900 border-zinc-300 hover:bg-zinc-100` | Inverted |
| Dividers | `border-zinc-700` | Not `border-zinc-200` |
| Focus rings | `ring-zinc-400 ring-offset-zinc-900` | Offset matches dark surface |

---

## Typography

### Token Ladder

Six semantic roles. Map your element to a role, then use the exact classes.

| Role | Classes | When to use |
|------|---------|-------------|
| **display** | `text-xl`–`text-3xl font-medium` | Stats, prices, large counters |
| **page-title** | `font-geist text-2xl font-medium tracking-tight text-text-primary` | Every page's `<h1>` |
| **section-title** | `text-sm font-medium text-text-primary mb-3` | Above a card, never inside |
| **card-title** | `text-sm font-medium text-text-primary` | First heading inside a card |
| **body** | `text-sm text-text-secondary` | Descriptions, paragraphs, list content |
| **meta** | `text-xs font-medium text-text-tertiary` | Timestamps, metadata, table headers |

**Specialized roles:**

| Role | Classes |
|------|---------|
| Form label | `text-xs font-medium text-text-primary mb-1.5` |
| Dialog title | `text-lg font-medium text-text-primary` |
| Badge | `text-xxs font-medium` or `text-xs font-medium` |
| Empty state (in card) | `text-sm font-medium text-text-primary` |
| Empty state (standalone) | Same as page-title |

### Scale Reference

| Class | Size | Usage |
|-------|------|-------|
| `text-xxs` | 11px | Tiny badges, avatar initials |
| `text-xs` | 12px | Labels, metadata, hints, form validation |
| `text-sm` | 14px | **Main UI workhorse.** Body text, card/section headers, inputs |
| `text-base` | 16px | Lead/marketing text only |
| `text-lg` | 18px | Dialog/sheet titles only |
| `text-xl` | 20px | Display numbers, public card titles |
| `text-2xl` | 24px | Page titles. Always with `font-geist tracking-tight` |
| `text-3xl` | 30px | Large display numbers, marketing headers (md: breakpoint) |

### Banned Patterns

1. `font-semibold` — use `font-medium`
2. `uppercase` on labels — only brand logo marks
3. `tracking-tight` on anything other than `text-2xl` page titles
4. `text-base` for body text — body is `text-sm`
5. `text-lg` / `text-xl` for section/card headers — those are `text-sm font-medium`
6. Hardcoded `text-zinc-*` — use `text-text-primary/secondary/tertiary`
7. `shadow-sm` / `shadow-md` / `shadow` — shadows are disabled

### Weights

| Class | Weight | Usage |
|-------|--------|-------|
| `font-normal` | 400 | Body text, display numbers |
| `font-medium` | 500 | Headings, buttons, labels |
| `font-semibold` | 600 | **Banned** |

### Font

- **Family:** Geist Sans (`font-geist`)
- **Apply `font-geist`** only to page titles (`text-2xl`) and marketing hero sections

---

## Layout Primitives

Documented Tailwind patterns for consistent layout. Use these instead of ad-hoc class combinations.

### Stack (vertical rhythm)
```tsx
<div className="flex flex-col gap-{n}">
  {/* children stacked vertically */}
</div>
```
- `gap-2` for tight (dense contexts)
- `gap-4` for default
- `gap-6` for comfortable (settings, onboarding)

### Inline (horizontal group)
```tsx
<div className="flex items-center gap-{n}">
  {/* children in a row, vertically centered */}
</div>
```

### Cluster (wrapping items)
```tsx
<div className="flex flex-wrap gap-{n}">
  {/* items wrap to next line when space runs out */}
</div>
```

### PageLayout (teacher pages)
```tsx
<SidebarProvider>
  <TeacherSidebar />
  <main className="flex-1 flex flex-col min-h-screen overflow-y-auto bg-surface">
    <MobileTeacherHeader title="Page Name" />
    <header className="bg-white border-b border-border px-6 lg:px-8 pt-6 lg:pt-8 pb-0 shrink-0">
      {/* page title, tabs, filters */}
    </header>
    <div className="flex-1 px-6 lg:px-8 pb-6 lg:pb-8">
      {/* page content */}
    </div>
  </main>
</SidebarProvider>
```

### CardSection (section title above card)
```tsx
<div>
  <h2 className="text-sm font-medium text-text-primary mb-3">Section Title</h2>
  <div className="rounded-xl bg-white p-6 border border-zinc-200">
    {/* card content */}
  </div>
</div>
```

> Section titles sit **above** their card container, not inside. This follows Scandinavian SaaS convention (Vipps, Fiken). Reference implementation: `CourseOverviewTab.tsx`.

---

## Density

Three contexts. Match spacing to information density.

| Context | Padding | Gap | Use when |
|---------|---------|-----|----------|
| **Comfortable** | `p-8` | `gap-6` / `space-y-6` | Onboarding, settings, marketing-adjacent UI |
| **Default** | `p-6` | `gap-4` / `space-y-4` | Cards, forms, course detail |
| **Dense** | `p-3` | `gap-2` / `space-y-2` | Tables, message lists, dashboards, admin views |

- Page headers: `px-6 lg:px-8 pt-6 lg:pt-8`
- Content area: `px-6 lg:px-8 pb-6 lg:pb-8`
- Table cells: `py-4 px-3 sm:px-6`
- List items: `p-3`

---

## Colors

### Text
| Token | Hex | Usage |
|-------|-----|-------|
| `text-text-primary` | #09090B | Headings, primary text |
| `text-text-secondary` | #52525B | Body text, secondary content |
| `text-text-tertiary` | #A1A1AA | Timestamps, placeholders, muted text |

### Borders
| Token | Hex | Usage |
|-------|-----|-------|
| `border-zinc-200` | #E4E4E7 | Card borders, section dividers |
| `border-zinc-300` | #D4D4D8 | Input borders — "cut into" surface |
| `border-zinc-100` | #F4F4F5 | List item dividers, subtle row separation |

### Status
| Colorway | Tokens (bg/border/text) | When to use |
|----------|------------------------|-------------|
| Success (green) | `status-confirmed-*` | Confirmed, completed, paid |
| Warning (amber) | `status-warning-*` | Pending, awaiting attention |
| Error (red) | `status-error-*` | Failed, destructive, cancelled course |
| Info (blue) | `status-info-*` | Tips, informational callouts |
| Neutral (zinc) | `status-cancelled-*` | Inactive, de-emphasized, cancelled signups |

> Never rely on color alone. Always pair with a text label or icon.

---

## Components

### Buttons

**Philosophy:** Dark fill with edge definition. Shadowless.

| Variant | Usage |
|---------|-------|
| `default` | Primary actions. Dark gradient with border/ring edge definition. |
| `outline` | Secondary actions. White with zinc-200 border. |
| `outline-soft` | Tertiary actions. White, secondary text → primary on hover. |
| `ghost` | Minimal. No background or border, hover reveals bg. |
| `destructive` | Dangerous actions. Red with border. |

> **V3 intent:** Simplify the primary button to flat dark fill + single border, removing the gradient and inner ring glow. This better matches the shadowless philosophy.

### Cards

| Type | Classes |
|------|---------|
| Static | `rounded-xl bg-white p-6 border border-zinc-200` |
| Clickable | Add `smooth-transition hover:bg-zinc-50/50 cursor-pointer` |
| Hero (dark) | `rounded-xl bg-zinc-900 text-white border border-zinc-800 smooth-transition hover:bg-zinc-800/50` |

### Form Inputs

- Always use shared `<Input>`, `<Textarea>`, `<Checkbox>` components
- Inputs use `border-zinc-300` (darker than cards)
- Labels: `text-xs font-medium text-text-primary mb-1.5` with `htmlFor`/`id` association

### Empty States

1. Use solid `border-zinc-200` (no dashed borders)
2. Flat white background — no gradients or blur
3. **No double-boxing** — inside a card, use centered content with padding only
4. Title: `text-sm font-medium text-text-primary`
5. Description: `text-sm text-text-secondary`

---

## Icons

### Policy

Use icons only when they do one of:
1. **Improve scan speed** — help users find content faster in a list or grid
2. **Signal object type** — distinguish between courses, messages, settings
3. **Indicate action affordance** — show that something is clickable, expandable, removable

Otherwise, remove them. In dense product UI, default to smaller icons first.

### Sizes
| Size | Class | Usage |
|------|-------|-------|
| Tiny | `h-3.5 w-3.5` | Button icons |
| Small | `h-4 w-4` | Standard icons |
| Medium | `h-5 w-5` | Card icons, nav icons |
| Large | `h-6 w-6` | Mobile menu |

### Colors
- Structural icons: `text-text-tertiary`
- Icon-only buttons must have `aria-label`
- Decorative icons should have `aria-hidden="true"`

---

## Interaction

### Hover

Only add hover to clickable elements. Static cards have no hover effect.

| Element | Hover |
|---------|-------|
| Clickable card | `hover:bg-zinc-50/50` |
| Table/list row | `hover:bg-zinc-50` |
| Dark card | `hover:bg-zinc-800/50` |
| Button | Color/gradient shift only |
| Static card | **None** |

> Never change both border and background on hover. Pick one. Background-only is preferred.

### Focus

Standard focus ring — flush 2px, no offset gap:
```
focus:outline-none focus:border-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-400/50
```

> Never use `ring-offset-2` or `ring-offset-white`. The flush ring is standard everywhere.

### Transitions

| Class | Duration | Usage |
|-------|----------|-------|
| `smooth-transition` | 0.2s | Buttons, inputs, table rows |
| `ios-ease` | 0.3s | Modals, cards, larger surfaces |

### Keyboard & Command Patterns

| Pattern | Behavior |
|---------|----------|
| `Escape` | Closes the topmost overlay (dialog, sheet, dropdown, popover) |
| `Enter` / `Space` | Activates the focused interactive element |
| `Tab` | Moves focus forward through interactive elements in reading order |
| `Shift+Tab` | Moves focus backward |
| Clickable elements | Must have keyboard equivalents (`tabIndex={0}`, `onKeyDown` for Enter/Space) |
| Dialogs | Focus moves to dialog content on open, returns to trigger on close |
| Focus visibility | Every interactive element must show a visible focus indicator |

---

## Accessibility Governance

### Must-Pass Checklist (every new component)

- [ ] **Contrast:** All text meets 4.5:1 (normal) or 3:1 (large text) against its background
- [ ] **Keyboard:** Every interactive element is reachable and activatable via keyboard
- [ ] **Focus visible:** Focus ring is visible on all interactive elements
- [ ] **Labels:** All form inputs have associated `<label>` via `htmlFor`/`id`
- [ ] **Names:** All icon-only buttons have `aria-label`
- [ ] **States:** Empty, error, and loading states are implemented for async surfaces
- [ ] **Motion:** Animations respect `prefers-reduced-motion` (handled by framer-motion config)
- [ ] **Color:** Information is never conveyed by color alone — always paired with text or icon

### Banned Patterns

- `<div onClick>` without `role`, `tabIndex`, and `onKeyDown`
- Icon-only buttons without `aria-label`
- `<label>` without `htmlFor` / `<input>` without `id`
- Loading states without `role="status"` or `aria-live`

### Tooling

- Run the `a11y` agent (`.claude/agents/a11y.md`) to audit components
- Run the `design-system` agent (`.claude/agents/design-system.md`) to check token compliance

---

## Product Writing

Full copy guide: **`COPY_STYLE_GUIDE.md`**

Key rules enforced across the app:

| Area | Rule |
|------|------|
| **Currency** | Always use `formatKroner()` from `@/lib/utils`. Never inline `${amount} kr`. |
| **Dates** | `nb-NO` locale. Format: `22. mars 2026`, `kl. 18:00` |
| **Tone** | Professional but warm. `du/deg` (informal). Active voice. |
| **Buttons** | Imperative: "Lagre", "Avbryt", "Legg til" |
| **Errors** | What happened + what to do: "Kunne ikke lagre. Prøv igjen." |
| **Toasts** | Short confirmation: "Endringer lagret", "Melding sendt" |
| **Domain terms** | Kurs, deltaker, påmelding, avbestilling, instruktør |
| **Banned** | "Vennligst", exclamation marks, translated English patterns |

---

## Reference

### Token → Hex

```
Canvas:     #F4F4F5 (Zinc-100) — bg-surface / bg-canvas
Surface:    #FFFFFF (White)     — bg-white + border border-zinc-200
Emphasis:   #09090B (Zinc-900)  — bg-zinc-900 + border border-zinc-800
Elevated:   #E4E4E7 (Zinc-200)  — bg-surface-elevated
Field:      rgba(255,255,255,0.5) — bg-input-bg

Text:
  Primary:   #09090B — text-text-primary
  Secondary: #52525B — text-text-secondary
  Tertiary:  #A1A1AA — text-text-tertiary

Borders:
  Card:    #E4E4E7 — border-zinc-200
  Input:   #D4D4D8 — border-zinc-300
  Divider: #F4F4F5 — border-zinc-100

Shadows: All disabled (none). Hierarchy via borders.
```

### Component Catalog

37 components in `src/components/ui/`. Key groups:

- **Form:** Button, Input, Textarea, Checkbox, SearchInput, ImageUpload, DatePicker, Calendar, Select, TimePicker
- **Feedback:** Spinner, PageLoader, SectionLoader, Skeleton, EmptyState, ErrorState
- **Status:** StatusIndicator, StatusBadge, PaymentBadge
- **Layout:** Sidebar, Tabs, FilterTabs, Accordion, Separator, Breadcrumb, Collapsible
- **Overlay:** Dialog, AlertDialog, Sheet, Popover, DropdownMenu, Tooltip
- **Specialized:** Avatar, UserAvatar, InfoTooltip, NotePopover, ShareCoursePopover, DateBadge, Switch

### Framer Motion

| Export | Movement | Duration | Usage |
|--------|----------|----------|-------|
| `pageVariants` | 4px translateY + fade | 180ms | Page transitions |
| `tabVariants` | 3px translateY + fade | 140ms | Tab switching |
| `authPageVariants` | 20px translateY + fade | 500ms | Auth pages |

All respect `prefers-reduced-motion`.

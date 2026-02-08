# Ease Design System (V2.4 - Shadowless Zinc)

> **Important**: Always use design tokens (semantic class names) instead of hardcoded hex values. This ensures consistency and makes theme updates easier.

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
3. **Card radius** - `rounded-2xl` (16px) for all cards. Bolder, more structured look
4. **Card borders** - `border-zinc-200` for clean, consistent definition
5. **Focus rings** - Softened offset ring: `focus-visible:ring-2 focus-visible:ring-zinc-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white` with `focus:border-zinc-400`

**New in V2.4 - Shadowless Hierarchy:**
1. **No Shadows** - `shadow-sm`, `shadow-md`, and default `shadow` are disabled (set to `none`).
2. **Border-Based Definition** - Cards use `border-zinc-200`, inputs use `border-zinc-300` for definition.
3. **Overlay Elevation** - Modals, popovers, and toasts use a high-contrast border (`border-zinc-200`) and a very subtle 1px ring instead of heavy shadows.
4. **Interactive States** - Hover states use border color shifts (`hover:border-zinc-400`) or background shifts (`hover:bg-zinc-50`) instead of shadow increases.

**Goal:** The UI feels like a single, cohesive plane where depth is communicated through layering and contrast rather than artificial light sources.

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
| `text-text-secondary` | #71717A | Body text, secondary content (cooler) |
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

### Status Colors
| Status | Background | Border | Text | Hex Values |
|--------|------------|--------|------|------------|
| Confirmed | `bg-status-confirmed-bg` | `border-status-confirmed-border` | `text-status-confirmed-text` | #dcfce7 / #bbf7d0 / #15803d |
| Warning | `bg-status-warning-bg` | `border-status-warning-border` | `text-status-warning-text` | #fef3c7 / #fcd34d / #92400e |
| Cancelled | `bg-status-cancelled-bg` | `border-status-cancelled-border` | `text-status-cancelled-text` | #E4E4E7 / #D4D4D8 / #52525B |
| Error | `bg-status-error-bg` | `border-status-error-border` | `text-status-error-text` | #fee2e2 / #fecaca / #dc2626 |
| Info | `bg-status-info-bg` | `border-status-info-border` | `text-status-info-text` | #dbeafe / #bfdbfe / #1d4ed8 |

### Feedback Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `bg-success` / `text-success` | #22C55E | Success states |
| `bg-warning` / `text-warning` | #F97316 | Warning states |
| `bg-destructive` / `text-destructive` | #EF4444 | Error/destructive |

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

### Typography Scale
Refined to ensure high data density remains legible.

| Class | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `text-xxs` | 11px | 16px | Uppercase labels, small badges, toast descriptions. **V2.2: Includes `tracking-wider` (0.05em)** |
| `text-xs` | 12px | 16px | Meta text, secondary info, badges |
| `text-small` | 13px | 18px | Dense lists, table data, toast titles |
| `text-sm` | 14px | 20px | **Main UI Workhorse**. Standard body, inputs |
| `text-base` | 16px | 24px | Lead text, section descriptions |
| `text-lg` | 18px | 28px | Small section headers |
| `text-xl` | 20px | 28px | Card titles, section headers |
| `text-2xl` | 24px | 32px | **Page Titles**. Use with `font-geist` |
| `text-3xl` | 30px | 36px | Hero numbers |

### Font Weights
**Principle:** Use `font-normal` for body and `font-medium` for hierarchy. Avoid semibold to keep the dashboard feeling light.

| Class | Weight | Usage |
|-------|--------|-------|
| `font-normal` | 400 | Body text, Large display numbers, Secondary text |
| `font-medium` | 500 | Headings, Buttons, Table headers, Labels |
| `font-semibold` | 600 | **Avoid** - rarely needed in calm UI |

### Font Family
- **Primary**: Geist Sans (loaded via CDN)
- **Class**: `font-geist` adds tighter letter-spacing (-0.02em)
- **Usage**: Apply `font-geist` to page titles and hero sections

### Typography Hierarchy

#### Page Headers
```tsx
<p className="text-xxs font-medium uppercase tracking-wider text-text-tertiary mb-2">
  Oversikt
</p>
<h1 className="font-geist text-2xl font-medium tracking-tight text-text-primary">
  God morgen, Elena
</h1>
```

#### Section Headers
```tsx
<h2 className="text-lg font-medium text-text-primary">
  Section Title
</h2>
```

#### Card Headers
```tsx
<h3 className="text-sm font-medium text-text-primary">
  Card Title
</h3>
```

#### Body Text
```tsx
<p className="text-sm font-normal text-text-secondary">
  Regular body text content.
</p>
```

#### Micro-labels
```tsx
<span className="text-xxs font-medium text-text-tertiary uppercase tracking-wider">
  Label
</span>
```
> **Note:** Use `text-xxs` (11px) with `tracking-wider` for all uppercase micro-labels.

---

## Components

### Buttons

> **V2.3 Geometry Rule:** Buttons and inputs use `rounded-lg` (8px). Only status badges, avatars, and pill variants use `rounded-full`. Cards use `rounded-2xl` (16px).

#### Primary Button (Dark) - Standard
```tsx
className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary-soft ios-ease active:scale-[0.98]"
```

#### Secondary/Outline Button - Standard
```tsx
className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-text-primary hover:bg-gray-50 ios-ease active:scale-[0.98]"
```

#### Ghost Button
```tsx
className="rounded-lg px-3 py-2 text-xxs font-medium text-muted-foreground hover:bg-surface-elevated hover:text-text-primary smooth-transition"
```

#### Icon Sizes in Buttons
| Button Size | Icon Size |
|-------------|-----------|
| Compact (text-xxs) | `h-3.5 w-3.5` |
| Standard (text-sm) | `h-4 w-4` |

#### Button Component Variants
The `<Button>` component supports these variants and sizes:

**Variants:**
- `default` - Dark primary button (#1C1917)
- `outline` - Light with invert hover
- `outline-soft` - Light with soft hover (text-text-secondary)
- `secondary` - Elevated background
- `ghost` - No background, hover reveals
- `destructive` - Red danger button
- `link` - Text only with underline on hover

**Sizes:**
- `default` - Standard (h-10, px-5, text-sm)
- `compact` - Refined smaller (h-10, px-3, text-xxs, rounded-lg)
- `sm` - Small (h-9, px-4, text-xs)
- `lg` - Large (h-12, px-6)
- `pill` - Pill shape
- `icon` / `icon-sm` - Icon-only buttons

### Cards

> **V2.3 Geometry Rule:** All cards use `rounded-2xl` (16px) for a structured, premium feel.

#### Standard Card (Border-Defined)
```tsx
className="rounded-2xl bg-white p-7 border border-gray-200 ios-ease hover:border-gray-400"
```
> **Usage:** Dashboard cards, stats, list containers. White cards "pop" against the Stone-100 page background.

#### Hero Card (Dark)
```tsx
className="relative rounded-2xl bg-gray-900 text-white border border-gray-800 ios-ease hover:border-gray-700"
```

### Tables (Data Density)
To maximize vertical space in the dashboard, we use tight borders and specific contrast for headers.

#### Table Header Row
```tsx
className="flex items-center border-b border-gray-100 bg-surface/50 px-6 py-3"
```

#### Table Header Text
```tsx
className="text-xxs font-medium uppercase tracking-wider text-text-secondary"
```
> **Note:** Use `font-medium` (not `font-semibold`) for table headers. Use `text-text-secondary` for improved contrast.

#### Table Row
```tsx
className="group hover:bg-gray-50/50 transition-colors"
```

#### Table Cell
```tsx
className="py-4 px-6"
```

### Form Inputs

> **IMPORTANT:** Always use the shadcn `<Input>` component.
> **V2.2:** Inputs use `border-gray-300` to appear "cut into" the surface (darker than card borders).

#### Form Field Labels
```tsx
className="block text-xxs font-medium uppercase tracking-wider text-text-tertiary mb-1.5"
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

---

## Interaction Design

### Focus States (V2.2 Elevated Contrast - Softened)

> **DEPRECATED:** `ring-4` and `ring-border/30`. These look dated and fuzzy.
>
> **NEW STANDARD:** Use a crisp 2px offset ring with soft stone color for a calm, sophisticated highlight.

#### Standard Focus Ring
```tsx
// For inputs, buttons, and interactive elements
// Ring color: stone-400/60 (stone-400 at 60% opacity)
// Border shifts to gray-400 when focused
className="focus:outline-none focus:border-gray-400 focus-visible:ring-2 focus-visible:ring-stone-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
```

#### Focus-Within (for compound inputs like TimePicker, DurationInput)
```tsx
// When the focus state needs to apply to a container
className="focus-within:border-gray-400 focus-within:ring-2 focus-within:ring-stone-400/60 focus-within:ring-offset-2 focus-within:ring-offset-white"
```

#### Error State Focus
```tsx
// For inputs in error state
className="focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 focus-visible:ring-offset-white"
```

**Logic:** This creates a sharp 2px gap of white space between the input and a soft stone-colored ring. The `stone-400/60` provides a calm, sophisticated highlight that guides the user without creating too much visual weight - perfect for the "Ease" aesthetic.

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
| Effect | Class |
|--------|-------|
| Button scale | `hover:scale-[1.02] active:scale-[0.98]` |
| Card scale | `hover:scale-[1.005]` |
| Arrow translate | `hover:translate-x-1` |
| Chevron | `group-hover:translate-x-0.5` |

### Scrollbars
Scrollbars are globally styled to be non-intrusive.

| Property | Value |
|----------|-------|
| Width | 4px |
| Thumb | `#D6D3D1` (Stone-300) |
| Thumb Hover | `#A8A29E` (Stone-400) |
| Track | transparent |

```tsx
// Hide scrollbar completely
className="no-scrollbar"

// Custom scrollbar (inherits global style)
className="custom-scrollbar"
```

---

## Notifications (Sonner)

Our toasts follow a "Stone Dark" theme to stand out against the light dashboard.

| Element | Color | Hex |
|---------|-------|-----|
| Background | Stone-700 | #44403C |
| Border | Stone-600 | #57534E |
| Title | Stone-50 | #FAFAF9 |
| Description | Stone-200 | #E7E5E4 |
| Action Button | Stone-100 bg / Stone-700 text | #F5F5F4 / #44403C |

**Icon Colors by Type:**
- Success: `#22C55E`
- Error: `#EF4444`
- Warning: `#F97316`
- Info: `#3B82F6`

---

## Special Effects

### Grain Texture
```tsx
className="bg-grain opacity-[0.2] mix-blend-overlay"
```
Apply to dark cards for subtle texture.

### Glass Morphism
```tsx
className="backdrop-blur-md bg-white/10 border border-white/10"
```
Used for badges on dark backgrounds.

### Frosted Glass Footer
```tsx
className="p-6 border-t border-border bg-white/80 backdrop-blur-md z-10"
```
Used for sticky action bars.

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
- **Large cards**: `p-7` to `p-9`
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
1. Use solid `border-gray-200` (no dashed borders)
2. Gradient backgrounds: `bg-gradient-to-br from-white to-surface-elevated/50`
3. Soft blur decorations with `blur-2xl` or `blur-3xl`

### Pattern
```tsx
<div className="relative rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-surface-elevated/50 p-6 overflow-hidden">
  <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gray-200/50 blur-2xl"></div>
  <div className="relative z-10">
    <h2 className="text-2xl font-medium tracking-tight text-text-primary mb-2">
      Klar til å planlegge din første time?
    </h2>
    <p className="text-sm text-text-secondary">
      Opprett en yogaøkt og bygg din timeplan.
    </p>
  </div>
</div>
```

---

## Sidebar Navigation

### Active Nav Item
```tsx
className="bg-white border border-gray-200 text-text-primary"
```

### Inactive Nav Item
```tsx
className="text-text-secondary border border-transparent hover:bg-gray-50 hover:text-text-primary ios-ease"
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

## Token → Hex Reference (V2.4 - Shadowless)

```
Stone Scale (Neutral UI):
#FAFAF9 → bg-gray-50 / bg-white (cards, sidebar)
#F5F5F4 → bg-gray-100 / bg-surface (PAGE FLOOR)
#E7E5E4 → bg-gray-200 / bg-surface-elevated / border-gray-200 (CARDS)
#D6D3D1 → bg-gray-300 / ring / border-gray-300 (INPUTS)
#A8A29E → text-gray-400 / text-text-tertiary
#78716C → text-gray-500 / text-muted-foreground
#57534E → text-gray-600 / text-text-secondary
#44403C → text-gray-700
#292524 → bg-gray-800 / bg-primary-soft (hover)
#1C1917 → bg-gray-900 / text-text-primary / bg-primary (BUTTONS)

Brand Accent (Dark Primary):
#1C1917 → bg-primary (buttons, brand actions)
#292524 → bg-primary-soft (hover)
#FEF3C7 → bg-primary-muted (selected backgrounds)

Feedback:
#22C55E → bg-success / text-success
#F97316 → bg-warning / text-warning
#EF4444 → bg-destructive / text-destructive

Status Colors:
Confirmed: #dcfce7 bg, #bbf7d0 border, #15803d text
Warning: #fef3c7 bg, #fcd34d border, #92400e text
Cancelled: #E7E5E4 bg, #D6D3D1 border, #57534E text
Error: #fee2e2 bg, #fecaca border, #dc2626 text
Info: #dbeafe bg, #bfdbfe border, #1d4ed8 text

Shadows (V2.4 - Disabled):
none
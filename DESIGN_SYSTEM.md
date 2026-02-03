# Ease Design System

> **Important**: Always use design tokens (semantic class names) instead of hardcoded hex values. This ensures consistency and makes theme updates easier.

---

## Quick Reference: Design Tokens

### Gray Scale (Neutral UI)
Use these for general UI elements, backgrounds, borders, and text when you need neutral colors.

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-gray-50` / `text-gray-50` | #F9FAFB | Lightest backgrounds, hover states |
| `bg-gray-100` / `text-gray-100` | #F3F4F6 | Subtle backgrounds, dividers |
| `bg-gray-200` / `border-gray-200` | #E5E7EB | Borders, input borders |
| `bg-gray-300` / `border-gray-300` | #D1D5DB | Disabled states, subtle borders |
| `text-gray-400` | #9CA3AF | Icons, placeholder text |
| `text-gray-500` | #6B7280 | Secondary text, inactive tabs |
| `text-gray-600` | #4B5563 | Body text, hover icon states |
| `text-gray-700` | #374151 | Primary text, button text |
| `bg-gray-800` | #1F2937 | Dark backgrounds, gradients |
| `bg-gray-900` / `text-gray-900` | #111827 | Darkest text, dark buttons |

### Text Colors (Semantic)
| Token | Hex | Usage |
|-------|-----|-------|
| `text-text-primary` | #374151 (Gray-700) | Headings, primary text, dark emphasis |
| `text-text-secondary` | #52525B (Zinc-600) | Body text, secondary content |
| `text-text-tertiary` | #71717A (Zinc-500) | Tertiary text, timestamps, placeholders |
| `text-muted-foreground` | #6B7280 (Gray-500) | Muted text, descriptions |

### Background Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `bg-surface` | #F9FAFB | Page background (gray-50) |
| `bg-surface-elevated` | #F3F4F6 | Cards, elevated surfaces (gray-100) |
| `bg-white` | #FFFFFF | Card backgrounds |
| `bg-gray-800` | #1F2937 | Dark backgrounds, hero cards |
| `bg-gray-900` | #111827 | Darkest backgrounds, primary buttons |

### Border Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `border-gray-200` | #E5E7EB | **Default structural border** (Cards, Inputs) |
| `border-gray-100` | #F3F4F6 | Subtle dividers (List items, table rows) |
| `border-gray-300` | #D1D5DB | Hover/Active border state |
| `border-gray-800` | #1F2937 | Dark border for hero cards |

### Status Colors
| Status | Background | Border | Text | Hex Values |
|--------|------------|--------|------|------------|
| Confirmed | `bg-status-confirmed-bg` | `border-status-confirmed-border` | `text-status-confirmed-text` | green-50/100/700 |
| Waitlist | `bg-status-waitlist-bg` | `border-status-waitlist-border` | `text-status-waitlist-text` | orange-50/100/700 |
| Cancelled | `bg-status-cancelled-bg` | `border-status-cancelled-border` | `text-status-cancelled-text` | gray-100/200/600 |
| Error | `bg-status-error-bg` | `border-status-error-border` | `text-status-error-text` | red-50/100/600 |
| Info | `bg-status-info-bg` | `border-status-info-border` | `text-status-info-text` | blue-50/100/700 |

### Feedback Colors
| Token | Usage |
|-------|-------|
| `bg-success` / `text-success` | Success states (#22C55E) |
| `bg-warning` / `text-warning` | Warning states (#F97316) |
| `bg-destructive` / `text-destructive` | Error/destructive (#EF4444) |

### Growth/Trend Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `text-growth-text` | #15803D (green-700) | Positive growth percentage text |
| `bg-growth-bg` | #F0FDF4 (green-50) | Positive growth badge background |

### Shadows (Minimal Elevation)
**Principle:** Shadows are reserved for **overlays only** (modals, popovers). Cards and structural elements use borders.

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-xs` | `0 1px 2px rgba(0,0,0,0.02)` | Extremely subtle (Buttons only) |
| `shadow-sm` | `none` | **Disabled** on standard cards |
| `shadow` | `none` | **Disabled** |
| `shadow-md` | `none` | **Disabled** |
| `shadow-lg` | `0 10px 15px rgba(0,0,0,0.05)` | Modals, Popovers, Toasts |
| `shadow-xl` | `0 20px 25px rgba(0,0,0,0.08)` | Large Overlays |

### Typography Scale
| Class | Size | Line Height | Usage |
|-------|------|-------------|-------|
| `text-tiny` | 10px | 14px | Rare micro-text only (timestamps) |
| `text-xxs` | 11px | 14px | Uppercase labels, small badges |
| `text-xs` | 12px | 16px | Meta text, secondary info, badges |
| `text-small` | 13px | 18px | Dense lists, table data |
| `text-sm` | 14px | 20px | Standard body text, inputs |
| `text-base` | 16px | 24px | Lead text, major components |
| `text-lg` | 18px | 28px | Section headers |
| `text-2xl` | 24px | 32px | Page titles |
| `text-3xl` | 30px | 36px | Hero numbers |

### Font Weights
**Principle:** Use lighter weights for a cleaner, modern look. Let font SIZE establish hierarchy, not weight.

| Class | Weight | Usage |
|-------|--------|-------|
| `font-normal` | 400 | Body text, Large display numbers, Secondary text |
| `font-medium` | 500 | Headings, Buttons, Table headers, Labels |
| `font-semibold` | 600 | **Avoid** - rarely needed in calm UI |

> **Soft Light Mode:** Prefer `font-medium` over `font-semibold` for table headers and labels. The goal is a calm, minimal interface where size (not weight) creates hierarchy.

### Font Family
- **Primary**: Geist Sans (loaded via CDN)
- **Class**: `font-geist` adds tighter letter-spacing (-0.02em)
- **Usage**: Apply `font-geist` to page titles and hero sections

---

## Typography Hierarchy

### Page Headers
```tsx
<p className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary mb-2">
  Oversikt
</p>
<h1 className="font-geist text-2xl font-medium tracking-tight text-text-primary">
  God morgen, Elena
</h1>
```

### Section Headers
```tsx
<h2 className="text-lg font-medium text-text-primary">
  Section Title
</h2>
```

### Card Headers
```tsx
<h3 className="text-sm font-medium text-text-primary">
  Card Title
</h3>
```

### Body Text
```tsx
<p className="text-sm font-normal text-text-secondary">
  Regular body text content.
</p>
```

### Muted/Secondary Text
```tsx
<span className="text-xs font-normal text-text-tertiary">
  Secondary information
</span>
```

### Tiny Labels (Micro-labels)
```tsx
<span className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">
  Label
</span>
```
> **Note:** Use `text-[11px]` (or `text-xxs`) with `tracking-wider` for all uppercase micro-labels. Avoid `tracking-widest` as it creates overly spread text.

---

## Components

### Buttons

> **Note:** Action buttons use `rounded-lg` for a refined look. Only pills, badges, and segmented controls use `rounded-full`. Form buttons (in modals/pages) may use `rounded-xl`.

#### Primary Button (Dark) - Compact
```tsx
className="flex items-center gap-2 rounded-lg bg-text-primary border border-text-primary px-3 py-2 text-tiny font-medium text-white shadow-md shadow-text-primary/10 hover:bg-sidebar-foreground hover:border-sidebar-foreground ios-ease"
```

#### Primary Button (Dark) - Standard
```tsx
className="flex items-center gap-2 rounded-xl bg-text-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-sidebar-foreground ios-ease active:scale-[0.98]"
```

#### Secondary/Outline Button - Compact (Soft hover)
```tsx
className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-tiny font-medium text-text-secondary shadow-sm hover:bg-surface-elevated hover:text-text-primary ios-ease"
```

#### Secondary/Outline Button - Standard (Invert hover)
```tsx
className="flex items-center gap-2 rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-medium text-text-primary shadow-sm hover:bg-text-primary hover:text-white hover:border-text-primary ios-ease active:scale-[0.98]"
```

#### Ghost Button
```tsx
className="rounded-lg px-3 py-2 text-tiny font-medium text-muted-foreground hover:bg-surface-elevated hover:text-text-primary ios-ease"
```

#### Filter/Tab Pill (inside container)
```tsx
className="flex-1 rounded-full py-1.5 text-tiny font-medium transition-all bg-white text-text-primary shadow-sm"
```

#### Filter Dropdown Button
```tsx
className="flex items-center gap-2 h-10 rounded-lg border border-border bg-white px-3 py-2 text-tiny font-medium text-text-secondary shadow-sm whitespace-nowrap hover:bg-surface-elevated hover:text-text-primary ios-ease"
```

#### Icon Sizes in Buttons
| Button Size | Icon Size |
|-------------|-----------|
| Compact (text-tiny) | `h-3.5 w-3.5` |
| Standard (text-sm) | `h-4 w-4` |

#### Button Component Variants
The `<Button>` component supports these variants and sizes:

**Variants:**
- `default` - Dark primary button
- `outline` - Light with invert hover
- `outline-soft` - Light with soft hover (text-text-secondary)
- `secondary` - Elevated background
- `ghost` - No background, hover reveals
- `destructive` - Red danger button
- `link` - Text only with underline on hover

**Sizes:**
- `default` - Standard (h-10, px-5, text-sm)
- `compact` - Refined smaller (h-10, px-3, text-tiny, rounded-lg)
- `sm` - Small (h-9, px-4, text-xs)
- `lg` - Large (h-12, px-6)
- `pill` - Pill shape
- `icon` / `icon-sm` - Icon-only buttons

**Usage:**
```tsx
<Button variant="outline-soft" size="compact">
  <Download className="h-3.5 w-3.5" />
  Eksporter
</Button>
```

#### When to Use `<Button>` vs Native `<button>`

> **IMPORTANT:** Always use the shadcn `<Button>` component from `@/components/ui/button` for action buttons. Use native `<button>` only for UI controls like tabs, filters, and list items.

| Button Type | Use | Examples |
|-------------|-----|----------|
| **Primary actions** | `<Button>` | "Opprett kurs", "Lagre", "Send", "Publiser" |
| **Secondary actions** | `<Button variant="outline-soft">` | "Del kurs", "Vis side", "Eksporter" |
| **Cancel/dismiss** | `<Button variant="ghost">` | "Avbryt" |
| **Destructive actions** | `<Button variant="destructive">` | "Slett kurs", "Logg ut" |
| **Tab/filter navigation** | Native `<button>` | Status tabs, view toggles, filter pills |
| **Icon-only triggers** | Native `<button>` | Close, more-menu, pagination arrows |
| **List items/cards** | Native `<button>` | Conversation rows, clickable cards |
| **Selection cards** | Native `<button>` | Radio-style form selections |
| **Form triggers** | Native `<button>` | Date picker, time selector, dropdown triggers |
| **Toggle switches** | Native `<button>` | On/off toggles, notification settings |

**Examples:**
```tsx
// Action buttons - use <Button>
<Button size="compact">Lagre endringer</Button>
<Button variant="outline-soft" size="compact">
  <Share className="h-3.5 w-3.5" />
  Del kurs
</Button>
<Button variant="ghost" size="compact">Avbryt</Button>
<Button variant="destructive" size="compact">Slett kurs</Button>

// UI controls - use native <button>
<button onClick={() => setActiveTab('weeks')} className="tab-btn ...">
  Timeplan
</button>
<button className="rounded-lg border ..." aria-label="Neste side">
  <ChevronRight className="h-4 w-4" />
</button>
```

### Cards

#### Standard Card (Minimal)
```tsx
className="rounded-3xl bg-white p-7 border border-gray-200 ios-ease hover:border-gray-300"
```
> **Usage:** Dashboard cards, stats, list containers. No drop shadows by default.

#### Hero Card (Dark)
```tsx
className="relative rounded-3xl bg-gray-900 text-white border border-gray-800 ios-ease hover:border-gray-700"
```
> **Usage:** Primary action cards ("New Course"). Uses `border-gray-800` for subtle definition.

### Form Inputs

> **IMPORTANT:** Always use the shadcn `<Input>` component.

#### Form Field Labels
```tsx
className="block text-[11px] font-medium uppercase tracking-wider text-text-tertiary mb-1.5"
```

#### Form Section Card Header
```tsx
className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary"
```
> Use `text-text-tertiary` for section headers like "Generell Informasjon" or step indicators like "1. Velg type". These sit above the form fields.

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
> **Always use `<Input>` component.** Standard height is `h-11` (44px). For inputs with icons, wrap in `relative group` div and add `pl-10` to Input. The component includes all design system styles: `bg-input-bg`, `focus:bg-white`, `focus:border-ring focus:ring-4 focus:ring-border/30`, and `hover:border-ring`.

#### Selection Card (Radio-style)
```tsx
// Selected state
className="bg-surface ring-2 ring-text-secondary border border-transparent shadow-sm rounded-xl p-5"

// Unselected state
className="border border-border bg-input-bg hover:bg-surface hover:border-ring opacity-80 hover:opacity-100 rounded-xl p-5"
```
> Use `ring-2 ring-text-secondary` for a softer selection indicator instead of thick borders. Use `rounded-xl` for selection cards inside form sections.

#### Search Input
```tsx
import { SearchInput } from '@/components/ui/search-input';

// Basic usage - icon and styles are built-in
<SearchInput
  value={searchQuery}
  onChange={setSearchQuery}
  placeholder="Søk..."
  aria-label="Søk"
/>
```
> **Always use `<SearchInput>` component for search fields.** It includes the search icon and all styling. Height is `h-10`. The component is controlled via `value` and `onChange` props.

#### Segmented Filter Container
```tsx
// Container
className="flex gap-1 p-1 bg-surface-elevated rounded-xl"
// Individual tabs
className="flex-1 rounded-lg py-1.5 text-xs font-medium ios-ease bg-white text-text-primary shadow-sm"
```

#### Input with Error
```tsx
className="... ring-red-500 focus:ring-red-500/20"
```

### Badges

#### Status Badge
```tsx
// Use the StatusBadge component from @/components/ui/status-badge
<SignupStatusBadge status="confirmed" />
<SignupStatusBadge status="waitlist" waitlistPosition={3} />
<SignupStatusBadge status="cancelled" />
```

#### Course Status Badge
```tsx
<CourseStatusBadge status="active" />
<CourseStatusBadge status="upcoming" />
<CourseStatusBadge status="draft" />
<CourseStatusBadge status="completed" />
```

#### Custom Badge
```tsx
className="rounded-full bg-surface px-3 py-1 text-xs font-bold uppercase tracking-wide text-text-primary shadow-sm"
```

### Status Indicators (Unified System)

Use the `<StatusIndicator>` component for all status, payment, and exception badges across the application.

**IMPORTANT**: This replaces ad-hoc badge implementations. Always use StatusIndicator for semantic states to ensure WCAG compliance and visual consistency.

#### Variants
- **success** - Confirmed signups, successful payments, active courses
- **warning** - Waitlist positions, pending payments, upcoming events
- **error** - Failed payments, cancelled signups, expired offers
- **neutral** - Completed courses, refunded payments, archived items
- **critical** - Exceptions requiring immediate attention (uses rounded-full for urgency)

#### Modes
- **badge** - Full background + border (default for tables, cards)
- **inline** - Subtle background (50% opacity), no border (secondary info like payment status)
- **text-icon** - Text + icon only, no background (exceptional states)

#### Sizes
- **xs** - Extra small (11px text, 2.5px icons)
- **sm** - Small (11px text, 3px icons) - **default**
- **md** - Medium (12px text, 3.5px icons)

#### Usage Examples

**Status badge in table:**
```tsx
import { StatusIndicator } from '@/components/ui/status-indicator';

<StatusIndicator variant="success" label="Påmeldt" />
```

**Payment badge (subtle, secondary):**
```tsx
<StatusIndicator variant="warning" mode="inline" label="Venter" />
```

**Exception badge (critical, with icon):**
```tsx
import { AlertTriangle } from 'lucide-react';

<StatusIndicator
  variant="critical"
  label="Betaling feilet"
  icon={AlertTriangle}
  ariaLabel="Krever oppmerksomhet: Betaling feilet"
/>
```

**Waitlist offer (with custom icon):**
```tsx
import { Send } from 'lucide-react';

<StatusIndicator
  variant="success"
  label="Tilbud sendt"
  icon={Send}
  size="sm"
/>
```

**Exception count badge:**
```tsx
<StatusIndicator
  variant="critical"
  count={3}
  label="krever oppmerksomhet"
  icon={AlertTriangle}
/>
```

#### Accessibility Requirements
- All critical states MUST include icons (never color-only)
- Use `ariaLabel` prop for screen reader context
- Decorative icons automatically get `aria-hidden="true"`
- Error/critical states use `role="alert"`, others use `role="status"`

#### Visual Styling
- Default: `rounded-md` (modern, calm SaaS style)
- Critical only: `rounded-full` (urgency signal through shape)
- Text: `text-xxs` (11px) for compact tables
- Icons: `h-3 w-3` for sm badges, `h-3.5 w-3.5` for md badges

#### When NOT to Use StatusIndicator
- Filter chips/tabs (use native button with pill styling)
- Course type dots (use colored dot with ring)
- Waitlist position numbers (use square badge)
- Generic informational pills (use custom badge patterns)

### List Items

#### Message Item
```tsx
<div className="group flex items-center gap-3.5 p-3 rounded-3xl hover:bg-gray-50 cursor-pointer transition-colors">
  <img className="h-10 w-10 rounded-full object-cover border border-border group-hover:border-ring" />
  <div>
    <p className="text-sm font-medium text-text-primary">Name</p>
    <p className="text-xs text-muted-foreground group-hover:text-text-secondary">Content</p>
  </div>
  <span className="text-tiny font-medium text-text-tertiary group-hover:text-muted-foreground">2m</span>
</div>
```
> **Note:** List items use `rounded-3xl` for consistency with card border-radius. Use `hover:bg-gray-50` for subtle hover state.

### Connection Indicators

#### Online Badge
```tsx
className="h-2.5 w-2.5 rounded-full bg-success ring-2 ring-white"
```

#### Pulsing Indicator
```tsx
className="h-1.5 w-1.5 rounded-full bg-success animate-pulse"
```

### Tables

#### Table Container
```tsx
className="h-full rounded-xl border border-border bg-white shadow-sm overflow-hidden flex flex-col"
```

#### Table Header Row
```tsx
className="flex items-center border-b border-border bg-surface/50 px-6 py-3"
```

#### Table Header Text
```tsx
className="text-xxs font-medium uppercase tracking-wide text-muted-foreground"
```
> **Note:** Use `font-medium` (not `font-semibold`) for table headers to maintain a calm, light aesthetic.

#### Sortable Header
```tsx
className="flex items-center gap-1.5 group text-xxs font-medium uppercase tracking-wide text-muted-foreground hover:text-text-primary transition-colors"
```

#### Table Row
```tsx
className="group hover:bg-secondary transition-colors"
```

#### Table Cell
```tsx
className="py-4 px-6"
```

#### Pagination Footer
```tsx
className="border-t border-border bg-surface/50 px-6 py-3 flex items-center justify-between"
```

#### Pagination Text
```tsx
className="text-tiny text-muted-foreground"
// Numbers highlighted with:
<span className="font-medium text-text-primary">0-10</span>
```

#### Pagination Buttons
```tsx
className="rounded-lg border border-border bg-white p-1.5 text-text-tertiary hover:border-ring hover:text-text-primary disabled:opacity-50 transition-all"
```

#### Table Empty State
```tsx
<div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white">
  <div className="mb-4 rounded-full bg-surface p-4 border border-surface-elevated">
    <Search className="h-8 w-8 text-text-tertiary stroke-[1.5]" />
  </div>
  <h3 className="font-geist text-sm font-medium text-text-primary">Ingen resultater</h3>
  <p className="mt-1 text-xs text-muted-foreground">Prøv å søke etter et annet navn</p>
</div>
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
- **Buttons**: `px-3 py-2` (compact), `px-5 py-2.5` (standard), `px-6 py-3` (large)
- **Table cells**: `py-4 px-6`
- **Table header/footer**: `px-6 py-3`

---

## Animations & Transitions

### Transition Utilities

| Class | Timing | Easing | Usage |
|-------|--------|--------|-------|
| `ios-ease` | 0.3s | `cubic-bezier(0.25, 1, 0.5, 1)` | Smooth, fluid animations (cards, modals) |
| `smooth-transition` | 0.2s | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Snappy UI interactions (buttons, hovers) |
| `transition-colors` | 0.15s | ease | Color changes only |
| `transition-all` | 0.15s | ease | All properties (Tailwind default) |

```tsx
// iOS-style - slower, more fluid (for larger elements)
className="ios-ease"

// Smooth transition - faster, snappier (for UI elements)
className="smooth-transition"

// Tailwind default
className="transition-colors"
```

> **When to use which:**
> - `smooth-transition` - Buttons, table rows, list items, hover states
> - `ios-ease` - Cards, modals, page transitions, larger movements
> - `transition-colors` - Simple color changes without size/position

### Hover Effects
| Effect | Class |
|--------|-------|
| Button scale | `hover:scale-[1.02] active:scale-[0.98]` |
| Card scale | `hover:scale-[1.005]` |
| Arrow translate | `hover:translate-x-1` |
| Chevron | `group-hover:translate-x-0.5` |

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
1. Use solid `border-border` (no dashed borders)
2. Gradient backgrounds: `bg-gradient-to-br from-white to-surface-elevated/50`
3. Soft blur decorations with `blur-2xl` or `blur-3xl`

### Pattern
```tsx
<div className="relative rounded-3xl border border-border bg-gradient-to-br from-white to-surface-elevated/50 p-6 shadow-sm overflow-hidden">
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

## Special Effects

### Grain Texture
```tsx
className="bg-grain opacity-[0.2] mix-blend-overlay"
```
Used on dark cards for texture.

### Glass Morphism
```tsx
className="backdrop-blur-md bg-white/10 border border-white/10"
```
Used for badges on dark backgrounds.

### Frosted Glass Footer
```tsx
className="p-6 border-t border-border bg-white/80 backdrop-blur-md z-10"
```
Used for sticky action bars at the bottom of forms/pages.

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
> Use `hover:bg-gray-50` for a clean tint effect instead of shadows or heavy fills.

---

## Course Type Colors

For schedule events and course type indicators:

| Type | Background | Ring | Hex |
|------|------------|------|-----|
| Private | `bg-course-private` | `ring-course-private-ring` | #FB923C |
| Online | `bg-course-online` | `ring-course-online-ring` | #A78BFA |
| Yin | `bg-course-yin` | `ring-course-yin-ring` | #547564 |
| Meditation | `bg-course-meditation` | `ring-course-meditation-ring` | #60A5FA |
| Vinyasa | `bg-course-vinyasa` | `ring-course-vinyasa-ring` | #F472B6 |
| Course Series | `bg-course-series` | `ring-course-series-ring` | #818CF8 |

**Usage pattern** for course type dots:
```tsx
<div className="h-2 w-2 rounded-full bg-course-private ring-2 ring-course-private-ring" />
```

---

## Norwegian Language Patterns

Standard UI text:
- **Buttons**: "Opprett", "Start time", "Se alle", "Hele uken", "I dag"
- **Labels**: "Neste time", "Kursrekke", "Denne uken", "Påmeldte"
- **Headers**: "Oversikt", "Meldinger", "Dine kurs", "Aktive studenter", "Oppmøte"
- **Empty states**: "Ingen planlagte kurs", "Ingen meldinger"
- **Greetings**: "God morgen", "God dag", "God kveld"

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

## Responsive Design

### Container Padding
- Small: `p-6`
- Large: `lg:p-12`

### Typography Responsive
- Use one step only: `text-3xl md:text-4xl`
- Keep consistent sizing in empty states

---

## Token → Hex Reference (for design tools)

When importing designs, map these hex values to tokens:

```
Gray Scale (Neutral UI):
#F9FAFB → bg-gray-50 / text-gray-50
#F3F4F6 → bg-gray-100 / text-gray-100
#E5E7EB → bg-gray-200 / border-gray-200
#D1D5DB → bg-gray-300 / border-gray-300
#9CA3AF → text-gray-400
#6B7280 → text-gray-500
#4B5563 → text-gray-600
#374151 → text-gray-700
#1F2937 → bg-gray-800
#111827 → bg-gray-900 / text-gray-900

Text (Semantic):
#111827 → text-text-primary (gray-900)
#374151 → text-sidebar-foreground (gray-700)
#4B5563 → text-text-secondary (gray-600)
#6B7280 → text-muted-foreground (gray-500)
#9CA3AF → text-text-tertiary (gray-400)

Backgrounds:
#F9FAFB → bg-surface (gray-50)
#F3F4F6 → bg-surface-elevated (gray-100)
#FFFFFF → bg-white
rgba(249,250,251,0.3) → bg-input-bg

Borders:
#E5E7EB → border-border (gray-200)
#D1D5DB → ring-ring / border-ring (gray-300)

Feedback:
#22C55E → bg-success / text-success
#F97316 → bg-warning / text-warning
#EF4444 → bg-destructive / text-destructive

Status Colors:
Confirmed (green): #f0fdf4 bg, #dcfce7 border, #15803d text
Waitlist (orange): #fff7ed bg, #ffedd5 border, #c2410c text
Cancelled (gray): #f3f4f6 bg, #e5e7eb border, #4b5563 text
Error (red): #fef2f2 bg, #fee2e2 border, #dc2626 text
Info (blue): #eff6ff bg, #dbeafe border, #1d4ed8 text

Shadows:
shadow-xs: 0 1px 2px rgba(0,0,0,0.02)
shadow-sm: 0 1px 2px rgba(0,0,0,0.05)
shadow: 0 1px 3px rgba(0,0,0,0.05)
shadow-md: 0 4px 6px rgba(0,0,0,0.05)
shadow-lg: 0 10px 15px rgba(0,0,0,0.05)
shadow-card: 0 1px 2px rgba(0,0,0,0.02)
```

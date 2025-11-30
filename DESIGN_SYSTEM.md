# Ease Design System

> **Important**: Always use design tokens (semantic class names) instead of hardcoded hex values. This ensures consistency and makes theme updates easier.

---

## Quick Reference: Design Tokens

### Text Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `text-text-primary` | #292524 | Headings, primary text, dark emphasis |
| `text-text-secondary` | #57534E | Body text, secondary content |
| `text-sidebar-foreground` | #44403C | Labels, form labels, sidebar text |
| `text-muted-foreground` | #78716C | Muted text, descriptions |
| `text-text-tertiary` | #A8A29E | Tertiary text, timestamps, placeholders |
| `text-primary` | #354F41 | Brand accent text |

### Background Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `bg-surface` | #FDFBF7 | Page background |
| `bg-surface-elevated` | #F5F5F4 | Cards, elevated surfaces |
| `bg-white` | #FFFFFF | Card backgrounds |
| `bg-primary` | #354F41 | Brand primary background |
| `bg-primary-dark` | #2A3D34 | Dark brand background |
| `bg-primary-accent` | #4A6959 | Active/accent elements |

### Border Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `border-border` | #E7E5E4 | Default borders |
| `ring-ring` | #D6D3D1 | Focus rings, hover borders |
| `border-ring` | #D6D3D1 | Hover state borders |

### Status Colors
| Status | Background | Border | Text |
|--------|------------|--------|------|
| Confirmed | `bg-status-confirmed-bg` | `border-status-confirmed-border` | `text-status-confirmed-text` |
| Waitlist | `bg-status-waitlist-bg` | `border-status-waitlist-border` | `text-status-waitlist-text` |
| Cancelled | `bg-status-cancelled-bg` | `border-status-cancelled-border` | `text-status-cancelled-text` |
| Error | `bg-status-error-bg` | `border-status-error-border` | `text-status-error-text` |

### Feedback Colors
| Token | Usage |
|-------|-------|
| `bg-success` / `text-success` | Success states (#16A34A) |
| `bg-warning` / `text-warning` | Warning states (#F59E0B) |
| `bg-destructive` / `text-destructive` | Error/destructive (#EF4444) |

---

## Typography Scale

### Font Sizes
| Class | Size | Usage |
|-------|------|-------|
| `text-xxs` | 10px | Tiny labels, timestamps, badges |
| `text-xs` | 12px | Small text, captions, metadata |
| `text-sm` | 14px | Body text, default |
| `text-base` | 16px | Base size |
| `text-lg` | 18px | Section headers |
| `text-xl` | 20px | Page subtitles |
| `text-2xl` | 24px | Large headings |
| `text-3xl` | 30px | Page titles |
| `text-4xl` | 36px | Hero titles |

### Font Weights
| Class | Weight | Usage |
|-------|--------|-------|
| `font-normal` | 400 | Body text |
| `font-medium` | 500 | Most text, titles, emphasis |
| `font-semibold` | 600 | Buttons, card headers |
| `font-bold` | 700 | Strong emphasis, badge labels |

### Font Family
- **Primary**: Geist Sans (loaded via CDN)
- **Class**: `font-geist` adds tighter letter-spacing (-0.02em)
- **Usage**: Apply `font-geist` to page titles and hero sections

---

## Typography Hierarchy

### Page Headers
```tsx
<p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2">
  Oversikt
</p>
<h1 className="font-geist text-3xl md:text-4xl font-medium tracking-tight text-text-primary">
  God morgen, Elena
</h1>
```

### Section Headers
```tsx
<h2 className="text-lg font-semibold text-text-primary">
  Section Title
</h2>
```

### Card Headers
```tsx
<h3 className="text-sm font-semibold text-text-primary">
  Card Title
</h3>
```

### Body Text
```tsx
<p className="text-sm text-text-secondary">
  Regular body text content.
</p>
```

### Muted/Secondary Text
```tsx
<span className="text-xs text-muted-foreground">
  Secondary information
</span>
```

### Tiny Labels
```tsx
<span className="text-xxs font-medium text-text-tertiary uppercase tracking-wide">
  Label
</span>
```

---

## Components

### Buttons

> **Note:** Action buttons use `rounded-lg` for a refined look. Only pills, badges, and segmented controls use `rounded-full`. Form buttons (in modals/pages) may use `rounded-xl`.

#### Primary Button (Dark) - Compact
```tsx
className="flex items-center gap-2 rounded-lg bg-text-primary border border-text-primary px-3 py-2 text-xs font-medium text-white shadow-md shadow-text-primary/10 hover:bg-sidebar-foreground hover:border-sidebar-foreground ios-ease"
```

#### Primary Button (Dark) - Standard
```tsx
className="flex items-center gap-2 rounded-xl bg-text-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-sidebar-foreground ios-ease active:scale-[0.98]"
```

#### Secondary/Outline Button - Compact (Soft hover)
```tsx
className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-xs font-medium text-text-secondary shadow-sm hover:bg-surface-elevated hover:text-text-primary ios-ease"
```

#### Secondary/Outline Button - Standard (Invert hover)
```tsx
className="flex items-center gap-2 rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-medium text-text-primary shadow-sm hover:bg-text-primary hover:text-white hover:border-text-primary ios-ease active:scale-[0.98]"
```

#### Ghost Button
```tsx
className="rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-surface-elevated hover:text-text-primary ios-ease"
```

#### Filter/Tab Pill (inside container)
```tsx
className="flex-1 rounded-full py-1.5 text-xs font-medium transition-all bg-white text-text-primary shadow-sm"
```

#### Filter Dropdown Button
```tsx
className="flex items-center gap-2 h-10 rounded-lg border border-border bg-white px-3 py-2 text-xs font-medium text-text-secondary shadow-sm whitespace-nowrap hover:bg-surface-elevated hover:text-text-primary ios-ease"
```

#### Icon Sizes in Buttons
| Button Size | Icon Size |
|-------------|-----------|
| Compact (text-xs) | `h-3.5 w-3.5` |
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
- `compact` - Refined smaller (h-10, px-3, text-xs, rounded-lg)
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

### Cards

#### Standard Card
```tsx
className="rounded-3xl border border-border bg-white p-6 shadow-sm ios-ease hover:border-ring hover:shadow-md"
```

#### Hero Card (Dark with Gradient)
```tsx
className="relative rounded-3xl bg-primary text-primary-foreground shadow-lg shadow-primary/10 ios-ease hover:shadow-xl hover:shadow-primary/20"
```
- Use grain overlay: `bg-grain opacity-[0.2] mix-blend-overlay`
- Glow effect: `h-80 w-80 rounded-full bg-white/10 blur-3xl`

### Form Inputs

#### Text Input
```tsx
className="block w-full rounded-xl border-0 py-2.5 px-3 text-text-primary shadow-sm ring-1 ring-inset ring-border placeholder:text-text-tertiary focus:ring-1 focus:ring-inset focus:ring-primary/20 text-sm bg-white ios-ease"
```

#### Search Input
```tsx
className="h-10 w-full rounded-xl border border-border bg-white pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:border-text-tertiary focus:outline-none focus:ring-1 focus:ring-text-tertiary ios-ease shadow-sm hover:border-ring"
```

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
className="rounded-full bg-surface px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary shadow-sm"
```

### List Items

#### Message Item
```tsx
<div className="group flex items-center gap-3.5 p-3 rounded-2xl hover:bg-surface cursor-pointer transition-colors">
  <img className="h-10 w-10 rounded-full object-cover border border-border group-hover:border-ring" />
  <div>
    <p className="text-sm font-medium text-text-primary">Name</p>
    <p className="text-xs text-muted-foreground group-hover:text-text-secondary">Content</p>
  </div>
  <span className="text-xxs font-medium text-text-tertiary group-hover:text-muted-foreground">2m</span>
</div>
```

### Status Indicators

#### Online Badge
```tsx
className="h-2.5 w-2.5 rounded-full bg-primary-accent ring-2 ring-white"
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
className="text-xxs font-semibold uppercase tracking-wide text-muted-foreground"
```

#### Sortable Header
```tsx
className="flex items-center gap-1.5 group text-xxs font-semibold uppercase tracking-wide text-muted-foreground hover:text-text-primary transition-colors"
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
className="text-xxs text-muted-foreground"
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

### iOS-style Easing
```tsx
className="ios-ease"
// Equivalent to: transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1)
```

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
  <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5 blur-2xl"></div>
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

---

## Course Type Colors

For schedule events and course type indicators:

| Type | Color Token |
|------|-------------|
| Private | `bg-course-private` (#FB923C) |
| Online | `bg-course-online` (#A78BFA) |
| Yin | `bg-course-yin` (#547564) |
| Meditation | `bg-course-meditation` (#60A5FA) |

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
Text:
#292524 → text-text-primary
#44403C → text-sidebar-foreground
#57534E → text-text-secondary
#78716C → text-muted-foreground
#A8A29E → text-text-tertiary

Backgrounds:
#FDFBF7 → bg-surface
#F5F5F4 → bg-surface-elevated
#FFFFFF → bg-white

Borders:
#E7E5E4 → border-border
#D6D3D1 → ring-ring / border-ring

Brand:
#354F41 → bg-primary / text-primary
#2A3D34 → bg-primary-dark
#4A6959 → bg-primary-accent
#547564 → bg-primary-soft

Feedback:
#16A34A → bg-success / text-success
#F59E0B → bg-warning / text-warning
#EF4444 → bg-destructive / text-destructive
```

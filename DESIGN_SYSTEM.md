# ZenStudio Design System

## Color Palette

### Exact Hex Codes
All colors should use these specific hex codes for consistency:

#### Primary Text
- **Darkest**: `#292524` (headings, primary text)
- **Dark**: `#44403C` (body text, default)
- **Medium**: `#57534E` (hover states)
- **Muted**: `#78716C` (secondary text)
- **Subtle**: `#A8A29E` (tertiary text, timestamps)

#### Borders & Backgrounds
- **Border Light**: `#F5F5F4` (very subtle borders)
- **Border Default**: `#E7E5E4` (default borders)
- **Border Hover**: `#D6D3D1` (hover borders)
- **Background Soft**: `#F7F5F2` (soft backgrounds)
- **Background Page**: `#FDFBF7` (page background)

#### Brand Colors
- **Primary Green**: `#354F41` (brand primary)
- **Primary Dark**: `#2F453B` (dark backgrounds)
- **Primary Soft**: `#4A6959` (accents, active elements)

#### Course Type Colors (with rings)
- **Private**: `bg-orange-300` with `ring-2 ring-orange-100`
- **Online**: `bg-purple-300` with `ring-2 ring-purple-100`
- **Yin**: `bg-[#4A6959]` with `ring-2 ring-[#4A6959]/20`
- **Meditation**: `bg-blue-300` with `ring-2 ring-blue-100`

## Typography Scale

### Page Headers
```tsx
// Main page title with "Oversikt" label above
<p className="text-xs font-semibold uppercase tracking-wider text-[#A8A29E] mb-2">Oversikt</p>
<h1 className="font-geist text-3xl md:text-4xl font-medium tracking-tight text-[#292524]">
  God morgen, Elena
</h1>
```

### Card Titles
- **Large Card Title**: `text-3xl md:text-4xl font-medium tracking-tight` (hero card with line break)
- **Card Stats**: `text-3xl font-medium tracking-tight`
- **Card Section Headers**: `text-sm font-semibold`

### Body Text
- **Primary**: `text-sm font-medium` (standard body text)
- **Secondary**: `text-xs font-medium` (secondary info)
- **Tiny**: `text-[10px] font-medium` (timestamps, small labels)

### Font Weights
- **Bold**: `font-bold` (badge labels - uppercase)
- **Semibold**: `font-semibold` (buttons, card headers)
- **Medium**: `font-medium` (most text, titles)
- **Normal**: `font-normal` (body text when needed)
- **Light**: `font-light` (separators)

## Components

### Buttons

#### Primary Button (Dark)
```tsx
className="group flex items-center gap-2 rounded-full bg-[#292524] px-5 py-2.5 text-sm font-medium text-[#F5F5F4] shadow-lg shadow-[#292524]/10 hover:bg-[#44403C] hover:shadow-[#292524]/20 hover:scale-[1.02] active:scale-[0.98] ios-ease ring-offset-2 focus:ring-2 ring-[#292524]"
```
- Text: `text-sm font-medium`
- Padding: `px-5 py-2.5`
- Icon: `h-4 w-4` with `transition-transform group-hover:rotate-90`

#### Secondary Button (Light)
```tsx
className="flex items-center gap-2 rounded-full border border-[#E7E5E4] bg-white px-4 py-2 text-xs font-medium text-[#78716C] hover:bg-[#F5F5F4] hover:scale-[1.02] active:scale-[0.98] ios-ease"
```
- Text: `text-xs font-medium`
- Padding: `px-4 py-2`

#### Tab Button (Active)
```tsx
className="text-xs font-medium text-[#292524] bg-[#F7F5F2] px-3 py-1.5 rounded-lg hover:bg-[#E7E5E4] transition-colors"
```

#### Tab Button (Inactive)
```tsx
className="text-xs font-medium text-[#A8A29E] hover:text-[#57534E] px-2 transition-colors"
```

### Cards

#### Standard Card
```tsx
className="rounded-3xl border border-[#E7E5E4] bg-white p-6 shadow-sm ios-ease hover:border-[#D6D3D1] hover:shadow-md"
```
- Height: `h-[168px]` for stats cards, `h-[360px]` for tall cards
- Padding: `p-6` (standard), `p-7` (courses list), `p-9` (hero card)

#### Hero Card (Dark with Gradient)
```tsx
className="group relative h-[360px] rounded-3xl bg-[#2F453B] text-[#F5F5F4] shadow-lg shadow-[#354F41]/10 ios-ease hover:shadow-xl hover:shadow-[#354F41]/20 hover:scale-[1.005] cursor-pointer border border-[#354F41]"
```
- Background gradient: `bg-gradient-to-br from-[#354F41] to-[#2F453B]`
- Grain overlay: `bg-grain opacity-[0.2] mix-blend-overlay`
- Glow effect: `h-80 w-80 rounded-full bg-[#F5F5F4]/10 blur-3xl`

### Badges

#### Primary Badge (Uppercase)
```tsx
className="rounded-full bg-[#FDFBF7] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#2F453B] shadow-sm"
```

#### Secondary Badge
```tsx
className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-md border border-white/10 text-[#F5F5F4]"
```

### List Items

#### Message Item
```tsx
<div className="group flex items-center gap-3.5 p-3 rounded-2xl hover:bg-[#F7F5F2] cursor-pointer transition-colors">
  <img className="h-10 w-10 rounded-full object-cover border border-[#E7E5E4] group-hover:border-[#D6D3D1]" />
  <div>
    <p className="text-sm font-medium text-[#292524]">Name</p>
    <p className="text-xs text-[#78716C] group-hover:text-[#57534E]">Content</p>
  </div>
  <span className="text-[10px] font-medium text-[#A8A29E] group-hover:text-[#78716C]">2m</span>
</div>
```

#### Course Item
```tsx
<div className="flex items-center group p-1 rounded-xl transition-colors">
  <div className="w-14 text-sm font-medium text-[#A8A29E] group-hover:text-[#78716C]">14:00</div>
  <div className="flex-1 rounded-xl border border-[#F5F5F4] bg-[#FDFBF7]/50 p-3.5 hover:bg-white hover:border-[#D6D3D1] hover:shadow-sm cursor-pointer group/card">
    <div className="flex items-center gap-3.5">
      <div className="h-2 w-2 rounded-full bg-orange-300 ring-2 ring-orange-100"></div>
      <span className="text-sm font-medium text-[#292524] group-hover/card:text-black">Title</span>
    </div>
  </div>
</div>
```

### Status Indicators

#### Online Badge
```tsx
className="h-2.5 w-2.5 rounded-full bg-[#4A6959] ring-2 ring-white"
```

#### Pulsing Indicator
```tsx
className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"
```

## Empty States

### Design Principles
1. **No dashed borders** - Use solid `border-[#E7E5E4]`
2. **Gradient backgrounds** - `bg-gradient-to-br from-white to-stone-50/50`
3. **Soft blur decorations** - Positioned absolutely with `blur-2xl` or `blur-3xl`
4. **Typography consistency**:
   - Title: `text-2xl font-medium tracking-tight text-stone-900`
   - Description: `text-sm text-stone-600`
   - Small text: `text-xs text-stone-500`

### Empty State Pattern
```tsx
<div className="relative rounded-3xl border border-stone-100 bg-gradient-to-br from-white to-stone-50/50 p-6 shadow-sm overflow-hidden">
  <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/5 blur-2xl"></div>
  <div className="relative z-10">
    <h2 className="text-2xl font-medium tracking-tight text-stone-900 mb-2">
      Klar til å planlegge din første time?
    </h2>
    <p className="text-sm text-stone-600">
      Opprett en yogaøkt og bygg din timeplan.
    </p>
  </div>
</div>
```

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
- **Buttons**: `px-4 py-2` (small), `px-5 py-2.5` (medium), `px-6 py-3` (large)

## Animations & Transitions

### iOS-style Easing
```css
.ios-ease {
  transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
}
```

### Hover Effects
- **Scale up**: `hover:scale-[1.02]` (buttons)
- **Scale down**: `active:scale-[0.98]` (active state)
- **Tiny scale**: `hover:scale-[1.005]` (cards)
- **Translate**: `hover:translate-x-1` (arrows), `group-hover/card:translate-x-0.5` (chevrons)

### Staggered Delays
For bar charts:
```tsx
className="delay-75" // First bar
className="delay-100" // Second bar
className="delay-150" // Third bar
// etc.
```

## Icons

### Icon Sizes
- **Tiny**: `h-3.5 w-3.5` (button icons)
- **Small**: `h-4 w-4` (standard icons)
- **Medium**: `h-5 w-5` (card icons, nav icons)
- **Large**: `h-6 w-6` (mobile menu)
- **Card avatar**: `h-10 w-10` (message avatars)

### Icon Colors
- **Muted**: `text-[#A8A29E]` with `group-hover:text-[#78716C]`
- **Light**: `text-[#D6D3D1]` with `group-hover:text-[#A8A29E]`

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

## Responsive Design

### Container Padding
- Small: `p-6`
- Large: `lg:p-12`

### Typography Responsive
- Use one step only: `text-3xl md:text-4xl`
- Avoid responsive sizing in empty states
- Keep consistent sizing for better alignment

## Special Effects

### Grain Texture
```css
.bg-grain {
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E");
}
```
- Used at `opacity-[0.2]` with `mix-blend-overlay` on dark cards

### Glass Morphism
```tsx
className="backdrop-blur-md bg-white/10 border border-white/10"
```
- Used for secondary badges on dark backgrounds

## Norwegian Language

Standard UI text patterns:
- **Buttons**: "Opprett", "Start time", "Se alle", "Hele uken", "I dag"
- **Labels**: "Neste time", "Kursrekke", "Denne uken", "Påmeldte"
- **Headers**: "Oversikt", "Meldinger", "Dine kurs", "Aktive studenter", "Oppmøte"
- **Empty states**: "Ingen planlagte kurs", "Ingen meldinger"
- **Greetings**: "God morgen", "God dag", "God kveld"

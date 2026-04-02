# Ease Design System

> This document is the source of truth for foundational UI decisions. New UI should follow these rules unless there is a deliberate product-specific exception.

---

## Font

**Family:** Geist Sans

---

## Typography

### Principles

- Use `Geist Sans` everywhere as the primary interface font.
- Use semantic typography classes instead of assembling text styles ad hoc.
- Body text uses `400`.
- Labels, buttons, nav items, and controls use `500`.
- Headings use `600`.
- Negative tracking is only for display and heading styles.
- Do not use italic text ever.

### Semantic Classes

- `type-display-1`: `56 / 60`, `600`, `-0.03em`
- `type-display-2`: `40 / 44`, `600`, `-0.025em`
- `type-heading-1`: `32 / 38`, `600`, `-0.02em`
- `type-heading-2`: `24 / 30`, `600`, `-0.015em`
- `type-heading-3`: `20 / 26`, `600`, `-0.01em`
- `type-title`: `18 / 24`, `500`, `-0.01em`
- `type-body-lg`: `16 / 24`, `400`, `0`
- `type-body`: `14 / 22`, `400`, `0`
- `type-body-sm`: `13 / 20`, `400`, `0`
- `type-label`: `14 / 18`, `500`, `0`
- `type-label-sm`: `13 / 16`, `500`, `0`
- `type-meta`: `12 / 16`, `500`, `0.02em`
- `type-eyebrow`: `11 / 16`, `600`, `0.06em`, uppercase

### Usage Map

- Page title: `type-heading-1`
- Section title: `type-heading-2`
- Card title: `type-title`
- Main readable content: `type-body`
- Supporting copy: `type-body-sm`
- Buttons, tabs, nav items, input text: `type-label`
- Dense controls and compact nav: `type-label-sm`
- Timestamps, helper meta, counts, badges: `type-meta`
- Small overlines/category labels: `type-eyebrow`

### Decision Rule

Choose typography by role, not by taste.

1. What is this text doing?
2. Is it content, structure, or control text?
3. How important is it in the hierarchy?
4. Does it need to be read, scanned, or glanced at?

Examples:

- Sidebar button: `type-label`
- Compact sidebar item: `type-label-sm`
- Empty state title: `type-title`
- Empty state description: `type-body-sm`
- Form label: `type-label-sm`
- Helper text: `type-meta` or `type-body-sm` depending on density
- Table header: `type-eyebrow` or `type-meta`

### Primitives Policy

Shadcn primitives in `src/components/ui` should stay generic but tuned.

- Primitives handle structure, spacing, states, accessibility, and neutral defaults.
- App pages and product components apply semantic typography.
- Do not force every primitive to depend on `type-*` classes directly.
- Keep typography meaning at the screen/component layer, not inside low-level building blocks.

Recommended primitive baseline:

- Buttons: close to `type-label`
- Inputs and textareas: close to `type-label`
- Compact menus/dropdowns: close to `type-label-sm`
- Tooltips and tiny utility copy: close to `type-meta`

Worth stronger customization:

- `sidebar`
- `calendar`
- `breadcrumb`

### Do / Don’t

- Do use semantic typography classes in app-level UI.
- Do keep headings tight and body text neutral.
- Do keep the number of one-off text styles low.
- Don’t compose random text sizes and weights unless there is a real exception.
- Don’t use negative tracking on small text.
- Don’t use italic text ever.

---

## Color

### Principles

- Use semantic color roles, not raw hex values, in app UI.
- Keep the number of tokens small.
- Prefer one token per job.
- Do not create near-duplicate tokens without a clear role difference.
- Brand color should feel restrained, not sprayed across the whole interface.

### Foundation Tokens

- `background`
  - Main app/page canvas
- `foreground`
  - Default readable text
- `surface`
  - Cards, panels, popovers, form shells
- `surface-muted`
  - Softer inset blocks, grouped sections, gentle contrast areas
- `border`
  - Default dividers and borders
- `ring`
  - Focus/selection ring
- `primary`
  - Branded action and selection color
- `primary-foreground`
  - Text/icons on primary
- `muted-foreground`
  - Supporting text, metadata, helper copy
- `success`
- `warning`
- `destructive`

### Sidebar Tokens

- `sidebar`
- `sidebar-foreground`
- `sidebar-primary`
- `sidebar-primary-foreground`
- `sidebar-accent`
- `sidebar-accent-foreground`
- `sidebar-border`
- `sidebar-ring`

### Compatibility Aliases

These still exist in `src/index.css` so shadcn-style primitives keep working:

- `card` -> `surface`
- `popover` -> `surface`
- `secondary` -> `surface-muted`
- `accent` -> `surface-muted`
- `muted` -> `surface-muted`

Do not treat those aliases as the main design language when writing app UI.

### Usage Map

- Page background: `background`
- Card or modal: `surface`
- Inset group / empty state shell / subtle block: `surface-muted`
- Main text: `foreground`
- Secondary text: `muted-foreground`
- Default divider/input border: `border`
- Focus outline: `ring`
- CTA / selected state / active accent: `primary`

### Decision Rule

Choose colors by role, not by what “looks nice” in the moment.

1. Is this the page canvas, a surface, or an inset surface?
2. Is this primary content text or supporting text?
3. Is this a structural border or an interactive state?
4. Is this a brand/action moment or just neutral UI?

Examples:

- Standard card: `surface`
- Muted card section: `surface-muted`
- Sidebar shell: `sidebar`
- Sidebar active item: `sidebar-accent`
- Helper copy: `muted-foreground`
- Primary CTA: `primary`

### Do / Don’t

- Do use token roles in app-level UI.
- Do use `surface` and `surface-muted` to build hierarchy.
- Do keep most of the app neutral and let `primary` do the emphasis.
- Don’t add extra neutral tokens unless the hierarchy truly needs them.
- Don’t use raw hex values for normal app UI.
- Don’t use `secondary`, `accent`, or `card` as your first mental model in app code. Those are compatibility aliases.

---

## Spacing And Radius

### Principles

- Use one shared spacing and radius foundation across dashboard/admin and public pages.
- Change density by usage, not by creating separate token systems.
- Keep the scale small and predictable.
- Default to calmer, roomier controls than old Shadcn defaults.

### Spacing Scale

- `4px`
  - micro spacing, icon/text gaps
- `8px`
  - tight control internals, compact rows
- `12px`
  - dense dashboard gaps, grouped metadata
- `16px`
  - default component padding and common gaps
- `24px`
  - card padding, section spacing
- `32px`
  - roomy public sections, larger grouped layouts
- `48px`
  - major public-page section spacing

### Radius Scale

- `6px`
  - controls, nav items, chips, small badges
- `8px`
  - cards, popovers, dropdowns, tables, standard surfaces
- `12px`
  - dialogs, large featured containers, larger shells
- `full`
  - circular and pill-specific elements only

### Density Rules

- Dashboard/admin UI
  - denser and more structured
  - prefer `12`, `16`, and `24`
- Public pages
  - more spacious and presentation-driven
  - prefer `16`, `24`, `32`, and `48`

### Primitive Baseline

- Buttons
  - default: `h-11 px-4`, `6px` radius
  - compact: `h-9 px-3`, `6px` radius
- Inputs and selects
  - `h-11 px-4`, `6px` radius
- Textareas
  - `px-4 py-3`, `6px` radius
- Cards, popovers, dropdown menus
  - `8px` radius
- Dialogs and larger modal shells
  - `12px` radius

---

## Interaction States

### Principles

- Keep interaction feedback restrained, fast, and useful.
- Do not use `transition-all`.
- State changes should explain interaction, not decorate it.
- High-frequency interactions should feel immediate, not animated for effect.
- Keep focus-visible behavior consistent across controls and navigation.

### State Rules

- `hover`
  - Use subtle background, border, or text shifts.
  - Avoid lift effects, shadow pops, or decorative motion.
- `active`
  - Use immediate pressed feedback.
  - Buttons may use a very small scale-down (`0.98` to `0.97`).
  - Avoid scale on list rows, nav items, and other high-frequency scanning UI.
- `selected`
  - Keep selected states calm but clear.
  - Prefer surface contrast and text emphasis over loud fills.
- `focus-visible`
  - Use the same ring language across buttons, fields, tabs, rows, and nav.
  - Focus should be keyboard-clear without looking noisy.
- `disabled`
  - Lower contrast and remove hover/press affordance.
  - Disabled elements should never pretend to be interactive.
- `loading`
  - Preserve layout and avoid jumps.
  - Use spinners only where explicit state feedback is needed.

### Timing And Motion

- Do not animate very frequent interactions just for polish.
- Default property targets:
  - `background-color`
  - `border-color`
  - `color`
  - `opacity`
  - `transform`
- Default durations:
  - `150ms` for hover/focus color changes
  - `120ms` for pressed feedback
- Default easing:
  - hover and color changes: `ease`
  - overlays entering/exiting: strong `ease-out`
  - on-screen movement: `ease-in-out`

### Component Guidance

- Buttons
  - Hover with subtle fill or border change.
  - Use tiny pressed feedback on primary and outline buttons.
- Inputs, textareas, selects
  - Hover with light border emphasis.
  - Focus should be the primary interaction state.
- Tabs
  - Selected state should do most of the work.
  - Hover should stay quiet.
- Sidebar and nav items
  - Use soft hover surfaces and calm selected states.
  - Avoid bouncy or noticeable motion.
- Clickable cards and list rows
  - Prefer muted surface shifts and focus rings.
  - Do not use card-lift behavior.

### Do / Don’t

- Do keep interaction feedback specific and restrained.
- Do use the same focus-visible ring pattern across the product.
- Do let selected states feel different from hover states.
- Don’t use `transition-all`.
- Don’t use large scale transforms or shadow jumps.
- Don’t animate high-frequency actions just because motion is available.

### Do / Don’t

- Do use `6px`, `8px`, and `12px` intentionally by role.
- Do keep dashboard spacing tighter than public-page spacing.
- Do let controls share one baseline rhythm.
- Don’t mix `rounded-md`, `rounded-lg`, `rounded-xl`, and `rounded-2xl` randomly.
- Don’t leave old Shadcn control defaults in place if they fight the system.

---

## Surface Basics

### Principles

- Define only the surface behaviors that survive layout changes.
- Do not lock the product into a specific dashboard composition too early.
- Default to a calm, restrained Scandinavian product feel.
- Use compact density only when it improves scanning.

### Surface Types

- `surface`
  - the default white app surface
  - cards, panels, table shells, split panes, settings blocks
- `surface-muted`
  - softer inset or grouped surface
  - summaries, filter groups, grouped metadata, empty-state shells, secondary blocks
- `surface-emphasis`
  - rare featured surface
  - only for intentional highlights, never as the default page language

### Density Modes

- `calm`
  - the default mode
  - more breathing room
  - better for overview pages, settings, onboarding, profile, and most public flows
- `compact`
  - opt-in mode
  - denser rows and tighter grouped data
  - better for tables, signups, schedules, and operational lists

### Section Header Pattern

Use a consistent section-header structure before content blocks:

- title
- optional supporting text
- optional action area
- predictable gap between header and content

The section header should not decide the page layout. It only gives the content block a stable rhythm.

### Usage Rules

- Default to `calm` at the page level.
- Opt into `compact` for operational subviews inside a page when scanning matters more than breathing room.
- Use `surface` for the primary content block.
- Use `surface-muted` inside surfaces before introducing a new outer container.
- Prefer one featured area per page at most.
- Secondary sections should usually be quieter and more list-like than the primary block.

### Do / Don’t

- Do keep most admin pages calm and practical.
- Do let operational tables and schedules become more compact when needed.
- Do use fewer, clearer containers instead of many competing cards.
- Don’t turn every block into a featured card.
- Don’t treat bento layouts as a system rule.
- Don’t invent new surface types without a clear structural role.

---

## Form Inputs

All form inputs use shared components: `<Input>`, `<Textarea>`, `<Select>`, `<Checkbox>`.

**Input styling:**
```
h-11, rounded-md, border border-input, bg-transparent, px-4
Focus: border-ring + ring-2 ring-ring/50
Hover: border-ring
Error: border-destructive + ring-destructive/20
Transition: ios-ease
```

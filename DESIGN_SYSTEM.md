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
- `type-heading-1`: `28 / 34`, `600`, `-0.02em`
- `type-heading-2`: `22 / 28`, `600`, `-0.015em`
- `type-heading-3`: `18 / 24`, `600`, `-0.01em`
- `type-title`: `17 / 22`, `500`, `-0.01em`
- `type-body-lg`: `16 / 24`, `400`, `0`
- `type-body`: `14 / 22`, `400`, `0`
- `type-body-sm`: `13 / 20`, `400`, `0`
- `type-label`: `14 / 18`, `500`, `0`
- `type-label-sm`: `13 / 16`, `500`, `0`
- `type-meta`: `12 / 16`, `500`, `0.02em`
- `type-eyebrow`: `11 / 16`, `600`, `0.06em`, uppercase

### Usage Map

- Page title: `type-heading-1`
- Large section heading: `type-heading-2`
- Operational section title: `type-title`
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
- Dashboard/page title: `type-heading-1`
- Large content section heading: `type-heading-2`
- Dashboard section title: `type-title`
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
- `border-strong`
  - Prominent structural edges where surfaces need clear separation — page container edges, card borders, elevated panels against a canvas
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
  - Sidebar background — the canvas that the page container sits on top of
- `sidebar-foreground`
  - Default sidebar text
- `sidebar-primary`
  - Branded action inside sidebar
- `sidebar-primary-foreground`
  - Text on sidebar primary
- `sidebar-accent`
  - Hover and selected state for sidebar items — visibly darker than the sidebar background
- `sidebar-accent-foreground`
  - Text on sidebar accent
- `sidebar-border`
  - Sidebar dividers
- `sidebar-ring`
  - Sidebar focus ring

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
- Form control (input, select, textarea, search): `background`
- Inset group / empty state shell / subtle block: `surface-muted`
- Main text: `foreground`
- Secondary text: `muted-foreground`
- Default divider: `border`
- Interactive control border (inputs, selects, search, filter tabs, outline buttons): `border-input`
- Card border / page container edge: `border-strong`
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
  - buttons, circular elements, and pill-shaped controls

### Density Rules

- Dashboard/admin UI
  - denser and more structured
  - prefer `12`, `16`, and `24`
- Public pages
  - more spacious and presentation-driven
  - prefer `16`, `24`, `32`, and `48`

### Primitive Baseline

- Buttons
  - default: `h-11 px-4`, `full` radius (pill)
  - compact: `h-9 px-3`, `full` radius (pill)
- Inputs, selects, search, and filter tabs
  - `h-9 px-4`, `8px` radius (`rounded-lg`)
  - All tool-row controls must share the same height and radius
- Textareas
  - `px-4 py-3`, `8px` radius (`rounded-lg`)
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

## Shadows

- All global shadow tokens (`shadow-xs` through `shadow-xl`) are currently set to `none`.
- Default to borderless, shadowless surfaces. Use `border-strong` for structural separation.
- Subtle custom shadows may be used sparingly for specific structural elements like the page container edge or card elevation when needed.

---

## Surface Basics

### Principles

- Define only the surface behaviors that survive layout changes.
- Do not lock the product into a specific dashboard composition too early.
- Default to a calm, restrained Scandinavian product feel.
- Use compact density only when it improves scanning.

### Surface Types

- `surface`
  - the default app surface (`surface`)
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

## Page Patterns

### Principles

- Page patterns should stay structural, not decorative.
- Reuse the same page-shell logic across admin views before inventing new layouts.
- Keep page patterns broad enough that content can evolve without rewriting the system.
- Let density change by page type, not by arbitrary styling.

### List Page

Use this for operational overview pages built around filtering, scanning, and sectioned lists.

Structure:

- page header
- tool row
- primary section
- secondary section when needed

Rules:

- The page header sets purpose and primary action.
- Search and filters belong in a dedicated tool row below the header.
- The primary section should contain the current or most important content set.
- Secondary sections should feel quieter than the primary section.

Examples:

- `CoursesPage`
- `SignupsPage`

### Split View

Use this for master-detail workflows where the user scans a list and works inside a selected detail pane.

Structure:

- page header
- contained split-view shell
- list pane
- detail pane

Rules:

- The split-view shell should be one clear surface, not many nested cards.
- The list pane should optimize for scanning and quick switching.
- The detail pane should hold the deeper context and action area.
- Empty states should stay inside the relevant pane, not break the overall layout.

Examples:

- `MessagesPage`

### Schedule View

Use this for calendar-driven pages where navigation and temporal context are part of the primary workflow.

Structure:

- page header
- contained schedule shell
- internal control bar
- calendar or schedule content area

Rules:

- Keep the page header outside the schedule shell.
- Put view-specific controls inside the schedule shell, close to the calendar content.
- Use compact density inside schedule content when scanning matters.
- Avoid turning the schedule page into a dashboard of unrelated cards.

Examples:

- `SchedulePage`

### Settings / Profile

Use this for settings, profile, and account-management flows.

Structure:

- page header
- stacked sections
- optional supporting copy per section
- one primary form or content surface per section

Rules:

- Default to calm density.
- Let supporting explanation sit outside or above the main surface when possible.
- Avoid mixing too many form sections into a single large container.
- Keep the page readable before making it compact.

Examples:

- `TeacherProfilePage`

### Detail With Tabs

Use this for deeper management pages where one entity has multiple subviews.

Structure:

- page header
- optional action row
- tab navigation
- tab content surface

Rules:

- The page header defines the entity and page-level actions.
- Tabs separate subviews, not page identity.
- Tab content should reuse the existing section and surface rules.
- Do not make every tab feel like a new page layout system.

Examples:

- `CourseDetailPage`

### Do / Don’t

- Do reuse existing page patterns before inventing a new one.
- Do let page type decide density and structure.
- Do keep page headers outside the main content surface.
- Don’t treat a one-off layout as a new system pattern too early.
- Don’t let every page solve header, filters, and sections differently.
- Don’t make internal tab content ignore the main surface rules.

---

## Data Display Patterns

### Principles

- Data-display patterns should optimize for scanning before decoration.
- Tooling, summaries, and rows should support the page pattern instead of competing with it.
- Use the smallest pattern that fits the job.
- Keep stats, tables, and list rows visually calm even when the content is operational.

### Tool Row

Use this for search, filters, segmented controls, and lightweight bulk actions.

Structure:

- search first
- filters second
- secondary actions last

Rules:

- Place the tool row directly below the page header.
- Keep the row in one clear band before the primary section.
- Prefer wrapping cleanly on smaller screens over squeezing controls too tightly.
- Do not split related search and filter controls into separate random blocks.

Examples:

- `CoursesPage`
- `SignupsPage`

### Stats Row

Use this for compact operational summaries near the top of a page or section.

Structure:

- short label
- strong value
- optional short supporting context

Rules:

- Keep stats compact and easy to compare.
- Use them for orientation, not storytelling.
- Avoid making every stat tile a featured card.
- Prefer one calm row of summaries over many isolated widgets.

Examples:

- dashboard summary blocks
- quick operational counts on overview pages

### Operational List

Use this for grouped rows, expandable rows, or admin lists where scanning matters more than rich layout.

Structure:

- list shell
- repeated rows
- optional grouped headers
- optional inline expansion

Rules:

- Rows should read clearly from title to metadata to status.
- Keep expansion content visually connected to the parent row.
- Use compact density inside the row while keeping the outer section calm.
- Prefer a single list surface over many small nested cards.

Examples:

- `CourseListView`
- `SignupGroup`
- dashboard list sections

### Table Shell

Use this when the content is truly tabular and benefits from aligned columns.

Structure:

- section header outside
- one table surface
- clear header row
- predictable body rows

Rules:

- Only use a table when column alignment improves scanning.
- Keep table chrome restrained.
- Use compact density inside rows, not around the whole page.
- Empty states and loading states should stay inside the table shell.

Examples:

- participant lists
- public course table

### Empty State

Use shared empty-state patterns instead of custom one-off placeholders.

Rules:

- Choose the density by context:
  - `default` for page-level empty states
  - `compact` for card and section-level empty states
  - `public` for external-facing flows
- Keep the hierarchy consistent: icon, title, body, action.
- Empty states should support the surrounding pattern, not reset it.

Examples:

- `EmptyState`
- `CoursesEmptyState`
- `SmartSignupsView` empty states

### Do / Don’t

- Do keep tool rows, stats, and lists subordinate to the page structure.
- Do use operational lists for scanning-heavy content before reaching for tables.
- Do keep empty states inside the shell they belong to.
- Don’t turn every summary into a standalone tile grid.
- Don’t use tables when a structured list communicates the content more clearly.
- Don’t break page rhythm by placing search, filters, and empty states in unrelated containers.

---

## Navigation Patterns

### Principles

- Navigation should orient the user before it decorates the UI.
- Use the smallest navigation pattern that matches the scope of the decision.
- Keep global, local, and contextual navigation clearly separated.
- Selected states should be calm, obvious, and structurally consistent.

### Sidebar Navigation

Use this for primary product navigation across the teacher/admin app shell.

Structure:

- app-level destinations
- optional grouped sections
- utility or account actions in the footer
- collapse toggle on same line as logo in the header

Layout:

- The sidebar token acts as the canvas. The main page surface (`background`) may sit on top with a distinct top-left corner, top offset, and `border-strong` edge to create a "paper on canvas" effect.
- When the sidebar is collapsed, the page surface can return to a flush, full-bleed layout with no extra framing.
- The collapse control belongs in the header area and should remain directly accessible in both expanded and collapsed states.

Typography:

- Section group labels: regular weight (`400`)
- Menu items: `font-medium` (`500`)
- Selected items do not get bolder text — selection is communicated only through `sidebar-accent` background

Rules:

- The sidebar owns product-level movement between major areas.
- Items should scan quickly and feel stable across pages.
- Keep labels short and clear.
- Do not overload the sidebar with page-level actions or temporary filters.

Examples:

- teacher app shell sidebar

### Tabs

Use this for sibling subviews inside one page or one entity.

Structure:

- tab list
- tab triggers
- tab content

Rules:

- Tabs switch subviews, not page identity.
- Keep tab labels short and parallel.
- Use tabs when the user stays in the same object or workflow.
- Do not use tabs where a separate page pattern would be clearer.

Examples:

- `CourseDetailPage`
- student dashboard tabs

### Filter Tabs

Use this for local content filtering inside a page section or operational view.

Structure:

- compact tab row
- filter options
- shared content region

Rules:

- Filter tabs change the view of the same content set.
- Keep them lightweight and subordinate to the page header.
- Prefer filter tabs over full navigation when the scope is local.
- Do not treat filter tabs as if they were primary navigation.

Examples:

- `CourseDetailPage` subview filters
- compact status or mode switching

### Breadcrumbs

Use this for hierarchical context only when the user benefits from seeing the parent path.

Rules:

- Breadcrumbs provide location, not primary navigation.
- Keep them quiet and secondary to the page header.
- Use them on deeper management pages, not simple top-level pages.
- Omit them when the path adds noise instead of clarity.

Examples:

- `CreateCoursePage`
- `CourseDetailPage`

### Contextual Actions

Use this for actions that belong to the current page, section, or selected item.

Rules:

- Page-level actions belong in the page header or tool row.
- Section-level actions belong near the relevant section header.
- Item-level actions belong inside the item or detail pane.
- Do not hide basic navigation inside action patterns.

Examples:

- page CTAs in headers
- section actions beside list headings
- row-level actions in detail tabs

### Do / Don’t

- Do use the sidebar for major product areas and tabs for sibling subviews.
- Do use filter tabs for local state changes inside the same page.
- Do keep breadcrumbs secondary and quiet.
- Don’t use tabs and breadcrumbs to solve the same problem.
- Don’t overload the sidebar with contextual actions.
- Don’t let local filters masquerade as global navigation.

---

## Feedback Patterns

### Principles

- Feedback should clarify state, not interrupt by default.
- Use the lightest pattern that communicates the issue or outcome.
- Keep success states quieter than error and warning states.
- Prefer inline or contextual feedback before reaching for global notifications.

### Inline Validation

Use this for field-specific problems, hints, and validation messages.

Rules:

- Keep the message directly tied to the relevant field.
- Show errors in place, below or adjacent to the control.
- Use calm helper text when there is no problem.
- Do not force the user to interpret a global error for a local field issue.

Examples:

- auth form fields
- image upload validation
- date picker validation

### Inline Status

Use this for row-level or item-level state inside lists, tables, cards, and schedule items.

Rules:

- Inline status should support scanning without dominating the row.
- Use badges or indicators for concise state, not explanatory paragraphs.
- Silence “healthy” states when density matters and exceptions are the focus.
- Keep exception states visible and consistent.

Examples:

- `PaymentBadge`
- `StatusBadge`
- `StatusIndicator`

### Error State

Use this when a section, pane, or page cannot load or complete its intended task.

Rules:

- Keep the error inside the shell it belongs to whenever possible.
- Provide a retry action when recovery is realistic.
- Use the shared error-state pattern instead of custom ad hoc warning blocks.
- Reserve stronger visual emphasis for blocking errors, not small warnings.

Examples:

- `ErrorState`
- schedule loading errors
- contained pane failures

### Toasts

Use this for transient system feedback after actions or async outcomes.

Rules:

- Use toasts for confirmation, completion, or unexpected failure that is not tied to one visible field.
- Keep toast copy short and specific.
- Do not rely on toasts for primary guidance or required instructions.
- Avoid stacking many toasts for one workflow.

Examples:

- OAuth/auth outcomes
- copy/share actions
- async completion feedback

### Alerts And Banners

Use this for important contextual feedback that should remain visible longer than a toast.

Rules:

- Use alerts inside the relevant page or form context.
- Use banners sparingly for broader page-level notices.
- Keep them informative and actionable.
- Do not turn every warning into a full-width banner.

Examples:

- blocking signup/auth errors
- setup-complete or onboarding notices

### Do / Don’t

- Do prefer inline and contextual feedback before global interruption.
- Do keep row-level statuses concise and scannable.
- Do use shared error and empty-state components.
- Don’t use a toast for every successful click.
- Don’t show loud success UI where silence is clearer.
- Don’t invent new feedback styles when a shared badge, alert, or error state already fits.

---

## Form Inputs

All form inputs use shared components: `<Input>`, `<Textarea>`, `<Select>`, `<Checkbox>`.

Use `surface` for:
- input fills
- select triggers
- date/time pickers
- upload and drop areas

Use `background` for:
- the page canvas
- only the rare controls that should intentionally disappear into the page

**Input styling:**
```
h-9, rounded-lg, border border-input, bg-surface, px-4
Focus: border-ring + ring-2 ring-ring/50
Hover: border-ring
Error: border-destructive + ring-destructive/20
Transition: ios-ease
```

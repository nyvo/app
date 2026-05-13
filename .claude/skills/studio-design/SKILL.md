---
name: studio-design
description: "This skill should be used when the user explicitly says 'Studio style', 'Studio design', '/studio-design', or directly asks to use/apply the Studio design system. NEVER trigger automatically for generic UI or design tasks."
version: 1.0.0
allowed-tools: [Read, Write, Edit, Glob, Grep]
---

# Studio Design Language

Airy, calm wellness. Geist on warm sand. Black primary, strictly monochrome — only status colors (success / warning / danger) introduce chroma, and even then sparingly. The dashboard isn't data-heavy and shouldn't feel like one.

The single source of truth is `design-model.yaml`. Token references in this file follow the model. If something isn't in the model, it isn't in the system.

---

## 0. Workflow — read the right file for the task

**Before generating anything, read the matching reference. This is required, not optional. The user shouldn't have to ask.**

| If the task involves… | Read this file FIRST |
|----------------------|---------------------|
| **Building any screen, page, or layout** (dashboard, listing, form, settings, detail view) | `references/patterns.md` — pick the right layout pattern before writing markup. Most layout decisions are pattern decisions. |
| **Adding or modifying a primitive** (button, card, KPI tile, input, suffix input, date picker, time picker, select, textarea, checkbox/radio, phone, search input, file upload, badge, sidebar nav, course card, status pill, avatar, tabs, segmented control, page state shell, form field group, **pricing display**) | `references/components.md` |
| **Form validation / field errors / aria-invalid / validation timing** | `references/patterns.md` § 13.2 + § 13.3 + `references/components.md` (Form field group + Input states) |
| **Placeholder text rules / when to use a placeholder / placeholder color** | `references/components.md` (Input → "Placeholder text — rules"). Default = no placeholder; allowed only for format examples (email format, manual date entry without picker), search scope (`Søk i kurs…`), or textarea instructions. **Phone is NOT an exception** — never use `9xx xx xxx`; the auto-format mask conveys shape on first keystroke. Color must be `text-foreground-muted` (sand-11), NOT `text-foreground-disabled` (sand-8 fails WCAG 1.4.3). |
| **Section error with retry / "couldn't load this card"** | `references/patterns.md` § 13.4 |
| **404 / 500 / permission denied / page-loading skeleton** | `references/patterns.md` § 13.5 + `references/components.md` (Page state shell) |
| **Date / time / duration form fields (admin-side, course creation, scheduling)** | `references/patterns.md` § 14 + `references/components.md` (DateField, TimeField, DurationField + Date picker / Time picker / Date+time combo). Mobile date picker: Vaul drawer with Calendar, not a popover. |
| **Pricing display, currency formatting, discount strikethrough, fee breakdown, subscription tiers** | `references/components.md` (Pricing display). Always `formatKroner()`. EU Omnibus / FTC May-2025 fee transparency rules apply. |
| **Drawer / detail panel (click row → quick view)** | `references/patterns.md` § 15 + `references/components.md` (Drawer). **Quick-glance only**: read-only body, ≤2 sections, ≤8 fields (and only in a quick-create drawer). Footer is one ghost link: `Åpne <ressurs>-side →` that navigates to `/resource/:id`. **No drawer-from-drawer.** Editing is a page concern. shadcn `<Sheet>` 480px on desktop; Vaul `<Drawer>` bottom sheet on mobile. |
| **Multi-step form / wizard / "Create X" flow** | `references/patterns.md` § 16. **Studio does NOT use wizards.** Use a sectioned form (in drawer or page) instead. Onboarding uses a setup checklist page (3-5 items, time estimates, first-value emphasis). Vendor flows (Stripe, Dintero) embed the vendor's own UI. See `references/components.md` (Sectioned form, Setup checklist). |
| **Onboarding / setup checklist / first-time experience / empty-states-as-onboarding** | `references/components.md` (Setup checklist). 3-5 items max, time estimate per row, first-value task highlighted, empty states ARE the onboarding surface. |
| **Page layout / max-width / responsiveness / ultrawide / page header / breadcrumbs** | `references/patterns.md` § 17. Every page → `mx-auto max-w-6xl` (centered, 1152px outer, ~1088px content with `lg:px-8`). Padding: `px-4 sm:px-6 lg:px-8`. Sidebar appears at `lg` (1024px). Sidebar width 256px. Never stretch content past max-width on ultrawide. |
| **Course detail page (public, customer-facing)** | `references/patterns.md` § 18. **Exception to the public max-width rule** — uses `max-w-6xl` for the main + 380px BookingPanel rail. Sticky rail on desktop. MobilePriceBar fixed bottom on mobile. |
| **Customer booking flow / payment / checkout / confirmation page** | `references/patterns.md` § 19. Single-page (not wizard). Guest checkout always. Embedded payment (Dintero/Stripe Elements). Vipps + card. Service fee inline. Form fields ≤ 6. Email = receipt. |
| **Customer account / "my bookings" / cancel booking / customer profile** | `references/patterns.md` § 23. Two surfaces (`Mine påmeldinger` + `Profil`), no more. `max-w-3xl` centered, no sidebar (avatar menu in PublicNav). Self-service cancel with policy stated plainly inline (never link out). Single `.ics` download for add-to-calendar. No streaks, no upsells, no "rate this." |
| **Authentication / sign-in / sign-up / forgot password / passkey** | `references/patterns.md` § 21. Login universal — role decided in onboarding step (§ 21.3a), not at the form. Magic link primary. Vipps + Google SSO. NIST length-over-complexity (12+, no composition rules). No confirm-password field. Identifier-first. |
| **Schedule / timeplan view (teacher's "what's coming up" view)** | `references/patterns.md` § 22. **Day-grouped card list, NOT a calendar grid.** Cards are bordered + monochrome — no pop tints. Type label as text on every card (WCAG 1.4.1). |
| **Search / list filter / autocomplete** | `references/patterns.md` § 20. List filter is the primary pattern. **No global cmd+k palette.** Diacritic + case-insensitive matching mandatory for Norwegian names. |
| **Loading / pending / empty / toast / destructive-action patterns** | `references/patterns.md` § 6 (empty), § 10 (loading nuances — skeleton flash threshold, stale-while-revalidate, threshold gradient, optimistic), § 11 (toast — Sonner unstyled, 3 variants, bottom-center), § 12 (destructive — undo first, confirm only when needed). |
| **Destructive confirmation dialogs (delete, refund, terminate)** | `references/patterns.md` § 12 + `references/components.md` (Confirmation dialog). Three tiers: toast+undo (default), standard confirm dialog (when undo isn't enough), type-to-confirm (catastrophic). Use shadcn `<AlertDialog>`. No visible title (aria-label only). Compound headline above scope card. |
| **Choosing a color, font size, spacing, radius, motion duration** | `references/tokens.md` |
| **Wiring up CSS / Tailwind / SwiftUI** (config files, `:root`, design tokens) | `references/platform-mapping.md` |

**Routing rules:**
- A screen task = patterns + components + tokens (read in that order). Layout decisions come first.
- A component task = components + tokens.
- A theming task = tokens + platform-mapping.
- Never write markup or CSS for a Studio screen without reading the relevant reference. The references are not optional supplements — they ARE the system.

When in doubt, read all four. The cost is small; the cost of generating off-system UI is large.

---

## 1. Philosophy

Studio is built on four convictions.

**Calm beats clever.** No mesh gradients, no glowing orbs, no glassmorphism. The page is pure white. Hierarchy comes from typography and spacing first — cards and borders are reached for only when there's a real reason to group content (KPI tiles, modals, course cards, occasional callouts). Depth comes from honest borders when borders are needed; from spacing when they aren't.

**Restraint reads as care.** Three weights (400 / 500 / 600). No `font-bold`. No uppercase tracked labels. No `font-mono` token. Six neutral tokens carry the entire system; three pastel tints exist only to keep course content from blending together. Banned values exist on purpose — `p-5`, `p-7`, `space-y-5`, `space-y-7`, `space-y-9` are temptations to hand-tune, and hand-tuning fails as the system grows.

**Surface dictates rhythm.** The dashboard runs at 14px body and caps at `text-3xl` (30px). The public/booking surface runs at 16px body and unlocks `text-5xl` (48px) for one hero per page. Same canonical scale; different usage map. Display tops out at 48px — no 60px or 72px hero text in this system. Restraint over spectacle, after Time2book's "measured boldness".

**Designed for everyone, not power users.** The audience is yoga teachers, small studio owners, and operators without technical backgrounds. They open the app to do *one thing* — see what's happening today, confirm a signup, message a student, create a course. Studio screens optimize for *that one thing*, not for a hypothetical power user who manages 50 studios. Density is the enemy. Long data tables, faceted filters, customizable dashboards, bulk-action toolbars — all banned by default. See `references/patterns.md` for the eight UX patterns this conviction produces (Today hero, card grid, detail drawer, multi-step wizard, tabs to slice, empty state with action, inline help, single opinionated layout).

---

## 2. Craft Rules

### Visual hierarchy layers

| Layer | What sits here | Token |
|-------|----------------|-------|
| Page canvas | The unscrolled background | `bg-background` (white) |
| Surface | Cards when used deliberately — KPI tiles, modals, course cards | `bg-surface` (white) + `border` (sand-6) |
| Elevated overlay | Dialogs, popovers, sheets | `bg-surface` + `shadow-sm` + `rounded-xl` (12px) |
| Foreground | Headings, body, primary text | `text-foreground` (sand-12) |
| Muted | Descriptions, form labels, secondary text | `text-foreground-muted` (sand-11) |
| Disabled | Bullet separators, very-muted meta | `text-foreground-disabled` (sand-8) |

**`--background` and `--surface` share the value `#ffffff`** in light mode. They differ in role: background is the page canvas, surface is what cards sit on. The same hex; different intent. In a future dark mode they would diverge.

### Typography discipline (font budget per screen)

- **Three weights, hard cap.** 400 for body, 500 for UI labels and chip text, 600 for every heading. No 700 anywhere. If something needs more emphasis, step up the size — don't reach for weight.
- **One family.** Geist. Body, headings, KPI values, identifiers, prices, time slots. There is no monospace token. For numeric alignment in rows, add `tabular-nums`; Geist supports it natively.
- **Sentence case at small sizes.** Captions, KPI labels, table headers, chip text → `text-xs font-medium text-foreground-muted`. Never `uppercase tracking-wider`. Never.

### Spacing semantics

Use the canonical scale only — `1, 2, 3, 4, 6, 8, 10, 12, 16` (all multiples of 4px). Banned: `p-5`, `p-7`, `space-y-5`, `space-y-7`, `space-y-9`, `space-y-11`. If 4 (16px) feels too tight and 6 (24px) feels too loose, the design tier is wrong, not the gap.

**Default to airy.** `p-6` is the default card padding (24px). `space-y-6` is the default vertical rhythm between cards. `space-y-8` between major page sections on dashboard. Use `p-4` only inside dense lists; use `p-3` only for compact mini-panels. The dashboard isn't data-heavy — give content room to breathe.

### Color strategy

- **Monochrome by default.** Every card and surface is sand-only. Status colors (`success` / `warning` / `danger`) are the only chromatic exception, and they're signal, not decoration. Studio has no chromatic accent palette — no sky / mint / iris pop tints.
- **Status is silent on success.** A "paid" payment doesn't need a green pill on every row. Use `<PaymentBadge visibility="exceptions">` and let the absence read as success.
- **Never raw Tailwind color utilities.** `bg-green-100`, `text-red-500`, `text-amber-700` are forbidden — use the semantic token (`bg-success-subtle`, `text-danger`). The token is the contract.

### Composition approach

- **Cards are deliberate, not default.** Don't wrap every section in `<Card>`. Start with a heading + content directly on the white canvas. Reach for a card when you need explicit grouping — KPI tiles, modals/dialogs, course-card pop, pricing callouts, occasional grouped form sections. If you can't articulate why a section needs a card, it doesn't.
- **Hierarchy ladder when not using cards:** typography → spacing → horizontal divider → finally a border or card. Reach for the leftmost tool that works.
- **Border, not shadow.** When a `<Card>` is used, it's `bg-surface border border-border rounded-lg`. Shadow only appears on overlays that genuinely float (dialogs, popovers, hover-tooltips).
- **Buttons pill, inputs don't.** Every button (primary, secondary, ghost, destructive) is `rounded-full`. Inputs stay `rounded-md` (6px). The shape difference is intentional — buttons are committed actions, inputs are containers for text. Cards `rounded-lg` (8px). Dialogs `rounded-xl` (12px). No `rounded-[Npx]` arbitrary values.
- **Course cards have no underline on the title** even when the whole card is an `<a>`. The card itself is the affordance — `text-decoration: none` on the link.
- **Dashboard and sidebar are both white**, separated by a 1px `border` divider. Sidebar nav-item states: rest = no chrome + muted text; hover = `bg-muted` + foreground text; selected = `bg-active` + foreground text + medium weight. The delta between hover (sand-3) and selected (sand-4) is small but distinguishable.
- **Primary buttons don't shift on hover.** Sand-12 is already near-black; an opacity hover adds noise instead of feedback. Visual feedback lives on secondary/ghost variants (`hover:bg-muted`).
- **Whole-card-clickable tiles deepen the ring on hover.** Don't swap fill on hover — that fights with the page rhythm. Add `ring-1 ring-border/0 → ring-border` on hover.

### The squint test

Squint at any view in Studio. You should see three things and only three things: the white page, the occasional bordered card surface, and sand-12 text. Status pills (success / warning / danger) are the only chromatic exceptions, and they appear sparingly. If you see four visual layers, there's a hierarchy bug.

### The 3-second test

Look at any screen for 3 seconds. Can you tell what the user is supposed to do next? If not, the hierarchy is wrong — too many competing primary actions, or none clear enough. One obvious primary per screen.

### Layout discipline (non-power-user defaults)

Six rules read every screen against, in order. If a screen breaks any, fix it before shipping.

1. **One obvious primary action.** Three-second test. If the user can't tell what to do, the page has too much competing weight.
2. **Three things, max.** Three sections, three KPIs, three tabs, three above-the-fold items. More than three and the eye gives up.
3. **Drawer over page.** Every "click → new page" is a chance to use a drawer (Notion pattern) instead. Pages should be reserved for genuinely new contexts, not detail views of existing items.
4. **Sectioned form over wizard.** Every long form is a chance to group fields into sections divided by spacing, headings, and dividers — never multi-step wizards (see § 16). Sections are scannable and let the user see the whole shape of the work; wizards hide it.
5. **Card over row.** Every list of items is a chance to be a card grid instead — especially when there are fewer than 30 items.
6. **Empty state over blank.** Every list that can be empty needs an empty state with a primary action — what is this, why does it matter, what do I do next.

Full pattern catalog: `references/patterns.md`.

---

## 3. Anti-patterns

These are bans. Every one of them ships in generic AI-generated UIs and breaks the system.

- **No `font-bold` (700).** Anywhere. Reads marketing-heavy at dashboard sizes. Hierarchy comes from size, not weight.
- **No uppercase tracked labels.** `uppercase tracking-wider` on KPI labels, table headers, eyebrow text — banned. Use `text-xs font-medium text-foreground-muted` sentence case instead. This is what shadcn, Vercel, Linear, and Notion all do in 2026.
- **No `font-mono`.** Studio has no monospace token. For tabular alignment, use `tabular-nums` on Geist sans.
- **No raw Tailwind color utilities.** `bg-green-100`, `text-red-700`, `text-blue-500` — banned. Use semantic tokens (`bg-success-subtle`, `text-danger`, `bg-muted`).
- **No `p-5`, `p-7`, `space-y-5`, `space-y-7`, `space-y-9`.** Hand-tuning temptation. Pick a tier and live with it.
- **No `rounded-[Npx]` arbitrary values.** Always use the four named tokens.
- **No shadow on plain cards.** Cards use `border`, not `shadow`. Shadow is reserved for things that genuinely float (dialogs, popovers).
- **No `opacity-50` on inactive items.** Use `bg-muted/50 text-foreground-muted` to dim — opacity reads as a loading skeleton and breaks contrast for screen readers.
- **No rect buttons.** Every button is a pill. There is no rect button variant in the system.
- **No icons in text-bearing buttons.** Leading icons (`<Plus> Opprett kurs`), trailing icons (`Lagre <ArrowRight>`, `Åpne kursside →`), and decorative chevrons/sparkles next to a label are banned across every variant (primary, secondary, outline, ghost, destructive, link). The label is the action — adding an icon doubles the signal, fragments the calm typographic surface, and reads as generic SaaS template. **Carve-outs:** (1) icon-only buttons where the icon IS the button (close `×`, kebab menu, sidebar nav-rail items) — `aria-label` required; (2) `Loader2` spinner that *replaces* the label during in-flight async actions; (3) form-input-shaped triggers (date picker, time picker, select) where the chevron/calendar signals the field type, not an action. Everything else: text only.
- **No chromatic pop tints on course cards or schedule entries.** Studio is monochrome — use a bordered sand card. Type/format gets a text label, not a colored fill.
- **No underlines on course-card titles.** Even when the whole card is an `<a>`. The card itself is the affordance.
- **No hover fill change on primary buttons.** Sand-12 hover-darkened reads as noise, not feedback.
- **No `<Card>` wrapping every section by default.** If a heading + content + spacing is enough to communicate hierarchy, use that. Cards are for explicit grouping, not for visual organization-by-rote.
- **No persistent system alerts.** Studio has no banner system, no sidebar attention dots, no notifications inbox. If the user needs to know something is broken, state it in plain prose on the page where they'd fix it — not as an alarm box, not as a count badge in the nav, not as a top-of-app banner. Transient feedback uses toasts (§11); errors that block a flow use inline form/page state.
- **No wizards. No step indicators. No Back/Next button progression.** Studio replaces wizards with sectioned forms (in drawer or page) + setup checklists for onboarding + embedded vendor UIs for compliance. See `patterns.md` § 16.
- **No inconsistent max-widths across dashboard pages.** Every page (dashboard and public) uses `mx-auto max-w-6xl`. Don't mix `max-w-4xl` / `max-w-6xl` / `max-w-6xl` across pages — content jumps between routes, which reads as broken layout. Narrower inner blocks (centered auth at `max-w-md`, long-form prose at `max-w-3xl`) are still allowed, but the page shell is always 5xl centered.
- **No stretching content past max-width to fill ultrawide screens.** Cards become too wide, line-lengths exceed readable range. Embrace the empty space on ultrawide.
- **No sidebar on public/booking pages.** Public surfaces are sidebar-less. Adding nav chrome there muddies the public/private distinction.
- **No KPI walls.** A row of 6–8 KPI tiles is a power-user pattern. Studio screens have one "today" hero card and 2–3 quiet supporters. If you need to show more metrics, they belong in a deep-dive view, not the primary dashboard.
- **No long data tables on browse pages.** If users will scan it, use a card grid. Tables are for genuine comparison/sort use cases. Default to cards.
- **No "click row → new page" for detail views.** Use a drawer. Users keep the list visible; no navigation overhead.
- **No filter UIs as the primary slicer.** Use 3–4 tabs ("Upcoming · Today · Past") instead. Most users never use filters; tabs make the slices visible.
- **No customizable dashboards.** One opinionated layout. Users open the app and see what you intended.
- **No dot-glue between different subjects.** `3 klasser · 32 påmeldte` is two different facts pretending to be one statement. Dot separators are for *attributes of one subject* (`kl. 18:00 · Sal 1`), not for joining unrelated facts. Group by subject, give each subject its own block with eyebrow → hero → support hierarchy. See `references/patterns.md` § 9.
- **No multi-line subtitles with multiple dots.** `Første: Vinyasa Flow · kl. 18:00 · 12 av 14 plasser` crams a name, a time, and a capacity ratio into one horizontal soup. That's three different aspects, not one. Break them apart vertically. Use natural language (`Først kl. 18:00 i Sal 1`) when a connector reads better than a dot.
- **No 14px body on the public/booking surface.** Public is 16px. The 14px body is the dashboard's signature.
- **No "TRUSTED BY" eyebrow labels.** That's marketing-template kitsch. If you need a section preface, use sentence case at `text-sm`.
- **No colored-dot eyebrow labels.** The "● Brand Name · Location" pattern (small dot + accent-colored text above a hero) is generic SaaS theater. Lead with the headline. If brand or location matters, put it in the header nav, not floating above the h1.
- **No initials as image placeholder.** When a user/participant doesn't have an avatar image, render a neutral User icon (silhouette or `UserCircleIcon`) inside `bg-muted text-foreground-muted` — never initials. Reasons: (1) hash-based per-user tints fragment the calm palette and add chromatic noise; (2) reading initials adds cognitive load when scanning lists; (3) the User icon reads as "anonymous user" cleanly without imposing identity. The `<UserAvatar>` primitive uses this fallback by default — use the primitive, don't hand-roll initial avatars.
- **No eyebrow labels above content that already speaks for itself.** Eyebrows are for *disambiguating peer items at the same level* (e.g., metadata fields stacked in a drawer body — `Dato / Metode / Beløp` makes sense because each value is different and similar in shape). They are NOT for labeling things the surrounding context already names. Examples that should be removed: `Med` above an instructor avatar + name (the avatar IS "with this person"); `Påmeldt til` above the booked-course title on a confirmation page where the page heading is `Du er påmeldt`; `I dag` above an h2 that says `3 klasser i dag`. The principle: if the eyebrow repeats a word in the value below, or labels something the title/heading/structure already conveys, drop it.

---

## 4. Workflow

When using this skill on a real component or page:

1. **Identify the surface from the file path.** `pages/teacher/**` and `components/teacher/**` are dashboard (14px body, no display tier, max heading is `text-3xl`). `pages/public/**` and `components/public/**` are public (16px body, display tier unlocked).
2. **Read `design-model.yaml`** to get the exact token values. Never hardcode hex.
3. **Pick the tier, not the value.** Decide "card padding default" (`p-6`) before picking 24px.
4. **Squint test before commit.** Four visual layers, max.
5. **Run against the anti-patterns list.** If you see any of the bans, fix them before shipping.

---

## 5. Token references

- Full token reference → `references/tokens.md`
- Component patterns (button, card, input, badge, status) → `references/components.md`
- **Layout & UX patterns (Today hero, card grid, drawer, wizard, tabs, empty states, inline help, single layout)** → `references/patterns.md`
- CSS variable + Tailwind config drop-in → `references/platform-mapping.md`
- Visual preview → `preview.html` (open in browser)

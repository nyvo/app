---
name: studio-design
description: "This skill should be used when the user explicitly says 'Studio style', 'Studio design', '/studio-design', or directly asks to use/apply the Studio design system. NEVER trigger automatically for generic UI or design tasks."
version: 1.0.0
allowed-tools: [Read, Write, Edit, Glob, Grep]
---

# Studio Design Language

> **SUPERSEDED COLOR MODEL** — this document predates the current system. Authoritative: `src/index.css` (+ CLAUDE.md §Design tokens). Current reality: pure-neutral grey (chroma 0) neutrals, periwinkle primary `oklch(0.540 0.150 274)`, WHITE sidebar rail, beige as the one warm accent, ring = foreground. Any sand-\*/Slate/indigo/dark-sidebar/monochrome-primary guidance below is historical — do not apply. Layout, spacing, and craft rules remain valid unless they contradict `src/index.css` or newer primitives (e.g. SettingsRows for settings pages; the primary-tinted FramedCard on course Oversikt is sanctioned).

Airy, calm wellness. Geist on warm sand. Black primary, strictly monochrome — only status colors (success / warning / danger) introduce chroma, and even then sparingly. The dashboard isn't data-heavy and shouldn't feel like one.

The single source of truth is `design-model.yaml`. Token references in this file follow the model. If something isn't in the model, it isn't in the system.

---

## 0. Workflow — read the right file for the task

**Before generating anything, read the matching reference. This is required, not optional. The user shouldn't have to ask.**

| If the task involves… | Read this file FIRST |
|----------------------|---------------------|
| **Building any screen, page, or layout** | `patterns.md` — pick the layout pattern before writing markup |
| **Adding or modifying a primitive** (button, card, input, dialog, drawer, toast, etc.) | `components.md` |
| **Form validation, field errors, validation timing** | `patterns.md` § 13.2–13.3 + `components.md` (Form field group, Input) |
| **Placeholder text rules** | `components.md` (Input → Placeholder rules) |
| **Section / page error states, retry, 404 / 500 / loading skeleton** | `patterns.md` § 13.4–13.5 + `components.md` (Page state shell) |
| **Date / time / duration fields (admin)** | `patterns.md` § 14 + `components.md` (DateField, TimeField, DurationField) |
| **Pricing display, currency, fee breakdown, subscription tiers** | `components.md` (Pricing display) |
| **Drawer / detail panel for clickable rows** | `patterns.md` § 15 + `components.md` (Drawer) |
| **Long forms, "Create X" flows** | `patterns.md` § 16 — **no wizards**, use sectioned form / drawer / setup checklist |
| **Onboarding / setup checklist / first-run** | `components.md` (Setup checklist) + `patterns.md` § 16.3 |
| **Page layout, max-width, responsiveness, ultrawide** | `patterns.md` § 17 — single outer shell `mx-auto max-w-6xl` for every page |
| **Course detail page (public)** | `patterns.md` § 18 |
| **Customer booking flow / checkout / confirmation** | `patterns.md` § 19 |
| **Customer account (`Mine påmeldinger`, profile)** | `patterns.md` § 23 |
| **Authentication / sign-in / sign-up / passkey** | `patterns.md` § 21 |
| **Schedule / timeplan view (teacher)** | `patterns.md` § 22 — day-grouped card list, not a calendar grid |
| **Search / list filter / autocomplete / command palette** | `patterns.md` § 20 |
| **Loading, pending, empty, toast, destructive patterns** | `patterns.md` § 6 (empty) · § 10 (loading) · § 11 (toast) · § 12 (destructive) |
| **Destructive confirmation dialogs (delete, refund, cancel)** | `patterns.md` § 12 + `components.md` (Confirmation dialog) |
| **Choosing a color, font size, spacing, radius, motion** | `tokens.md` |
| **Wiring up CSS / Tailwind / SwiftUI** | `platform-mapping.md` |

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

**Surface dictates rhythm.** Studio uses a 16px body baseline across dashboard and public surfaces because the primary audience benefits from readability over density. The dashboard stays restrained by capping page titles at `text-3xl` (30px). Section descriptions, helper copy, empty-state descriptions, row subtitles, and normal page content are `text-base` (16px). Reserve `text-sm` (14px) for genuinely dense UI: page tabs, table headers, compact control labels, tooltips, timestamps inside activity logs, tiny count chips, and drawer/modal internals where space is constrained. The public/booking surface also runs at 16px body and unlocks `text-5xl` (48px) for one hero per page. Same canonical scale; different usage map. Display tops out at 48px — no 60px or 72px hero text in this system. Restraint over spectacle, after Time2book's "measured boldness".

**Designed for everyone, not power users.** The audience is yoga teachers, small studio owners, and operators without technical backgrounds. They open the app to do *one thing* — see what's happening today, confirm a signup, message a student, create a course. Studio screens optimize for *that one thing*, not for a hypothetical power user who manages 50 studios. Density is the enemy. Long data tables, faceted filters, customizable dashboards, bulk-action toolbars — all banned by default. See `references/patterns.md` for the eight UX patterns this conviction produces (Today hero, card grid, detail drawer, sectioned form / no wizard, tabs to slice, empty state with action, inline help, single opinionated layout).

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
- **White page stays. No tinted canvas everywhere.** Studio's background is white; structure comes from spacing, headings, dividers, rows, and hierarchy first. Tinted / filled panels (`bg-muted`, danger-subtle) are appropriate only when containment is genuinely needed — destructive zones, contextual callouts. They are NOT the default page-structure mechanism. Border-only boxes likewise are not the default — see `components.md` § Card for the card-vs-no-card decision table.
- **Border, not shadow.** When a `<Card>` is used, it's `bg-surface border border-border rounded-xl`. Shadow only appears on overlays that genuinely float (dialogs, popovers, hover-tooltips).
- **Buttons pill, inputs don't.** Every button (primary, secondary, ghost, destructive) is `rounded-full`. Inputs stay `rounded-md` (6px). The shape difference is intentional — buttons are committed actions, inputs are containers for text. **Cards, panels, list containers, dialogs all share `rounded-xl` (12px)** — one surface radius. `rounded-lg` (8px) is for tight sub-surfaces only (list rows inside a card, badges, image thumbs). No `rounded-[Npx]` arbitrary values.
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

These are bans. Every one of them ships in generic AI-generated UIs and breaks the system. Grouped into five buckets for scanning.

### Typography

- **No `font-bold` (700).** Reads marketing-heavy at dashboard sizes. Hierarchy comes from size, not weight.
- **No uppercase tracked labels.** `uppercase tracking-wider` on KPI labels, table headers, eyebrows — banned. Use `text-xs font-medium text-foreground-muted` sentence case (matches shadcn / Vercel / Linear / Notion).
- **No `font-mono`.** Studio has no monospace token. For tabular alignment use `tabular-nums` on Geist sans.

### Composition

- **No raw Tailwind color utilities.** `bg-green-100`, `text-red-700`, `text-blue-500` — use semantic tokens (`bg-success-subtle`, `text-danger`, `bg-muted`).
- **No `p-5`, `p-7`, `space-y-5`, `space-y-7`, `space-y-9`.** Hand-tuning temptation; pick a tier.
- **No `rounded-[Npx]` arbitrary values.** Use the four named tokens.
- **No shadow on plain cards.** Cards use `border`; shadow is for things that float (dialogs, popovers).
- **No `opacity-50` on inactive items.** Use `bg-muted/50 text-foreground-muted` — opacity reads as a loading skeleton.
- **No `<Card>` wrapping every section by default.** Heading + content + spacing first. See `components.md` § Card decision table.
- **No tinted canvas everywhere.** Page background stays white. Tinted / filled panels (`bg-muted`, danger-subtle) only when containment is genuinely needed.
- **No chromatic pop tints on course cards or schedule entries.** Studio is monochrome; type/format gets a text label, not a colored fill.
- **No initials as avatar placeholder.** Neutral User icon in `bg-muted text-foreground-muted`. Use the `<UserAvatar>` primitive.

### Layout

- **No inconsistent max-widths.** Every page uses a single outer shell `mx-auto max-w-6xl` (1152px). Narrower form / prose blocks (`max-w-md`, `max-w-3xl`) live INSIDE the shell, not as a separate outer tier. See `patterns.md` § 17.2.
- **No stretching content past max-width on ultrawide.** Embrace the empty space.
- **No sidebar on public / booking pages.** Public surfaces are sidebar-less.
- **No KPI walls.** A row of 6-8 tiles is a power-user pattern. One hero + 2-3 supporters max.
- **No long data tables on browse pages.** Card grid for browsing; table for genuine comparison/sort.
- **No customizable dashboards.** One opinionated layout.
- **Body copy defaults to 16px.** `text-base` is the readable baseline on both dashboard and public surfaces. Helper copy under section headings is body copy, not metadata. `text-sm` is for dense controls, tooltips, table headers, tiny counters, and constrained drawer/modal details — not normal dashboard page content.

### Interaction

- **No rect buttons.** Every button is a pill (`rounded-full`).
- **No icons in text-bearing buttons.** Label is the action. **Carve-outs:** (1) icon-only buttons where the icon IS the button (close `×`, kebab, sidebar nav-rail) — `aria-label` required; (2) `Loader2` spinner replacing the label during async; (3) form-shaped triggers (date / time / select) where the chevron signals field type; (4) the page's *single primary header CTA* (e.g. `Opprett kurs`) gets one leading icon via `data-icon="inline-start"`. All icons from `@/lib/icons` only. No emoji as icons.
- **No outline buttons in new code.** System is filled-only. `default` (sand-12) + `secondary` (filled muted, no border). `ghost` for inline / dense row icon actions; `soft` for dedicated icon controls (dialog/sheet/drawer close ×, kebab triggers, share) — persistent muted-fill circle that reads as a discoverable tappable target. `outline` deprecated — migrate when touching the file. See `components.md` § Button.
- **No hover fill change on primary buttons.** Sand-12 hover-darkened reads as noise. Hover feedback lives on secondary/ghost.
- **No underlines on course-card titles.** The card is the affordance.
- **No "click row → new page" for detail views.** Use a drawer.
- **No filter UIs as the primary slicer.** Use 3-4 tabs.
- **No wizards. No step indicators. No Back / Next progression.** Sectioned form + setup checklist + embedded vendor UI. See `patterns.md` § 16.
- **No global command palette by default.** Conditional rule (see `patterns.md` § 20.1a) — consider `cmd+k` only when destinations / records / frequent actions clearly outgrow sidebar + page filter.
- **No persistent system alerts.** No banner system, no sidebar attention dots, no notifications inbox. Transient feedback = toast (§ 11); blocking errors = inline page/form state.

### Confirmation dialogs + toasts

- **No question-form dialog titles.** `Slett konto`, not `Slette kontoen?`. Verb-noun statement.
- **No two-sentence period-separated body in dialogs.** Norwegian destructive verbs carry finality — drop `Det kan ikke angres` unless the action is genuinely irreversible. 1 paragraph, max 2 sentences, ~140 chars.
- **No scope card in dialogs by default.** Inline `<strong>` for entities. Scope card is opt-in for lists of 3+ items.
- **No acknowledgement checkbox.** The button label + verb are the gate.
- **No backdrop blur on dialogs.** Flat `bg-foreground/40` dim only.
- **No right-aligned cancel-cluster footer in `ConfirmDialog`.** Full-width split, both filled, no borders. Avbryt LEFT (filled muted), destructive RIGHT (filled dark).
- **No red destructive button.** Monochrome sand-12. The verb + position carry the signal.
- **No white-surface toasts with a 4px stripe.** Dark small-card surface (`bg-foreground/95`) + small leading icon-on-circle. See `components.md` § Toast.
- **No toast title with trailing period.** `Lagret`, not `Lagret.` — the title isn't a sentence.

### Copy

- **No dot-glue between different subjects.** `3 klasser · 32 påmeldte` joins two unrelated facts. Dot separators are for *attributes of one subject* (`kl. 18:00 · Sal 1`). Group by subject; give each its own block. See `patterns.md` § 9.
- **No multi-line subtitles with multiple dots.** `Vinyasa Flow · kl. 18:00 · 12 av 14 plasser` is three different aspects pretending to be one. Break vertically or use natural language.
- **No "TRUSTED BY" eyebrow labels.** Marketing kitsch. Sentence case at `text-sm` if a preface is needed.
- **No colored-dot eyebrow labels.** `● Brand Name · Location` reads as generic SaaS theater. Lead with the headline.
- **No eyebrow labels above self-explaining content.** Eyebrows disambiguate peer items at the same level (drawer metadata: `Dato / Metode / Beløp`). They are NOT for labeling something the title/heading already conveys. Examples to remove: `Med` above an instructor avatar+name; `Påmeldt til` above the booked-course title on a confirmation page titled `Du er påmeldt`; `I dag` above an h2 that says `3 klasser i dag`.

---

## 4. Workflow

When using this skill on a real component or page:

1. **Identify the surface from the file path.** `pages/teacher/**` and `components/teacher/**` are dashboard (16px body baseline, no display tier, max heading is `text-3xl`; use 14px for meta/dense UI). `pages/public/**` and `components/public/**` are public (16px body, display tier unlocked).
2. **Read `design-model.yaml`** to get the exact token values. Never hardcode hex.
3. **Pick the tier, not the value.** Decide "card padding default" (`p-6`) before picking 24px.
4. **Squint test before commit.** Four visual layers, max.
5. **Run against the anti-patterns list.** If you see any of the bans, fix them before shipping.

---

## 5. Token references

- Full token reference → `references/tokens.md`
- Component patterns (button, card, input, badge, status) → `references/components.md`
- **Layout & UX patterns (Today hero, card grid, drawer, sectioned form / no wizard, tabs, empty states, inline help, single layout)** → `references/patterns.md`
- CSS variable + Tailwind config drop-in → `references/platform-mapping.md`
- Visual preview → `preview.html` (open in browser)

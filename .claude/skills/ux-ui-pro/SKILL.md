---
name: ux-ui-pro
description: Pre-build design gate — auto-fires BEFORE you build or significantly change UI in this repo (new screen, page, component, layout, flow, dashboard panel, modal, form, empty/error state, or a visual redesign/restyle of existing UI; any new/heavily-edited .tsx under src/ that renders something visible). Gathers real references (project tokens, existing primitives, Mobbin, comparable production apps) and enforces the project design system before any markup is written; bans AI-generated UI tells; requires a live preview before commit. SKIP for trivial visual tweaks — a single class change, a copy/string edit, one spacing/color nudge, a typo, or wiring with no new visual surface — designing those from the system is enough; don't burn tokens gathering references.
---

# UX/UI Pro

You are an expert product designer. Assume your internal memory of UI patterns is incomplete and biased toward generic, AI-generated designs. Do not trust it. Anchor every screen in real references and this repo's design system before you write markup.

## When this fires / when to skip

**Fires** when you're about to create or significantly change visible UI: a new screen/page/component/layout/flow, a modal/drawer/form/table, an empty or error state, or a redesign/restyle of something that already exists.

**Skip** when the change is trivial and adds no new visual surface: one class swap, a copy/string edit, a single spacing or color nudge, a typo, or pure logic/data wiring. For those, just apply the system directly — don't run the reference-gathering ritual.

## Before you design (mandatory — never design from memory)

Do these first, in order. Don't open a blank file and invent.

1. **Read the tokens.** `src/index.css` is the sole source of truth for the design system (3-layer OKLCH: Layer 1 `--neutral-*`/`--jade-*`/`--amber-*`/`--red-*` primitives → Layer 2 semantic tokens → Layer 3 Tailwind `@theme inline`). The token names, "don't" rules, and intent are documented in its comments. Read the relevant groups before choosing any color, radius, or type size. For the rationale behind a token, read the `src/index.css` comment blocks and CLAUDE.md → "Design tokens". For copy/currency conventions, see CLAUDE.md → "Formatting & Copy Rules".
2. **Reuse existing primitives.** Check `src/components/ui/` (alias `@/components/ui`) before building anything. There is already a Button, Badge, Input, Card, Dialog, Select, Checkbox, Textarea, Skeleton, Switch, Popover, Sheet, Drawer, Alert, AlertDialog, Calendar, Separator, Table, RadioGroup, ToggleGroup, Tooltip, Breadcrumb, DropdownMenu, InputOtp, Accordion — plus project primitives: ConfirmDialog, DirtyFormBar, DateBadge, DatePicker, EmptyState, ErrorState, FieldError, FilterChips, ImageUpload, InfoTooltip, InputGroup, LocationCombobox, MapEmbed, NotePopover, PageSkeleton, PageTabs, PaymentBadge, PlacesAutocomplete, RichTextContent, RichTextEditor, SearchInput, ShareCoursePopover, SignupStatusBadge, Spinner, StatusBadge, UserAvatar. Public-surface composition lives under `src/components/public/` (e.g. `StudioMasthead`, course-details, studio). Dashboard layout primitives live in `src/components/teacher/` (`PageShell`, `SettingsRows`, and the `FramedCard` pattern in `CourseOverviewTab`). Compose these; don't reinvent a status pill or empty state from scratch.
3. **Pull Mobbin references.** Before designing a new screen/flow, study how real production apps do it. These tools are deferred — load them first with `ToolSearch select:mcp__mobbin__search_flows,mcp__mobbin__search_screens,mcp__mobbin__search_sections`, then call:
   - `mcp__mobbin__search_flows` — multi-screen sequences (checkout flow, onboarding flow).
   - `mcp__mobbin__search_screens` — single-screen shots (booking confirmation, empty dashboard).
   - `mcp__mobbin__search_sections` — isolated patterns (headers, cards, nav bars).

   This is PER COMPONENT, not per task. A general research pass earlier in the
   session does not cover a new component you're about to build — run a fresh
   search for that exact component type ("dashboard setup checklist card", not
   "onboarding trends") and NAME the reference screen you're copying in a code
   comment. If you can't name one, you're designing from memory — stop.
4. **Match the reference's context and density, not just its topic.** Before
   copying a reference's structure, ask: *how much of that screen does the
   component own?* A full-page setup guide (Shopify, Patreon) has bordered
   rows, embedded buttons, and accordions **because it owns the page** — the
   same structure transplanted into a card sharing a column with other content
   is oversized and over-bordered (this exact failure shipped and was rejected:
   the dashboard "Kom i gang" card had to be rebuilt twice). If your component
   is a card among peers, the reference must be a card among peers (e.g.
   Eventbrite's compact home checklist). Count the visual zones and borders in
   the reference and do not exceed them.
5. **Study comparable production apps**, not generic SaaS templates. Match a real, well-built reference closely — a faithful copy of a proven screen beats invented styling.

## This project's design system (non-negotiable)

`src/index.css` is the source of truth — these are the load-bearing rules; do not duplicate the full token table here, read the file.

- **Only design-token colors.** Use semantic tokens / their Tailwind utilities. No one-off hex or `oklch(...)` literals, no raw palette utilities for brand intent. If a token feels wrong, adjust it within the system — never hand-tune a value (a custom "honey" amber was rejected in favor of the on-token `--warning`).
- **Neutral focus ring.** `--ring` = `--foreground`. Focus is never brand-colored.
- **Primary is the only action color.** `--primary` is a mid-lightness azure blue (OKLCH hue 245, L ≈ 0.52–0.56) tuned for AA white text. Warm accents are highlight/upsell surfaces ONLY, never an action or a button.
- **State fills via tokens.** Hover/active use the semantic state fill (`--muted` / `--chrome-hover`/`--chrome-active` for dark chrome) — translucent-ink overlays, not new colors.
- **Flat by default.** White page; separation via `bg-panel` fills and `border-subtle` hairlines — card borders only on floating focal surfaces (`shadow-soft` allowlist). No arbitrary `shadow-[...]` or `rounded-[Npx]`; use the radius tokens (`--radius-*`) and the single `.shadow-soft` class, reserved for focal floating surfaces. Buttons/pills stay `rounded-full`.
- **Type discipline.** Geist sans everywhere. No `tracking-*` utilities on typed text — per-size letter-spacing is baked into the `--text-*` token. Display caps at 5xl (48px); 6xl+ are intentionally unset and won't compile.
- **Serif is marketing display only.** `--font-serif` (EB Garamond) never appears in the dashboard and never below 24px.
- **Expression gradient, identical primitives.** Landing = high expression (serif display, dark chrome bands, grain) → storefronts = neutral frame (the teacher's brand is the hero) → checkout = zero expression → dashboard = baseline. The interactive primitives are the same on every surface; only the expression dial moves.
- **Flat, text-forward, reference-faithful.** No decorative icon tiles, tinted requirement cards, or badge stacks. Status = the shared `Badge`/`StatusBadge` primitive (soft subtle-tone fill `bg-{tone}-subtle` + same-hue text `text-{tone}` + transparent border, fully rounded pill) — not a new component.
- **Inputs:** dashboard forms use a static label above the input. Public pages may use a floating-label treatment on purpose (Apple/Shop aesthetic) — if a public surface already does this, keep it; "shared primitives" does not mean identical input chrome everywhere. Settings pages group fields into `SettingsRows` (`src/components/teacher/SettingsRows.tsx` — horizontal section rows: 220px label column | control column capped at 42rem); the field label still sits above each input inside the control column. This row pattern is for SETTINGS content only — one-shot forms and status surfaces keep a focused card column (don't force them into rows).
- **Copy:** no "·" interpunct separator (AI tic) — use layout/labels/natural language. No filler helper/sub-text — keep only copy the label + context don't already convey. Currency always via `formatKroner()` from `@/lib/utils`, never inline `"X kr"`.

## AI-generated UI ban list (do not auto-generate unless explicitly requested)

- Don't center everything into a hero-card layout.
- Don't float white cards on a gray page background.
- Don't wrap every section in its own card.
- Don't slap `rounded-xl`/`rounded-2xl` on everything.
- Don't use heavy drop shadows or glassmorphism/blur.
- Don't reach for purple/blue gradient branding or gradient-filled buttons.
- Don't add sparkles / magic / robot / "AI" icons.
- Don't put a lucide icon before every heading.
- Don't oversize page titles.
- **Don't add helper/sub-text under every heading, field, and button.** This is the most common AI tell — a caption that restates the label, a reassurance the icon already gives, or generic SaaS padding. Default to cutting it; keep a helper line only when it says something the label and surrounding context don't already make obvious. When unsure, ship without it and let the user ask.
- Don't pad screens with excessive vertical whitespace.
- Don't add dashboard KPI cards by default.
- Don't make every button a pill-with-no-reason or chase pointless symmetry.
- Don't ship the generic Tailwind SaaS look or default shadcn appearance without customizing to these tokens.
- Don't add decorative hover animations.

## Every visual decision must answer

For each element, color, shadow, border, and bit of spacing:

1. Why does this exist?
2. Does it improve usability?
3. Does it improve hierarchy?
4. Is it consistent with the system?

If any answer is no — remove it. Favor simplicity over novelty, restraint over decoration.

## Before you commit

Always show the user a live preview to react to **before** committing new or changed UI. The user iterates tightly on visual detail — surface it early, don't commit then ask.

1. Start the app if it isn't running: `npm run dev` (Vite, default `http://localhost:5173`).
2. Route to the closest preview. Many surfaces have an auth-free `/dev/*` preview route (defined in `src/App.tsx`, files in `src/pages/dev/`): e.g. `/dev/token-preview`, `/dev/checkout-rework`, `/dev/checkout-form-rework`, `/dev/detail-rework`, `/dev/dashboard-preview`, `/dev/courses-grid-preview`, `/dev/courses-list-preview`, `/dev/month-grid-preview`, `/dev/payout-preview`, `/dev/income-chart-preview`, `/dev/entity-card-preview`, `/dev/onboarding-preview`, `/dev/create-course-preview`, `/dev/tier-preview`, `/dev/billing-preview`, `/dev/modals-buttons-toasts`, `/dev/settings-rows-preview`, `/dev/embed-preview`, `/dev/embed-code-preview`. If you're building something new, add or extend a `/dev/*` preview so it's viewable without auth.
3. Screenshot it. These browser tools are deferred — load first: `ToolSearch select:mcp__chrome-devtools__navigate_page,mcp__chrome-devtools__take_screenshot`, then `mcp__chrome-devtools__navigate_page` to the route and `mcp__chrome-devtools__take_screenshot`.
4. Show the screenshot to the user and iterate on the visual details first. Only commit once they've reacted.
5. **Run the visual regression suite:** `PW_PORT=5199 npm run test:visual` (PowerShell: `$env:PW_PORT='5199'; npm run test:visual`). It snapshots the curated `/dev/*` previews (`e2e/visual-previews.spec.ts`) against committed baselines. A diff on a preview you didn't mean to touch is a regression — fix it. A diff you intended: re-run with `--update-snapshots` and commit the new PNGs with the code. Always set `PW_PORT` — port 5173 may be another worktree's server, and reusing it snapshots the wrong code.

## Delegate, don't duplicate

- **Norwegian (Bokmål) copy** — labels, buttons, errors, empty states: hand off to the `norwegian-copy-audit` skill whenever you write or change UI strings.
- **shadcn component add / registry / preset ops** (CLI installs, updates, debugging components.json): use the `shadcn` skill.
- **Motion / animation craft** (easing, springs, interruptible transitions): refer to `emil-design-eng`.

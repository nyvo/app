# Studio — Components

Patterns for the core primitives. Every value sourced from `design-model.yaml`.

---

## Button

### Variants

| Variant | Use | Surface |
|---------|-----|---------|
| `default` (primary) | The main action on a screen — "Save", "Book", "Confirm" | `bg-foreground text-white` |
| `secondary` | Paired alternative | `bg-surface border border-border text-foreground` |
| `outline` | Toolbar / filter bar buttons | Same as secondary, hover-emphasized |
| `ghost` | Icon-only, nav, low-emphasis row actions | `bg-transparent text-foreground` |
| `destructive` | Confirm-delete inside menus and dialogs | `bg-danger text-white` |
| `link` | Inline text action | `bg-transparent text-foreground underline` |

### Sizes

| Size | Height | Padding | Text | WCAG conformance |
|------|--------|---------|------|------------------|
| `xs` | 24px | `px-2` | `text-xs` | 2.5.8 AA only with **≥24px spacing** to adjacent targets — never use unspaced |
| `sm` | 32px | `px-3` | `text-sm` | Meets 2.5.8 AA |
| `default` | 36px | `px-4` | `text-sm` | Meets 2.5.8 AA |
| `lg` | 40px | `px-5` | `text-sm` | Meets 2.5.8 AA |
| `cta` | 44px | full-width often | `text-base` | Meets 2.5.5 AAA + Apple HIG 44pt |
| `icon`* | 36px square | — | — | Same row as default — `icon-xs` requires spacing |

\* Use `icon-xs` (24px), `icon-sm` (32px), `icon-lg` (40px) for size variants.

**Touch-surface override.** On any *touch-primary* surface (mobile booking flow, customer-facing public pages, MobilePriceBar), the **minimum size is `default` (36px)**, and primary CTAs use `cta` (44px) to hit WCAG 2.5.5 AAA + Apple HIG. Never use `xs` or `sm` on touch surfaces — they only meet AA via the spacing exception, which is fragile (one design tweak puts adjacent targets within 24px and you fail the criterion).

The desktop dashboard can use `sm` and `xs` (toolbars, dense filters, mouse-driven chrome) — the WCAG 24px floor is met, mouse precision absorbs the rest.

**Research basis:** WCAG 2.2 SC 2.5.8 (Target Size, Minimum, Level AA). MIT Touch Lab: average fingertip 16-20mm; targets <44px have 3× higher error rates and up to 75% higher error rates for users with motor impairments.

### Primary button — exact spec

```html
<button class="
  inline-flex items-center gap-2
  h-9 px-[18px]
  rounded-full
  bg-foreground text-white
  text-sm font-medium
  focus-visible:outline-none
  focus-visible:ring-2 focus-visible:ring-foreground
  focus-visible:ring-offset-2 focus-visible:ring-offset-background
  disabled:opacity-50 disabled:pointer-events-none
">
  Save changes
</button>
```

**Rules:**
- **All buttons are pill-shaped (`rounded-full`).** Primary, secondary, ghost, destructive, link. The pill is the system's signature interactive shape — no rect-button variant exists.
- **Primary doesn't shift on hover.** Sand-12 is already near-black; an opacity hover adds noise instead of feedback. Skip the transition. Secondary and ghost variants use a `hover:bg-muted` shift — that's where the visual feedback lives in the system.
- **Maximum 1 primary button per logical group** (1 per form, 1 per dialog, 1 per page hero). If you need a second primary action, redesign the hierarchy — usually one of the actions is actually secondary.
- **Never use `font-bold`** — `font-medium` (500) is the rule. Buttons read as confident at 500 + the pill shape.
- **No icons in text-bearing buttons.** No leading `<Plus>`, no trailing `<ArrowRight>`, no decorative `<Sparkles>`. The label carries the action; an icon next to it doubles the signal and reads as generic SaaS template. Applies to every variant (primary, secondary, outline, ghost, destructive, link). **Three carve-outs:** (1) icon-only buttons where the icon IS the button (close `×`, kebab menu, sidebar nav-rail) — see § Icon-only buttons below; (2) `Loader2` spinner that *replaces* the label during in-flight async actions (see § Loading state above); (3) form-input-shaped triggers (date picker, time picker, select) where the chevron/calendar signals field type, not an action. Otherwise: text only.

> **Note: `secondary` and `outline` variants overlap.** Currently both use `bg-surface border border-border`; "outline" only differs by hover-emphasis. This is redundant — pick one. Recommendation: keep `secondary`, drop `outline` (one less variant for consumers to choose from). If kept, give `outline` a genuinely different look (e.g., transparent bg with stronger border) so the choice is meaningful.

### Loading state

When a button triggers an async action (form submit, payment, save), show a loading state in-place — the button stays the same size, the label gets replaced by a spinner, and the button is `disabled` to prevent double-submit.

```tsx
import { Loader2 } from "@/lib/icons";

<Button disabled={isSubmitting}>
  {isSubmitting ? (
    <>
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      <span className="sr-only">Lagrer…</span>
    </>
  ) : (
    "Lagre"
  )}
</Button>
```

**Rules:**
- **Dimensions don't change.** The button stays exactly as wide as it was — research is unanimous: layout shift on submit feels broken. If a spinner-only state would shrink the button, render the label invisibly (`opacity-0`) underneath the spinner so width is preserved, OR keep the label visible alongside the spinner (`Lagrer…` + spinner left).
- **Disable during in-flight.** `disabled` attribute prevents double-clicks and signals to assistive tech the action is in progress.
- **No size/color animation.** No "ping" pulse, no brief scale, no border darken. Just label → spinner. Calm.
- **Screen-reader announcement.** Use `aria-busy="true"` on the button while loading, plus `<span class="sr-only">` to announce the action text. Sonner toast on success/failure carries the result feedback (see #11).
- **No checkmark-on-success animation in the button.** That's an AI-default flourish. The toast is the success surface; the button just returns to its rest state.

### Icon-only buttons — accessibility

Buttons containing only an icon (close × in a dialog header, kebab menu trigger, etc.) MUST carry an `aria-label`:

```html
<button aria-label="Lukk dialog" class="size-8 grid place-items-center rounded-md hover:bg-muted">
  <XIcon class="size-4" aria-hidden="true" />
</button>
```

**Rules:**
- `aria-label` is **required**. Without it, a screen reader announces only "button" — useless.
- **Norwegian copy** in the label: `Lukk`, `Mer`, `Slett rad`, `Filtre` — match the rest of the UI.
- **`aria-hidden="true"` on the icon** — the label IS the accessible name; the icon shouldn't double-read.
- **Tooltip via `title` attribute** for sighted keyboard users — `<button aria-label="Lukk" title="Lukk">`. They can hover/focus to discover what the icon does. Skipping `title` excludes them from a discovery affordance only screen-reader users get.
- For a tooltip with richer content (formatted, multi-line), use a Radix `<Tooltip>` component with `aria-describedby` instead of `title`.
- **If the visible context names the action**, use `aria-labelledby` instead of `aria-label` — `aria-labelledby` takes precedence and avoids drift if the visible text changes.

---

## Section (canvas-first default)

The default container for content is **not a card — it's a `<section>` directly on the white canvas.** Heading + spacing carries the hierarchy. Reach for a card only when you need explicit grouping.

```html
<section class="space-y-4">
  <header>
    <h2 class="text-xl font-semibold">Påmeldinger</h2>
    <p class="text-sm text-foreground-muted">Aktive kurs denne måneden.</p>
  </header>
  <!-- content directly on canvas — no card wrapper -->
  <div class="divide-y divide-border">
    <!-- list rows -->
  </div>
</section>
```

**Vertical rhythm between sections:** `space-y-10` (40px) for major page sections, `space-y-12` (48px) on landing pages.

**When to break out a `<Card>` instead of a section:**
- KPI tile clusters (a row of numbers benefits from boundaries)
- Modals / dialogs / popovers (must visually float)
- Pricing or feature comparison clusters
- Course cards in a grid (bordered sand surfaces grouping image + meta)
- Forms that genuinely group multiple steps

**When NOT to use a card:** activity feeds, notification lists, recent-items panels, single-purpose forms with one clear topic, settings rows. Use a section + dividers.

---

## Card

A deliberate tool for explicit grouping. The default tier is **airy** (`p-6`).

```html
<div class="
  bg-surface border border-border rounded-lg
  p-6
">
  <!-- card content -->
</div>
```

### Padding tiers

| Tier | Padding | When |
|------|---------|------|
| `p-3` | 12px | Compact mini-panels (sidebar items, dense pickers) |
| `p-4` | 16px | Dense list rows wrapped in a card |
| **`p-6`** | **24px** | **Default — every card unless dense** |
| `p-6 sm:p-8` | 24/32 | Form hero card |
| `p-8` | 32px | Marketing block on landing |
| `p-8 md:p-12` | 32/48 | Mega-hero on landing |

**Banned:** `p-5`, `p-7`. No exceptions.

### Card title

`<CardTitle>` → `text-base font-semibold` (dashboard) or `text-xl font-semibold` (landing). Description below: `text-sm text-foreground-muted` with `mt-1` if it's two lines, `mt-0.5` if single-line.

### Whole-card-clickable tile pattern

Don't swap fill on hover — that fights with page rhythm. Add a ring instead. **Implementation: pseudo-content trick** (Inclusive Components consensus) — the card container is `position: relative`, the link gets `::after` positioned absolutely over the card, so the whole tile is clickable while the link itself stays semantically scoped to its label.

```html
<article class="relative bg-surface border border-border rounded-lg p-6
                transition-shadow duration-200 ease-out
                hover:ring-1 hover:ring-foreground/10 hover:border-foreground/15
                focus-within:ring-2 focus-within:ring-foreground focus-within:ring-offset-2">
  <h3 class="text-base font-semibold">
    <a href="/courses/vinyasa-flow"
       class="after:absolute after:inset-0 after:content-['']">
      Vinyasa Flow
    </a>
  </h3>
  <p class="text-sm text-foreground-muted">Tirsdag 18:00 · 12 påmeldinger</p>
</article>
```

**Rules:**
- **Only the link gets the hover/focus visual** — except `focus-within` on the parent ensures the card outlines when the link inside is focused via keyboard.
- **No internal CTAs.** A clickable card cannot also contain "View details" / "Edit" / "Delete" buttons next to its primary link — the absolute `::after` covers them and they become unreachable. If you need internal actions, the card is NOT whole-clickable; revert to inline actions and remove the pseudo-content trick.
- **Card content stays declarative.** The `<a>` wraps only the primary identifier (title or thumbnail), with non-link metadata (status, counts, dates) outside the link tag — keyboard users hear "Vinyasa Flow, link" not "Vinyasa Flow Tirsdag 18 colon 00 12 påmeldinger, link" when tabbing.
- **`focus-within` ring is mandatory.** Sighted keyboard users need the ring; without it, tabbing through cards is invisible. Match the WCAG 2.4.7 (Focus Visible) requirement.

### Card grid — chromeless variant for content tiles

For card grids that show **content** (blog posts, customer stories, instructor profiles, future cross-sell with real imagery), drop the surrounding card box entirely. Each unit is just `visual tile at the top + caption text below`. No border, no padded container, no fill behind the caption — structure comes from the visual + spacing alone.

```html
<!-- ✓ Chromeless content card -->
<article class="space-y-3">
  <a href="..." class="block aspect-[4/3] rounded-lg overflow-hidden">
    <img src="..." class="w-full h-full object-cover" alt="" />
  </a>
  <div>
    <h3 class="text-base font-medium">
      <a href="..." class="text-foreground no-underline">How OpenAI scaled to 3,000 users</a>
    </h3>
    <p class="mt-1 text-sm text-foreground-muted line-clamp-2">
      Two-line description that doesn't sit inside a box.
    </p>
    <p class="mt-3 text-xs text-foreground-muted tabular-nums">Karri Saarinen · Apr 17, 2026</p>
  </div>
</article>

<!-- ✗ Bordered card — looks SaaS-template for content surfaces -->
<article class="bg-surface border border-border rounded-lg p-6">
  <img src="..." class="rounded-md aspect-[4/3]" alt="" />
  <h3 class="mt-4 text-base font-semibold">...</h3>
  <p class="mt-2 text-sm text-foreground-muted">...</p>
</article>
```

**Why:** bordered cards read as SaaS-template. Image-tile-plus-caption with no frame reads editorial — the visuals do the differentiation, the box is redundant chrome. Pattern observed at Linear (their `Now` page and Customers grid).

**Where this applies:**
- Blog / changelog grids (`/articles`, `/blog`)
- Customer-stories grids
- Instructor cards on a "Meet our teachers" page
- Cross-sell shelf on the course detail page **only when real imagery is available** — see caveat below

**Where it does NOT apply (use bordered cards instead):**
- KPI tiles — the border IS the structural grouping for a number + delta
- Forms / dialogs / drawers — need the border for grouping
- **Content tiles WITHOUT real imagery** — without a real image, the no-border version feels unfinished. Fall back to the bordered card with a calm typographic layout (which is what Studio's current cross-sell mock does on the course detail page — that's a deliberate choice, not a bug).

**The litmus test:** if your visual tile is just a colored block with text on top, you don't have a chromeless card — you have a bordered card with extra steps. Either commit to a real visual (image, illustration, screenshot, abstract dark line drawing à la Linear) or keep the border.

### Card vs. list — the decision

NN/G research: cards win for *browsing* (visual catalogues, libraries, "find the one I want"); lists win for *scanning* (search results, dense info, "find this specific one fast"). Studio's mapping:

| Surface | Pattern |
|---|---|
| Public studio's course offerings | Card grid (browsing — "find a class to take") |
| Teacher's course list (admin) | List rows with secondary actions (scanning — "find Vinyasa Flow to edit it") |
| Påmeldinger inside a course | List rows (scanning — names + status) |
| Studio listing on the landing page | Card grid (browsing — "find a studio near me") |

If you can't decide: count the items. ≤30 and visually distinct → cards. Hundreds and homogeneous → list.

---

## KPI tile

A specialized card for displaying a single key metric. Used in dashboard hero rows, settings summaries, and the "Today" section. Anatomy: small label → headline value → optional delta vs. previous period.

```html
<article class="bg-surface border border-border rounded-lg p-6">
  <p class="text-xs font-medium text-foreground-muted">Inntekt denne måneden</p>
  <p class="mt-1 text-2xl font-semibold tabular-nums tracking-tight">14 200 kr</p>
  <div class="mt-2.5 flex items-center gap-2">
    <span class="badge badge-rect badge-success tabular-nums">+12%</span>
    <span class="text-xs text-foreground-muted">mot forrige måned</span>
  </div>
</article>
```

**Rules:**
- **Actionable, not vanity.** Industry consensus (Bold BI, Power BI guidance): if the number changing wouldn't change a decision, the metric doesn't belong on a tile. Studio examples that work: `Inntekt`, `Aktive påmeldinger`, `Belegg denne uken`. Examples that don't: `Total visninger`, `Total brukere noensinne` — vanity.
- **Headline value** is the protagonist: `text-2xl font-semibold tabular-nums tracking-tight` (24px / 600 / `-0.01em`). `tabular-nums` is mandatory — column alignment is the visual hierarchy.
- **Label above** (not below) — users read top-down. Label is `text-xs font-medium text-foreground-muted`.
- **Delta wraps in a `badge-rect` with semantic color**, not inline colored text. Inline colored deltas are too quiet — every tile reads identical and the eye glides past. A small badge gives each tile a discrete pop without tinting the whole card. Use the existing `badge badge-rect badge-success` / `badge-danger` / `badge-warning` classes.
- **Color reflects meaning, not sign.** Direction depends on the metric:
  - Inntekt / påmeldinger / belegg up → `badge-success`
  - Avbestillinger / no-shows / refunds DOWN → also `badge-success` (fewer is better)
  - Avbestillinger up → `badge-danger`
  - Always ask: "is this change good for the user?" — that determines the color, not whether the number went up or down.
- **Restate ambiguous deltas in the muted text** beside the badge. `−4 % færre` is clearer than `−4 %` alone, because the sign + word combination removes any ambiguity about "is this good or bad."
- **No inline meta with dot-glue.** Earlier draft had `12 fullbooket · 2 ledige plasser` as a single sentence — that violates pattern #9 (no dot-glue). Use a badge for the primary fact (`12 / 14 fullt`) and a short muted phrase for the secondary (`2 ledige`).
- **Don't tint the whole card** based on direction (green-bg for positive, red-bg for negative). That's the AI-default dashboard look. The badge carries the color; the card stays calm.
- **No sparkline by default.** Sparklines are a power-user feature — Studio's audience doesn't read them. Reserve for explicit "show trend" UIs (reports page), not for the dashboard hero. If you do add one: ≤16px tall, monochrome `text-foreground-muted`, no fill.
- **Cluster layout: 4-column on desktop, 2-column on tablet, 1-column on mobile.** Industry-standard responsive pattern. Use CSS grid with `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`.
- **Maximum 4 KPI tiles in a row.** Beyond 4, the cluster reads as a wall of numbers and individual values lose meaning. If you need more, group into a separate "details" page.

---

## Pricing display

How prices appear across Studio surfaces — course cards, BookingPanel, comparison tables, receipts. Always uses `formatKroner()` from `@/lib/utils` for canonical Norwegian formatting (`2 200 kr` with thin-space thousand separator). Never inline `${amount} kr` — that skips the locale formatter and produces `2200 kr`.

### Size hierarchy

The price's role on the page determines its size. Studio's three tiers:

| Context | Size | Weight | Example |
|---|---|---|---|
| **Hero price** (BookingPanel total, payment confirmation) | `text-2xl` (24px) | `font-semibold` (600) | `2 250 kr` |
| **Inline price** (course card primary, comparison table headline) | `text-xl` (20px) | `font-semibold` (600) | `450 kr` |
| **Body price** (receipt line items, list rows, subtotal items) | `text-sm` (14px) | regular | `450 kr` |

All prices use `tabular-nums` (Tailwind: `tabular-nums`, CSS: `font-feature-settings: 'tnum'`). Mandatory — column-aligned digits make scanning faster. Never skip this for currency.

### Strikethrough discount — only when it complies with the law

When a course is priced lower than its usual rate, show the discount as strikethrough + new price:

```html
<p class="tabular-nums">
  <span class="text-base text-foreground-muted line-through mr-1">450 kr</span>
  <span class="text-xl font-semibold text-foreground">350 kr</span>
</p>
```

**Compliance requirement (mandatory in Norway via EEA / EU Omnibus Directive):**
The strikethrough price MUST be the lowest actual selling price in the prior 30 days. You cannot inflate a "was" price to make the current price look like a better deal — that's deceptive pricing per regulation, not just bad UX. The `original_price` in the database has to be a real recent price the course was sold at; if it isn't, don't show the strikethrough.

**Visual rules:**
- Old price: `text-foreground-muted line-through`, one size smaller than the new price.
- New price: same size/weight as a non-discounted price would be in that context — discounts don't earn extra prominence.
- **No red text** on the new price (common e-commerce convention but reads loud against Studio's calm tone). The strikethrough alone signals the comparison.
- **Optional savings note** below: `text-xs text-foreground-muted` — `Spar 100 kr` or `−22%`. Use percentage when the discount is ≥10%; absolute kroner for smaller savings.

### Service fee / breakdown — line items

For order summaries (booking confirmation, receipts), use a stacked label/value list with the total visually distinguished:

```html
<dl class="space-y-2 tabular-nums">
  <div class="flex justify-between text-sm">
    <dt class="text-foreground-muted">Pris</dt>
    <dd class="text-foreground">2 200 kr</dd>
  </div>
  <div class="flex justify-between text-sm">
    <dt class="text-foreground-muted flex items-center gap-1">
      Tjenestegebyr
      <Tooltip>...</Tooltip>
    </dt>
    <dd class="text-foreground">50 kr</dd>
  </div>
  <hr class="border-border" />
  <div class="flex justify-between text-base font-semibold">
    <dt>Totalt</dt>
    <dd>2 250 kr</dd>
  </div>
</dl>
```

**Rules:**
- Labels left, amounts right (`flex justify-between`).
- Subtotal lines: `text-sm`, `text-foreground-muted` for label, `text-foreground` for value.
- Total: `text-base` + `font-semibold`, separated from the items above by a hairline divider.
- **Service fee always inline with subtotal** — never revealed only at payment step (§19.2 + FTC May 2025 + EU Omnibus).
- **Tooltip on `Tjenestegebyr`** explains what the fee is (`Plattformgebyr som dekker betalingsbehandling og support`). Don't make users guess.

### Subscription tier comparison (Studio's own pricing — for teachers choosing a plan)

When the platform offers tiered plans (Free / Pro / Premium), use a 3-column grid of pricing cards with the recommended tier visually distinguished. Industry pattern + 15-25% conversion lift when comparison is clear.

```
┌─────────────┐  ┌────────────────┐  ┌─────────────┐
│   Gratis    │  │  ★ Anbefalt    │  │   Premium    │
│   0 kr      │  │  Pro           │  │   299 kr/mnd │
│   /mnd      │  │  149 kr/mnd    │  │              │
│             │  │  124 kr/mnd*   │  │              │
│ • 1 studio  │  │  *årlig (-17%) │  │ • Alt i Pro  │
│ • 10 kurs   │  │                │  │ • Custom domain
│ • Ingen kost│  │ • 5 studios    │  │ • Multi-lokasjon
│             │  │ • Ubegrenset   │  │ • API tilgang│
│ [Velg]      │  │ • Påmeldinger  │  │              │
│             │  │ [Velg Pro]     │  │ [Kontakt salg]
└─────────────┘  └────────────────┘  └─────────────┘
                  ↑ subtle elevation, "★ Anbefalt" eyebrow
```

**Rules:**
- **No card chrome on the tier columns.** Each tier sits directly on the canvas — no `border`, no `shadow`, no `bg`, no `rounded` container around the unit. Adjacent tiers are separated by a single hairline `border-r border-border` between columns. Card chrome on pricing tiers is a SaaS-template tell (it signals "I need to convince you with visual weight"); chromeless tiers signal "look at the values; pick what fits." Pattern observed at Linear, time2book.
- **Recommended emphasis lives in the CTA only.** The recommended tier gets `btn-primary` (black); the other tiers get `btn-secondary` (muted pill). **No `★ Anbefalt` eyebrow, no shadow, no ring, no background tint** — the visual difference is one button color. That's enough.
- **3 tiers max.** Beyond 3 the comparison gets noisy. If you have more, fold into "Custom" with a contact-sales CTA.
- **Plan name**: `text-base font-medium`, plan price: `text-2xl font-semibold tabular-nums tracking-tight`. Period suffix (`/mnd`) is `text-sm font-medium text-foreground-muted` inline.
- **Short tagline below price**: `text-sm text-foreground-muted`, one line that names who the tier is for. e.g. `For å prøve Studio` (Free), `For aktive studios` (Pro), `For større studios med flere lokasjoner` (Premium).
- **Show 5-7 most relevant features** per plan as a plain `<ul>` with `gap-2.5` between items, no leading icons. The bare list reads cleaner than a checked-bullet list and removes another layer of chrome. (Optional: small ✓ leading icons in `text-foreground-muted` — but plain text is calmer.)
- **Annual toggle / dual price display.** If you offer annual at a discount, show both: `149 kr/mnd` (monthly billing) with `124 kr/mnd årlig (−17%)` as a small muted line below. Per-month equivalent of annual pricing reads lighter than the annual lump sum (`1 488 kr/år`) — and showing both is honest.
- **No "Most Popular" decoration paired with a decoy plan.** The decoy effect (engineering a plan as "obviously worse" to push users to the middle tier) is a real conversion lever (60-70% pick the middle). Studio chooses not to use it. Plans should be honest tiers — each tier solves a real customer need. If a tier wouldn't be chosen by anyone, remove it, don't reposition it as a decoy.

### Free / no-cost states

For free courses (drop-ins, intro classes), don't write `0 kr` — write **`Gratis`**. The numerical zero reads as bureaucratic; the word reads warm and matches Studio's calm tone. Database value stays `0` for math; display layer renders `Gratis`.

```ts
const display = price === 0 ? "Gratis" : formatKroner(price);
```

### Per-period suffixes

| Suffix | When |
|---|---|
| `kr` | One-time payment (single class booking, drop-in) |
| `kr/mnd` | Monthly subscription |
| `kr/år` | Annual subscription (with optional `kr/mnd` equivalent shown alongside) |
| `kr/uke` | Weekly billing (rare) |

The suffix is part of the formatted string — `formatKroner(149) + ' /mnd'`. Never split the period suffix to a different visual treatment (smaller text or muted color) — that's a dark-pattern technique to hide the recurring nature.

---

## Input

Inputs stay rect (`rounded-md`, 6px) — buttons pill, inputs don't. Pill text inputs feel weird at 36px height.

### Four states

| State | Trigger | Treatment |
|-------|---------|-----------|
| **Rest** | default | `bg-surface border-border` |
| **Focus** | `:focus-visible` | `border-foreground ring-2 ring-foreground/15` |
| **Error** | `aria-invalid="true"` | `border-danger-fg ring-2 ring-danger-fg/20` |
| **Disabled** | `:disabled` | `opacity-50 bg-muted cursor-not-allowed` |

```html
<input
  aria-invalid="false"
  class="h-9 w-full px-3
         bg-surface border border-border rounded-md
         text-sm text-foreground placeholder:text-foreground-muted
         transition-[color,border-color,box-shadow] duration-150 ease-out
         focus-visible:outline-none focus-visible:border-foreground focus-visible:ring-2 focus-visible:ring-foreground/15
         aria-invalid:border-danger-fg aria-invalid:ring-2 aria-invalid:ring-danger-fg/20
         disabled:opacity-50 disabled:bg-muted disabled:cursor-not-allowed"
/>
```

`aria-invalid` is the trigger for error styling. Don't manually toggle classes — let the form library set the attribute.

---

## Form field group

The full label + input + helper + error structure. Studio commits to the shadcn Form pattern (label color shifts, aria-invalid drives styling, all four signals fire together on error).

### Rest state

```html
<div class="grid gap-2">
  <label for="email" class="text-sm font-medium text-foreground">E-postadresse</label>
  <input id="email" type="email"
    class="h-9 w-full px-3 bg-surface border border-border rounded-md text-sm" />
  <p class="text-sm text-foreground-muted">Vi sender bekreftelse hit etter booking.</p>
</div>
```

### Error state — all four signals fire

```html
<div class="grid gap-2">
  <label for="email" data-error="true"
    class="text-sm font-medium text-foreground data-[error=true]:text-danger">
    E-postadresse
  </label>
  <input id="email" type="email"
    aria-invalid="true"
    aria-describedby="email-error"
    class="h-9 w-full px-3 bg-surface border border-border rounded-md text-sm
           aria-invalid:border-danger-fg aria-invalid:ring-2 aria-invalid:ring-danger-fg/20" />
  <p id="email-error" class="text-sm text-danger">Skriv inn en gyldig e-postadresse.</p>
</div>
```

**The four signals on error:**
1. Label color → `text-danger`
2. Input border → `border-danger-fg`
3. Ring at 20% opacity → `ring-2 ring-danger-fg/20`
4. Error text below in `text-danger`

Driven by `aria-invalid="true"` + `data-error="true"` on the label. Both attributes set by the form library.

### Validation timing rule

```ts
const form = useForm({
  mode: "onBlur",             // First validation: when user leaves a touched field
  reValidateMode: "onChange",  // After error: re-validate immediately on each keystroke
  // Empty required fields: silent until submit (RHF default — driven by `touched` state)
});
```

The hybrid pattern (onBlur first → onChange after first error) is the 2026 consensus across react-hook-form, Formik, and TanStack Form. The reasoning, validated by inline-validation UX research:

1. **Don't error while the user is still typing the first time** — premature errors feel hostile and often resolve themselves before the user finishes.
2. **Once a field has shown an error, switch to onChange** — the user is now actively correcting; instant feedback on each keystroke confirms the fix the moment it lands.
3. **Empty required fields stay silent until submit** — driven by RHF's `touched` state; never accuse the user of missing a field they haven't reached.

See `references/patterns.md` § 13.3 for full timing doctrine.

---

## Suffix input — for `kr`, `min`, `%`, units

Number inputs with a unit suffix. Used for price (`kr`), duration (`min`), percentages, etc. The suffix is rendered as a non-interactive `<span>` positioned absolutely inside the input's right padding zone — never as a separate visual element.

```html
<div class="relative">
  <label for="price" class="text-sm font-medium">Pris i kroner</label>
  <input id="price" type="number" inputMode="numeric"
    aria-describedby="price-suffix"
    class="h-9 w-full pl-3 pr-10 bg-surface border border-border rounded-md
           text-sm tabular-nums text-foreground" />
  <span id="price-suffix" aria-hidden="true"
        class="absolute right-3 top-1/2 -translate-y-1/2
               text-sm text-foreground-muted pointer-events-none">kr</span>
</div>
```

**Rules:**
- Right padding (`pr-8` / `pr-10` / `pr-12`) sized to clear the suffix — measure the longest suffix you'll use in this column and use a consistent value across the form.
- `font-feature-settings: 'tnum'` (Tailwind: `tabular-nums`) so digits don't shift width. Critical for currency.
- `inputMode="numeric"` brings up the numeric keyboard on mobile without enforcing `type="number"` quirks (spinners, scroll-to-change).
- Suffix is `text-foreground-muted` and `pointer-events: none` — it's a label, not a button.
- **`aria-hidden="true"` on the suffix `<span>`** (USWDS / WCAG): the symbol isn't read by screen readers, so the visible label MUST state the unit explicitly. Use `Pris i kroner` not just `Pris` — the screen-reader user can't see the `kr`.
- Use `formatKroner()` from `@/lib/utils` for *display* (`2 200 kr`); use suffix-input only for *editing* (raw integer + visual `kr`).
- **For large currency entry** (>`9999`), consider format-as-typing with the `nb-NO` thousand separator (`2 200`, `12 000`) — easier to read while editing. Use `react-currency-input-field` with `intlConfig={{ locale: 'nb-NO' }}`. For the typical price range in this app (course prices `100`-`2500` kr), the bare numeric input is sufficient.

---

## Date picker

Button trigger + Popover containing react-day-picker. The trigger looks identical to a single-line input, with a calendar icon on the right.

```tsx
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

<Popover>
  <PopoverTrigger asChild>
    <button className="h-9 w-full flex items-center justify-between px-3
                       bg-surface border border-border rounded-md text-sm text-left
                       hover:bg-muted/50">
      <span className={!date ? "text-foreground-muted" : "text-foreground"}>
        {date ? format(date, "d. MMMM yyyy", { locale: nb }) : "Velg dato"}
      </span>
      <CalendarIcon className="size-4 opacity-50" />
    </button>
  </PopoverTrigger>
  <PopoverContent className="w-auto p-0" align="start">
    <Calendar mode="single" selected={date} onSelect={setDate} locale={nb} />
  </PopoverContent>
</Popover>
```

**Rules:**
- **Display format**: `d. MMMM yyyy` (e.g. `12. mai 2026`) — full month name in lowercase per Norwegian convention. Never `12/05/2026` (ambiguous: US vs EU).
- **Locale**: always `nb` from `date-fns/locale` — affects week start (Monday), month names, weekday abbreviations.
- **Empty state**: placeholder `Velg dato` in `text-foreground-muted` (sand-11). NOT `text-foreground-disabled` — disabled-tier color (sand-8) fails WCAG 1.4.3 contrast on white (~2.5:1 vs required 4.5:1).
- **Past-date handling**: in scheduling contexts, disable past dates via `disabled={{ before: new Date() }}`. In reporting/history contexts, allow them.
- **Trigger height/border** matches `<input>` exactly — same chrome means consistent form fields.

### Mobile variant — full-screen sheet, not popover

The desktop popover-calendar is awkward on touch — it sits cramped above the field, day cells become tap-tiny. Below `sm` (640px), swap the Popover for a Vaul Drawer that slides up from the bottom and contains the same `<Calendar>`, full-width, with finger-sized day cells.

```tsx
import { useIsMobile } from "@/hooks/use-is-mobile";

function DateField(...) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent>
          <Calendar mode="single" selected={date} onSelect={(d) => { setDate(d); setOpen(false); }} locale={nb} />
        </DrawerContent>
      </Drawer>
    );
  }
  return <Popover>...</Popover>;
}
```

This is the documented MUI X / React Aria pattern — desktop vs mobile pickers are different controls with the same trigger. **Don't use a native `<input type="date">` on mobile** — its rendering varies by browser/OS and can't carry the locale + nb date format. Vaul drawer + react-day-picker is consistent everywhere.

**Future-proofing note:** If picking a date picker library fresh in 2026, **React Aria** is the recommended architecture (HeroUI v3, Adobe spectrum). It future-proofs the API and gives WCAG 2.1 AA out of the box. react-day-picker is fine for now (already shadcn-shipped); don't migrate unless you're rebuilding the date system.

---

## Time picker

Button trigger + Popover containing a scrollable list of times at 15-minute increments. 24-hour format always (Norwegian convention; AM/PM is a US convention that confuses Norwegian users).

```tsx
<Popover>
  <PopoverTrigger asChild>
    <button className="h-9 w-full flex items-center justify-between px-3
                       bg-surface border border-border rounded-md
                       text-sm text-left tabular-nums">
      <span>{time || "Velg tid"}</span>
      <ChevronDown className="size-4 opacity-50" />
    </button>
  </PopoverTrigger>
  <PopoverContent className="w-32 p-1 max-h-60 overflow-y-auto" align="start">
    {timeSlots.map((slot) => (
      <button key={slot} onClick={() => setTime(slot)}
        className="w-full px-2 py-1.5 text-sm tabular-nums text-left rounded
                   hover:bg-muted">
        {slot}
      </button>
    ))}
  </PopoverContent>
</Popover>
```

**Rules:**
- **Format**: 24h `HH:mm` (`18:00`, `06:30`) — never AM/PM.
- **Increment**: 15 minutes default. 30 minutes for low-precision contexts (open hours). Never 1-minute (overwhelming list).
- **`tabular-nums`** on both trigger and list — column-aligned digits make scanning faster.
- **Don't use a native `<input type="time">`** — browser rendering is inconsistent across platforms and looks dated. Custom popover is one extra component for major UX win.

---

## Date + time combined

For scheduling, date and time are entered as a row of two fields (`grid-cols-2`), not stacked. Visual structure: Dato | Starttid in one row, Varighet | Sal in the next.

```html
<div class="grid grid-cols-2 gap-4">
  <FormField label="Dato"><DatePicker /></FormField>
  <FormField label="Starttid"><TimePicker /></FormField>
</div>
<div class="grid grid-cols-2 gap-4">
  <FormField label="Varighet"><SuffixInput suffix="min" /></FormField>
  <FormField label="Sal"><Select /></FormField>
</div>
```

Don't combine date + time into a single field. Two fields read clearer; users mentally hold them separately.

---

## Select dropdown

Use shadcn `<Select>` (Radix), never native `<select>`. Native `<select>` rendering is platform-controlled and breaks the design system. Radix gives full chrome control with proper keyboard / a11y handling.

```tsx
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
  from "@/components/ui/select";

<Select value={value} onValueChange={setValue}>
  <SelectTrigger className="h-9 w-full bg-surface border-border rounded-md text-sm">
    <SelectValue placeholder="Velg type" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="yoga">Yoga</SelectItem>
    <SelectItem value="pilates">Pilates</SelectItem>
    <SelectItem value="meditation">Meditasjon</SelectItem>
  </SelectContent>
</Select>
```

**Rules:**
- Trigger height/chrome matches `<input>` — same `h-9`, `rounded-md`, `border-border`.
- `SelectContent` uses `rounded-md`, `border-border`, `shadow-sm`. Selected item gets a checkmark on the left automatically (Radix default).
- For ≤4 options, prefer **segmented control** (it's tabs §) — no popover required, all options visible.
- For ≤8 options, **Select dropdown** is fine.
- For >8 options or unknown values, use **Combobox** (search-as-you-type, see `cmdk`).

**Conditional selects — don't disable, filter.** When one Select's valid values depend on another (end-time after start-time, end-date after start-date), do NOT pass `disabled={!dependency}` to the dependent Select. The shadcn primitive applies `disabled:bg-muted disabled:opacity-50` — both **violate Studio's anti-patterns** (`opacity-50` on inactive items is banned; `bg-muted` makes the disabled field look like a different element). Instead, leave the dependent Select always interactive and **filter its options** based on the dependency. When the dependency changes, clear the dependent value if it'd be invalid:

```tsx
const endTimeOptions = startTime ? slotsAfter(startTime) : ALL_SLOTS

<Select
  value={startTime}
  onValueChange={(v) => {
    setStartTime(v)
    if (endTime && timeToMin(endTime) <= timeToMin(v)) setEndTime('')
  }}
/>
<Select value={endTime} onValueChange={setEndTime}>
  {/* always enabled, options filter dynamically */}
</Select>
```

Friendlier UX (user can pick either order), zero banned styling, matches `CourseSettingsTab`'s pattern.

---

## Textarea

Same chrome as input but multi-line. Default min-height shows ~3 lines so the user knows it's expandable without dominating the form.

```html
<textarea
  class="min-h-20 w-full px-3 py-2
         bg-surface border border-border rounded-md
         text-sm text-foreground placeholder:text-foreground-muted
         resize-y
         focus-visible:outline-none focus-visible:border-foreground focus-visible:ring-2 focus-visible:ring-foreground/15
         aria-invalid:border-danger-fg aria-invalid:ring-2 aria-invalid:ring-danger-fg/20" />
```

**Rules:**
- `min-h-20` (80px) — three lines visible.
- `resize-y` — only vertical resize. Horizontal resize breaks layouts.
- Padding `px-3 py-2` (not centered like single-line input — multi-line content needs explicit top/bottom padding).
- Same focus / error treatment as input.

---

## Checkbox + radio

Use shadcn `<Checkbox>` / `<RadioGroup>` (Radix). 16px box (`size-4`), `rounded-sm` for checkbox, fully rounded for radio. Label sits to the right of the control with `gap-2` (8px).

```tsx
import { Checkbox } from "@/components/ui/checkbox";

<label className="flex items-center gap-2 cursor-pointer">
  <Checkbox id="terms" />
  <span className="text-sm">Jeg godtar vilkårene</span>
</label>
```

**Rules:**
- Whole row clickable — wrap label + control in a `<label>`.
- Don't use checkboxes for binary settings on the field-group level (e.g. "Send påminnelse"). Use a **toggle/switch** there — checkboxes are for multi-select lists, switches are for binary on/off settings.
- Radio groups: never single-radio. If there's only one option, it's a checkbox.
- Spacing in lists: `space-y-2` between options (8px) — tight but scannable.

---

## Phone input — Norwegian format

8-digit Norwegian phone numbers. **Auto-format as the user types** using an input mask. This was previously specced the opposite way ("don't auto-format, breaks paste") — that's outdated advice. Baymard research: **89% of users enter phone numbers in formats different from what the field expects**, even with placeholder hints. Auto-formatting cuts validation errors and form abandonment, especially on mobile. Modern masks (e.g. `react-imask`, `cleave.js`) handle copy/paste correctly — they detect pasted content and re-format it, rather than blocking the paste.

```tsx
import { IMaskInput } from "react-imask";

<IMaskInput
  mask="000 00 000"            // 8 digits with spaces
  inputMode="tel"
  type="tel"
  className="h-9 w-full px-3 bg-surface border border-border rounded-md
             text-sm tabular-nums text-foreground"
  onAccept={(value: string) => setPhone(value.replace(/\s/g, ""))}
/>
```

**Rules:**
- **Auto-format with mask**, mask string `000 00 000` for Norwegian 8-digit format.
- `inputMode="tel"` for the right mobile keyboard.
- `tabular-nums` so digits column-align as they're entered.
- **Strip spaces on submit** — store the raw 8-digit string, not the formatted view.
- **Accept pasted content gracefully** — if the user pastes `+4798765432` or `987 65 432`, the mask should normalize. `react-imask` does this; verify the chosen library does too.
- **No placeholder.** Do not use `9xx xx xxx` (or any format hint) as placeholder. The `Telefon` label identifies the field; the mask shapes the digits as the user types. A placeholder here adds visual noise, vanishes the moment a digit lands, and reads as a fake value. If a format hint is genuinely needed, put it in helper text below the field.
- For international support later: prefix country-code dropdown left of the field with mask switching by country. Out of scope for v1 (Norwegian-only audience).

---

## Search input

Icon left, optional clear (×) right. Used for filtering lists and searching content.

```tsx
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-foreground-muted" />
  <input
    type="search"
    placeholder="Søk i kurs…"
    className="h-9 w-full pl-9 pr-9 bg-surface border border-border rounded-md text-sm" />
  {value && (
    <button onClick={clear} aria-label="Tøm søk"
      className="absolute right-2 top-1/2 -translate-y-1/2 size-6 grid place-items-center
                 text-foreground-muted hover:text-foreground rounded">
      <X className="size-3.5" />
    </button>
  )}
</div>
```

**Rules:**
- `pl-9` to clear the icon, `pr-9` to clear the (optional) clear button.
- Placeholder: imperative — `Søk i kurs…`, `Søk på navn…` — never `Search`.
- Clear button only when there's a value (`value && ...`).
- Don't add a "Search" submit button — search is live (`onChange` debounced ~200ms).
- For app-wide search (commands), use Cmdk (`<CommandDialog>`) instead — different pattern, see customer-flow doc.

### Layout when paired with filters or tabs

When a list page has BOTH a filter row (tabs / pills / segmented) AND a search input, they live on the **same row but at opposite ends**: filters left, search right. Use `flex justify-between` on the container.

```html
<div class="flex items-center justify-between gap-4 border-b border-border">
  <!-- Filters / tabs anchored left -->
  <nav class="flex gap-6">
    <button class="...">Kommende</button>
    <button class="...">Tidligere</button>
  </nav>

  <!-- Search anchored right -->
  <SearchInput placeholder="Søk på navn…" />
</div>
```

**Why:** filters are *browsing* tools (the user explores buckets); search is a *destination* tool (the user knows what they want). Different mental modes deserve different anchors. Putting them at opposite ends:
- Keeps the filter row visually focused as a single unit (left-aligned, where the eye starts).
- Gives search its own corner so it doesn't compete with filter scanning.
- Consistent with Linear, Notion, GitHub, Cal.com — every calm reference dashboard does this.

**Rules for this combined layout:**
- Search input on this row: `h-8` (32px), narrower than the standard `h-9` form input. It's a list-page convenience, not a primary form field.
- Search width: ~`200-260px` desktop. Don't stretch full-width.
- On mobile: filters and search collapse to two stacked rows (search above filters, since on mobile search is more often the entry point).

---

## File upload — drag-drop zone

For course cover images, profile photos, document attachments. Dashed border zone that accepts drag-drop or click-to-browse, transitions to a thumbnail preview after upload.

```tsx
// Three explicit visual states: rest, drag-over, uploading
const [dragOver, setDragOver] = useState(false);

<div
  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
  onDragLeave={() => setDragOver(false)}
  onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
  className={cn(
    "border border-dashed rounded-lg p-8 cursor-pointer text-center",
    "flex flex-col items-center gap-2",
    "transition-colors duration-150",
    dragOver
      ? "border-foreground bg-muted"      // drag-over: solid border + faint fill
      : "border-border hover:bg-muted/50"  // rest + hover
  )}
>
  <Upload className="size-5 text-foreground-muted" />
  <p className="text-sm">
    <span className="font-medium">Klikk for å laste opp</span>
    <span className="text-foreground-muted"> eller dra og slipp</span>
  </p>
  <p className="text-xs text-foreground-muted">PNG eller JPG · Maks 5 MB</p>
  <input type="file" accept="image/png,image/jpeg" className="sr-only" />
</div>
```

**With preview after upload:**
```tsx
<div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-surface">
  <img src={preview} className="size-16 rounded-md object-cover" />
  <div className="flex-1 min-w-0">
    <p className="text-sm font-medium truncate">{filename}</p>
    <p className="text-xs text-foreground-muted">{formatSize(filesize)}</p>
  </div>
  <button onClick={remove} aria-label="Fjern bilde"
    className="size-8 grid place-items-center text-foreground-muted hover:text-foreground rounded-md">
    <X className="size-4" />
  </button>
</div>
```

**Rules:**
- **Three explicit visual states**: rest (`border-border` dashed), drag-over (`border-foreground` solid + `bg-muted`), uploading (progress indicator inside the zone). Don't add a `scale-105` flourish on hover/drag — that's an AI-default polish that adds motion noise. Color/border change is enough.
- **Click target = whole zone**, not just the button. NN/g: 35% of users prefer click-to-browse over drag, especially on touch — the zone must be big and obviously clickable.
- **Copy: action first**, alternative second. `Klikk for å laste opp` (primary) → `eller dra og slipp` (secondary, muted). On touch devices the "dra og slipp" half is irrelevant; it stays in the copy because device detection in CSS is unreliable, but the primary action is what's emphasized.
- **Always show constraints**: format + max size below the action. Surfacing constraints before the user picks a file prevents post-upload errors.
- **After upload**: replace the dashed zone with thumbnail + filename + remove button. Don't keep the dashed-zone visible after a file is selected — confuses "is there a file or not." Removal returns to the rest state.
- **Microcopy on errors**: state what failed and how to fix. `Filen er for stor (8 MB) — maks 5 MB.` not `Upload failed.`

---

## Drawer — quick-glance panel for clickable rows

The triage-from-list pattern. Read-only body, one escape link to the full page. Full doctrine in `patterns.md` § 15.

### Composition — view drawer (the default)

```tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Link } from "react-router-dom";

<Sheet open={open} onOpenChange={setOpen}>
  <SheetContent
    side="right"
    className="w-full sm:max-w-[480px] p-0 flex flex-col gap-0"
  >
    {/* Header — title + status */}
    <SheetHeader className="px-6 py-4 border-b border-border">
      <SheetTitle className="text-base font-semibold">Vinyasa Flow</SheetTitle>
    </SheetHeader>

    {/* Body — scrollable, read-only */}
    <div className="flex-1 overflow-y-auto">
      {/* status, when/where, quick actions, participants preview */}
    </div>

    {/* Footer — single escape link, nothing else */}
    <div className="border-t border-border px-6 py-4 bg-background">
      <Button variant="ghost" size="sm" asChild
        className="-ml-2 text-foreground-muted hover:text-foreground"
      >
        <Link to={`/courses/${id}`} onClick={() => setOpen(false)}>
          Åpne kursside
        </Link>
      </Button>
    </div>
  </SheetContent>
</Sheet>
```

### Composition — quick-create drawer (the exception)

For "Create X" flows the entity doesn't exist yet, so an "Åpne X-side" link makes no sense. A trimmed quick-create drawer with bare-minimum fields is allowed. Density ceiling: ≤8 fields, one section, validation on submit, no advanced options. On successful create, navigate to `/resource/:newId` (the full page where the user refines).

```tsx
<SheetContent side="right" className="w-full sm:max-w-[480px] p-0 flex flex-col gap-0">
  <SheetHeader className="px-6 py-4 border-b border-border">
    <SheetTitle>Opprett kurs</SheetTitle>
    <SheetDescription className="text-xs text-foreground-muted">
      Bare det viktigste — du kan endre alle detaljer på kurssiden etterpå.
    </SheetDescription>
  </SheetHeader>
  <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
    {/* 6–8 essential fields, no advanced options */}
  </div>
  <div className="border-t border-border px-6 py-4 flex justify-end gap-2 bg-background">
    <Button variant="ghost" size="sm" onClick={onCancel}>Avbryt</Button>
    <Button size="sm" onClick={onCreate}>Opprett</Button>
  </div>
</SheetContent>
```

### Mobile pairing — Vaul drawer

```tsx
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-is-mobile";

function DetailPanel({ children, open, onOpenChange, title }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
          </DrawerHeader>
          {/* same body + footer pattern */}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] p-0">
        {/* same body + footer */}
      </SheetContent>
    </Sheet>
  );
}
```

### Specs

| Property | Value |
|----------|-------|
| **Desktop width** | `w-full sm:max-w-[480px]` |
| **Mobile** | Full viewport, ~80vh default, expandable |
| **Side (desktop)** | `right` |
| **Side (mobile)** | `bottom` (Vaul slides up) |
| **Backdrop** | `bg-foreground/20` (subtle dim) |
| **Animation** | Slide from edge, 200ms ease-out (uses motion tokens) |
| **Header padding** | `pl-6 pr-4 py-3` |
| **Header title** | `text-sm font-semibold` (label-like, not heroic) |
| **Body padding** | `p-6` |
| **Footer padding** | `px-6 py-3` |
| **Footer border** | `border-t border-border` |
| **Header border** | `border-b border-border` |

### Three structural parts

**Header** — title left, × button right. Trimmed (`py-3`, `text-sm`) so the title reads as a label, not a heroic page title:

```html
<div class="pl-6 pr-4 py-3 border-b border-border flex items-center justify-between">
  <h2 class="text-sm font-semibold text-foreground">Påmelding</h2>
  <button aria-label="Lukk" class="size-8 grid place-items-center rounded-md
                                   text-foreground-muted hover:text-foreground hover:bg-muted">
    <svg class="size-4" viewBox="0 0 16 16">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5"
            fill="none" stroke-linecap="round"/>
    </svg>
  </button>
</div>
```

**Why these specs:**
- `py-3` (12px top/bottom) instead of `py-4` (16px) — saves 8px of vertical chrome
- `text-sm font-semibold` (14px / 600) instead of `text-base` (16px) — title reads as a quiet label, not a competing element with the body's first section heading
- No subtitle / description in the header by default — body explains itself
- Status badge can sit inline with the title for view drawers (`<span class="badge badge-rect badge-success">Betalt</span>`)
- All drawers have a title — accessibility (`aria-labelledby`) and convention require it. Don't skip the title; trim the header instead.

**Body** — scrollable content area:
```html
<div class="flex-1 overflow-y-auto p-6 space-y-4">
  <!-- form fields, status info, etc. -->
</div>
```

**Read-only detail body — stacked label/value pairs.** When the drawer body shows metadata about an existing record (Betalingsdetaljer, Påmelding info, customer profile), use **vertical stacked layout** — label muted on top, value foreground below — not a horizontal `120px 1fr` grid.

```html
<!-- ✓ Stacked — facts about this thing -->
<div class="space-y-4">
  <div>
    <p class="text-xs font-medium text-foreground-muted">Dato</p>
    <p class="mt-0.5 text-sm text-foreground tabular-nums">12. mai 2026 kl. 14:32</p>
  </div>
  <div>
    <p class="text-xs font-medium text-foreground-muted">Metode</p>
    <p class="mt-0.5 text-sm text-foreground">Vipps</p>
  </div>
  <div>
    <p class="text-xs font-medium text-foreground-muted">Referanse</p>
    <p class="mt-0.5 text-sm text-foreground tabular-nums">DT-2026-04781</p>
  </div>
</div>

<!-- ✗ Horizontal grid — reads as spreadsheet row -->
<div class="grid grid-cols-[120px_1fr] gap-4 text-sm">
  <span class="text-foreground-muted">Dato</span>
  <span class="tabular-nums">12. mai 2026 kl. 14:32</span>
  <!-- ... -->
</div>
```

**Why stacked beats horizontal:**
- Stacked reads as *"facts about this thing"*; horizontal reads as *"a row in a database table."*
- Long values (timestamps, references, full names) wrap naturally in stacked. In `120px 1fr` they collide with the column boundary or wrap awkwardly.
- Stacked scales to mobile without a layout swap (already vertical); horizontal needs a responsive break.
- Calmer for non-power-user audiences (yoga teacher reading a payment) — flat data table reads as "information I need to scan/compare," stacked reads as "information I need to read."

**Where this applies:**
- Read-only drawer bodies (Betalingsdetaljer, Påmelding info)
- Customer profile / settings pages
- Any "detail of one record" view

**Where it does NOT apply:**
- Forms — `label-above-input` is already stacked; this rule is about *display* not editing.
- Tables / list rows — those are scanning/comparing, where horizontal density is the point.
- Order summaries with `space-between` totals (price breakdown in a receipt) — that's a price table, not metadata.

Pattern observed in Linear's issue detail right rail.

**Footer** — sticky, right-aligned actions:
```html
<div class="border-t border-border px-6 py-3 flex justify-end gap-2 bg-surface">
  <Button variant="secondary" size="sm">Avbryt</Button>
  <Button size="sm">Lagre endringer</Button>
</div>
```

### Close behavior — three affordances, all required

1. **× button in header** (always present, accessibility requirement)
2. **Escape key** (Radix handles this)
3. **Click on backdrop** (Radix default, can be disabled with `onPointerDownOutside`)

If the drawer has unsaved form changes, intercept dismiss and confirm via dialog (#12) — but only when there ARE unsaved changes.

### Footer action conventions

| Drawer purpose | Footer |
|---------------|--------|
| Edit existing record | `[Lagre endringer]` (right-aligned, no Avbryt) |
| Create new record (rare) | `[Opprett]` (right-aligned, no Avbryt) |
| Pure view | No footer |
| Detail with destructive actions | Primary footer + kebab menu in header for "Refunder", "Slett", etc. |

**Drop `[Avbryt]` from all drawer footers.** The drawer already has three close affordances (× button, Esc, backdrop tap when clean) per `patterns.md` §15.4. A fourth Cancel button in the footer is visual noise that fights the primary action for attention. Modern reference apps — Linear new-issue, Notion add-page, Stripe checkout — all drop it. Primary action only, right-aligned, `size="sm"` (32px).

For drawers with form input, pair this footer with the **silent backdrop block** when dirty (see `patterns.md` §15.4) — that's the safety mechanism that replaces a Cancel button's "let me back out" affordance.

### Anti-patterns (cross-reference patterns.md § 15.8)

- No drawer stacking
- No edit/view toggle (inline-edit by default)
- No drawer wider than 560px
- No drawer for "Are you sure?" confirmations (use Dialog #12)
- No swipe-only dismiss on mobile
- No persistent (non-modal) drawer

---

## Sectioned form — the create-course pattern

Studio's replacement for multi-step wizards (#16). A single form with section headings divided by spacing, dividers, and clear typography. Usually lives inside a drawer (#15); can also live on a page for very long forms.

```html
<div class="flex-1 overflow-y-auto p-6 space-y-8">

  <!-- First section — no top border -->
  <section>
    <h3 class="text-base font-semibold">Grunnlag</h3>
    <p class="mt-1 text-sm text-foreground-muted">Navn og type bestemmer hvordan kurset vises i bookinglenken.</p>
    <div class="mt-4 space-y-4">
      <!-- form fields, label + input pairs -->
    </div>
  </section>

  <!-- Subsequent sections — top border for visual chunk -->
  <section class="pt-8 border-t border-border">
    <h3 class="text-base font-semibold">Timeplan</h3>
    <div class="mt-4 space-y-4">
      <!-- DateField + TimeField + DurationField row -->
    </div>
  </section>

  <section class="pt-8 border-t border-border">
    <h3 class="text-base font-semibold">Pris og kapasitet</h3>
    <div class="mt-4 space-y-4">
      <!-- Pris (with kr suffix), Maks deltakere -->
    </div>
  </section>
</div>
```

**Spacing rules (sourced from vertical-rhythm research):**

| Position | Spacing |
|----------|---------|
| Between fields within a section | `space-y-4` (16px) |
| Between sections | `space-y-8` (32px) — implicit via `pt-8` on section 2+ |
| Section heading → fields | `mt-4` (16px) |
| Section heading → optional description | `mt-1` (4px) |
| Section heading → `border-t` (when not first) | `pt-8` (32px above) |

**Section heading typography:**
- `text-base font-semibold` (16px / 600) — same tier as a card title
- Optional one-line description in `text-sm text-foreground-muted` directly below
- Skip the description if the section name is self-explanatory ("Pris og kapasitet" doesn't need one)

**Section dividers:** the first section has no top border; sections 2+ get `pt-8 border-t border-border`. The border is what visually chunks the form.

**When to skip the divider:** if the form has only 2 sections AND fewer than 6 fields total, drop the divider — the vertical spacing alone is enough chunk.

**When to skip section headings entirely.** A section H2 (`text-base font-semibold`) over field labels (`text-sm font-medium`) is only a 2px size step and one weight step — not enough delta. The eye can't tell which is the container and which is the thing, hierarchy collapses, and the page reads as messy. Before adding a section H2, apply the **three-knob check**:

1. **Size delta** — at least 4px between heading and label. `text-base` (16) → `text-sm` (14) is only 2px. Prefer `text-lg`+ (18px) when keeping the H2.
2. **Weight delta** — `font-semibold` over `font-medium` is one step. Pair with size, never alone.
3. **Space delta** — the gap *before* the heading must be 2× the gap inside the section. If fields are `space-y-4` (16px), the heading needs `pt-8` (32px) above. `mb-4` *under* the heading is the inverse mistake — closes the gap.

**The shortcut:** if the form has ≤6 fields OR one coherent purpose, **drop the H2s entirely.** The page/drawer H1 + field labels are enough hierarchy. Use spacing (`space-y-5` between blocks, or the `space-y-6` airy default) to group; reach for a horizontal divider only when categories are genuinely distinct (e.g. "Personal info" vs "Shipping address").

Stripe / Linear default to no section H2s on short forms — they get hierarchy from the page H1 + label-to-input rhythm. Reach for H2s only when the form is long enough that scanning or skipping helps. Quick-create drawers almost never qualify.

**Footer pattern** (when in a drawer): sticky bottom with Cancel + primary action. See drawer pattern (#15) and primary button (#components.md § Button).

---

## Setup checklist — onboarding alternative to wizard

Studio's replacement for multi-step onboarding wizards (#16). A dedicated page with task rows the user can tackle in any order.

**Why this pattern (vs. wizards or "do nothing"):**
- The checklist is contextual help — without it, 84% of users abandon when blank states give them nothing to act on. A short list of named tasks IS the help.
- A wizard forces order, hides the shape of the work, and feels patronizing to teachers who already know what they're setting up. The checklist shows everything at once and lets the user choose where to start.
- A simple progress count (`2 av 4 fullført`) gives quiet feedback without nagging — the Zeigarnik nudge of an unfinished count is enough; the system doesn't need to push beyond that.

**Item count: 3-5 max.** The earlier draft showed 6 — that's already over the consensus cap. **3-5 is the research-backed sweet spot.** Beyond 5 the work piles up; below 3 there's nothing meaningful to track. For a yoga teacher's first studio, the canonical 4 are:

1. **Studio-info** — name, beskrivelse, logo
2. **Opprett ditt første kurs**
3. **Sett opp Vipps og kort for betaling**
4. **Del bookinglenken din**

```html
<main class="max-w-3xl mx-auto px-6 py-12">
  <header class="flex items-baseline justify-between mb-8">
    <h1 class="text-3xl font-semibold tracking-tight">Kom i gang</h1>
    <p class="text-sm text-foreground-muted tabular-nums">2 av 4 fullført</p>
  </header>

  <div class="rounded-lg border border-border overflow-hidden">

    {/* Completed task */}
    <a href="..." class="flex items-center gap-4 px-5 py-4 border-b border-border
                         hover:bg-muted no-underline">
      <span class="size-5 rounded-full grid place-items-center bg-success-subtle text-success shrink-0">
        <CheckIcon className="size-3" />
      </span>
      <div className="flex-1">
        <p className="text-base font-medium text-foreground-muted">Studio-info</p>
        <p className="text-sm text-foreground-muted">Navn, beskrivelse, og kontaktinfo</p>
      </div>
      <ArrowRightIcon className="size-4 text-foreground-muted" />
    </a>

    {/* Pending task — all pending tasks look the same, no "next up" emphasis */}
    <a href="/courses/new" className="flex items-center gap-4 px-5 py-4 border-b border-border hover:bg-muted no-underline">
      <span className="size-5 rounded-full border-2 border-border shrink-0" />
      <div className="flex-1">
        <p className="text-base font-medium text-foreground">Opprett ditt første kurs</p>
        <p className="text-sm text-foreground-muted">Få en bookingside du kan dele</p>
      </div>
      <ArrowRightIcon className="size-4 text-foreground-muted" />
    </a>

    {/* Another pending task — visually identical */}
    <a href="..." className="flex items-center gap-4 px-5 py-4 hover:bg-muted no-underline">
      <span className="size-5 rounded-full border-2 border-border shrink-0" />
      <div className="flex-1">
        <p className="text-base font-medium text-foreground">Sett opp betaling</p>
        <p className="text-sm text-foreground-muted">Vipps og kortbetaling</p>
      </div>
      <ArrowRightIcon className="size-4 text-foreground-muted" />
    </a>
  </div>
</main>
```

### Task states

| State | Status icon | Title |
|-------|------------|-------|
| **Pending** | `size-5 rounded-full border-2 border-border` (empty circle, hairline) | `text-foreground font-medium` |
| **Complete** | `bg-success-subtle text-success` filled circle + ✓ (size-3) | `text-foreground-muted` (dimmed) |

All pending tasks look the same. There's no "first-value" or "next up" tier — the system doesn't tell the user which task to pick first.

### Rules

- **No forced order, no implied order.** Don't grey out / disable tasks based on dependencies. Don't visually emphasize one pending task over another (no row tint, no darker circle outline). The user picks. If a task has prerequisites, surface them on the destination page when the user arrives.
- **No time estimates** (`~3 min`, `~5 min`). The intent is good (reduce uncertainty) but the effect feels prescriptive and AI-template-y, especially when the user might do the task in 30s or 30m depending on their context. Trust the user.
- **Frame description as a *benefit*, not a *feature*.** Bad: `Sett opp kurset, datoer, og pris`. Good: `Få en bookingside du kan dele`. The user wants the outcome.
- **Auto-detect completion.** If the user creates a course via the courses page (not via the checklist link), the checklist task auto-marks complete. Onboarding tracks *outcomes*, not navigation paths. This is invisible behavior — the user just notices the ✓ next time they visit the checklist.
- **Progress indicator: simple count** — `2 av 4 fullført`, top-right of the page header in `text-sm text-foreground-muted tabular-nums`. Not a sentence with predictions, not a progress bar. The number speaks for itself.
- **The ✓ on complete tasks is the one place Studio uses success green** in the dashboard. It's the earned positive moment of onboarding. Don't extend the precedent to other dashboard contexts.
- **Sidebar nav routing:** the checklist gets a sidebar nav item — no count badge (Studio doesn't carry attention indicators on nav items). Auto-redirect new users here on first sign-in. **Hide the nav item once all tasks complete** — keeping it visible adds chrome with no purpose.
- **Don't show a celebration modal** when the last task completes. A toast (#11) saying "Du er klar! Studioet er satt opp." is the right size for this app.

### Empty states ARE onboarding

Beyond this dedicated page, **every empty state in Studio is an onboarding surface.** Research basis: users encounter empty states more often than any onboarding modal or tour, and 84% of users who hit a blank state without contextual help abandon the session. The empty state IS where onboarding happens.

The pattern (already specced as Empty State, applied with the onboarding lens):
- **State what's missing** plainly (`Ingen kurs ennå`).
- **State why creating one matters** in one short line (`Lag et kurs så kan du dele booking-lenken`).
- **One primary action** that creates the missing thing.
- **No illustrations.** Studio's calm tone means typography + button is enough; cute spot illustrations are an AI-default tell.

A user who hits `/courses` for the first time sees the empty state with a CTA — that's onboarding. They didn't need a tour, a modal, or a checklist nav click. The empty state did the work.

### Personalization at sign-up — one routing question

Top-converting products ask **one routing question at sign-up** that shapes the downstream onboarding. For Studio:

```
Hva vil du tilby?
  ◯ Yoga / pilates / meditasjon  (default)
  ◯ Trening (gym, PT)
  ◯ Workshops / kurs (annet)
```

This single answer can:
- Pre-fill the first course's `course_type` and example tags
- Adjust placeholder copy in `Studio-info` (e.g., "Hot yoga" vs "Crossfit" hints)

Don't make this question mandatory or block sign-up on it — it's a *quality-of-default* boost, not a routing gate. If skipped, default to "Yoga / pilates / meditasjon."

---

## DateField — calendar in popover

For admin forms (course creation, edit, filtering). Built from shadcn `<Popover>` + `<Button variant="outline">` + `<Calendar>` (react-day-picker).

```tsx
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { Calendar as CalendarIcon } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

<Popover>
  <PopoverTrigger asChild>
    <Button
      variant="outline"
      className={cn(
        "w-full h-9 px-3 justify-between font-normal rounded-md",
        !date && "text-foreground-muted"
      )}
    >
      {date ? format(date, "d. MMMM yyyy", { locale: nb }) : "Velg dato"}
      <CalendarIcon className="size-4 opacity-50" />
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-auto p-0" align="start">
    <Calendar
      mode="single"
      selected={date}
      onSelect={setDate}
      disabled={{ before: new Date() }}
      locale={nb}
      weekStartsOn={1}
      initialFocus
    />
  </PopoverContent>
</Popover>
```

**Important shadcn config notes:**
- Use `variant="outline"` on the Button trigger — it's functionally an input, looks identical to a text input
- Override the Button's default pill shape with `rounded-md` (rect, matching form inputs)
- `font-normal` overrides Button's default `font-medium` (the trigger is "input" rhythm, not "button" rhythm)

### Calendar day cell states

| State | shadcn class / treatment |
|-------|-------------------------|
| Default (current month, available) | text-foreground · hover `bg-muted rounded-full` |
| Today | `[&[aria-current=date]]:ring-1 ring-foreground/30 rounded-full` |
| Selected | `bg-foreground text-background rounded-full` |
| Disabled (past) | `text-foreground-disabled cursor-not-allowed` (no hover) |
| Other month | `text-foreground-disabled` (dimmer) |

The selected day is a **filled circle** (`rounded-full`), not a square. Matches Apple/Cal.com convention; visually distinct from cell hover.

### Calendar header

- Month + year label centered (e.g., `mai 2026`)
- Prev/next month arrows (chevron icons), `btn-ghost icon-sm`
- Day-of-week row: Norwegian Bokmål — `M T O T F L S` (Mon-first)

---

## TimeField — select with 15-min intervals

Built from shadcn `<Select>`. Generates options at 15-min steps.

```tsx
<Select value={time} onValueChange={setTime}>
  <SelectTrigger className="h-9 rounded-md">
    <SelectValue placeholder="Velg tid" />
  </SelectTrigger>
  <SelectContent>
    {generateTimeOptions(15).map((t) => (
      <SelectItem key={t} value={t}>{t}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

```ts
function generateTimeOptions(intervalMinutes: number = 15): string[] {
  const options: string[] = [];
  for (let h = 6; h <= 23; h++) {
    for (let m = 0; m < 60; m += intervalMinutes) {
      options.push(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      );
    }
  }
  return options;
}
```

**Rules:**
- 15-min intervals (06:00, 06:15, 06:30…)
- 24h format ("18:00"), Norwegian convention. Never AM/PM.
- Range 06:00 to 23:45 by default — adjust per studio if needed
- On mobile, the native `<select>` opens the OS time picker — don't replace

---

## DurationField — number input with "min" suffix

Built from shadcn `<Input type="number">` with an absolutely-positioned suffix label.

```tsx
<div className="relative">
  <Input
    type="number"
    min={15}
    step={15}
    value={duration}
    onChange={(e) => setDuration(Number(e.target.value))}
    className="pr-12"
    placeholder="60"
  />
  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-foreground-muted pointer-events-none select-none">
    min
  </span>
</div>
```

**Rules:**
- `type="number"` — numeric keypad on mobile
- `min={15}`, `step={15}` — validation + arrow-key increments
- Suffix "min" is purely visual (`pointer-events-none`), sits inside the input via absolute positioning
- `pr-12` reserves right-side space for the suffix
- Helper text below for common values: `"45 / 60 / 75 / 90 minutter er vanlig"`

---

## Page state shell

One layout, four variants — 404, 500, permission denied, page-loading. Same shell handles all four; they differ only in headline / supporting / actions. Users never have to learn multiple page-error designs.

### The shell — page-level, no card chrome

The page-level state lives directly on the page canvas — **no card border around it**. Single primary CTA; secondary path is an **inline arrow link below**, not a side-by-side ghost button.

**No "404" eyebrow, no "Error" eyebrow** — eyebrows are developer-speak. The headline already says what happened in plain language.

```html
<main class="min-h-[60vh] flex flex-col items-center justify-center text-center px-6 py-12">
  <h1 class="text-2xl font-semibold tracking-tight max-w-md">{{ headline }}</h1>
  <p class="mt-3 text-sm text-foreground-muted max-w-md">{{ supporting }}</p>
  <button class="mt-7 btn btn-primary btn-sm">{{ primary action }}</button>
  <a class="mt-3 text-sm text-foreground-muted underline decoration-foreground-muted/40 underline-offset-2 hover:decoration-foreground-muted">
    {{ secondary inline link, optional }} →
  </a>
</main>
```

**Why no card:**
- The error IS the page — wrapping it in a card adds chrome that says "boxed UI element," not "current page state"
- Cards-around-error-pages is the canonical AI/SaaS template render
- Removing the card matches Linear, Vercel, GitHub, Notion's actual error pages

**Why single CTA + inline link (not dual button):**
- Two side-by-side buttons (primary pill + ghost) gives competing visual weight to two paths
- Inline arrow link is a calmer secondary — clearly available, doesn't compete with the primary
- For non-power-users, one obvious action wins

### 404 — page not found

The user's concern was real: a generic "Til startsiden" button can take someone to the wrong place if they came from a deleted course URL. The fix is a **smart fallback button** that's context-aware:

```ts
function handleBackOrFallback(fallbackUrl = '/kurs') {
  // Came from inside the app? Go back to where they were.
  if (window.history.length > 1 && document.referrer.startsWith(window.location.origin)) {
    window.history.back();
    return;
  }
  // Came from external link → land them on the courses listing where they can find what they wanted
  window.location.href = fallbackUrl;
}
```

- Headline: `Vi finner ikke den siden du leter etter`
- Supporting: `Lenken er kanskje utdatert, eller siden er flyttet.`
- Primary: `Gå tilbake` → `handleBackOrFallback('/kurs')`
- Inline link: `eller gå til startsiden →`

### 500 — server error

- Headline: `Noe gikk galt`
- Supporting: `Prøv igjen om noen sekunder. Hvis problemet vedvarer, ta kontakt.`
- Primary: `Last på nytt` → `window.location.reload()`
- Inline link: `eller gå til startsiden →`

### Permission denied

- Headline: `Du har ikke tilgang til denne siden`
- Supporting: contextual — `Logg inn med en konto som har tilgang, eller be eieren invitere deg.`
- Primary: `Logg inn` (when sign-in is the path) or `Gå til startsiden`
- Inline link: `eller gå til startsiden →` (when primary is `Logg inn`)

### Page-level loading — full skeleton matching the page

Match the dimensions of the actual page. Use `animate-pulse` (Tailwind default) — pulse fits Studio's calm aesthetic; shimmer reads as more energetic.

See `references/patterns.md` § 13.5 for the full skeleton template.

---

### Placeholder text — rules

Research-backed (NN/G "Placeholders are harmful" + WCAG 3.3.2 + WCAG 1.4.3) and cross-referenced against 10 real apps (Stripe, Cal.com, Notion, Linear, Plain, Storytel, Posten, Ruter, Norwegian.com, Oda). Top-tier SaaS converged on **labels-only, zero placeholder by default** for simple text fields.

#### The default: no placeholder

Most fields ship with **no placeholder.** The label above the input carries the meaning. Stripe, Cal.com, and Storytel (Norwegian SaaS) all do this on email / name / password fields — and they're the apps with the strongest design reputations in the set.

The mental model: **the label tells you what the field is for; the empty field is honest about what you need to do.** Placeholder text adds visual noise, disappears the moment a user types, and frequently fails contrast. Default to none, opt-in only for the cases below.

#### Visual consistency within a form (the per-form rule)

**Apply placeholder treatment per-form, not per-field.** If a form has two adjacent fields and one has a placeholder while the other doesn't, the empty field looks visually different from the placeholdered one — they read as different states even though both are empty. This is a genuine UX problem.

The Stripe / Cal.com pattern: in a multi-field form (Email + Full name + Password, or Navn + E-post + ...), **either all simple text fields have placeholders or none do** — and "none" is the calmer default. Don't mix.

This means email placeholders like `navn@eksempel.no` get dropped from forms that also have a Navn (no format) field — even though `navn@eksempel.no` is a legitimate format example in isolation. The visual consistency of the form trumps the marginal format-illustrating help, *especially* since `type="email"` already enforces the format and most users know what an email address is.

**Exceptions that override visual consistency** — when format help is genuinely necessary even at the cost of mismatch:
- **Manual date entry without a picker** (`dd.mm.åååå`). Picker-driven date inputs don't need this; manual-entry ones do.

The exception fields are typically the only ones in their form that need the hint — and the visual difference reads as "this field has a specific format" rather than as "the form is inconsistent."

**Phone is NOT an exception.** Do not use `9xx xx xxx` as a placeholder on the `Telefon` field. The auto-formatting input mask (see "Phone input — Norwegian format") shapes the digits as the user types — the format reveals itself on first keystroke. The placeholder reads as a fake value, vanishes the moment the user types, and clutters the calm surface. Label-only on phone. If you genuinely need a format hint (rare), use helper text below the field, not a placeholder.

#### When a placeholder earns its place

Three legitimate uses:

| Case | Pattern | Example |
|---|---|---|
| **Format example** — when the label can't convey the literal format | Format string only, no prose prefix | `navn@eksempel.no` (email format example) · `dd.mm.åååå` (manual date entry). **Not phone** — the auto-format mask conveys shape on first keystroke; no placeholder needed. |
| **Search inputs** — scope clarification | Imperative + scope + ellipsis | `Søk i kurs…` · `Søk på navn…` · `Søk i påmeldinger…` |
| **Textareas with free-form input** — instructional context | Full sentence, calm tone | `Eventuelle merknader. F.eks. allergier eller andre hensyn.` (cancel reason / booking notes) |

Anywhere outside those three cases, the answer is "no placeholder."

#### Placeholder text discipline (Norwegian conventions)

- **Generic email format** = `navn@eksempel.no`. Never `name@company.com` (English domain) or `anna@eksempel.no` (attaches a fake person to an empty field).
- **Search prefix** = lowercase imperative + `…` (proper ellipsis character `…`, not three periods). `Søk i kurs…` not `Søk i kurs ...` and not `Search...`.
- **No prose prefixes.** Never `F.eks. ...` / `Skriv inn ...` / `Tast ...` — they read as instructional clutter and disappear on type. The format itself is enough.
- **No example values.** `Anna Berg` for a Navn field, `Vinyasa Flow` for a course name field, `2 200 kr` for a Pris field — these are *example data*, not format. They confuse rather than inform. Drop them.
- **Sentence case throughout.** Same as everywhere else in the system.

#### Color: WCAG 1.4.3 minimum

**Placeholder color must be `text-foreground-muted` (sand-11 / `#60646c`)**, NOT `text-foreground-disabled` (sand-8 / `#b9bbc6`).

| Color | Contrast on white | WCAG 1.4.3 AA (4.5:1) |
|---|---|---|
| `sand-8` (`#b9bbc6`) — disabled tier | ~2.5:1 | ❌ FAILS |
| `sand-11` (`#60646c`) — muted tier | ~5.6:1 | ✓ PASSES |

Beyond the contrast issue, sand-8 sends the wrong semantic signal — it makes the placeholder look *disabled* when the field is actually *active and waiting for input*. Two different states should not share a color.

This applies to **all placeholder-equivalent contexts**: text-input `::placeholder`, date-picker trigger empty state (`Velg dato`), time-picker trigger empty state (`Velg tid`), Select trigger empty state (`Velg type`), etc.

#### Where NOT to put a placeholder

- **`type="number"` / `type="date"` / `type="time"`** — native widget hints already cover the format. Doubled signal.
- **Disabled fields** — disabled has its own treatment (`opacity-50 bg-muted`). No placeholder.
- **Read-only fields** — they show a value or are empty by design. No placeholder.
- **As the only label.** Always pair with a visible `<label>` above the field (WCAG 3.3.2 — placeholder is not an accessible name; screen readers don't treat it as a label). The Posten/Ruter/Oda pattern of placeholder-as-label is a regulation-grade accessibility violation, common in Norwegian utility/transit but explicitly rejected for Studio.

#### Persistent guidance — use helper text, not placeholder

When a field needs *guidance the user should keep seeing while typing* (e.g., "we'll send confirmation here," "must be 12+ characters"), use **helper text below the field** — NOT a placeholder. Placeholder text disappears the moment the user starts typing, taking the guidance with it.

```html
<div class="grid gap-2">
  <label for="email">E-postadresse</label>
  <input id="email" type="email" placeholder="navn@eksempel.no" />
  <p class="text-sm text-foreground-muted">Vi sender bekreftelse hit etter booking.</p>
</div>
```

Pattern: `label` (always visible, above) → `input` (with optional format placeholder) → `helper text` (always visible, below) → `error text` (replaces helper on validation error).

#### Audit checklist when reviewing a form

For every field in a form, ask:
1. Is there a visible `<label>` above? (Required.)
2. If there's a placeholder, is it a *format example*, *search scope*, or *textarea instruction*? (If not, drop it.)
3. **Are placeholders applied consistently across the form?** If field A has a placeholder and field B doesn't, the eye reads them as different states. Either both have placeholders, or neither does. The exception is genuine format-help fields (manual date entry without picker) that visually self-identify as "specific format required." **Phone is not such an exception** — the auto-format mask handles shape; no placeholder.
4. Does the placeholder color use `text-foreground-muted` or equivalent? (If `disabled` color, fix it.)
5. Is critical guidance in the placeholder rather than helper text below? (If so, move it to helper text.)
6. Is the placeholder repeating the label? (If so, it's noise — drop it.)
7. Does the placeholder name a fake person, course, or amount? (If so, it's example data, not format — drop it.)

---

## Badge

Single primitive with three dimensions: `variant`, `shape`, `size`.

| Prop | Values |
|------|--------|
| `variant` | `default` · `secondary` · `success` · `warning` · `destructive` · `outline` |
| `shape` | `pill` (default) · `rect` |
| `size` | `xs` · `sm` (default) · `md` |

### Default badge (decorative meta)

```html
<span class="
  inline-flex items-center gap-1
  px-2 py-0.5
  bg-muted text-foreground
  text-xs font-medium
  rounded-full
">
  Denne måneden
</span>
```

### Status badges

```html
<!-- Success -->
<span class="px-2 py-0.5 bg-success-subtle text-success text-xs font-medium rounded-md">
  Betalt
</span>

<!-- Warning -->
<span class="px-2 py-0.5 bg-warning-subtle text-warning text-xs font-medium rounded-md">
  Venter
</span>

<!-- Destructive -->
<span class="px-2 py-0.5 bg-danger-subtle text-danger text-xs font-medium rounded-md">
  Avbrutt
</span>
```

**Shape rule:** decorative meta uses `pill` (`rounded-full`); status in tables/rows uses `rect` (`rounded-md`). Don't mix.

**Silence-on-success rule:** in dense admin lists, render NOTHING for the happy-path state. Only show a status badge when there's a problem to flag.

---

## Course card

Image-led card for listing surfaces. Bordered sand surface when no image is present; image-as-card when an image exists. Monochrome — no chromatic tints.

**Rules:**
- **Bordered sand surface** — `bg-surface border border-border rounded-lg`. The image (when present) fills the top portion; meta sits in the bordered body.
- **No underline on the title** even though the card is an `<a>` — suppress `text-decoration` on title, meta, and nested links. The card itself is the affordance.
- **Decoration is the lift on hover** — `hover:translate-y-[-1px]`. No fill change, no border thickening.
- **Type/format reads as a text label** in the meta line — never a colored fill or tinted chip.

```html
<a class="
  block rounded-lg p-4
  bg-surface border border-border
  no-underline
  transition-transform duration-200 ease-out
  hover:translate-y-[-1px]
">
  <span class="text-xs font-medium text-foreground-muted">Engangstime</span>
  <h3 class="mt-2 text-xl font-semibold text-foreground no-underline">Vinyasa Flow</h3>
  <p class="mt-1 text-sm text-foreground-muted no-underline">Tirsdag 18:00 · 60 min · 12 plasser</p>
</a>
```

---

## Avatar

Customer / teacher / staff representation. Image with **User-icon fallback**. Always has a fallback — a missing image must never leave a hole in the layout.

```html
<!-- with image -->
<div class="size-8 rounded-full overflow-hidden bg-muted">
  <img src="/avatar.jpg" alt="Maria Hansen" class="size-full object-cover" />
</div>

<!-- icon fallback (NO initials) -->
<div class="size-8 rounded-full bg-muted flex items-center justify-center
            text-foreground-muted" aria-label="Maria Hansen">
  <UserIcon class="size-4" />
</div>
```

### Sizes

| Token | Size | Use |
|-------|------|-----|
| `xs` | 24px | Inline mentions, small list rows |
| `sm` | 32px | Default — list rows, cards, drawer headers |
| `md` | 40px | Profile cards, larger list items |
| `lg` | 56px | Detail views, profile headers |

### Fallback rules

- **Never initials.** Initials introduce hash-based color noise (each name gets a different tone, fragmenting the calm palette) AND add cognitive load when scanning lists. The User icon reads as "anonymous user" without imposing identity.
- **Always neutral chrome.** `bg-muted` + `text-foreground-muted` icon — no chromatic per-user tints. Same fallback look across every avatar in the app.
- Set the user's name as `aria-label` on the fallback container so screen readers still convey identity.
- Use `<UserAvatar>` primitive — don't hand-roll. The primitive handles image → icon fallback automatically.

### Notification dot indicator

When the avatar represents a user with an unread notification:

```html
<div class="relative">
  <div class="size-8 rounded-full bg-muted ...">MH</div>
  <span class="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-danger
               ring-2 ring-background"></span>
</div>
```

Small dot (`size-2.5` = 10px), `bg-danger` (or `bg-success` for "online"), `ring-2 ring-background` to detach from the avatar edge. **No numbers in the dot** — Studio's audience doesn't manage thousands of notifications. Just "there's something new" is the signal.

---

## Confirmation dialog (destructive)

For destructive actions where toast-with-undo (Tier 1) isn't enough. Use the `ConfirmDialog` wrapper at `@/components/ui/confirm-dialog` — it composes shadcn `<AlertDialog>` with the rules below baked in. Two variants: **standard confirm** (Tier 2, cross-system / multi-person actions) and **type-to-confirm** (Tier 3, catastrophic cascading actions).

See `patterns.md` § 12 for the full doctrine — undo-first by default; standard dialog is monochrome; type-to-confirm is reserved for delete-studio and delete-account only.

### Standard confirm — Tier 2

```tsx
import { ConfirmDialog, ConfirmScopeItem } from '@/components/ui/confirm-dialog'

<ConfirmDialog
  open={open}
  onOpenChange={setOpen}
  ariaLabel="Avlyse kurset"
  headline="Kurset avlyses og 12 deltakere refunderes. Det kan ikke angres."
  scope={
    <ConfirmScopeItem
      name="Vinyasa Flow"
      meta="12 deltakere refunderes"
      trailing={formatKroner(5400)}
    />
  }
  actionLabel="Avlys kurs"
  onConfirm={handleCancelCourse}
  loading={isDeleting}
  loadingText="Avlyser"
/>
```

**Rules:**
- **No visible title.** `ariaLabel` is announced by screen readers; sighted users see the compound headline + scope card below. The headline does what a title would, with specifics.
- **Compound headline** — one sentence stating action + consequence + reversibility: "Påmeldingen avbestilles og hele beløpet refunderes (5–10 virkedager)." Foreground color, `text-sm font-semibold leading-snug`, `mb-5` breathing room before the scope card. **Wrapper handles this — don't override.**
- **Scope card is tonal, not just outlined.** `bg-muted/40` + soft border (`border-border/60`), `rounded-lg`. The tonal lift gives the card real presence on the dialog surface. Wrapper handles this.
- **Card content is left-aligned.** Item name on line 1 (`text-sm font-medium`), meta on line 2 (`text-xs text-foreground-muted tabular-nums`), optional trailing amount on the right (`text-sm font-medium tabular-nums`). Use `<ConfirmScopeItem>` — don't hand-roll.
- **Multi-item scope** (e.g., refund preview with N participants): use `<ConfirmScopeRow>` for each row, with `flex justify-between` and soft dividers (`border-border/60`). Wrap in `<>` after a primary `<ConfirmScopeItem>` summary row. Cap height at `180–240px` with `overflow-y-auto` for long lists.
- **No description paragraph below the card.** The headline absorbs the consequence note. Card → optional checkbox / type-to-confirm input → footer. Don't add explanatory `<p>` blocks.
- **Destructive button is monochrome.** `variant="default"` (sand-12 dark fill) — never red. The verb ("Avlys kurs" / "Slett sted" / "Avbestill og refunder") + the scope card + right-side position carry the destructive signal. Red is reserved for `toast.error` and input validation borders. **Wrapper enforces this — there is no `tone` / `actionVariant` prop.**
- **Cancel left, destructive right** on desktop; stacked with destructive on top on mobile. `AlertDialogFooter` handles this automatically.
- **Default focus on Cancel.** Radix `AlertDialog` does this for free — never override.
- **ESC closes; outside-click does NOT.** Radix `AlertDialog` default.
- **Loading state on the destructive button** while the network call is in flight. Pass `loading` + `loadingText` props. Cancel button auto-disables.
- **Width: `max-w-md`** (~448px) on desktop, `w-[calc(100vw-2rem)]` on mobile. Wrapper handles this.
- **Backdrop: `bg-foreground/40 backdrop-blur-sm`** — 40 % black with blur, slightly weightier than a dim overlay. Wrapper handles this.
- **Acknowledgement checkbox** when the action sends emails / moves money in bulk: pass a `<label>` + `<Checkbox>` as `children` between the scope card and the footer, gate the destructive button via the `disabled` prop. Example: cancel-course-with-refunds. Single-participant refunds don't need it — the scope card already shows the specific person + amount.

### Type-to-confirm — Tier 3, catastrophic only

```tsx
function DeleteAccountDialog() {
  const [confirmText, setConfirmText] = useState('')
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      ariaLabel="Slett konto"
      headline="All data, inkludert kurs, påmeldinger og meldinger, slettes permanent. Dette kan ikke angres."
      scope={<ConfirmScopeItem name={email} meta="Permanent sletting" />}
      actionLabel="Slett konto"
      onConfirm={handleDelete}
      disabled={confirmText !== 'SLETT'}
    >
      <label className="mt-1 flex flex-col gap-2 text-sm text-foreground-muted">
        Skriv <span className="font-mono font-medium text-foreground">SLETT</span> for å bekrefte
        <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
      </label>
    </ConfirmDialog>
  )
}
```

**Rules:**
- **Type the resource name** for org-scoped actions (delete studio: type the studio name). Use a literal word (`SLETT`) only for account-level actions where there's no specific resource name to type.
- **Disabled until exact match** — case-sensitive, accent-sensitive, trim whitespace.
- **Reserved for catastrophic cascading actions only.** Studio: delete account (`SLETT`), delete studio (studio name). Refunds, cancel-course, delete-anything-else are Tier 2 — do not use type-to-confirm for them.

### When to use what

| Action type | Pattern | Example |
|------------|---------|---------|
| Reversible single-item ops | Tier 1: `runWithUndo` + Sonner toast | Delete location, remove team member, hide draft |
| Cross-system / multi-person actions | Tier 2: `ConfirmDialog` (monochrome) | Cancel signup, refund, cancel course, leave team |
| Catastrophic cascading | Tier 3: `ConfirmDialog` + type-to-confirm gate | Delete account, delete studio |

---

## Toast

For doctrine — when to use, variants, copy — see `patterns.md` § 11. This section covers the visual spec only.

### Anatomy

```
┌──────────────────────────────────────────────────┐
│ ┃  Påmelding er avbestilt.            [Angre]    │
└──────────────────────────────────────────────────┘
  ↑                                          ↑
  4px stripe (rounded, full-height,         ghost pill,
  inset by flex gap, color = variant)       btn-sm
```

### Tokens

| Property | Value |
|---|---|
| Width | `360px` desktop, `calc(100% - 32px)` mobile |
| Padding | `12px 16px` |
| Background | `var(--surface)` (#ffffff) — never filled-color tints |
| Border | `1px solid var(--border)` |
| Border-radius | `var(--radius-lg)` (12px) — same as dialogs, NOT pill |
| Shadow | `0 1px 2px rgb(0 0 0 / 0.04), 0 8px 24px -4px rgb(0 0 0 / 0.12)` (two-layer; floating element) |
| Stripe | `4px` wide × `20px` tall (matches body line-height), `border-radius: 9999px`, `align-self: center`. Never stretch — see universal stripe rule below. |
| Stripe color | none (default) · `#0090ff` (action) · `#e5484d` (error) |
| Title | `text-sm font-medium text-foreground` (14px / 500 / `#1c2024`) |
| Description (rare) | `text-xs text-foreground-muted` (12px / 400 / `#60646c`) |
| Action button | ghost pill, `btn-sm` — `Angre`, `Prøv igjen`, `Vis` |

### Position & motion

- **Position: `bottom-center`** on desktop AND mobile. Override Sonner's default. Stack vertically; max 3 visible; replace by `id` on rapid repeats.
- **Motion**: 200ms slide-up + fade in (`--ease-out`); 150ms slide-down + fade out. No spring/bounce — too playful for the audience. No rotated-fan stack on hover (Sonner default — disable via `expand={false}`).

### Sonner config

Treat Sonner as a queue manager — turn off its visual defaults entirely.

```tsx
import { Toaster } from "sonner";

<Toaster
  position="bottom-center"
  theme="light"
  expand={false}
  visibleToasts={3}
  duration={4000}
  gap={8}
  offset={16}
  toastOptions={{
    unstyled: true,
    classNames: {
      toast:
        "relative flex items-center gap-3 w-[360px] bg-surface border border-border " +
        "rounded-xl px-4 py-3 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-4px_rgb(0_0_0/0.12)]",
      title: "text-sm font-medium text-foreground",
      description: "text-xs text-foreground-muted mt-0.5",
      actionButton:
        "ml-auto rounded-full px-3 py-1 text-xs font-medium text-foreground hover:bg-muted",
    },
  }}
/>
```

For variants with the stripe, use `toast.custom()`:

```tsx
toast.custom((t) => (
  <div className="relative flex items-center gap-3 w-[360px] bg-surface border border-border rounded-xl px-4 py-3 shadow-[...]">
    <span className="w-1 h-5 self-center rounded-full bg-[#0090ff]" />
    <p className="flex-1 text-sm font-medium">Påmelding er avbestilt.</p>
    <button onClick={() => undoCancel(id)} className="rounded-full px-3 py-1 text-xs font-medium hover:bg-muted">
      Angre
    </button>
  </div>
));
```

### Optional — translucent variant

For toasts overlaying rich content (image-heavy public pages, customer flow over photos) only:

```css
background: rgba(255, 255, 255, 0.92);
backdrop-filter: blur(8px) saturate(120%);
-webkit-backdrop-filter: blur(8px) saturate(120%);
```

Solid `var(--surface)` remains the default on dashboard surfaces — translucency hurts legibility on dense content (Apple themselves shipped iOS 26.4 "ultra-light" mode for this reason). Opt in per-surface, not globally.

### Accessibility

- Sonner provides `role="status"` (default) and `role="alert"` (errors) automatically — don't override.
- Action button must be reachable via keyboard; Sonner handles focus trap.
- Stripe color alone never conveys meaning — copy carries semantics. (`Kunne ikke sende melding.` is meaningful without the red stripe.)
- 4.5:1 contrast: `#1c2024` text on `#ffffff` surface = 14.85:1 ✓.

---

## Empty state

Single CTA, optional inline link below. **No card wrapper, no icon, no dual-button.** The empty state lives directly inside whatever container would have shown the data.

```html
<div class="flex flex-col items-center text-center py-12 max-w-sm mx-auto">
  <p class="text-base font-semibold text-foreground">Ingen påmeldinger ennå</p>
  <p class="mt-1 text-sm text-foreground-muted">
    Når noen booker en plass, vises de her — med betalingsstatus og kontaktinfo.
  </p>
  <button class="mt-6 btn btn-primary btn-sm">Del booking-lenke</button>
  <a class="mt-3 text-sm text-foreground-muted underline decoration-foreground-muted/40 underline-offset-2 hover:decoration-foreground-muted">
    Opprett første kurs i stedet →
  </a>
</div>
```

**Rules:**
- **Single primary CTA.** Always one. Two side-by-side buttons (primary + ghost) creates competing paths for non-power-users.
- **Secondary path → inline arrow link below**, not a ghost button. Calmer hierarchy, lower visual weight.
- **No card wrapper.** Don't add `bg-surface border border-border rounded-lg` around an empty state — it already lives inside whatever container would have shown the data. Card-within-a-card chrome is the AI-template smell.
- **No icon, no illustration.** Studio is text-driven. If you reach for an illustration to fill space, the description isn't pulling weight — rewrite it.
- **Three short pieces of text:** headline (what), supporting (why it matters), CTA (what to do). Description = 1–2 lines.
- For **full-page empties** (no cards exist anywhere on the page yet): use `text-xl font-semibold` title for slightly more weight, but keep the same single-CTA-plus-inline-link structure.

See `patterns.md` § 6 for the full doctrine.

---

## Tabs (underline) — for slicing content

Use when each tab reveals **different content** — different items, different sections, different filters of a list. Tabs are the slicer. shadcn ships `<Tabs>` with this style by default.

```html
<div class="border-b border-border">
  <nav class="flex gap-6">
    <button class="inline-flex items-center gap-1.5 py-3 text-sm font-medium border-b-2 border-foreground">
      Kommende
      <span class="px-[7px] py-px bg-muted text-foreground text-xs font-medium rounded-full tabular-nums">12</span>
    </button>
    <button class="inline-flex items-center gap-1.5 py-3 text-sm text-foreground-muted hover:text-foreground border-b-2 border-transparent">
      I dag
      <span class="px-[7px] py-px bg-muted text-foreground text-xs font-medium rounded-full tabular-nums">3</span>
    </button>
    <button class="inline-flex items-center gap-1.5 py-3 text-sm text-foreground-muted hover:text-foreground border-b-2 border-transparent">
      Tidligere
      <span class="px-[7px] py-px bg-muted text-foreground text-xs font-medium rounded-full tabular-nums">48</span>
    </button>
  </nav>
</div>
```

**Use when:**
- Slicing items into mutually exclusive buckets (Upcoming · Today · Past · Cancelled)
- Status filtering (All · Active · Draft · Archived)
- Section navigation within a settings page (General · Billing · Team)
- Inbox filters (Unread · Read · Archived)

**Count badges:**
- Always show counts when there's a meaningful number per tab — tells users which tab has stuff before clicking
- Pill shape (`rounded-full`), `bg-muted` background, `text-foreground` number, `tabular-nums` for digit alignment
- **The badge stays consistent regardless of active state.** The tab label and underline communicate active state — adding a third badge color signal is overkill.
- Skip the badge if the count is 0 or always trivially small (don't clutter)

**Don't use tabs when:** the content is the same and only the *presentation* changes — that's a segmented control.

**Activation mode — automatic vs manual** (W3C ARIA Authoring Practices):
- **Automatic activation** (Studio default): focusing a tab activates it immediately — switches to its panel as the user arrow-keys through. Recommended when tab panels are preloaded / client-side filtered (zero noticeable latency on switch). All Studio tabs qualify since they're filtering already-loaded data.
- **Manual activation**: focus moves freely, but the panel doesn't switch until the user presses Enter or Space. Use only when panels load async (network fetch on tab change). Otherwise automatic activation is faster for keyboard users.

shadcn `<Tabs>` uses **automatic activation** by default — keep it that way unless you have a specific reason to switch.

**Mobile behavior:** tabs overflow horizontally (`overflow-x-auto` with `snap-x snap-mandatory`). Don't collapse to a dropdown — the visible-tab metaphor breaks. Don't wrap to two lines — two-line tab strips look broken. Snap-scroll keeps active tab in view.

**Why not the dropdown-collapse pattern on mobile.** The "tabs become a dropdown menu under `sm`" pattern exists and works in some systems (e.g., GOV.UK, several ad-tech consoles). Studio rejects it because: (1) the user loses the count badges that signal which bucket has stuff; (2) the dropdown adds an extra interaction (open → pick → wait), where snap-scroll is one swipe; (3) tabs collapsing to dropdowns reads as "engineer hid stuff to fit," not as a deliberate mobile control. If snap-scroll really doesn't fit, the right fix is fewer tabs — not a different control.

**Disabled state:** `opacity-50 pointer-events-none`. Don't render the underline; the tab still occupies space but isn't interactive. Use sparingly — usually a missing tab should just not render at all.

**Underline thickness:** `border-b-2` (2px). Inactive tabs use `border-b-2 border-transparent` (not no border) — keeps vertical alignment consistent so the active tab doesn't jump.

**ARIA primer (handled by Radix; verify if rolling your own):**

| Element | Required attribute |
|---|---|
| Tab list container | `role="tablist"` (`aria-orientation="vertical"` if vertical) |
| Each tab | `role="tab"`, `aria-controls="<panel-id>"`, `aria-selected="true"` on active / `false` elsewhere, `tabindex="-1"` on inactive (only active tab is in tab order) |
| Each panel | `role="tabpanel"`, `aria-labelledby="<tab-id>"` |
| Keyboard | Tab moves *into* the active tab; Arrow keys move between tabs within the list (Left/Right for horizontal, Up/Down for vertical) |

The "only active tab is `tabindex=0`" pattern is the WAI-required behavior — users tab into the widget once, then arrow-key through it. Tabbing through every tab is wrong.

---

## Segmented control — for switching lens

Use when each segment shows **the same content, viewed differently** — different format, different aggregation, different sort. Segments are the lens. Not in shadcn core; build with `<ToggleGroup>` or a custom component.

**Shape: pill** (`rounded-full` outer + inner). Pill aligns with Studio's button language and the calm/soft aesthetic. One shape, used in every context — no rect variant exists.

```html
<div class="inline-flex gap-1 p-1 bg-muted rounded-full">
  <button class="px-3.5 py-1.5 rounded-full text-sm font-medium bg-surface text-foreground shadow-xs">
    Liste
  </button>
  <button class="px-3.5 py-1.5 rounded-full text-sm text-foreground-muted hover:text-foreground">
    Kalender
  </button>
  <button class="px-3.5 py-1.5 rounded-full text-sm text-foreground-muted hover:text-foreground">
    Rutenett
  </button>
</div>
```

**Use when:**
- View mode toggles (List · Grid · Calendar)
- Timeframe aggregation (Day · Week · Month)
- Density / sort options (Recent · Oldest first)
- Metric switchers in reports (Revenue · Bookings · Capacity)

**Constraints:**
- 2–5 segments max. More than 5 → use a select dropdown.
- Each segment label kept short (1–2 words).
- The "underlying data" must be the same across all segments — that's the rule that makes this control honest.
- **Don't show counts on segments.** Counts belong on tabs, not segments — segments don't change the count.

**The litmus test:** if switching between segments would change the *count* of items shown, it's not a segmented control — use underline tabs instead.

**Width — natural inline by default, full-width only when the control is the surface's primary toggle.**

Apple's HIG default is fill-parent (a UISegmentedControl spans its container by default; the `isFixedWidth` flag opts out to natural width). On the web, however, the convention varies and full-width segmented in a dashboard reads as "form-field-y," not "view-toggle-y." Studio's call:

- **Dashboard view-toggles** (List · Calendar · Grid for a course list) → **natural inline width** aligned to the start of the row, sharing space with other filters. Full-width here would dominate.
- **Mobile primary toggles** where the segmented IS the only control on a strip (e.g., a settings page with `Profil · Studio · Fakturering` segmented at the top of the page) → **full-width** is fine and matches the iOS convention. The user expects the segmented to span when it's the page's primary slicer.

The decision rule: if the segmented sits *next to* other controls (filters, search, tabs), it's a peer — natural width. If it's *the* control on its row, it's a primary — full-width works.

**Mobile behavior:** segmented stays at the chosen width. If labels are long enough that 4 segments don't fit on a 320px screen, drop to a select dropdown — don't truncate labels to 2 chars each. Truncation breaks scannability for the entire audience to fit a small minority's screens.

---

## Sidebar nav

Sidebar shares the white canvas with main content. A 1px `border` on the right separates them — that's the only visual divider between the two regions.

**Three states for nav items:**

| State | Background | Text | Weight |
|-------|-----------|------|--------|
| **Rest** (unselected) | none | `text-foreground-muted` | 400 |
| **Hover** | `bg-muted` (sand-3) | `text-foreground` | 400 |
| **Selected** (current) | `bg-active` (sand-3) | `text-foreground` | 500 |

```html
<aside class="bg-background border-r border-border">
  <nav class="p-4 space-y-1">
    <a href="..." class="block px-3 py-1.5 rounded-md
                        text-sm text-foreground-muted
                        hover:bg-muted hover:text-foreground">
      Kurs
    </a>
    <a href="..." aria-current="page" class="block px-3 py-1.5 rounded-md
                                              text-sm font-medium text-foreground
                                              bg-active">
      Oversikt
    </a>
  </nav>
</aside>
```

The hover (sand-3) and selected (sand-3) tiers share the same fill in this build; the 500-weight bump and foreground-text shift on the selected state carry the distinction.

---

## Divided list (canvas alternative to card-with-rows)

Replaces the "card with internal rows" pattern in canvas-first sections.

```html
<div class="divide-y divide-border">
  <div class="py-3 flex items-center justify-between">
    <div>
      <div class="text-sm font-medium">Vinyasa Flow</div>
      <div class="text-xs text-foreground-muted">Tirsdag 18:00 · 60 min</div>
    </div>
    <span class="badge badge-success">Aktiv</span>
  </div>
  <div class="py-3 flex items-center justify-between">…</div>
  <div class="py-3 flex items-center justify-between">…</div>
</div>
```

No card wrapper, no card padding. The list lives directly on the canvas; rows are separated by hairlines. Use this for activity feeds, recent-items panels, notification lists, settings rows.

---

## Surface states

Hover, active, selected, disabled — visibly different.

| State | Pattern |
|-------|---------|
| Rest | (default) |
| Hover | `hover:bg-muted/50` |
| Active (current) | `bg-muted` (+ optional `ring-1 ring-inset ring-border` when on `bg-background`) |
| Selected (chosen) | `bg-active ring-1 ring-inset ring-border` |
| Disabled | `bg-muted/50 text-foreground-muted` (no opacity-fade) |
| Focus-visible | `ring-2 ring-foreground ring-offset-2 ring-offset-background` |

**Active vs Selected:** "Active" = "what I'm viewing" (open conversation, current tab). "Selected" = "what I've chosen" (multi-select, picked date). Most dashboard chrome is Active, not Selected.

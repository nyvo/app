# Studio — Layout & UX Patterns

These patterns complement the token system. They answer: *"Now that I know what colors and spacing to use, how do I lay out a screen?"*

The product is for **everyone, not power users.** Yoga teachers, small studio owners, and non-technical operators. They need to glance at the app and immediately understand what to do next. Density and bulk-action UIs work against them.

These eight patterns replace power-user defaults with non-power-user friendlier alternatives.

---

## 1. "Today" hero — replaces KPI wall

**The trap:** "Show every metric the user might want." Outcome: a wall of 8 tiles, no clear focus, decision fatigue.

**The fix:** One prominent block answering *"What's happening right now / today?"* — the answer 90% of users open the app for. Quiet supporters underneath.

**No card chrome.** The hero sits directly on the canvas — no `border`, no `rounded`, no surrounding box. Hierarchy comes from typography + spacing + a single hairline `border-t` separating the heading from the "first up" block. Wrapping this in a card is the SaaS-template move; chromeless is calmer and more confident.

```html
<section class="space-y-8">
  <!-- The hero — naked on canvas, no card chrome -->
  <div>
    <p class="text-xs font-medium text-foreground-muted">I dag</p>
    <h2 class="mt-1 text-2xl font-semibold tracking-tight">3 klasser i dag</h2>

    <!-- First-up block separated by hairline, not by a card boundary -->
    <div class="mt-5 pt-5 border-t border-border">
      <p class="text-xs font-medium text-foreground-muted">Først kl. 18:00 i Sal 1</p>
      <p class="mt-1.5 text-base font-semibold">Vinyasa Flow</p>
      <p class="mt-0.5 text-sm text-foreground-muted">12 av 14 plasser fylt</p>
    </div>

    <button class="mt-5 btn btn-primary btn-sm">Åpne dagsplan</button>
  </div>

  <!-- The supporters — quieter, fewer, also chromeless -->
  <div class="grid grid-cols-2 gap-6">
    <div>
      <p class="text-xs font-medium text-foreground-muted">Inntekter denne måneden</p>
      <p class="mt-1 text-xl font-semibold tabular-nums">42 800 kr</p>
    </div>
    <div>
      <p class="text-xs font-medium text-foreground-muted">Aktive påmeldinger</p>
      <p class="mt-1 text-xl font-semibold tabular-nums">186</p>
    </div>
  </div>
</section>
```

**Rules:**
- **No card around the hero.** Earlier draft used `bg-surface border border-border rounded-lg p-6` — that's the SaaS-template chrome we're moving away from. The page heading + first-up block + CTA stand on their own.
- Maximum 1 hero per page, maximum 2–3 quiet supporters. If you need more, you're trying to show a power-user dashboard.
- The "first-up" block is separated from the heading by `mt-5 pt-5 border-t border-border` — a hairline, not a card edge.
- KPI tiles (§ components.md) DO use card chrome — that's a different surface (a row of comparable metrics where the border is the structural grouping). The "Today" hero is one focused block; it doesn't need a frame.

---

## 2. Card grid — replaces data table for browsing

**The trap:** A 50-row table with 8 columns. Users can't scan it. They need to read every row.

**The fix:** A 2–3 column card grid where each card carries a rich preview — name, status, key metric, capacity bar. Visual hierarchy lets users scan without reading.

```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <a href="..." class="bg-surface border border-border rounded-lg p-5 no-underline
                       transition-transform hover:translate-y-[-1px]">
    <div class="flex items-center justify-between mb-3">
      <span class="badge badge-success">Aktiv</span>
      <span class="text-xs text-foreground-muted">Tirsdag 18:00</span>
    </div>
    <h3 class="text-base font-semibold">Vinyasa Flow</h3>
    <p class="mt-1 text-sm text-foreground-muted">60 min · Sal 1</p>
    <div class="mt-4">
      <div class="flex justify-between text-xs text-foreground-muted">
        <span>Plasser</span>
        <span class="tabular-nums">12 av 14</span>
      </div>
      <div class="mt-1 h-1 bg-muted rounded-full">
        <div class="h-full bg-foreground rounded-full" style="width: 86%"></div>
      </div>
    </div>
  </a>
  <!-- repeat -->
</div>
```

**When to use a table anyway:** when the user genuinely needs to *compare* values across rows (price comparisons, sortable metrics, side-by-side capacity). Otherwise default to cards.

---

## 3. Detail drawer — replaces "click row → new page"

**The trap:** Clicking a list item navigates to a new page. User loses context. Now they're not on the list anymore. To compare items they have to navigate back-and-forth.

**The fix:** Click row → right-side drawer opens with the full detail. The list stays visible underneath. Notion's signature pattern.

```html
<!-- The list (still visible) -->
<div class="divide-y divide-border">
  <button onclick="openDrawer(123)" class="w-full text-left py-3 px-1
                                            flex items-center justify-between
                                            hover:bg-muted rounded">
    <div>
      <div class="text-sm font-medium">Maria Hansen</div>
      <div class="text-xs text-foreground-muted">Vinyasa Flow · 6. mai</div>
    </div>
    <span class="badge badge-success">Betalt</span>
  </button>
  <!-- more rows -->
</div>

<!-- The drawer (slides in from right) -->
<aside class="fixed inset-y-0 right-0 w-[420px] bg-surface border-l border-border
              translate-x-full transition-transform duration-300
              [&.is-open]:translate-x-0">
  <header class="px-6 py-4 border-b border-border flex justify-between">
    <h3 class="text-base font-semibold">Påmelding</h3>
    <button onclick="closeDrawer()">×</button>
  </header>
  <div class="px-6 py-4 space-y-4">
    <!-- detail content -->
  </div>
  <footer class="px-6 py-4 border-t border-border flex gap-2">
    <button class="btn btn-secondary flex-1">Send melding</button>
    <button class="btn btn-primary flex-1">Bekreft</button>
  </footer>
</aside>
```

**When NOT to use a drawer:** flows that need full-screen attention (creating a course, payment checkout) — those need their own page or modal. Drawers are for *details on existing items*.

**Drawer width:** 420–480px. Bigger and it dominates the page; smaller and the content squeezes.

---

## 4. Multi-step wizard — replaces long forms

**The trap:** "Create new course" → a single form with 18 fields. User scrolls forever, doesn't know what's required, abandons.

**The fix:** Break it into 3–5 steps, 3–5 fields per step. Each step has a clear focus. Progress indicator shows where you are. "Back" lets users revise.

**Step boundaries that work for booking apps:**
1. **Basics** — name, type, description (3 fields)
2. **Schedule** — when, how often, duration (3 fields)
3. **Capacity & pricing** — max participants, price, payment terms (3–4 fields)
4. **Review & publish** — summary + confirm

**Implementation:**
```html
<div class="max-w-xl mx-auto">
  <!-- Progress -->
  <div class="flex items-center justify-between mb-8 text-sm">
    <div class="flex items-center gap-2">
      <span class="size-6 rounded-full bg-foreground text-white grid place-items-center text-xs">1</span>
      <span class="font-medium">Grunnlag</span>
    </div>
    <span class="flex-1 mx-3 h-px bg-border"></span>
    <div class="flex items-center gap-2 text-foreground-muted">
      <span class="size-6 rounded-full bg-muted grid place-items-center text-xs">2</span>
      <span>Timeplan</span>
    </div>
    <!-- ... -->
  </div>

  <!-- Step content -->
  <h2 class="text-xl font-semibold mb-1">Hva heter kurset ditt?</h2>
  <p class="text-sm text-foreground-muted mb-6">Vi viser dette navnet til alle som booker.</p>
  <!-- 2-3 fields max -->

  <!-- Footer -->
  <div class="mt-8 flex justify-between">
    <button class="btn btn-ghost">Tilbake</button>
    <button class="btn btn-primary">Neste</button>
  </div>
</div>
```

**Rule:** Max 5 steps. More than that, and users feel like the task will never end. If your task needs 8 steps, the task itself is too big — split it into two flows.

---

## 5. Tabs to slice — replaces filter UI

**The trap:** A search bar, a filter dropdown, a status filter, a date picker, three sort options. Users don't know what to filter by. Most never use any of it.

**The fix:** Pre-slice the data into the 3–4 buckets users actually want. Each tab/segment is a bucket. Users pick; no thinking required.

**Two controls, two jobs.** Studio commits to both — they're not interchangeable.

| | Underline tabs | Segmented control |
|---|---|---|
| **Each option shows** | Different content (different items) | Same content, different lens |
| **Use for** | Slicing data by status / time bucket / category | Switching view mode, timeframe, sort, metric |
| **Examples** | Upcoming · Today · Past · Cancelled | List · Grid · Calendar |
| **Litmus test** | Item count changes per option | Item count stays the same per option |
| **shadcn primitive** | `<Tabs>` (out of the box) | None — build with `<ToggleGroup>` or custom |

**For underline tabs (the canonical slicer for booking apps):**

```html
<div class="border-b border-border">
  <nav class="flex gap-6">
    <button class="py-3 text-sm font-medium border-b-2 border-foreground">
      Kommende <span class="text-foreground-muted ml-1">12</span>
    </button>
    <button class="py-3 text-sm text-foreground-muted hover:text-foreground border-b-2 border-transparent">
      I dag <span class="ml-1">3</span>
    </button>
    <button class="py-3 text-sm text-foreground-muted hover:text-foreground border-b-2 border-transparent">
      Tidligere <span class="ml-1">48</span>
    </button>
  </nav>
</div>
```

**For segmented control (the canonical lens-switcher):**

Pill-shaped (`rounded-full`) — matches Studio's button language, soft/calm aesthetic.

```html
<div class="inline-flex gap-1 p-1 bg-muted rounded-full">
  <button class="px-3.5 py-1.5 rounded-full text-sm font-medium bg-surface text-foreground shadow-xs">
    Liste
  </button>
  <button class="px-3.5 py-1.5 rounded-full text-sm text-foreground-muted hover:text-foreground">
    Kalender
  </button>
</div>
```

**Common booking-app slices:**
- Upcoming · Today · Past · Cancelled (status by time)
- All · Active · Draft · Archived (publication state)
- Pending · Confirmed · Completed (signup state)

**Common booking-app lenses:**
- List · Grid · Calendar (view format)
- Day · Week · Month (schedule aggregation)
- Revenue · Bookings · Capacity (report metric)

**Counts in tabs are gold.** They tell users which tab has stuff before they click. `Today (3)` is more useful than `Today` alone. Don't show counts on segmented controls — segments don't change the count.

**When you still need a search:** keep it, but make it a single text input — not a faceted filter UI. One field, search-as-you-type, results below.

---

## 6. Empty state with primary action — replaces "no items"

**The trap:** "Du har ingen påmeldinger ennå." Sad face icon. Dead end.

**The fix:** Three things in order — *what is this, why does it matter, what should I do next.* End with a **single primary button**. If a secondary path matters, it lives as an **inline arrow link below** — never a ghost button beside the primary.

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
- **One primary action.** Single CTA, always. Two side-by-side primary/ghost buttons creates competing paths for non-power-users.
- **Secondary = inline arrow link**, not a ghost button. Calmer hierarchy, lower visual weight, doesn't compete with the primary.
- **No card wrapper.** The empty state lives inside whatever container would have shown data. Don't add a card-within-a-card.
- **No icon, no illustration.** Studio's visual language is text-driven. If you reach for an illustration to fill space, the description isn't pulling its weight — rewrite the description.
- **Three short pieces:** headline (what), supporting (why it matters), CTA (what to do). Description = 1–2 lines.

---

## 7. Inline help — replaces help docs

**The trap:** Complex form field with a behavior the user wouldn't guess. They need help. They have to leave the page, search docs, read a 1500-word article, come back.

**The fix:** A tiny `?` next to the label opens a hover/click popover with 1–2 sentences. Or an expandable "Hvorfor spørre om dette?" link below the input. The help is *in the form*.

```html
<div>
  <div class="flex items-center gap-1.5 mb-1.5">
    <label class="text-sm font-medium">Avbestillingsfrist</label>
    <button type="button" aria-label="Mer info" class="size-4 rounded-full bg-muted text-foreground-muted text-xs grid place-items-center">?</button>
  </div>
  <input class="input" placeholder="24 timer" />
  <p class="mt-1.5 text-xs text-foreground-muted">
    Hvor mange timer før klassen kan en deltaker avbestille uten gebyr.
  </p>
</div>
```

**Two tiers of help:**
1. **`?` button** — for quick "what does this mean" clarification (1–2 sentences in popover)
2. **Description below the input** — for ongoing context that's worth always seeing

Don't mix them — if the field needs description-below, you don't need a `?` button too.

---

## 8. Single-layout dashboard — replaces customizable dashboards

**The trap:** "Let users customize their dashboard." Now every user sees a different thing, support becomes hell, screenshots in your docs are wrong, and most users never customize anyway.

**The fix:** One opinionated layout. The right things are in the right places because *you decided*. Users open the app and immediately understand because they're seeing what you intended.

This is what Square POS, Mailchimp, Cal.com all do. The dashboard is the dashboard.

**The opinionated layout for Studio:**
1. **Top:** "Today" hero card (pattern #1)
2. **Below hero:** 2–3 quiet metric supporters
3. **Below supporters:** ONE focused list — usually "Upcoming items" — with tabs to slice (pattern #5)
4. **Drawer-on-click** (pattern #3) for any list row that needs detail

That's it. No widgets, no rearranging, no "add KPI" button.

---

## 9. Information hierarchy in cards — replace dot-glue with structure

**The trap:** A card holds multiple facts. The lazy default is to cram them on a line with `·` separators: *"3 classes · 32 signups"* on one line, *"Vinyasa Flow · 18:00 · 12 of 14"* on the next. This is the AI-default — it's how machine-generated UI signals "I have multiple values and didn't decide which is primary."

**The fix:** Group information by **subject**. Each subject is its own block with proper typographic hierarchy. Reserve dot separators for *truly equivalent attributes of one subject* — never to glue different subjects together.

### Rules

1. **Identify the subjects in the card.** A "today summary" card might have two subjects: *today's metrics* and *the next class*. They are not one statement.
2. **Each subject gets its own block** with three tiers when needed:
   - **Eyebrow** (`text-xs font-medium text-foreground-muted`) — the small label that says *what this is*
   - **Hero** (`text-base` to `text-2xl font-semibold`) — the primary fact
   - **Supporting** (`text-sm text-foreground-muted`) — attributes that flesh out the hero
3. **Separate subjects vertically** with spacing or a thin divider (`border-t border-border`). Never with a dot.
4. **Dots are for closely-related attributes of one subject** — `60 min · 45 kr`, `kl. 18:00 · Sal 1`. If switching to natural language reads better (`kl. 18:00 i Sal 1`), use that instead.

### Bad → good

```html
<!-- ❌ Dot-glue between unrelated subjects -->
<div class="card">
  <p class="text-xs text-muted">I dag</p>
  <h2 class="text-2xl font-semibold">3 klasser · 32 påmeldte</h2>
  <p class="text-sm text-muted">Første: Vinyasa Flow kl. 18:00 · 12 av 14 plasser</p>
</div>

<!-- ✅ Subjects separated, hierarchy explicit -->
<div class="card">
  <p class="text-xs font-medium text-foreground-muted">I dag</p>
  <h2 class="mt-2 text-2xl font-semibold">3 klasser i dag</h2>

  <div class="mt-5 pt-5 border-t border-border">
    <p class="text-xs font-medium text-foreground-muted">Først kl. 18:00 i Sal 1</p>
    <p class="mt-1.5 text-base font-semibold">Vinyasa Flow</p>
    <p class="mt-0.5 text-sm text-foreground-muted">12 av 14 plasser fylt</p>
  </div>
</div>
```

### When to drop info entirely

Sometimes the right answer isn't to restructure — it's to **delete**. If "32 påmeldte" doesn't earn its place in a Today summary card (because per-class capacity tells the same story), drop it. Move it to a dedicated stat row or a deep-dive view. Less > more.

### The dot test

Look at every dot in your card. For each one, ask: *"Are the things on either side attributes of the same subject?"*
- `kl. 18:00 · Sal 1` — both attributes of one event ✓
- `60 min · 45 kr` — both attributes of one class ✓
- `3 classes · 32 signups` — different subjects (number of classes vs number of people) ✗
- `Vinyasa Flow · 18:00` — name + time (different categories) ✗ — use natural language: *"Vinyasa Flow at 18:00"*

If a dot fails the test, restructure or delete.

---

## 10. Loading & pending UI

**The trap:** Spinner everywhere. Spinners are easy to drop in but communicate nothing about *what's loading* — users wait without context.

**The fix:** Three tools, each for a different pending case. Don't reach for a spinner unless it's the right tool.

| Pattern | Use when | Example |
|---------|----------|---------|
| **Skeleton** | Layout context matters — content is loading INTO a known shape (card, list, dashboard) | Dashboard tiles loading in their final shape · List of bookings appearing as grey row outlines |
| **Spinner** | Short blocking action with no layout context | Button-press while saving · Dialog confirmation in flight |
| **Optimistic UI** | The action almost certainly succeeds — show the result immediately, roll back on error | Marking a signup as confirmed · Toggling a course active/draft · Sending a quick message |

**Why this matters:** studies (NN/g, productboard) show users perceive sites with skeletons as ~30% faster than identical sites with spinners. Skeletons signal "the layout is coming"; spinners signal "something is happening, no idea what."

### Skeleton example

```html
<!-- a list row skeleton -->
<div class="py-3 border-b border-border animate-pulse">
  <div class="flex items-center justify-between gap-4">
    <div class="space-y-2 flex-1">
      <div class="h-4 w-32 bg-muted rounded"></div>
      <div class="h-3 w-48 bg-muted rounded"></div>
    </div>
    <div class="h-6 w-12 bg-muted rounded-full"></div>
  </div>
</div>
```

### Rules

- **Match the dimensions of real content.** Skeletons that don't match the real layout cause layout shift when content arrives. Bad.
- **Don't combine skeleton + spinner.** Pick one per pending state.
- **Optimistic UI needs error recovery.** If the optimistic update is rolled back (network failure), show a Sonner error toast with retry.
- **Spinners go inside buttons or inline next to the action**, never as a full-screen takeover. Full-screen spinners block the user from doing anything else — that's almost always wrong.

### Why skeletons (the empirical case)

Receipts before the rules:
- **Facebook research**: users perceive skeleton-loaded content as ~50% faster than identical wait times with spinners.
- **Viget user testing**: skeletons rated ~20% faster on perceived speed.
- **Bounce reduction**: 9-20% lower bounce when skeletons replace spinners on content-heavy surfaces.

Skeletons reduce *uncertainty* — the user sees the layout coming and knows what they're waiting for. Spinners signal "something is happening, no idea what." Use skeletons on content surfaces (feeds, lists, dashboards) and reserve spinners for short clear actions (saving, authenticating, payment in flight).

### Threshold gradient — what to show, when

Different durations call for different signals. Don't conflate them.

| Duration | Signal | Why |
|---|---|---|
| **<200ms** | nothing — render content directly | A skeleton that flashes for 80ms reads as a glitch, *worse* than no indicator. |
| **200ms - 3s** | skeleton (content surface) OR inline button-spinner (action) | Skeleton tells the user the layout is coming; spinner tells them their click registered. |
| **3s - 8s** | persistent progress indicator visible (toast with progress bar, or inline "Lagrer…" near the action). User stays on the page; the indicator confirms work is ongoing. |  |
| **>8-10s** | progress + **cancel button required** (Microsoft / NN/g threshold). Beyond 10s without cancel, the user feels trapped. Consider making the operation backgroundable so they can keep using the app. |  |

**Cancel vs Stop — copy matters:**
- **`Avbryt` (Cancel)**: action returns to previous state, **no side effects**. Use for in-flight operations that can roll back cleanly.
- **`Stopp` (Stop)**: operation halts but **leaves partial work intact** (e.g., 12 of 50 records imported). Use when partial completion is meaningful.

Pick the right verb. They aren't synonymous.

### Loading nuances — what most apps get wrong

These are the rules that distinguish a calm loading experience from a flickery one.

**1. Skip the skeleton if the fetch resolves fast (<200ms).** A skeleton that flashes for 80ms before content paints reads as a glitch. Use a short delay before *showing* the skeleton (200ms threshold). If data arrives before the threshold fires, show content directly. In TanStack Query v5: combine `placeholderData: keepPreviousData` with a delayed-mount wrapper component (e.g. `<Suspense>` + `<DelayedFallback>`).

**2. Stale-while-revalidate: never blank-out cached content.** If the user just saw the dashboard 10 seconds ago and navigates back, the data is in cache — *show it immediately*. Refetch in the background, swap in fresh data when it arrives.

```ts
import { useQuery, keepPreviousData } from "@tanstack/react-query";

useQuery({
  queryKey: ["bookings", filters],
  queryFn: fetchBookings,
  placeholderData: keepPreviousData,   // v5 API — keepPreviousData is now an imported function
  staleTime: 30_000,
});
```

⚠️ The pre-v5 `keepPreviousData: true` boolean is **deprecated**. The v5 way is the imported `keepPreviousData` function passed as `placeholderData`.

**3. Pulse animation specs.** Skeletons use Tailwind's `animate-pulse` on `bg-muted`. The default pulse cycle (~2s) is fine — don't customize the timing. Don't use `animate-shimmer` or wave animations — they add motion noise to a calm interface and are an AI-default tell.

**4. Skeleton → content fade.** When the skeleton swaps out for real content, use a 150ms fade transition (`transition-opacity duration-150`). Hard cut feels twitchy; longer fade feels heavy. 150ms is the documented sweet spot.

**5. Empty vs loading.** Don't show the empty state (#6) during the initial fetch — it reads as "we have no data" before we even know. Sequence: skeleton (or nothing) → empty if `data.length === 0` after fetch resolves. Common bug: empty-state component renders during loading because `data` is `undefined`.

**6. Optimistic updates — selective, not universal.** Optimistic UI is **only worthwhile for high-frequency interactions where instant feedback matters** (likes, archive, toggle, cart updates). Don't optimistically update destructive actions (delete with no undo), payment flows, or anything where rollback would confuse the user. Studio's optimistic surfaces: cancel signup (with undo toast), archive course, mark task done.

**7. Optimistic must feel instant (<16ms render).** If your optimistic update has any visible delay (network roundtrip, animation), it's not optimistic — it's deferred. The whole point is the user perceives the action as already done.

**8. Optimistic rollback must be loud.** "Don't silently roll back" — Sonner toast on failure with a clear message + retry action. Silent rollback is more confusing than no optimism at all because the user thought their action worked.

**9. React 19 `useOptimistic` hook.** For React 19+, prefer the built-in `useOptimistic` over manual cache mutation. It composes naturally with Actions and `startTransition` and handles the "render optimistic state during the action, swap to real state after" lifecycle. For React 18, the React Query `onMutate`/`onError`/`onSettled` pattern remains canonical.

```ts
const [optimisticBookings, addOptimistic] = useOptimistic(
  bookings,
  (state, newBooking) => [...state, { ...newBooking, optimistic: true }]
);
```

**10. Loading-as-a-status is the wrong default.** Most React apps treat `loading: true` as a binary blocker for the entire UI. In Studio, *loading is an attribute of specific data*, not the page. The dashboard's metric tiles can be loading while the navigation sidebar is fully interactive. Scope every loader to its smallest meaningful unit.

---

## 11. Feedback after action — Sonner conventions

**The trap:** User clicks "Avbestill påmelding" — nothing happens visually. No confirmation, no toast, no indication anything worked. They click again, doubling the action. Or they assume it failed.

**The fix:** Every action that changes state needs feedback. Studio uses **Sonner** (by Emil Kowalski, design engineer at Linear) — but with `unstyled: true` and full visual override. Sonner is a queue / keyboard / a11y manager; the look is ours. Accepting Sonner's stock visual defaults (rotated fan stack, semantic-colored icon variants, `richColors` mode) is the AI-default look — Sonner-with-overrides is not.

### Three variants only

Most toast systems ship 5+ variants (default / success / info / warning / error). For non-technical users this is noise. Studio collapses to:

| Variant | Stripe | When | Auto-dismiss |
|---|---|---|---|
| **Default** | none | Silent confirmation: `Lagret.`, `Kopiert.`, `Sendt.` | 4s |
| **Action** | blue (`#0090ff`) | Reversible action with undo: `Påmelding er avbestilt.` + Angre | 8s |
| **Error** | red (`#e5484d`) | Something failed: `Kunne ikke laste påmeldinger.` + Prøv igjen | manual dismiss |

No "success" variant — a green-striped `Lagret.` over-celebrates a routine save. Default (no stripe) is enough. No "warning" variant — Studio has no persistent alert surface; if something needs warning about, state it as plain prose on the relevant page (§13.1 decision tree).

### Visual

White surface, foreground text, **inset accent stripe at the left** (4px wide, full-height, rounded). NEVER filled-color backgrounds. The destructive button (where present) is the loud anchor; the toast surface stays calm.

### Code

```ts
// 1. Default — silent confirmation
toast("Lagret.");

// 2. Action — with undo (THE pattern for destructive actions, see #12)
toast("Påmelding er avbestilt.", {
  action: { label: "Angre", onClick: () => undoCancel(id) },
  duration: 8000,
});

// 3. Error — manual dismiss, retry
toast.error("Kunne ikke sende melding.", {
  action: { label: "Prøv igjen", onClick: () => retry() },
  duration: Infinity,
});

// 4. Promise-bound (auto loading → success/error)
toast.promise(cancelBooking(id), {
  loading: "Avbestiller…",
  success: "Påmelding er avbestilt.",
  error: "Kunne ikke avbestille.",
});
```

### Rules

- **One toast at a time.** Don't stack. The `toast.promise` API replaces the loading toast with the result automatically — use it.
- **Skip toasts for create/update inside a wizard or form** — the form's own success state (redirect, confirmation screen, button feedback) does the job. Toasts are for *background* actions ("send reminder", "cancel signup", "duplicate course") where the page itself doesn't change.
- **Position bottom-center on desktop AND mobile.** Override Sonner's `bottom-right` default — bottom-right has IDE/dev-tool connotations and reads peripheral. Bottom-center reads neutral and app-wide, which fits a non-technical wellness audience.
- **Duration: 4s default**, 8s for action toasts (undo needs reading time), `Infinity` for errors (manual dismiss).
- **Wording: imperative past tense.** "Påmelding er avbestilt." — short, declarative. Not "Din påmelding ble avbestilt" (too formal). Not "Avbestilt!" (too cute). For errors, state what failed — `Kunne ikke laste påmeldinger.` — never `Noe gikk galt.`
- **Action button: ghost pill, single verb.** `Angre`, `Prøv igjen`, `Vis`. Not "OK". Not two buttons — if the toast needs two buttons, it's a dialog.
- **No icons in the body.** The stripe is the visual signal. An icon next to a stripe is doubled signaling — the AI-default look.
- **No emoji in copy.** No `✓ Lagret`, no `⚠️ Advarsel`. The stripe communicates status.
- **No progress bar showing auto-dismiss countdown.** Power-user detail; not for this audience.

### Optional — translucent variant (iOS 26 Liquid Glass family)

For surfaces where toasts overlay rich content (image-heavy public pages, customer booking flow over photos), a *very subtle* frosted variant is defensible: `background: rgba(255, 255, 255, 0.92)` + `backdrop-filter: blur(8px) saturate(120%)`. Stay solid (`rgba(...,1)`) on dashboard surfaces — translucency hurts legibility on dense content (Apple themselves shipped iOS 26.4 "ultra-light" mode for this reason). Use the solid white surface as the default; opt into translucency per-surface, not globally.

### Anti-patterns

- ❌ **Filled-color backgrounds** (`bg-success-subtle` or `bg-jade-3` for the whole toast). The most recognizable AI-default in the system. Dated; reads heavy on a calm canvas.
- ❌ **Sonner `richColors` mode.** Same problem — turns variants into colored cards.
- ❌ **Generic copy:** `Suksess!` / `Feil!` / `Noe gikk galt`. Always say WHAT happened.
- ❌ **Multi-line explanations.** If it needs explaining, state it inline on the page instead.
- ❌ **Auto-dismissing errors.** Errors are rare; require manual dismiss to confirm read.
- ❌ **Title-as-question** (`Did this work?`). Always a statement.

---

## 12. Destructive actions — undo first, monochrome second, type-to-confirm last

**The trap:** Every destructive button shows an "Are you sure?" dialog with a red button. Users develop confirmation-fatigue and click through them. The dialog stops being a safety net and becomes friction. The red button screams alarm on a calm sand canvas.

**The system:** A three-tier ladder. Most reversible actions get **no modal at all**. Cross-system / multi-person actions get a **monochrome dialog** (no red — copy + position + scope card carry the signal). Catastrophic cascade actions get a **type-to-confirm gate**.

### Decision flowchart (top-down; first YES wins)

```
Is the action catastrophic AND irreversible AND cascades across the org
(delete studio, close account, wipe all historical data)?
  YES → Tier 3: type-to-confirm dialog
  NO ↓
Does it move real money, send emails to other people, or cross a trust
boundary (refund, cancel-with-bookings, leave team)?
  YES → Tier 2: monochrome AlertDialog
  NO ↓
Is it a reversible single-item op with no real-world side effects within
a ~6s window (delete location, remove team member, hide draft)?
  YES → Tier 1: optimistic + Sonner "Angre" toast
  NO  → Tier 2 (default safe)
```

### Tier 1 — toast + undo (the default)

Use `runWithUndo` from `@/lib/undo`. The pattern is delay-commit (Gmail Undo Send): hide the row optimistically, show a 6-second Sonner toast with an `Angre` action, and only fire the network call when the timer expires.

```ts
import { runWithUndo } from '@/lib/undo'

runWithUndo({
  message: 'Stedet er slettet',
  hide: () => setHiddenIds((prev) => new Set(prev).add(loc.id)),
  restore: () => setHiddenIds((prev) => { const n = new Set(prev); n.delete(loc.id); return n }),
  commit: async () => {
    const { error } = await deleteLocation(loc.id)
    if (!error) await refetch()
    return { error }
  },
  errorOf: (r) => r.error,
  errorMessage: 'Kunne ikke slette stedet',
})
```

**Window: 6 seconds.** Long enough to register a misclick, short enough that the row doesn't feel "stuck pending". `runWithUndo` clamps to 3000–10000 ms; don't go longer than 8s without a reason.

**Why delay-commit, not soft-delete:** no DB migration, no `deleted_at` columns, no undelete RPCs. The action *truly* didn't happen if Angre was pressed — auditable, no row to clean up. Matches Linear and Notion for low-stakes deletes.

**Tier 1 edge cases:**
- *Tab close during the 6s window*: the timer dies with the JS context, the commit doesn't fire. Acceptable — same as not having clicked at all.
- *Optimistic UI*: filter the list through a `hiddenIds: Set<string>` in the parent. After the commit succeeds, `refetch` makes the hide permanent; the stale `hiddenIds` entry is harmless.
- *Commit failure*: `restore` + `toast.error`. The row reappears.

### Tier 2 — monochrome AlertDialog (`ConfirmDialog`)

Use `ConfirmDialog` from `@/components/ui/confirm-dialog`. Compound headline (verb + object) above an outlined scope card. **Destructive button is sand-12 dark (`variant="default"`) — not red.** The destructive signal is carried by the copy ("Avlys kurs"), the scope card showing what's affected, and the right-side button position.

```tsx
<ConfirmDialog
  open={open}
  onOpenChange={setOpen}
  ariaLabel="Avlyse kurset"
  headline={`Kurset avlyses og ${count} deltakere refunderes. Det kan ikke angres.`}
  scope={
    <ConfirmScopeItem
      name={courseData.title}
      meta={`${count} deltakere refunderes`}
      trailing={formatKroner(totalAmount)}
    />
  }
  actionLabel="Avlys kurs"
  onConfirm={handleCancelCourse}
  loading={isDeleting}
  loadingText="Avlyser"
/>
```

**Rules:**
- **Restate the action** in the headline. Not "Er du sikker?" — "Avlyse timen?" / "Avbestille påmeldingen?"
- **State the consequences** in one sentence. Number of items, money moved, notifications sent, reversibility.
- **Scope card** shows the specific thing (course title, participant name + amount). Visual confirmation the user is acting on the right object.
- **Button labels are verbs** mirroring the action: "Slett sted" / "Avbestill og refunder" / "Avlys kurs". Never "OK" or "Bekreft".
- **Cancel verb is positive** when the destructive verb is itself "Cancel": pair "Avlys" with "Avbryt" (default) — never "Avlys" with "Avlys". Likewise "Avbestill" pairs with "Avbryt".
- **No red.** `variant="default"` on the destructive button. Red is reserved for `toast.error` and input validation borders.
- **No warning icons** in the headline (no `AlertTriangle`, no `XCircle`). Dated.
- **Cancel left, destructive right.** On mobile they stack with destructive on top — the `AlertDialogFooter` handles this automatically.
- **Focus defaults to cancel.** Radix `AlertDialog` does this for free — do not override.
- **ESC closes, outside-click does NOT.** Radix `AlertDialog` default.
- **Add a checkbox gate** when the action sends notifications or moves money in bulk: `disabled={!acknowledged}` paired with a `<label>` + `<Checkbox>` between the scope card and the footer (e.g. cancel-course-with-refunds). Single-item refunds don't need the checkbox — the scope card already shows the specific person + amount.

### Tier 3 — type-to-confirm (catastrophic only)

Reserve for cascade-and-irreversible actions where the user types the resource name verbatim to enable the destructive button. **At most two flows in Studio**: delete studio (organisation), delete account. Refunds alone do NOT trigger Tier 3 — refunds are Tier 2 with a checkbox gate.

```tsx
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
```

For org-name confirmation (delete studio), show the literal name as a non-selectable label and disable until exact match — case-sensitive, accent-sensitive, trim whitespace.

### Anti-patterns

- ❌ **Confirmation dialog as default.** Use Tier 1 for reversible operations.
- ❌ **Red destructive button.** Sand-12 dark fill. The verb + scope card + position carry the signal.
- ❌ **"Er du sikker?" / "Slette?"** Compound headline only — verb + object.
- ❌ **Warning-triangle icons** in dialog headlines. Dated.
- ❌ **OK / Avbryt** as button labels. Buttons describe the action: "Slett sted" / "Avlys kurs".
- ❌ **"Avbryt" left and "Avbryt" right** when the destructive action is itself "Avbryt" — collision. Use a positive verb on the safe side ("Behold").
- ❌ **Outside-click dismisses** a destructive dialog. Use `AlertDialog` (Radix), not `Dialog`.
- ❌ **Default focus on the destructive button.** Always cancel. Radix `AlertDialog` does this — don't override.
- ❌ **`tone="danger"` / red-themed destructive prop.** Removed from the system. Every destructive dialog is monochrome.
- ❌ **Soft-delete migrations for Tier 1.** Use `runWithUndo` (delay-commit). No `deleted_at` columns needed.
- ❌ **Multiple destructive buttons in one dialog.** Split into two flows or use a checkbox + single action.

---

## 13. Feedback & error states across the app

The single most-reached-for doctrine in the system. Every loading, empty, and error case in the app maps to one cell in the matrix below. Pick the right scope first, then pick the pattern.

### 13.1 The placement matrix

|  | Loading | Empty | Error |
|---|---|---|---|
| **Field** (one input) | spinner inside the field/button (Sonner promise) | — | inline message under input |
| **Section** (one card / component) | skeleton matching the layout | empty state (#6) | inline section error + retry |
| **Page** (whole route) | full-page skeleton template | full-page empty state | **page state shell** — 404, 500, permission |

Plus **toast** (Sonner) — sits across all scopes as transient confirmation of *user-initiated actions* (#11).

**The decision tree, in plain English:**
- Is this confirming a user-initiated action? → **toast**
- Is this a form field that's invalid? → **inline field error** (under the input)
- Did one card / list / section fail to load? → **inline section error** with retry
- Did the whole page fail to load (404, 500, no-permission)? → **page state shell**
- Is this system-level info the user needs to act on (subscription expiring, KYC needed)? → **state it as plain prose on the page where they'd fix it.** No banners, no sidebar dots — Studio has no persistent alert surface.
- Is this a critical block requiring decision (card declined, action irreversible)? → **modal/dialog** (#12)

### 13.2 Field-level errors — the shadcn pattern, full four signals

Studio commits to the shadcn Form pattern: **`aria-invalid` drives the styling, all four signals fire together**. Color isn't enough on its own (colorblind, screen-reader-invisible) — the pattern stacks four signals so the error is impossible to miss.

The four signals on error:

| Signal | What changes |
|--------|-------------|
| **Label** | `data-[error=true]:text-danger` — label color shifts to danger-fg |
| **Input border** | `aria-invalid:border-danger-fg` — destructive border |
| **Ring** | `aria-invalid:ring-2 ring-danger-fg/20` — 20% opacity ring |
| **Error text** | `<FieldError>` primitive — `text-xs font-medium text-danger` + `role="alert"` |

```tsx
import { FieldError } from '@/components/ui/field-error';

<div className="grid gap-2">
  <label data-error="true" className="text-sm font-medium data-[error=true]:text-danger">
    E-postadresse
  </label>
  <input
    aria-invalid="true"
    aria-describedby="email-error"
    className="h-9 px-3 rounded-md border bg-surface text-sm
               border-border
               aria-invalid:border-danger-fg aria-invalid:ring-2 aria-invalid:ring-danger-fg/20
               focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
  />
  <FieldError id="email-error" className="mt-0">
    Skriv inn en gyldig e-postadresse.
  </FieldError>
</div>
```

The trigger is `aria-invalid="true"` — set by your form library (React Hook Form, etc.) based on validation state. Don't manually class-toggle; let aria drive.

**No hand-rolled error text.** All inline field errors use `<FieldError>` (see `components.md` § Form field group). Never write `<p className="text-danger">…</p>` ad-hoc — the primitive is the contract.

**Required field indicators.** No red asterisks. The label color shift on `data-error="true"` is the entire indicator; `aria-required="true"` on the input carries the semantic. The asterisk pattern is old-school and adds chromatic noise for every required field in the form, all the time.

**Field vs form vs section vs toast** — four scopes, four primitives. Don't reach for the wrong one:

| Scope | Primitive |
|---|---|
| Per-field validation | `<FieldError>` |
| Form-level submit failure | `<Alert variant="error" size="sm">` |
| Section data load failure | `<ErrorState onRetry={…}>` (see § 13.4) |
| Transient post-action failure | `toast.error(friendlyError(err))` |

### 13.3 Validation timing — the three-rule pattern

Three rules, in order of precedence. They produce a forgiving, non-frustrating validation experience:

1. **On blur for filled fields.** When the user leaves a field they've typed into, validate. Errors only appear after they've shown intent.
2. **On submit for empty required fields.** Never error before submit on an empty field they haven't touched. "This field is required" appears after they try to send.
3. **On change after first error.** Once a field has shown an error, re-validate on every keystroke. As soon as they fix the input, the error clears immediately.

```ts
// React Hook Form configuration
const form = useForm({
  mode: "onBlur",        // Rule 1
  reValidateMode: "onChange",  // Rule 3
  // Empty required fields stay quiet until submit (Rule 2 is the default)
});
```

**Anti-pattern:** validation on every keystroke from the start. This is the live-validation default and it's wrong — research consistently shows it's frustrating, screen-reader-hostile, and actively harms form completion rates. The only legitimate exception is a password strength meter (which is informational, not error-firing).

### 13.4 Section-level errors — one boundary per widget, bounded retry

When a single card or list fails to load, that section should error gracefully while the rest of the page stays alive. **One error boundary per logical widget.** Don't wrap the whole page in a single boundary — that turns a small failure into a full-page collapse.

```html
<div class="rounded-lg border border-border p-6 flex flex-col items-center text-center">
  <p class="text-sm font-medium text-foreground">Kunne ikke laste påmeldinger</p>
  <p class="mt-1 text-sm text-foreground-muted max-w-sm">
    Sjekk forbindelsen og prøv igjen. Hvis problemet vedvarer, ta kontakt.
  </p>
  <button class="mt-4 btn btn-secondary btn-sm">Prøv igjen</button>
</div>
```

**Retry rules:**
- **Bounded retry.** Capped backoff (e.g., max 3 attempts at 1s / 3s / 6s). Never infinite — that's a self-DDoS.
- **Per-section, not per-page.** If the schedule card fails but the bookings card loads, only the schedule card retries.
- **Show the user the retry option.** Don't auto-retry silently. Honest communication beats hidden retries.

### 13.5 Page-level states — one shell, contextual variants

When the whole route can't render (404, 500, no permission, or still loading), the same shell handles all of it. Same layout, different copy. Studio's audience never has to learn multiple page-error designs.

#### The shell — page-level, no card chrome, no dual button

**No card around the content. No eyebrow. No dual-button. No inline secondary link by default.** The error page lives directly on the page canvas. Illustration → headline → optional supporting line → **at most one** action.

Four reasons:
1. The error itself IS the page — wrapping it in a card adds chrome that says "boxed UI element," not "the entire current state of this page."
2. Dual-button layouts (primary pill + ghost button side-by-side) are the canonical AI/SaaS template render for error pages — every shadcn-default error page ships exactly this.
3. The earlier Studio shell paired primary + inline arrow link below. That still reads as a two-decision page. The browser's back button + URL bar + global nav are always present; an in-page action is only added when there's a useful contextual destination (a deleted course → "Til kursoversikten" makes sense; a typo'd URL → there is no useful destination, so render no button at all).
4. No eyebrow ("404", "500", "Error") — these are developer-speak. The headline already says what happened in plain language.

```html
<main class="min-h-[60vh] flex flex-col items-center justify-center text-center px-6 py-12">
  <div class="mb-8">{{ illustration — optional line-art slot, ~120–160px }}</div>
  <h1 class="text-2xl font-semibold tracking-tight max-w-md">
    {{ headline — what happened, in one plain sentence }}
  </h1>
  <p class="mt-3 text-sm text-foreground-muted max-w-md">
    {{ supporting — optional context }}
  </p>
  <!-- One action, ONLY when the variant supplies a useful destination -->
  <div class="mt-7">{{ optional single primary action }}</div>
</main>
```

#### The primitive — `<PageState>`

Always reach for the primitive at `@/components/page-state/not-found-state` rather than re-implementing the shell. Variants supply pre-set copy + action:

| Variant | When | Headline | Default action |
|---------|------|----------|----------------|
| `generic` | Catch-all 404 / typo'd URL | `Vi finner ikke denne siden` | none (browser back is enough) |
| `course` | Teacher-side course route with missing/deleted id | `Vi finner ikke dette kurset` | `Til kursoversikten` → `/courses` |
| `public-course` | Public course page with bad slug | `Kurset er ikke lenger tilgjengelig` | none |
| `public-team` | Public team page with bad slug | `Vi finner ikke dette studioet` | none |
| `permission` | Signed-out / wrong-account guard | `Du har ikke tilgang til denne siden` | `Logg inn` → `/auth` |
| `server-error` | ErrorBoundary fallback / load-failed page | `Noe gikk galt` | `Last på nytt` → reload |

Override any field via props. Pass `null` to hide a default (`description={null}`, `action={null}`). For non-404 page failures (network errors, etc.) override `title` + `description` + `action` rather than inventing a new shell.

#### Smart-fallback button — when to use it

Older Studio shipped a `handleBackOrFallback()` helper that called `window.history.back()` if the referrer was internal. **Don't reach for this anymore.** Most variants render no in-page action, so the browser's back button handles it. The remaining variants point at a *known* destination (the courses list, the login page), so smart-back guessing isn't useful — the user already wants that specific place.

#### Page-level loading — full skeleton template

Match the actual page layout. If the real page has a hero card + 3 metric tiles + a table, the skeleton has the same shapes. Pulse animation (`animate-pulse`), neutral fills (`bg-muted`).

```html
<div class="space-y-6">
  <!-- mirrors Today hero -->
  <div class="rounded-lg border border-border p-6 animate-pulse">
    <div class="h-3 w-16 bg-muted rounded"></div>
    <div class="mt-2 h-7 w-48 bg-muted rounded"></div>
    <div class="mt-5 pt-5 border-t border-border">
      <div class="h-3 w-32 bg-muted rounded"></div>
      <div class="mt-2 h-4 w-40 bg-muted rounded"></div>
      <div class="mt-2 h-3 w-36 bg-muted rounded"></div>
    </div>
  </div>
  <!-- mirrors metric supporters -->
  <div class="grid grid-cols-2 gap-6 animate-pulse">
    <div class="space-y-2"><div class="h-3 w-32 bg-muted rounded"></div><div class="h-5 w-20 bg-muted rounded"></div></div>
    <div class="space-y-2"><div class="h-3 w-32 bg-muted rounded"></div><div class="h-5 w-20 bg-muted rounded"></div></div>
  </div>
  <!-- mirrors list -->
  <div class="space-y-3 animate-pulse">
    <div class="h-12 bg-muted rounded"></div>
    <div class="h-12 bg-muted rounded"></div>
    <div class="h-12 bg-muted rounded"></div>
  </div>
</div>
```

**Animation: `animate-pulse` (gentle fade), not shimmer** (gradient sweep). Pulse fits Studio's calm aesthetic; shimmer reads as more "energetic SaaS." Tailwind's default `animate-pulse` is exactly the right rhythm — don't customize.

### 13.6 Anti-patterns

The bans for this whole pattern, in one list:

- **No live keystroke validation** (except password strength meters)
- **No "this field is required" before submit** on an untouched empty field
- **No just-color error styling.** Always pair color with another signal (text, icon, aria-invalid)
- **No spinner-as-page** — full-page spinners block the user. Use a skeleton matching the layout.
- **No infinite retry loops** in section error boundaries. Cap at 3 attempts with backoff.
- **No "Are you sure?" generic dialogs** — see #12, undo first
- **No persistent system alerts.** Studio has no banner system, no sidebar attention dots, no notifications inbox. State system-level facts in plain prose on the page where the user would act.
- **No "Go to homepage" as the only 404 action** when the user came from a deleted resource — use a context-aware `<PageState>` variant (e.g. `course` → courses list)
- **No dual-action 404s** (primary button + inline arrow link below). One action, only when the variant has a useful destination. Otherwise, no action — the browser back button suffices.
- **No skeleton + spinner together** on the same loading state. Pick one.
- **No shimmer animation** — pulse only (matches Studio's calm aesthetic)
- **No status-code eyebrow on error pages.** "404", "500", "Error 403" above the headline reads as developer-speak leaking into UI. The headline says what happened in plain language; the eyebrow adds nothing for the user.

---

## 14. Admin form date/time fields

For the admin/teacher dashboard side. Used in "Create course," "Edit course," and similar forms. Three composable fields:

- **DateField** — button-styled input that triggers a calendar popover
- **TimeField** — select with 15-min interval options
- **DurationField** — number input with "min" suffix

Customer-facing booking calendar (with availability + time slot selection) is a separate pattern — not yet documented.

### 14.1 The three fields

| Field | shadcn primitive | Format | Notes |
|-------|-----------------|--------|-------|
| **DateField** | `<Popover>` + `<Button variant="outline">` + `<Calendar>` | `6. mai 2026` (Norwegian) | Single date selection. Past dates disabled by default. |
| **TimeField** | `<Select>` | `18:00` (24h, Norwegian convention) | 15-min intervals: `06:00, 06:15, 06:30…23:45`. |
| **DurationField** | `<Input type="number">` with suffix | `60` + `min` label | Free numeric input, validated as ≥ 15. |

**Why three separate fields, not a combined picker:**
- Easier to validate (each field has its own rule)
- Form rhythm stays consistent (all fields are the same height/shape)
- Mobile-friendly (each field opens its own native control on phones)
- Easier to edit — change one field without re-picking everything

End time is **computed**, not entered. `start_time + duration_minutes`. No "End time" field in the form.

### 14.2 DateField — button-as-input + calendar popover

The date field looks identical to a text input — same height, same border, same radius. Click opens a calendar popover.

```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button
      variant="outline"
      className={cn(
        "w-full h-9 px-3 justify-between font-normal",
        "rounded-md border-border bg-surface text-sm",
        !date && "text-foreground-disabled"
      )}
    >
      {date ? format(date, "d. MMMM yyyy", { locale: nb }) : "Velg dato"}
      <CalendarIcon className="size-4 opacity-50" />
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-auto p-0">
    <Calendar
      mode="single"
      selected={date}
      onSelect={setDate}
      disabled={{ before: new Date() }}
      locale={nb}
      weekStartsOn={1}
    />
  </PopoverContent>
</Popover>
```

**Key props:**
- `disabled={{ before: new Date() }}` — past dates are blocked by default
- `locale={nb}` — Norwegian (Bokmål) day names + month names
- `weekStartsOn={1}` — Monday-first (Norwegian convention)
- `mode="single"` — single date, no range

**Calendar day cell states** (six total):

| State | Treatment |
|-------|-----------|
| Default (current month, available) | `text-foreground`, hover `bg-muted rounded-full` |
| Today | `ring-1 ring-foreground/30 rounded-full` — subtle outline |
| Selected | `bg-foreground text-background rounded-full` — filled circle |
| Hover (non-selected) | `bg-muted rounded-full` |
| Disabled (past) | `text-foreground-disabled`, no hover, `cursor-not-allowed` |
| Other month | `text-foreground-disabled`, dimmer |

**Selected uses circle, not square.** Matches Apple/Cal.com convention; makes selection visually distinct from cell hover.

### 14.3 TimeField — select with 15-min intervals

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
function generateTimeOptions(intervalMinutes: number): string[] {
  const options: string[] = [];
  for (let h = 6; h <= 23; h++) {
    for (let m = 0; m < 60; m += intervalMinutes) {
      options.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return options;
}
```

**Rules:**
- **15-min intervals** — `06:00`, `06:15`, `06:30`, `06:45`… through `23:45`. ~72 options for the typical studio day.
- **Range:** 06:00 to 23:45. Adjust per studio if needed (some studios run 5am classes; the range is the policy).
- **Format: 24h** (`18:00`), Norwegian convention. Don't show AM/PM.
- **Mobile:** native `<select>` triggers OS time picker — ideal. Don't override.

### 14.4 DurationField — free numeric input with suffix

```tsx
<div className="relative">
  <Input
    type="number"
    min={15}
    step={15}
    value={duration}
    onChange={(e) => setDuration(Number(e.target.value))}
    className="pr-12"
  />
  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-foreground-muted pointer-events-none select-none">
    min
  </span>
</div>
```

**Rules:**
- **`type="number"`** — gets numeric keypad on mobile.
- **`min={15}`** — validation; can't go below 15-min class.
- **`step={15}`** — arrow-up/arrow-down on desktop steps in 15-min increments.
- **Suffix "min"** is purely visual — `pointer-events-none` so clicks pass through to the input.
- **`pr-12`** on the input — right padding for the suffix to sit inside.
- No common-duration presets in the dropdown (user said free input). Common values can appear as helper text below: `"45 / 60 / 75 / 90 minutter er vanlig"`.

### 14.5 Form composition — three fields in a row

Desktop layout — three columns, equal weight:

```html
<div class="grid grid-cols-3 gap-4">
  <DateField label="Dato" value={date} onChange={setDate} />
  <TimeField label="Starttid" value={time} onChange={setTime} />
  <DurationField label="Varighet" value={duration} onChange={setDuration} />
</div>
```

Mobile (under ~640px) — stacked single-column:

```html
<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
  ...
</div>
```

**Show computed end time below**, optional but useful:

```html
<p class="text-xs text-foreground-muted mt-1">
  Slutter kl. {computedEndTime}
</p>
```

Computed: `start + duration`. Updates live as user changes any field.

### 14.6 Validation

| Field | Rule | When | Message |
|-------|------|------|---------|
| Date | Required | On submit | `Velg en dato.` |
| Date | Must be ≥ today | Inline (calendar disables past) | (silent — UI prevents) |
| Time | Required | On submit | `Velg en starttid.` |
| Duration | Required + ≥ 15 | On blur (after first error) | `Varigheten må være minst 15 minutter.` |
| End time | Computed | — | (no validation needed) |

Follows pattern #13.3 — on-blur for filled, on-submit for empty, on-change after first error.

### 14.7 Mobile considerations

- **DateField on mobile:** popover renders as a centered modal (shadcn handles this automatically). Calendar grid sized for thumb-tap.
- **TimeField on mobile:** native `<select>` triggers OS time picker. Don't replace it with a custom dropdown — the OS picker is faster and more familiar.
- **DurationField on mobile:** `type="number"` triggers numeric keypad. Stepper buttons (mobile-default) work for ±15min.

### 14.8 Anti-patterns

- **No native `<input type="date">`** in admin forms — Safari macOS still doesn't render it well, Firefox falls back to plain text, and visual inconsistency with rest of form. Use the popover-calendar pattern instead.
- **No combined "datetime-local" input** — splitting date and time into separate fields gives better validation, easier editing, and mobile-friendly OS pickers per field.
- **No "End time" input field** — compute it from start + duration. Two fields > three when one is derivable.
- **No 12h time format with AM/PM** — Norway uses 24h. Don't translate-localize from US patterns.
- **No bigger-than-15-min intervals** without a reason — 30-min default would lock out yoga teachers who run :15 or :45 classes. 15 is the right floor.
- **No common-duration preset dropdown** — you said free input, and that respects flexibility. If presets are needed later, add them as helper-text suggestions (`"45 / 60 / 75 / 90 minutter er vanlig"`), not as a dropdown that replaces the field.

---

## 15. Drawer — quick-glance panel for clickable rows

Studio's canonical "click row → see what matters in 2 seconds, then either close it or go deeper on the full page" pattern. **The drawer is supplementary; the page is primary.** When the detail becomes the subject (you'd bookmark it, share it in Slack, sit with it for >30s), it's a page, not a drawer.

Built on shadcn primitives:
- **Desktop:** `<Sheet>` (Radix Dialog under the hood) — slides in from right
- **Mobile:** `<Drawer>` (Vaul, by Emil Kowalski) — slides up from bottom

Same content, surface adapts to viewport.

### 15.1 When to use a drawer (and when not)

**Use a drawer when:**
- A list row needs a quick status check or one-action operation (publish, share, mark as paid, cancel)
- The user benefits from keeping the list visible behind it (compare items, jump between rows)
- The content is supplementary — it annotates the list, it isn't the subject
- The whole detail comfortably fits in ~480px width AND ≤2 sections

**Don't use a drawer for:**
- **Editable forms with more than 2-3 fields.** Editing is a page concern — the drawer holds an "Åpne X-side →" escape link to the page where editing happens
- **Anything bookmarkable / shareable.** If the user might paste the URL in Slack or email, it must be a page. URLs of bookmarkable detail use `/resource/:id`; drawer state uses `?resource=:id` over the list URL
- **Critical confirmations** — "delete this account" needs a focused dialog (§12), not a drawer
- **Multi-step wizards** — Studio doesn't use wizards (§16); for "Create X" use a trimmed quick-create drawer (6–8 fields, no advanced options) that escapes to the page after success
- **Full-screen content** — long-form pages, complex multi-column layouts

### 15.1a Density ceiling — the hard limit

A drawer that exceeds any of these is wrong by definition:

| Property | Ceiling |
|----------|---------|
| Sections (h3 / divided blocks) | ≤2 |
| Form fields | 0 in a *view* drawer; ≤8 in a quick-create drawer |
| Footer actions | ≤3 (typically: one primary action + one escape link, or one escape link only) |
| Scroll | Acceptable only for an unbounded list (participants preview, sessions list); never for a stacked form |

If you need more than this, you've discovered a page, not a drawer. Add the escape link and move the content to `/resource/:id`.

### 15.2 Anatomy

Three structural parts. Header is always visible; footer is sticky; body scrolls.

```
┌─────────────────────────────────────────┐
│ Title                                 × │  ← Header
├─────────────────────────────────────────┤
│                                         │
│  Body — content (form / read-only)      │
│  Scrollable when content overflows      │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│  [Avbryt]                    [Lagre]   │  ← Footer (sticky)
└─────────────────────────────────────────┘
```

**Header** — title (left), close × button (right). Optional status badge inline with the title. **Trimmed by default**: `py-3` height, `text-sm font-semibold` title — the title reads as a quiet label, not a heroic page title. No subtitle / description in the header — the body's first section heading carries the next-level context.

**Why a title in every drawer:** accessibility (`aria-labelledby` on the dialog), convention (Linear, Notion, Stripe, Slack all do this), and consistency (one drawer pattern, not "title sometimes / title never"). Generic action titles ("Opprett kurs") feel slightly redundant with the first section heading, but the trim — small text, short header — gets ~80% of the airiness benefit without breaking the pattern.

**Body** — content area. Padding `p-6`. Scrolls vertically when content exceeds viewport.

**Footer** — sticky to the bottom of the drawer. Right-aligned actions: ghost/secondary on the left, primary on the right. Border-top to separate from scrolling body.

### 15.3 Width and placement

| Viewport | Pattern | Width |
|----------|---------|-------|
| Desktop (≥640px) | Sheet — slides from right | `w-full sm:max-w-[480px]` |
| Mobile (<640px) | Drawer (Vaul) — slides from bottom | Full viewport width, default 80vh height, expandable to full |

**Why 480px on desktop:** comfortable for full-width form fields, doesn't dominate larger screens. Linear uses ~440; Notion's side peek is ~50%. 480px is the sweet spot for Studio's form-heavy detail views.

### 15.4 Close behaviors

Three close affordances. **All three must work** for accessibility and user expectation.

| Affordance | When |
|-----------|------|
| **× button** in header (top right) | Always present. Visible, click-targetable, screen-reader-labeled (`aria-label="Lukk"`). |
| **Escape key** | Always works. Closes the drawer regardless of focused field. |
| **Click outside** (backdrop) | Default yes. **Silently blocked when the form is dirty** — `onPointerDownOutside={(e) => { if (isDirty) e.preventDefault() }}`. No modal, no toast, no chrome. |

**Silent backdrop block for unsaved input** (the preferred pattern; supersedes the older "confirm dialog" advice for drawers with form input):

When a drawer has form input the user has invested in, the backdrop tap is the accidental gesture worth intercepting — especially on tablets where the dimmed area outside a 480px sheet is most of the screen. Silently `preventDefault()` on the backdrop when the form is dirty. × and Esc remain free because both are deliberate gestures.

**Why silent over a confirm dialog:**
- An AlertDialog ("Forkast endringene?") is the same chrome used for "Delete permanently?" — way too heavy for "you typed a title."
- §12 doctrine: confirm dialog is the *second tier* of destructive UX (after toast+undo). Unsaved form input in a quick-create drawer doesn't qualify for the dialog tier.
- Silence requires no chrome, no decision, no read — the safety just *is*. The user only notices when they try to ditch real progress; even then, × and Esc are escape hatches.

```tsx
<Sheet open={open} onOpenChange={onOpenChange}>
  <SheetContent
    onPointerDownOutside={(e) => { if (isDirty) e.preventDefault() }}
    // Esc and × handled separately, both close freely.
  >
    {/* ... */}
  </SheetContent>
</Sheet>
```

Reserve the AlertDialog "Forkast endringene?" pattern for the rare case where data loss is genuinely catastrophic (multi-section forms with 10+ filled fields, irreversible flows). For quick-create drawers (≤8 fields), silent backdrop block is enough.

**Subtle backdrop overlay**: `bg-foreground/20` (sand-12 at 20% opacity) fades in behind the drawer. Signals focus without strong dimming.

### 15.5 Read-only by default — editing lives on the page

The drawer body is **read-only quick-glance**. No form fields, no inputs, no save bar. The user sees the state (title, status, participants, sessions) and operates via a small set of quick actions (publish, share, unpublish via kebab). Anything that requires editing a form goes to the full page reached via the "Åpne X-side →" footer link.

**The exception — quick-create drawers.** For "Create X" flows where the entity doesn't exist yet, a trimmed create drawer with the bare-minimum required fields is the right pattern (Notion page creation, Linear issue creation, Cal.com event creation). After creation, the user lands on the full page where they refine. The density ceiling still applies: ≤8 fields, one section, validation on submit, no advanced options.

**Why not inline-edit in the drawer:**
- Multiple modes inside one drawer (view → edit → pricing → create) is the bloat that turned CourseDrawer into a 1,600-line monolith. Modes are pages.
- Form state + save bar inside a drawer competes with the page's own concerns and creates two visual save targets.
- "I just want to look" and "I want to change something" are different intents — the drawer answers the first quickly; the page answers the second thoroughly.

For **destructive operations** in a view drawer (unpublish, cancel a course), surface them in the kebab/`MoreHorizontal` menu in the action cluster — not in the footer. Confirm via dialog (§12) when undo isn't enough.

### 15.6 Footer — one escape link, nothing else

The footer contains exactly one thing: the **"Åpne X-side"** ghost link to the full page.

```html
<div class="border-t border-border px-6 py-4 bg-background">
  <button class="btn btn-ghost btn-sm -ml-2 text-foreground-muted hover:text-foreground">
    Åpne kursside
  </button>
</div>
```

**Rules:**
- **Label:** `Åpne <ressurs>-side` (Norwegian; "Åpne kursside", "Åpne påmeldingsdetaljer"). Neutral — doesn't commit to view-vs-edit. No trailing arrow icon — text alone is enough (see SKILL.md § 3 anti-patterns: no icons in text-bearing buttons).
- **Variant:** ghost link, `size="sm"`, left-aligned. Not a primary button — the escape is *secondary*; the drawer's real value is the quick view above it.
- **Position:** bottom-left of the footer. Right-of-footer is reserved for nothing — leave it blank.
- **Behavior:** clicking closes the drawer and navigates to `/resource/:id`. The page mounts in place of the drawer (Notion-style); no overlay over the drawer.

**Quick-create drawers are the only exception** — they have a sticky footer with just the primary action right-aligned: `[Opprett]`. **Drop the `[Avbryt]` ghost button** — the drawer already has three close affordances (×, Esc, backdrop tap when clean) per §15.4, so a fourth one in the footer is visual noise that fights the primary action for attention. Linear / Notion / Stripe checkout all drop it. On successful create, navigate to the new entity's page.

**Sticky positioning:** the footer is `position: sticky; bottom: 0` with `border-t border-border bg-background`. Body content scrolls under it.

### 15.7 Mobile considerations

On mobile (`<640px`), the drawer becomes a Vaul-powered bottom sheet:

```tsx
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";

// Pair with Sheet via responsive switching:
const isMobile = useIsMobile();
const Component = isMobile ? Drawer : Sheet;
```

**Mobile-specific behavior:**
- Slides up from bottom
- Default ~80vh height; user can drag the grab handle up to expand to full screen
- Swipe down on the grab handle to dismiss
- Backdrop dim same as desktop (`bg-foreground/20`)
- Footer remains sticky to the bottom of the drawer
- Header still has × button (don't rely on swipe-to-dismiss alone — it's not discoverable)

### 15.8 Anti-patterns

- **No drawer-from-drawer.** Opening a second `<Sheet>` from inside a `<Sheet>` is forbidden. Confirmation modals (`AlertDialog`) layered above a drawer are fine — they're a different stacking concern. If a drawer needs to navigate to a different entity's details, close the drawer and open the new one; never stack.
- **No multi-mode drawers.** A drawer that switches between "view / edit / pricing / create" inside the same panel is the failure mode this whole pattern exists to prevent. Each mode is a different page or a different drawer.
- **No form-stuffed drawers.** Drawers with more than 8 fields, multiple sections, or a save bar competing with the page have failed the density ceiling (§15.1a). Move the form to a page and add the escape link.
- **No "Edit details" + "Pricing" + "Settings" buttons in the footer.** That's three escape hatches pretending to be a router. Use one neutral "Åpne <ressurs>-side →" link; the page itself handles section navigation.
- **No drawers wider than 560px on desktop.** If your detail view needs more space, it's a page, not a drawer.
- **No drawer-as-modal-confirmation.** "Are you sure you want to delete?" is a dialog (§12), not a drawer.
- **No swipe-only dismiss on mobile.** Always include the × button — swipe alone fails for users who don't know the gesture.
- **No persistent (non-modal) drawer.** Studio drawers are modal — they have a backdrop and capture focus. Persistent panels (Linear-style "always visible right rail") are a different pattern, not in scope here.
- **No drawer that wraps a wizard.** Studio doesn't use wizards (§16). For "Create X" use a trimmed quick-create drawer with bare-minimum fields, then escape to the page.

---

## 16. No wizards — sectioned forms + setup checklists instead

**Studio does not use multi-step wizard navigation.** No step indicators, no Back/Next button progression, no "Step 1 of 4" rhythm. The pattern is reserved for products with genuinely complex flows that demand guided sequence; Studio's flows don't qualify.

Three replacement patterns cover everything a wizard would do:

| What was a wizard | Replace with |
|------------------|--------------|
| Create course / Edit course | **Sectioned form** in a drawer (or page) |
| Studio onboarding | **Setup checklist** on a dedicated page |
| Stripe / Dintero KYC | **Embedded vendor UI** — Stripe and Dintero ship their own |
| Quick add (signup, etc.) | **Drawer with simple form** (#15) |

### 16.1 Why no wizards

- Studio's flows are short (≤10 fields, 2-3 logical sections). Single forms handle this.
- Yoga teachers aren't novice users on most operations — they know what fields a course has. Forced linearity feels patronizing.
- Wizards add code complexity (step state, per-step validation, navigation guards) that doesn't earn its weight here.
- Calm aesthetic stays calmer without step indicators marching across the screen.

The genuine win: every wizard avoided is one less thing for users to learn and one fewer flow for the team to maintain.

### 16.2 Sectioned form — the create-course pattern

A single form with visible section headings, divided by spacing and (optionally) thin top borders. No step navigation. One Submit at the bottom. Auto-save per field handles draft state.

**Lives inside a drawer** (#15) for compact forms (course creation, quick edits) **or on a full page** for complex ones (studio settings with many sections). The drawer fits ~10 fields across 3 sections comfortably.

```html
<form class="flex flex-col h-full">
  <!-- Body — scrollable, p-6 -->
  <div class="flex-1 overflow-y-auto p-6 space-y-8">

    <!-- Section 1 — no top border (it's the first) -->
    <section>
      <h3 class="text-base font-semibold text-foreground">Grunnlag</h3>
      <p class="mt-1 text-sm text-foreground-muted">Navn og type bestemmer hvordan kurset vises i bookinglenken.</p>
      <div class="mt-4 space-y-4">
        <!-- form fields -->
      </div>
    </section>

    <!-- Section 2+ — top border for visual chunk -->
    <section class="pt-8 border-t border-border">
      <h3 class="text-base font-semibold text-foreground">Timeplan</h3>
      <p class="mt-1 text-sm text-foreground-muted">Når og hvor kurset finner sted.</p>
      <div class="mt-4 space-y-4">
        <!-- DateField + TimeField + DurationField -->
      </div>
    </section>

    <!-- Section 3 -->
    <section class="pt-8 border-t border-border">
      <h3 class="text-base font-semibold text-foreground">Pris og kapasitet</h3>
      <div class="mt-4 space-y-4">
        <!-- Pris, Maks deltakere -->
      </div>
    </section>
  </div>

  <!-- Footer — sticky -->
  <div class="border-t border-border px-6 py-3 flex justify-end gap-2 bg-surface">
    <Button variant="secondary" size="sm">Avbryt</Button>
    <Button size="sm">Opprett kurs</Button>
  </div>
</form>
```

**Section heading conventions:**
- `text-base font-semibold` (16px / 600) — same as a card title in dashboard tier
- One-line description below in `text-sm text-foreground-muted` — optional, only if the section name isn't self-explanatory
- `space-y-8` between sections (32px) — `pt-8 border-t border-border` for visual chunk on sections 2+
- Within a section: `space-y-4` between fields (16px)

**Why these spacings:** vertical-rhythm research — space before a heading should be ~2× space between fields. Our space-y-4 between fields (16px) → space-y-8 (32px) before section headings fits the math.

**Auto-save indicator (optional)**
For longer forms, a subtle "Lagret kl. 14:32" indicator below the footer reassures the user. See pattern #11 (toast) for transient confirmations of save events too.

### 16.3 Setup checklist — the onboarding pattern

A dedicated `Kom i gang` page with task rows. Each task links to the page where the work happens. **No forced order** — user can tackle any task at any time.

Industry pattern: Stripe Atlas, GitHub onboarding, Notion setup. Userpilot research: 3-5 task checklists with state visualization (complete/pending) reduce drop-off in onboarding.

```html
<main class="max-w-3xl mx-auto px-6 py-12">
  <!-- Header -->
  <header class="flex items-baseline justify-between mb-8">
    <h1 class="text-3xl font-semibold tracking-tight">Kom i gang</h1>
    <p class="text-sm text-foreground-muted tabular-nums">3 av 6 fullført</p>
  </header>

  <!-- Task list -->
  <div class="rounded-lg border border-border overflow-hidden">

    <!-- Completed task -->
    <a href="/innstillinger/studio" class="flex items-center gap-4 px-5 py-4 border-b border-border
                                            hover:bg-muted no-underline">
      <span class="size-5 rounded-full grid place-items-center bg-success-subtle text-success shrink-0">
        <CheckIcon class="size-3" />
      </span>
      <div class="flex-1">
        <p class="text-base font-medium text-foreground-muted">Studio-info</p>
        <p class="text-sm text-foreground-muted">Navn, beskrivelse, og kontaktinfo</p>
      </div>
      <ArrowRightIcon class="size-4 text-foreground-muted" />
    </a>

    <!-- Pending task -->
    <a href="/kurs/ny" class="flex items-center gap-4 px-5 py-4 border-b border-border
                              hover:bg-muted no-underline">
      <span class="size-5 rounded-full border-2 border-border shrink-0"></span>
      <div class="flex-1">
        <p class="text-base font-medium text-foreground">Opprett ditt første kurs</p>
        <p class="text-sm text-foreground-muted">Sett opp kurset, datoer, og pris</p>
      </div>
      <ArrowRightIcon class="size-4 text-foreground-muted" />
    </a>
    <!-- ... more tasks -->
  </div>
</main>
```

**Task state treatment:**

| State | Status icon | Title color | Body color | Hover |
|-------|------------|------------|-----------|-------|
| **Pending** | `size-5 rounded-full border-2 border-border` (empty circle) | `text-foreground` | `text-foreground-muted` | `bg-muted` |
| **Complete** | `bg-success-subtle text-success` filled circle with ✓ | `text-foreground-muted` (dimmed) | `text-foreground-muted` | `bg-muted` |

The completed task title is **dimmed** (`text-foreground-muted`) — visually communicates "done, deprioritized" without striking through or removing it. User can revisit any task by clicking.

**The ✓ on completed tasks is the one place Studio uses success green** in the dashboard. It's earned: completing a setup task is a positive event, the green is small and contained, and it's the one moment of dopamine in an otherwise neutral onboarding. Don't extend success-fg to other dashboard contexts on this basis.

**Progress indicator:** simple `3 av 6 fullført` text — no progress bar, no percentage. For a 5-6 task list, the count communicates progress with less chrome than a bar.

**Where the checklist lives:**
- A dedicated route (e.g., `/kom-i-gang` or `/sett-opp`)
- Sidebar nav item (no count badge — Studio doesn't carry attention indicators on nav items)
- Auto-redirect new users here on first sign-in
- Hide the nav item once all tasks complete (or move it to "Hjelp")

### 16.4 Embedded vendor UI

Stripe Connect, Dintero, and similar vendors ship their own KYC / onboarding flows as embeddable components. Studio embeds them; doesn't replicate them.

**Rule:** never re-implement a wizard for a flow that the vendor already provides. Use their component, style its container with Studio tokens (the iframe / embedded UI usually inherits page bg), and accept that the vendor's UI may not perfectly match Studio. That's fine — users see vendor-flow consistency across products too.

### 16.5 Anti-patterns

- **No `<Stepper>` component in Studio.** Don't add one. If a flow is genuinely too complex for a sectioned form, it's probably too complex for a wizard too — break it into smaller separate flows or pages.
- **No "Back / Next" button progression** anywhere in the dashboard. Drawers and pages use Cancel/Save patterns instead.
- **No step indicators** (numbered dots, progress bars, or labeled steps) in any form.
- **No "review step" before submit.** Forms are short enough that the user reads them on the way down. If you genuinely need a review (rare — e.g., legal commitment), use a confirmation dialog (#12) on submit.
- **No locked / sequential task gating** in setup checklists. User can do tasks in any order. If tasks have dependencies (e.g., can't accept payments until KYC done), surface that on the relevant page when they try, not by greying out the checklist row.

---

## 17. Page layout & responsiveness

Where content lives on the page and how the layout adapts from mobile to ultrawide. The single most important layout rule:

> **Every page — dashboard and public — uses `mx-auto max-w-6xl`.** Content centers within the available viewport (post-sidebar on dashboard, full viewport on public). Pick one width and one alignment, apply consistently.

### 17.1 The decision tree

```
Every page (dashboard or public)
│
└─ Layout: `mx-auto max-w-6xl` (centered, 1152px outer / ~1088px content after lg:px-8)
   On dashboard: sidebar pinned left, content centered in the post-sidebar area.
   On public: content centered in the full viewport.
   Empty space at ultrawide splits across both sides — symmetric, balanced.
```

This is a Studio-specific choice. Both centered and left-aligned dashboards ship in well-regarded SaaS apps — Stripe centers, Linear / Vercel / Cal.com left-align. Studio chooses centered because:

1. **The audience isn't power-user / data-heavy.** A wellness teacher doesn't scan dashboards 50× a session; they open it, do one thing, leave. The "left anchor for fast scanning" argument applies to productivity tools, not calm operator UIs.
2. **Ultrawide feel.** With a 280px sidebar pinned left + 1024px content also pinned left, a 1920px+ display reads as lopsided (two left-anchored columns + one big empty right). Centering halves the void into balanced margins on both sides.
3. **Consistency cost.** When some pages are `max-w-4xl mx-auto` and some are `max-w-6xl` left-aligned, content jumps between pages — that inconsistency is a bigger UX problem than the alignment choice itself. Studio collapses both decisions into one rule: `mx-auto max-w-6xl` everywhere.

### 17.2 Max-widths by surface — four values, each with a clear job

| Surface | Token | Alignment | When |
|---------|-------|-----------|------|
| **Dashboard pages** | `mx-auto max-w-6xl` (1024px) | Centered | Every admin page |
| **Public content** | `mx-auto max-w-6xl` (1024px) | Centered | Landing, booking listing — public non-prose, non-form. |
| **Course detail body** | `mx-auto max-w-[1100px]` (1100px) | Centered | Course detail page body. Hero is full-bleed; body is a 2-col grid (main + 360px sticky rail). See §18.2. |
| **Long-form prose** | `mx-auto max-w-3xl` (768px) | Centered | Legal, privacy, terms, FAQ |
| **Centered forms** | `mx-auto max-w-md` (~448px) | Centered | Login, signup, password reset |

**The rule, simplified:**
1. Dashboard or public content? → `mx-auto max-w-6xl`
2. Heavy reading? → `mx-auto max-w-3xl`
3. Compact form? → `mx-auto max-w-md`

If you can't tell which one a page is, it's probably (1) — that covers ~90% of pages. Everything is centered; only the width changes.

**Reading-width constraint:** body text within all of these respects the 50-75 character line length (~66 ch sweet spot, per Baymard / NN/g). This isn't just convention — **WCAG 2.1 SC 1.4.8** specifies "no more than 80 characters" for AA-conformant prose. Long-form prose narrows to 3xl for that reason. The 4xl-tier surfaces mix cards / forms / lists — body text within them is bounded by component widths, not the page itself.

**Note on the 6xl choice:** industry consensus for dashboard max-widths trends 1140-1280px (Carbon, Material, several SaaS dashboards). Studio uses `max-w-6xl` (1152px outer), squarely in the lower range. **The math that matters:** with `lg:px-8` internal padding (32px each side), effective content width on desktop = 1152 - 64 = **~1088px**. We tested narrower options:

- `max-w-4xl` (896 outer / 832 effective) — read as a tablet view; unoptimized for desktop
- `max-w-5xl` (1024 outer / 960 effective) — too narrow once padding eats the budget; gutters were barely visible at 1366px–1440px viewports

`max-w-6xl` is the floor for "feels designed for desktop" while staying within Studio's calm-canvas philosophy. Don't widen further (`max-w-7xl` = 1280) without a clear reason — that crosses into power-user-dashboard density. Don't narrow either; we already proved 5xl is too tight after padding.

### 17.3 Container padding — three tiers

```
Mobile (<640px)        →   px-4   (16px)
Tablet (640-1024px)    →   px-6   (24px)
Desktop (≥1024px)      →   px-8   (32px)
```

Standard responsive container:

```html
<!-- Every page — dashboard and public -->
<main class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
  <!-- content -->
</main>
```

One container shape for the whole app. The only thing that varies between dashboard and public is the page chrome around it (sidebar / no sidebar) — the inner content shell is always `mx-auto max-w-6xl`.

### 17.4 Breakpoints

Tailwind defaults, used with intent. Studio doesn't override.

| Token | Width | Treat as |
|-------|-------|----------|
| `sm` | 640px | Large phone landscape / small tablet |
| `md` | 768px | Tablet portrait |
| **`lg`** | **1024px** | **Laptop — sidebar appears at this breakpoint** |
| `xl` | 1280px | Desktop |
| `2xl` | 1536px | Large desktop / external monitor |

**The single most important breakpoint for Studio: `lg` (1024px).** Below it, dashboard becomes mobile-shaped (sidebar collapsed to hamburger menu, drawer becomes bottom sheet, cards stack). At and above, full dashboard layout.

### 17.5 Ultrawide behavior (4K, 5K, 6K)

Two options, only the right one:

| Strategy | What happens at 5K | Use for Studio |
|----------|--------------------|---------------|
| **Stretch content** to fill | Cards/tables expand, readability dies | ❌ Never |
| **Center content** with `mx-auto` | Empty space splits both sides | ✅ Always |

Concrete: a dashboard at 5120px (5K) shows:
- Sidebar (280px) on the left
- Post-sidebar area: 4840px wide
- Content (max 1152px outer / ~1088px after `lg:px-8`, via `max-w-6xl`) centered within the post-sidebar area
- ~1908px of empty space on each side of the content

That's correct. Don't try to fill it. The content column reads at a comfortable line-length wherever it sits, and balanced margins on both sides feel calmer than a content column hard-anchored to the sidebar.

### 17.6 Mobile rules at the page level

Below `lg` (1024px), the dashboard transforms:

| Element | Mobile behavior |
|---------|----------------|
| **Sidebar** | Hidden by default; opens as a Vaul-powered drawer from the left when user taps a hamburger button in the top app bar |
| **Top app bar** | Appears below `lg` with hamburger left + page title center + actions right |
| **Page padding** | `px-4` (16px) on mobile → `px-6` tablet → `px-8` desktop |
| **Cards** | Single column stack |
| **Multi-column form rows** (date / time / duration grid) | Collapse to single column |
| **Right-side drawer** (#15) | Becomes bottom sheet (Vaul) |
| **Tables** | Either horizontal scroll within container, or restructure as card list (case-by-case) |

Components keep their own internal responsive logic (a course card adapts, a calendar grid adapts). Page-level rules just handle the sidebar collapse and padding.

**Vertical rhythm tightens on mobile.** Reduce the desktop spacings by one step on small screens:

| Spacing | Desktop | Mobile (`<sm`) |
|---|---|---|
| After page header | `mb-8` (32px) | `mb-6` (24px) |
| Between major sections | `space-y-8` | `space-y-6` |
| Between subsections | `space-y-6` | `space-y-4` |

The research basis: heading top-spacing should be ~2× paragraph spacing — but on mobile the absolute paragraph spacing is smaller, so headings tighten proportionally. Without this, mobile pages feel airy/fragmented.

### 17.6a Sidebar dimensions

| Property | Value |
|---|---|
| **Width (desktop)** | `256px` (16rem) — within research range 220-300px. Wide enough for label + leading icon comfortably; narrow enough to leave room for `max-w-6xl` content centered beside it. |
| **Top-level item count** | **5-7 items max** — research-backed cognitive cap. Beyond 7, scanning collapses; users either ignore items or scroll past. If you have more nav items, group into sections with sub-headings, not into a 12-item flat list. |
| **Collapsed state (optional)** | 64px-wide rail showing icons only with tooltips on hover. **Studio's audience doesn't need this** — yoga teachers don't want the chrome customization burden. Skip the collapse toggle for v1. |
| **Border separator** | 1px on the right against `bg-background` — same hairline used everywhere else in the system. |

### 17.7 Page header pattern

Every dashboard page starts with the same anchor: title left, optional actions right. Don't reinvent this per page.

```html
<header class="flex items-end justify-between gap-4 mb-8">
  <div>
    <h1 class="text-2xl font-semibold tracking-tight">Påmeldinger</h1>
    <p class="mt-1 text-sm text-foreground-muted">12 aktive · 3 venter</p>
  </div>
  <div class="flex gap-2">
    <Button variant="secondary" size="sm">Eksporter</Button>
    <Button size="sm">Ny påmelding</Button>
  </div>
</header>
```

**Rules:**
- Title `text-2xl font-semibold tracking-tight` (24px / 600 / `-0.01em`) — same scale as the canonical h2.
- Optional subtitle/meta (`text-sm text-foreground-muted`) — short context line, never a full sentence. Use for counts (`12 aktive · 3 venter`), date ranges (`Mai 2026`), or status (`Sist oppdatert kl. 14:32`).
- Actions: max 2 buttons, primary on the right. If you need 3+, group secondary actions in a `<DropdownMenu>` triggered by a kebab.
- `mb-8` (32px) below header — first page section starts here.
- **No breadcrumbs by default.** The sidebar shows where you are; breadcrumbs are redundant. Add them only inside multi-level navigation (e.g., `Studio › Sal 1 › Tirsdag` for a specific resource path).
  - **When you do need them:** placement is **between the global nav and the page title**, NOT below the title (Carbon / USWDS convention). Breadcrumbs are wayfinding chrome, not part of the page header itself.
  - **Mobile:** collapse to a single back-link (`← Sal 1`) showing only the immediate parent. Full trails don't fit on small screens and adding an overflow menu adds complexity for a feature 90% of mobile users won't use.
- **No tabs in the header.** Tabs go *below* the header, separated by `mb-6`, so the page anchor (title) reads independently of the slicing tool.

### 17.8 Section rhythm within a page

Pages are typically composed of 2–4 sections (header + content). Sections are separated by spacing alone, not borders.

| Spacing | Use |
|---|---|
| `mb-8` (32px) | After page header |
| `space-y-8` | Between major sections (KPIs → table, summary → list) |
| `space-y-6` | Between subsections within one section |
| `space-y-4` | Between cards in a section |
| `space-y-2` | Between rows in a list |

**Don't add horizontal dividers between sections.** White space alone separates them — dividers add visual chrome that's already implied by the gap.

**Section titles within a page** are optional and rare. Most pages have one anchor (the page title) and content flows below. Add a subtitle / `text-base font-semibold` divider only when the page genuinely splits into multiple labeled regions (e.g., a settings page with `Generelt`, `Fakturering`, `Team` sections).

### 17.9 Anti-patterns

- **Don't mix max-widths across dashboard pages.** Every page shell is `mx-auto max-w-6xl`. Mixing `max-w-4xl` / `max-w-6xl` / `max-w-6xl` across pages causes content to jump horizontally between routes, which reads as broken layout. Narrower inner blocks (a centered form at `max-w-md`, long-form prose at `max-w-3xl`) are fine — but the page shell stays 5xl.
- **Don't stretch content past max-width to fill ultrawide screens.** Cards become too wide, tables become hard to scan, line-lengths exceed the readable range. Embrace the empty space.
- **Don't use `max-w-full` or no max-width on dashboard pages** unless the page is genuinely full-bleed (e.g., a calendar view that benefits from horizontal space). Default to a sensible cap.
- **Don't put a sidebar on public/booking pages.** Public surfaces are sidebar-less — they're for users who haven't yet entered the app. Adding a sidebar there muddies the public/private surface distinction and puts navigation chrome in front of users who don't need it yet.
- **Don't override Tailwind breakpoints** without a reason. The defaults are well-researched. Studio uses them as-is.
- **Don't forget the `lg` threshold.** Sidebar appearing/disappearing happens at 1024px, not at custom values. Building responsive components around `lg` keeps the system consistent.

---

## 18. Course detail page — public archetype

The first page a customer lands on after clicking a course in a studio's listing. It carries the entire booking conversion. Layout is canonical — don't redesign per studio.

**The 2-col-with-sticky-rail layout is the right answer here, but only with the calmer chrome.** The page felt SaaS-template before because of the *content* (decorative tints, accordion dates, separate cards), not because of the 2-col structure itself. With those issues fixed (photo hero, monochrome avatar, dates inline, no decorative tints), the rail earns its place: booking is the page's purpose, and a sticky panel keeps that action visible. Hiding it below 5+ scrolls of content makes the user dig.

### 18.1 Anatomy

```
┌──────────────────────────────────────────────────────────┐
│ PublicNav                                                │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ Photo hero — full-bleed, ~16:7 aspect                    │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  [max-w-[1100px] centered, 2-col grid]                   │
│  ┌──────────────────────────┐  ┌──────────────────┐      │
│  │ [main, max-w-[640px]]    │  │ BookingPanel     │      │
│  │                          │  │ (sticky 360px)   │      │
│  │ Title + meta             │  │                  │      │
│  │                          │  │ • Pris breakdown │      │
│  │ ── Instructor ──         │  │ • Contact fields │      │
│  │                          │  │ • Terms          │      │
│  │ Om kurset                │  │ • [Book og betal] │      │
│  │ (description)            │  │ • Cancel note    │      │
│  │                          │  │                  │      │
│  │ Datoer (compact line)    │  └──────────────────┘      │
│  │ 13. mai · 20. mai · ...  │                            │
│  │                          │                            │
│  │ Sted (map + address)     │                            │
│  │                          │                            │
│  │ Praktisk                 │                            │
│  │                          │                            │
│  │ Andre kurs (shelf)       │                            │
│  └──────────────────────────┘                            │
├──────────────────────────────────────────────────────────┤
│ PublicFooter                                             │
└──────────────────────────────────────────────────────────┘
                                      │
                                      └─ Mobile only:
                                         MobilePriceBar (fixed bottom)
                                         BookingPanel inlines after description
```

### 18.2 Container — 2-col body inside max-w-[1100px]

Hero is full-bleed (breaks out of the body container). Body sits at **`mx-auto max-w-[1100px] px-8 py-10`** as a 2-col grid:

- **Main column**: `minmax(0, 1fr)` with content capped at `max-w-[640px]` for reading-comfort
- **Right rail**: fixed `360px` for the BookingPanel (slightly tighter than the 380px earlier draft — saves ~20px without changing the form)
- **Gap**: `48px` between columns

```html
<main>
  <CourseHero /> <!-- full-bleed -->
  <div class="mx-auto max-w-[1100px] px-8 py-10 grid grid-cols-[minmax(0,1fr)_360px] gap-12 items-start">
    <article class="max-w-[640px] space-y-10">
      <!-- title, instructor, description, dates, sted, praktisk, cross-sell -->
    </article>
    <aside>
      <BookingPanel class="sticky top-24" />
    </aside>
  </div>
</main>
```

The earlier `max-w-6xl` (1152px) was a hair too wide — `max-w-[1100px]` keeps the page centered without padding the rail farther from the main column than necessary. § 17.2 lists this as the documented exception.

### 18.3 Photo hero — default, not fallback

Wellness apps lead with photography. ClassPass, Y7, Glo, time2book — every reference uses imagery as the hero. Studio commits to **photo hero as the default**. Studios upload an image when they create a course (or the system uses a default they've set on their profile).

```html
<div class="relative w-full aspect-[16/7] bg-muted">
  <img src="..." alt="" class="w-full h-full object-cover" />
  <!-- Optional studio eyebrow overlay, bottom-left -->
  <p class="absolute bottom-7 left-8 text-xs font-medium uppercase tracking-wide text-white/90">
    Inspire Yogastudio
  </p>
</div>
```

**Aspect ratio: 16:7** on desktop (cinematic, not square; not 16:9 which feels TV-y). Mobile reduces to 4:3 or 3:2 for content efficiency.

**Typographic fallback** — only when `course.image_url` is null AND the studio has no default. Same `aspect-[16/7]` slot, but `bg-background` with the studio name + course title rendered as text. Hairline `border-b border-border` separates from body. **Never a pop-tint placeholder** — that's the coloring-book move we explicitly rejected.

**Don't add a CTA inside the hero.** The hero is identification; the BookingPanel section near the bottom is action.

### 18.4 Title row + meta — no review widget

Directly below the hero, inside the main column:

```html
<header>
  <h1 class="text-3xl font-semibold tracking-tight">Vinyasa Flow — kursrekke</h1>
  <p class="mt-2.5 text-base text-foreground tabular-nums">Tirsdager kl. 18:00 — 19:30 · 8 ganger</p>
</header>
```

**No reviews / star-rating slot.** ClassPass shows `4.5 ⭐ 30,000+ reviews` because their booking is mediated by a marketplace where customer reviews matter. **Studio's customer is booking a class at a specific studio — they're not comparing across thousands of options, and yoga classes don't get rated like Airbnb stays.** Reserving an "Ingen anmeldelser ennå" slot would be theater: chrome that signals "this is a real thing" without any actual signal behind it.

If a studio later adds reviews (post-launch feature), they live in their own section further down the page (after Praktisk), not in the title row.

### 18.5 Instructor — moved up, prominent, between hairlines

Wellness research is consistent: the instructor is one of the strongest trust signals. The customer is committing time + money to a *person*, not just a slot. The instructor block sits **immediately after the title, between hairlines** (`border-y border-border py-4`) — visible on first scroll, not buried mid-body.

```html
<section class="flex items-center gap-4 border-y border-border py-4">
  <!-- Avatar: photo when available, monochrome fallback when not -->
  <div class="size-14 rounded-full bg-muted grid place-items-center text-foreground font-medium shrink-0">
    A
  </div>
  <div>
    <p class="text-xs font-medium text-foreground-muted">Med</p>
    <p class="text-base font-medium">Anna Berg</p>
    <p class="mt-0.5 text-sm text-foreground-muted">Yogalærer i 12 år. Vinyasa og yin-spesialist.</p>
  </div>
</section>
```

**Avatar: monochrome fallback only when no photo.** No pop tints. (See § Card system for the avatar rule.)

### 18.6 Description

Plain typography section. Body copy at **`text-base leading-relaxed`** (16px / ~1.625) — the public-surface body default. No card wrapper.

### 18.7 Datoer — collapsed by default, expandable

The dates matter, but most customers don't need the specific 8 dates to decide whether to book — they already know it's a Tuesday class from the title meta. **The full date list is collapsed behind a `Vis alle` disclosure** — visible on click for customers who want the specifics, hidden for everyone else.

The summary stays minimal: just `Datoer` + the disclosure affordance. No `Tirsdager · 8 ganger · 13. mai — 1. juli` secondary line — that's clutter that competes with the section title for attention. The customer already knows the schedule pattern from the title meta; the count is implied; the date range belongs *inside* the disclosure (in the rows themselves).

```html
<details class="border border-border rounded-md">
  <summary class="flex items-center justify-between px-[18px] py-3.5 cursor-pointer">
    <span class="text-[15px] font-medium">Datoer</span>
    <span class="flex items-center gap-1.5 text-sm text-foreground-muted font-medium">
      Vis alle
      <ChevronDown class="size-3 chev" /> <!-- rotates 180° when open via CSS -->
    </span>
  </summary>
  <ul class="border-t border-border list-none m-0 p-0">
    <li class="flex justify-between items-baseline px-[18px] py-2.5 text-sm tabular-nums border-b border-border last:border-b-0">
      <span>13. mai</span>
      <span class="text-foreground-muted">kl. 18:00 — 19:30</span>
    </li>
    <li class="flex justify-between items-baseline px-[18px] py-2.5 text-sm tabular-nums border-b border-border last:border-b-0">
      <span>20. mai</span>
      <span class="text-foreground-muted">kl. 18:00 — 19:30</span>
    </li>
    <!-- ... 6 more rows ... -->
  </ul>
</details>
```

**Rules:**
- **Use the native `<details>` element** for free progressive disclosure (works without JS, accessible by default).
- **Suppress the native disclosure triangle**: `summary { list-style: none } summary::-webkit-details-marker { display: none }`. Provide your own affordance — `Vis alle` text + a chevron that rotates 180° when open.
- **Summary is just the title + affordance.** No secondary text ("Tirsdager · 8 ganger · 13. mai — 1. juli"). Repeating the schedule pattern there clutters the row and duplicates information already in the title meta.
- **Expanded rows: date left, time right** (`flex justify-between`). Each row format: `DD. month` (foreground) + `kl. HH:MM — HH:MM` (muted). **No weekday name on each row** — that's repetitive when every session is on the same weekday (Tirsdag every line). The schedule pattern lives in the title meta; the rows are about the *specific dates*.
- **Container has a thin border** (`border border-border rounded-md`) — gives the disclosure a clear visual unit so the click target is obvious.
- **For drop-in (single session)**: skip this section entirely. Date is in the title meta.
- **For online or studio classes with varying weekdays across sessions** (rare): rows can include the weekday — `Mandag 13. mai`. But only when the weekday actually varies between sessions; not for the common kursrekke case.
- Section renders only when `course.course_type === 'course-series'` and `sessions.length > 1`.

### 18.8 Sted — map preview, not address-only

Wellness apps that book physical classes show a map preview, not just a text address. ClassPass and SoulCycle both do this. Studio uses a **static map thumbnail** (Mapbox Static Images API or Google Static Maps) — ~200×200, pin centered.

```html
<section>
  <h2 class="text-xl font-semibold tracking-tight mb-3">Sted</h2>
  <div class="grid grid-cols-[200px_1fr] gap-5 items-start">
    <img src="https://api.mapbox.com/.../static/{lng},{lat},14/200x200" 
         alt="Kart" class="rounded-md aspect-square object-cover" />
    <div>
      <p class="text-base font-medium">Inspire Yogastudio</p>
      <p class="mt-0.5 text-sm text-foreground-muted">Storgata 12, 0182 Oslo</p>
      <a href="..." class="mt-3 inline-block text-sm font-medium">Vis i kart →</a>
    </div>
  </div>
</section>
```

**Why a static map**, not interactive: an interactive map invites zoom/pan distraction during a booking flow. Static is enough — clicking opens the user's preferred maps app.

For online classes, this section is replaced by a small `Online · møter via Zoom` line; no map.

### 18.9 Praktisk

Plain typography section, like Description. No card wrapper — the heading + paragraph sit directly on the canvas.

### 18.10 BookingPanel — sticky right rail

The BookingPanel sits in the right rail of the 2-col grid, **sticky** with `top-24` offset (clears the public nav). Stays visible as the customer scrolls through description, dates, location.

```html
<aside>
  <div class="sticky top-24 bg-surface border border-border rounded-xl p-[22px] flex flex-col gap-4">
    <!-- Price breakdown -->
    <dl class="space-y-2 tabular-nums">
      <div class="flex justify-between text-sm">
        <dt class="text-foreground-muted">Pris (8 ganger)</dt>
        <dd class="font-medium">2 200 kr</dd>
      </div>
      <div class="flex justify-between text-sm">
        <dt class="text-foreground-muted">Tjenestegebyr</dt>
        <dd class="font-medium">50 kr</dd>
      </div>
      <hr class="border-border my-1" />
      <div class="flex justify-between text-base font-semibold">
        <dt>Totalt</dt>
        <dd>2 250 kr</dd>
      </div>
    </dl>

    <!-- Contact fields stack vertically inside the rail -->
    <div class="flex flex-col gap-3">
      <FormField label="Navn"><Input /></FormField>
      <FormField label="E-post"><Input type="email" /></FormField>
    </div>

    <Checkbox label="Jeg godtar vilkårene" />

    <Button class="w-full">Book og betal — 2 250 kr</Button>

    <p class="text-xs text-foreground-muted text-center leading-4">
      Avbestill innen {{ window }} for full refusjon<br>
      Sikker betaling med Vipps eller kort
    </p>
  </div>
</aside>
```

**Rules:**
- **Width: 360px** (rail width set by the parent grid).
- **Sticky behavior: `sticky top-24`** — stays in view; releases naturally at the column's natural bottom.
- **No chrome change on stick.** Don't add a shadow when the rail crosses the viewport edge or fade in. The calm aesthetic relies on stillness; the rail is just always there.
- **Bordered card chrome** (`bg-surface border border-border rounded-xl`) — the rail is one of Studio's "explicit grouping" surfaces (per §components.md card rules). Keep the border; this is the right place for it.
- **Contact fields stack** inside the 360px rail (not 2-col like the inline variant) — width doesn't allow side-by-side cleanly.
- **Cancellation policy preview** is the small line under the CTA — `Avbestill innen {{ window }} for full refusjon`. Window is per-studio configurable; same source of truth as §23 cancel dialog and §19 confirmation page.

**Why a rail (not inline)**, despite the calm aesthetic: booking IS the page's purpose. Hiding it below 5+ scrolls of description / dates / location / praktisk forces the customer to dig. The 2-col with rail keeps the action visible from the start — and with all the *other* chrome calmed (monochrome surfaces, no SaaS-template hero, no accordion dates), the rail itself doesn't make the page feel template-y. The chrome was the problem, not the structure.

### 18.11 Cross-sell shelf

Bordered cards. Suggestion-tier surface, not protagonist.

### 18.12 Mobile

Below `lg` (1024px), the 2-col grid collapses to single column:
1. Photo hero (aspect ratio drops to 4:3 or 3:2, taller for vertical viewport)
2. Title + meta
3. Instructor (still hairline-bracketed)
4. **BookingPanel inline** here, immediately after the instructor (`<div class="lg:hidden">` variant of the rail content) — gives quick access to booking on mobile without scrolling
5. Description
6. Datoer (compact line)
7. Sted (map stacks above text)
8. Praktisk
9. Cross-sell

Plus **MobilePriceBar** fixed at the bottom of the viewport — persistent CTA bar so booking is always one tap away.

**MobilePriceBar specs:**
- Height: **56-60px** (research-optimal)
- Content: price (left) + primary CTA pill (right)
- Background: `bg-surface` with subtle top border, no shadow
- Safe area: `pb-[env(safe-area-inset-bottom)]` on iOS

```html
<div class="lg:hidden h-20" aria-hidden /> <!-- spacer so the bar doesn't cover content -->
<MobilePriceBar />
```

### 18.13 Conditional sections

- **Datoer section** — only renders when `course.course_type === 'course-series'` and `sessions.length > 0`, OR `sessions.length > 1` for non-series.
- **Cross-sell shelf** — only when there's at least one other public course from the same studio.
- **Description section** — only when `course.description` exists.
- **Reserved rating slot** — always renders, even with zero reviews (the slot itself is the trust signal).

### 18.14 Anti-patterns

- ❌ **Dates as a row-per-date table** when the time is constant. For kursrekke with `Tirsdager kl. 18:00 — 19:30` already in the meta, repeating that on 8 rows is filler. Compact single-line list.
- ❌ **Dates buried in an accordion** at the bottom of the page. The dates are part of the offer; surface them visibly.
- ❌ **Typographic-only hero as the default.** Lead with photography. Typographic is the rare fallback for studios with zero images.
- ❌ **Buried instructor** mid-body after description and info cluster. Move them up, between hairlines, immediately under the title.
- ❌ **Reviews / star-rating widgets** of any kind on a class booking page. Yoga classes don't have meaningful review chrome — reserving an "Ingen anmeldelser ennå" slot is theater. ClassPass shows reviews because they're a marketplace; Studio's customer is booking at one studio they already chose.
- ❌ **Tabs inside the body** (Description / Practical / Dates as tabs). Customers want the whole page in one read. Stack everything.
- ❌ **Skeleton flash on hero image load.** Use a blur-up placeholder (Next/Image `placeholder="blur"`).
- ❌ **CTA inside the hero visual.** The BookingPanel rail is the action; hero is identification. No double CTA.
- ❌ **Pop tints used as decoration.** Studio has no chromatic accent palette — every surface is monochrome sand with status colors as the only chromatic exception.
- ❌ **Cross-sell cards in pop colors on this page.** They're suggestions, not protagonists. Bordered/white only.
- ❌ **Scarcity / FOMO messaging.** "Only 2 spots left!" / "Booked 15 times in last 6 hours." Counter to the calm tone.
- ❌ **Chrome change when the sticky rail engages.** No shadow, no border darken, no scale on scroll. The rail is just always there — visual changes break the calm presence.

---

## 19. Customer booking flow — the conversion journey

The end-user (booking customer) journey from "I want to do yoga" to "I'm booked." Different audience from the dashboard: customers are anonymous, time-pressured, often on mobile, and have zero training in the app. Doctrine for this audience overrides several dashboard rules.

### 19.1 The four stages

```
Discovery        →  Detail          →  Booking          →  Confirmation
─────────────       ─────────────       ─────────────       ─────────────
Studio listing      Course detail       Ticket select       Receipt
(/{slug})           (§18)               + customer info     + next steps
                                        + payment           
                                        (single page,
                                        progressive form)
```

No multi-step wizard. The booking action is one screen with progressive disclosure — fields appear as needed (ticket count → contact → payment), but the whole flow stays on one route. **Baymard data: one-page checkouts convert ~21% better than multi-step for simple purchases (1-3 products)**. A yoga class booking is the simplest case — one ticket, one customer. The conversion case for one-page is unambiguous here.

### 19.2 Principles

**Guest checkout, always.** No forced account creation before booking. Baymard: **19% of US shoppers abandon checkout** specifically because account creation is required; **70% of customers prefer not creating accounts**; mobile completion is **26% higher** with guest checkout. Forcing signup is the single highest-impact conversion killer.

**Account creation, AFTER the booking succeeds.** The optimal hybrid: offer account creation on the success page as an opt-in incentive ("Lagre detaljer for raskere booking neste gang — 1 klikk"). Research: **25-40% of guests convert to accounts post-purchase** when offered this path. You get the conversion AND the account, without gating.

**Email is the receipt.** The on-screen confirmation is a UI state; the email is what the customer keeps. Send it before the success page renders. If email send fails, retry — never tell the user "your booking failed" because email failed.

**Embedded payment, not redirect.** Use Dintero embedded checkout (or Stripe Elements). Redirecting to an external payment page breaks the flow trust and adds drop-off. **Tradeoff to acknowledge:** embedded checkout means PCI scope (frontend handling card data) — use the payment provider's iframe-based component (Stripe Elements, Dintero embedded) which keeps Studio out of PCI scope while preserving the on-domain experience. Pure redirect is faster to implement and PCI-free, but the conversion cost (loss of attribution, brand break, drop-off) outweighs the dev simplification for v1.

**Mobile-first, not mobile-friendly.** Most bookings happen on phones during a commute, in bed, before sleep. Design the mobile booking flow first; desktop is the secondary surface. **Mobile cart abandonment exceeds 75%** industry-wide — every friction point on mobile costs more than the equivalent on desktop. The MobilePriceBar (§18.6) is a customer-flow primitive, not a polish detail.

**Thumb-zone CTA placement.** Primary booking actions (the submit button, the mobile price-bar CTA) sit in the bottom third of the screen. The top third is hard to reach one-handed; the middle is the eye's resting zone; the bottom third is where thumbs naturally land. This isn't aesthetic — it's the research-backed reachability heuristic for mobile commerce.

**Pricing transparency — and it's regulated.** Show service fee inline with subtotal from the very first render — never as a surprise at the payment step. **44% of online consumers cite surprise fees as their #1 shopping peeve** (across multiple retail studies). The **FTC Rule on Unfair or Deceptive Fees (effective May 2025)** mandates that all unavoidable fees be displayed upfront — Studio complies by structural design, not retrofit. Use `formatKroner` for all amounts. "What the customer sees first equals what they pay."

**Field count: ≤6 for the entire booking flow.** Industry norms cap at 12-14; Studio aims lower. For a typical class booking: name + email + phone + (optional) note + terms checkbox + payment iframe handled separately = 5 customer-input fields. Beyond 6, ask: is this field really needed for booking, or could it be collected later in the customer's account?

**Norwegian payment methods — Vipps is essential.** Adding 1-click payment options (Apple Pay, Google Pay) lifts conversion 16-21% globally. **For Norway specifically, Vipps is the equivalent and dominant mobile-pay option** — supporting it is non-negotiable for the audience. Card payment is the fallback. Order in the embedded checkout: Vipps first, card second, anything else third.

**Trust signals at the right moments.** Studio brand at the top (PublicNav), studio name in the booking panel header, payment provider logo near the submit button (e.g. "Sikker betaling med Dintero"), SSL lock visible in the URL bar. Don't carpet-bomb the page with badges — research is clear that excessive trust seals reduce trust ("badge fatigue"). One small line of micro-copy + one provider logo is enough.

### 19.3 BookingPanel composition

The booking panel is the single most important component on the public surface. Its content sequence:

```
┌─────────────────────────────────────┐
│ Course meta                         │  ← e.g. "Kursrekke · ons. kl. 18:00"
│ Course title (text-xl, font-semibold)│
├─────────────────────────────────────┤
│ Pris               2 200 kr          │  ← formatKroner, tabular-nums
│ Tjenestegebyr        50 kr   ⓘ      │  ← inline tooltip on the ⓘ
│ ─────────────────────────────────   │
│ Totalt             2 250 kr          │
├─────────────────────────────────────┤
│ Antall billetter   [−]  1  [+]      │  ← stepper for ticket count
├─────────────────────────────────────┤
│ Navn                                │  ← contact info, progressive
│ E-post                              │
│ Telefon                             │
├─────────────────────────────────────┤
│ ☐ Jeg godtar vilkårene              │  ← required checkbox
├─────────────────────────────────────┤
│ [    Book og betal — 2 250 kr   ]   │  ← primary CTA, full-width pill
│       Sikker betaling med Dintero   │  ← trust micro-copy
└─────────────────────────────────────┘
```

**Rules:**
- Total amount is **inside the CTA label** — customers want to confirm what they're charging right at the click.
- **Stepper, not select**, for ticket count when 1–8 max. Steppers are easier to thumb-tap on mobile.
- **Form validation: progressive.** Don't show errors before submit attempt; let the user fill linearly. After first submit attempt, switch to `reValidateMode: "onChange"` so corrections update immediately (per §13.3).
- **Submit button copy**: imperative + amount: `Book og betal — 2 250 kr`. Not `Bekreft`, not `Submit`, not bare amount.
- **Free courses**: CTA becomes `Bekreft påmelding` (no amount). Skip the payment step entirely.

### 19.4 Confirmation page

After payment succeeds, route to `/{slug}/checkout-success?...` — never stay on the booking page. The transition signals "this part is done." The confirmation page shows:

1. **What was booked** (course title, date/time)
2. **What was paid** (amount, last-4 if card)
3. **Booking reference code** — short alphanumeric (e.g. `7HFK2N`) shown as `text-xs text-foreground-muted` below the booked-item summary. Research: non-technical customers reference this code when emailing the studio about their booking ("min påmelding: 7HFK2N"). It's quiet but earns its place.
4. **Cancellation policy reinforcement** — single muted line: `Avbestill innen 24 timer for full refusjon.` Hospitality UX research: reinforce policy here so customers who missed it during booking find it. Same per-studio configurable window as §18.4b.
5. **What's next** (calendar download — single `.ics` link, email confirmation note)
6. **Single CTA**: `Tilbake til {studio}` — back to the studio's listing, NOT a "Book another course" upsell.
7. **Optional account-creation hook** (the post-purchase incentive): one quiet line + button — `Lagre detaljer for raskere booking neste gang` → opens a tiny inline form (just password; email is already known). Research: 25-40% take this when offered. **Quiet, opt-in, never modal.** A celebratory "Create an account!" modal at this moment reads as bait-and-switch.

No marketing, no upsells, no "Rate your experience" prompt. The customer just paid; let them leave.

**Email confirmation companion content** (matches what the customer sees on screen):
- Same booked-item summary + booking reference code
- The cancellation policy stated in plain Norwegian (full sentence, not a link to a policy page)
- A direct link back to the booking in the customer account (or for guest bookings, a tokenized link to a booking-management view)
- Studio's contact info (phone or email), one line, in case the customer needs help
- No marketing, no "follow us on Instagram" footer, no further-classes carousel. Receipt only.

### 19.4a Confirmation page styling — typography, not celebration chrome

The confirmation moment is calm, not celebratory. Studio explicitly **does not** use:

- ❌ **Large green checkmark in a `bg-success-subtle` circle.** This is the Stripe / Shopify / Calendly visual cliche. It reads as "we've stamped your receipt with a sticker" — fine for an e-commerce vendor, contradictory for Studio's calm wellness tone. Drop the icon entirely; the heading `Du er påmeldt` carries the moment.
- ❌ **Confetti animations, celebration bursts, success sounds.** The customer paid for a yoga class, not for a slot machine. Stillness is the right register.
- ❌ **Pop-tinted summary cards** on the confirmation page. The booked-item card is bordered + white, same as every other card in the system. The success of the moment is conveyed by *what the page tells the customer* (you're in, here's the reference, here's how to add to calendar, here's how to cancel), not by visual decoration.

The page is structured: heading → booked-item card → cancellation policy line → calendar download → optional account hook → muted "back to studio" link. White, bordered, calm.

### 19.5 Anti-patterns

- ❌ **Multi-step booking flow** (1. Pick tickets → 2. Contact → 3. Payment). Adds friction; collapses to one page in our system.
- ❌ **Forced account creation before booking.** Always offer guest checkout.
- ❌ **External payment redirect** (full-page jump to Stripe Checkout). Embed always.
- ❌ **Silent service fee** revealed only at the payment step. Always inline and visible from the start.
- ❌ **"Are you sure?" before payment.** The CTA has the amount in it; the confirmation IS the dialog. Don't double-confirm.
- ❌ **Loading spinner taking over the screen** during payment. Use the inline button-spinner pattern; keep the booking summary visible so customers know what they're paying for.
- ❌ **Marketing copy on the success page.** They paid; let them go.
- ❌ **Sending email AFTER showing success.** Email is the receipt of record — send it first, then render success.

---

## 20. Search & results

Search in Studio is a *filter*, not a discovery primitive. The audience doesn't need a `cmd+k` palette or fuzzy global search across 50 entity types — they need to narrow lists they're already looking at.

### 20.1 Two patterns, choose one

| Pattern | When | Where |
|---|---|---|
| **List filter** | Filtering a list the user is already on | Top of every list page (Påmeldinger, Kurs, Kunder). Live filtering with `onChange` debounced ~200ms. |
| **Page-scoped search** | Looking for something the user *can name* on a specific page | Public studio page (search across that studio's courses) |

**No global command palette.** `cmd+k`-style fuzzy search across the whole app is a power-user pattern. The UX-patterns consensus: command palettes are for "complex apps with many features (dashboards, dev tools, productivity apps) where power users want to move fast" — and explicitly *not* for "simple apps or consumer apps where users rarely learn keyboard shortcuts." Studio's audience is yoga teachers and wellness customers; they don't memorize keyboard shortcuts and don't have 200+ destinations to jump to. Adding `cmd+k` adds chrome and a feature surface no one uses. If the user can't find something via the sidebar + page filter, the navigation is wrong, not the search.

### 20.2 List filter — anatomy

```
┌──────────────────────────────────────────────────────────┐
│ Påmeldinger                                  [Ny påmelding]│
│ 12 aktive · 3 venter                                       │
├──────────────────────────────────────────────────────────┤
│ ┌──────────────────────┐  [ Kommende  · I dag · Tidligere ]│
│ │ 🔍 Søk på navn…      │                                  │
│ └──────────────────────┘                                  │
├──────────────────────────────────────────────────────────┤
│ ...filtered list...                                        │
└──────────────────────────────────────────────────────────┘
```

- **Search input** uses the search-input component (see components.md). Icon left, clear-× right when value present, placeholder is imperative (`Søk på navn…`).
- **Position**: top-left of the list, alongside any tabs / filter chips. Search and tabs are *complementary* — search narrows within whatever tab is active.
- **Live filtering**: `onChange` with debounce. Two values depending on where the filter runs:
  - **Client-side** (the array is in memory, e.g. < ~500 items): **150-200ms**. The filter is cheap; the debounce just keeps it from firing on every keystroke. Sub-300ms feels instant.
  - **Server-side** (debounced API call, large datasets): **300-500ms**. Above 300ms feels deliberate; below 300ms can hammer the backend.
  - Studio's typical lists (påmeldinger, kurs, kunder) are well under 500 items per studio, so client-side at 200ms is the default.
- Don't add a "Search" button — that's a server-search pattern. List filter is client-side instant.
- **Width**: ~280-320px on desktop. Don't stretch full-width — it overshadows the list.

**Diacritic & case insensitive matching — required for Norwegian names.**

Plain `value.includes(query)` fails on Norwegian names: searching `"anna"` should match `"Anna"`, `"ANNA"`, `"Annå"`, and `"Ånna"`. Normalize both sides before comparing:

```ts
const normalize = (s: string) =>
  s
    .toLocaleLowerCase("nb-NO")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

const matches = items.filter((item) =>
  normalize(item.name).includes(normalize(query))
);
```

`NFD` decomposes accented characters, then `\p{Diacritic}` strips the diacritical marks. Result: `"anna"` matches `"Anna"`, `"Annå"`, `"Ánna"`, etc. This is mandatory for any Studio search input over user-typed names.

For typo tolerance (e.g. `"anaa"` → `"Anna"`), bring in **Fuse.js** or **uFuzzy** — both client-side, both handle datasets up to ~1000 items at instant speed. Skip fuzzy for v1 unless customer search starts missing real matches; the diacritic-strip above handles the 90% case.

### 20.3 Empty results state

When the filter matches zero rows:

```
[No matches]
Ingen påmeldinger matcher "anna"
[ Tøm søk ]
```

- Centered text, `py-12`, single secondary action (`Tøm søk` / clear search) that resets the filter. Per Carbon / PatternFly empty-state guidelines: heading + body + secondary action.
- **Don't show the regular empty-state copy** ("Ingen påmeldinger ennå") — that's misleading; there ARE påmeldinger, they just don't match. Empty *filter* state needs different copy than empty *list* state.
- **Don't suggest similar matches.** General empty-state research recommends "suggest related content" for empty-results — but that's scoped to large search systems (e-commerce search across thousands of products, where typos happen and recovery has high upside). For Studio's 30-500 row client-side filters, the dataset is small enough that "did you mean..." adds chrome without payoff: the user can see the list shape from the heading alone (`Ingen påmeldinger matcher "anna"`) and the next step (clear filter) is one tap. Skip suggestions until/unless analytics show real abandonment at this state.

### 20.4 Page-scoped search (public)

For the public studio page where customers can search across that studio's courses:

```html
<input type="search" placeholder="Søk i kurs…"
  class="h-10 w-full max-w-md mx-auto..." />
```

- **Wider input** (h-10 not h-9) on public surfaces — touch-friendly.
- **Centered** when it's the page's primary action.
- **Result list**: same card layout as the studio's full course listing — search filters, doesn't transform the layout.

### 20.5 Anti-patterns

- ❌ **Global command palette** for the audience. Power-user feature; not for this app.
- ❌ **Server-side search with submit button** when the data is already in the page. Live-filter the array.
- ❌ **Search across entity types** (courses + customers + signups in one search). Each list filters itself.
- ❌ **Highlighted match terms** in search results. Useful in IDE search; over-engineered for a 30-row list.
- ❌ **"No results" state that looks identical to empty list state.** Distinguish them — different copy, different action.
- ❌ **Search input full-bleed at the top of the page.** Too prominent for a feature most users won't use; compresses next to other filters instead.

---

## 21. Authentication & sign-in

The entry to every Studio surface — sign-in, sign-up, forgot password, account verification. Different audiences need different defaults; Studio commits to two distinct auth paths and a small shared visual language.

### 21.1 Login is universal — role is decided in onboarding, not at the form

The login form **cannot know your role when you arrive at it** — there's no way to tell a customer apart from a teacher just from "user opens /login." So the form is the same for everyone. The customer-vs-teacher split happens in **one onboarding step right after register**, where the user is asked what they want to do. That answer is stored on the account and used to route every future login automatically.

```
First time:                         Returning visitor:
  /signup → form → email verify       /login → identifier-first form
            ↓                                   ↓
   ONE onboarding step:                System looks up role from account
     "Hva vil du gjøre?"                       ↓
       ◯ Booke klasser                  Routes to customer dashboard
       ◯ Drive et studio                       OR teacher dashboard
            ↓                                   (same login page either way)
     Routes to relevant
     post-signup experience
```

**Auth method recommendation (default for all accounts):**

| Method | Default for | Why |
|---|---|---|
| **Magic link** (email → click) | Default for everyone | Notion 64% → **87%** onboarding completion after dropping passwords. Figma: 91% first-attempt success. Magic link is friendlier than password for sporadic and regular users alike — and fits Studio's calm tone. No password to remember, lose, or reset. |
| **Password** (optional, opt-in) | Set later in account settings | Some teachers prefer one-tap browser-keychain login for daily dashboard use. Register doesn't ask for a password — users opt into one in *Innstillinger → Sikkerhet* if they want. |
| **Passkey** (auto-prompted) | After first password login | Auto-prompted passkey enrollment lifts adoption 30-50% vs. manual opt-in. Sits as an upgrade path, never as a register requirement. |
| **Vipps Login / Google SSO** | Accelerator buttons on every auth screen | One-tap account creation pre-fills name + verified email. Then the role question still applies — Vipps doesn't tell us if the user is a customer or teacher. |

The login form uses **identifier-first** — user types email, system looks up the account and offers the method appropriate to it (passkey if enrolled, otherwise magic link, with password as a fallback for accounts that have one set). One UI, multiple branches behind it.

### 21.2 Form principles

These apply to every auth form (login, signup, forgot password, reset):

**Field count: minimum viable.**
- Sign-up: just email (+ password if not magic-link-only). Industry consensus: 27% abandon forms that feel too long; forms with ≤4 questions get the highest completion.
- **Drop the confirm-password field.** Case study: removing it lifted conversion 56.3%. The 2005 rationale (compensating for hidden-by-default password fields) is gone now that show-password toggles are standard.
- Drop "first name + last name" if the auth event doesn't actually need them. Collect at first booking, in profile setup, or post-purchase.

**Single column, never two.**
Single-column forms align with vertical scanning patterns and complete faster. Multi-column auth forms exist only because designers got bored.

**Show password requirements upfront.**
Below the password field, show what's required *before* the user submits. NIST 2024+ guidance: **length over complexity.** Studio's rule:
- **Minimum 12 characters.** No uppercase/symbol/number rule.
- Single-line helper: `Minst 12 tegn` (Norwegian).
- If you must enforce complexity, list as bullets with live checkmarks as each is met.

**Show-password toggle.**
Eye icon on the right of the password field. Toggling reveals the value (changes `type="password"` → `type="text"`). Reduces typo errors dramatically, especially on mobile. No longer a security concern.

**Inline validation after blur.**
Per §13.3 — don't validate as the user types the first time; do validate inline once a field is touched. Same rule.

**Social / SSO buttons (Google, Apple, Vipps Login).**
Provider-branded buttons stack above the email field with `eller` (or) divider below. Norwegian convention: include **Vipps Login** as a top-tier option for Norwegian users — same logic as Vipps for payment (§19.2).

```html
<button class="...">Logg inn med Google</button>
<button class="...">Logg inn med Vipps</button>
<div class="...">eller</div>
<input type="email" placeholder="E-postadresse" />
```

### 21.3 Page layout

Every auth page is a **centered single-column form** at `max-w-md` (~448px) per §17.2. No sidebar (this is public surface). **No outer card chrome around the form** — auth is single-purpose, there's no other content competing on the page that needs to be visually separated *from* the form. The centered column IS the form. The "card on canvas" treatment is a SaaS-template tell.

Page structure:

```
┌────────────────────────────────────────┐
│                                        │
│              Studio logo               │  ← top-aligned, ~24px high
│                                        │
│         {Page title}                   │  ← text-2xl font-semibold
│         {Optional subtitle}            │  ← text-sm muted
│                                        │
│         [SSO buttons stacked]          │
│                                        │
│         ─── eller ───                  │  ← divider with text
│                                        │
│         [Email field]                  │
│         [Password field — if present]  │
│         [Submit button — full-width]   │
│                                        │
│         {Footer link, e.g.             │
│          "Glemt passord?"}             │
│                                        │
└────────────────────────────────────────┘
                                      ↓
                            "Har du ikke konto? Lag en"
                            (cross-flow link, bottom of page)
```

- **Logo top, title left-aligned.** Don't center the title text — single-column forms read left-aligned regardless of container centering.
- **Submit button full-width** inside the form column — primary pill, `cta` size (44px) for thumb reach.
- **Cross-flow link** (`Logg inn` ↔ `Lag konto`) at the bottom, one short sentence — never a separate button competing with the submit.

### 21.3a Onboarding role step — the only place customer/teacher splits

Immediately after the user verifies their email (or completes Vipps/Google sign-up if the account is new), they land on a role-selection screen. **This is the only point in the system where customer and teacher diverge**; the result is stored as `role` on the user record and used to route every subsequent login.

**Anatomy:**

```
[Logo]

Hva vil du gjøre?
Vi tilpasser opplevelsen etter dette.

┌──────────────────────────────────────┐
│ ◉  Booke klasser                      │  ← radio + title + description
│    Finn og book yoga, pilates eller   │     wrapped in a clickable card
│    andre klasser hos studios i        │     so the whole row is the
│    nærheten.                          │     hit target
├──────────────────────────────────────┤
│ ◯  Drive et studio                    │
│    Sett opp ditt eget studio, lag    │
│    kurs, og motta påmeldinger.        │
└──────────────────────────────────────┘

[ Fortsett ]

Du kan endre dette senere i innstillingene.
```

**Rules:**
- **Two options only.** Adding "I do both" or "Other" creates ambiguous routing for no benefit. Pick one; the user can switch later in settings.
- **Whole-row click target.** Each option is a `<label>` wrapping the radio + content — clicking anywhere in the row selects it. Touch-friendly.
- **Description per option** explains the consequence of choosing it (`Finn og book yoga…` vs `Sett opp ditt eget studio…`). Without the description users guess what each role unlocks.
- **Always reversible.** Surface "Du kan endre dette senere i innstillingene" right under the submit. Roles are sticky in practice (most users don't switch) but the option must exist — closes the door on regret-driven abandonment.
- **No skip-this option.** The role is required to know which surface to route to next. Vipps/Google accelerators don't bypass this — they pre-fill name/email but don't tell us the role.
- **Default selection:** `Booke klasser` (the larger audience). Reduces decision time for the typical case; teachers self-select the second option.
- **Routing after submit:**
  - `Booke klasser` → public studio listing or last-clicked course (if they came from a booking flow)
  - `Drive et studio` → setup checklist (§ Setup checklist)

### 21.4 Magic link flow (default for everyone)

```
1. User types email → "Send link"
2. Page transitions to: "Vi sendte en lenke til {email}"
   + Re-send button (disabled 30s, then "Send på nytt")
3. User clicks link → authenticated, redirect to where they came from
```

**Rules:**
- **Confirm message stays generic** even if the email isn't registered. `Vi sendte en lenke til [email]` regardless of account existence — prevents account enumeration (security pattern, not just UX).
- **Same-device click handling.** Magic link should re-use the original session if clicked on the same device. Cross-device click is more brittle (can lose session context); flag it explicitly: "Klikk lenken i samme nettleser hvor du startet."
- **Token lifetime: 15-60 minutes.** Single-use, invalidated immediately after redemption.
- **Re-send button** must wait 30s before becoming active (rate-limit).
- **Email subject: `Logg inn til {studio}`** — clear, no marketing, action-oriented.

### 21.5 Passkey enrollment (any user with a password)

For users who've opted into a password (typically teachers using the dashboard daily), prompt for passkey enrollment **once** after a successful password login (not every login):

```
Title: Logg inn raskere neste gang
Body:  Bruk fingeravtrykk eller ansiktsgjenkjenning for å hoppe
       over passordet. Du kan alltid bruke passordet som backup.
[ Aktiver ]   [ Senere ]
```

**Rules:**
- **No jargon.** Never write "FIDO2", "WebAuthn", "passkey credential" in customer-facing copy. Copy describes the action: `Bruk fingeravtrykk eller ansiktsgjenkjenning`. The technical term `passnøkkel` (Norwegian for passkey) is acceptable in settings but not in onboarding.
- **One auto-prompt, never a wall.** If the user dismisses, don't ask again until they explicitly visit security settings. Annoyance kills adoption.
- **Always preserve password fallback.** Passkeys are additive; the password remains valid. Tell the user this.
- **Cross-device sync (iCloud Keychain, Google Password Manager) is invisible to copy.** Don't explain it — it just works.

### 21.6 Forgot password (only for users who set a password)

Most users won't see this flow — they signed up with magic-link only and never set a password. Forgot-password applies to the subset who opted into a password in account settings.

```
1. /forgot-password — "Skriv inn e-postadressen din"
2. Submit → neutral confirmation: "Hvis kontoen finnes, sendte vi en lenke."
3. User clicks email link → /reset-password — "Lag nytt passord"
4. New password (single field, show toggle, 12+ chars) → "Lagre"
5. Auto-login + redirect to dashboard
```

**Rules:**
- **Step 1 visual matches login** (same logo, same form layout, same chrome). Consistency reduces "am I in the wrong place?" friction.
- **Step 2 is neutral, always.** Don't say "We don't have that email" — that's account enumeration. Same response whether the email exists or not.
- **Reset link**: 15-60 min lifetime, single-use, invalidated on first redemption.
- **Step 4 has ONE password field**. No confirm. Show-toggle present. Length helper visible.
- **Auto-login after reset.** Don't dump the user back at the login page after they just typed a new password — that's hostile.
- **Total flow under 60 seconds.** Anything longer is a UX failure.

### 21.7 Error states for auth

| Error | Copy | Why |
|---|---|---|
| Wrong password | `Feil e-post eller passord` | Don't say which one was wrong (account enumeration). |
| Account locked | `Kontoen er midlertidig låst. Prøv igjen om {N} minutter.` | State the lockout duration plainly. |
| Magic link expired | `Lenken er utløpt. Be om en ny.` | Clear next step, single button to resend. |
| Email not verified | `Bekreft e-posten din først. Vi sendte en ny lenke til {email}.` | Auto-resend on this error, don't make the user go hunt. |

All error messages: imperative past tense or stating the consequence + next step. Never `Ugyldig forespørsel` (Norwegian "invalid request") or `Noe gikk galt` (something went wrong).

### 21.8 Anti-patterns

- ❌ **Confirm-password field.** Drop it everywhere. Show-password toggle replaces it.
- ❌ **Composition rules** (must contain uppercase + symbol + number). NIST 2024+ deprecates these. Length is what matters.
- ❌ **Account-existence reveal** in error messages or password reset flow.
- ❌ **Password manager interference** — don't use `autocomplete="off"` on auth fields. Password managers are good.
- ❌ **Multi-step auth wizards.** Auth is one form, not three.
- ❌ **Captcha on every auth attempt.** Use risk-based (only on suspicious patterns) — captchas everywhere kill conversion.
- ❌ **`FIDO2` / `WebAuthn` / `OAuth` in customer copy.** Describe what happens, not how it works.
- ❌ **Forced account creation before booking** (already in §19.2 — but worth restating: auth pages must offer guest checkout flow access from public flows).

---

## 22. Timeplan — schedule view as a day-grouped card list (no calendar grid)

The teacher's view of upcoming classes. **Studio rejects the calendar grid view** — it's a power-user metaphor that chokes on multi-event days, fails on mobile below 360px, and overwhelms an audience running 8-15 classes a week. Instead, classes show up as **a chronological list of monochrome bordered cards grouped by day**.

### 22.1 Why list, not calendar (the research)

| Source | Finding |
|---|---|
| UX-patterns consensus | "List views are the most effective while calendar views often fall short, particularly for scheduling needs." |
| Mobile UX research | Below 360px viewport, calendar grids become unactionable — "pinch, zoom, and scroll." Agenda view is the recommended primary on mobile. |
| Small-business fit | Calendar grids "become a chaotic mess when packed with multiple events per day" — exactly the failure mode for a fitness/yoga schedule. |

The list view also adapts perfectly to screen readers (single chronological column) and supports the "show more detail closer to today, less detail further out" progressive-disclosure pattern naturally.

### 22.2 Anatomy

```
I DAG, 12. mai
  [bordered card] Online Vinyasa Flow
                  kl. 18:00 — 19:00 · 8 / 15 påmeldt
                  Online

I MORGEN, 13. mai
  [bordered card] Drop-in Hatha
                  kl. 09:00 — 10:00 · 12 / 14 påmeldt
                  Sal 1 · Engangstime

  [bordered card] Vinyasa kursrekke (uke 3 / 8)
                  kl. 18:00 — 19:30 · 14 / 14 påmeldt · Fullt
                  Sal 2 · Kursrekke

ONSDAG, 14. mai
  [bordered card] Vinyasa kursrekke (uke 3 / 8)
                  kl. 18:00 — 19:30 · 12 / 14 påmeldt
                  Sal 2 · Kursrekke
```

**Day groups** use a small eyebrow-style label (`text-xs font-medium text-foreground-muted uppercase tracking-wide`). Today and tomorrow get named labels (`I DAG`, `I MORGEN`); subsequent days get the weekday + date (`ONSDAG, 14. mai`). Past days collapse into a `TIDLIGERE` group at the bottom (or a separate `/historikk` route if there's a lot of history).

**Class card** is a bordered sand surface (`bg-surface border border-border rounded-lg`), hover lifts to `bg-muted`. Copy in `text-foreground` for the title, `text-foreground-muted` for the meta line. **No chromatic fills** — Studio is monochrome, so type/delivery is communicated by the text label only.

### 22.3 Type — text label, no color coding

Studio is monochrome. Class type (engangstime / kursrekke / online) is encoded in the **text label** of the meta line below time/capacity — `Sal 1 · Engangstime`, `Online`, `Sal 2 · Kursrekke`. No colored fills, no tinted backgrounds.

This satisfies WCAG 1.4.1 by default (color is never the only signal — it's never the signal at all). Verify by toggling to greyscale: nothing changes, because there was no color carrying meaning to begin with.

### 22.4 Card content per row

- **Title** (`text-base font-medium`) — class name. Same scale as a course-card title.
- **Time** (`text-sm text-foreground` with `tabular-nums`) — `kl. 18:00 — 19:00`. The `kl.` prefix is mandatory in Norwegian and disambiguates from "18:00 (no. of x)" parsing.
- **Capacity** (same line as time, separated by `·`) — `8 / 15 påmeldt`. If the class is full, append `· Fullt` in `text-foreground-muted`.
- **Meta line** below (`text-xs text-foreground-muted`) — location + type label. Format: `Sal 1 · Engangstime`. The type label here is what carries the WCAG-compliant meaning.
- **Series progress** for kursrekke (inline in title or as a chip): `(uke 3 / 8)`. Tells the teacher how far into the series this class sits without doing math.

**No drop shadow on cards.** The border carries grouping; a shadow on a bordered card reads as "marketing card" rather than "schedule item."

### 22.5 Today emphasis & progressive density

- **Today** gets a slightly larger card or bumped chrome — e.g., card padding `p-5` for today vs `p-4` for other days. The protagonist of the schedule is "what's next." Subtle, never aggressive.
- **Future days reduce detail** — cards 7+ days out can drop the capacity number, leaving just title + time. Full detail closer to today, scannable summary further out.
- **Past classes collapse** to a single grouped row by default: `12 klasser tidligere denne uken — vis`. Click expands inline. History lives without dominating the schedule.

### 22.6 Layout & navigation

- **Page width:** `max-w-3xl` (~768px) inside the dashboard's `max-w-6xl` content cap. The schedule is text-list density — it doesn't benefit from extra horizontal real estate.
- **Default view:** "this week" — Monday through Sunday of the current week, with "today" expanded. Pagination via `Forrige uke` / `Neste uke` buttons in the page header (don't auto-load infinity scroll — finite, week-bounded scope is calmer).
- **Filter chips** above the list (`Alle · Engangstime · Kursrekke · Online`) let the teacher narrow by type. Use the segmented control pattern (§ components.md) — natural-width, not stretched.
- **Empty state per day** is silent — days with no classes don't render at all (don't show "no classes" placeholders). Empty *week* shows the standard empty state with `Lag et kurs` CTA.

### 22.7 Click target

Tapping the card opens the **detail drawer (§15)** for that class instance — same drawer used elsewhere. Inside the drawer: påmeldinger, edit, cancel, send reminder, etc. Don't navigate to a separate page; drawer keeps context.

### 22.8 Mobile

Same list, narrower. Cards full-width inside `px-4` (16px) page padding. Day labels stick to the top of the viewport as user scrolls (`position: sticky; top: top-app-bar-height`). Filter chips collapse to a single `Filtre` button if more than 3.

### 22.9 Anti-patterns

- ❌ **Calendar grid view** as the primary schedule surface for teachers. Power-user metaphor, fails on mobile, overwhelms multi-event days.
- ❌ **Color-coding class type.** Studio is monochrome — type is conveyed by the text label only, not by a tinted card or a colored dot.
- ❌ **Drop shadows on schedule cards.** The border differentiates from canvas; shadow turns it loud.
- ❌ **Showing all-day events as full-width strips across the day.** Studio doesn't have all-day events. Even a workshop has a start time.
- ❌ **Past classes mixed with upcoming in the same flow** without visual demarcation. Collapse them into a separate grouped row.

---

## 23. Customer account — `Mine påmeldinger` and profile

The customer's logged-in surface. Symmetric to the teacher dashboard but customer-scoped: small, focused, no power-user chrome. Most customers visit this surface twice per booking — once to check details before class, once to add to calendar — and that's it. Design for *low frequency, high clarity*, not for daily engagement.

### 23.1 Information architecture — two surfaces, no more

| Surface | What it shows | Route |
|---|---|---|
| **Mine påmeldinger** | List of upcoming + past bookings | `/account/bookings` (default after login) |
| **Profil** | Name, email, password (if set), notification preferences | `/account/profile` |

**That's it.** No favorites, no statistics, no progress streaks, no "explore more classes," no gamification. Adding more surfaces is feature creep — research is clear that yoga/wellness customers are not the audience for an engagement-driven app.

Access via the avatar menu in PublicNav (when logged in) — `Mine påmeldinger` / `Profil` / `Logg ut`. The avatar replaces the `Logg inn` button when authenticated.

### 23.2 Mine påmeldinger — list view

Page layout: centered single column at `max-w-3xl mx-auto px-6 py-12`. Public surface, so centered (per §17.2). Reading-list density, not dashboard density.

**Anatomy:**

```
┌────────────────────────────────────────┐
│ Mine påmeldinger                       │  ← page header
│                                        │
│ [ Kommende  · Tidligere ]              │  ← underline tabs (§ Tabs)
│                                        │
│ ┌──────────────────────────────────┐   │
│ │ Vinyasa Flow — kursrekke         │   │
│ │ Tirsdag 13. mai · kl. 18:00 — 19:30│   │
│ │ Inspire Yogastudio · Sal 2       │   │
│ │                                  │   │
│ │ [Legg til i kalender]  [Avbestill]│   │
│ └──────────────────────────────────┘   │
│                                        │
│ ┌──────────────────────────────────┐   │
│ │ Drop-in Hatha                    │   │
│ │ Onsdag 14. mai · kl. 09:00       │   │
│ │ Inspire Yogastudio · Sal 1       │   │
│ │ [Legg til i kalender]  [Avbestill]│   │
│ └──────────────────────────────────┘   │
└────────────────────────────────────────┘
```

**Booking card:**
- Border + rounded card. Monochrome sand surface — Studio has no chromatic accent palette.
- Title: `text-base font-medium`.
- Meta line 1 (date + time): `text-sm text-foreground tabular-nums`.
- Meta line 2 (location): `text-sm text-foreground-muted`.
- Inline actions at the bottom: `Legg til i kalender` (ghost link) + `Avbestill` (ghost link, `text-foreground-muted`, NOT in destructive red — the action is calmer than that visually).
- **Whole card is NOT clickable.** Customers don't need a detail view per booking — the card already shows everything they need. Cards become click targets only if there's a meaningful detail page (which Studio doesn't have for past bookings).

**Tabs `Kommende` / `Tidligere`:**
- Underline tabs (§ Tabs).
- Default = Kommende.
- Past tab dims past bookings (smaller, more muted, no `Avbestill` action — past bookings don't have one).

**Empty states:**
- Kommende empty: `Ingen kommende påmeldinger` + `Finn et kurs` button (links back to studio listing).
- Tidligere empty: silent — first-time users don't need an empty-past-bookings state.

### 23.2a 24/7 self-service — never "contact us"

Wellness customers expect to manage their own bookings around their own schedules — at 7am before work, at 11pm after a class. **Every customer-facing action must be self-service.** Cancellation, rescheduling, calendar download, profile edits, account deletion — all do-it-yourself, no email/phone gating. Research: "self-service reduces support pressure AND improves customer experience." Both at once.

Anti-patterns to avoid:
- ❌ "Kontakt oss for å avbestille" — never. The cancel button must work.
- ❌ "Send oss en e-post for å endre detaljer" — never. Inline edit.
- ❌ Office-hours-only support paths for routine actions. The customer doesn't keep office hours.

The studio operator can intervene if needed (refund a no-show, override a cancellation policy as a courtesy), but those are admin actions on the dashboard side — not gates on the customer side.

### 23.3 Cancel booking — self-service, transparent, no dark patterns

The cancellation flow is one of the most trust-load-bearing interactions in the system. Make it easy, surface the policy plainly, and never surprise the customer. Research is unambiguous: dark patterns here destroy referrals.

**Flow:**

1. User clicks `Avbestill` on a booking card.
2. **Confirm dialog opens** (per §12 destructive pattern): shows the cancellation policy clearly + action.

```
[Dialog]
Avbestille påmeldingen?

  Vinyasa Flow
  Tirsdag 13. mai · kl. 18:00

Du får full refusjon når du avbestiller mer enn 24 timer før.

[ Behold ]  [ Avbestill påmelding ]
```

3. On confirm → **toast with undo** (per §11) shown for 8 seconds. The customer can `Angre` if they hit cancel by mistake. After 8s → API call fires.
4. If outside the refund window, the dialog copy changes to state that explicitly:

```
Du er nå innenfor 24 timer før timen — du får ikke refusjon ved avbestilling.
Du kan i stedet bytte til et annet kurs uten kostnad.
```

Plus a `Bytt kurs` secondary action alongside `Avbestill`.

**Rules:**
- **State the policy plainly inside the dialog** — never link out to a separate `/cancellation-policy` page. The policy is what the user is acting on; show it where the action happens.
- **The cancellation window is per-studio configurable**, not a system constant. One studio runs `24 timer`, another `48 timer`, a tight-schedule pilates studio might run `4 timer før timen`. The dialog reads from the studio's policy record. Same window appears in §18.4b (BookingPanel preview) and §19.4 (confirmation page reinforcement) — three surfaces, one source of truth.
- **Refund timing in plain Norwegian.** "Full refusjon innen 2-3 dager." Not "Refund will be processed via the original payment method." Concrete, dated, specific.
- **Never blame the customer** in copy. Bad: `Du er for sent ute.` Good: `Du er innenfor 24 timer — ingen refusjon, men du kan bytte til et annet kurs.`
- **Optional: short feedback prompt** after cancellation. ONE checkbox-list of reasons, no required field, dismissable. Only ask for low-friction signal — not retention manipulation.
- **No "Are you sure" + retention offer + survey + countdown timer** stacked together. That's the SaaS-cancellation dark-pattern stack. Studio doesn't do that.

### 23.4 Add to calendar — single `.ics` download

Modern consensus is **one button → `.ics` download** (cross-platform, opens whatever calendar app the user has set as default). Avoid the multi-option dropdown (`Google · Apple · Outlook · Yahoo`) — it adds chrome and most users just want "add it."

```html
<a href="/api/bookings/{id}/calendar.ics"
   download="vinyasa-flow.ics"
   class="text-sm text-foreground-muted hover:text-foreground">
  Legg til i kalender
</a>
```

**Rules:**
- Inline ghost link on the booking card — small, not a primary button. Adding to calendar is convenience, not the headline action.
- The `.ics` file MUST include: title, start/end (with timezone), location, description with the cancel link.
- **For cross-platform reliability**, the file is a single ICS download — Google, Apple, Outlook, and Vipps Calendar all open `.ics` files natively in 2026. No dropdown selection needed.
- Provide an alternative dropdown variant only if user data shows confusion — measure first.

### 23.5 Profil — minimal account settings

A short single-page form. Sections:

1. **Identitet** — name, email. Email is read-only on this screen (changing it = security event, separate flow).
2. **Sikkerhet** — `Sett passord` button (if magic-link only) OR `Bytt passord` (if password is set). Plus passkey enrollment (per §21.5).
3. **Varsler** — notification preferences (email/SMS opt-ins for booking confirmations and reminders). Simple per-channel toggles.
4. **Logg ut** — secondary button at the bottom.
5. **Slett konto** — small destructive link at the very bottom, with proper confirm flow (type-to-confirm per §components.md). Mandatory under GDPR.

**Don't add** to this page: payment methods (handled per-booking), language (auto from Norwegian browser), themes (Studio is light-only), 2FA settings (handled inside Sikkerhet), connected apps, integrations. None of those are what a yoga customer is here to do.

### 23.6 Booking detail — when to drill in

Most bookings don't need a detail view — the card shows enough. Exceptions:

- Receipt download (`/account/bookings/{id}/receipt.pdf`) — link from past bookings.
- Series progress for kursrekke ("3 av 8 ganger fullført") — could be inline on the card via a small progress note rather than a separate page.

If a detail view becomes necessary, use a **drawer** (§15), not a new page. Customer keeps context.

### 23.7 Layout & responsiveness

- **Desktop**: `max-w-3xl mx-auto px-6 py-12` — narrower than the dashboard cap. Reading-list scale.
- **Mobile**: stacks naturally; cards become full-width with `px-4` page padding.
- **No sidebar** on the customer account — public surface. Avatar menu in PublicNav handles cross-page nav.

### 23.8 Anti-patterns

- ❌ **Streaks / "you've been here X weeks"** gamification. Not the audience.
- ❌ **Cross-sell shelves** ("Andre kurs du kanskje liker") on the bookings page. The customer came to manage what they have, not browse more.
- ❌ **"Rate your experience" prompts** appearing on past bookings. Not the audience, not the use case.
- ❌ **Cancellation friction stacks** — multiple confirms, retention offers, "did you mean to do this?" with countdown. Single confirm + policy + optional one-question feedback.
- ❌ **Detail page per booking** by default. Card content is enough; drawer if needed.
- ❌ **Sidebar nav** on the customer account. Avatar menu is correct for low-frequency surfaces.
- ❌ **Account creation gated behind anything except booking** (already established in §19) — so the customer account exists *only* for users who chose to create one post-purchase. Never prompt with "Create account!" modals.

---

## When to break these patterns

**Genuinely break them when:**
- A user has explicitly graduated to power-user behavior (e.g., they manage 50+ courses across 3 studios) — but most yoga teachers don't
- Compliance / accounting screens where data tables are the only honest way to show what's there
- Bulk operations on existing data (e.g., refunding 20 signups at once) — bulk action toolbars are legitimate here

**Don't break them because:**
- "Power users would want this" — there are no power users in this audience
- "It's possible to fit more on the screen" — possibility ≠ goodness
- "The data is technically there, why hide it" — because density taxes attention

---

## The discipline

Read every screen with this lens before shipping:

1. **One obvious primary action.** If the user looks at the screen for 3 seconds, can they tell what they're supposed to do? If not, the hierarchy is wrong.
2. **Three things, max.** Three sections, three KPIs, three tabs, three list items above the fold. More than three and the eye gives up.
3. **Drawer over page.** Every "click → page" is a chance to use a drawer instead. Pages should be reserved for genuinely new contexts, not detail views.
4. **Sectioned form over wizard.** Every long form is a chance to group fields into sections divided by spacing, headings, and dividers — never multi-step wizards (see §16). Sections are scannable, jump-to-able, and let the user see the whole shape of the work; wizards hide it.
5. **Card over row.** Every list of items is a chance to be a card grid instead — especially when there are fewer than 30 items.
6. **Empty state over blank.** Every list that can be empty needs an empty state with a primary action.

If a screen passes all six, it's a Studio screen.

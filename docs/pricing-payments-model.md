# Pricing & Payments Model — Implementation Plan

> Status: **Plan only — not implemented.** Captures the model agreed in discussion (June 2026).
> Reviewed 2026-06-09 against the codebase (all §3/§9 claims verified, minor line drift only) and
> fresh Dintero/MVA/competitor research; amendments folded in. Billing provider decided: **Stripe Billing** (Phase 5).
> Location note: saved under `.context/` (gitignored). Move into the repo (e.g. `docs/`) if you want it version-controlled.
> (Original lived in the daegu workspace, now archived — this is the canonical copy.)

## 1. Goal

Introduce a sustainable two-tier monetization model on top of the existing Dintero
Split Payout integration, designed around Dintero's cost structure
(2 990 kr/mo base + 49 kr/seller/mo + per-payout + card fees — **contract-sourced**;
Split Payout pricing is not public ("custom pricing"), these numbers exist only in our agreement).

The model must:
- Never bleed money on dormant sellers (the 49 kr/seller trap).
- Keep the platform out of the money flow / regulatory scope for non-paying users.
- Add transparent, capped fees for margin without eroding trust.

## 2. The model (business)

### Tiers

| | **Start (free)** | **Pro (paid)** |
|---|---|---|
| Price | 0 kr/mo | tiered — see §2.1 (solo ~499, studio ~999, eks. mva) |
| Booking / scheduling / signup links | ✅ | ✅ |
| Payments | **Off-platform** — teacher collects themselves (own Vipps, invoice, cash). Platform never touches the money. | **Integrated Dintero** — Vipps + card, auto split-payout, payment tracking, refunds |
| Dintero seller registration | ❌ never (not a Dintero seller) | ✅ required (gated behind active sub) |
| Dintero cost to platform | 0 kr | 49 kr/mo — always covered by the sub |
| Regulatory exposure | none (pure SaaS tooling) | Dintero is the licensed party |
| Teacher commission | n/a | **0%** (keeps full price minus card processing) |
| Student service fee | n/a (platform not in flow) | **5%, min 9 kr, max ~149 kr** |

### Revenue levers
1. **Subscription** (Pro): recurring, idle-proof base revenue. Covers Dintero fixed costs.
2. **Student service fee** (Pro transactions only): 5% capped, **pure platform margin**.
3. Free tier: **0 revenue** by design — it is the acquisition funnel + lock-in.

### Core invariants (do not violate)
- **INV-1 — Gated registration:** a seller becomes a Dintero payout destination *only* while they hold an active Pro subscription. No sub ⇒ no Dintero registration ⇒ 0 cost.
- **INV-2 — Teacher bears processing:** Dintero card + payout fees come out of the teacher's payout (standard PSP behaviour). The student service fee is therefore *clean margin* and safe to cap. *(Verified in docs: `fee_split` defaults to **proportional across split destinations**, and destinations excluded from fees "receive the whole amount". With the course line split 100% to the teacher, the teacher bears that line's fees. Still confirm with Dintero how fees on the platform's own service-fee line land — see open items.)*
- **INV-3 — Fee is bounded:** service fee = `clamp(5% of base, MIN=9, MAX≈149)`. The cap prevents punitive fees on expensive course series; the floor covers Dintero's per-payout flat cost on cheap drop-ins.
- **INV-4 — Free tier stays out of the money flow:** free signups must never present a platform-facilitated "pay now". Mark as *"betaling avtales med instruktør"*. This is what preserves the no-license posture.

### 2.1 Pricing (researched June 2026, re-verified 2026-06-09)

Benchmarked against studio/class SaaS and Norwegian B2B SaaS. Verified current prices:
Momoyoga €29/€59 *(annual billing — €39/€79 if monthly)*, Eversports Manager €49 *(entry tier,
≤49 bookings/mo; realistic studios pay €79–119+)*, Punchpass $59/$99/$149 *(no $49 tier anymore)*,
bsport quote-only *(~€150+/feature per third parties)*, Tripletex 199/299/479 ✓.
Competitors are if anything **pricier** than first assumed — 399 kr was at the low end and
under-charged studios. Recommended tiered structure (all **eks. mva**):

| Tier | Price/mo | Who |
|---|---|---|
| Start | 0 kr | Off-platform payments (funnel) |
| **Pro (solo)** | **499 kr** (launch promo 399) | One instructor |
| **Studio** | **999 kr** | Multiple instructors / locations |
| Kjede / Enterprise | custom | Chains |

- Breakeven on Dintero's 2 990 base ≈ 5–6 paying sellers at these prices.
- Price the *tooling + payments* value now; raise as the storefront actually drives bookings.

### 2.2 MVA / VAT (confirm with regnskapsfører before launch)

- **Yoga classes = `unntatt`** MVA, on two alternative bases (verified against MVA-håndboken 2025):
  - § 3-8(2) idrett — explicitly covers commercial actors/treningsstudioer ("billetter, årskort, timeleie … til treningsstudioer").
  - § 3-5 undervisning — instructor-led classes: "instruksjon … av instruktører og trenere" is undervisning; even "meditasjonskurs" is listed.
  Note: `unntatt` (no MVA on sales, **no input deduction**), **not** `fritatt`. Boundary cases:
  equipment/mat rental is taxable; pure on-demand video without instructor interaction is a
  taxable electronic service (nettkurs-uttalelsen — live/interactive online classes can stay exempt).
- **The platform subscription is still 25% MVA** — SaaS is always MVA-liable regardless of the
  customer's exempt status (confirmed by BFU 10/12: a franchise fee charged to MVA-exempt teachers
  was still taxable). Platform charges + remits it.
- **Teachers can't deduct that MVA** (their yoga is `unntatt`), so the 25% is a *real cost to them*:
  "499 eks. mva" is felt as **624 kr**. → Lean toward **displaying incl. mva** for this audience.
  (MVA is still pass-through / cost-neutral for the *platform*.)
- **Student service-fee MVA hinges on classification** (researched June 2026; no on-point BFU exists):
  - If the class is **undervisning** (§ 3-5): *formidling* of it is **exempt by statute** (§ 3-5(1):
    "Omsetning og formidling av undervisningstjenester er unntatt"). A marketplace connecting
    students with teachers fits MVA-håndboken's formidling description.
  - If classified as **rett til å utøve idrettsaktiviteter** (§ 3-8(2)): **no formidling exemption
    exists** in the statute → 25% (cf. spilleragenter taxable on formidling). Pure access/drop-in
    without instruction points this way.
  - Risks: a fee that is in substance a payment/convenience charge is 25% regardless of label
    (hovedytelseslæren); and an exempt fee removes input-MVA deduction on related platform costs
    (partial-exemption allocation).
  - **Action: apply for a bindende forhåndsuttalelse (BFU) from Skatteetaten on the specific fee design.**
- Platform must register for MVA (threshold still NOK 50 000 / 12 mo — no 2025/2026 change).

## 3. Current state (grounded in code, re-verified 2026-06-09)

What exists:
- Dintero split payout fully wired: `create-dintero-session`, `dintero-webhook`,
  `finalize-dintero-transaction`, `create-dintero-seller`, settlements, sweeps.
- `_shared/pricing.ts` `calculatePricing()` — canonical fee math for the capped student service fee.
- `src/lib/pricing.ts` — **frontend duplicate** of the rate; must stay in sync.
- ✅ Verified: the 5% rates live **only** in these two files + the session splits — no hidden fee
  math in finalize/webhook/sweep/refund/email code. Phase 0/1 touch surface is exactly §5's list.
- Fee displayed in `src/components/public/course-details/BookingRailLite.tsx`.
- `create-free-signup` — server-verified signup for **price ≤ 0** courses only.
- `sellers` table: `dintero_seller_id`, `dintero_onboarding_status`, `dintero_onboarding_complete`, `seller_type` (`'individual' | 'business'` — encodes legal form, not tier).
- DB guard `get_seller_operational` + a `dintero_onboarding_required` raise around checkout.

What's missing:
- No subscription / plan concept on `sellers` (no `subscription_status`, `plan`, etc.).
- No fee cap/floor (flat 5% everywhere).
- ✅ Phase 1 cleanup removed the old phantom `payout_destination_id: 'platform'` split.
  The course line now goes 100% to the teacher and the service-fee line goes to the configured
  `DINTERO_PLATFORM_PAYOUT_DESTINATION_ID`. This still needs sandbox transaction verification.
- No off-platform/manual-payment signup path for paid courses (free tier).
- No subscription billing mechanism for the Pro fee.

## 4. Implementation phases

Ordered so each phase ships independently and de-risks the next.

### Phase 0 — Service fee cap + floor  *(small, independent, ship first)*
> ✅ **Implemented 2026-06-10** — clamp in both pricing files + parity tests (`src/lib/pricing.test.ts`). Edge function not yet redeployed.
- Add `SERVICE_FEE_MIN` (9) and `SERVICE_FEE_MAX` (~149) constants.
- `_shared/pricing.ts`: `serviceFeeNok = clamp(round(base * RATE), MIN, MAX)`.
- Mirror in `src/lib/pricing.ts` (`calculateServiceFee`).
- Verify the cap flows through the split math in `create-dintero-session` and the
  display in `BookingRailLite.tsx`.
- **Acceptance:** 6 000 kr course shows ≤149 kr fee; 150 kr drop-in shows ≥9 kr; checkout total = base + capped fee; Dintero order `amount` matches sum of item lines.

### Phase 1 — Move to 0% teacher commission + fix the `platform` split
> ✅ **Implemented 2026-06-10.** `calculatePricing()` now only carries the capped
> student service fee; `create-dintero-session` splits the course line 100% to the
> teacher and the service-fee line to `DINTERO_PLATFORM_PAYOUT_DESTINATION_ID`.
> Still requires Dintero-side verification with a real sandbox transaction.
- Course line: split **100% to the teacher's `dintero_seller_id`** (drop the 5% `'platform'` slice).
- Service fee line: **split 100% to the platform's own registered payout destination.**
  ⚠️ The earlier "no split → remainder stays with the platform" assumption is **not supported by
  Dintero's public docs**, and the Terms for Sellers (Annex 1) say the opposite: *"If the Platform
  wants to Split some amount to their self, they need to add themselves as a Seller."* So: register
  the platform itself as a Dintero seller (one-time KYC) and split to that real id. Keep
  "is an unsplit remainder supported?" as a question for Dintero, but plan for self-registration.
- If a line ever should carry no split: **omit** `splits` — an *empty array* means "splits provided
  at capture" and disables `auto_capture` (per the API spec).
- Re-derive `calculatePricing` so it no longer carries a separate platform-commission term (only the capped student service fee remains as platform revenue).
- `fee_split`: default is **proportional across split destinations**; with the teacher as sole
  destination on the course line they bear its fees (INV-2). Confirm with Dintero how fees on the
  platform's service-fee line land.
- Update `.claude/skills/dintero-payments/SKILL.md:111` afterwards — it currently claims service-fee
  lines carry no splits (contradicts both the code and the Terms) and references
  `organizations.dintero_seller_id` (the column lives on `sellers`).
- **Acceptance:** a test transaction's Dintero split shows teacher = 100% of base, platform service fee = capped amount split to the platform's real seller id, no phantom destination; teacher payout = base − Dintero processing; no postponed payouts in Backoffice.

### Phase 2 — Subscription / tier data model
> ✅ **Implemented + applied 2026-06-10** (`20260610090000_seller_subscription_tiers.sql`).
> Also narrows the `sellers` UPDATE grant to `(name, logo_url)` (mirrors F4.1 on profiles): the old table-level
> grant would have let an owner PATCH themselves `subscription_plan='pro'` — and could already self-set
> `dintero_onboarding_complete=true` (pre-existing publish-gate bypass, now closed) — plus a
> `sellers_block_protected_columns` trigger as defense-in-depth.
- Migration adding to `sellers` (decided: dedicated columns — do **not** overload `seller_type`,
  which encodes legal form `individual|business`):
  - `subscription_plan text` CHECK in (`'free'`, `'pro'`) default `'free'`.
  - `subscription_status text` CHECK in (`'active'`, `'past_due'`, `'canceled'`, `'none'`) default `'none'`.
  - `subscription_current_period_end timestamptz` (for grace handling).
  - `subscription_provider`, `subscription_external_id` for the billing system (Stripe — Phase 5).
- Helper RPC / update `get_seller_operational` to expose plan + status.
- **Acceptance:** every seller has a plan; defaults to free; queryable for gating.

### Phase 3 — Gate Dintero registration behind active Pro (INV-1)
> ✅ **Implemented + deployed 2026-06-10.** `create-dintero-seller` requires pro+active;
> `create-dintero-session` requires `uses_integrated_payments`. Lapsed-Pro courses gracefully
> degrade to the manual signup path (bookable, money handled off-platform).
- `create-dintero-seller`: refuse unless `subscription_plan='pro' AND subscription_status='active'`.
- On subscription cancel/lapse: define seller offboarding policy (stop new checkouts;
  decide whether to keep the payout destination for in-flight settlements, then terminate).
  Research notes: an archive endpoint exists
  (`DELETE /v1/accounts/{aid}/management/settings/approvals/payout-destinations/{id}`);
  Terms §14 oblige Dintero to settle in-flight transactions even after termination; refund/chargeback
  clawback debt survives offboarding. **Confirm in the contract that archiving stops the 49 kr/mo fee.**
- Checkout (`create-dintero-session`) already requires `dintero_onboarding_complete`; add an
  explicit active-sub check so a lapsed Pro can't keep selling through Dintero.
- **Acceptance:** a free seller cannot create a Dintero seller; a lapsed Pro cannot open new checkout sessions; no dormant non-subscriber is ever a Dintero payout destination.

### Phase 4 — Free-tier off-platform payment path (INV-4)
> ✅ **Implemented + applied/deployed 2026-06-10** (`20260610110000_free_tier_manual_payments.sql` +
> `create-manual-signup`). The unifying predicate landed as a **generated column**
> `sellers.uses_integrated_payments` (pro + active/past_due + onboarded), SELECT-granted to anon.
> Publish trigger now Pro-only; capacity RPC takes `p_payment_status` ('paid'|'external') and
> rejects 'external' for integrated sellers; `payment_status` enum gained `'external'`.
> Already-onboarded sellers were **grandfathered to pro/active** so existing checkout behavior is unchanged.
> Teacher "mark as paid" already existed (`mark-payment-resolved`) — extended UI to 'external' signups.
> Checklist/sidebar/publish UI gates all route through `src/lib/payments.ts` (isProSeller / sellerNeedsDinteroSetup).
- New signup path for **paid** courses owned by **free** sellers: records the signup but marks
  payment as externally handled (`payment_status='external'` / `'manual'`), no Dintero session.
  (Model on `create-free-signup`'s server-side verification + capacity RPC; do **not** reuse it
  verbatim — that path asserts price ≤ 0.) Check/extend the `signups.payment_status` CHECK
  constraint to accept the new value (migration).
- Booking UI for free-seller courses: show *"betaling avtales med instruktør"*, no platform "pay now".
- Teacher-side: ability to mark a signup as paid/unpaid manually.
- **Get Started checklist must not hard-block on payments** *(launch-blocking)* —
  `useSetupProgress` (`src/hooks/use-setup-progress.ts`) lists `payments`
  (`isComplete: dintero_onboarding_complete`) as a **required** step, and
  `isSetupComplete = completedCount === totalCount`. So a free / pre-Dintero seller can never
  complete setup — the checklist sticks forever and the "du er live" state never fires.
  Fix: make the `payments` step conditional on tier/flag — drop it from required `steps` for free
  sellers (or swap it for a free-appropriate step like "del påmeldingslenken"), so completion
  needs only a published course. Adjust motivational copy (`getMotivationalSubtitle`, the
  "ta imot påmeldinger og betaling" strings) for free sellers. Note this points to the same
  Dintero surface (`routes.settingsPayouts`) as the sidebar nav item — gate both from the one
  tier/flag source.
  Files: `src/hooks/use-setup-progress.ts`, `src/hooks/use-seller-setup-status.ts`, `src/pages/teacher/GetStartedPage.tsx`.
- **Acceptance:** a free seller can publish a priced course, share a signup link, take signups,
  reach a "live"/complete setup state **without** Dintero, and the platform never creates a
  Dintero session or touches money.

### Phase 5 — Subscription billing (collect the Pro fee, see §2.1: 499 solo / 999 studio)
- **Decision (June 2026): Stripe Billing.** Rationale:
  - Cost is a wash (~2.5% of sub revenue either way: Stripe NO 1,5% + 1,80 kr + 0,7% Billing fee
    vs Dintero ~1–1,5 kr + ~1,95–2,49%).
  - Stripe ships what we'd otherwise hand-roll on Dintero: smart retries/dunning, automatic card
    updater, proration (solo↔studio), coupons (the 399 launch promo), MVA-ready invoices, and a
    hosted customer portal (teacher self-serve card/plan/receipts). Integration ≈ Checkout link +
    one webhook (`customer.subscription.updated` → `sellers.subscription_status`) + portal link in
    settings — ~1–2 days vs ~a week of dunning/invoicing/portal building on Dintero.
  - The two providers never touch: Stripe handles only our B2B subs; Dintero keeps all student
    money + splits.
- Rejected / limited options:
  - **"Vipps recurring via Dintero" does not exist** — Dintero recurring is **cards only**
    (token products: `payex/bambora/dintero_psp.creditcard`; the Vipps session config has no token
    option). Vipps recurring would require a separate direct Vipps MobilePay Recurring integration.
  - **Dintero card recurring** remains the consolidation fallback (tokenization must be enabled by
    Dintero per account — ask, and confirm it's included in the Split Payout agreement; no add-on
    fee is published).
  - **Manual invoicing (Fiken)** only as a stopgap if Stripe onboarding ever blocks launch.
- Set `subscription_provider='stripe'`, `subscription_external_id` = Stripe subscription id
  (Phase 2 columns are provider-agnostic — switching later is a data migration, not a schema change).
- Webhook updates `subscription_status`; lapse → Phase 3 gating.
- Handle MVA on the Pro fee (inclusive vs exclusive — see open items; Stripe supports incl-MVA pricing).
- **Acceptance:** a teacher can subscribe, status reflects in `sellers`, lapse flips status and triggers Phase 3 gating.

### Phase 6 — UI/UX
- Tier selection + upgrade prompts (trigger on the manual-payment pain: "Get paid automatically — upgrade to Pro").
- Pricing page; in-app plan badge; settings → billing (Stripe customer-portal link).
- Checkout fee display already capped via Phase 0.
- **Acceptance:** clear free vs Pro choice; upgrade path obvious; current plan visible.

### Phase 7 — Copy, legal, MVA
- Norwegian copy pass (run `/norwegian-copy-audit`) on all new fee/plan/subscription strings.
- Confirm MVA registration + treatment of the subscription and the service fee with an accountant;
  **apply for a BFU on the service fee** (see §2.2 — undervisnings-formidling vs 25%).
- Confirm the free-tier off-platform posture keeps you outside payment-services licensing (legal check).

## 5. Files likely touched
- `supabase/functions/_shared/pricing.ts` (cap/floor, fee math) — Phase 0/1
- `src/lib/pricing.ts`, `src/components/public/course-details/BookingRailLite.tsx` — Phase 0
- `supabase/functions/create-dintero-session/index.ts` (split rewrite, active-sub gate) — Phase 1/3
- `.claude/skills/dintero-payments/SKILL.md` (splits invariant correction) — Phase 1
- `supabase/functions/create-dintero-seller/index.ts` (sub gate) — Phase 3
- New migration: `sellers` subscription columns + RPC update — Phase 2
- New edge function: off-platform/manual paid signup (+ `payment_status` constraint) — Phase 4
- New: Stripe Billing integration (checkout link, webhook, portal link) — Phase 5
- Frontend: tiers, upgrade prompts, billing settings — Phase 6
- `src/types/database.ts` regenerated after the migration

## 6. Open decisions (resolve before building)
- Service-fee cap (99 / 149 / 199?) and floor (9?). (Pricing tiers recommended in §2.1: 499 solo / 999 studio, eks. mva.)
- MVA display: incl. vs eks. mva (lean incl. for non-deducting yoga teachers — §2.2).
- **Confirm with regnskapsfører/Skatteetaten:** yoga `unntatt` classification for the actual offerings,
  and the **student service-fee MVA status** — see §2.2 for the precise fork (undervisnings-formidling
  exempt vs idretts-/convenience fee 25%). Apply for a BFU.
- ~~Subscription billing provider~~ → **decided: Stripe Billing** (Phase 5).
- **Dintero verification items (one email):**
  1. Platform self-registration as seller for the service-fee split — vs any unsplit-remainder support (Phase 1; Terms Annex 1 says self-register).
  2. How card fees land on the platform's service-fee line under `fee_split` (INV-2).
  3. Does archiving a payout destination stop the 49 kr/mo per-seller fee (Phase 3).
  4. (Fallback only) Is tokenization/recurring enabled + included in the Split Payout agreement.
- Lapsed-Pro offboarding policy — partially answered (archive endpoint exists; Terms §14: Dintero
  settles in-flight transactions post-termination; clawback debt survives). Remaining: timing + fee question above.
- ~~Whether to reuse `seller_type`~~ → **decided: dedicated `subscription_plan` column**
  (`seller_type` encodes legal form `individual|business` — don't overload).
- Free-tier limits (if any) to preserve Pro's pull.

## 7. Rollout / testing
- All Dintero changes tested in **sandbox (T-prefix account)** first; nothing is live until Dintero approval + go-live confirmed.
- Stripe Billing wired in **test mode** first; webhook → `subscription_status` verified before live keys.
- Test the split (Phase 1) on a real sandbox transaction and inspect the order-items split breakdown
  (teacher 100%, platform fee to the platform's real seller id, **no postponed payouts**).
- Idempotency / signature surfaces untouched — flag loudly if any change nears them.
- E2E: free-seller signup (no money flow), Pro checkout (Vipps + card), subscription lapse → gating.

## 8. Sequencing recommendation
Phase 0 and Phase 1 are low-risk and valuable on their own (capped fees + correct splits) — ship them
regardless of the tier rollout. Phases 2→5 are the tier system and should land together behind the launch.
Phase 5 (Stripe Billing) is a small build (~1–2 days); manual Fiken invoicing remains the stopgap only
if Stripe onboarding ever blocks launch.

## 9. Free-tier blocker inventory (dashboard audit, June 2026)

> Re-verified against the code 2026-06-09: all items confirmed (minor line drift only), and an
> independent sweep found **no additional blockers** — course creation, messaging, and public
> listing/detail pages are ungated; publish + checkout are the only gates.

Every place that today assumes Dintero onboarding and would break / hard-block a free seller.
**All of these currently key off `currentSeller.dintero_onboarding_complete` alone.** The fix is to
route them through one tier/payments-mode predicate (e.g. `usesIntegratedPayments = isPro && dintero_onboarding_complete`,
or a `payments_mode: 'integrated' | 'manual'`), so free sellers publish & take signups without Dintero.

### A. DB-level — authoritative, **launch-blocking** 🔴
- **`enforce_course_publish_requires_dintero()` trigger** (baseline schema
  `20260601000000_…:1040-1070`; original source also in
  `migrations_archive/20260601_prebaseline/20260519235014_…`) raises `dintero_onboarding_required`
  when a draft goes to `upcoming`/`active` unless the seller is onboarded. **A free seller cannot
  publish ANY course.** This is the *authoritative* gate — UI changes alone won't help; publishing
  still fails server-side. A later migration (`20260603090000_launch_hardening.sql`) only pins
  `search_path` — the gate is intact.
  Fix via **new migration** (don't edit baseline): only enforce for integrated-payment sellers
  (Pro), exempt free/manual sellers. Keep it for Pro paid courses.

### B. Course publish UI — **launch-blocking** 🔴
- `src/pages/teacher/CoursePage.tsx` — `handlePublish` opens `PublishCourseDialog` when not
  onboarded (`:486-491`); `publishReadiness.ready` requires `hasDintero` (`:233-241`).
- `src/components/teacher/CourseDrawer.tsx` — same `handlePublish` gate (`:161-166`) **+ a
  persistent warning `Alert`** shown whenever not onboarded (`:294-319`).
- `src/components/teacher/PublishCourseDialog.tsx` — hard "Sett opp betalinger for å publisere"
  dialog → routes to `settingsPayouts`. Should not appear for free sellers.
- `src/components/teacher/CourseOverviewTab.tsx` — publish checklist `dintero` item
  ("Sett opp utbetaling / Påkrevd for å ta imot påmeldinger", `:144-149`, required by default),
  plus `isWaitingForDintero` + `onSetupDinteroClick` wiring.

### C. Setup / onboarding surfaces
- `useSetupProgress` / `GetStartedPage` — `payments` required step *(already in Phase 4)*.
- `src/components/teacher/TeacherSidebar.tsx` — "Betalingskonto" nav item (`:60`) *(flag-hide pre-Dintero)*.
- `src/pages/teacher/PaymentsPage.tsx` — entire page is Dintero onboarding; for free tier this
  becomes the **upgrade-to-Pro / "Kommer snart"** surface.

### D. Public booking / checkout — **launch-blocking** 🔴 (a free seller's paid course can't be booked today)
- `src/pages/public/CheckoutPage.tsx` — forks on `isFree` (`price === 0`, `:140`): free → `createFreeSignup`,
  paid → `createDinteroSession` + embedded Dintero iframe (`paymentReady` gate `:144-145`). **Needs a
  third branch:** paid + manual-payment seller → manual signup, **no iframe**. Today a free seller's
  paid course hits `createDinteroSession`, which fails server-side ("Payment is not set up for this
  seller", `create-dintero-session/index.ts:194-195`).
- `src/components/public/course-details/BookingRailLite.tsx` — renders `DinteroPaymentBadge`
  ("Sikker betaling", `:167`, shown when `ticketPrice > 0`) and the service fee
  (`calculateServiceFee`/`calculateTotalPrice`, import `:6`, display `:139-143`);
  its `isFree` predicate (`:256`) only handles `price === 0`. For manual courses: **hide the Dintero badge
  + service fee**, change CTA copy to "Meld på" / *"betaling avtales med instruktør"*.
- `src/components/public/DinteroPaymentBadge.tsx` — hardcoded **sandbox** account id `T11116559` (`:12`);
  render only for integrated-payment courses.
- **Service-fee suppression** — `calculateServiceFee` / `calculateTotalPrice` (`src/lib/pricing.ts`) must
  not apply on manual courses (platform isn't in the flow → no platform service fee).
- `src/pages/public/CheckoutSuccessPage.tsx` — Dintero finalize path. ✅ Verified: already handles
  non-Dintero confirmations via `?free=true` (`:70`, `:83-92`) — reuse that path for manual signups
  (no transaction to finalize).
- **Data is already available:** the public payload exposes `seller.dintero_onboarding_complete`
  (`src/services/publicCourses.ts:19,27`), so the booking UI can branch today; ideally expose a clearer
  `payments_mode` / `isPro` field instead.

### E. Buyer side — clean ✅
- `src/pages/teacher/BuyerDashboard.tsx` — audited, no Dintero/payment/receipt assumptions
  (buyer dashboard is intentionally minimal/deferred). No blocker.

### Unifying fix
Introduce **one** derived predicate for "this seller uses integrated payments"
(`usesIntegratedPayments = isPro && dintero_onboarding_complete`, or a `payments_mode` field) and make
A–D consult it instead of `dintero_onboarding_complete`. Carry it in the public course payload (D) and
mirror it in the DB trigger (A). That single switch turns the whole inventory from "scattered Dintero
checks" into "gate at the edges" — and lets a free seller publish, share signup links, and take
manually-paid signups with zero Dintero involvement.

**Launch-blocking subset: A, B, and the CheckoutPage third branch in D** — without all three, a free
seller can neither publish a course (A/B) nor have it booked (D). C and the rest are needed for a clean
experience but won't break the core flow.

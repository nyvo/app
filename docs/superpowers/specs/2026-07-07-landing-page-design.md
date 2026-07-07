# New landing page — structure design (wireframe stage)

**Date:** 2026-07-07
**Status:** wireframe built, awaiting user review
**Wireframe:** `/dev/landing-wireframe` (`src/pages/dev/LandingWireframe.tsx`)
**Scope of this doc:** page structure, section jobs, copy shape, image slots. NOT visual styling (serif/grain/chrome/motion decisions come in the styling pass).

## Goal

Replace the current landing page with a new structure, researched from top Norwegian SaaS (Fiken, Folio, Tripletex, Conta, Tibber, Whereby, Dintero) and booking-SaaS comparables (Momence, TeamUp, Momoyoga, Eversports, bsport, Acuity). Requirements from the user: airy layout, clean typography, product images, and a how-it-works section.

## Assumptions made while the user was away (please confirm)

1. **Audience: yoga-led, broad-capable.** Hero eyebrow says "For studioer og kursholdere" — speaks to studios/instructors without locking every section to yoga. The current page's "Driv ditt yogastudio enklere" is narrower. Easy to re-niche by swapping eyebrow + hero copy.
2. **Both CTA modes survive:** live mode ("Kom i gang gratis") wireframed; PRELAUNCH swaps CTAs to "Ta kontakt" as today.
3. **No testimonials/logos** — we have no customers to quote. Trust is carried by mechanics (real fees, real screenshots, Stripe marks, org.nr footer) per pre-launch best practice.
4. **All copy is placeholder** — shaped right (du-form, sentence case, terse) and passed through a norwegian-copy-audit pass, but headlines especially are decisions for the copy pass.

## Research synthesis (what drives the structure)

**Norwegian SaaS grammar** (from Fiken/Conta/Tripletex/Whereby/Tibber/Folio/Dintero/Sanity):
- Headline = category + one honest adjective, ≤6 words ("Et superenkelt regnskapsprogram"). No metaphors, no growth promises.
- Pricing ON the landing page, in kroner, VAT status stated, one tier marked "Mest valgt".
- Every conversion point disarms the catch explicitly ("Ingen betalingsdetaljer", "Prøveperioden utløper automatisk", "Ikke noe automatisk abonnement etterpå").
- Human support is a headline feature, not a footer link ("Flinke folk hjelper deg helt gratis").
- Footer = legitimacy block: org.nr, address, email, honest disclaimers (Folio: "Folio er ikke en bank").
- One social-proof moment max, colloquial and named — never a wall. Skip entirely when we have none.
- Value triad recurs across the set: *enkelt* (simplicity) / *ro* (peace of mind) / *hjelp* (human help).
- Shorter pages than US SaaS: 7–9 sections.

**Booking-SaaS comparables:**
- None of the six competitors has a numbered how-it-works — they're sprawling suites that can't tell a 3-step story. Openspot can; simplicity IS the pitch. (User wants this section anyway — research says it's also our differentiator.)
- The two-sided product (admin side + participant booking side) is best demoed in ONE labeled section (Fresha two-card / Momoyoga labeled lanes), never interwoven screenshots (Momence, illegible).
- Acuity's insight: the customer-facing booking page is the emotional purchase — "this is how professional I'll look."
- Desktop frame vs phone frame instantly encodes whose side each screenshot is.
- Self-serve low-ACV → short page, ~5–8 sections, CTA repeated ~3×.

## Alternatives considered

**A — "Three steps first" (CHOSEN, with C's mechanics-proof folded in).** Hero → how-it-works → two surfaces → value triad → pricing → FAQ → CTA band. Fastest comprehension, honest early-product feel. Trade-off: power features get one bullet each.

**B — "Two audiences as spine" (Momoyoga model).** Customer-side booking page as hero image, audience-split section as the spine. Structurally expresses two-sidedness best, but risks a diluted hero — the page could read as selling to yogis instead of studios.

**C — "Problem → proof-by-product".** A "status quo" problem band (regneark, Vipps-meldinger, manuell oppfølging) before the steps. Strongest narrative, but the problem band must be written razor-sharp in Norwegian or it reads as filler; one section longer.

Choice rationale: A closes the information gap fastest for a solo studio owner deciding in one visit, and every one of its sections has a research-backed job. B's hero risk is real for a launch page; C's extra section fights the "airy, short" requirement. C's mechanics-as-proof idea is kept (payment marks + concrete fees near pricing).

## Chosen structure (as wireframed)

| # | Section | Job | Reference |
|---|---------|-----|-----------|
| 0 | Nav | logo, 2 anchors (Slik fungerer det, Pris), Logg inn, 1 primary CTA | minimal-nav pattern |
| 1 | Hero | owner is "du", participants are the outcome; centered typographic; primary CTA + "Du trenger ikke kort."; dual-surface collage below (desktop dashboard + phone booking page overlapping) | TeamUp two-sided headline; Origin/Passionfroot collage |
| 2 | Slik fungerer det | 3 verb-led steps (Lag kurset → Del bookingsiden → Få betalt), one screenshot each, CTA under step 3 | Mobbin: Kastle, Wise, ClassPass |
| 3 | To sider | "Din side" (desktop, oversikt) vs "Deres side" (phone, booking); participant side sold as owner benefit | Mobbin: Fresha two-card |
| 4 | Verditriade | Enkelt å komme i gang / Ro i timeplanen / Folk som svarer — the Fiken triad; human support carried here | Fiken value bands |
| 5 | Pris | Start (gratis, 5 %) + Pro (499 kr/mnd eks. mva, "Mest valgt"); captions disarm; payment marks below | Conta/Tripletex/Folio on-page pricing |
| 6 | Spørsmål og svar | 6 real objections: pris, bindingstid, utbetaling, deltaker-konto, flytting, personvern | Tripletex FAQ |
| 7 | CTA-band | mirrors hero; "Ingen bindingstid. Du trenger ikke kort." | Fiken/Tripletex catch-disarm |
| 8 | Footer | legitimacy: org.nr 935 967 511, Framio AS, e-post, legal links, "Betalinger håndteres av Stripe." | Folio honesty line |

## Screenshot inventory

Existing (`public/`): `landing-dashboard.webp`, `landing-storefront.webp`, `landing-payments.webp`, `landing-courses.webp`.

Needed for the new page:
1. Hero collage base: dashboard (desktop) — existing `landing-dashboard.webp` may work.
2. Hero collage overlay: public booking page (phone crop) — **new capture**.
3. Step 1: course builder, filled in — **new capture**.
4. Step 2: studio page with course list — existing `landing-storefront.webp` may work.
5. Step 3: payout/income view — existing `landing-payments.webp` or **new capture**.
6. To sider left: dashboard or schedule (desktop) — reuse #1 or schedule view.
7. To sider right: booking page (phone) — reuse #2.

## Open decisions for the user

1. Audience framing: keep "studioer og kursholdere" or re-niche to yoga ("yogastudio")?
2. Hero headline: current placeholder "Kurs, påmelding og betaling. Ferdig." — alternates: "Superenkel kurspåmelding." (Fiken-shape) / "Driv studioet. Resten går av seg selv."
3. FAQ answers need real copy (wireframe has questions only).
4. CTA-band surface in styling pass: dark chrome band (as today) or flat typographic.
5. Secondary hero CTA: "Se hvordan det virker" (anchor to steps) vs none (single-CTA hero).

## Next steps

1. User reviews wireframe at `/dev/landing-wireframe` + this doc; adjust structure.
2. Styling pass (frontend-design + project tokens; expression dial: serif display, grain, chrome band decisions).
3. Real copy pass via norwegian-copy-audit on final strings.
4. Capture missing screenshots (booking page phone, course builder).
5. Implement as new `LandingPage.tsx`, keep PRELAUNCH variant, visual baselines.

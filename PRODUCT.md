# Product

## Register

product

## Users

**Yoga teachers and small studio owners in Norway.** Operators, not power users — typically running 1-3 courses at a time, sometimes a single weekly drop-in class. They're not technical: they don't memorize keyboard shortcuts, don't read "release notes", don't customize dashboards. They open the app to do one thing — confirm a signup, send a message, publish a course, see who's coming tomorrow — and then leave.

**Secondary surface: customers** (students booking classes). They never log in for the dashboard; they hit a public studio page, browse the schedule, book a class, pay via Vipps or card. Self-service cancel from a customer account stub (`Mine påmeldinger`).

## Product Purpose

A Norwegian course-and-class booking tool for independent yoga teachers and small studios. The job: turn "I run yoga classes" into "I have a public page that takes bookings, accepts payment via Stripe, and gives me a calm operator surface for who/what/when". Replaces a manual setup of Facebook event + Vipps DM + spreadsheet with one coherent surface.

Success = a teacher with zero SaaS comfort can publish a course, take their first booking, and refund a participant without writing in for help.

## Brand Personality

Calm, plainspoken, considerate. Three-word read: **airy, klarspråk, restrained**.

- **Voice** mirrors Fiken / Vipps / Sbanken-as-of-2024: sentence case Norwegian, no "vennligst", no bureaucratic register, verbs that carry finality without theatrics. The system speaks the way a calm colleague speaks.
- **Tone** is utility-confident — not chirpy ("Suksess!"), not formal ("Din forespørsel er behandlet"). Past-tense verbs do the work: `Kurs avlyst`, `Lagret`, `Påmelding avbestilt`.
- **Emotional goal**: the operator feels like the system *agrees with them* about which thing is the next thing. One obvious primary action per screen, three things max above the fold.

## Anti-references

- **Generic SaaS templates** (Stripe-blue accents, gradient hero, KPI wall, "TRUSTED BY" eyebrows, identical-card grids). The look most Tailwind starters ship with. Specifically: nothing in the Linear/Vercel/Notion clone pile that's "modern dashboard" without a point of view.
- **Norwegian banking apps** (DNB, Sbanken's older surfaces). Bureaucratic, dense, formal-Norwegian register, paragraph-long disclosures. Opposite of klarspråk. Raden is calm but warm, not calm-because-corporate-sterile.
- **Wellness-cliché aesthetics** (sage green, soft serif, sand+terracotta, "your journey awaits" copy). The 2024 wellness-template look. The app serves a wellness audience but doesn't ape the aesthetic — instructors aren't the brand; the calm utility is the brand.

## Design Principles

1. **Calm beats clever.** No mesh gradients, no glassmorphism, no glowing orbs. Restraint reads as care. Three font weights max, status colors only as signal.

2. **Audience is tech-blind.** Design for the yoga teacher who runs one weekly class, not the hypothetical operator managing 50 studios. Density is the enemy. Long tables, faceted filters, customizable dashboards, bulk-action toolbars — all banned by default.

3. **One obvious primary action per screen.** The 3-second test: a non-technical user should know what to do next without reading help text. If three CTAs compete, redesign the hierarchy.

4. **Copy carries the design.** Norwegian sentence case, verb-paired feedback (`Slett konto` button → `Konto slettet` toast). No "vennligst". No "vellykket". The button label IS the action; the toast title IS the confirmation. No marketing wrapping.

5. **Cards are deliberate, not default.** Structure comes from spacing → headings → dividers → rows first. White page stays. Tinted/filled panels only when containment is genuinely needed (destructive zones, contextual callouts), never as the default page-structure mechanism.

## Accessibility & Inclusion

**WCAG 2.2 AA** as the floor for everything. Specifically:

- Body text ≥4.5:1 contrast against background; large text (≥18px or bold ≥14px) ≥3:1.
- Placeholder color is `text-foreground-muted` (`--neutral-11`, ~5.6:1 on white). Never `text-foreground-disabled` (`--neutral-8`, ~2.5:1 — fails AA).
- Touch targets ≥36px on touch-primary surfaces (mobile booking, public pages, MobilePriceBar); ≥44px for primary CTAs to hit WCAG 2.5.5 AAA + Apple HIG.
- Diacritic and case-insensitive matching mandatory for Norwegian names in any list filter.
- `prefers-reduced-motion` respected on every animation (page transitions, drawer slides, dialog fades) — crossfade or instant alternative, never optional.
- `aria-label` required on every icon-only button. Norwegian copy in the label (`Lukk`, `Mer`, `Slett rad`).

The audience leans 30-60 in age and includes users on older devices and slower connections. Default text size is 14px on dashboard, 16px on public — never smaller without a deliberate reason.

## Related context

Detailed visual + interaction patterns live in `.claude/skills/studio-design/`. PRODUCT.md is strategic (who/why); the studio-design skill is operational (how it looks + how primitives work). When in doubt, the skill takes precedence for visual decisions.

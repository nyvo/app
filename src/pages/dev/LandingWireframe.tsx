import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { formatKroner } from '@/lib/utils'
import { COMPANY } from '@/lib/company'

/**
 * STRUCTURE-ONLY wireframe for the new landing page. No styling decisions —
 * grayscale tokens, sans type, no serif/grain/motion (those belong to the
 * styling pass). What IS decided here: section order, section jobs, copy
 * shape, CTA placement, and which product screenshot each slot needs.
 *
 * Skeleton synthesized from research (2026-07-07):
 *  - Norwegian SaaS grammar (Fiken/Folio/Tripletex/Tibber/Conta): ≤6-word
 *    descriptive headline, pricing ON the page in kroner, catch-disarming
 *    copy at every CTA, human support as a real section, org.nr footer.
 *  - Booking-SaaS comparables (Momence/TeamUp/Momoyoga/Acuity/bsport):
 *    dual-sided demo solved with ONE labeled two-surface section, not
 *    interwoven screenshots; how-it-works is the differentiator none of
 *    the sprawling suites can honestly ship.
 *
 * Section order:
 *   nav → hero (+dual-surface collage) → slik fungerer det (3 steps)
 *   → to sider (din/deres) → value triad (enkelt/ro/hjelp) → pris
 *   → spørsmål og svar → CTA-band → footer
 */

export default function LandingWireframe() {
  return (
    <div className="min-h-dvh bg-canvas">
      <div className="mx-auto max-w-6xl space-y-4 px-6 py-12">
        <Annotation
          title="Landing-wireframe — struktur, ikke stil"
          body="Hver seksjon er merket med jobben sin og referansen den kopierer. Skjermbilde-slots er merket med hvilket skjermbilde som må tas."
        />

        <Frame label="0 · Nav — logo, to ankere, logg inn, én primær CTA (minimal, ingen meny)">
          <Nav />
        </Frame>

        <Frame label="1 · Hero — eier er «du», deltakerne er utbyttet. Collage: dashbord + bookingside i ett bilde (ref: Origin/Passionfroot)">
          <Hero />
        </Frame>

        <Frame label="2 · Slik fungerer det — 3 verbstyrte steg m/skjermbilde, CTA under steg 3 (ref: Mobbin — Kastle/Wise/ClassPass). Ingen av konkurrentene har denne — enkelhet ER pitchen">
          <HowItWorks />
        </Frame>

        <Frame label="3 · To sider — din side (desktop) / deres side (telefon), deltakersiden solgt som eier-fordel (ref: Mobbin — Fresha to-korts)">
          <TwoSurfaces />
        </Frame>

        <Frame label="4 · Verditriade — enkelt / ro / hjelp fra folk (Fiken-triaden; support er en egen headline-feature i norsk SaaS)">
          <ValueTriad />
        </Frame>

        <Frame label="5 · Pris — på siden, i kroner, eks. mva oppgitt, «Mest valgt», innvendinger avvæpnet i caption (ref: Conta/Tripletex/Folio)">
          <Pricing />
        </Frame>

        <Frame label="6 · Spørsmål og svar — 6 faktiske innvendinger, flat liste (ref: Tripletex FAQ)">
          <Faq />
        </Frame>

        <Frame label="7 · CTA-band — speiler hero og avvæpner haken eksplisitt (ref: Fiken/Tripletex «ingen betalingsdetaljer»)">
          <FinalCta />
        </Frame>

        <Frame label="8 · Footer — legitimitetsblokk: org.nr, adresse, e-post, ærlig Stripe-linje (ref: Folio «Folio er ikke en bank»)">
          <Footer />
        </Frame>
      </div>
    </div>
  )
}

/* ── wireframe chrome (not part of the page) ─────────────────────── */

function Annotation({ title, body }: { title: string; body: string }) {
  return (
    <div className="mb-8 max-w-2xl">
      <p className="text-base font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm text-foreground-muted">{body}</p>
    </div>
  )
}

function Frame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="pb-8">
      <p className="mb-2 text-xs font-medium text-foreground-muted">{label}</p>
      <div className="overflow-hidden rounded-2xl border border-border-subtle bg-background">
        {children}
      </div>
    </section>
  )
}

/** Labeled placeholder for a product screenshot. `shot` says exactly what to capture. */
function Slot({ shot, className = 'aspect-video' }: { shot: string; className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-xl border border-dashed border-border bg-muted ${className}`}
    >
      <p className="max-w-[85%] text-center text-sm text-foreground-muted">{shot}</p>
    </div>
  )
}

/* ── 0 · nav ──────────────────────────────────────────────────────── */

function Nav() {
  return (
    <div className="flex h-16 items-center justify-between px-6">
      <span className="text-base font-medium text-foreground">Openspot</span>
      <div className="flex items-center gap-6">
        <span className="text-sm font-medium text-foreground-muted">Slik fungerer det</span>
        <span className="text-sm font-medium text-foreground-muted">Pris</span>
        <span className="text-sm font-medium text-foreground-muted">Logg inn</span>
        <Button variant="default">Kom i gang</Button>
      </div>
    </div>
  )
}

/* ── 1 · hero ─────────────────────────────────────────────────────── */

function Hero() {
  return (
    <div className="px-6 pt-20 pb-16 md:pt-28">
      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-4 text-xs font-medium text-foreground-muted">
          For studioer og kursholdere
        </p>
        <h1 className="text-4xl font-medium text-foreground md:text-5xl">
          Kurs, påmelding og betaling. Ferdig.
        </h1>
        <p className="mt-4 text-lg text-foreground-muted">
          Du setter opp kurset. Deltakerne melder seg på og betaler selv.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button size="cta">Kom i gang gratis</Button>
          <Button variant="secondary" size="cta">
            Se hvordan det virker
          </Button>
        </div>
        <p className="mt-3 text-sm text-foreground-muted">Du trenger ikke kort.</p>
      </div>

      {/* Dual-surface collage: one image implies both sides of the product.
          Desktop dashboard as the base, public booking page (phone) overlapping
          bottom-right. Ref: Origin/Passionfroot hero collages on Mobbin. */}
      <div className="relative mx-auto mt-16 max-w-5xl">
        <Slot shot="Skjermbilde: dashbord — inntekter og kommende kurs (desktop)" />
        <div className="absolute -bottom-8 right-8 w-40 md:w-48">
          <Slot
            shot="Skjermbilde: offentlig bookingside (telefon)"
            className="aspect-[9/16] shadow-soft"
          />
        </div>
      </div>
      <div className="h-10" />
    </div>
  )
}

/* ── 2 · slik fungerer det ────────────────────────────────────────── */

const STEPS = [
  {
    n: '1',
    title: 'Lag kurset',
    body: 'Navn, tid, pris. Klart på noen minutter.',
    shot: 'Skjermbilde: kursbygger — utfylt skjema',
  },
  {
    n: '2',
    title: 'Del bookingsiden',
    body: 'Én lenke til alt du tilbyr. Legg den i bio, på nettsiden eller send den rett til folk.',
    shot: 'Skjermbilde: studioside med kursliste',
  },
  {
    n: '3',
    title: 'Få betalt',
    body: 'Deltakerne betaler når de melder seg på. Pengene går rett til kontoen din.',
    shot: 'Skjermbilde: utbetalingsoversikt',
  },
]

function HowItWorks() {
  return (
    <div className="px-6 py-20 md:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-3 text-xs font-medium text-foreground-muted">Slik fungerer det</p>
        <h2 className="text-3xl font-medium text-foreground md:text-4xl">
          Tre steg, så er du i gang.
        </h2>
      </div>
      <div className="mx-auto mt-14 grid max-w-5xl gap-10 md:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.n}>
            <Slot shot={s.shot} className="aspect-[4/3]" />
            <p className="mt-5 text-sm font-medium text-foreground-muted">{s.n}</p>
            <h3 className="mt-1 text-lg font-medium text-foreground">{s.title}</h3>
            <p className="mt-1.5 text-base text-foreground-muted">{s.body}</p>
          </div>
        ))}
      </div>
      {/* CTA directly under step 3 — Wise pattern: convert while the "that's it?" feeling is fresh */}
      <div className="mt-12 text-center">
        <Button size="cta">Kom i gang gratis</Button>
      </div>
    </div>
  )
}

/* ── 3 · to sider ─────────────────────────────────────────────────── */

function TwoSurfaces() {
  return (
    <div className="px-6 py-20 md:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-medium text-foreground md:text-4xl">
          Én side for deg. Én for deltakerne.
        </h2>
      </div>
      <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-2">
        <div className="rounded-2xl bg-panel p-6 md:p-8">
          <p className="text-xs font-medium text-foreground-muted">Din side</p>
          <h3 className="mt-1 text-xl font-medium text-foreground">Full oversikt</h3>
          <p className="mt-1.5 text-base text-foreground">
            Påmeldinger, inntekter og timeplan på ett sted. Ingen regneark ved siden av.
          </p>
          <div className="mt-6">
            <Slot shot="Skjermbilde: dashbord eller timeplan (desktop)" />
          </div>
        </div>
        <div className="rounded-2xl bg-panel p-6 md:p-8">
          <p className="text-xs font-medium text-foreground-muted">Deres side</p>
          <h3 className="mt-1 text-xl font-medium text-foreground">Booking som bare virker</h3>
          <p className="mt-1.5 text-base text-foreground">
            Deltakerne velger time, betaler og får kvittering. Uten konto, uten app.
          </p>
          <div className="mt-6 flex justify-center">
            <Slot shot="Skjermbilde: bookingside (telefon)" className="aspect-[9/16] w-44" />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── 4 · verditriade ──────────────────────────────────────────────── */

const TRIAD = [
  {
    title: 'Enkelt å komme i gang',
    body: 'Lag kurset, sett prisen og publiser. Ingen oppsett, ingen opplæring.',
  },
  {
    title: 'Ro i timeplanen',
    body: 'Betaling, kvittering og påminnelser går av seg selv. Du møter opp og holder kurset.',
  },
  {
    title: 'Folk som svarer',
    body: 'Lurer du på noe, svarer et menneske. Ikke en chatbot.',
  },
]

function ValueTriad() {
  return (
    <div className="px-6 py-20 md:py-24">
      <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-3">
        {TRIAD.map((v) => (
          <div key={v.title}>
            <h3 className="text-lg font-medium text-foreground">{v.title}</h3>
            <p className="mt-1.5 text-base text-foreground-muted">{v.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── 5 · pris ─────────────────────────────────────────────────────── */

function Pricing() {
  return (
    <div className="px-6 py-20 md:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-3 text-xs font-medium text-foreground-muted">Pris</p>
        <h2 className="text-3xl font-medium text-foreground md:text-4xl">
          Gratis å starte. Forutsigbar pris når du vokser.
        </h2>
      </div>
      <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-border-card p-6 md:p-8">
          <h3 className="text-lg font-medium text-foreground">Start</h3>
          <p className="mt-3 text-3xl font-medium text-foreground">Gratis</p>
          <p className="mt-1 text-sm text-foreground-muted">5 % gebyr per betaling</p>
          <ul className="mt-6 space-y-2.5 text-base text-foreground-muted">
            <li>Ubegrenset antall kurs og deltakere</li>
            <li>Egen bookingside</li>
            <li>Kortbetaling og automatiske utbetalinger</li>
          </ul>
          <div className="mt-8">
            <Button variant="secondary" className="w-full">
              Start gratis
            </Button>
          </div>
          <p className="mt-3 text-center text-sm text-foreground-muted">Du trenger ikke kort.</p>
        </div>
        <div className="rounded-2xl border border-border-card p-6 md:p-8">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-foreground">Pro</h3>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
              Mest valgt
            </span>
          </div>
          <p className="mt-3 text-3xl font-medium text-foreground">
            {formatKroner(499)}
            <span className="text-sm font-normal text-foreground-muted"> / mnd eks. mva</span>
          </p>
          <p className="mt-1 text-sm text-foreground-muted">
            Lønner seg fra rundt {formatKroner(10000)} i påmeldinger i måneden
          </p>
          <ul className="mt-6 space-y-2.5 text-base text-foreground-muted">
            <li>Alt i Start</li>
            <li>0 % gebyr – du beholder hele kursprisen</li>
            <li>Månedlig eller årlig betaling</li>
          </ul>
          <div className="mt-8">
            <Button className="w-full">Velg Pro</Button>
          </div>
          <p className="mt-3 text-center text-sm text-foreground-muted">Ingen bindingstid.</p>
        </div>
      </div>
      {/* Payment trust marks near the money claim — pre-launch proof substitute */}
      <p className="mt-8 text-center text-sm text-foreground-muted">
        [Betalingsmerker: Stripe, Visa, Mastercard] Betalinger håndteres av Stripe.
      </p>
    </div>
  )
}

/* ── 6 · spørsmål og svar ─────────────────────────────────────────── */

const FAQ = [
  'Hva koster det?',
  'Er det bindingstid?',
  'Hvordan får jeg pengene utbetalt?',
  'Må deltakerne opprette konto for å melde seg på?',
  'Kan jeg flytte kursene mine hit fra regneark eller et annet system?',
  'Hvordan behandler dere personopplysninger?',
]

function Faq() {
  return (
    <div className="px-6 py-20 md:py-24">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-3xl font-medium text-foreground">Spørsmål og svar</h2>
        <div className="mt-10">
          {FAQ.map((q) => (
            <div
              key={q}
              className="flex items-center justify-between border-b border-border-subtle py-5"
            >
              <p className="text-base font-medium text-foreground">{q}</p>
              <span className="text-foreground-muted">+</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── 7 · CTA-band ─────────────────────────────────────────────────── */

function FinalCta() {
  return (
    <div className="px-6 py-16 md:py-20">
      {/* Styling pass decides: dark chrome band (as today) or flat typographic.
          Structure: outcome restated + catch disarmed, nothing else. */}
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 rounded-3xl bg-panel px-8 py-16 text-center">
        <h2 className="text-3xl font-medium text-foreground md:text-4xl">
          Neste kurs kan ligge ute i kveld.
        </h2>
        <Button size="cta">Kom i gang gratis</Button>
        <p className="text-sm text-foreground-muted">
          Ingen bindingstid. Du trenger ikke kort.
        </p>
      </div>
    </div>
  )
}

/* ── 8 · footer ───────────────────────────────────────────────────── */

function Footer() {
  return (
    <div className="px-6 pt-16 pb-10">
      <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-12">
        <div className="md:col-span-6">
          <p className="text-base font-medium text-foreground">Openspot</p>
          <p className="mt-4 max-w-sm text-base text-foreground-muted">
            Påmelding, betaling og kursoversikt for studioer og kursholdere. Bygget i Norge.
          </p>
          <p className="mt-4 text-sm text-foreground-muted">{COMPANY.email}</p>
        </div>
        <div className="md:col-span-2">
          <p className="text-sm font-medium text-foreground">Produkt</p>
          <ul className="mt-4 space-y-2.5 text-sm text-foreground-muted">
            <li>Slik fungerer det</li>
            <li>Pris</li>
            <li>Om oss</li>
          </ul>
        </div>
        <div className="md:col-span-2">
          <p className="text-sm font-medium text-foreground">Konto</p>
          <ul className="mt-4 space-y-2.5 text-sm text-foreground-muted">
            <li>Logg inn</li>
            <li>Kom i gang</li>
          </ul>
        </div>
        <div className="md:col-span-2">
          <p className="text-sm font-medium text-foreground">Juridisk</p>
          <ul className="mt-4 space-y-2.5 text-sm text-foreground-muted">
            <li>Vilkår</li>
            <li>Personvern</li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-12 max-w-5xl border-t border-border-subtle pt-6">
        <p className="text-sm text-foreground-muted">
          © 2026 Openspot. Laget av {COMPANY.legalName}. Org.nr {COMPANY.organizationNumber}.
        </p>
        <p className="mt-1 text-sm text-foreground-muted">
          Betalinger håndteres av Stripe. Pengene går rett til kontoen din.
        </p>
      </div>
    </div>
  )
}

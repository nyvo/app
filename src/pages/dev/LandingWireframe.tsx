import { Check } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { formatKroner } from '@/lib/utils'
import { COMPANY } from '@/lib/company'

/**
 * STYLED DRAFT of the new landing page — iteration 3: EDITORIAL TYPOGRAPHIC.
 * User-chosen direction: magazine-calm, deliberately NOT the old landing
 * page's expression (no ProductFrame, no grain, no tinted panels, no dark
 * chrome band, nothing centered by default).
 *
 * The grammar of this page:
 *  - left-aligned serif display (EB Garamond) on a white page
 *  - raw screenshots, square corners, hairline borders only
 *  - sections divided by full-width hairlines, extreme whitespace
 *  - serif numerals as the only decorative element (FLORA-style)
 *  - pill buttons (system primitive) as the single soft shape
 *
 * References (Mobbin, seen 2026-07-07): mymind + Sanity airiness,
 * FLORA oversized numerals, Slash text-forward pricing, Notion flat
 * closing CTA. Tone: Fiken.
 *
 * Copy is the approved quiet set (iteration 2). Placeholders remain for
 * two screenshots that need fresh capture: bookingside (phone crop) and
 * kursbygger.
 */

export default function LandingWireframe() {
  return (
    <div className="min-h-dvh bg-background text-foreground antialiased">
      <p className="border-b border-border-subtle px-6 py-2 text-xs text-foreground-muted">
        Utkast – retning: redaksjonell typografi
      </p>

      <Nav />
      <main className="mx-auto max-w-6xl px-6">
        <Hero />
        <HowItWorks />
        <TwoSurfaces />
        <ValueTriad />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}

/** Raw editorial image slot: hairline border, square corners, no chrome. */
function Shot({
  src,
  alt,
  placeholder,
  className = '',
}: {
  src?: string
  alt?: string
  placeholder?: string
  className?: string
}) {
  if (!src) {
    return (
      <div
        className={`flex items-center justify-center border border-border-subtle bg-background ${className}`}
      >
        <p className="max-w-[85%] text-center text-sm text-foreground-muted">{placeholder}</p>
      </div>
    )
  }
  return (
    <div className={`overflow-hidden border border-border-subtle ${className}`}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="block h-full w-full object-cover object-top"
      />
    </div>
  )
}

/* ── nav — wordmark + login + one CTA, hairline below ─────────────── */

function Nav() {
  return (
    <nav aria-label="Hovednavigasjon" className="border-b border-border-subtle">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <span className="font-serif text-xl font-medium text-foreground">Openspot</span>
        <div className="flex items-center gap-6">
          <a
            href="#pris"
            className="hidden text-sm font-medium text-foreground-muted transition-colors hover:text-foreground md:block"
          >
            Pris
          </a>
          <a
            href="#"
            className="text-sm font-medium text-foreground-muted transition-colors hover:text-foreground"
          >
            Logg inn
          </a>
          <Button>Kom i gang</Button>
        </div>
      </div>
    </nav>
  )
}

/* ── hero — left-aligned serif display, raw full-width screenshot ── */

function Hero() {
  return (
    <section className="pt-20 pb-24 md:pt-28 md:pb-32">
      <p className="text-xs font-medium text-foreground-muted">For yogastudioer</p>
      <h1 className="mt-4 max-w-3xl font-serif text-4xl font-medium text-foreground md:text-5xl">
        Påmelding og betaling for yogastudioet.
      </h1>
      <p className="mt-5 max-w-md text-lg text-foreground-muted">
        Deltakerne melder seg på og betaler selv. Du får oversikten.
      </p>
      <div className="mt-8 flex items-center gap-4">
        <Button size="cta">Kom i gang gratis</Button>
        <p className="text-sm text-foreground-muted">Du trenger ikke kort.</p>
      </div>

      <div className="mt-16 md:mt-20">
        <Shot
          src="/landing-dashboard.webp"
          alt="Openspot – oversikt over inntekter og kommende kurs"
        />
      </div>
    </section>
  )
}

/* ── slik fungerer det — serif numerals, text columns, small shots ── */

const STEPS = [
  {
    n: '1',
    title: 'Lag kurset',
    body: 'Navn, tid og pris – så er kurset klart.',
    src: undefined,
    placeholder: 'Kursbygger',
  },
  {
    n: '2',
    title: 'Del bookingsiden',
    body: 'Én lenke til alt du tilbyr.',
    src: '/landing-storefront.webp',
    placeholder: undefined,
  },
  {
    n: '3',
    title: 'Få betalt',
    body: 'Deltakerne betaler ved påmelding. Pengene går rett til kontoen din.',
    src: '/landing-payments.webp',
    placeholder: undefined,
  },
]

function HowItWorks() {
  return (
    <section id="slik" className="scroll-mt-16 border-t border-border-subtle py-20 md:py-28">
      <h2 className="font-serif text-3xl font-medium text-foreground md:text-4xl">
        Slik fungerer det
      </h2>
      <div className="mt-14 grid gap-x-10 gap-y-14 md:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.n}>
            <p className="font-serif text-4xl font-medium text-foreground-muted">{s.n}</p>
            <h3 className="mt-3 text-lg font-medium text-foreground">{s.title}</h3>
            <p className="mt-1.5 max-w-xs text-base text-foreground-muted">{s.body}</p>
            <div className="mt-6">
              <Shot
                src={s.src}
                alt={s.title}
                placeholder={s.placeholder}
                className="aspect-[4/3]"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── to sider — two columns, vertical hairline, raw shots ─────────── */

function TwoSurfaces() {
  return (
    <section className="border-t border-border-subtle py-20 md:py-28">
      <h2 className="max-w-2xl font-serif text-3xl font-medium text-foreground md:text-4xl">
        Én side for deg. Én for deltakerne.
      </h2>
      <div className="mt-14 grid gap-10 md:grid-cols-2 md:gap-0 md:divide-x md:divide-border-subtle">
        <div className="md:pr-12">
          <p className="text-xs font-medium text-foreground-muted">Din side</p>
          <p className="mt-1.5 max-w-sm text-base text-foreground">
            Påmeldinger, inntekter og timeplan på ett sted.
          </p>
          <div className="mt-6">
            <Shot src="/landing-courses.webp" alt="Kursoversikt i Openspot" />
          </div>
        </div>
        <div className="md:pl-12">
          <p className="text-xs font-medium text-foreground-muted">Deltakernes side</p>
          <p className="mt-1.5 max-w-sm text-base text-foreground">
            Velg time, betal og få kvittering. Uten konto, uten app.
          </p>
          <div className="mt-6 flex md:justify-start">
            <Shot placeholder="Bookingside (telefon)" className="aspect-[9/16] w-44 md:w-48" />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── verditriade — text columns only ──────────────────────────────── */

const TRIAD = [
  { title: 'Enkelt å komme i gang', body: 'Lag kurset, sett prisen og publiser.' },
  { title: 'Ro i timeplanen', body: 'Betaling, kvittering og påminnelser går av seg selv.' },
  { title: 'Folk som svarer', body: 'Lurer du på noe, svarer et menneske.' },
]

function ValueTriad() {
  return (
    <section className="border-t border-border-subtle py-20 md:py-28">
      <div className="grid gap-10 md:grid-cols-3">
        {TRIAD.map((v) => (
          <div key={v.title}>
            <h3 className="font-serif text-2xl font-medium text-foreground">{v.title}</h3>
            <p className="mt-2 max-w-xs text-base text-foreground-muted">{v.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── pris — text-forward, vertical hairline between tiers (Slash) ── */

function Pricing() {
  return (
    <section id="pris" className="scroll-mt-16 border-t border-border-subtle py-20 md:py-28">
      <h2 className="font-serif text-3xl font-medium text-foreground md:text-4xl">Pris</h2>
      <div className="mt-14 grid gap-12 md:grid-cols-2 md:gap-0 md:divide-x md:divide-border-subtle">
        <div className="md:pr-16">
          <h3 className="text-base font-medium text-foreground">Start</h3>
          <p className="mt-4 font-serif text-4xl font-medium text-foreground">Gratis</p>
          <p className="mt-2 text-sm text-foreground-muted">5 % gebyr per betaling</p>
          <ul className="mt-8 space-y-3">
            {[
              'Ubegrenset antall kurs og deltakere',
              'Egen bookingside',
              'Kortbetaling og automatiske utbetalinger',
            ].map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-base text-foreground">
                <Check className="mt-1 size-4 flex-shrink-0 text-foreground-muted" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <Button variant="secondary">Start gratis</Button>
            <p className="mt-3 text-sm text-foreground-muted">Du trenger ikke kort.</p>
          </div>
        </div>
        <div className="md:pl-16">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-medium text-foreground">Pro</h3>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
              Mest valgt
            </span>
          </div>
          <p className="mt-4 font-serif text-4xl font-medium text-foreground">
            {formatKroner(499)}
            <span className="font-sans text-sm font-normal text-foreground-muted">
              {' '}
              / mnd eks. mva
            </span>
          </p>
          <p className="mt-2 text-sm text-foreground-muted">
            Lønner seg fra rundt {formatKroner(10000)} i påmeldinger i måneden
          </p>
          <ul className="mt-8 space-y-3">
            {[
              'Alt i Start',
              '0 % gebyr – du beholder hele kursprisen',
              'Månedlig eller årlig betaling',
            ].map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-base text-foreground">
                <Check className="mt-1 size-4 flex-shrink-0 text-foreground-muted" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <Button>Velg Pro</Button>
            <p className="mt-3 text-sm text-foreground-muted">Ingen bindingstid.</p>
          </div>
        </div>
      </div>
      <p className="mt-12 text-sm text-foreground-muted">Betalinger håndteres av Stripe.</p>
    </section>
  )
}

/* ── spørsmål og svar — hairline rows ─────────────────────────────── */

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
    <section className="border-t border-border-subtle py-20 md:py-28">
      <div className="grid gap-10 md:grid-cols-12">
        <h2 className="font-serif text-3xl font-medium text-foreground md:col-span-4">
          Spørsmål og svar
        </h2>
        <div className="md:col-span-8">
          {FAQ.map((q, i) => (
            <div
              key={q}
              className={`flex items-center justify-between border-b border-border-subtle py-5 ${
                i === 0 ? 'border-t' : ''
              }`}
            >
              <p className="text-base font-medium text-foreground">{q}</p>
              <span aria-hidden="true" className="text-foreground-subtle">
                +
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── closing — flat typographic statement ─────────────────────────── */

function FinalCta() {
  return (
    <section className="border-t border-border-subtle py-24 md:py-32">
      <h2 className="max-w-2xl font-serif text-4xl font-medium text-foreground md:text-5xl">
        Klar når du er.
      </h2>
      <div className="mt-8 flex items-center gap-4">
        <Button size="cta">Kom i gang gratis</Button>
        <p className="text-sm text-foreground-muted">
          Ingen bindingstid. Du trenger ikke kort.
        </p>
      </div>
    </section>
  )
}

/* ── footer — legitimacy block ────────────────────────────────────── */

function Footer() {
  return (
    <footer className="border-t border-border-subtle pt-16 pb-10">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-6">
            <p className="font-serif text-xl font-medium text-foreground">Openspot</p>
            <p className="mt-4 max-w-sm text-base text-foreground-muted">
              Påmelding, betaling og kursoversikt for yogastudioer. Bygget i Norge.
            </p>
            <p className="mt-4 text-sm text-foreground-muted">
              <a href={`mailto:${COMPANY.email}`} className="hover:text-foreground">
                {COMPANY.email}
              </a>
            </p>
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
        <div className="mt-12 border-t border-border-subtle pt-6">
          <p className="text-sm text-foreground-muted">
            © 2026 Openspot. Laget av {COMPANY.legalName}. Org.nr{' '}
            {COMPANY.organizationNumber}.
          </p>
          <p className="mt-1 text-sm text-foreground-muted">
            Betalinger håndteres av Stripe. Pengene går rett til kontoen din.
          </p>
        </div>
      </div>
    </footer>
  )
}

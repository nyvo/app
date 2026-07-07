import { Check } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { formatKroner } from '@/lib/utils'
import { COMPANY } from '@/lib/company'

/**
 * STYLED DRAFT of the new landing page — iteration 4: CARD COMPOSITION.
 * User feedback on iteration 3: no serif (Geist only, for now), stop
 * floating text on empty canvas — use cards; be more creative visually.
 *
 * The grammar of this page:
 *  - Geist sans only, no serif anywhere
 *  - every piece of copy sits ON a surface: panel cards, never loose text
 *    over bare canvas (matches the "no floating text outside containers"
 *    project rule)
 *  - hero = one big rounded panel card, the dashboard screenshot bleeds
 *    off the card's bottom edge (Loom/FLORA card-crop move)
 *  - steps = Miro 3-card row (screenshot block + text inside each card)
 *  - two sides = Samara tall cards (caption top, image below)
 *  - triad = one wide card, three columns inside
 *  - pricing = two cards (panel vs focal)
 *  - FAQ = rows inside one card
 *  - closing = soft azure card (--primary-subtle) — the page's single
 *    color moment
 *
 * References (Mobbin, seen 2026-07-07):
 *  Miro https://mobbin.com/sites/sections/5cac9637-e51a-42a3-a848-05352428ce91
 *  Samara https://mobbin.com/sites/sections/29d6b6a5-d217-4c82-9820-db16fae3e4ad
 *  Loom bento https://mobbin.com/sites/sections/4470dfca-a7ae-4a96-a9b4-a33395edbd07
 */

export default function LandingWireframe() {
  return (
    <div className="min-h-dvh bg-background text-foreground antialiased">
      <p className="border-b border-border-subtle px-6 py-2 text-xs text-foreground-muted">
        Utkast – retning: kortkomposisjon, kun Geist
      </p>

      <Nav />
      <main className="mx-auto max-w-6xl space-y-4 px-4 pb-4 md:space-y-6 md:px-6 md:pb-6">
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

/** Screenshot block used inside cards: white surface, hairline, soft radius. */
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
        className={`flex items-center justify-center rounded-xl border border-border-subtle bg-background ${className}`}
      >
        <p className="max-w-[85%] text-center text-sm text-foreground-muted">{placeholder}</p>
      </div>
    )
  }
  return (
    <div className={`overflow-hidden rounded-xl border border-border-subtle bg-background ${className}`}>
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

/* ── nav ──────────────────────────────────────────────────────────── */

function Nav() {
  return (
    <nav aria-label="Hovednavigasjon">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <span className="text-base font-medium text-foreground">Openspot</span>
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

/* ── hero — one big panel card, screenshot bleeds off the bottom ──── */

function Hero() {
  return (
    <section className="overflow-hidden rounded-3xl bg-panel">
      <div className="px-6 pt-14 md:px-16 md:pt-20">
        <div className="max-w-2xl">
          <p className="text-xs font-medium text-foreground-muted">For yogastudioer</p>
          <h1 className="mt-4 text-4xl font-medium text-foreground md:text-5xl">
            Påmelding og betaling for yogastudioet
          </h1>
          <p className="mt-4 max-w-md text-lg text-foreground-muted">
            Deltakerne melder seg på og betaler selv. Du får oversikten.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <Button size="cta">Kom i gang gratis</Button>
            <p className="text-sm text-foreground-muted">Du trenger ikke kort.</p>
          </div>
        </div>
      </div>
      <div className="mt-12 px-6 md:mt-16 md:px-16">
        <div className="overflow-hidden rounded-t-xl border border-b-0 border-border-subtle bg-background">
          <img
            src="/landing-dashboard.webp"
            alt="Openspot – oversikt over inntekter og kommende kurs"
            width={2400}
            height={1659}
            fetchPriority="high"
            className="block h-auto w-full"
          />
        </div>
      </div>
    </section>
  )
}

/* ── slik fungerer det — Miro 3-card row ──────────────────────────── */

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
    <section id="slik" className="scroll-mt-16 rounded-3xl bg-panel px-6 py-14 md:px-16 md:py-20">
      <h2 className="text-3xl font-medium text-foreground md:text-4xl">Slik fungerer det</h2>
      <div className="mt-10 grid gap-4 md:grid-cols-3 md:gap-6">
        {STEPS.map((s) => (
          <div key={s.n} className="rounded-2xl bg-background p-4 shadow-soft md:p-5">
            <Shot
              src={s.src}
              alt={s.title}
              placeholder={s.placeholder}
              className="aspect-[4/3]"
            />
            <div className="px-1 pt-5 pb-2">
              <p className="text-sm font-medium text-foreground-muted">{s.n}</p>
              <h3 className="mt-1 text-lg font-medium text-foreground">{s.title}</h3>
              <p className="mt-1.5 text-base text-foreground-muted">{s.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── to sider — Samara tall cards ─────────────────────────────────── */

function TwoSurfaces() {
  return (
    <section className="grid gap-4 md:grid-cols-2 md:gap-6">
      <div className="rounded-3xl bg-panel p-6 md:p-10">
        <p className="text-xs font-medium text-foreground-muted">Din side</p>
        <h3 className="mt-1 text-2xl font-medium text-foreground">Full oversikt</h3>
        <p className="mt-1.5 max-w-sm text-base text-foreground-muted">
          Påmeldinger, inntekter og timeplan på ett sted.
        </p>
        <div className="mt-8">
          <Shot src="/landing-courses.webp" alt="Kursoversikt i Openspot" className="h-72 w-full" />
        </div>
      </div>
      <div className="rounded-3xl bg-panel p-6 md:p-10">
        <p className="text-xs font-medium text-foreground-muted">Deltakernes side</p>
        <h3 className="mt-1 text-2xl font-medium text-foreground">Enkel påmelding</h3>
        <p className="mt-1.5 max-w-sm text-base text-foreground-muted">
          Velg time, betal og få kvittering. Uten konto, uten app.
        </p>
        <div className="mt-8 flex justify-center">
          <Shot placeholder="Bookingside (telefon)" className="h-72 w-44" />
        </div>
      </div>
    </section>
  )
}

/* ── verditriade — one wide card, three columns inside ────────────── */

const TRIAD = [
  { title: 'Enkelt å komme i gang', body: 'Lag kurset, sett prisen og publiser.' },
  { title: 'Ro i timeplanen', body: 'Betaling, kvittering og påminnelser går av seg selv.' },
  { title: 'Folk som svarer', body: 'Lurer du på noe, svarer et menneske.' },
]

function ValueTriad() {
  return (
    <section className="rounded-3xl bg-panel px-6 py-10 md:px-16 md:py-14">
      <div className="grid gap-8 md:grid-cols-3 md:gap-0 md:divide-x md:divide-border-subtle">
        {TRIAD.map((v, i) => (
          <div key={v.title} className={i === 0 ? 'md:pr-10' : i === 1 ? 'md:px-10' : 'md:pl-10'}>
            <h3 className="text-lg font-medium text-foreground">{v.title}</h3>
            <p className="mt-1.5 text-base text-foreground-muted">{v.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── pris — two cards inside a panel section ──────────────────────── */

function Pricing() {
  return (
    <section id="pris" className="scroll-mt-16 rounded-3xl bg-panel px-6 py-14 md:px-16 md:py-20">
      <div className="max-w-2xl">
        <p className="text-xs font-medium text-foreground-muted">Pris</p>
        <h2 className="mt-2 text-3xl font-medium text-foreground md:text-4xl">Gratis å starte</h2>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-2 md:gap-6">
        <div className="rounded-2xl bg-background p-6 shadow-soft md:p-8">
          <h3 className="text-lg font-medium text-foreground">Start</h3>
          <p className="mt-3 text-3xl font-medium text-foreground">Gratis</p>
          <p className="mt-1 text-sm text-foreground-muted">5 % gebyr per betaling</p>
          <ul className="mt-6 space-y-2.5">
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
          <div className="mt-8">
            <Button variant="secondary" className="w-full">
              Start gratis
            </Button>
          </div>
          <p className="mt-3 text-center text-sm text-foreground-muted">Du trenger ikke kort.</p>
        </div>
        <div className="rounded-2xl bg-background p-6 shadow-soft md:p-8">
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
          <ul className="mt-6 space-y-2.5">
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
          <div className="mt-8">
            <Button className="w-full">Velg Pro</Button>
          </div>
          <p className="mt-3 text-center text-sm text-foreground-muted">Ingen bindingstid.</p>
        </div>
      </div>
      <p className="mt-8 text-sm text-foreground-muted">Betalinger håndteres av Stripe.</p>
    </section>
  )
}

/* ── spørsmål og svar — rows inside one card ──────────────────────── */

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
    <section className="rounded-3xl bg-panel px-6 py-14 md:px-16 md:py-20">
      <div className="grid gap-10 md:grid-cols-12">
        <h2 className="text-3xl font-medium text-foreground md:col-span-4">Spørsmål og svar</h2>
        <div className="rounded-2xl bg-background px-6 shadow-soft md:col-span-8">
          {FAQ.map((q, i) => (
            <div
              key={q}
              className={`flex items-center justify-between py-5 ${
                i > 0 ? 'border-t border-border-subtle' : ''
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

/* ── closing — soft azure card, the page's one color moment ───────── */

function FinalCta() {
  return (
    <section className="rounded-3xl bg-primary-subtle px-6 py-16 md:px-16 md:py-24">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
        <h2 className="text-3xl font-medium text-foreground md:text-4xl">Klar når du er.</h2>
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
    <footer className="pt-12 pb-10">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-6">
            <p className="text-base font-medium text-foreground">Openspot</p>
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

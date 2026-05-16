import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Grain } from '@/components/ui/grain';
import { formatKroner } from '@/lib/utils';
import {
  scrollVariants,
  scrollStaggerVariants,
  scrollTransition,
} from '@/lib/motion';

// =============================================================================
// Screenshot placeholder — drop the real image in /public/screenshots/ and
// swap the <ScreenshotSlot> for an <img>. The label inside tells you what
// goes where.
// =============================================================================
function ScreenshotSlot({
  label,
  hint,
  aspect = 'aspect-[16/10]',
}: {
  label: string;
  hint: string;
  aspect?: string;
}) {
  return (
    <div
      className={`${aspect} relative w-full overflow-hidden rounded-lg border border-dashed border-border bg-muted/50`}
    >
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="mt-1 text-xs font-medium tracking-wide text-foreground-muted">
            {hint}
          </p>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// ProductFrame — the "card within a card" pattern. A muted sand panel
// holds a screenshot floating inside it. Monochrome, palette-aligned,
// textured via grain (not gradient).
// =============================================================================
function ProductFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate overflow-hidden rounded-2xl bg-muted p-3 sm:p-6 md:p-8">
      <Grain opacity={0.6} baseFrequency={0.7} />
      <div className="relative overflow-hidden rounded-lg border border-border bg-background shadow-[0_30px_60px_-15px_rgba(0,0,0,0.18)]">
        {children}
      </div>
    </div>
  );
}

const LandingPage = () => {
  return (
    <div className="overflow-x-hidden bg-background text-foreground antialiased">
      {/* Nav */}
      <nav
        className="absolute top-0 z-50 w-full border-none bg-transparent"
        aria-label="Hovednavigasjon"
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center" aria-label="Openspot – til forsiden">
            <span className="text-base font-medium text-foreground">Openspot</span>
          </Link>
          <div className="flex items-center gap-6">
            <a
              href="#pricing"
              className="hidden text-sm font-medium text-foreground-muted transition-colors hover:text-foreground md:block"
            >
              Pris
            </a>
            <Link
              to="/login"
              className="text-sm font-medium text-foreground-muted transition-colors hover:text-foreground"
            >
              Logg inn
            </Link>
            <Button asChild size="sm" variant="secondary">
              <Link to="/signup">Opprett konto</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ============================================================ */}
      {/* 1. HERO */}
      {/* ============================================================ */}
      <section className="bg-background pt-32 pb-16 md:pt-40 md:pb-24">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <motion.h1
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl"
            >
              Driv yogastudioet enklere.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="mt-4 text-base text-foreground-muted"
            >
              Mindre admin. Mer tid til undervisningen.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8"
            >
              <Button asChild size="cta">
                <Link to="/signup">Kom i gang</Link>
              </Button>
            </motion.div>
          </div>

          {/* Hero — product on gradient frame */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto mt-16 max-w-5xl md:mt-20"
          >
            <ProductFrame>
              <img
                src="/screenshots/hero-overview.png"
                alt="Openspot — oversikt over inntekter og kommende kurs"
                className="block w-full"
                style={{ imageRendering: '-webkit-optimize-contrast' }}
              />
            </ProductFrame>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. SPLIT — Public studio page (text left / product right) */}
      {/* ============================================================ */}
      <FeatureSplit
        title="Deltakerne finner deg."
        description="Del kursene dine med én lenke."
        align="left"
      >
        <ScreenshotSlot
          aspect="aspect-[4/3]"
          label="Public studio page"
          hint="public/screenshots/public-studio.png · 4:3"
        />
      </FeatureSplit>

      {/* ============================================================ */}
      {/* 3. SPLIT — Booking + Dintero (product left / text right) */}
      {/* ============================================================ */}
      <FeatureSplit
        title="Påmelding og Vipps."
        description="Deltakeren velger time og betaler — alt på én side."
        bullets={[
          'Vipps og kort',
          'Automatisk kvittering på e-post',
          'Enkel refusjon',
        ]}
        align="right"
      >
        <ScreenshotSlot
          aspect="aspect-[4/3]"
          label="Booking + embedded payment"
          hint="public/screenshots/booking-payment.png · 4:3"
        />
      </FeatureSplit>

      {/* ============================================================ */}
      {/* 5. WIDE — Teacher dashboard (centered text + full-width product) */}
      {/* ============================================================ */}
      <FeatureWide
        title="Inntekter og påmeldinger på ett sted."
        body="Hver påmelding havner i oversikten."
      >
        <img
          src="/screenshots/courses.png"
          alt="Openspot — kursoversikt"
          className="block aspect-[16/10] w-full object-cover object-top"
          style={{ imageRendering: '-webkit-optimize-contrast' }}
        />
      </FeatureWide>

      {/* ============================================================ */}
      {/* 7. PRICING — transparent, Dintero mentioned */}
      {/* ============================================================ */}
      <section id="pricing" className="bg-background py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={scrollVariants}
            transition={scrollTransition}
            className="mx-auto mb-16 max-w-2xl text-center"
          >
            <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Enkel og forutsigbar pris.
            </h2>
            <p className="mt-3 text-base text-foreground-muted">
              Start gratis. Bytt til Pro når du trenger mer.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={scrollStaggerVariants}
            className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2"
          >
            <PricingTier
              tier={{
                name: 'Start',
                description: 'Alt du trenger for å komme i gang.',
                price: 'Gratis',
                features: [
                  'Ubegrenset antall kurs og deltakere',
                  'Vipps og kort',
                  'Automatiske kvitteringer og påminnelser',
                  'Egen studioside',
                  'Refusjoner og avbestillinger',
                ],
                cta: { label: 'Start gratis', to: '/signup' },
                caption: 'Ingen kort nødvendig.',
              }}
            />
            <PricingTier
              tier={{
                name: 'Pro',
                description: 'For studioer i full drift.',
                price: formatKroner(500),
                priceSub: '/ mnd',
                features: [
                  'Alt i Start',
                  'Lavere transaksjonsavgift',
                  'Fiken-integrasjon for regnskap',
                  'Egne maler for e-post',
                  'Prioritert kundestøtte',
                ],
                cta: { label: 'Velg Pro', to: '/signup' },
                caption: 'Ingen bindingstid.',
              }}
            />
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 8. FINAL CTA */}
      {/* ============================================================ */}
      <section className="bg-background py-12 md:py-16">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={scrollVariants}
            transition={scrollTransition}
            className="flex flex-col items-center justify-between gap-8 rounded-3xl bg-muted px-8 py-16 md:flex-row md:gap-12 md:px-16 md:py-20"
          >
            <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Klar?
            </h2>
            <Button asChild size="cta">
              <Link to="/signup">Kom i gang</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 9. FOOTER — Framio AS, org.nr (Dintero-approval critical) */}
      {/* ============================================================ */}
      <footer className="bg-background pt-20 pb-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 grid grid-cols-1 gap-12 md:grid-cols-12">
            <div className="md:col-span-5">
              <span className="text-xl font-semibold text-foreground">Openspot</span>
              <p className="mt-6 max-w-sm text-sm leading-relaxed text-foreground-muted">
                Påmelding og betaling for yogastudioer.
                <br />
                Bygget i Norge.
              </p>
              <div className="mt-6 space-y-1.5 text-xs text-foreground-muted">
                <p>Framio AS</p>
                <p>Org.nr 935 967 511</p>
                <p>
                  <a href="mailto:hei@framio.no" className="hover:text-foreground">
                    hei@framio.no
                  </a>
                </p>
              </div>
            </div>
            <div className="md:col-span-2 md:col-start-7">
              <h4 className="mb-6 text-sm font-medium text-foreground">Produkt</h4>
              <ul className="space-y-4 text-sm text-foreground-muted">
                <li>
                  <a href="#pricing" className="transition-colors hover:text-foreground">
                    Pris
                  </a>
                </li>
              </ul>
            </div>
            <div className="md:col-span-2">
              <h4 className="mb-6 text-sm font-medium text-foreground">Konto</h4>
              <ul className="space-y-4 text-sm text-foreground-muted">
                <li>
                  <Link to="/signup" className="transition-colors hover:text-foreground">
                    Opprett konto
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="transition-colors hover:text-foreground">
                    Logg inn
                  </Link>
                </li>
              </ul>
            </div>
            <div className="md:col-span-2">
              <h4 className="mb-6 text-sm font-medium text-foreground">Juridisk</h4>
              <ul className="space-y-4 text-sm text-foreground-muted">
                <li>
                  <Link to="/terms" className="transition-colors hover:text-foreground">
                    Vilkår
                  </Link>
                </li>
                <li>
                  <Link to="/terms#personvern" className="transition-colors hover:text-foreground">
                    Personvern
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-6 border-t border-border pt-8 md:flex-row">
            <p className="text-xs text-foreground-muted">
              © {new Date().getFullYear()} Openspot
            </p>
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-success" />
              <span className="text-xs text-foreground-muted">Systemet er operativt</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// =============================================================================
// FeatureSplit — text on one side, product preview on the other. The
// 50/50 row alternates align="left" / align="right" between features so
// the page rhythm shifts. Inside ProductFrame is half-width, so use a
// portrait-ish aspect (4:3 or 5:4) on the ScreenshotSlot inside.
// =============================================================================
function FeatureSplit({
  title,
  description,
  bullets,
  align = 'left',
  children,
}: {
  title: string;
  description: string;
  bullets?: string[];
  align?: 'left' | 'right';
  children: React.ReactNode;
}) {
  return (
    <section className="bg-background py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={scrollStaggerVariants}
          className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16"
        >
          <motion.div
            variants={scrollVariants}
            transition={scrollTransition}
            className={align === 'right' ? 'lg:order-2' : ''}
          >
            <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              {title}
            </h2>
            <p className="mt-3 text-base text-foreground-muted">{description}</p>
            {bullets && bullets.length > 0 && (
              <ul className="mt-6 space-y-2.5">
                {bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex items-start gap-2.5 text-base text-foreground-muted"
                  >
                    <Check className="mt-1 size-4 flex-shrink-0 text-foreground-muted" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
          <motion.div
            variants={scrollVariants}
            transition={scrollTransition}
            className={align === 'right' ? 'lg:order-1' : ''}
          >
            <ProductFrame>{children}</ProductFrame>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// =============================================================================
// FeatureWide — centered text above a full-width gradient-framed product
// preview. The "hero echo" shape — use sparingly for the one feature that
// visually deserves to be big (here: the dashboard).
// =============================================================================
function FeatureWide({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-background py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={scrollVariants}
          transition={scrollTransition}
          className="mx-auto mb-12 max-w-xl text-center"
        >
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            {title}
          </h2>
          <p className="mt-2 text-base text-foreground-muted">{body}</p>
        </motion.div>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={scrollVariants}
          transition={scrollTransition}
          className="mx-auto max-w-5xl"
        >
          <ProductFrame>{children}</ProductFrame>
        </motion.div>
      </div>
    </section>
  );
}

// =============================================================================
// PricingTier
// =============================================================================
type Tier = {
  name: string;
  description: string;
  price: string;
  priceSub?: string;
  features: string[];
  cta: { label: string; to: string };
  caption?: string;
};

function PricingTier({ tier }: { tier: Tier }) {
  return (
    <motion.div
      variants={scrollVariants}
      transition={scrollTransition}
      className="flex flex-col rounded-xl border border-border bg-background p-8"
    >
      <div className="mb-6">
        <h3 className="inline-flex items-center rounded-full bg-muted px-3 py-0.5 text-sm font-semibold text-foreground">
          {tier.name}
        </h3>
        <p className="mt-3 text-sm text-foreground-muted">{tier.description}</p>
      </div>

      <div className="mb-8 border-b border-border pb-8">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
            {tier.price}
          </span>
          {tier.priceSub && (
            <span className="text-sm text-foreground-muted">{tier.priceSub}</span>
          )}
        </div>
      </div>

      <ul className="mb-8 flex-1 space-y-3">
        {tier.features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-3 text-sm text-foreground-muted"
          >
            <div className="mt-0.5 flex size-5 flex-shrink-0 items-center justify-center rounded-full bg-muted">
              <Check className="size-3.5 text-foreground" />
            </div>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Button asChild className="mt-auto h-12 w-full">
        <Link to={tier.cta.to}>{tier.cta.label}</Link>
      </Button>
      {tier.caption && (
        <p className="mt-4 text-center text-sm text-foreground-muted">
          {tier.caption}
        </p>
      )}
    </motion.div>
  );
}

export default LandingPage;

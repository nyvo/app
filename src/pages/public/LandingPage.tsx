import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Grain } from '@/components/public/Grain';
import { formatKroner } from '@/lib/utils';
import { COMPANY } from '@/lib/company';
import { useDocumentTitle } from '@/hooks/use-document-title';
import {
  scrollVariants,
  scrollStaggerVariants,
  scrollTransition,
} from '@/lib/motion';

const PRELAUNCH = import.meta.env.VITE_PRELAUNCH === 'true';

// =============================================================================
// ProductFrame — the "card within a card" pattern. A muted neutral panel
// holds a screenshot floating inside it. Monochrome, palette-aligned,
// textured via grain (not gradient).
// =============================================================================
function ProductFrame({
  children,
  tight = false,
}: {
  children: React.ReactNode;
  tight?: boolean;
}) {
  const padding = tight ? 'p-1.5 sm:p-3 md:p-4' : 'p-3 sm:p-6 md:p-8';
  return (
    <div className={`relative isolate overflow-hidden rounded-2xl bg-muted ${padding}`}>
      <Grain opacity={0.6} baseFrequency={0.7} />
      <div className="relative overflow-hidden rounded-lg border border-card bg-background shadow-soft">
        {children}
      </div>
    </div>
  );
}

const LandingPage = () => {
  useDocumentTitle()
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
            {!PRELAUNCH && (
              <Button asChild variant="secondary">
                <Link to="/auth">Logg inn</Link>
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* ============================================================ */}
      {/* 1. HERO */}
      {/* ============================================================ */}
      <section className="bg-background pt-32 pb-16 md:pt-40 md:pb-24">
        <div className="mx-auto w-full max-w-6xl px-6">
          {PRELAUNCH ? (
            <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-12">
              <div>
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="mb-4 text-xs font-medium text-foreground-muted"
                >
                  Bygget i Norge
                </motion.p>
                <motion.h1
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="font-serif text-4xl font-medium text-foreground md:text-5xl"
                >
                  Driv ditt yogastudio enklere.
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="mt-4 text-base text-foreground-muted"
                >
                  Hold orden på kurs, påmeldinger, betaling og deltakere på ett sted.
                </motion.p>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
              >
                <Button asChild size="cta">
                  <a href={`mailto:${COMPANY.email}`}>Ta kontakt</a>
                </Button>
                <p className="mt-3 text-sm text-foreground-muted">Vi åpner snart.</p>
              </motion.div>
            </div>
          ) : (
            <div className="mx-auto max-w-2xl text-center">
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="mb-4 text-xs font-medium text-foreground-muted"
              >
                Bygget i Norge
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="font-serif text-4xl font-medium text-foreground md:text-5xl"
              >
                Driv ditt yogastudio enklere.
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="mt-4 text-base text-foreground-muted"
              >
                Hold orden på kurs, påmeldinger, betaling og deltakere på ett sted.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
                className="mt-8"
              >
                <Button asChild size="cta">
                  <Link to="/auth?intent=seller">Kom i gang</Link>
                </Button>
              </motion.div>
            </div>
          )}

          {/* Hero — product on gradient frame */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto mt-16 max-w-5xl md:mt-20"
          >
            <ProductFrame>
              <img
                src="/localhost_5173_overview (1).png"
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
        eyebrow="Synlighet"
        title="Deltakerne finner deg."
        description="Del kursene dine med én lenke."
        align="left"
        frameTight
      >
        <img
          src="/localhost_5173_inspire-yogastudio (2).png"
          alt="Offentlig studio-side i Openspot"
          className="block w-full h-auto"
          style={{ imageRendering: '-webkit-optimize-contrast' }}
        />
      </FeatureSplit>

      {/* ============================================================ */}
      {/* 3. SPLIT — Booking + Stripe (product left / text right) */}
      {/* ============================================================ */}
      <FeatureSplit
        eyebrow="Påmelding og betaling"
        title="Enkel påmelding."
        description="Deltakeren velger time og betaler — alt på én side."
        bullets={[
          'Sikker kortbetaling',
          'Automatisk kvittering på e-post',
          'Enkel refusjon',
        ]}
        align="right"
        frameTight
      >
        <img
          src="/localhost_5173_inspire-yogastudio_seed-lunsj-yoga_pamelding_billett=drop-in.png"
          alt="Påmelding og betaling i Openspot"
          className="block w-full h-auto"
          style={{ imageRendering: '-webkit-optimize-contrast' }}
        />
      </FeatureSplit>

      {/* ============================================================ */}
      {/* 5. WIDE — Teacher dashboard (centered text + full-width product) */}
      {/* ============================================================ */}
      <FeatureWide
        eyebrow="Oversikt"
        title="Inntekter og påmeldinger på ett sted."
        body="Hver påmelding havner i oversikten."
      >
        <img
          src="/localhost_5173_courses_5139ffe5-7dcb-462d-ab71-cd9ad39a2c7e.png"
          alt="Openspot — kursoversikt"
          className="block w-full"
          style={{ imageRendering: '-webkit-optimize-contrast' }}
        />
      </FeatureWide>

      {/* ============================================================ */}
      {/* 7. PRICING — transparent, Stripe mentioned */}
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
            <p className="mb-3 text-xs font-medium text-foreground-muted">Pris</p>
            <h2 className="font-serif text-3xl font-medium text-foreground md:text-4xl">
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
                description: 'Alt du trenger for å ta imot påmeldinger og betaling.',
                price: 'Gratis',
                features: [
                  'Ubegrenset antall kurs og deltakere',
                  'Egen studioside',
                  'Påmeldinger rett inn i oversikten',
                  'Kortbetaling og automatiske utbetalinger',
                  '5 % plattformgebyr per betaling',
                ],
                cta: PRELAUNCH
                  ? { label: 'Ta kontakt', to: '#varsle' }
                  : { label: 'Start gratis', to: '/auth?intent=seller' },
                caption: PRELAUNCH ? 'Kommer snart.' : 'Ingen kort nødvendig.',
              }}
            />
            <PricingTier
              tier={{
                name: 'Pro',
                recommended: true,
                description: 'Lønner seg fra rundt 10 000 kr i påmeldinger i måneden.',
                price: formatKroner(499),
                priceSub: '/ mnd eks. mva',
                features: [
                  'Alt i Start',
                  '0 % plattformgebyr – du beholder hele kursprisen',
                  'Månedlig eller årlig betaling',
                ],
                cta: PRELAUNCH
                  ? { label: 'Ta kontakt', to: '#varsle' }
                  : { label: 'Velg Pro', to: '/auth?intent=seller' },
                caption: PRELAUNCH ? 'Kommer snart.' : 'Ingen bindingstid.',
              }}
            />
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 8. FINAL CTA */}
      {/* ============================================================ */}
      <section id="varsle" className="scroll-mt-16 bg-background py-12 md:py-16">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={scrollVariants}
            transition={scrollTransition}
            className="relative isolate flex flex-col items-center justify-between gap-8 overflow-hidden rounded-3xl bg-chrome px-8 py-16 md:flex-row md:gap-12 md:px-16 md:py-20"
          >
            {/* Dark chrome band — the same surface as the app's sidebar/toasts,
                so the landing page literally previews the product's chrome. */}
            <Grain opacity={0.4} baseFrequency={0.7} blend="soft-light" />
            <h2 className="relative font-serif text-3xl font-medium text-chrome-foreground md:text-4xl">
              {PRELAUNCH ? 'Bli med fra start.' : 'Klar?'}
            </h2>
            <div className="relative">
              {PRELAUNCH ? (
                <Button asChild size="cta">
                  <a href={`mailto:${COMPANY.email}`}>Ta kontakt</a>
                </Button>
              ) : (
                <Button asChild size="cta">
                  <Link to="/auth?intent=seller">Kom i gang</Link>
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 9. FOOTER — Framio AS, org.nr */}
      {/* ============================================================ */}
      <footer className="bg-background pt-20 pb-12">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 grid grid-cols-1 gap-12 md:grid-cols-12">
            <div className="md:col-span-5">
              <span className="text-xl font-medium text-foreground">Openspot</span>
              <p className="mt-6 max-w-sm text-base leading-relaxed text-foreground-muted">
                Påmelding, betaling og kursoversikt for yogastudioer.
                <br />
                Bygget i Norge.
              </p>
              <div className="mt-6 space-y-1.5 text-base text-foreground-muted">
                <p>
                  <a href={`mailto:${COMPANY.email}`} className="hover:text-foreground">
                    {COMPANY.email}
                  </a>
                </p>
              </div>
            </div>
            <div className="md:col-span-2 md:col-start-7">
              <h4 className="mb-6 text-base font-medium text-foreground">Produkt</h4>
              <ul className="space-y-4 text-base text-foreground-muted">
                <li>
                  <a href="#pricing" className="transition-colors hover:text-foreground">
                    Pris
                  </a>
                </li>
                <li>
                  <Link to="/om-oss" className="transition-colors hover:text-foreground">
                    Om oss
                  </Link>
                </li>
              </ul>
            </div>
            <div className="md:col-span-2">
              <h4 className="mb-6 text-base font-medium text-foreground">Konto</h4>
              <ul className="space-y-4 text-base text-foreground-muted">
                <li>
                  <Link to="/auth" className="transition-colors hover:text-foreground">
                    Logg inn
                  </Link>
                </li>
              </ul>
            </div>
            <div className="md:col-span-2">
              <h4 className="mb-6 text-base font-medium text-foreground">Juridisk</h4>
              <ul className="space-y-4 text-base text-foreground-muted">
                <li>
                  <Link to="/terms" className="transition-colors hover:text-foreground">
                    Vilkår
                  </Link>
                </li>
                <li>
                  <Link to="/personvern" className="transition-colors hover:text-foreground">
                    Personvern
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-6 border-t border-border pt-8 md:flex-row">
            <p className="text-base text-foreground-muted">
              © {new Date().getFullYear()} Openspot. Laget av {COMPANY.legalName}.
            </p>
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
  eyebrow,
  title,
  description,
  bullets,
  align = 'left',
  frame = true,
  frameTight = false,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  bullets?: string[];
  align?: 'left' | 'right';
  frame?: boolean;
  frameTight?: boolean;
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
          className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-16"
        >
          <motion.div
            variants={scrollVariants}
            transition={scrollTransition}
            className={`lg:col-span-5 ${align === 'right' ? 'lg:order-2' : ''}`}
          >
            {eyebrow && (
              <p className="mb-3 text-xs font-medium text-foreground-muted">{eyebrow}</p>
            )}
            <h2 className="font-serif text-3xl font-medium text-foreground md:text-4xl">
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
            className={`lg:col-span-7 ${align === 'right' ? 'lg:order-1' : ''}`}
          >
            {frame ? <ProductFrame tight={frameTight}>{children}</ProductFrame> : children}
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
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow?: string;
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
          {eyebrow && (
            <p className="mb-3 text-xs font-medium text-foreground-muted">{eyebrow}</p>
          )}
          <h2 className="font-serif text-3xl font-medium text-foreground md:text-4xl">
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
  /** The emphasized tier: its CTA stays primary, others render secondary. */
  recommended?: boolean;
};

function PricingTier({ tier }: { tier: Tier }) {
  return (
    <motion.div
      variants={scrollVariants}
      transition={scrollTransition}
      className="flex flex-col rounded-xl border border-card bg-surface p-8"
    >
      <div className="mb-6">
        <h3 className="inline-flex items-center rounded-full bg-muted px-3 py-0.5 text-base font-medium text-foreground">
          {tier.name}
        </h3>
        <p className="mt-3 text-base text-foreground-muted">{tier.description}</p>
      </div>

      <div className="mb-8 border-b border-border pb-8">
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-4xl font-medium text-foreground">
            {tier.price}
          </span>
          {tier.priceSub && (
            <span className="text-base text-foreground-muted">{tier.priceSub}</span>
          )}
        </div>
      </div>

      <ul className="mb-8 flex-1 space-y-3">
        {tier.features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-3 text-base text-foreground-muted"
          >
            <div className="mt-0.5 flex size-5 flex-shrink-0 items-center justify-center rounded-full bg-muted">
              <Check className="size-3.5 text-foreground" />
            </div>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        asChild
        variant={tier.recommended ? 'default' : 'secondary'}
        size="cta"
        className="mt-auto w-full"
      >
        <a href={tier.cta.to}>{tier.cta.label}</a>
      </Button>
      {tier.caption && (
        <p className="mt-4 text-center text-base text-foreground-muted">
          {tier.caption}
        </p>
      )}
    </motion.div>
  );
}

export default LandingPage;

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ChartBarIncreasingIcon,
  CreditCardIcon,
  UserMultiple02Icon,
} from '@hugeicons/core-free-icons';
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
// ProductFrame — the "card within a card" pattern. A subtle azure panel
// holds a screenshot floating inside it. Textured via grain (not gradient).
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
    <div className={`relative isolate overflow-hidden rounded-2xl bg-primary-subtle ${padding}`}>
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
              className="text-sm font-medium text-foreground-muted transition-colors hover:text-foreground"
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
                  className="mb-3 text-xs font-medium text-primary"
                >
                  Bygget i Norge
                </motion.p>
                <motion.h1
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="text-4xl font-semibold text-foreground md:text-5xl"
                >
                  Opprett kurs. Ta imot påmeldinger. Få betalt.
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="mt-4 text-base text-foreground-muted"
                >
                  Openspot samler kurs, påmeldinger, deltakere og betaling.
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
                className="mb-3 text-xs font-medium text-primary"
              >
                Bygget i Norge
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="text-4xl font-semibold text-foreground md:text-5xl"
              >
                Opprett kurs. Ta imot påmeldinger. Få betalt.
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="mt-4 text-base text-foreground-muted"
              >
                Openspot samler kurs, påmeldinger, deltakere og betaling.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
                className="mt-8"
              >
                <Button asChild size="cta">
                  <Link to="/auth?intent=seller">Opprett konto</Link>
                </Button>
              </motion.div>
            </div>
          )}

          {/* Hero — product on subtle azure frame. Plain div (not motion.div):
              this image is the LCP element and fetchPriority="high" — holding
              it at opacity:0 for a framer-motion fade delays LCP since Chrome
              won't count an opacity:0 element as painted. */}
          <div className="mx-auto mt-16 max-w-5xl md:mt-20">
            <ProductFrame>
              <img
                src="/landing-dashboard.webp"
                alt="Openspot – oversikt over inntekter og kommende kurs"
                width={2400}
                height={1660}
                fetchPriority="high"
                className="block w-full h-auto"
                style={{ imageRendering: '-webkit-optimize-contrast' }}
              />
            </ProductFrame>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. STOREFRONT — split: text left, staged product shot right.
          The shot comes from /dev/landing-shot-storefront (Flyt Studio)
          via scripts/capture-landing-hero.mjs --shot storefront. */}
      {/* ============================================================ */}
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
              className="lg:col-span-5"
            >
              <h2 className="text-3xl font-semibold text-foreground md:text-4xl">
                En side for kursene dine.
              </h2>
              <p className="mt-4 text-base text-foreground-muted">
                Vis kursene dine og ta imot påmeldinger på din egen studioside.
              </p>
            </motion.div>
            <motion.div
              variants={scrollVariants}
              transition={scrollTransition}
              className="lg:col-span-7"
            >
              <ProductFrame tight>
                <img
                  src="/landing-storefront.webp"
                  alt="Offentlig studioside i Openspot – Flyt Studio med timeplan og påmelding"
                  width={1600}
                  height={1356}
                  loading="lazy"
                  decoding="async"
                  className="block w-full h-auto"
                  style={{ imageRendering: '-webkit-optimize-contrast' }}
                />
              </ProductFrame>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. PREMIUM — near-black square cards on the white page. Card
          skeleton from Vizcom's "See measurable impact" dark cards
          (Mobbin): small icon top-left, text pinned to the bottom,
          no CTA inside the card. Icon scale stays small on purpose. */}
      {/* ============================================================ */}
      <section className="bg-background py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={scrollVariants}
            transition={scrollTransition}
            className="mb-12 max-w-2xl md:mb-16"
          >
            <h2 className="text-3xl font-semibold text-foreground md:text-4xl">
              Fra påmelding til utbetaling.
            </h2>
            <p className="mt-4 text-base text-foreground-muted">
              Deltakerne melder seg på og betaler selv. Du ser alt på ett sted.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={scrollStaggerVariants}
            className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6"
          >
            <PremiumCard
              icon={CreditCardIcon}
              title="Betaling"
              body="Deltakerne betaler ved påmelding. Du får utbetalingen til bankkontoen din."
            />
            <PremiumCard
              icon={UserMultiple02Icon}
              title="Påmeldinger"
              body="Deltakerne melder seg på selv, og deltakerlisten oppdateres automatisk."
            />
            <PremiumCard
              icon={ChartBarIncreasingIcon}
              title="Kursoversikt"
              body="Se inntekter, påmeldinger og deltakere for hvert kurs."
            />
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. PRICING — transparent, Stripe mentioned */}
      {/* ============================================================ */}
      <section id="pricing" className="bg-background py-20 md:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={scrollVariants}
            transition={scrollTransition}
            className="mx-auto mb-12 max-w-2xl text-center"
          >
            <h2 className="text-3xl font-semibold text-foreground md:text-4xl">
              En pris som er enkel å forstå.
            </h2>
            <p className="mt-4 text-base text-foreground-muted">
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
                description: 'For deg som vil publisere kurs og ta imot betaling.',
                price: 'Gratis',
                features: [
                  'Ubegrenset antall kurs og deltakere',
                  'Kortbetaling og automatiske utbetalinger',
                  '5 % plattformgebyr per betaling',
                ],
              }}
            />
            <PricingTier
              tier={{
                name: 'Pro',
                description: 'Fast månedspris. Ingen plattformgebyr.',
                price: formatKroner(499),
                priceSub: '/ mnd eks. mva.',
                features: [
                  'Alt i Start',
                  '0 % plattformgebyr',
                  'Ingen bindingstid',
                ],
              }}
            />
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. FINAL CTA */}
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
            {/* Dark chrome band — the same surface as the premium cards and
                the app's toasts, so the landing page literally previews the
                product's chrome. */}
            <Grain opacity={0.4} baseFrequency={0.7} blend="soft-light" />
            <h2 className="relative text-3xl font-semibold text-chrome-foreground md:text-4xl">
              {PRELAUNCH ? 'Snakk med oss.' : 'Start med neste kurs.'}
            </h2>
            <div className="relative">
              {PRELAUNCH ? (
                <Button asChild size="cta">
                  <a href={`mailto:${COMPANY.email}`}>Ta kontakt</a>
                </Button>
              ) : (
                <Button asChild size="cta">
                  <Link to="/auth?intent=seller">Opprett konto</Link>
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. FOOTER — Framio AS, org.nr */}
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
// PremiumCard — square near-black card. Small icon top-left, text pinned to
// the bottom, generous air in between. Surface = --chrome (same family as
// the CTA band and the app's toasts) + soft-light grain. Icons are the
// app's Hugeicons stroke set for now — swap for real 3D renders when a pack
// is chosen (Shapefest et al.).
// =============================================================================
function PremiumCard({
  icon,
  title,
  body,
}: {
  icon: React.ComponentProps<typeof HugeiconsIcon>['icon'];
  title: string;
  body: string;
}) {
  return (
    <motion.div
      variants={scrollVariants}
      transition={scrollTransition}
      className="relative isolate flex flex-col overflow-hidden rounded-2xl bg-chrome p-6 sm:p-7 md:aspect-square"
    >
      <Grain opacity={0.4} baseFrequency={0.7} blend="soft-light" />
      <HugeiconsIcon
        icon={icon}
        size={32}
        strokeWidth={1.5}
        className="relative text-chrome-foreground"
        aria-hidden="true"
      />
      <div className="relative mt-14 md:mt-auto">
        <h3 className="text-lg font-medium text-chrome-foreground">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-chrome-foreground-muted">{body}</p>
      </div>
    </motion.div>
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
};

function PricingTier({ tier }: { tier: Tier }) {
  return (
    <motion.div
      variants={scrollVariants}
      transition={scrollTransition}
      className="flex flex-col rounded-xl bg-panel p-6 sm:p-8"
    >
      <div className="mb-6">
        <h3 className="text-base font-medium text-foreground">
          {tier.name}
        </h3>
        <p className="mt-3 text-base text-foreground-muted">{tier.description}</p>
      </div>

      <div className="mb-8 border-b border-border pb-8">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-semibold text-foreground">
            {tier.price}
          </span>
          {tier.priceSub && (
            <span className="text-base text-foreground-muted">{tier.priceSub}</span>
          )}
        </div>
      </div>

      <ul className="flex-1 space-y-3">
        {tier.features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-3 text-base text-foreground-muted"
          >
            <div className="mt-0.5 flex size-5 flex-shrink-0 items-center justify-center rounded-full bg-primary-subtle">
              <Check className="size-3.5 text-primary" />
            </div>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export default LandingPage;

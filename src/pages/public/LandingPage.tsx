import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Infinity,
  Check,
  CreditCard,
  Smartphone,
  ArrowRightLeft,
  Mail,
  Clock,
  MapPin,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatKroner } from '@/lib/utils';
import {
  scrollVariants,
  scrollFadeVariants,
  scrollStaggerVariants,
  scrollTransition,
} from '@/lib/motion';

const LandingPage = () => {
  return (
    <div className="overflow-x-hidden bg-background text-foreground antialiased">
      {/* Navigation */}
      <nav className="absolute top-0 w-full z-50 bg-transparent border-none" aria-label="Hovednavigasjon">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" aria-label="Ease – til forsiden">
            <div className="size-6 bg-primary rounded-md flex items-center justify-center text-primary-foreground" aria-hidden="true">
              <Infinity className="w-3.5 h-3.5" />
            </div>
            <span className="type-title text-foreground">
              Ease
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <a href="#pricing" className="type-label hidden text-muted-foreground transition-colors hover:text-foreground md:block">
              Pris
            </a>
            <a href="mailto:hei@ease.no" className="type-label hidden text-muted-foreground transition-colors hover:text-foreground md:block">
              Kontakt
            </a>
            <Link to="/login" className="type-label text-muted-foreground transition-colors hover:text-foreground">
              Logg inn
            </Link>
            <Button asChild size="sm">
              <Link to="/signup">Start gratis</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-20 bg-background">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="type-display-2 mb-5 text-foreground leading-tight md:text-[56px] md:leading-[60px]">
              Påmelding og betaling <br className="hidden md:block" />
              for yogastudioer.
            </h1>

            <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-7 font-normal">
              Automatiser påmeldinger, betaling og regnskap. Alt på ett sted.
            </p>

            <Button
              asChild
              size="lg"
              className="px-6 text-base"
            >
              <Link to="/signup">Start gratis</Link>
            </Button>

          </div>

          {/* Product screenshot */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={scrollVariants}
            transition={scrollTransition}
            className="mt-12 md:mt-16 max-w-4xl mx-auto"
          >
            <div className="rounded-lg border border-border overflow-hidden bg-background">
              <img
                src="/Screenshot_10.png"
                alt="Ease kursside — påmelding for Morning Flow & Coffee"
                className="w-full h-auto"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-background py-20 md:py-28 w-full">
        <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={scrollVariants}
          transition={scrollTransition}
          className="text-center mb-16 max-w-2xl mx-auto"
        >
          <h2 className="type-heading-1 mb-4 text-foreground">
            Hvordan det fungerer
          </h2>
          <p className="text-muted-foreground text-lg">
            Fra planlegging til utbetaling på 1-2-3.
          </p>
        </motion.div>

        <motion.div
          variants={scrollStaggerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Step 1 */}
          <motion.div
            variants={scrollVariants}
            transition={scrollTransition}
            className="md:col-span-2 relative overflow-hidden rounded-lg bg-background border border-border p-8 ios-ease group"
          >
            <div className="relative z-10 w-full md:max-w-[50%]">
              <div className="flex items-center gap-3 mb-4">
                <div className="type-label flex size-8 items-center justify-center rounded-full border border-border bg-surface-muted text-foreground">
                  1
                </div>
                <h3 className="type-title text-foreground">
                  Sett opp kursene dine
                </h3>
              </div>
              <p className="type-body-lg mb-6 text-muted-foreground">
                Sett opp faste timer, arrangementer eller kursrekker. Gjentakelser
                og unntak håndteres automatisk.
              </p>
            </div>
            {/* Mini weekly calendar mockup */}
            <div className="absolute bottom-0 right-0 hidden h-3/4 w-1/2 translate-x-4 translate-y-4 rounded-tl-2xl border-l border-t border-border bg-surface-muted p-5 md:block">
              <div className="grid grid-cols-5 gap-2 text-center mb-3">
                {['Man', 'Tir', 'Ons', 'Tor', 'Fre'].map((day) => (
                  <span key={day} className="type-meta text-muted-foreground">{day}</span>
                ))}
              </div>
              <div className="grid grid-cols-5 gap-2">
                <div className="col-start-1 rounded-lg bg-primary text-primary-foreground p-2">
                  <p className="type-meta">Vinyasa</p>
                  <p className="type-meta opacity-70">09:00</p>
                </div>
                <div className="col-start-3 rounded-lg border border-border bg-surface p-2">
                  <p className="type-meta text-foreground">Yin Yoga</p>
                  <p className="type-meta text-muted-foreground">18:00</p>
                </div>
                <div className="col-start-5 rounded-lg border border-border bg-surface p-2">
                  <p className="type-meta text-foreground">Flow</p>
                  <p className="type-meta text-muted-foreground">10:00</p>
                </div>
                <div className="col-start-2 rounded-lg bg-primary text-primary-foreground p-2">
                  <p className="type-meta">Morgen</p>
                  <p className="type-meta opacity-70">07:30</p>
                </div>
                <div className="col-start-4 rounded-lg border border-border bg-surface p-2 opacity-50">
                  <p className="type-meta text-foreground">Restorative</p>
                  <p className="type-meta text-muted-foreground">19:00</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Step 2 */}
          <motion.div
            variants={scrollVariants}
            transition={scrollTransition}
            className="relative overflow-hidden rounded-lg bg-background border border-border p-8 ios-ease group flex flex-col"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="type-label flex size-8 items-center justify-center rounded-full border border-border bg-surface-muted text-foreground">
                2
              </div>
              <h3 className="type-title text-foreground">
                Del lenken
              </h3>
            </div>
            <p className="type-body-lg mb-8 text-muted-foreground">
              Del én lenke med elevene. De melder seg på og betaler selv. Ingen
              meldinger frem og tilbake.
            </p>
            {/* Mini course page mockup */}
            <div className="relative mt-auto flex w-full items-center justify-center overflow-hidden rounded-lg bg-surface-muted p-6">
              <div className="w-full max-w-[280px] rounded-lg border border-border bg-background p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="type-label text-foreground">Morning Flow & Coffee</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="type-meta flex items-center gap-1 text-muted-foreground">
                        <Calendar className="size-3" /> Lør, 24. sep
                      </span>
                      <span className="type-meta flex items-center gap-1 text-muted-foreground">
                        <Clock className="size-3" /> 09:00
                      </span>
                    </div>
                  </div>
                  <p className="type-label text-foreground">{formatKroner(250)}</p>
                </div>
                <div className="type-meta mb-3 flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="size-3" /> Majorstuen Studio
                </div>
                <div className="h-8 w-full bg-primary rounded-lg flex items-center justify-center">
                  <span className="type-meta text-primary-foreground">Påmelding</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Step 3 */}
          <motion.div
            variants={scrollVariants}
            transition={scrollTransition}
            className="relative overflow-hidden rounded-lg bg-background border border-border p-8 ios-ease group flex flex-col"
          >
            <div className="relative z-10 w-full mb-8">
              <div className="flex items-center gap-3 mb-4">
              <div className="type-label flex size-8 items-center justify-center rounded-full border border-border bg-surface-muted text-foreground">
                3
              </div>
              <h3 className="type-title text-foreground">
                Undervis
              </h3>
            </div>
              <p className="type-body-lg text-muted-foreground">
                Møt opp og gjør det du kan best. Påminnelser og
                kvitteringer sendes automatisk.
              </p>
            </div>
            {/* Notification stack mockup */}
            <div className="relative mt-auto flex w-full flex-col gap-3 rounded-lg border border-border bg-surface-muted p-6">
               <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                  <div className="size-8 rounded-full bg-status-confirmed-bg flex items-center justify-center text-status-confirmed-text flex-shrink-0">
                    <Check className="size-4" />
                  </div>
                  <div>
                    <p className="type-meta text-foreground">Påminnelse sendt</p>
                    <p className="type-meta text-muted-foreground">til 12 deltakere</p>
                  </div>
               </div>
               <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                  <div className="size-8 rounded-full bg-status-info-bg flex items-center justify-center text-status-info-text flex-shrink-0">
                     <div className="size-1.5 rounded-full bg-status-info-text" />
                  </div>
                  <div>
                    <p className="type-meta text-foreground">Oppmøte bekreftet</p>
                    <p className="type-meta text-muted-foreground">Automatisk</p>
                  </div>
               </div>
               <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                  <div className="size-8 rounded-full bg-status-confirmed-bg flex items-center justify-center text-status-confirmed-text flex-shrink-0">
                    <Mail className="size-4" />
                  </div>
                  <div>
                    <p className="type-meta text-foreground">Kvittering sendt</p>
                    <p className="type-meta text-muted-foreground">til 12 deltakere</p>
                  </div>
               </div>
            </div>
          </motion.div>
        </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="py-20 md:py-28 w-full border-t border-border/50"
      >
        <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={scrollVariants}
          transition={scrollTransition}
          className="mb-12 text-center max-w-2xl mx-auto"
        >
          <h2 className="type-heading-1 mb-4 text-foreground">
            Alt du trenger
          </h2>
          <p className="text-muted-foreground text-lg">
            Alt for å drive studioet ditt.
          </p>
        </motion.div>

        <motion.div
          variants={scrollStaggerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Feature 1: Payment (Wide) */}
          <motion.div
            variants={scrollVariants}
            transition={scrollTransition}
            className="md:col-span-2 bg-background rounded-lg border border-border p-8 md:p-12 overflow-hidden relative group"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
              <div>
                <div className="type-meta mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-foreground">
                  <CreditCard className="w-3.5 h-3.5" /> Betaling
                </div>
                <h3 className="type-heading-3 mb-4 text-foreground">
                  Inntekter på autopilot.
                </h3>
                <p className="text-muted-foreground text-lg leading-relaxed mb-8">
                  Slipp fakturaer og manuell oppfølging. Pengene kommer inn når
                  deltakeren melder seg på.
                </p>
                <div className="flex gap-6">
                  <div className="type-label flex items-center gap-2 text-foreground">
                    <Smartphone className="size-4 text-muted-foreground" /> Vipps og kort
                  </div>
                  <div className="type-label flex items-center gap-2 text-foreground">
                    <Check className="size-4 text-muted-foreground" /> Automatiske kvitteringer
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="rounded-lg border border-border bg-surface-muted/50 p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <p className="type-label text-muted-foreground">
                        Total omsetning
                      </p>
                      <p className="text-3xl font-medium text-foreground mt-1">
                        {formatKroner(42500)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="bg-status-confirmed-bg text-status-confirmed-text border-0">
                      +12 %
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-[70%]"></div>
                    </div>
                    <div className="type-meta flex justify-between text-muted-foreground">
                      <span>1. okt</span>
                      <span>31. okt</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Feature 2: Accounting */}
          <motion.div
            variants={scrollVariants}
            transition={{ ...scrollTransition, delay: 0.1 }}
            className="bg-background rounded-lg border border-border p-8 overflow-hidden relative group flex flex-col"
          >
            <div className="mb-8 relative z-10">
              <div className="type-meta mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-foreground">
                <ArrowRightLeft className="w-3.5 h-3.5" /> Regnskap
              </div>
              <h3 className="type-heading-1 mb-3 text-foreground">
                Regnskap uten hodepine.
              </h3>
              <p className="text-muted-foreground">
                Integrert med Fiken. Hvert salg bokføres automatisk.
              </p>
            </div>
            <div className="mt-auto relative -mx-8 -mb-8 h-64 bg-partner-fiken flex items-center justify-center overflow-hidden">
              <img
                src="/badges/fiken-hovedlogo.svg"
                alt="Fiken"
                className="w-40 h-auto brightness-0 invert"
              />
            </div>
          </motion.div>

          {/* Feature 3: Communication */}
          <motion.div
            variants={scrollVariants}
            transition={{ ...scrollTransition, delay: 0.15 }}
            className="bg-background rounded-lg border border-border p-8 overflow-hidden relative group flex flex-col"
          >
            <div className="mb-8 relative z-10">
              <div className="type-meta mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-foreground">
                <Mail className="w-3.5 h-3.5" /> Kommunikasjon
              </div>
              <h3 className="type-heading-1 mb-3 text-foreground">
                Aldri glem en påminnelse.
              </h3>
              <p className="text-muted-foreground">
                Automatiske e-poster til deltakere. Påminnelser, kvitteringer og meldinger.
              </p>
            </div>
            <div className="relative mt-auto -mx-8 -mb-8 flex flex-col gap-3 border-t border-border bg-surface-muted p-6">
              <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                <div className="size-7 rounded-full bg-status-info-bg flex items-center justify-center text-status-info-text flex-shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="type-meta text-foreground">Påminnelse: Yin Yoga i morgen</p>
                  <p className="type-meta text-muted-foreground">kl. 18:00 · Majorstuen</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                <div className="size-7 rounded-full bg-status-confirmed-bg flex items-center justify-center text-status-confirmed-text flex-shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="type-meta text-foreground">Kvittering for Morning Flow</p>
                  <p className="type-meta text-muted-foreground">{`${formatKroner(250)} · Sendt til deltaker`}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
        </div>
      </section>

      {/* Dark CTA Section */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={scrollFadeVariants}
        transition={scrollTransition}
        className="bg-primary py-20 md:py-28 w-full"
      >
        <div className="max-w-7xl mx-auto px-6 text-center">
          <motion.div variants={scrollVariants} transition={scrollTransition}>
            <h2 className="type-heading-1 mb-4 text-primary-foreground">
              Bygget for yogastudioer i Norge
            </h2>
            <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto mb-12">
              Ease håndterer påmelding, betaling og regnskap. Du fokuserer på undervisningen.
            </p>
          </motion.div>

          <motion.div
            variants={scrollStaggerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mb-12"
          >
            <motion.div variants={scrollVariants} transition={scrollTransition} className="p-6 rounded-lg bg-primary/80 border border-primary/60">
              <p className="text-2xl font-medium text-primary-foreground">100 %</p>
              <p className="type-body mt-1 text-muted-foreground">Norsk</p>
            </motion.div>
            <motion.div variants={scrollVariants} transition={scrollTransition} className="p-6 rounded-lg bg-primary/80 border border-primary/60">
              <p className="text-2xl font-medium text-primary-foreground">Gratis</p>
              <p className="type-body mt-1 text-muted-foreground">Ingen månedskostnad</p>
            </motion.div>
            <motion.div variants={scrollVariants} transition={scrollTransition} className="p-6 rounded-lg bg-primary/80 border border-primary/60">
              <p className="text-2xl font-medium text-primary-foreground">Fiken</p>
              <p className="type-body mt-1 text-muted-foreground">Automatisk bokføring</p>
            </motion.div>
          </motion.div>

          <Button
            asChild
            size="lg"
            className="border-input bg-background px-6 text-foreground hover:bg-surface-muted"
          >
            <Link to="/signup">Kom i gang</Link>
          </Button>
        </div>
      </motion.section>

      {/* Pricing */}
      <section
        id="pricing"
        className="bg-background py-24 md:py-32 w-full"
      >
        <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={scrollVariants}
          transition={scrollTransition}
          className="text-center mb-16"
        >
          <h2 className="type-heading-1 mb-4 text-foreground">
            Enkel prismodell
          </h2>
          <p className="text-muted-foreground mb-3">
            Start gratis. Voks når du er klar.
          </p>
        </motion.div>

        <motion.div
          variants={scrollStaggerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="max-w-lg mx-auto"
        >
          <motion.div
            variants={scrollVariants}
            transition={scrollTransition}
            className="bg-background p-8 rounded-lg border border-border flex flex-col"
          >
            <div className="mb-6">
              <h3 className="type-heading-3 text-foreground">
                Gratis
              </h3>
              <p className="type-body mt-2 text-muted-foreground">
                Alt du trenger for å komme i gang.
              </p>
            </div>
            <div className="mb-8 pb-8 border-b border-border">
              <div className="flex items-baseline gap-1">
                <span className="type-display-2 text-foreground">
                  Gratis
                </span>
                <span className="text-muted-foreground font-medium">/ mnd</span>
              </div>
              <p className="type-meta mt-2 text-muted-foreground">
                Ingen kort nødvendig.
              </p>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="type-body flex items-start gap-3 text-muted-foreground">
                <div className="mt-0.5 flex size-5 flex-shrink-0 items-center justify-center rounded-full bg-surface-muted">
                  <Check className="size-3 text-foreground" />
                </div>
                <span>Ubegrenset antall kurs og elever</span>
              </li>
              <li className="type-body flex items-start gap-3 text-muted-foreground">
                <div className="mt-0.5 flex size-5 flex-shrink-0 items-center justify-center rounded-full bg-surface-muted">
                  <Check className="size-3 text-foreground" />
                </div>
                <span>Nettbetaling med Vipps og kort</span>
              </li>
              <li className="type-body flex items-start gap-3 text-muted-foreground">
                <div className="mt-0.5 flex size-5 flex-shrink-0 items-center justify-center rounded-full bg-surface-muted">
                  <Check className="size-3 text-foreground" />
                </div>
                <span>Automatiske påminnelser til elever</span>
              </li>
              <li className="type-body flex items-start gap-3 text-muted-foreground">
                <div className="mt-0.5 flex size-5 flex-shrink-0 items-center justify-center rounded-full bg-surface-muted">
                  <Check className="size-3 text-foreground" />
                </div>
                <span>Fiken-integrasjon for regnskap</span>
              </li>
              <li className="type-body flex items-start gap-3 text-muted-foreground">
                <div className="mt-0.5 flex size-5 flex-shrink-0 items-center justify-center rounded-full bg-surface-muted">
                  <Check className="size-3 text-foreground" />
                </div>
                <span>Egen påmeldingsside med ditt design</span>
              </li>
            </ul>
            <Button
              asChild
              className="w-full mt-auto h-12"
            >
              <Link to="/signup">Start gratis</Link>
            </Button>
          </motion.div>
        </motion.div>
        </div>
      </section>

      {/* Footer */}
      <motion.footer
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        variants={scrollFadeVariants}
        transition={scrollTransition}
        className="bg-background border-t border-border pt-32 pb-16"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
            <div className="md:col-span-5">
              <div className="flex items-center gap-2 mb-6">
                <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
                  <Infinity className="size-4" />
                </div>
                <span className="type-heading-3 text-foreground">
                  Ease
                </span>
              </div>
              <p className="type-body mb-6 max-w-sm text-muted-foreground leading-relaxed">
                Påmelding og betaling for yogastudioer. <br />
                Bygget i Oslo.
              </p>
              <div className="flex items-center gap-4 opacity-60">
                {/* Social icons could go here */}
              </div>
            </div>
            <div className="md:col-span-2 md:col-start-7">
              <h4 className="type-label mb-6 text-foreground">
                Produkt
              </h4>
              <ul className="type-body space-y-4 text-muted-foreground">
                <li>
                  <a href="#features" className="hover:text-foreground transition-colors">
                    Funksjoner
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-foreground transition-colors">
                    Priser
                  </a>
                </li>
                <li>
                  <span className="text-muted-foreground cursor-default" aria-disabled="true">
                    Oppdateringer
                  </span>
                </li>
              </ul>
            </div>
            <div className="md:col-span-2">
              <h4 className="type-label mb-6 text-foreground">
                Selskap
              </h4>
              <ul className="type-body space-y-4 text-muted-foreground">
                <li>
                  <a href="mailto:hei@ease.no" className="hover:text-foreground transition-colors">
                    Kontakt
                  </a>
                </li>
              </ul>
            </div>
            <div className="md:col-span-2">
              <h4 className="type-label mb-6 text-foreground">
                Juridisk
              </h4>
              <ul className="type-body space-y-4 text-muted-foreground">
                <li>
                  <Link to="/terms" className="hover:text-foreground transition-colors">
                    Vilkår
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="type-meta text-muted-foreground">
              © {new Date().getFullYear()} Ease AS. Alle rettigheter reservert.
            </p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-status-confirmed-text"></div>
                <span className="type-meta text-muted-foreground">
                  Systemet er operativt
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.footer>
    </div>
  );
};

export default LandingPage;

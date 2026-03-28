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

// Animation variants — used only for scroll-based sections below the fold
const fadeInUp = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0 },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const LandingPage = () => {
  return (
    <div className="overflow-x-hidden bg-surface text-text-primary font-geist antialiased">
      {/* Navigation */}
      <nav className="absolute top-0 w-full z-50 bg-transparent border-none">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center text-white">
              <Infinity className="w-3.5 h-3.5" />
            </div>
            <span className="text-lg font-medium tracking-tighter text-text-primary">
              Ease
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#pricing" className="hidden md:block text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
              Pris
            </a>
            <a href="mailto:hei@ease.no" className="hidden md:block text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
              Kontakt
            </a>
            <Link to="/login" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
              Logg inn
            </Link>
            <Button asChild size="sm">
              <Link to="/signup">Start gratis</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="tracking-tight text-3xl md:text-5xl font-medium leading-tight text-text-primary mb-5">
              Påmelding og betaling <br className="hidden md:block" />
              for yogastudioer.
            </h1>

            <p className="text-base md:text-lg text-text-secondary leading-relaxed mb-7 font-normal">
              Automatiser påmeldinger, betaling og regnskap. Alt på ett sted.
            </p>

            <Button
              asChild
              size="lg"
              className="px-6 text-base"
            >
              <Link to="/signup">Start gratis</Link>
            </Button>

            {/* Trust line */}
            <div className="flex items-center justify-center gap-3 mt-6">
              <div className="flex items-center gap-2 opacity-60">
                <img src="/badges/vipps.svg" alt="Vipps" className="h-4" />
                <img src="/badges/visa.svg" alt="Visa" className="h-4" />
                <img src="/badges/mastercard.svg" alt="Mastercard" className="h-4" />
              </div>
              <span className="text-xs text-text-tertiary">Sikker betaling</span>
            </div>
          </div>

          {/* Product screenshot */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={fadeInUp}
            transition={{ duration: 0.6 }}
            className="mt-12 md:mt-16 max-w-4xl mx-auto"
          >
            <div className="rounded-xl border border-zinc-200 overflow-hidden bg-white">
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
      <section id="how-it-works" className="bg-surface py-20 md:py-28 w-full">
        <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 max-w-2xl mx-auto"
        >
          <h2 className="tracking-tight text-2xl md:text-3xl font-medium text-text-primary mb-4">
            Hvordan det fungerer
          </h2>
          <p className="text-text-secondary text-lg">
            Fra planlegging til utbetaling på 1-2-3.
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Step 1 */}
          <motion.div
            variants={fadeInUp}
            transition={{ duration: 0.6 }}
            className="md:col-span-2 relative overflow-hidden rounded-xl bg-white border border-zinc-200 p-8 ios-ease group"
          >
            <div className="relative z-10 w-full md:max-w-[50%]">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 text-sm font-medium text-text-primary">
                  1
                </div>
                <h3 className="text-xl font-medium text-text-primary">
                  Sett opp timeplanen
                </h3>
              </div>
              <p className="text-text-secondary text-base leading-relaxed mb-6">
                Sett opp faste timer, arrangementer eller kursrekker. Gjentakelser
                og unntak håndteres automatisk.
              </p>
            </div>
            {/* Mini weekly calendar mockup */}
            <div className="hidden md:block absolute right-0 bottom-0 w-1/2 h-3/4 bg-zinc-50 rounded-tl-2xl border-t border-l border-zinc-100 p-5 translate-y-4 translate-x-4">
              <div className="grid grid-cols-5 gap-2 text-center mb-3">
                {['Man', 'Tir', 'Ons', 'Tor', 'Fre'].map((day) => (
                  <span key={day} className="text-xs font-medium text-text-tertiary">{day}</span>
                ))}
              </div>
              <div className="grid grid-cols-5 gap-2">
                <div className="col-start-1 rounded-lg bg-primary text-white p-2">
                  <p className="text-xs font-medium">Vinyasa</p>
                  <p className="text-xs opacity-70">09:00</p>
                </div>
                <div className="col-start-3 rounded-lg bg-zinc-100 border border-zinc-200 p-2">
                  <p className="text-xs font-medium text-text-primary">Yin Yoga</p>
                  <p className="text-xs text-text-tertiary">18:00</p>
                </div>
                <div className="col-start-5 rounded-lg bg-zinc-100 border border-zinc-200 p-2">
                  <p className="text-xs font-medium text-text-primary">Flow</p>
                  <p className="text-xs text-text-tertiary">10:00</p>
                </div>
                <div className="col-start-2 rounded-lg bg-primary text-white p-2">
                  <p className="text-xs font-medium">Morgen</p>
                  <p className="text-xs opacity-70">07:30</p>
                </div>
                <div className="col-start-4 rounded-lg bg-zinc-100 border border-zinc-200 p-2 opacity-50">
                  <p className="text-xs font-medium text-text-primary">Restorative</p>
                  <p className="text-xs text-text-tertiary">19:00</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Step 2 */}
          <motion.div
            variants={fadeInUp}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-xl bg-white border border-zinc-200 p-8 ios-ease group flex flex-col"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 text-sm font-medium text-text-primary">
                2
              </div>
              <h3 className="text-xl font-medium text-text-primary">
                Del lenken
              </h3>
            </div>
            <p className="text-text-secondary text-base leading-relaxed mb-8">
              Del én lenke med elevene. De melder seg på og betaler selv. Ingen
              meldinger frem og tilbake.
            </p>
            {/* Mini course page mockup */}
            <div className="mt-auto relative w-full bg-zinc-50 rounded-xl overflow-hidden flex items-center justify-center p-6">
              <div className="bg-white rounded-xl border border-zinc-200 p-4 w-full max-w-[280px]">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary">Morning Flow & Coffee</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="flex items-center gap-1 text-xs text-text-tertiary">
                        <Calendar className="w-3 h-3" /> Lør, 24. sep
                      </span>
                      <span className="flex items-center gap-1 text-xs text-text-tertiary">
                        <Clock className="w-3 h-3" /> 09:00
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-text-primary">250 kr</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-text-tertiary mb-3">
                  <MapPin className="w-3 h-3" /> Majorstuen Studio
                </div>
                <div className="h-8 w-full bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-xs font-medium text-white">Påmelding</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Step 3 */}
          <motion.div
            variants={fadeInUp}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden rounded-xl bg-white border border-zinc-200 p-8 ios-ease group flex flex-col"
          >
            <div className="relative z-10 w-full mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200 text-sm font-medium text-text-primary">
                  3
                </div>
                <h3 className="text-xl font-medium text-text-primary">
                  Undervis
                </h3>
              </div>
              <p className="text-text-secondary text-base leading-relaxed">
                Møt opp og gjør det du kan best. Påminnelser og
                kvitteringer sendes automatisk.
              </p>
            </div>
            {/* Notification stack mockup */}
            <div className="mt-auto relative w-full bg-zinc-50 rounded-xl border border-zinc-200 p-6 flex flex-col gap-3">
               <div className="bg-white p-3 rounded-xl border border-zinc-200 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-status-confirmed-bg flex items-center justify-center text-status-confirmed-text flex-shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-text-primary">Påminnelse sendt</p>
                    <p className="text-xs text-text-secondary">til 12 deltakere</p>
                  </div>
               </div>
               <div className="bg-white p-3 rounded-xl border border-zinc-200 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-status-info-bg flex items-center justify-center text-status-info-text flex-shrink-0">
                     <div className="w-1.5 h-1.5 rounded-full bg-status-info-text" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-text-primary">Oppmøte bekreftet</p>
                    <p className="text-xs text-text-secondary">Automatisk</p>
                  </div>
               </div>
               <div className="bg-white p-3 rounded-xl border border-zinc-200 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-status-confirmed-bg flex items-center justify-center text-status-confirmed-text flex-shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-text-primary">Kvittering sendt</p>
                    <p className="text-xs text-text-secondary">til 12 deltakere</p>
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
          variants={fadeInUp}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center max-w-2xl mx-auto"
        >
          <h2 className="tracking-tight text-2xl md:text-3xl font-medium text-text-primary mb-4">
            Alt du trenger
          </h2>
          <p className="text-text-secondary text-lg">
            Alt for å drive studioet ditt.
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Feature 1: Payment (Wide) */}
          <motion.div
            variants={fadeInUp}
            transition={{ duration: 0.6 }}
            className="md:col-span-2 bg-white rounded-xl border border-zinc-200 p-8 md:p-12 overflow-hidden relative group"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-zinc-200 text-text-primary text-xs font-medium mb-6">
                  <CreditCard className="w-3.5 h-3.5" /> Betaling
                </div>
                <h3 className="text-xl font-medium text-text-primary tracking-tight mb-4">
                  Inntekter på autopilot.
                </h3>
                <p className="text-text-secondary text-lg leading-relaxed mb-8">
                  Slipp fakturaer og manuell oppfølging. Pengene kommer inn når
                  deltakeren melder seg på.
                </p>
                <div className="flex gap-6">
                  <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                    <Smartphone className="w-4 h-4 text-text-tertiary" /> Vipps og kort
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                    <Check className="w-4 h-4 text-text-tertiary" /> Automatiske kvitteringer
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="bg-zinc-50/50 rounded-xl border border-zinc-200 p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <p className="text-sm font-medium text-text-secondary">
                        Total omsetning
                      </p>
                      <p className="text-3xl font-medium text-text-primary mt-1">
                        42 500 kr
                      </p>
                    </div>
                    <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      +12 %
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="h-2 w-full bg-zinc-200 rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-[70%]"></div>
                    </div>
                    <div className="flex justify-between text-xs text-text-secondary">
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
            variants={fadeInUp}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-white rounded-xl border border-zinc-200 p-8 overflow-hidden relative group flex flex-col"
          >
            <div className="mb-8 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-zinc-200 text-text-primary text-xs font-medium mb-4">
                <ArrowRightLeft className="w-3.5 h-3.5" /> Regnskap
              </div>
              <h3 className="text-2xl font-medium text-text-primary tracking-tight mb-3">
                Regnskap uten hodepine.
              </h3>
              <p className="text-text-secondary">
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
            variants={fadeInUp}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="bg-white rounded-xl border border-zinc-200 p-8 overflow-hidden relative group flex flex-col"
          >
            <div className="mb-8 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-zinc-200 text-text-primary text-xs font-medium mb-4">
                <Mail className="w-3.5 h-3.5" /> Kommunikasjon
              </div>
              <h3 className="text-2xl font-medium text-text-primary tracking-tight mb-3">
                Aldri glem en påminnelse.
              </h3>
              <p className="text-text-secondary">
                Automatiske e-poster til deltakere. Påminnelser, kvitteringer og meldinger.
              </p>
            </div>
            <div className="mt-auto relative -mx-8 -mb-8 bg-zinc-50 border-t border-zinc-200 p-6 flex flex-col gap-3">
              <div className="bg-white p-3 rounded-xl border border-zinc-200 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-status-info-bg flex items-center justify-center text-status-info-text flex-shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-text-primary">Påminnelse: Yin Yoga i morgen</p>
                  <p className="text-xs text-text-tertiary">kl. 18:00 · Majorstuen</p>
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-zinc-200 flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-status-confirmed-bg flex items-center justify-center text-status-confirmed-text flex-shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-text-primary">Kvittering for Morning Flow</p>
                  <p className="text-xs text-text-tertiary">250 kr · Sendt til deltaker</p>
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
        variants={fadeIn}
        transition={{ duration: 0.6 }}
        className="bg-zinc-900 py-20 md:py-28 w-full"
      >
        <div className="max-w-7xl mx-auto px-6 text-center">
          <motion.div variants={fadeInUp} transition={{ duration: 0.6 }}>
            <h2 className="tracking-tight text-2xl md:text-3xl font-medium text-white mb-4">
              Bygget for yogastudioer i Norge
            </h2>
            <p className="text-zinc-400 text-base md:text-lg max-w-xl mx-auto mb-12">
              Ease håndterer påmelding, betaling og regnskap. Du fokuserer på undervisningen.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mb-12"
          >
            <motion.div variants={fadeInUp} transition={{ duration: 0.6 }} className="p-6 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <p className="text-2xl font-medium text-white">100 %</p>
              <p className="text-sm text-zinc-400 mt-1">Norsk</p>
            </motion.div>
            <motion.div variants={fadeInUp} transition={{ duration: 0.6 }} className="p-6 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <p className="text-2xl font-medium text-white">Gratis</p>
              <p className="text-sm text-zinc-400 mt-1">Ingen månedskostnad</p>
            </motion.div>
            <motion.div variants={fadeInUp} transition={{ duration: 0.6 }} className="p-6 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <p className="text-2xl font-medium text-white">Fiken</p>
              <p className="text-sm text-zinc-400 mt-1">Automatisk bokføring</p>
            </motion.div>
          </motion.div>

          <Button
            asChild
            size="lg"
            className="bg-white text-zinc-900 border-zinc-300 hover:bg-zinc-100 px-6"
          >
            <Link to="/signup">Kom i gang</Link>
          </Button>
        </div>
      </motion.section>

      {/* Pricing */}
      <section
        id="pricing"
        className="bg-white py-24 md:py-32 w-full"
      >
        <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="tracking-tight text-2xl md:text-3xl font-medium text-text-primary mb-4">
            Enkel prismodell
          </h2>
          <p className="text-text-secondary mb-3">
            Start gratis. Voks når du er klar.
          </p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="max-w-lg mx-auto"
        >
          <motion.div
            variants={fadeInUp}
            transition={{ duration: 0.6 }}
            className="bg-white p-8 rounded-xl border border-zinc-200 flex flex-col"
          >
            <div className="mb-6">
              <h3 className="text-xl font-medium text-text-primary tracking-tight">
                Gratis
              </h3>
              <p className="text-sm text-text-secondary mt-2">
                Alt du trenger for å komme i gang.
              </p>
            </div>
            <div className="mb-8 pb-8 border-b border-zinc-200">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-medium tracking-tight text-text-primary">
                  Gratis
                </span>
                <span className="text-text-secondary font-medium">/ mnd</span>
              </div>
              <p className="text-xs text-text-secondary mt-2">
                Ingen kort nødvendig.
              </p>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-start gap-3 text-sm text-text-secondary">
                <div className="w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-text-primary" />
                </div>
                <span>Ubegrenset antall kurs og elever</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-text-secondary">
                <div className="w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-text-primary" />
                </div>
                <span>Nettbetaling med Vipps og kort</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-text-secondary">
                <div className="w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-text-primary" />
                </div>
                <span>Automatiske påminnelser til elever</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-text-secondary">
                <div className="w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-text-primary" />
                </div>
                <span>Fiken-integrasjon for regnskap</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-text-secondary">
                <div className="w-5 h-5 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-text-primary" />
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
        variants={fadeIn}
        transition={{ duration: 0.6 }}
        className="bg-surface border-t border-border pt-32 pb-16"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
            <div className="md:col-span-5">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
                  <Infinity className="w-4 h-4" />
                </div>
                <span className="text-xl font-medium tracking-tighter text-text-primary">
                  Ease
                </span>
              </div>
              <p className="text-text-secondary text-sm leading-relaxed max-w-sm mb-6">
                Påmelding og betaling for yogastudioer. <br />
                Bygget i Oslo.
              </p>
              <div className="flex items-center gap-4 opacity-60">
                {/* Social icons could go here */}
              </div>
            </div>
            <div className="md:col-span-2 md:col-start-7">
              <h4 className="font-medium text-text-primary mb-6 text-sm">
                Produkt
              </h4>
              <ul className="space-y-4 text-sm text-text-secondary">
                <li>
                  <a href="#features" className="hover:text-text-primary transition-colors">
                    Funksjoner
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-text-primary transition-colors">
                    Priser
                  </a>
                </li>
                <li>
                  <span className="text-text-tertiary cursor-default">
                    Oppdateringer
                  </span>
                </li>
              </ul>
            </div>
            <div className="md:col-span-2">
              <h4 className="font-medium text-text-primary mb-6 text-sm">
                Selskap
              </h4>
              <ul className="space-y-4 text-sm text-text-secondary">
                <li>
                  <a href="mailto:hei@ease.no" className="hover:text-text-primary transition-colors">
                    Kontakt
                  </a>
                </li>
              </ul>
            </div>
            <div className="md:col-span-2">
              <h4 className="font-medium text-text-primary mb-6 text-sm">
                Juridisk
              </h4>
              <ul className="space-y-4 text-sm text-text-secondary">
                <li>
                  <Link to="/terms" className="hover:text-text-primary transition-colors">
                    Vilkår
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-xs text-text-secondary">
              © {new Date().getFullYear()} Ease AS. Alle rettigheter reservert.
            </p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-xs font-medium text-text-secondary">
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

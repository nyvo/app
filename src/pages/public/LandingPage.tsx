import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Infinity,
  Check,
  CreditCard,
  Smartphone,
  ArrowRightLeft,
  MessageSquare,
  Wind,
  Sun,
  Waves,
  Flower2,
} from 'lucide-react';

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
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
      staggerChildren: 0.15,
    },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
};

const LandingPage = () => {
  return (
    <div className="overflow-x-hidden selection:bg-stone-200 selection:text-stone-900 bg-[#FAF9F6] text-[#1c1917] font-sans antialiased">
      {/* Custom styles */}
      <style>{`
        .glass-panel {
          background: rgba(250, 249, 246, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }
        .mono-img {
          filter: grayscale(100%) contrast(1.1) brightness(1.1);
          transition: filter 0.5s ease, transform 0.7s ease;
        }
        .mono-img:hover {
          filter: grayscale(0%);
        }
        .group:hover .mono-img {
          filter: grayscale(0%);
          transform: scale(1.05);
        }
      `}</style>

      {/* Navigation */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
        className="fixed top-0 w-full z-50 glass-panel"
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-stone-900 rounded-md flex items-center justify-center text-white shadow-sm">
              <Infinity className="w-3.5 h-3.5" />
            </div>
            <span className="text-lg font-semibold tracking-tighter text-stone-900">Ease</span>
          </div>
          <Link to="/signup" className="text-sm font-medium bg-stone-900 text-white px-4 py-2 rounded-lg hover:bg-stone-800 transition-colors shadow-sm ring-1 ring-stone-900/5">
            Prøv gratis
          </Link>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
        {/* Warm ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-stone-200/40 via-stone-100/10 to-transparent rounded-full blur-3xl -z-10 opacity-70"></div>

        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1], delay: 0 }}
            className="text-sm text-stone-400 mb-4 tracking-wide"
          >
            For yogalærere og studioer
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1], delay: 0.1 }}
            className="text-5xl md:text-7xl font-semibold tracking-tighter leading-[1.1] text-stone-900 mb-8"
          >
            Mindre styr. <br className="hidden md:block" />
            <span className="font-semibold text-stone-900">Mer tid.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1], delay: 0.2 }}
            className="text-lg md:text-xl text-stone-500 max-w-2xl mx-auto leading-relaxed mb-10 font-normal"
          >
            Booking, betaling og regnskap – på ett sted.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1], delay: 0.3 }}
            className="flex items-center justify-center mb-20"
          >
            <Link to="/signup" className="inline-flex px-8 py-3.5 bg-stone-900 text-white font-medium rounded-xl hover:bg-stone-800 transition-all shadow-lg shadow-stone-200/50 hover:shadow-xl hover:-translate-y-0.5">
              Start nå
            </Link>
          </motion.div>
        </div>

        {/* Dashboard Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.25, 1, 0.5, 1], delay: 0.4 }}
          className="max-w-5xl mx-auto px-4 relative"
        >
          <div className="relative bg-white rounded-2xl shadow-2xl shadow-stone-200/60 border border-stone-200 overflow-hidden ring-1 ring-stone-900/5">
            {/* Mockup Header */}
            <div className="h-12 border-b border-stone-100 flex items-center px-4 bg-stone-50/80 gap-2">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-stone-300"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-stone-300"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-stone-300"></div>
              </div>
              <div className="ml-auto text-xs text-stone-400 font-medium tracking-tight">ease.no/kurs/morning-flow</div>
            </div>

            {/* Screenshot */}
            <img
              src="/Screenshot_10.png"
              alt="Ease dashboard preview"
              className="w-full h-auto"
            />
          </div>

        </motion.div>
      </section>

      {/* Social Proof */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeIn}
        transition={{ duration: 0.6 }}
        className="py-10 border-y border-stone-200/60 bg-white/40"
      >
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-sm font-medium text-stone-500 mb-6 uppercase tracking-wider">Brukes av</p>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-70 grayscale"
          >
            {[
              { icon: Wind, name: 'PAUSE' },
              { icon: Sun, name: 'ROM' },
              { icon: Waves, name: 'FLYT' },
              { icon: Flower2, name: 'KJERNE' },
            ].map((brand) => (
              <motion.span
                key={brand.name}
                variants={fadeInUp}
                transition={{ duration: 0.5 }}
                className="text-xl font-bold tracking-tighter text-stone-900 flex items-center gap-2"
              >
                <brand.icon className="w-5 h-5" /> {brand.name}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </motion.section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 max-w-6xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-stone-900 mb-4">Flyten</h2>
          <p className="text-stone-500 text-lg">Rett på. Ingen installasjon.</p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {/* Step 1 */}
          <motion.div variants={fadeInUp} transition={{ duration: 0.6 }} className="flex flex-col group">
            <div className="aspect-[4/3] w-full bg-stone-100 rounded-2xl mb-6 overflow-hidden relative shadow-inner ring-1 ring-black/5">
              <img
                src="https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                alt="Create studio class"
                className="w-full h-full object-cover mono-img opacity-90 group-hover:opacity-100"
              />
              <div className="absolute inset-0 bg-stone-900/5 group-hover:bg-transparent transition-colors"></div>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-2xl font-medium text-stone-300 select-none leading-none mt-0.5">01</span>
              <div>
                <h3 className="text-xl font-medium tracking-tight text-stone-900 mb-1">Planlegg</h3>
                <p className="text-stone-500 leading-relaxed text-sm">
                  Sett opp timeplanen én gang.<br />Gjentas automatisk. Juster når det trengs.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Step 2 */}
          <motion.div variants={fadeInUp} transition={{ duration: 0.6 }} className="flex flex-col group">
            <div className="aspect-[4/3] w-full bg-stone-100 rounded-2xl mb-6 overflow-hidden relative shadow-inner ring-1 ring-black/5">
              <img
                src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                alt="Share studio link"
                className="w-full h-full object-cover mono-img opacity-90 group-hover:opacity-100"
              />
              <div className="absolute inset-0 bg-stone-900/5 group-hover:bg-transparent transition-colors"></div>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-2xl font-medium text-stone-300 select-none leading-none mt-0.5">02</span>
              <div>
                <h3 className="text-xl font-medium tracking-tight text-stone-900 mb-1">Inviter</h3>
                <p className="text-stone-500 leading-relaxed text-sm">
                  Del én lenke.<br />Elevene ordner resten selv.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Step 3 */}
          <motion.div variants={fadeInUp} transition={{ duration: 0.6 }} className="flex flex-col group">
            <div className="aspect-[4/3] w-full bg-stone-100 rounded-2xl mb-6 overflow-hidden relative shadow-inner ring-1 ring-black/5">
              <img
                src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                alt="Teach yoga class"
                className="w-full h-full object-cover mono-img opacity-90 group-hover:opacity-100"
              />
              <div className="absolute inset-0 bg-stone-900/5 group-hover:bg-transparent transition-colors"></div>
            </div>
            <div className="flex items-start gap-4">
              <span className="text-2xl font-medium text-stone-300 select-none leading-none mt-0.5">03</span>
              <div>
                <h3 className="text-xl font-medium tracking-tight text-stone-900 mb-1">Undervis</h3>
                <p className="text-stone-500 leading-relaxed text-sm">
                  Møt opp og start timen.<br />Resten går av seg selv.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 max-w-6xl mx-auto px-6 border-t border-stone-200/50">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
          transition={{ duration: 0.6 }}
          className="mb-24 text-center max-w-2xl mx-auto"
        >
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-stone-900 mb-4">Detaljene</h2>
          <p className="text-stone-500 text-lg">Små ting som sparer mye tid.</p>
        </motion.div>

        <div className="space-y-32">
          {/* Feature 1: Payment */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeInUp}
              transition={{ duration: 0.6 }}
              className="order-2 lg:order-1"
            >
              <h3 className="text-3xl font-semibold text-stone-900 tracking-tight mb-4">Få betalt før timen starter.</h3>
              <p className="text-stone-500 text-lg leading-relaxed mb-8">
                Ingen fakturaer.<br />Ingen oppfølging.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm text-stone-700 font-medium">
                  <span className="w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center">
                    <Check className="w-3 h-3" />
                  </span>
                  Betaling gjennom Stripe
                </li>
                <li className="flex items-center gap-3 text-sm text-stone-700 font-medium">
                  <span className="w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center">
                    <Check className="w-3 h-3" />
                  </span>
                  Automatiske kvitteringer
                </li>
              </ul>
            </motion.div>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={scaleIn}
              transition={{ duration: 0.7 }}
              className="order-1 lg:order-2 relative"
            >
              {/* Visual for Payment */}
              <div className="bg-white rounded-2xl shadow-xl border border-stone-200 p-8 rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="flex items-center justify-between mb-8">
                  <div className="font-semibold text-stone-900">Total</div>
                  <div className="text-xs text-stone-400">Denne uken</div>
                </div>
                <div className="text-4xl font-bold text-stone-900 tracking-tight mb-2">12 450,-</div>
                <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden mb-6">
                  <div className="h-full bg-stone-800 w-3/4"></div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                        <Smartphone className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-stone-600">Vipps</span>
                    </div>
                    <span className="font-medium text-stone-900">+ 8 200,-</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <CreditCard className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-stone-600">Kort</span>
                    </div>
                    <span className="font-medium text-stone-900">+ 4 250,-</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Feature 2: Fiken / Accounting */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={scaleIn}
              transition={{ duration: 0.7 }}
              className="order-1 relative pl-6"
            >
              {/* Visual for Fiken Integration */}
              <div className="relative bg-[#5239ba] rounded-2xl border border-[#4830a8] p-12 aspect-[4/3] flex items-center justify-center shadow-sm">
                {/* Fiken Logo */}
                <img
                  src="/badges/fiken-hovedlogo.svg"
                  alt="Fiken"
                  className="w-full max-w-[280px] h-auto brightness-0 invert"
                />
              </div>
            </motion.div>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeInUp}
              transition={{ duration: 0.6 }}
              className="order-2"
            >
              <h3 className="text-3xl font-semibold text-stone-900 tracking-tight mb-4">Regnskap, uten ekstra jobb.</h3>
              <p className="text-stone-500 text-lg leading-relaxed mb-8">
                Salgene føres i bakgrunnen.
              </p>
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex items-start gap-4">
                <div className="min-w-[2rem] w-8 h-8 bg-white rounded-lg border border-stone-200 flex items-center justify-center text-blue-600 shadow-sm">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-stone-900">Synkronisert i sanntid</h4>
                  <p className="text-xs text-stone-500 mt-1">Du trenger ikke gjøre noe.</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Feature 3: Waitlists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeInUp}
              transition={{ duration: 0.6 }}
              className="order-2 lg:order-1"
            >
              <h3 className="text-3xl font-semibold text-stone-900 tracking-tight mb-4">Ingen tomme matter.</h3>
              <p className="text-stone-500 text-lg leading-relaxed mb-8">
                Plassene fylles av seg selv.
              </p>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm text-stone-700 font-medium">
                  <span className="w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center">
                    <Check className="w-3 h-3" />
                  </span>
                  SMS-varsling
                </li>
                <li className="flex items-center gap-3 text-sm text-stone-700 font-medium">
                  <span className="w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center">
                    <Check className="w-3 h-3" />
                  </span>
                  Automatisk oppfylling
                </li>
              </ul>
            </motion.div>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={scaleIn}
              transition={{ duration: 0.7 }}
              className="order-1 lg:order-2"
            >
              {/* Visual for Waitlist */}
              <div className="bg-white rounded-2xl shadow-xl border border-stone-200 p-6 max-w-sm mx-auto rotate-1 hover:-rotate-1 transition-transform duration-500">
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-stone-100">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span className="text-sm font-medium text-stone-900">Yin Yoga (Fullt)</span>
                  <span className="ml-auto text-xs bg-stone-100 px-2 py-0.5 rounded text-stone-500">Kø: 3</span>
                </div>

                {/* List Items */}
                <div className="space-y-2 opacity-50 grayscale">
                  <div className="flex items-center gap-3 p-2">
                    <div className="w-8 h-8 rounded-full bg-stone-200"></div>
                    <div className="h-2 w-24 bg-stone-200 rounded"></div>
                  </div>
                  <div className="flex items-center gap-3 p-2">
                    <div className="w-8 h-8 rounded-full bg-stone-200"></div>
                    <div className="h-2 w-24 bg-stone-200 rounded"></div>
                  </div>
                </div>

                {/* Highlighted Waitlist Action */}
                <div className="mt-4 p-3 bg-stone-50 rounded-xl border border-stone-200 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-stone-900"></div>
                  <div className="flex items-center gap-3 mb-2">
                    <MessageSquare className="w-4 h-4 text-stone-900" />
                    <span className="text-xs font-semibold text-stone-900">SMS sendt</span>
                  </div>
                  <p className="text-xs text-stone-500">"Hei Kari! Du har fått plass på Yin Yoga. Velkommen!"</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 max-w-5xl mx-auto px-6 border-t border-stone-200/50">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-stone-900 mb-4">Enkel pris</h2>
          <p className="text-stone-500 mb-3">Ingen binding. Ingen skjulte kostnader.</p>
          <p className="text-stone-400 text-sm">Bygget sammen med yogalærere.</p>
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch"
        >
          {/* Free/Trial */}
          <motion.div
            variants={fadeInUp}
            transition={{ duration: 0.6 }}
            className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col"
          >
            <div className="mb-6">
              <h3 className="text-lg font-medium text-stone-900">Hobby</h3>
              <p className="text-sm text-stone-500 mt-2">For deg som underviser litt ved siden av.</p>
            </div>
            <div className="mb-8">
              <span className="text-4xl font-semibold tracking-tight text-stone-900">0 kr</span>
              <span className="text-stone-500 text-sm">/ 14 dager</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-start gap-3 text-sm text-stone-600">
                <Check className="w-4 h-4 mt-0.5 text-stone-900" />
                Full tilgang
              </li>
              <li className="flex items-start gap-3 text-sm text-stone-600">
                <Check className="w-4 h-4 mt-0.5 text-stone-900" />
                Ubegrenset booking
              </li>
              <li className="flex items-start gap-3 text-sm text-stone-600">
                <Check className="w-4 h-4 mt-0.5 text-stone-900" />
                Ingen kortdetaljer
              </li>
            </ul>
            <Link to="/signup?type=teacher" className="block w-full py-3 px-6 text-center rounded-xl bg-stone-100 text-stone-900 font-medium hover:bg-stone-200 transition-colors mt-auto">Start nå</Link>
          </motion.div>

          {/* Pro */}
          <motion.div
            variants={fadeInUp}
            transition={{ duration: 0.6 }}
            className="bg-stone-900 p-8 rounded-3xl border border-stone-800 shadow-xl relative overflow-hidden text-white h-full flex flex-col"
          >
            <div className="absolute top-0 right-0 bg-gradient-to-bl from-stone-700/20 to-transparent w-32 h-32 rounded-bl-full"></div>
            <div className="mb-6 relative z-10">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                Studio
                <span className="bg-stone-800 text-stone-300 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-stone-700">Anbefalt</span>
              </h3>
              <p className="text-sm text-stone-400 mt-2">For deg som lever av dette.</p>
            </div>
            <div className="mb-8 relative z-10">
              <span className="text-4xl font-semibold tracking-tight text-white">499 kr</span>
              <span className="text-stone-400 text-sm">/ md</span>
            </div>
            <ul className="space-y-4 mb-8 relative z-10 flex-1">
              <li className="flex items-start gap-3 text-sm text-stone-300">
                <Check className="w-4 h-4 mt-0.5 text-stone-100" />
                Ubegrenset antall elever
              </li>
              <li className="flex items-start gap-3 text-sm text-stone-300">
                <Check className="w-4 h-4 mt-0.5 text-stone-100" />
                Regnskap på autopilot
              </li>
              <li className="flex items-start gap-3 text-sm text-stone-300">
                <Check className="w-4 h-4 mt-0.5 text-stone-100" />
                Din logo og farger
              </li>
              <li className="flex items-start gap-3 text-sm text-stone-300">
                <Check className="w-4 h-4 mt-0.5 text-stone-100" />
                SMS-varsling
              </li>
            </ul>
            <Link to="/signup?type=studio" className="block w-full py-3 px-6 text-center rounded-xl bg-white text-stone-900 font-medium hover:bg-stone-50 transition-colors relative z-10 mt-auto">Velg Studio</Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <motion.footer
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        variants={fadeIn}
        transition={{ duration: 0.6 }}
        className="bg-white border-t border-stone-200 pt-32 pb-10"
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-6 h-6 bg-stone-900 rounded-md flex items-center justify-center text-white">
                  <Infinity className="w-3.5 h-3.5" />
                </div>
                <span className="text-lg font-semibold tracking-tighter text-stone-900">Ease</span>
              </div>
              <p className="text-stone-500 text-sm leading-relaxed max-w-sm">
                Bygget i Oslo. Forenkler hverdagen for studioer i hele Norge.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-stone-900 mb-4">Produkt</h4>
              <ul className="space-y-3 text-sm text-stone-500">
                <li><a href="#features" className="hover:text-stone-900 transition-colors">Funksjoner</a></li>
                <li><a href="#pricing" className="hover:text-stone-900 transition-colors">Priser</a></li>
                <li><a href="#" className="hover:text-stone-900 transition-colors">Logg</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-stone-900 mb-4">Selskap</h4>
              <ul className="space-y-3 text-sm text-stone-500">
                <li><a href="#" className="hover:text-stone-900 transition-colors">Om oss</a></li>
                <li><a href="#" className="hover:text-stone-900 transition-colors">Kontakt</a></li>
                <li><a href="#" className="hover:text-stone-900 transition-colors">Vilkår</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-stone-100 pt-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-sm text-stone-400">© 2024 Ease AS.</p>

            <div className="flex items-center gap-6">
              <p className="text-sm font-medium text-stone-900">Klar?</p>
              <Link to="/teacher" className="text-sm font-medium bg-stone-900 text-white px-5 py-2.5 rounded-lg hover:bg-stone-800 transition-colors">
                Kom i gang
              </Link>
            </div>
          </div>
        </div>
      </motion.footer>
    </div>
  );
};

export default LandingPage;

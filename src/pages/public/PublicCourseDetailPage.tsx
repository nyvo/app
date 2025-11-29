import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Waves, 
  Coffee, 
  Dumbbell, 
  Info, 
  ChevronDown, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  ChevronLeft,
  ChevronRight,
  Flower2,
  Mail,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const PublicCourseDetailPage = () => {
  const [step, setStep] = useState(1);
  
  const handleNextStep = () => {
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevStep = () => {
    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <style>{`
        .bg-pattern-dot {
            background-image: radial-gradient(#D6D3D1 1px, transparent 1px);
            background-size: 20px 20px;
        }
        .input-focus {
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        /* Custom checkbox styling */
        .checkbox-wrapper:checked + div {
            background-color: #292524;
            border-color: #292524;
        }
        .checkbox-wrapper:checked + div svg {
            display: block;
        }
      `}</style>
      
      <div className="min-h-screen w-full bg-[#FDFBF7] text-[#44403C] selection:bg-[#354F41] selection:text-[#F5F5F4] overflow-x-hidden pb-32 lg:pb-0 font-geist">

        {/* Public Header */}
        <header className="fixed top-0 left-0 right-0 z-40 border-b border-[#E7E5E4]/80 bg-[#FDFBF7]/90 backdrop-blur-xl">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3 cursor-pointer">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm border border-[#E7E5E4] text-[#354F41]">
                        <Flower2 className="h-5 w-5" />
                    </div>
                    <span className="font-geist text-lg font-semibold text-[#292524] tracking-tight">ZenStudio</span>
                </div>
                
                {step === 1 ? (
                  <div className="flex items-center gap-4">
                      <a href="#" className="hidden text-sm font-medium text-[#78716C] hover:text-[#292524] transition-colors md:block">Logg inn</a>
                      <a href="#" className="rounded-full bg-[#292524] px-5 py-2 text-sm font-medium text-[#F5F5F4] shadow-lg shadow-[#292524]/10 ios-ease transition-all active:scale-[0.98] hover:scale-[1.02]">
                          Registrer deg
                      </a>
                  </div>
                ) : (
                  /* Simple Progress Indicator (Desktop) */
                  <div className="hidden md:flex items-center gap-2 text-sm font-medium">
                      <span className="text-[#A8A29E]">Kurs</span>
                      <ChevronRight className="h-4 w-4 text-[#E7E5E4]" />
                      <span className="text-[#292524]">Detaljer</span>
                      <ChevronRight className="h-4 w-4 text-[#E7E5E4]" />
                      <span className="text-[#A8A29E]">Betaling</span>
                  </div>
                )}
            </div>
        </header>

        {/* Main Content */}
        <main className="pt-24 px-4 sm:px-6">
            <div className="mx-auto max-w-5xl">
                
                {/* Breadcrumb / Back Navigation */}
                <div className="mb-6">
                    {step === 1 ? (
                      <Link to="/courses" className="inline-flex items-center gap-1 text-sm font-medium text-[#78716C] hover:text-[#292524] transition-colors group">
                          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                          Tilbake til timeplan
                      </Link>
                    ) : (
                      <button onClick={handlePrevStep} className="inline-flex items-center gap-1 text-sm font-medium text-[#78716C] hover:text-[#292524] transition-colors group">
                          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                          Tilbake til kursdetaljer
                      </button>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
                    
                    {/* Left Column with AnimatePresence */}
                    <div className="relative">
                      <AnimatePresence mode="wait">
                        {step === 1 ? (
                          /* STEP 1: COURSE DETAILS */
                          <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="space-y-8"
                          >
                              {/* Header Section */}
                              <div className="space-y-4">
                                  <div className="flex flex-wrap items-center gap-3">
                                      <span className="inline-flex items-center rounded-full bg-[#F5F5F4] px-2.5 py-0.5 text-xs font-medium text-[#57534E] border border-[#E7E5E4]">
                                          Vinyasa
                                      </span>
                                      <span className="inline-flex items-center rounded-full bg-[#F5F5F4] px-2.5 py-0.5 text-xs font-medium text-[#57534E] border border-[#E7E5E4]">
                                          Nivå 1-2
                                      </span>
                                  </div>
                                  <h1 className="font-geist text-3xl md:text-4xl font-semibold tracking-tight text-[#292524]">
                                      Morning Flow & Coffee
                                  </h1>
                                  
                                  {/* Metadata Row */}
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm text-[#78716C] border-b border-[#E7E5E4] pb-6">
                                      <div className="flex items-center gap-2">
                                          <Calendar className="h-4 w-4 text-[#A8A29E]" />
                                          <span>Lør, 24. Sep</span>
                                      </div>
                                      <div className="hidden sm:block h-3 w-px bg-[#E7E5E4]"></div>
                                      <div className="flex items-center gap-2">
                                          <Clock className="h-4 w-4 text-[#A8A29E]" />
                                          <span>09:00 - 10:15 (75 min)</span>
                                      </div>
                                      <div className="hidden sm:block h-3 w-px bg-[#E7E5E4]"></div>
                                      <div className="flex items-center gap-2">
                                          <MapPin className="h-4 w-4 text-[#A8A29E]" />
                                          <span>Majorstuen Studio</span>
                                      </div>
                                  </div>
                              </div>

                              {/* Hero Image */}
                              <div className="relative overflow-hidden rounded-3xl border border-[#E7E5E4] bg-[#F5F5F4] shadow-sm">
                                  <div className="aspect-[16/7] w-full bg-gradient-to-br from-[#E7E5E4] to-[#F5F5F4] relative">
                                      <img src="https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=2000&auto=format&fit=crop" alt="Yoga studio ambiance" className="absolute inset-0 h-full w-full object-cover opacity-90 mix-blend-multiply" />
                                  </div>
                              </div>

                              {/* Description Block */}
                              <div className="space-y-4">
                                  <h2 className="font-geist text-lg font-semibold text-[#292524]">Om timen</h2>
                                  <div className="prose prose-stone prose-sm max-w-none text-[#78716C] leading-relaxed">
                                      <p>
                                          Start helgen med en energigivende Vinyasa Flow som vekker kroppen og klargjør sinnet. Denne timen fokuserer på pust, bevegelse og balanse. Vi beveger oss gjennom dynamiske sekvenser før vi roer ned med dype strekk.
                                      </p>
                                      <p>
                                          Etter timen inviterer vi til en kopp nybrygget kaffe eller te i resepsjonen – en perfekt mulighet til å slå av en prat med andre deltakere eller bare nyte roen.
                                      </p>
                                  </div>
                                  
                                  <div className="flex flex-wrap gap-2 pt-2">
                                      <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#F5F5F4] px-3 py-1.5 text-xs text-[#57534E]">
                                          <Waves className="h-3.5 w-3.5" />
                                          Dusj tilgjengelig
                                      </div>
                                      <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#F5F5F4] px-3 py-1.5 text-xs text-[#57534E]">
                                          <Coffee className="h-3.5 w-3.5" />
                                          Kaffe inkludert
                                      </div>
                                      <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#F5F5F4] px-3 py-1.5 text-xs text-[#57534E]">
                                          <Dumbbell className="h-3.5 w-3.5" />
                                          Matte til utleie
                                      </div>
                                  </div>
                              </div>

                              {/* Teacher Section */}
                              <div className="rounded-2xl border border-[#E7E5E4] bg-white p-5 shadow-sm">
                                  <h3 className="mb-4 text-sm font-medium text-[#A8A29E] uppercase tracking-wider">Instruktør</h3>
                                  <div className="flex items-start gap-4">
                                      <img src="https://i.pravatar.cc/150?u=1" alt="Elena Fisher" className="h-14 w-14 rounded-full border border-[#F5F5F4] object-cover shadow-sm" />
                                      <div className="flex-1">
                                          <div className="flex items-center justify-between">
                                              <h4 className="font-geist text-base font-semibold text-[#292524]">Elena Fisher</h4>
                                              <a href="#" className="text-xs font-medium text-[#354F41] hover:underline">Se profil</a>
                                          </div>
                                          <p className="mt-1 text-sm text-[#78716C] leading-normal">
                                              Elena er kjent for sine kreative sekvenser og varme tilstedeværelse. Hun har undervist i over 5 år og spesialiserer seg på Vinyasa og Yin Yoga.
                                          </p>
                                      </div>
                                  </div>
                              </div>

                              {/* Location Block */}
                              <div>
                                  <h2 className="mb-3 font-geist text-lg font-semibold text-[#292524]">Sted & Oppmøte</h2>
                                  <div className="overflow-hidden rounded-2xl border border-[#E7E5E4] bg-white shadow-sm">
                                      <div className="flex flex-col md:flex-row">
                                          <div className="bg-pattern-dot flex h-32 w-full items-center justify-center bg-[#F7F5F2] md:h-auto md:w-32 shrink-0 border-b md:border-b-0 md:border-r border-[#E7E5E4]">
                                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#292524] text-white shadow-lg">
                                                  <MapPin className="h-5 w-5" />
                                              </div>
                                          </div>
                                          <div className="p-5">
                                              <h4 className="font-medium text-[#292524]">Majorstuen Studio</h4>
                                              <p className="text-sm text-[#78716C]">Kirkeveien 64, 0368 Oslo</p>
                                              <div className="mt-3 flex items-start gap-2 text-xs text-[#A8A29E]">
                                                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                                                  <p>Inngang fra bakgården. Døren åpner 15 minutter før timen starter.</p>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              </div>

                              {/* Policies (Removed) */}
                          </motion.div>
                        ) : (
                          /* STEP 2: GUEST DETAILS */
                          <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="space-y-8"
                          >
                              {/* Title Block */}
                              <div>
                                  <h1 className="font-geist text-3xl md:text-4xl font-semibold tracking-tight text-[#292524]">
                                      Deltakerinformasjon
                                  </h1>
                                  <p className="mt-2 text-[#78716C]">
                                      Vennligst fyll inn dine detaljer.
                                  </p>
                              </div>

                              {/* Attendee 1 (Main Contact) */}
                              <div className="rounded-2xl border border-[#E7E5E4] bg-white p-6 shadow-sm">
                                  <div className="mb-5 flex items-center justify-between border-b border-[#F5F5F4] pb-4">
                                      <h2 className="font-geist text-lg font-semibold text-[#292524]">Deltaker</h2>
                                  </div>

                                  <div className="space-y-5">
                                      {/* Name Fields */}
                                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                          <div className="space-y-1.5">
                                              <label className="text-xs font-medium text-[#57534E]">Fornavn</label>
                                              <input type="text" placeholder="Ola" className="input-focus block w-full rounded-lg border border-[#E7E5E4] bg-[#FDFBF7]/50 px-3 py-2.5 text-sm text-[#292524] placeholder:text-[#A8A29E] focus:border-[#A8A29E] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#E7E5E4]/50" />
                                          </div>
                                          <div className="space-y-1.5">
                                              <label className="text-xs font-medium text-[#57534E]">Etternavn</label>
                                              <input type="text" placeholder="Nordmann" className="input-focus block w-full rounded-lg border border-[#E7E5E4] bg-[#FDFBF7]/50 px-3 py-2.5 text-sm text-[#292524] placeholder:text-[#A8A29E] focus:border-[#A8A29E] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#E7E5E4]/50" />
                                          </div>
                                      </div>

                                      {/* Contact Fields */}
                                      <div className="space-y-1.5">
                                          <label className="text-xs font-medium text-[#57534E]">E-postadresse</label>
                                          <div className="relative">
                                              <Mail className="absolute left-3 top-3 h-4 w-4 text-[#A8A29E]" />
                                              <input type="email" placeholder="ola@eksempel.no" className="input-focus block w-full rounded-lg border border-[#E7E5E4] bg-[#FDFBF7]/50 pl-10 pr-3 py-2.5 text-sm text-[#292524] placeholder:text-[#A8A29E] focus:border-[#A8A29E] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#E7E5E4]/50" />
                                          </div>
                                          <p className="text-[11px] text-[#A8A29E]">Ordrebekreftelse sendes hit.</p>
                                      </div>

                                      <div className="space-y-1.5">
                                          <label className="text-xs font-medium text-[#57534E]">Telefonnummer <span className="text-[#A8A29E] font-normal">(Valgfritt)</span></label>
                                          <input type="tel" placeholder="+47 000 00 000" className="input-focus block w-full rounded-lg border border-[#E7E5E4] bg-[#FDFBF7]/50 px-3 py-2.5 text-sm text-[#292524] placeholder:text-[#A8A29E] focus:border-[#A8A29E] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#E7E5E4]/50" />
                                      </div>

                                      <div className="space-y-1.5">
                                          <label className="text-xs font-medium text-[#57534E]">Kommentar til instruktør <span className="text-[#A8A29E] font-normal">(Valgfritt)</span></label>
                                          <textarea 
                                            placeholder="Skriv en beskjed..." 
                                            rows={3}
                                            className="input-focus block w-full rounded-lg border border-[#E7E5E4] bg-[#FDFBF7]/50 px-3 py-2.5 text-sm text-[#292524] placeholder:text-[#A8A29E] focus:border-[#A8A29E] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#E7E5E4]/50 resize-none"
                                          />
                                      </div>
                                  </div>
                              </div>

                              {/* Terms Checkbox */}
                              <div className="flex items-start gap-3 px-1">
                                <label className="relative flex items-center justify-center cursor-pointer p-0.5">
                                    <input type="checkbox" required className="checkbox-wrapper peer sr-only" />
                                    <div className="h-4 w-4 rounded-[4px] border border-[#D6D3D1] bg-white transition-all peer-focus:ring-2 peer-focus:ring-[#E7E5E4] hover:border-[#A8A29E]">
                                        <Check className="hidden h-3 w-3 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={3} />
                                    </div>
                                </label>
                                <p className="text-xs text-[#78716C] leading-relaxed">
                                    Jeg godtar <a href="#" className="text-[#292524] underline underline-offset-2 hover:text-[#354F41]">vilkårene</a> for påmelding og bekrefter at jeg er i stand til å delta på timen. <span className="text-red-500">*</span>
                                </p>
                              </div>

                              {/* Desktop Actions */}
                              <div className="hidden lg:flex items-center justify-between pt-4">
                                  <button onClick={handlePrevStep} className="text-sm font-medium text-[#78716C] hover:text-[#292524]">Avbryt</button>
                                  <Button className="rounded-xl px-8 py-3" size="pill">
                                      <span className="relative z-10 flex items-center gap-2">
                                          Gå til betaling
                                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                      </span>
                                  </Button>
                              </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Right Column: Sticky Booking Action */}
                    <div className="relative hidden lg:block">
                        <div className="sticky top-28 space-y-4">
                            
                            {/* Main Booking Card */}
                            <div className="rounded-3xl border border-[#E7E5E4] bg-white p-6 shadow-xl shadow-[#292524]/5">
                                
                                {step === 1 ? (
                                  <>
                                    <div className="mb-6 flex items-start justify-between">
                                        <div>
                                            <div className="text-3xl font-semibold text-[#292524] tracking-tight">250 kr</div>
                                            <div className="text-xs text-[#A8A29E] mt-1">per person</div>
                                        </div>
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F0FDF4] px-2.5 py-1 text-xs font-medium text-[#166534]">
                                            <span className="relative flex h-2 w-2">
                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#166534]"></span>
                                            </span>
                                            15 plasser igjen
                                        </span>
                                    </div>

                                    <div className="mb-6 space-y-3 rounded-xl bg-[#FDFBF7] p-4 border border-[#E7E5E4]/50">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-[#78716C]">Dato</span>
                                            <span className="font-medium text-[#292524]">Lør, 24. Sep</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-[#78716C]">Tid</span>
                                            <span className="font-medium text-[#292524]">09:00 - 10:15</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-[#78716C]">Sted</span>
                                            <span className="font-medium text-[#292524]">Majorstuen</span>
                                        </div>
                                    </div>

                                    <Button 
                                        onClick={handleNextStep} 
                                        size="pill"
                                        className="w-full rounded-xl"
                                    >
                                        <span className="relative z-10 flex items-center justify-center gap-2">
                                            Påmelding
                                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                        </span>
                                    </Button>
                                    
                                    <p className="mt-4 text-center text-xs text-[#A8A29E]">
                                        <a href="#" className="underline underline-offset-2 hover:text-[#292524] transition-colors">Logg inn</a> eller <a href="#" className="underline underline-offset-2 hover:text-[#292524] transition-colors">registrer deg</a> for å lagre denne bestillingen i din kursoversikt
                                    </p>
                                  </>
                                ) : (
                                  /* Step 2 Summary */
                                  <>
                                    <h3 className="mb-4 font-geist text-lg font-semibold text-[#292524]">Sammendrag</h3>
                                    
                                    <div className="flex gap-4 border-b border-[#F5F5F4] pb-5">
                                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#F5F5F4]">
                                            <img src="https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=200&auto=format&fit=crop" className="h-full w-full object-cover mix-blend-multiply opacity-90" alt="Course thumbnail" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-[#292524] leading-tight">Morning Flow & Coffee</h4>
                                            <p className="mt-1 text-xs text-[#78716C]">Lør, 24. Sep Kl 09:00</p>
                                            <p className="text-xs text-[#78716C]">Majorstuen Studio</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 py-5">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-[#78716C]">Kursavgift</span>
                                            <span className="font-medium text-[#292524]">250 kr</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-[#78716C]">Servicegebyr</span>
                                            <span className="font-medium text-[#292524]">0 kr</span>
                                        </div>
                                    </div>

                                    <div className="border-t border-[#F5F5F4] pt-4">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-[#292524]">Totalt å betale</span>
                                            <span className="font-geist text-xl font-bold text-[#292524] tracking-tight">250 kr</span>
                                        </div>
                                        <p className="mt-1 text-right text-[11px] text-[#A8A29E]">Inkludert mva</p>
                                    </div>
                                  </>
                                )}
                            </div>

                            {/* Reservation Info */}
                            <div className="rounded-xl border border-[#E7E5E4] bg-[#FDFBF7] p-4 mb-4">
                                <div className="flex gap-3">
                                    <Clock className="h-5 w-5 shrink-0 text-[#354F41]" />
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-[#292524]">Vi reserverer plassen din</p>
                                        <p className="text-[11px] text-[#78716C] leading-relaxed">
                                            Fullfør bestillingen din innen <span className="font-medium text-[#292524]">10:00</span> minutter for å sikre plassen din.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Payment Info */}
                            <div className="rounded-xl border border-[#E7E5E4] bg-white p-4">
                                <div className="flex gap-3">
                                    <ShieldCheck className="h-5 w-5 shrink-0 text-[#354F41]" />
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-[#292524]">Sikker betaling</p>
                                        <p className="text-[11px] text-[#78716C] leading-relaxed">
                                            Vi støtter Visa, Mastercard og Vipps som betaling.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        {/* Mobile Sticky Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#E7E5E4] bg-white/80 backdrop-blur-xl lg:hidden">
            <div className="mx-auto flex max-w-lg items-center justify-between p-4">
                {step === 1 ? (
                  <>
                    <div className="flex flex-col">
                        <span className="text-xs text-[#78716C]">Total pris</span>
                        <span className="font-geist text-xl font-semibold text-[#292524]">250 kr</span>
                    </div>
                                    <Button onClick={handleNextStep} className="rounded-xl px-8 py-3 shadow-lg" size="pill">
                                        Book nå
                                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col">
                        <span className="text-xs text-[#78716C] flex items-center gap-1">
                            Total
                        </span>
                        <span className="font-geist text-xl font-semibold text-[#292524]">250 kr</span>
                    </div>
                    <Button className="rounded-xl px-6 py-3 shadow-lg flex items-center gap-2" size="pill">
                        Betaling
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
            </div>
        </div>
      </div>
    </>
  );
};

export default PublicCourseDetailPage;

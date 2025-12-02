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
  ArrowRight,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Leaf,
  Mail,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const PublicCourseDetailPage = () => {
  const [step, setStep] = useState(1);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    message: '',
    termsAccepted: false
  });
  
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const validateForm = () => {
    const newErrors: Record<string, boolean> = {};
    let isValid = true;

    if (!formData.firstName.trim()) {
      newErrors.firstName = true;
      isValid = false;
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = true;
      isValid = false;
    }
    if (!formData.email.trim()) {
      newErrors.email = true;
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
       // Basic email regex
       newErrors.email = true;
       isValid = false;
    }
    if (!formData.termsAccepted) {
      newErrors.termsAccepted = true;
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error when user starts typing/fixing
    if (errors[name]) {
        setErrors(prev => ({
            ...prev,
            [name]: false
        }));
    }
  };

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
        // Find first error and focus
        const firstErrorField = document.querySelector('[aria-invalid="true"]') as HTMLElement;
        if (firstErrorField) {
            firstErrorField.focus();
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    }
    
    // Handle successful submission (mock)
    console.log('Form submitted:', formData);
    // Navigate to success page or show confirmation
  };

  React.useEffect(() => {
    if (step === 2 && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, timeLeft]);
  
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
            background-image: radial-gradient(var(--color-ring) 1px, transparent 1px);
            background-size: 20px 20px;
        }
        .input-focus {
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        /* Custom checkbox styling */
        .checkbox-wrapper:checked + div {
            background-color: var(--color-text-primary);
            border-color: var(--color-text-primary);
        }
        .checkbox-wrapper:checked + div svg {
            display: block;
        }
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-4px); }
            75% { transform: translateX(4px); }
        }
        .animate-shake {
            animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
      
      <div className="min-h-screen w-full bg-surface text-sidebar-foreground selection:bg-primary selection:text-surface-elevated overflow-x-hidden pb-32 lg:pb-0 font-geist">

        {/* Public Header */}
        <header className="fixed top-0 left-0 right-0 z-40 border-b border-border/80 bg-surface/90 backdrop-blur-xl">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3 cursor-pointer">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm border border-border text-primary">
                        <Leaf className="h-5 w-5" />
                    </div>
                    <span className="font-geist text-lg font-semibold text-text-primary tracking-tight">Ease</span>
                </div>

                {step === 1 ? (
                  <div className="flex items-center gap-4">
                      <a href="#" className="hidden text-sm font-medium text-muted-foreground hover:text-text-primary transition-colors md:block">Logg inn</a>
                      <Button asChild size="compact">
                          <Link to="/student/register">Registrer deg</Link>
                      </Button>
                  </div>
                ) : (
                  /* Simple Progress Indicator (Desktop) */
                  <div className="hidden md:flex items-center gap-2 text-sm font-medium">
                      <span className="text-text-tertiary">Kurs</span>
                      <ChevronRight className="h-4 w-4 text-border" />
                      <span className="text-text-primary">Detaljer</span>
                      <ChevronRight className="h-4 w-4 text-border" />
                      <span className="text-text-tertiary">Betaling</span>
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
                      <Link to="/courses" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-text-primary transition-colors group">
                          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                          Tilbake til timeplan
                      </Link>
                    ) : (
                      <button onClick={handlePrevStep} className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-text-primary transition-colors group">
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
                                  <div className="flex flex-wrap items-center gap-2">
                                      <span className="inline-flex items-center rounded-full bg-surface-elevated px-2 py-0.5 text-xxs font-medium text-text-secondary border border-border">
                                          Vinyasa
                                      </span>
                                      <span className="inline-flex items-center rounded-full bg-surface-elevated px-2 py-0.5 text-xxs font-medium text-text-secondary border border-border">
                                          Nivå 1-2
                                      </span>
                                  </div>
                                  <h1 className="font-geist text-3xl md:text-4xl font-semibold tracking-tight text-text-primary">
                                      Morning Flow & Coffee
                                  </h1>

                                  {/* Metadata Row */}
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm text-muted-foreground border-b border-border pb-6">
                                      <div className="flex items-center gap-2">
                                          <Calendar className="h-4 w-4 text-text-tertiary" />
                                          <span>Lør, 24. Sep</span>
                                      </div>
                                      <div className="hidden sm:block h-3 w-px bg-border"></div>
                                      <div className="flex items-center gap-2">
                                          <Clock className="h-4 w-4 text-text-tertiary" />
                                          <span>09:00 - 10:15 (75 min)</span>
                                      </div>
                                      <div className="hidden sm:block h-3 w-px bg-border"></div>
                                      <div className="flex items-center gap-2">
                                          <MapPin className="h-4 w-4 text-text-tertiary" />
                                          <span>Majorstuen Studio</span>
                                      </div>
                                  </div>
                              </div>

                              {/* Hero Image */}
                              <div className="relative overflow-hidden rounded-3xl border border-border bg-surface-elevated shadow-sm">
                                  <div className="aspect-[16/7] w-full bg-gradient-to-br from-border to-surface-elevated relative">
                                      <img src="https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=2000&auto=format&fit=crop" alt="Yoga studio ambiance" className="absolute inset-0 h-full w-full object-cover opacity-90 mix-blend-multiply" />
                                  </div>
                              </div>

                              {/* Description Block */}
                              <div className="space-y-4">
                                  <h2 className="font-geist text-lg font-semibold text-text-primary">Om timen</h2>
                                  <div className="prose prose-stone prose-sm max-w-none text-muted-foreground leading-relaxed">
                                      <p>
                                          Start helgen med en energigivende Vinyasa Flow som vekker kroppen og klargjør sinnet. Denne timen fokuserer på pust, bevegelse og balanse. Vi beveger oss gjennom dynamiske sekvenser før vi roer ned med dype strekk.
                                      </p>
                                      <p>
                                          Etter timen inviterer vi til en kopp nybrygget kaffe eller te i resepsjonen – en perfekt mulighet til å slå av en prat med andre deltakere eller bare nyte roen.
                                      </p>
                                  </div>

                                  <div className="flex flex-wrap gap-2 pt-2">
                                      <div className="inline-flex items-center gap-1.5 rounded-lg bg-surface-elevated px-3 py-1.5 text-xs text-text-secondary">
                                          <Waves className="h-3.5 w-3.5" />
                                          Dusj tilgjengelig
                                      </div>
                                      <div className="inline-flex items-center gap-1.5 rounded-lg bg-surface-elevated px-3 py-1.5 text-xs text-text-secondary">
                                          <Coffee className="h-3.5 w-3.5" />
                                          Kaffe inkludert
                                      </div>
                                      <div className="inline-flex items-center gap-1.5 rounded-lg bg-surface-elevated px-3 py-1.5 text-xs text-text-secondary">
                                          <Dumbbell className="h-3.5 w-3.5" />
                                          Matte til utleie
                                      </div>
                                  </div>
                              </div>

                              {/* Teacher Section */}
                              <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                                  <h3 className="mb-4 text-xxs font-medium text-text-tertiary uppercase tracking-wider">Instruktør</h3>
                                  <div className="flex items-start gap-4">
                                      <img src="https://i.pravatar.cc/150?u=1" alt="Elena Fisher" className="h-14 w-14 rounded-full border border-surface-elevated object-cover shadow-sm" />
                                      <div className="flex-1">
                                          <div className="flex items-center justify-between">
                                              <h4 className="font-geist text-base font-semibold text-text-primary">Elena Fisher</h4>
                                              <a href="#" className="text-xs font-medium text-primary hover:underline">Se profil</a>
                                          </div>
                                          <p className="mt-1 text-sm text-muted-foreground leading-normal">
                                              Elena er kjent for sine kreative sekvenser og varme tilstedeværelse. Hun har undervist i over 5 år og spesialiserer seg på Vinyasa og Yin Yoga.
                                          </p>
                                      </div>
                                  </div>
                              </div>

                              {/* Location Block */}
                              <div className="mb-12">
                                  <h2 className="mb-3 font-geist text-lg font-semibold text-text-primary">Sted & Oppmøte</h2>
                                  <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
                                      <div className="flex flex-col md:flex-row">
                                          <div className="bg-pattern-dot flex h-32 w-full items-center justify-center bg-surface md:h-auto md:w-32 shrink-0 border-b md:border-b-0 md:border-r border-border">
                                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-text-primary text-white shadow-lg">
                                                  <MapPin className="h-5 w-5" />
                                              </div>
                                          </div>
                                          <div className="p-5">
                                              <h4 className="font-medium text-text-primary">Majorstuen Studio</h4>
                                              <p className="text-sm text-muted-foreground">Kirkeveien 64, 0368 Oslo</p>
                                              <div className="mt-3 flex items-start gap-2 text-xs text-text-tertiary">
                                                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                                                  <p>Inngang fra bakgården. Døren åpner 15 minutter før timen starter.</p>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              </div>
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
                              <form id="booking-form" onSubmit={handleSubmit} className="space-y-8" noValidate>
                                {/* Title Block */}
                                <div>
                                    <h1 className="font-geist text-3xl md:text-4xl font-semibold tracking-tight text-text-primary">
                                        Deltakerinformasjon
                                    </h1>
                                    <p className="mt-2 text-muted-foreground">
                                        Vennligst fyll inn dine detaljer. Felter merket med <span className="text-status-error-text">*</span> er påkrevde.
                                    </p>
                                </div>

                                {/* Attendee 1 (Main Contact) */}
                                <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
                                    <div className="mb-5 flex items-center justify-between border-b border-surface-elevated pb-4">
                                        <h2 className="font-geist text-lg font-semibold text-text-primary">Deltaker</h2>
                                    </div>

                                    <div className="space-y-5">
                                        {/* Name Fields */}
                                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                            <div>
                                                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                                                    Fornavn <span className="text-status-error-text">*</span>
                                                </label>
                                                <Input
                                                    type="text"
                                                    name="firstName"
                                                    value={formData.firstName}
                                                    onChange={handleInputChange}
                                                    placeholder="Ola"
                                                    aria-invalid={errors.firstName}
                                                    className={errors.firstName ? 'border-status-error-text bg-status-error-bg focus:border-status-error-text focus:ring-status-error-text/20 animate-shake' : ''}
                                                />
                                                {errors.firstName && (
                                                    <p className="text-xs text-status-error-text font-medium mt-1.5">Fornavn er påkrevd</p>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                                                    Etternavn <span className="text-status-error-text">*</span>
                                                </label>
                                                <Input
                                                    type="text"
                                                    name="lastName"
                                                    value={formData.lastName}
                                                    onChange={handleInputChange}
                                                    placeholder="Nordmann"
                                                    aria-invalid={errors.lastName}
                                                    className={errors.lastName ? 'border-status-error-text bg-status-error-bg focus:border-status-error-text focus:ring-status-error-text/20 animate-shake' : ''}
                                                />
                                                {errors.lastName && (
                                                    <p className="text-xs text-status-error-text font-medium mt-1.5">Etternavn er påkrevd</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Contact Fields */}
                                        <div>
                                            <label className="block text-xs font-medium text-text-secondary mb-1.5">
                                                E-postadresse <span className="text-status-error-text">*</span>
                                            </label>
                                            <div className="relative group">
                                                <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none ${errors.email ? 'text-status-error-text' : 'text-text-tertiary'}`} />
                                                <Input
                                                    type="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleInputChange}
                                                    placeholder="ola@eksempel.no"
                                                    aria-invalid={errors.email}
                                                    className={`pl-10 ${errors.email ? 'border-status-error-text bg-status-error-bg focus:border-status-error-text focus:ring-status-error-text/20 animate-shake' : ''}`}
                                                />
                                            </div>
                                            {errors.email ? (
                                                <p className="text-xs text-status-error-text font-medium mt-1.5">Gyldig e-postadresse er påkrevd</p>
                                            ) : (
                                                <p className="text-xs text-text-tertiary mt-1.5">Ordrebekreftelse sendes hit.</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-text-secondary mb-1.5">Telefonnummer <span className="text-text-tertiary">(Valgfritt)</span></label>
                                            <Input
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleInputChange}
                                                placeholder="+47 000 00 000"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-text-secondary mb-1.5">Kommentar til instruktør <span className="text-text-tertiary">(Valgfritt)</span></label>
                                            <textarea
                                                name="message"
                                                value={formData.message}
                                                onChange={handleInputChange}
                                                placeholder="Skriv en beskjed..."
                                                rows={3}
                                                className="block w-full rounded-xl border border-border bg-input-bg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-ring focus:bg-white focus:outline-none focus:ring-4 focus:ring-border/30 hover:border-ring ios-ease resize-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Terms Checkbox */}
                                <div className="flex items-start gap-3 px-1">
                                    <label className="relative flex items-center justify-center cursor-pointer p-0.5">
                                        <input
                                            type="checkbox"
                                            name="termsAccepted"
                                            checked={formData.termsAccepted}
                                            onChange={handleInputChange}
                                            required
                                            className="checkbox-wrapper peer sr-only"
                                        />
                                        <div className={`h-4 w-4 rounded-sm border bg-white transition-all peer-focus:ring-2 peer-focus:ring-border hover:border-text-tertiary ${errors.termsAccepted ? 'border-status-error-text ring-1 ring-status-error-text' : 'border-ring'}`}>
                                            <Check className="hidden h-3 w-3 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={3} />
                                        </div>
                                    </label>
                                    <div className="flex flex-col">
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            Jeg godtar våre <a href="#" className="text-text-primary underline underline-offset-2 hover:text-primary">vilkår for påmelding</a>. <span className="text-status-error-text">*</span>
                                        </p>
                                        {errors.termsAccepted && (
                                            <p className="text-xs text-status-error-text font-medium mt-1">Du må godta vilkårene</p>
                                        )}
                                    </div>
                                </div>
                              </form>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Right Column: Sticky Booking Action */}
                    <div className="relative hidden lg:block">
                        <div className="sticky top-28 space-y-4">

                            {/* Main Booking Card */}
                            <div className="rounded-3xl border border-border bg-white p-6 shadow-xl shadow-text-primary/5">

                                {step === 1 ? (
                                  <>
                                    <div className="mb-6 flex items-start justify-between">
                                        <div>
                                            <div className="text-3xl font-semibold text-text-primary tracking-tight">250 kr</div>
                                            <div className="text-xs text-text-tertiary mt-1">per person</div>
                                        </div>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-status-confirmed-bg px-2 py-0.5 text-xxs font-medium text-status-confirmed-text">
                                            <span className="relative flex h-1.5 w-1.5">
                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-confirmed-text opacity-75"></span>
                                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-status-confirmed-text"></span>
                                            </span>
                                            15 plasser igjen
                                        </span>
                                    </div>

                                    <div className="mb-6 space-y-3 rounded-xl bg-surface p-4 border border-border/50">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Dato</span>
                                            <span className="font-medium text-text-primary">Lør, 24. Sep</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Tid</span>
                                            <span className="font-medium text-text-primary">09:00 - 10:15</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Sted</span>
                                            <span className="font-medium text-text-primary">Majorstuen</span>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleNextStep}
                                        size="compact"
                                        className="w-full"
                                    >
                                        <span className="relative z-10 flex items-center justify-center gap-2">
                                            Påmelding
                                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                        </span>
                                    </Button>

                                    <p className="mt-4 text-center text-xs text-text-tertiary">
                                        <a href="#" className="underline underline-offset-2 hover:text-text-primary transition-colors">Logg inn</a> eller <a href="#" className="underline underline-offset-2 hover:text-text-primary transition-colors">registrer deg</a> for å lagre denne bestillingen i din kursoversikt
                                    </p>
                                  </>
                                ) : (
                                  /* Step 2 Summary */
                                  <>
                                    {/* Content without nested card wrapper */}
                                    <h3 className="mb-4 font-geist text-lg font-semibold text-text-primary">Sammendrag</h3>

                                    <div className="flex gap-4 border-b border-surface-elevated pb-5">
                                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-elevated">
                                            <img src="https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=200&auto=format&fit=crop" className="h-full w-full object-cover mix-blend-multiply opacity-90" alt="Course thumbnail" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-text-primary leading-tight">Morning Flow & Coffee</h4>
                                            <p className="mt-1 text-xs text-muted-foreground">Lør, 24. Sep Kl 09:00</p>
                                            <p className="text-xs text-muted-foreground">Majorstuen Studio</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 py-5">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Kursavgift</span>
                                            <span className="font-medium text-text-primary">250 kr</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Servicegebyr</span>
                                            <span className="font-medium text-text-primary">0 kr</span>
                                        </div>
                                    </div>

                                    <div className="border-t border-surface-elevated pt-4 pb-6">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-text-primary">Totalt å betale</span>
                                            <span className="font-geist text-xl font-bold text-text-primary tracking-tight">250 kr</span>
                                        </div>
                                    </div>

                                    {/* Unified Reservation & Payment Section */}
                                    <div className="rounded-xl bg-surface border border-border p-4">
                                        {/* Reservation Note */}
                                        <div className="flex gap-3 mb-4 border-b border-border/60 pb-4">
                                            <Clock className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-medium text-text-primary">Vi reserverer plassen din</p>
                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                    Fullfør innen <span className="font-medium text-text-primary">{formatTime(timeLeft)}</span> minutter.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Secure Payment */}
                                        <div>
                                            <div className="flex gap-3 mb-2">
                                                <ShieldCheck className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                                                <div className="space-y-0.5">
                                                    <p className="text-xs font-medium text-text-primary">Sikker betaling</p>
                                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                                        Vi aksepterer Vipps, Visa og Mastercard.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 pl-7 opacity-90">
                                                <img src="/badges/vipps.svg" alt="Vipps" className="h-5 w-auto" />
                                                <img src="/badges/visa.svg" alt="Visa" className="h-3 w-auto" />
                                                <img src="/badges/mastercard.svg" alt="Mastercard" className="h-5 w-auto" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Final Action Button */}
                                    <div className="mt-6">
                                        <Button
                                            size="compact"
                                            type="submit"
                                            form="booking-form"
                                            className="w-full shadow-lg hover:shadow-xl transition-all"
                                        >
                                            <span className="relative z-10 flex items-center justify-center gap-2">
                                                Gå til betaling
                                                <ArrowRight className="h-4 w-4" />
                                            </span>
                                        </Button>
                                    </div>
                                  </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        {/* Mobile Sticky Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-white/80 backdrop-blur-xl lg:hidden">
            <div className="mx-auto flex max-w-lg items-center justify-between p-4">
                {step === 1 ? (
                  <>
                    <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Total pris</span>
                        <span className="font-geist text-xl font-semibold text-text-primary">250 kr</span>
                    </div>
                                    <Button onClick={handleNextStep} className="shadow-lg" size="compact">
                                        Book nå
                                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            Total
                        </span>
                        <span className="font-geist text-xl font-semibold text-text-primary">250 kr</span>
                    </div>
                    <Button
                        className="shadow-lg flex items-center gap-2"
                        size="compact"
                        type="submit"
                        form="booking-form"
                    >
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

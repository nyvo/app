import React from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  Calendar,
  SlidersHorizontal,
  MapPin,
  Flame,
  CalendarRange,
  Leaf,
  ArrowRight,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const PublicCoursesPage = () => {
  return (
    <>
      <style>{`
        @keyframes slideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down {
            animation: slideDown 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        /* Hide scrollbar utility for horizontal scroll */
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>
      
      <div className="min-h-screen w-full bg-surface text-sidebar-foreground selection:bg-primary selection:text-surface-elevated overflow-x-hidden font-geist">
        {/* Public Header */}
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/80 bg-surface/90 backdrop-blur-xl">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3 cursor-pointer">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm border border-border text-primary">
                        {/* Using Flower2 as substitute for lotus */}
                        <Leaf className="h-5 w-5" />
                    </div>
                    <span className="font-geist text-lg font-semibold text-text-primary tracking-tight">Ease</span>
                </div>

                    <div className="flex items-center gap-4">
                        <Link to="/student/login" className="hidden text-sm font-medium text-muted-foreground hover:text-text-primary transition-colors md:block">Logg inn</Link>
                        <Button asChild size="compact">
                            <Link to="/student/register">Registrer deg</Link>
                        </Button>
                    </div>
            </div>
        </header>

        {/* Main Content */}
        <main className="pt-28 pb-24 px-4 sm:px-6">
            <div className="mx-auto max-w-3xl">
                
                {/* Hero / Studio Info */}
                <div className="mb-10 text-center md:text-left md:flex md:items-end md:justify-between">
                    <div>
                        <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                                <span className="relative flex h-1.5 w-1.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                </span>
                                Åpent for booking
                            </span>
                        </div>
                        <h1 className="font-geist text-3xl md:text-4xl font-semibold tracking-tight text-text-primary mb-2">
                            Kommende Kurs
                        </h1>
                        <p className="text-muted-foreground md:text-lg">Finn roen med våre høstkurs. Drop-in og semesterkort tilgjengelig.</p>
                    </div>

                    {/* Simple Avatar Stack for Social Proof (Optional touch) - REMOVED */}
                </div>

                {/* Login Reminder / Soft Notification */}
                <div className="animate-slide-down mb-8 relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-surface via-surface to-surface-elevated p-5 shadow-sm">
                    {/* Subtle Grain */}
                    <div className="absolute inset-0 bg-grain opacity-[0.02] pointer-events-none"></div>

                    <div className="relative flex items-start gap-4 z-10">
                        <div className="flex-1 space-y-1">
                            <h3 className="font-geist text-base font-semibold text-text-primary">
                                Logg inn for en enklere booking
                            </h3>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                                Har du allerede en konto? <Link to="/student/login" className="font-medium text-primary hover:text-primary-darker hover:underline decoration-primary/30 underline-offset-2 transition-colors">Logg inn</Link>. Ny her? <Link to="/student/register" className="font-medium text-primary hover:text-primary-darker hover:underline decoration-primary/30 underline-offset-2 transition-colors">Registrer deg gratis</Link> for å holde oversikt over kursene dine.
                            </p>
                        </div>

                        <button className="shrink-0 text-text-tertiary hover:text-text-primary transition-colors pt-0.5">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="sticky top-20 z-40 mb-6 flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 bg-surface/95 backdrop-blur-sm py-2 -mx-2 px-2 md:mx-0 md:px-0 scrollbar-hide">
                    <Button size="compact" className="shrink-0">
                        Alle kurs
                    </Button>
                    <Button variant="outline-soft" size="compact" className="shrink-0">
                        Vinyasa
                    </Button>
                    <Button variant="outline-soft" size="compact" className="shrink-0">
                        Yin Yoga
                    </Button>
                    <Button variant="outline-soft" size="compact" className="shrink-0">
                        <Calendar className="h-4 w-4" />
                        Dato
                    </Button>
                    <Button variant="ghost" size="compact" className="ml-auto shrink-0">
                        <SlidersHorizontal className="h-4 w-4" />
                        <span className="hidden sm:inline">Flere filtre</span>
                    </Button>
                </div>

                {/* Course List Stack */}
                <div className="space-y-4">

                    {/* Item 1: High Availability, Featured */}
                    <div className="group relative flex flex-col gap-5 rounded-3xl border border-border bg-white p-5 shadow-sm transition-all hover:border-text-tertiary hover:shadow-md md:flex-row md:items-center md:justify-between">
                        {/* Calendar Box */}
                        <div className="hidden md:flex flex-col items-center justify-center w-16 h-16 bg-surface-elevated rounded-xl border border-border shrink-0">
                            <span className="text-xxs font-semibold text-muted-foreground uppercase tracking-wide">Sep</span>
                            <span className="text-xl font-bold text-text-primary leading-none mt-0.5">24</span>
                        </div>

                        {/* Left: Main Info */}
                        <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between md:justify-start md:gap-4">
                                <h3 className="font-geist text-lg font-semibold text-text-primary group-hover:text-primary transition-colors">
                                    Morning Flow & Coffee
                                </h3>
                                <span className="inline-flex items-center rounded-full bg-status-confirmed-bg px-2.5 py-0.5 text-xs font-medium text-status-confirmed-text md:hidden">
                                    Ledig
                                </span>
                            </div>

                            {/* Price & Status Desktop Block */}
                            <div className="flex items-baseline gap-2 md:hidden">
                                <span className="text-xl font-semibold text-text-primary">250 kr</span>
                            </div>

                            {/* Metadata Row */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="h-4 w-4 text-text-tertiary" />
                                    Majorstuen Studio
                                </div>
                                <div className="hidden h-3 w-px bg-border md:block"></div>
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4 text-text-tertiary md:hidden" />
                                    <span className="md:hidden">Lør, 24. Sep </span>
                                    <span className="hidden md:inline">Lørdag </span>
                                    Kl 09:00
                                </div>
                            </div>
                        </div>

                        {/* Right: Actions & Desktop Status */}
                        <div className="flex flex-row items-center justify-between gap-4 border-t border-surface-elevated pt-4 md:flex-col md:items-end md:justify-center md:border-none md:pt-0">
                            <div className="hidden text-right md:block">
                                <div className="text-xl font-semibold text-text-primary">250 kr</div>
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-status-confirmed-text">
                                    <span className="h-1.5 w-1.5 rounded-full bg-status-confirmed-text"></span>
                                    15 plasser igjen
                                </span>
                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <Button
                                    asChild
                                    className="w-full md:w-auto"
                                    size="compact"
                                >
                                    <Link to="/courses/detail">
                                        Påmelding
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Item 2: Few Spots Left (Urgency) */}
                    <div className="group relative flex flex-col gap-5 rounded-3xl border border-border bg-white p-5 shadow-sm transition-all hover:border-text-tertiary hover:shadow-md md:flex-row md:items-center md:justify-between">
                        {/* Calendar Box */}
                        <div className="hidden md:flex flex-col items-center justify-center w-16 h-16 bg-surface-elevated rounded-xl border border-border shrink-0">
                            <span className="text-xxs font-semibold text-muted-foreground uppercase tracking-wide">Sep</span>
                            <span className="text-xl font-bold text-text-primary leading-none mt-0.5">25</span>
                        </div>

                        <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between md:justify-start md:gap-4">
                                <h3 className="font-geist text-lg font-semibold text-text-primary group-hover:text-primary transition-colors">
                                    Yin Yoga - Deep Stretch
                                </h3>
                                <span className="inline-flex items-center rounded-full bg-status-waitlist-bg px-2.5 py-0.5 text-xs font-medium text-status-waitlist-text md:hidden">
                                    Få plasser
                                </span>
                            </div>

                            <div className="flex items-baseline gap-2 md:hidden">
                                <span className="text-xl font-semibold text-text-primary">300 kr</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="h-4 w-4 text-text-tertiary" />
                                    Grünerløkka
                                </div>
                                <div className="hidden h-3 w-px bg-border md:block"></div>
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4 text-text-tertiary md:hidden" />
                                    <span className="md:hidden">Søn, 25. Sep </span>
                                    <span className="hidden md:inline">Søndag </span>
                                    Kl 18:00
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-row items-center justify-between gap-4 border-t border-surface-elevated pt-4 md:flex-col md:items-end md:justify-center md:border-none md:pt-0">
                            <div className="hidden text-right md:block">
                                <div className="text-xl font-semibold text-text-primary">300 kr</div>
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-status-waitlist-text">
                                    <Flame className="h-3 w-3 fill-current" />
                                    2 plasser igjen
                                </span>
                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <Button
                                    asChild
                                    className="w-full md:w-auto"
                                    size="compact"
                                >
                                    <Link to="/courses/detail">
                                        Påmelding
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Item 3: Full (Disabled/Waitlist) */}
                    <div className="group relative flex flex-col gap-5 rounded-3xl border border-border bg-sidebar/50 p-5 opacity-90 transition-all md:flex-row md:items-center md:justify-between">
                        {/* Calendar Box */}
                        <div className="hidden md:flex flex-col items-center justify-center w-16 h-16 bg-surface-elevated/50 rounded-xl border border-border shrink-0">
                            <span className="text-xxs font-semibold text-text-tertiary uppercase tracking-wide">Sep</span>
                            <span className="text-xl font-bold text-text-tertiary leading-none mt-0.5">27</span>
                        </div>

                        <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between md:justify-start md:gap-4">
                                <h3 className="font-geist text-lg font-medium text-muted-foreground line-through decoration-text-tertiary">
                                    Power Vinyasa Level 2
                                </h3>
                                <span className="inline-flex items-center rounded-full bg-border px-2.5 py-0.5 text-xs font-medium text-text-secondary md:hidden">
                                    Fullt kurs
                                </span>
                            </div>

                            <div className="flex items-baseline gap-2 md:hidden">
                                <span className="text-xl font-medium text-text-tertiary">250 kr</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-tertiary">
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="h-4 w-4" />
                                    Majorstuen Studio
                                </div>
                                <div className="hidden h-3 w-px bg-border md:block"></div>
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4" />
                                    <span className="md:hidden">Tir, 27. Sep </span>
                                    <span className="hidden md:inline">Tirsdag </span>
                                    Kl 17:30
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-row items-center justify-between gap-4 border-t border-border pt-4 md:flex-col md:items-end md:justify-center md:border-none md:pt-0">
                            <div className="hidden text-right md:block">
                                <div className="text-xl font-medium text-text-tertiary">250 kr</div>
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                                    Fullt kurs
                                </span>
                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <Button
                                    disabled
                                    variant="outline-soft"
                                    size="compact"
                                    className="w-full md:w-auto"
                                >
                                    Sett på venteliste
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Item 4: Course Series (Different Layout Variation) */}
                    <div className="group relative flex flex-col gap-5 rounded-3xl border border-border bg-white p-5 shadow-sm transition-all hover:border-text-tertiary hover:shadow-md md:flex-row md:items-center md:justify-between">
                        {/* Calendar Box */}
                        <div className="hidden md:flex flex-col items-center justify-center w-16 h-16 bg-surface-elevated rounded-xl border border-border shrink-0">
                            <span className="text-xxs font-semibold text-muted-foreground uppercase tracking-wide">Okt</span>
                            <span className="text-xl font-bold text-text-primary leading-none mt-0.5">01</span>
                        </div>

                        <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                                 <h3 className="font-geist text-lg font-semibold text-text-primary group-hover:text-primary transition-colors">
                                    Nybegynnerkurs: 8 Uker
                                </h3>
                                <span className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-primary/30 px-2.5 py-1 text-xs font-medium text-primary">
                                    <Layers className="h-3 w-3" />
                                    Kursrekke
                                </span>
                            </div>

                            <span className="inline-flex items-center rounded-full bg-status-confirmed-bg px-2.5 py-0.5 text-xs font-medium text-status-confirmed-text md:hidden">
                                Ledig
                            </span>

                            <div className="flex items-baseline gap-2 md:hidden">
                                <span className="text-xl font-semibold text-text-primary">2400 kr</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="h-4 w-4 text-text-tertiary" />
                                    Majorstuen Studio
                                </div>
                                <div className="hidden h-3 w-px bg-border md:block"></div>
                                <div className="flex items-center gap-1.5">
                                    <CalendarRange className="h-4 w-4 text-text-tertiary md:hidden" />
                                    <span className="md:hidden">Oppstart 1. Okt </span>
                                    Torsdager
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-row items-center justify-between gap-4 border-t border-surface-elevated pt-4 md:flex-col md:items-end md:justify-center md:border-none md:pt-0">
                            <div className="hidden text-right md:block">
                                <div className="text-xl font-semibold text-text-primary">2400 kr</div>
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-status-confirmed-text">
                                    <span className="h-1.5 w-1.5 rounded-full bg-status-confirmed-text"></span>
                                    15 plasser igjen
                                </span>
                            </div>

                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <Button
                                    asChild
                                    className="w-full md:w-auto"
                                    size="compact"
                                >
                                    <Link to="/courses/detail">
                                        Påmelding
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>

                </div>
                
            </div>
        </main>
      </div>
    </>
  );
};

export default PublicCoursesPage;

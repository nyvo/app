import React from 'react';
import { Link } from 'react-router-dom';
import { 
  UserCheck, 
  X, 
  Calendar, 
  SlidersHorizontal, 
  MapPin, 
  User, 
  Flame, 
  CalendarRange,
  Flower2, // Using Flower2 as a substitute for the lotus icon
  ArrowRight
} from 'lucide-react';

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
      
      <div className="min-h-screen w-full bg-[#FDFBF7] text-[#44403C] selection:bg-[#354F41] selection:text-[#F5F5F4] overflow-x-hidden font-geist">
        {/* Public Header */}
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-[#E7E5E4]/80 bg-[#FDFBF7]/90 backdrop-blur-xl">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3 cursor-pointer">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm border border-[#E7E5E4] text-[#354F41]">
                        {/* Using Flower2 as substitute for lotus */}
                        <Flower2 className="h-5 w-5" />
                    </div>
                    <span className="font-geist text-lg font-semibold text-[#292524] tracking-tight">ZenStudio</span>
                </div>
                
                <div className="flex items-center gap-4">
                    <a href="#" className="hidden text-sm font-medium text-[#78716C] hover:text-[#292524] transition-colors md:block">Logg inn</a>
                    <a href="#" className="rounded-full bg-[#292524] px-5 py-2 text-sm font-medium text-[#F5F5F4] shadow-lg shadow-[#292524]/10 hover:bg-[#44403C] hover:scale-[1.02] active:scale-[0.98] ios-ease transition-all">
                        Registrer deg
                    </a>
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
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E7E5E4] bg-white px-2.5 py-0.5 text-xs font-medium text-[#78716C]">
                                <span className="relative flex h-1.5 w-1.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                </span>
                                Booking åpen
                            </span>
                        </div>
                        <h1 className="font-geist text-3xl md:text-4xl font-semibold tracking-tight text-[#292524] mb-2">
                            Kommende Kurs
                        </h1>
                        <p className="text-[#78716C] md:text-lg">Finn roen med våre høstkurs. Drop-in og semesterkort tilgjengelig.</p>
                    </div>
                    
                    {/* Simple Avatar Stack for Social Proof (Optional touch) - REMOVED */}
                </div>

                {/* Guest Checkout Banner */}
                <div className="animate-slide-down mb-8 flex items-start gap-4 rounded-2xl border border-[#E7E5E4] bg-white p-5 shadow-sm">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F7F5F2] text-[#354F41]">
                        <UserCheck className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-medium text-[#292524]">Bestill raskt som gjest</h3>
                        <p className="text-sm text-[#78716C] mt-1 leading-relaxed">
                            Du trenger ikke en konto for å booke timer. <a href="#" className="text-[#354F41] underline underline-offset-2 hover:text-[#2A3F34]">Opprett konto frivillig</a> senere for å se historikk.
                        </p>
                    </div>
                    <button className="text-[#A8A29E] hover:text-[#292524] transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Filters */}
                <div className="sticky top-20 z-40 mb-6 flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 bg-[#FDFBF7]/95 backdrop-blur-sm py-2 -mx-2 px-2 md:mx-0 md:px-0 scrollbar-hide">
                    <button className="flex shrink-0 items-center gap-2 rounded-xl bg-[#292524] px-4 py-2 text-sm font-medium text-white shadow-md transition-transform active:scale-95">
                        Alle kurs
                    </button>
                    <button className="flex shrink-0 items-center gap-2 rounded-xl border border-[#E7E5E4] bg-white px-4 py-2 text-sm font-medium text-[#78716C] hover:border-[#D6D3D1] hover:text-[#292524] transition-colors active:scale-95">
                        Vinyasa
                    </button>
                    <button className="flex shrink-0 items-center gap-2 rounded-xl border border-[#E7E5E4] bg-white px-4 py-2 text-sm font-medium text-[#78716C] hover:border-[#D6D3D1] hover:text-[#292524] transition-colors active:scale-95">
                        Yin Yoga
                    </button>
                    <button className="flex shrink-0 items-center gap-2 rounded-xl border border-[#E7E5E4] bg-white px-4 py-2 text-sm font-medium text-[#78716C] hover:border-[#D6D3D1] hover:text-[#292524] transition-colors active:scale-95">
                        <Calendar className="h-4 w-4" />
                        Dato
                    </button>
                    <button className="ml-auto flex shrink-0 items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-[#78716C] hover:text-[#292524]">
                        <SlidersHorizontal className="h-4 w-4" />
                        <span className="hidden sm:inline">Flere filtre</span>
                    </button>
                </div>

                {/* Course List Stack */}
                <div className="space-y-4">

                    {/* Item 1: High Availability, Featured */}
                    <div className="group relative flex flex-col gap-5 rounded-3xl border border-[#E7E5E4] bg-white p-5 shadow-sm transition-all hover:border-[#A8A29E] hover:shadow-md md:flex-row md:items-center md:justify-between">
                        {/* Calendar Box */}
                        <div className="hidden md:flex flex-col items-center justify-center w-16 h-16 bg-[#F5F5F4] rounded-xl border border-[#E7E5E4] shrink-0">
                            <span className="text-[10px] font-semibold text-[#78716C] uppercase tracking-wide">Sep</span>
                            <span className="text-xl font-bold text-[#292524] leading-none mt-0.5">24</span>
                        </div>
                        
                        {/* Left: Main Info */}
                        <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between md:justify-start md:gap-4">
                                <h3 className="font-geist text-lg font-semibold text-[#292524] group-hover:text-[#354F41] transition-colors">
                                    Morning Flow & Coffee
                                </h3>
                                <span className="inline-flex items-center rounded-full bg-[#F0FDF4] px-2.5 py-0.5 text-xs font-medium text-[#166534] md:hidden">
                                    Ledig
                                </span>
                            </div>
                            
                            {/* Price & Status Desktop Block */}
                            <div className="flex items-baseline gap-2 md:hidden">
                                <span className="text-xl font-semibold text-[#292524]">250 kr</span>
                            </div>

                            {/* Metadata Row */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#78716C]">
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="h-4 w-4 text-[#A8A29E]" />
                                    Majorstuen Studio
                                </div>
                                <div className="hidden h-1 w-1 rounded-full bg-[#D6D3D1] md:block"></div>
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4 text-[#A8A29E] md:hidden" />
                                    <span className="md:hidden">Lør, 24. Sep </span>
                                    <span className="hidden md:inline">Lørdag </span>
                                    Kl 09:00
                                </div>
                            </div>
                        </div>

                        {/* Right: Actions & Desktop Status */}
                        <div className="flex flex-row items-center justify-between gap-4 border-t border-[#F5F5F4] pt-4 md:flex-col md:items-end md:justify-center md:border-none md:pt-0">
                            <div className="hidden text-right md:block">
                                <div className="text-xl font-semibold text-[#292524]">250 kr</div>
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-[#166534]">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#166534]"></span>
                                    15 plasser igjen
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <Link to="/courses/detail" className="flex-1 whitespace-nowrap rounded-xl bg-[#292524] px-6 py-2.5 text-sm font-medium text-[#F5F5F4] shadow-sm hover:bg-[#354F41] hover:scale-[1.02] active:scale-[0.98] ios-ease transition-all md:flex-none text-center">
                                    Påmelding
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Item 2: Few Spots Left (Urgency) */}
                    <div className="group relative flex flex-col gap-5 rounded-3xl border border-[#E7E5E4] bg-white p-5 shadow-sm transition-all hover:border-[#A8A29E] hover:shadow-md md:flex-row md:items-center md:justify-between">
                        {/* Calendar Box */}
                        <div className="hidden md:flex flex-col items-center justify-center w-16 h-16 bg-[#F5F5F4] rounded-xl border border-[#E7E5E4] shrink-0">
                            <span className="text-[10px] font-semibold text-[#78716C] uppercase tracking-wide">Sep</span>
                            <span className="text-xl font-bold text-[#292524] leading-none mt-0.5">25</span>
                        </div>

                        <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between md:justify-start md:gap-4">
                                <h3 className="font-geist text-lg font-semibold text-[#292524] group-hover:text-[#354F41] transition-colors">
                                    Yin Yoga - Deep Stretch
                                </h3>
                                <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 md:hidden">
                                    Få plasser
                                </span>
                            </div>
                            
                            <div className="flex items-baseline gap-2 md:hidden">
                                <span className="text-xl font-semibold text-[#292524]">300 kr</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#78716C]">
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="h-4 w-4 text-[#A8A29E]" />
                                    Grünerløkka
                                </div>
                                <div className="hidden h-1 w-1 rounded-full bg-[#D6D3D1] md:block"></div>
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4 text-[#A8A29E] md:hidden" />
                                    <span className="md:hidden">Søn, 25. Sep </span>
                                    <span className="hidden md:inline">Søndag </span>
                                    Kl 18:00
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-row items-center justify-between gap-4 border-t border-[#F5F5F4] pt-4 md:flex-col md:items-end md:justify-center md:border-none md:pt-0">
                            <div className="hidden text-right md:block">
                                <div className="text-xl font-semibold text-[#292524]">300 kr</div>
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                                    <Flame className="h-3 w-3 fill-current" />
                                    2 plasser igjen
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <Link to="/courses/detail" className="flex-1 whitespace-nowrap rounded-xl bg-[#292524] px-6 py-2.5 text-sm font-medium text-[#F5F5F4] shadow-sm hover:bg-[#354F41] hover:scale-[1.02] active:scale-[0.98] ios-ease transition-all md:flex-none text-center">
                                    Påmelding
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Item 3: Full (Disabled/Waitlist) */}
                    <div className="group relative flex flex-col gap-5 rounded-3xl border border-[#E7E5E4] bg-[#F7F5F2]/50 p-5 opacity-90 transition-all md:flex-row md:items-center md:justify-between">
                        {/* Calendar Box */}
                        <div className="hidden md:flex flex-col items-center justify-center w-16 h-16 bg-[#F5F5F4]/50 rounded-xl border border-[#E7E5E4] shrink-0">
                            <span className="text-[10px] font-semibold text-[#A8A29E] uppercase tracking-wide">Sep</span>
                            <span className="text-xl font-bold text-[#A8A29E] leading-none mt-0.5">27</span>
                        </div>

                        <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between md:justify-start md:gap-4">
                                <h3 className="font-geist text-lg font-medium text-[#78716C] line-through decoration-[#A8A29E]">
                                    Power Vinyasa Level 2
                                </h3>
                                <span className="inline-flex items-center rounded-full bg-[#E7E5E4] px-2.5 py-0.5 text-xs font-medium text-[#57534E] md:hidden">
                                    Fullt kurs
                                </span>
                            </div>
                            
                            <div className="flex items-baseline gap-2 md:hidden">
                                <span className="text-xl font-medium text-[#A8A29E]">250 kr</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#A8A29E]">
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="h-4 w-4" />
                                    Majorstuen Studio
                                </div>
                                <div className="hidden h-1 w-1 rounded-full bg-[#D6D3D1] md:block"></div>
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="h-4 w-4" />
                                    <span className="md:hidden">Tir, 27. Sep </span>
                                    <span className="hidden md:inline">Tirsdag </span>
                                    Kl 17:30
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-row items-center justify-between gap-4 border-t border-[#E7E5E4] pt-4 md:flex-col md:items-end md:justify-center md:border-none md:pt-0">
                            <div className="hidden text-right md:block">
                                <div className="text-xl font-medium text-[#A8A29E]">250 kr</div>
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-[#78716C]">
                                    Fullt kurs
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <button disabled className="flex-1 cursor-not-allowed rounded-xl border border-[#E7E5E4] bg-transparent px-6 py-2.5 text-sm font-medium text-[#A8A29E] md:flex-none">
                                    Sett på venteliste
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Item 4: Course Series (Different Layout Variation) */}
                    <div className="group relative flex flex-col gap-5 rounded-3xl border border-[#E7E5E4] bg-white p-5 shadow-sm transition-all hover:border-[#A8A29E] hover:shadow-md md:flex-row md:items-center md:justify-between">
                        {/* Calendar Box */}
                        <div className="hidden md:flex flex-col items-center justify-center w-16 h-16 bg-[#F5F5F4] rounded-xl border border-[#E7E5E4] shrink-0">
                            <span className="text-[10px] font-semibold text-[#78716C] uppercase tracking-wide">Okt</span>
                            <span className="text-xl font-bold text-[#292524] leading-none mt-0.5">01</span>
                        </div>

                        <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                                 <h3 className="font-geist text-lg font-semibold text-[#292524] group-hover:text-[#354F41] transition-colors">
                                    Nybegynnerkurs: 8 Uker
                                </h3>
                                <span className="hidden md:inline-flex items-center rounded-md bg-[#F5F5F4] px-2 py-0.5 text-[10px] uppercase font-bold tracking-wide text-[#57534E]">
                                    Kursrekke
                                </span>
                            </div>
                           
                            <span className="inline-flex items-center rounded-full bg-[#F0FDF4] px-2.5 py-0.5 text-xs font-medium text-[#166534] md:hidden">
                                Ledig
                            </span>
                            
                            <div className="flex items-baseline gap-2 md:hidden">
                                <span className="text-xl font-semibold text-[#292524]">2400 kr</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#78716C]">
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="h-4 w-4 text-[#A8A29E]" />
                                    Majorstuen Studio
                                </div>
                                <div className="hidden h-1 w-1 rounded-full bg-[#D6D3D1] md:block"></div>
                                <div className="flex items-center gap-1.5">
                                    <CalendarRange className="h-4 w-4 text-[#A8A29E] md:hidden" />
                                    <span className="md:hidden">Oppstart 1. Okt </span>
                                    Torsdager
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-row items-center justify-between gap-4 border-t border-[#F5F5F4] pt-4 md:flex-col md:items-end md:justify-center md:border-none md:pt-0">
                            <div className="hidden text-right md:block">
                                <div className="text-xl font-semibold text-[#292524]">2400 kr</div>
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-[#166534]">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#166534]"></span>
                                    15 plasser igjen
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <Link to="/courses/detail" className="flex-1 whitespace-nowrap rounded-xl bg-[#292524] px-6 py-2.5 text-sm font-medium text-[#F5F5F4] shadow-sm hover:bg-[#354F41] hover:scale-[1.02] active:scale-[0.98] ios-ease transition-all md:flex-none text-center">
                                    Påmelding
                                </Link>
                            </div>
                        </div>
                    </div>

                </div>
                
                {/* Footer Text */}
                <div className="mt-12 text-center">
                    <p className="text-sm text-[#A8A29E]">
                        Leter du etter noe annet? <a href="#" className="text-[#354F41] underline underline-offset-2">Se hele timeplanen</a> eller <a href="#" className="text-[#354F41] underline underline-offset-2">kontakt oss</a>.
                    </p>
                </div>

            </div>
        </main>
      </div>
    </>
  );
};

export default PublicCoursesPage;

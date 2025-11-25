import { Link } from 'react-router-dom';
import { Plus, Search, MoreHorizontal, MapPin, Calendar, Users, Edit2, Flower2, Menu, CalendarClock } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';

const CoursesPage = () => {
  return (
    <SidebarProvider>
      <TeacherSidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#FDFBF7]">

        {/* Mobile Header */}
        <div className="flex md:hidden items-center justify-between p-6 border-b border-[#E7E5E4] bg-[#FDFBF7]/80 backdrop-blur-xl z-30 shrink-0">
            <div className="flex items-center gap-3">
                 <Flower2 className="h-5 w-5 text-[#354F41]" />
                 <span className="font-geist text-base font-semibold text-[#292524]">ZenStudio</span>
            </div>
            <SidebarTrigger>
                <Menu className="h-6 w-6 text-[#78716C]" />
            </SidebarTrigger>
        </div>

        {/* Header Area & Controls */}
        <div className="px-8 py-8 border-b border-[#E7E5E4] bg-[#FDFBF7] shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="font-geist text-2xl font-semibold text-[#292524] tracking-tight">Mine Kurs</h1>
                    <p className="text-sm text-[#78716C] mt-1">Administrer dine aktive kursrekker, workshops og arrangementer.</p>
                </div>
                <button className="flex items-center gap-2 rounded-xl bg-[#292524] px-4 py-2.5 text-xs font-medium text-[#F5F5F4] shadow-lg shadow-[#292524]/10 hover:bg-[#44403C] hover:scale-[1.02] active:scale-[0.98] ios-ease transition-all">
                    <Plus className="h-4 w-4" />
                    <span>Opprett nytt</span>
                </button>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A8A29E]" />
                    <input type="text" placeholder="Søk etter kurs..." className="w-full rounded-xl border-0 py-2 pl-9 pr-3 text-[#292524] shadow-sm ring-1 ring-inset ring-[#E7E5E4] placeholder:text-[#A8A29E] focus:ring-1 focus:ring-inset focus:ring-[#354F41]/20 focus:border-[#354F41] text-xs bg-white transition-shadow" />
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar p-1">
                    <button className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-[#292524] shadow-sm ring-1 ring-[#E7E5E4]">
                        Alle
                    </button>
                    <button className="shrink-0 rounded-lg bg-transparent px-3 py-1.5 text-xs font-medium text-[#78716C] hover:bg-[#F5F5F4] transition-colors">
                        Aktive
                    </button>
                    <button className="shrink-0 rounded-lg bg-transparent px-3 py-1.5 text-xs font-medium text-[#78716C] hover:bg-[#F5F5F4] transition-colors">
                        Kommende
                    </button>
                    <button className="shrink-0 rounded-lg bg-transparent px-3 py-1.5 text-xs font-medium text-[#78716C] hover:bg-[#F5F5F4] transition-colors">
                        Fullførte
                    </button>
                </div>
            </div>
        </div>

        {/* Scrollable Course Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-12">

                {/* Card 1: Active Course */}
                <div className="group relative flex flex-col rounded-2xl border border-[#E7E5E4] bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-[#D6D3D1] cursor-pointer">
                    <div className="flex justify-between items-start mb-4">
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E6F4EA] px-2 py-1 text-[10px] font-medium text-[#137435]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#137435]"></span>
                            Pågår
                        </div>
                        <button className="text-[#A8A29E] hover:text-[#292524] p-1 rounded-md hover:bg-[#F5F5F4]">
                            <MoreHorizontal className="h-4 w-4" />
                        </button>
                    </div>

                    <Link to="/teacher/courses/detail" className="block group-hover:opacity-100 transition-opacity">
                        <h3 className="text-base font-semibold text-[#292524] mb-1 group-hover:text-[#137435] transition-colors">Vinyasa Flow: Nybegynner</h3>
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-[#78716C] mb-4">
                        <MapPin className="h-3 w-3" />
                        <span>Sal A - Hovedstudio</span>
                    </div>

                    <div className="space-y-2.5 mb-6">
                        <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 text-[#44403C]">
                                <Calendar className="h-3.5 w-3.5 text-[#A8A29E]" />
                                <span>Tirsdager, 18:00</span>
                            </div>
                            <span className="text-[#78716C]">8 uker</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 text-[#44403C]">
                                <Users className="h-3.5 w-3.5 text-[#A8A29E]" />
                                <span>12 / 15 deltakere</span>
                            </div>
                            <span className="text-[#78716C]">2400 NOK</span>
                        </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-[#F5F5F4]">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-medium text-[#78716C] uppercase tracking-wide">Progresjon</span>
                            <span className="text-[10px] font-medium text-[#292524]">Uke 3 av 8</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-[#F5F5F4] overflow-hidden">
                            <div className="h-full w-[37%] rounded-full bg-[#292524]"></div>
                        </div>
                    </div>
                </div>

                {/* Card 2: Upcoming Course */}
                <div className="group relative flex flex-col rounded-2xl border border-[#E7E5E4] bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-[#D6D3D1] cursor-pointer">
                    <div className="flex justify-between items-start mb-4">
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF7ED] px-2 py-1 text-[10px] font-medium text-[#C2410C]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#C2410C]"></span>
                            Starter om 5 dager
                        </div>
                        <button className="text-[#A8A29E] hover:text-[#292524] p-1 rounded-md hover:bg-[#F5F5F4]">
                            <MoreHorizontal className="h-4 w-4" />
                        </button>
                    </div>

                    <h3 className="text-base font-semibold text-[#292524] mb-1 group-hover:text-[#C2410C] transition-colors">Barsel Yoga & Baby</h3>
                    <div className="flex items-center gap-2 text-xs text-[#78716C] mb-4">
                        <MapPin className="h-3 w-3" />
                        <span>Sal B - Lillesalen</span>
                    </div>

                    <div className="space-y-2.5 mb-6">
                        <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 text-[#44403C]">
                                <Calendar className="h-3.5 w-3.5 text-[#A8A29E]" />
                                <span>Torsdager, 10:30</span>
                            </div>
                            <span className="text-[#78716C]">6 uker</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 text-[#44403C]">
                                <Users className="h-3.5 w-3.5 text-[#A8A29E]" />
                                <span>8 / 10 deltakere</span>
                            </div>
                            <span className="text-[#78716C]">1800 NOK</span>
                        </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-[#F5F5F4]">
                        <div className="flex items-center gap-3">
                            <div className="flex -space-x-2 overflow-hidden">
                                <img className="inline-block h-6 w-6 rounded-full ring-2 ring-white object-cover" src="https://i.pravatar.cc/150?u=1" alt="" />
                                <img className="inline-block h-6 w-6 rounded-full ring-2 ring-white object-cover" src="https://i.pravatar.cc/150?u=2" alt="" />
                                <img className="inline-block h-6 w-6 rounded-full ring-2 ring-white object-cover" src="https://i.pravatar.cc/150?u=3" alt="" />
                            </div>
                            <span className="text-[10px] text-[#78716C]">+5 påmeldte</span>
                        </div>
                    </div>
                </div>

                {/* Card 3: Workshop */}
                <div className="group relative flex flex-col rounded-2xl border border-[#E7E5E4] bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-[#D6D3D1] cursor-pointer">
                    <div className="flex justify-between items-start mb-4">
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F5F5F4] px-2 py-1 text-[10px] font-medium text-[#57534E]">
                            <CalendarClock className="h-3 w-3" />
                            Workshop
                        </div>
                        <button className="text-[#A8A29E] hover:text-[#292524] p-1 rounded-md hover:bg-[#F5F5F4]">
                            <MoreHorizontal className="h-4 w-4" />
                        </button>
                    </div>

                    <h3 className="text-base font-semibold text-[#292524] mb-1 group-hover:text-[#354F41] transition-colors">Pust & Avspenning</h3>
                    <div className="flex items-center gap-2 text-xs text-[#78716C] mb-4">
                        <MapPin className="h-3 w-3" />
                        <span>Sal A - Hovedstudio</span>
                    </div>

                    <div className="space-y-2.5 mb-6">
                        <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 text-[#44403C]">
                                <Calendar className="h-3.5 w-3.5 text-[#A8A29E]" />
                                <span>Lør 24. Okt, 12:00</span>
                            </div>
                            <span className="text-[#78716C]">3 timer</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 text-[#44403C]">
                                <Users className="h-3.5 w-3.5 text-[#A8A29E]" />
                                <span>22 / 25 deltakere</span>
                            </div>
                            <span className="text-[#78716C]">650 NOK</span>
                        </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-[#F5F5F4]">
                         <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-medium text-[#78716C] uppercase tracking-wide">Fyllingsgrad</span>
                            <span className="text-[10px] font-medium text-[#292524]">88%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-[#F5F5F4] overflow-hidden">
                            <div className="h-full w-[88%] rounded-full bg-[#354F41]"></div>
                        </div>
                    </div>
                </div>

                {/* Card 4: Draft */}
                <div className="group relative flex flex-col rounded-2xl border border-dashed border-[#D6D3D1] bg-[#FAFAF9] p-5 transition-all hover:border-[#A8A29E] hover:bg-[#F5F5F4] cursor-pointer opacity-80 hover:opacity-100">
                    <div className="flex justify-between items-start mb-4">
                         <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E7E5E4] px-2 py-1 text-[10px] font-medium text-[#57534E]">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#78716C]"></span>
                            Utkast
                        </div>
                        <button className="text-[#A8A29E] hover:text-[#292524] p-1 rounded-md hover:bg-[#E7E5E4]">
                            <MoreHorizontal className="h-4 w-4" />
                        </button>
                    </div>

                    <h3 className="text-base font-medium text-[#78716C] mb-1">Intro til Meditasjon</h3>
                    <div className="flex items-center gap-2 text-xs text-[#A8A29E] mb-4">
                        <MapPin className="h-3 w-3" />
                        <span>Ikke satt</span>
                    </div>

                    <div className="space-y-2.5 mb-6 opacity-60">
                        <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 text-[#44403C]">
                                <Calendar className="h-3.5 w-3.5 text-[#A8A29E]" />
                                <span>Planlagt: Nov 2023</span>
                            </div>
                            <span className="text-[#78716C]">4 uker</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 text-[#44403C]">
                                <Users className="h-3.5 w-3.5 text-[#A8A29E]" />
                                <span>- / 15 deltakere</span>
                            </div>
                            <span className="text-[#78716C]">-</span>
                        </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-[#E7E5E4]/50 flex items-center justify-center">
                        <span className="text-xs font-medium text-[#292524] flex items-center gap-2">
                            <Edit2 className="h-3 w-3" />
                            Fullfør oppsett
                        </span>
                    </div>
                </div>

            </div>
        </div>
      </main>
    </SidebarProvider>
  );
};

export default CoursesPage;


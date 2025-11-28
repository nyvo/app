import { useState } from 'react';
import { 
  ChevronRight, 
  Calendar, 
  MapPin, 
  Users, 
  Share, 
  ExternalLink, 
  ChevronDown, 
  Search, 
  Download, 
  Mail, 
  MoreHorizontal, 
  ChevronLeft,
  Clock,
  CalendarIcon,
  Check,
  Info,
  ChevronUp
} from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

type Tab = 'weeks' | 'participants' | 'settings';

// Mock data for weeks to make rendering easier
const courseWeeks = [
  { id: 'week-1', weekNum: '01', title: 'Vinyasa Flow', status: 'completed', date: '3. Oktober', time: '18:00 - 19:15' },
  { id: 'week-2', weekNum: '02', title: 'Vinyasa Flow', status: 'completed', date: '10. Oktober', time: '18:00 - 19:15' },
  { id: 'week-3', weekNum: '03', title: 'Vinyasa Flow', status: 'active', date: '17. Oktober (I morgen)', time: '18:00 - 19:15', instructor: 'Elena Fisher' },
  { id: 'week-4', weekNum: '04', title: 'Vinyasa Flow', status: 'upcoming', date: '24. Oktober', time: '18:00 - 19:15' },
  { id: 'week-5', weekNum: '05', title: 'Vinyasa Flow', status: 'upcoming', date: '31. Oktober', time: '18:00 - 19:15' },
  { id: 'week-6', weekNum: '06', title: 'Vinyasa Flow', status: 'upcoming', date: '7. November', time: '18:00 - 19:15' },
  { id: 'week-7', weekNum: '07', title: 'Vinyasa Flow', status: 'upcoming', date: '14. November', time: '18:00 - 19:15' },
  { id: 'week-8', weekNum: '08', title: 'Vinyasa Flow', status: 'upcoming', date: '21. November', time: '18:00 - 19:15' },
];

// Generate time slots from 06:00 to 23:00 (every 15 minutes)
const generateTimeSlots = () => {
  const slots: string[] = [];
  for (let hour = 6; hour <= 23; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < 23) {
      slots.push(`${hour.toString().padStart(2, '0')}:15`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
      slots.push(`${hour.toString().padStart(2, '0')}:45`);
    }
  }
  return slots;
};

const timeSlots = generateTimeSlots();

const CourseDetailPage = () => {
  const [activeTab, setActiveTab] = useState<Tab>('weeks');
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [expandedItem, setExpandedItem] = useState<string | undefined>(undefined);
  const [openTimePopovers, setOpenTimePopovers] = useState<Record<string, boolean>>({});
  const [visibleWeeks, setVisibleWeeks] = useState(3);

  const handleTimeSelect = (weekId: string, _time: string) => {
    // In a real app, update the state here
    setOpenTimePopovers(prev => ({ ...prev, [weekId]: false }));
  };

  const toggleTimePopover = (weekId: string, isOpen: boolean) => {
    setOpenTimePopovers(prev => ({ ...prev, [weekId]: isOpen }));
  };

  const handleShowMore = () => {
    if (visibleWeeks >= courseWeeks.length) {
        setVisibleWeeks(3); // Reset to default
    } else {
        setVisibleWeeks(prev => Math.min(prev + 3, courseWeeks.length));
    }
  };

  return (
    <SidebarProvider>
      <TeacherSidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#FDFBF7]">
        
        {/* Header Section */}
        <div className="bg-[#FDFBF7] border-b border-[#E7E5E4] z-10">
            {/* Breadcrumbs & Top Actions */}
            <div className="px-8 pt-8 pb-6">
                <div className="mx-auto max-w-5xl w-full flex flex-col gap-6">
                    {/* Top Row: Title & Actions */}
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-xs text-[#78716C] mb-2">
                                <a href="/teacher/courses" className="hover:text-[#292524] transition-colors">Kurs</a>
                                <ChevronRight className="h-3 w-3 text-[#A8A29E]" />
                                <span className="text-[#292524]">Vinyasa Flow: Nybegynner</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <h1 className="font-geist text-3xl md:text-4xl font-medium tracking-tight text-[#292524]">Vinyasa Flow: Nybegynner</h1>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E6F4EA] px-2.5 py-0.5 text-[11px] font-medium text-[#137435] border border-[#137435]/10">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#137435]"></span>
                                    Aktiv
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button className="flex items-center gap-2 rounded-full border border-[#E7E5E4] bg-white px-4 py-2 text-xs font-medium text-[#292524] hover:bg-[#F5F5F4] ios-ease transition-colors">
                                <Share className="h-3.5 w-3.5" />
                                Del kurs
                            </button>
                            <button className="flex items-center gap-2 rounded-full border border-[#E7E5E4] bg-white px-4 py-2 text-xs font-medium text-[#292524] hover:bg-[#F5F5F4] ios-ease transition-colors">
                                <ExternalLink className="h-3.5 w-3.5" />
                                Vis side
                            </button>
                        </div>
                    </div>

                    {/* Prominent Details Section */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Time */}
                        <div className="flex items-center gap-4 rounded-xl border border-[#E7E5E4] bg-white px-4 py-3 shadow-sm">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F5F5F4] text-[#292524]">
                                <Calendar className="h-5 w-5" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-semibold text-[#A8A29E] tracking-wide">Tidspunkt</span>
                                <span className="text-sm font-medium text-[#292524]">Tirsdager, 18:00</span>
                            </div>
                        </div>

                        {/* Location */}
                        <div className="flex items-center gap-4 rounded-xl border border-[#E7E5E4] bg-white px-4 py-3 shadow-sm">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F5F5F4] text-[#292524]">
                                <MapPin className="h-5 w-5" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-semibold text-[#A8A29E] tracking-wide">Sted</span>
                                <span className="text-sm font-medium text-[#292524]">Sal A - Hovedstudio</span>
                            </div>
                        </div>

                        {/* Participants */}
                        <div className="flex items-center gap-4 rounded-xl border border-[#E7E5E4] bg-white px-4 py-3 shadow-sm">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F5F5F4] text-[#292524]">
                                <Users className="h-5 w-5" />
                            </div>
                            <div className="flex flex-col w-full">
                                <div className="flex justify-between items-center w-full gap-4">
                                    <span className="text-[10px] uppercase font-semibold text-[#A8A29E] tracking-wide">Påmeldte</span>
                                    <span className="text-xs font-medium text-[#137435]">3 ledige plasser</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-[#292524]">12 / 15</span>
                                    <div className="h-1.5 flex-1 rounded-full bg-[#F5F5F4] overflow-hidden max-w-[80px]">
                                        <div className="h-full w-[80%] rounded-full bg-[#292524]"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="px-8 flex gap-6 border-b border-transparent justify-center md:justify-start">
                <div className="mx-auto max-w-5xl w-full flex gap-6">
                    <button 
                        onClick={() => setActiveTab('weeks')} 
                        className={`tab-btn group relative pb-3 text-sm font-medium transition-colors ${
                            activeTab === 'weeks' ? 'text-[#292524]' : 'text-[#78716C] hover:text-[#292524]'
                        }`}
                    >
                        Timeplan
                        <span className={`absolute bottom-0 left-0 h-[2px] w-full bg-[#292524] rounded-t-full transition-transform ${
                            activeTab === 'weeks' ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-50'
                        }`}></span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('participants')} 
                        className={`tab-btn group relative pb-3 text-sm font-medium transition-colors ${
                            activeTab === 'participants' ? 'text-[#292524]' : 'text-[#78716C] hover:text-[#292524]'
                        }`}
                    >
                        Deltakere
                        <span className={`absolute bottom-0 left-0 h-[2px] w-full bg-[#292524] rounded-t-full transition-transform ${
                            activeTab === 'participants' ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-50'
                        }`}></span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('settings')} 
                        className={`tab-btn group relative pb-3 text-sm font-medium transition-colors ${
                            activeTab === 'settings' ? 'text-[#292524]' : 'text-[#78716C] hover:text-[#292524]'
                        }`}
                    >
                        Innstillinger
                        <span className={`absolute bottom-0 left-0 h-[2px] w-full bg-[#292524] rounded-t-full transition-transform ${
                            activeTab === 'settings' ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-50'
                        }`}></span>
                    </button>
                </div>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#FDFBF7] p-8">
            <div className="mx-auto max-w-5xl w-full">
            
                {/* TAB 1: Timeplan (Weeks) */}
                {activeTab === 'weeks' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-sm font-semibold text-[#292524]">Kursplan (8 uker)</h2>
                            <div className="h-1.5 w-32 rounded-full bg-[#E7E5E4] overflow-hidden">
                                <div className="h-full w-[37%] rounded-full bg-[#354F41]"></div>
                            </div>
                        </div>

                        <div className="relative">
                            {/* Timeline Line */}
                            <div className="absolute left-[27px] top-4 bottom-4 w-[1px] bg-[#E7E5E4] -z-10"></div>

                            <Accordion type="single" collapsible className="space-y-3" value={expandedItem} onValueChange={setExpandedItem}>
                                {courseWeeks.slice(0, visibleWeeks).map((week) => (
                                    <AccordionItem 
                                        key={week.id} 
                                        value={week.id} 
                                        className={`group rounded-xl border transition-all hover:shadow-sm ${
                                            week.status === 'active' 
                                                ? 'border-[#354F41]/30 bg-white shadow-sm ring-1 ring-[#354F41]/10' 
                                                : week.status === 'upcoming'
                                                ? 'border-[#E7E5E4] bg-white/50 hover:bg-white hover:border-[#D6D3D1]'
                                                : 'border-[#E7E5E4] bg-white hover:border-[#D6D3D1]'
                                        }`}
                                    >
                                        {/* Card Click Area */}
                                        <div className="flex items-center px-4 cursor-pointer" onClick={() => setExpandedItem(expandedItem === week.id ? undefined : week.id)}>
                                            {/* Week Number Box (Left Side) */}
                                            <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg mr-4 ${
                                                week.status === 'active'
                                                    ? 'bg-[#354F41] text-white shadow-sm'
                                                    : 'border border-[#E7E5E4] bg-[#F5F5F4] text-[#78716C] group-hover:bg-white transition-colors'
                                            }`}>
                                                <span className={`text-[10px] font-medium uppercase ${week.status === 'active' ? 'opacity-80' : ''}`}>Uke</span>
                                                <span className="font-geist text-lg font-semibold">{week.weekNum}</span>
                                            </div>
                                            
                                            {/* Content (Middle) */}
                                            <div className="flex-1 py-4">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <h3 className={`text-sm font-semibold ${week.status === 'completed' ? 'text-[#78716C] line-through decoration-[#A8A29E]' : 'text-[#292524]'}`}>
                                                        {week.title}
                                                    </h3>
                                                    {week.status === 'completed' && (
                                                        <span className="rounded-md bg-[#F5F5F4] px-1.5 py-0.5 text-[10px] font-medium text-[#78716C]">Fullført</span>
                                                    )}
                                                    {week.status === 'active' && (
                                                        <span className="rounded-md bg-[#E6F4EA] px-1.5 py-0.5 text-[10px] font-medium text-[#137435] animate-pulse">Neste time</span>
                                                    )}
                                                </div>
                                                <div className={`flex items-center gap-3 text-xs ${week.status === 'completed' ? 'text-[#A8A29E]' : 'text-[#78716C]'}`}>
                                                    <span className={week.status === 'active' ? 'font-medium text-[#292524]' : ''}>{week.date}</span>
                                                    <span className={`w-1 h-1 rounded-full ${week.status === 'completed' ? 'bg-[#D6D3D1]' : 'bg-[#A8A29E]'}`}></span>
                                                    <span>{week.time}</span>
                                                </div>
                                            </div>

                                            {/* Arrow Trigger (Right Side) */}
                                            <AccordionTrigger className="p-2 text-[#78716C] hover:bg-[#F5F5F4] hover:text-[#292524] rounded-lg transition-all hover:no-underline [&>svg]:h-4 [&>svg]:w-4">
                                                <span className="sr-only">Rediger</span>
                                            </AccordionTrigger>
                                        </div>

                                        <AccordionContent className="px-4 pb-4 pt-0">
                                            <div className="pl-[72px] pt-2 space-y-4">
                                                <div className="h-px w-full bg-[#F5F5F4] mb-4"></div>
                                                
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {/* Date Picker */}
                                                    <div>
                                                        <label className="block text-xs font-medium text-[#44403C] mb-1.5">
                                                            Dato
                                                        </label>
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <button
                                                                    type="button"
                                                                    className="flex items-center justify-between w-full rounded-xl border-0 py-2.5 px-3 text-[#292524] shadow-sm ring-1 ring-inset ring-[#E7E5E4] hover:ring-[#D6D3D1] focus:ring-1 focus:ring-inset focus:ring-[#354F41]/20 focus:border-[#354F41] text-sm bg-white transition-all text-left"
                                                                >
                                                                    <span>{format(new Date(), 'PPP', { locale: nb })}</span>
                                                                    <CalendarIcon className="h-4 w-4 text-[#A8A29E]" />
                                                                </button>
                                                            </PopoverTrigger>
                                                            <PopoverContent align="start" className="p-0" showOverlay>
                                                                <CalendarComponent
                                                                    mode="single"
                                                                    selected={startDate}
                                                                    onSelect={setStartDate}
                                                                    locale={nb}
                                                                    className="rounded-md border"
                                                                />
                                                            </PopoverContent>
                                                        </Popover>
                                                    </div>

                                                    {/* Time Input (Reused from NewCoursePage) */}
                                                    <div>
                                                        <label className="block text-xs font-medium text-[#44403C] mb-1.5">
                                                            Tidspunkt
                                                        </label>
                                                        <Popover open={openTimePopovers[week.id]} onOpenChange={(isOpen) => toggleTimePopover(week.id, isOpen)}>
                                                            <PopoverTrigger asChild>
                                                                <button
                                                                    type="button"
                                                                    className="flex items-center justify-between w-full rounded-xl border-0 py-2.5 px-3 text-[#292524] shadow-sm ring-1 ring-inset ring-[#E7E5E4] hover:ring-[#D6D3D1] focus:ring-1 focus:ring-inset focus:ring-[#354F41]/20 focus:border-[#354F41] text-sm bg-white transition-all text-left"
                                                                >
                                                                    <span className="text-[#292524]">
                                                                        {week.time.split(' - ')[0]}
                                                                    </span>
                                                                    <div className="flex items-center gap-2">
                                                                        <Clock className="h-4 w-4 text-[#A8A29E]" />
                                                                        <ChevronDown className={`h-4 w-4 text-[#A8A29E] transition-transform ${openTimePopovers[week.id] ? 'rotate-180' : ''}`} />
                                                                    </div>
                                                                </button>
                                                            </PopoverTrigger>
                                                            <PopoverContent align="start" className="w-[200px] p-2 max-h-[280px] overflow-y-auto custom-scrollbar" showOverlay>
                                                                <div className="flex flex-col gap-0.5">
                                                                    {timeSlots.map((time) => (
                                                                        <button
                                                                            key={time}
                                                                            type="button"
                                                                            onClick={() => handleTimeSelect(week.id, time)}
                                                                            className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                                                                                week.time.startsWith(time)
                                                                                    ? 'bg-[#292524] text-white'
                                                                                    : 'text-[#44403C] hover:bg-[#F5F5F4]'
                                                                            }`}
                                                                        >
                                                                            <span>{time}</span>
                                                                            {week.time.startsWith(time) && <Check className="h-4 w-4" />}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </PopoverContent>
                                                        </Popover>
                                                    </div>
                                                </div>

                                                {/* Notification info text */}
                                                <div className="flex items-start gap-2 p-3 rounded-lg bg-[#F7F5F2] text-xs text-[#78716C]">
                                                    <Info className="h-4 w-4 shrink-0 mt-0.5 text-[#A8A29E]" />
                                                    <p>Endringer i tid eller sted vil automatisk bli sendt på e-post til alle påmeldte deltakere.</p>
                                                </div>
                                                
                                                <div className="flex justify-end gap-2 pt-2">
                                                    <button 
                                                        onClick={() => setExpandedItem(undefined)}
                                                        className="text-xs font-medium text-[#78716C] hover:text-[#292524] px-3 py-2 rounded-lg hover:bg-[#F5F5F4] transition-colors"
                                                    >
                                                        Avbryt
                                                    </button>
                                                    <button className="rounded-lg bg-[#292524] px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-[#292524] transition-colors">
                                                        Lagre endringer
                                                    </button>
                                                </div>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>

                            {/* Show More Button */}
                            <button 
                                onClick={handleShowMore}
                                className="flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-[#D6D3D1] py-3 text-xs font-medium text-[#78716C] hover:bg-white hover:text-[#292524] transition-colors mt-3"
                            >
                                {visibleWeeks >= courseWeeks.length ? (
                                    <>
                                        <ChevronUp className="h-3.5 w-3.5" />
                                        Vis mindre
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown className="h-3.5 w-3.5" />
                                        Vis {Math.min(3, courseWeeks.length - visibleWeeks)} uker til
                                    </>
                                )}
                            </button>

                        </div>
                    </div>
                )}

                {/* TAB 2: Deltakere (Participants) */}
                {activeTab === 'participants' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="flex items-center justify-between mb-6">
                            <div className="relative max-w-xs w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A8A29E]" />
                                <Input 
                                  type="text" 
                                  placeholder="Søk i deltakere..." 
                                  className="w-full rounded-xl border-0 py-2 pl-9 pr-3 text-[#292524] shadow-sm ring-1 ring-inset ring-[#E7E5E4] placeholder:text-[#A8A29E] focus-visible:ring-1 focus-visible:ring-[#354F41]/20 focus-visible:border-[#354F41] text-xs bg-white" 
                                />
                            </div>
                                <div className="flex gap-2">
                                    <button className="flex items-center gap-2 rounded-lg bg-white border border-[#E7E5E4] px-3 py-2 text-xs font-medium text-[#292524] shadow-sm hover:bg-[#F5F5F4] transition-colors">
                                        <Download className="h-3.5 w-3.5 text-[#78716C]" />
                                        Eksporter
                                    </button>
                                    <button className="flex items-center gap-2 rounded-lg bg-[#292524] px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-[#292524] transition-colors">
                                        <Mail className="h-3.5 w-3.5" />
                                        Send e-post til alle
                                    </button>
                                </div>
                        </div>

                        <div className="rounded-xl border border-[#E7E5E4] bg-white shadow-sm overflow-hidden">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-[#FAFAF9] border-b border-[#E7E5E4] text-[#78716C] font-medium">
                                    <tr>
                                        <th className="px-6 py-3">Navn</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3">Kontakt</th>
                                        <th className="px-6 py-3 text-right">Handling</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#F5F5F4]">
                                    {/* Row 1 */}
                                    <tr className="group hover:bg-[#FAFAF9] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <img src="https://i.pravatar.cc/150?u=3" alt="" className="h-8 w-8 rounded-full object-cover ring-1 ring-[#E7E5E4]" />
                                                <span className="font-medium text-[#292524]">Anna Hansen</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center rounded-md bg-[#E6F4EA] px-2 py-1 text-[10px] font-medium text-[#137435]">Betalt</span>
                                        </td>
                                        <td className="px-6 py-4 text-[#78716C]">anna.h@example.com</td>
                                        <td className="px-6 py-4 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="text-[#A8A29E] hover:text-[#292524] p-1 rounded-md hover:bg-[#E7E5E4]">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem>
                                                        Se kvittering
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                    {/* Row 2 */}
                                    <tr className="group hover:bg-[#FAFAF9] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <img src="https://i.pravatar.cc/150?u=8" alt="" className="h-8 w-8 rounded-full object-cover ring-1 ring-[#E7E5E4]" />
                                                <span className="font-medium text-[#292524]">Erik Johansen</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center rounded-md bg-[#FFF7ED] px-2 py-1 text-[10px] font-medium text-[#C2410C]">Faktura sendt</span>
                                        </td>
                                        <td className="px-6 py-4 text-[#78716C]">erik.j@example.com</td>
                                        <td className="px-6 py-4 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="text-[#A8A29E] hover:text-[#292524] p-1 rounded-md hover:bg-[#E7E5E4]">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem>
                                                        Se kvittering
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                    {/* Row 3 */}
                                    <tr className="group hover:bg-[#FAFAF9] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 flex items-center justify-center rounded-full bg-[#F5F5F4] text-[#78716C] text-xs font-medium ring-1 ring-[#E7E5E4]">KL</div>
                                                <span className="font-medium text-[#292524]">Kari Larsen</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center rounded-md bg-[#E6F4EA] px-2 py-1 text-[10px] font-medium text-[#137435]">Betalt</span>
                                        </td>
                                        <td className="px-6 py-4 text-[#78716C]">kari.l@example.com</td>
                                        <td className="px-6 py-4 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="text-[#A8A29E] hover:text-[#292524] p-1 rounded-md hover:bg-[#E7E5E4]">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem>
                                                        Se kvittering
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <div className="bg-[#FAFAF9] border-t border-[#E7E5E4] px-6 py-3 text-[11px] text-[#78716C] flex justify-between items-center">
                                 <span>Viser 3 av 12 deltakere</span>
                                 <div className="flex gap-1">
                                     <button className="p-1 rounded hover:bg-[#E7E5E4] disabled:opacity-50"><ChevronLeft className="h-3 w-3" /></button>
                                     <button className="p-1 rounded hover:bg-[#E7E5E4]"><ChevronRight className="h-3 w-3" /></button>
                                 </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: Innstillinger (Settings) */}
                {activeTab === 'settings' && (
                    <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
                        
                        <div className="space-y-6">
                            {/* General Settings Card */}
                            <div className="rounded-2xl border border-[#E7E5E4] bg-white p-6 shadow-sm">
                                <h2 className="text-base font-semibold text-[#292524] mb-1">Generell Informasjon</h2>
                                <p className="text-xs text-[#78716C] mb-6">Endre grunnleggende informasjon om kurset.</p>

                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-xs font-medium text-[#44403C] mb-1.5">Kursnavn</label>
                                        <Input 
                                          type="text" 
                                          defaultValue="Vinyasa Flow: Nybegynner" 
                                          className="w-full rounded-xl border-0 py-2.5 px-3 text-black shadow-sm ring-1 ring-inset ring-[#E7E5E4] placeholder:text-[#A8A29E] focus-visible:ring-1 focus-visible:ring-[#354F41]/20 focus-visible:border-[#354F41] text-sm !bg-white" 
                                        />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-[#44403C] mb-1.5">Sted</label>
                                            <Input 
                                              type="text" 
                                              defaultValue="Sal A - Hovedstudio" 
                                              className="w-full rounded-xl border-0 py-2.5 px-3 text-black shadow-sm ring-1 ring-inset ring-[#E7E5E4] placeholder:text-[#A8A29E] focus-visible:ring-1 focus-visible:ring-[#354F41]/20 focus-visible:border-[#354F41] text-sm !bg-white" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-[#44403C] mb-1.5">Maks kapasitet</label>
                                            <Input 
                                              type="number" 
                                              defaultValue="15" 
                                              className="w-full rounded-xl border-0 py-2.5 px-3 text-black shadow-sm ring-1 ring-inset ring-[#E7E5E4] placeholder:text-[#A8A29E] focus-visible:ring-1 focus-visible:ring-[#354F41]/20 focus-visible:border-[#354F41] text-sm !bg-white" 
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-[#44403C] mb-1.5">Beskrivelse</label>
                                        <textarea 
                                          rows={4} 
                                          className="w-full rounded-xl border-0 py-2.5 px-3 text-[#292524] shadow-sm ring-1 ring-inset ring-[#E7E5E4] placeholder:text-[#A8A29E] focus:ring-1 focus:ring-inset focus:ring-[#354F41]/20 focus:border-[#354F41] text-sm bg-white ios-ease resize-none focus:outline-none"
                                          defaultValue="Et dynamisk kurs som fokuserer på pust og bevegelse. Passer for alle nivåer, men er spesielt tilrettelagt for de som ønsker en grundig innføring."
                                        />
                                    </div>

                                    <div className="flex justify-end pt-2">
                                        <button className="rounded-xl bg-[#292524] px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-[#292524] ios-ease transition-transform active:scale-95">
                                            Lagre endringer
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Danger Zone */}
                            <div className="rounded-2xl border border-red-200 bg-red-50/30 p-6">
                                <h2 className="text-base font-semibold text-[#7F1D1D] mb-1">Slett kurs</h2>
                                <p className="text-xs text-[#991B1B]/80 mb-6">Dette vil slette kurset og alle tilhørende data. Denne handlingen kan ikke angres.</p>
                                
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-[#991B1B]">Ønsker du å slette dette kurset permanent?</span>
                                    <button className="rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-medium text-[#991B1B] shadow-sm hover:bg-red-50 hover:border-red-300 ios-ease transition-colors">
                                        Slett kurs
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
      </main>
    </SidebarProvider>
  );
};

export default CourseDetailPage;

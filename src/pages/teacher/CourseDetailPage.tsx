import { useState } from 'react';
import { nb } from 'date-fns/locale';
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
import { TIME_SLOTS_DEFAULT } from '@/utils/timeSlots';
import { formatDateNorwegian } from '@/utils/dateUtils';

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

const timeSlots = TIME_SLOTS_DEFAULT;

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
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-surface">

        {/* Header Section */}
        <div className="bg-surface border-b border-border z-10">
            {/* Breadcrumbs & Top Actions */}
            <div className="px-8 pt-8 pb-6">
                <div className="mx-auto max-w-5xl w-full flex flex-col gap-6">
                    {/* Top Row: Title & Actions */}
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                <a href="/teacher/courses" className="hover:text-text-primary transition-colors">Kurs</a>
                                <ChevronRight className="h-3 w-3 text-text-tertiary" />
                                <span className="text-text-primary">Vinyasa Flow: Nybegynner</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <h1 className="font-geist text-3xl md:text-4xl font-medium tracking-tight text-text-primary">Vinyasa Flow: Nybegynner</h1>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-status-confirmed-bg px-2.5 py-0.5 text-xs font-medium text-status-confirmed-text border border-status-confirmed-border">
                                    <span className="h-1.5 w-1.5 rounded-full bg-status-confirmed-text"></span>
                                    Aktiv
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button className="flex items-center gap-2 h-10 rounded-lg border border-border bg-white px-3 py-2 text-xs font-medium text-text-secondary shadow-sm hover:bg-surface-elevated hover:text-text-primary ios-ease">
                                <Share className="h-3.5 w-3.5" />
                                Del kurs
                            </button>
                            <button className="flex items-center gap-2 h-10 rounded-lg border border-border bg-white px-3 py-2 text-xs font-medium text-text-secondary shadow-sm hover:bg-surface-elevated hover:text-text-primary ios-ease">
                                <ExternalLink className="h-3.5 w-3.5" />
                                Vis side
                            </button>
                        </div>
                    </div>

                    {/* Prominent Details Section */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Time */}
                        <div className="flex items-center gap-4 rounded-xl border border-border bg-white px-4 py-3 shadow-sm">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-elevated text-text-primary">
                                <Calendar className="h-5 w-5" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xxs uppercase font-semibold text-text-tertiary tracking-wide">Tidspunkt</span>
                                <span className="text-sm font-medium text-text-primary">Tirsdager, 18:00</span>
                            </div>
                        </div>

                        {/* Location */}
                        <div className="flex items-center gap-4 rounded-xl border border-border bg-white px-4 py-3 shadow-sm">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-elevated text-text-primary">
                                <MapPin className="h-5 w-5" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xxs uppercase font-semibold text-text-tertiary tracking-wide">Sted</span>
                                <span className="text-sm font-medium text-text-primary">Sal A - Hovedstudio</span>
                            </div>
                        </div>

                        {/* Participants */}
                        <div className="flex items-center gap-4 rounded-xl border border-border bg-white px-4 py-3 shadow-sm">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-elevated text-text-primary">
                                <Users className="h-5 w-5" />
                            </div>
                            <div className="flex flex-col w-full">
                                <div className="flex justify-between items-center w-full gap-4">
                                    <span className="text-xxs uppercase font-semibold text-text-tertiary tracking-wide">Påmeldte</span>
                                    <span className="text-xs font-medium text-status-confirmed-text">3 ledige plasser</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-text-primary">12 / 15</span>
                                    <div className="h-1.5 flex-1 rounded-full bg-surface-elevated overflow-hidden max-w-[80px]">
                                        <div className="h-full w-[80%] rounded-full bg-text-primary"></div>
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
                            activeTab === 'weeks' ? 'text-text-primary' : 'text-muted-foreground hover:text-text-primary'
                        }`}
                    >
                        Timeplan
                        <span className={`absolute bottom-0 left-0 h-[2px] w-full bg-text-primary rounded-t-full transition-transform ${
                            activeTab === 'weeks' ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-50'
                        }`}></span>
                    </button>
                    <button
                        onClick={() => setActiveTab('participants')}
                        className={`tab-btn group relative pb-3 text-sm font-medium transition-colors ${
                            activeTab === 'participants' ? 'text-text-primary' : 'text-muted-foreground hover:text-text-primary'
                        }`}
                    >
                        Deltakere
                        <span className={`absolute bottom-0 left-0 h-[2px] w-full bg-text-primary rounded-t-full transition-transform ${
                            activeTab === 'participants' ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-50'
                        }`}></span>
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`tab-btn group relative pb-3 text-sm font-medium transition-colors ${
                            activeTab === 'settings' ? 'text-text-primary' : 'text-muted-foreground hover:text-text-primary'
                        }`}
                    >
                        Innstillinger
                        <span className={`absolute bottom-0 left-0 h-[2px] w-full bg-text-primary rounded-t-full transition-transform ${
                            activeTab === 'settings' ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-50'
                        }`}></span>
                    </button>
                </div>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-surface p-8">
            <div className="mx-auto max-w-5xl w-full">

                {/* TAB 1: Timeplan (Weeks) */}
                {activeTab === 'weeks' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-sm font-semibold text-text-primary">Kursplan (8 uker)</h2>
                            <div className="h-1.5 w-32 rounded-full bg-border overflow-hidden">
                                <div className="h-full w-[37%] rounded-full bg-primary"></div>
                            </div>
                        </div>

                        <div className="relative">
                            {/* Timeline Line */}
                            <div className="absolute left-[27px] top-4 bottom-4 w-[1px] bg-border -z-10"></div>

                            <Accordion type="single" collapsible className="space-y-3" value={expandedItem} onValueChange={setExpandedItem}>
                                {courseWeeks.slice(0, visibleWeeks).map((week) => (
                                    <AccordionItem
                                        key={week.id}
                                        value={week.id}
                                        className={`group rounded-xl border transition-all hover:shadow-sm ${
                                            week.status === 'active'
                                                ? 'border-primary/30 bg-white shadow-sm ring-1 ring-primary/10'
                                                : week.status === 'upcoming'
                                                ? 'border-border bg-white/50 hover:bg-white hover:border-ring'
                                                : 'border-border bg-white hover:border-ring'
                                        }`}
                                    >
                                        {/* Card Click Area */}
                                        <div className="flex items-center px-4 cursor-pointer" onClick={() => setExpandedItem(expandedItem === week.id ? undefined : week.id)}>
                                            {/* Week Number Box (Left Side) */}
                                            <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg mr-4 ${
                                                week.status === 'active'
                                                    ? 'bg-primary text-white shadow-sm'
                                                    : 'border border-border bg-surface-elevated text-muted-foreground group-hover:bg-white transition-colors'
                                            }`}>
                                                <span className={`text-xxs font-medium uppercase ${week.status === 'active' ? 'opacity-80' : ''}`}>Uke</span>
                                                <span className="font-geist text-lg font-semibold">{week.weekNum}</span>
                                            </div>

                                            {/* Content (Middle) */}
                                            <div className="flex-1 py-4">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <h3 className={`text-sm font-semibold ${week.status === 'completed' ? 'text-muted-foreground line-through decoration-text-tertiary' : 'text-text-primary'}`}>
                                                        {week.title}
                                                    </h3>
                                                    {week.status === 'completed' && (
                                                        <span className="rounded-md bg-surface-elevated px-1.5 py-0.5 text-xxs font-medium text-muted-foreground">Fullført</span>
                                                    )}
                                                    {week.status === 'active' && (
                                                        <span className="rounded-md bg-status-confirmed-bg px-1.5 py-0.5 text-xxs font-medium text-status-confirmed-text animate-pulse">Neste time</span>
                                                    )}
                                                </div>
                                                <div className={`flex items-center gap-3 text-xs ${week.status === 'completed' ? 'text-text-tertiary' : 'text-muted-foreground'}`}>
                                                    <span className={week.status === 'active' ? 'font-medium text-text-primary' : ''}>{week.date}</span>
                                                    <span className={`w-1 h-1 rounded-full ${week.status === 'completed' ? 'bg-ring' : 'bg-text-tertiary'}`}></span>
                                                    <span>{week.time}</span>
                                                </div>
                                            </div>

                                            {/* Arrow Trigger (Right Side) */}
                                            <AccordionTrigger className="p-2 text-muted-foreground hover:bg-surface-elevated hover:text-text-primary rounded-lg transition-all hover:no-underline [&>svg]:h-4 [&>svg]:w-4">
                                                <span className="sr-only">Rediger</span>
                                            </AccordionTrigger>
                                        </div>

                                        <AccordionContent className="px-4 pb-4 pt-0">
                                            <div className="pl-[72px] pt-2 space-y-4">
                                                <div className="h-px w-full bg-surface-elevated mb-4"></div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {/* Date Picker */}
                                                    <div>
                                                        <label className="block text-xs font-medium text-sidebar-foreground mb-1.5">
                                                            Dato
                                                        </label>
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <button
                                                                    type="button"
                                                                    className="flex items-center justify-between w-full rounded-xl border-0 py-2.5 px-3 text-text-primary shadow-sm ring-1 ring-inset ring-border hover:ring-ring focus:ring-1 focus:ring-inset focus:ring-primary/20 focus:border-primary text-sm bg-white transition-all text-left"
                                                                >
                                                                    <span>{formatDateNorwegian(new Date())}</span>
                                                                    <CalendarIcon className="h-4 w-4 text-text-tertiary" />
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
                                                        <label className="block text-xs font-medium text-sidebar-foreground mb-1.5">
                                                            Tidspunkt
                                                        </label>
                                                        <Popover open={openTimePopovers[week.id]} onOpenChange={(isOpen) => toggleTimePopover(week.id, isOpen)}>
                                                            <PopoverTrigger asChild>
                                                                <button
                                                                    type="button"
                                                                    className="flex items-center justify-between w-full rounded-xl border-0 py-2.5 px-3 text-text-primary shadow-sm ring-1 ring-inset ring-border hover:ring-ring focus:ring-1 focus:ring-inset focus:ring-primary/20 focus:border-primary text-sm bg-white transition-all text-left"
                                                                >
                                                                    <span className="text-text-primary">
                                                                        {week.time.split(' - ')[0]}
                                                                    </span>
                                                                    <div className="flex items-center gap-2">
                                                                        <Clock className="h-4 w-4 text-text-tertiary" />
                                                                        <ChevronDown className={`h-4 w-4 text-text-tertiary transition-transform ${openTimePopovers[week.id] ? 'rotate-180' : ''}`} />
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
                                                                                    ? 'bg-text-primary text-white'
                                                                                    : 'text-sidebar-foreground hover:bg-surface-elevated'
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
                                                <div className="flex items-start gap-2 p-3 rounded-lg bg-surface text-xs text-muted-foreground">
                                                    <Info className="h-4 w-4 shrink-0 mt-0.5 text-text-tertiary" />
                                                    <p>Endringer i tid eller sted vil automatisk bli sendt på e-post til alle påmeldte deltakere.</p>
                                                </div>

                                                <div className="flex justify-end gap-2 pt-2">
                                                    <button
                                                        onClick={() => setExpandedItem(undefined)}
                                                        className="text-xs font-medium text-muted-foreground hover:text-text-primary px-3 py-2 rounded-lg hover:bg-surface-elevated transition-colors"
                                                    >
                                                        Avbryt
                                                    </button>
                                                    <button className="rounded-lg bg-text-primary px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-text-primary transition-colors">
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
                                className="flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-ring py-3 text-xs font-medium text-muted-foreground hover:bg-white hover:text-text-primary transition-colors mt-3"
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
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                                <Input
                                  type="text"
                                  placeholder="Søk i deltakere..."
                                  aria-label="Søk i deltakere"
                                  className="w-full rounded-xl border-0 py-2 pl-9 pr-3 text-text-primary shadow-sm ring-1 ring-inset ring-border placeholder:text-text-tertiary focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary text-xs bg-white"
                                />
                            </div>
                                <div className="flex gap-2">
                                    <button className="flex items-center gap-2 rounded-lg bg-white border border-border px-3 py-2 text-xs font-medium text-text-primary shadow-sm hover:bg-surface-elevated transition-colors">
                                        <Download className="h-3.5 w-3.5 text-muted-foreground" />
                                        Eksporter
                                    </button>
                                    <button className="flex items-center gap-2 rounded-lg bg-text-primary px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-text-primary transition-colors">
                                        <Mail className="h-3.5 w-3.5" />
                                        Send e-post til alle
                                    </button>
                                </div>
                        </div>

                        <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-surface/50 border-b border-border">
                                    <tr>
                                        <th className="px-6 py-3 text-xxs font-semibold uppercase tracking-wide text-muted-foreground">Navn</th>
                                        <th className="px-6 py-3 text-xxs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                                        <th className="px-6 py-3 text-xxs font-semibold uppercase tracking-wide text-muted-foreground">Kontakt</th>
                                        <th className="px-6 py-3 text-right text-xxs font-semibold uppercase tracking-wide text-muted-foreground">Handling</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-surface-elevated">
                                    {/* Row 1 */}
                                    <tr className="group hover:bg-card transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <img src="https://i.pravatar.cc/150?u=3" alt="" className="h-8 w-8 rounded-full object-cover ring-1 ring-border" />
                                                <span className="font-medium text-text-primary">Anna Hansen</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center rounded-md bg-status-confirmed-bg px-2 py-1 text-xxs font-medium text-status-confirmed-text">Betalt</span>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">anna.h@example.com</td>
                                        <td className="px-6 py-4 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="text-text-tertiary hover:text-text-primary p-1 rounded-md hover:bg-border" aria-label="Flere handlinger">
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
                                    <tr className="group hover:bg-card transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <img src="https://i.pravatar.cc/150?u=8" alt="" className="h-8 w-8 rounded-full object-cover ring-1 ring-border" />
                                                <span className="font-medium text-text-primary">Erik Johansen</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center rounded-md bg-status-waitlist-bg px-2 py-1 text-xxs font-medium text-status-waitlist-text">Faktura sendt</span>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">erik.j@example.com</td>
                                        <td className="px-6 py-4 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="text-text-tertiary hover:text-text-primary p-1 rounded-md hover:bg-border" aria-label="Flere handlinger">
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
                                    <tr className="group hover:bg-card transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 flex items-center justify-center rounded-full bg-surface-elevated text-muted-foreground text-xs font-medium ring-1 ring-border">KL</div>
                                                <span className="font-medium text-text-primary">Kari Larsen</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center rounded-md bg-status-confirmed-bg px-2 py-1 text-xxs font-medium text-status-confirmed-text">Betalt</span>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">kari.l@example.com</td>
                                        <td className="px-6 py-4 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="text-text-tertiary hover:text-text-primary p-1 rounded-md hover:bg-border" aria-label="Flere handlinger">
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
                            <div className="border-t border-border bg-surface/50 px-6 py-3 flex justify-between items-center">
                                 <span className="text-xxs text-muted-foreground">Viser <span className="font-medium text-text-primary">3</span> av <span className="font-medium text-text-primary">12</span> deltakere</span>
                                 <div className="flex gap-2">
                                     <button className="rounded-lg border border-border bg-white p-1.5 text-text-tertiary hover:border-ring hover:text-text-primary disabled:opacity-50 transition-all" aria-label="Forrige side"><ChevronLeft className="h-4 w-4" /></button>
                                     <button className="rounded-lg border border-border bg-white p-1.5 text-text-primary hover:border-ring transition-all" aria-label="Neste side"><ChevronRight className="h-4 w-4" /></button>
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
                            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
                                <h2 className="text-base font-semibold text-text-primary mb-1">Generell Informasjon</h2>
                                <p className="text-xs text-muted-foreground mb-6">Endre grunnleggende informasjon om kurset.</p>

                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-xs font-medium text-sidebar-foreground mb-1.5">Kursnavn</label>
                                        <Input
                                          type="text"
                                          defaultValue="Vinyasa Flow: Nybegynner"
                                          className="w-full rounded-xl border-0 py-2.5 px-3 text-black shadow-sm ring-1 ring-inset ring-border placeholder:text-text-tertiary focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary text-sm !bg-white"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-sidebar-foreground mb-1.5">Sted</label>
                                            <Input
                                              type="text"
                                              defaultValue="Sal A - Hovedstudio"
                                              className="w-full rounded-xl border-0 py-2.5 px-3 text-black shadow-sm ring-1 ring-inset ring-border placeholder:text-text-tertiary focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary text-sm !bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-sidebar-foreground mb-1.5">Maks kapasitet</label>
                                            <Input
                                              type="number"
                                              defaultValue="15"
                                              className="w-full rounded-xl border-0 py-2.5 px-3 text-black shadow-sm ring-1 ring-inset ring-border placeholder:text-text-tertiary focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary text-sm !bg-white"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-sidebar-foreground mb-1.5">Beskrivelse</label>
                                        <textarea
                                          rows={4}
                                          className="w-full rounded-xl border-0 py-2.5 px-3 text-text-primary shadow-sm ring-1 ring-inset ring-border placeholder:text-text-tertiary focus:ring-1 focus:ring-inset focus:ring-primary/20 focus:border-primary text-sm bg-white ios-ease resize-none focus:outline-none"
                                          defaultValue="Et dynamisk kurs som fokuserer på pust og bevegelse. Passer for alle nivåer, men er spesielt tilrettelagt for de som ønsker en grundig innføring."
                                        />
                                    </div>

                                    <div className="flex justify-end pt-2">
                                        <button className="h-10 rounded-lg bg-text-primary px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-sidebar-foreground ios-ease">
                                            Lagre endringer
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Danger Zone */}
                            <div className="rounded-2xl border border-red-200 bg-red-50/30 p-6">
                                <h2 className="text-base font-semibold text-status-error-text mb-1">Slett kurs</h2>
                                <p className="text-xs text-status-error-text/80 mb-6">Dette vil slette kurset og alle tilhørende data. Denne handlingen kan ikke angres.</p>

                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-status-error-text">Ønsker du å slette dette kurset permanent?</span>
                                    <button className="h-10 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-status-error-text shadow-sm hover:bg-red-50 hover:border-red-300 ios-ease">
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

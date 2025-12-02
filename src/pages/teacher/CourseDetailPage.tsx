import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { nb } from 'date-fns/locale';
import {
  ChevronRight,
  Calendar,
  MapPin,
  Users,
  Share2,
  ExternalLink,
  Filter,
  Plus,
  MoreHorizontal,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  BarChart2,
  Clock,
  Mail,
  TrendingUp,
  Crown,
  Ticket,
  CreditCard,
  CheckCircle2,
  Settings2,
  Minus,
  CalendarIcon,
  Check,
  Info
} from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchInput } from '@/components/ui/search-input';
import { mockDetailedCourses } from '@/data/mockData';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TIME_SLOTS_DEFAULT } from '@/utils/timeSlots';
import { formatDateNorwegian } from '@/utils/dateUtils';

type Tab = 'overview' | 'participants' | 'settings';

// Mock participants data
const participants = [
  { id: '1', name: 'Anna Hansen', email: 'anna@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Annie', status: 'paid', membership: 'premium', checkedIn: null },
  { id: '2', name: 'Marcus Berg', email: 'marcus@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus', status: 'pending', membership: 'klippekort', checkedIn: '08:45' },
  { id: '3', name: 'Julia Olsen', email: 'julia@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Julia', status: 'paid', membership: 'dropin', checkedIn: null },
];

const timeSlots = TIME_SLOTS_DEFAULT;

const CourseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [expandedItem, setExpandedItem] = useState<string | undefined>(undefined);
  const [openTimePopovers, setOpenTimePopovers] = useState<Record<string, boolean>>({});
  const [visibleWeeks, setVisibleWeeks] = useState(3);

  // Find the course by ID from mock data
  const courseData = mockDetailedCourses.find(c => c.id === id);

  // Fallback if course not found
  if (!courseData) {
    return (
      <SidebarProvider>
        <TeacherSidebar />
        <main className="flex-1 flex items-center justify-center h-screen bg-surface">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-text-primary mb-2">Kurs ikke funnet</h1>
            <p className="text-muted-foreground">Kurset med ID "{id}" finnes ikke.</p>
          </div>
        </main>
      </SidebarProvider>
    );
  }

  // Parse price from string (e.g., "2400 NOK" -> 2400)
  const priceNumber = parseInt(courseData.price.replace(/[^0-9]/g, '')) || 0;
  const estimatedRevenue = priceNumber * courseData.participants;

  // Split description into paragraphs
  const descriptionParts = courseData.description?.split('\n\n') || [''];

  // Map course data to component format
  const course = {
    title: courseData.title,
    status: courseData.status,
    date: courseData.timeSchedule,
    location: courseData.location,
    enrolled: courseData.participants,
    capacity: courseData.maxParticipants,
    price: priceNumber,
    estimatedRevenue: estimatedRevenue,
    description: descriptionParts[0] || '',
    description2: descriptionParts[1] || '',
    level: courseData.level || 'Alle',
    duration: courseData.duration,
    instructor: {
      name: courseData.instructor?.name || 'Ukjent instruktør',
      avatar: courseData.instructor?.avatar || '',
      role: 'Instruktør',
      rating: courseData.instructor?.rating || 0,
      classes: courseData.instructor?.classesCount || 0
    }
  };

  const [maxParticipants, setMaxParticipants] = useState(course.capacity);

  // Determine if this is a multi-day course (kursrekke with multiple weeks)
  const isMultiDayCourse = courseData.courseType === 'kursrekke' && (courseData.totalWeeks || 0) > 1;

  // Generate course weeks based on totalWeeks
  const generatedCourseWeeks = isMultiDayCourse && courseData.totalWeeks
    ? Array.from({ length: courseData.totalWeeks }, (_, i) => ({
        id: `week-${i + 1}`,
        weekNum: String(i + 1).padStart(2, '0'),
        title: courseData.title,
        status: i < (courseData.currentWeek || 0) - 1 ? 'completed' : i === (courseData.currentWeek || 1) - 1 ? 'active' : 'upcoming',
        date: `Uke ${i + 1}`,
        time: courseData.timeSchedule.split(', ')[1] || '18:00'
      }))
    : [];

  const handleTimeSelect = (weekId: string, _time: string) => {
    setOpenTimePopovers(prev => ({ ...prev, [weekId]: false }));
  };

  const toggleTimePopover = (weekId: string, isOpen: boolean) => {
    setOpenTimePopovers(prev => ({ ...prev, [weekId]: isOpen }));
  };

  const handleShowMore = () => {
    if (visibleWeeks >= generatedCourseWeeks.length) {
      setVisibleWeeks(3);
    } else {
      setVisibleWeeks(prev => Math.min(prev + 3, generatedCourseWeeks.length));
    }
  };

  const spotsLeft = course.capacity - course.enrolled;

  return (
    <SidebarProvider>
      <TeacherSidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-surface">

        {/* Header Section - same bg as sidebar */}
        <header className="bg-sidebar border-b border-border px-6 py-5 shrink-0 z-10">
          <div className="max-w-7xl mx-auto w-full">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
              <a href="/teacher/courses" className="hover:text-text-primary transition-colors">Kurs</a>
              <ChevronRight className="h-3 w-3 text-text-tertiary" />
              <span className="font-medium text-text-primary">{course.title}</span>
            </nav>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-text-primary tracking-tight">{course.title}</h1>
                {course.status === 'active' && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-status-confirmed-bg text-status-confirmed-text border border-status-confirmed-border">
                    <span className="w-1.5 h-1.5 rounded-full bg-success mr-1.5"></span>
                    Aktiv
                  </span>
                )}
                {course.status === 'upcoming' && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-status-waitlist-bg text-status-waitlist-text border border-status-waitlist-border">
                    <span className="w-1.5 h-1.5 rounded-full bg-warning mr-1.5"></span>
                    Kommende
                  </span>
                )}
                {course.status === 'completed' && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-surface-elevated text-muted-foreground border border-border">
                    <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary mr-1.5"></span>
                    Fullført
                  </span>
                )}
                {course.status === 'draft' && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-surface-elevated text-muted-foreground border border-border">
                    <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary mr-1.5"></span>
                    Utkast
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button variant="outline-soft" size="compact">
                  <Share2 className="h-3.5 w-3.5" />
                  Del kurs
                </Button>
                <Button variant="outline-soft" size="compact">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Vis side
                </Button>
              </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex gap-6 mt-8 -mb-5 overflow-x-auto">
              <button
                onClick={() => setActiveTab('overview')}
                className={`tab-btn group relative pb-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === 'overview' ? 'text-text-primary' : 'text-muted-foreground hover:text-text-primary'
                }`}
              >
                Oversikt
                <span className={`absolute bottom-0 left-0 h-[2px] w-full bg-text-primary rounded-t-full transition-transform ${
                  activeTab === 'overview' ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-50'
                }`}></span>
              </button>
              <button
                onClick={() => setActiveTab('participants')}
                className={`tab-btn group relative pb-3 text-sm font-medium transition-colors whitespace-nowrap ${
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
                className={`tab-btn group relative pb-3 text-sm font-medium transition-colors whitespace-nowrap ${
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
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto pb-10">

            {/* TAB 1: OVERSIKT (Overview) */}
            {activeTab === 'overview' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 auto-rows-min">

                {/* 1. Date Card */}
                <div className="bg-white rounded-xl border border-border p-5 shadow-sm flex flex-col justify-between h-32 hover:border-ring ios-ease col-span-1">
                  <div className="flex items-start justify-between">
                    <div className="h-8 w-8 rounded-lg bg-sidebar flex items-center justify-center text-sidebar-foreground">
                      <Calendar className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">Dato</span>
                    <p className="text-sm font-semibold text-text-primary mt-0.5">{course.date}</p>
                  </div>
                </div>

                {/* 2. Location Card */}
                <div className="bg-white rounded-xl border border-border p-5 shadow-sm flex flex-col justify-between h-32 hover:border-ring ios-ease col-span-1">
                  <div className="flex items-start justify-between">
                    <div className="h-8 w-8 rounded-lg bg-sidebar flex items-center justify-center text-sidebar-foreground">
                      <MapPin className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">Sted</span>
                    <p className="text-sm font-semibold text-text-primary mt-0.5">{course.location}</p>
                  </div>
                </div>

                {/* 3. Occupancy Card (Wide) */}
                <div className="bg-white rounded-xl border border-border p-5 shadow-sm flex flex-col justify-between h-32 hover:border-ring ios-ease col-span-1 md:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-sidebar flex items-center justify-center text-sidebar-foreground">
                        <Users className="h-4 w-4" />
                      </div>
                      <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">Påmeldinger</span>
                    </div>
                    <span className="inline-flex items-center px-2 py-1 rounded bg-status-confirmed-bg text-status-confirmed-text text-[10px] font-semibold tracking-wide">
                      {spotsLeft} plasser igjen
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-end justify-between">
                      <span className="text-2xl font-semibold text-text-primary tracking-tight">{course.enrolled}</span>
                      <span className="text-xs text-muted-foreground font-medium">Kap: {course.capacity}</span>
                    </div>
                    <div className="h-2 w-full bg-surface-elevated rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(course.enrolled / course.capacity) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* 4. About the Class (Large 2x2) */}
                <div className="bg-white rounded-xl border border-border p-6 shadow-sm flex flex-col col-span-1 md:col-span-2 row-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-text-primary">Om timen</h3>
                    <button className="text-text-tertiary hover:text-text-primary">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-text-secondary leading-relaxed mb-4">
                      {course.description}
                    </p>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {course.description2}
                    </p>
                  </div>

                  <div className="mt-6 pt-6 border-t border-border flex gap-3 flex-wrap">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-sidebar border border-border text-xs font-medium text-text-secondary">
                      <BarChart2 className="h-3.5 w-3.5 text-text-tertiary" />
                      Nivå: {course.level}
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-sidebar border border-border text-xs font-medium text-text-secondary">
                      <Clock className="h-3.5 w-3.5 text-text-tertiary" />
                      Varighet: {course.duration} min
                    </div>
                  </div>
                </div>

                {/* 5. Instructor Card (Tall) */}
                <div className="bg-white rounded-xl border border-border p-6 shadow-sm flex flex-col items-center text-center justify-center col-span-1 row-span-2">
                  <div className="relative mb-4">
                    <div className="h-20 w-20 rounded-full bg-surface-elevated p-1 border border-border">
                      {course.instructor.avatar ? (
                        <img src={course.instructor.avatar} alt="Instructor" className="h-full w-full rounded-full object-cover" />
                      ) : (
                        <div className="h-full w-full rounded-full bg-sidebar flex items-center justify-center text-text-secondary text-xl font-medium">
                          {course.instructor.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-white border border-border flex items-center justify-center shadow-sm">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary fill-primary/10" />
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-text-primary">{course.instructor.name}</h3>
                  <p className="text-xs text-muted-foreground mb-6">{course.instructor.role}</p>

                  <a href="#" className="w-full py-2 px-4 rounded-lg border border-border text-xs font-medium text-text-secondary hover:bg-sidebar hover:text-text-primary ios-ease text-center">
                    Se profil
                  </a>

                  <div className="mt-6 w-full pt-6 border-t border-border grid grid-cols-2 divide-x divide-border">
                    <div>
                      <span className="block text-[10px] font-medium text-text-tertiary uppercase">Vurdering</span>
                      <span className="block text-sm font-semibold text-text-primary mt-1">{course.instructor.rating}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-medium text-text-tertiary uppercase">Timer</span>
                      <span className="block text-sm font-semibold text-text-primary mt-1">{course.instructor.classes}</span>
                    </div>
                  </div>
                </div>

                {/* 6. Admin Actions Card */}
                <div className="bg-white rounded-xl border border-border p-5 shadow-sm flex flex-col justify-between col-span-1 h-full lg:h-auto lg:row-span-1">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wide">Administrasjon</h3>
                      <Settings2 className="h-4 w-4 text-text-tertiary" />
                    </div>
                    <div className="mb-5">
                      <span className="text-[10px] text-muted-foreground font-medium">Pris (Drop-in)</span>
                      <p className="text-xl font-semibold text-text-primary tracking-tight">{course.price} NOK</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button variant="outline-soft" size="compact" className="w-full justify-center">
                      <Mail className="h-3 w-3" />
                      Send melding
                    </Button>
                    <Button variant="outline-soft" size="compact" className="w-full justify-center">
                      <Clock className="h-3 w-3" />
                      Endre time
                    </Button>
                  </div>
                </div>

                {/* 7. Revenue/Stats Card */}
                <div className="bg-gradient-to-br from-primary to-primary-dark rounded-xl p-5 shadow-sm flex flex-col justify-between col-span-1 h-full hidden lg:flex">
                  <div className="flex items-start justify-between">
                    <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center text-white">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-medium text-white/60 bg-white/10 px-1.5 py-0.5 rounded">Denne måneden</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-medium text-white/70 uppercase tracking-wider">Omsetning</span>
                    <p className="text-lg font-semibold text-white mt-0.5">{course.estimatedRevenue.toLocaleString('nb-NO')} NOK</p>
                  </div>
                </div>

                {/* Course Plan - Only show for multi-day courses */}
                {isMultiDayCourse && generatedCourseWeeks.length > 0 && (
                  <div className="col-span-full mt-2">
                    <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
                      <div className="mb-6">
                        <h2 className="text-base font-semibold text-text-primary">Kursplan ({generatedCourseWeeks.length} uker)</h2>
                      </div>

                      <div className="relative">
                        {/* Timeline Line */}
                        <div className="absolute left-[27px] top-4 bottom-4 w-[1px] bg-border -z-10"></div>

                        <Accordion type="single" collapsible className="space-y-3" value={expandedItem} onValueChange={setExpandedItem}>
                          {generatedCourseWeeks.slice(0, visibleWeeks).map((week) => (
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
                            <div className="flex items-center px-4 cursor-pointer" onClick={() => setExpandedItem(expandedItem === week.id ? undefined : week.id)}>
                              <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg mr-4 ${
                                week.status === 'active'
                                  ? 'bg-primary text-white shadow-sm'
                                  : 'border border-border bg-surface-elevated text-muted-foreground group-hover:bg-white transition-colors'
                              }`}>
                                <span className={`text-xxs font-medium uppercase ${week.status === 'active' ? 'opacity-80' : ''}`}>Uke</span>
                                <span className="font-geist text-lg font-semibold">{week.weekNum}</span>
                              </div>

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

                              <AccordionTrigger className="p-2 text-muted-foreground hover:bg-surface-elevated hover:text-text-primary rounded-lg transition-all hover:no-underline [&>svg]:h-4 [&>svg]:w-4">
                                <span className="sr-only">Rediger</span>
                              </AccordionTrigger>
                            </div>

                            <AccordionContent className="px-4 pb-4 pt-0">
                              <div className="pl-[72px] pt-2 space-y-4">
                                <div className="h-px w-full bg-surface-elevated mb-4"></div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                  <button className="rounded-lg bg-text-primary px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-sidebar-foreground transition-colors">
                                    Lagre endringer
                                  </button>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>

                        <button
                          onClick={handleShowMore}
                          className="flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-ring py-3 text-xs font-medium text-muted-foreground hover:bg-surface-elevated hover:text-text-primary transition-colors mt-3"
                        >
                          {visibleWeeks >= generatedCourseWeeks.length ? (
                            <>
                              <ChevronUp className="h-3.5 w-3.5" />
                              Vis mindre
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3.5 w-3.5" />
                              Vis {Math.min(3, generatedCourseWeeks.length - visibleWeeks)} uker til
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: DELTAKERE (Participants) */}
            {activeTab === 'participants' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 flex flex-col gap-4">

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                  <div className="relative w-full sm:w-80">
                    <SearchInput
                      value={searchQuery}
                      onChange={setSearchQuery}
                      placeholder="Søk etter deltaker..."
                      aria-label="Søk etter deltaker"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline-soft" size="compact">
                      <Filter className="h-4 w-4" />
                      Filter
                    </Button>
                    <Button size="compact">
                      <Plus className="h-4 w-4" />
                      Legg til deltaker
                    </Button>
                  </div>
                </div>

                {/* Table Container */}
                <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-surface/50">
                          <th className="py-3 px-6 text-xs font-medium text-muted-foreground uppercase tracking-wider w-10">
                            <input type="checkbox" className="h-4 w-4 border-border rounded focus:ring-text-primary text-text-primary cursor-pointer" />
                          </th>
                          <th className="py-3 px-6 text-xxs font-semibold text-muted-foreground uppercase tracking-wider">Navn</th>
                          <th className="py-3 px-6 text-xxs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                          <th className="py-3 px-6 text-xxs font-semibold text-muted-foreground uppercase tracking-wider">Medlemskap</th>
                          <th className="py-3 px-6 text-xxs font-semibold text-muted-foreground uppercase tracking-wider text-right">Innsjekk</th>
                          <th className="py-3 px-6 text-xxs font-semibold text-muted-foreground uppercase tracking-wider text-right">Handling</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {participants.map((participant) => (
                          <tr key={participant.id} className="group hover:bg-surface/50 ios-ease">
                            <td className="py-4 px-6">
                              <input type="checkbox" className="h-4 w-4 border-border rounded focus:ring-text-primary text-text-primary cursor-pointer" />
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <img src={participant.avatar} className="h-8 w-8 rounded-full bg-surface-elevated border border-border" alt="" />
                                <div>
                                  <p className="text-sm font-medium text-text-primary">{participant.name}</p>
                                  <p className="text-xs text-muted-foreground">{participant.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              {participant.status === 'paid' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-status-confirmed-bg text-status-confirmed-text border border-status-confirmed-border">
                                  Betalt
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-surface-elevated text-muted-foreground border border-border">
                                  Venter
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              {participant.membership === 'premium' && (
                                <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
                                  <Crown className="h-3.5 w-3.5 text-warning" />
                                  Premium
                                </span>
                              )}
                              {participant.membership === 'klippekort' && (
                                <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
                                  <Ticket className="h-3.5 w-3.5 text-primary" />
                                  Klippekort (2 igjen)
                                </span>
                              )}
                              {participant.membership === 'dropin' && (
                                <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
                                  <CreditCard className="h-3.5 w-3.5 text-text-tertiary" />
                                  Drop-in
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-right">
                              {participant.checkedIn ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                                  {participant.checkedIn}
                                </span>
                              ) : (
                                <span className="text-xs text-text-tertiary italic">Ikke innsjekket</span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="p-1.5 hover:bg-surface-elevated rounded-md text-text-tertiary hover:text-text-primary ios-ease">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>Se profil</DropdownMenuItem>
                                  <DropdownMenuItem>Send melding</DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive">Fjern deltaker</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-6 py-4 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Viser {participants.length} av {course.enrolled} deltakere</span>
                    <div className="flex gap-2">
                      <button className="p-1.5 rounded-md border border-border hover:bg-surface-elevated text-text-tertiary disabled:opacity-50 transition-all" disabled>
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button className="p-1.5 rounded-md border border-border hover:bg-surface-elevated text-text-primary">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: INNSTILLINGER (Settings) */}
            {activeTab === 'settings' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-3xl mx-auto">

                <div className="space-y-6">
                  {/* General Settings */}
                  <div className="bg-white border border-border rounded-xl shadow-sm p-6">
                    <h3 className="text-base font-semibold text-text-primary mb-1">Generelt</h3>
                    <p className="text-xs text-muted-foreground mb-6">Grunnleggende informasjon om kurset.</p>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-sidebar-foreground mb-1.5">Navn på kurs</label>
                        <Input type="text" defaultValue={course.title} />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-sidebar-foreground mb-1.5">Beskrivelse</label>
                        <textarea
                          rows={4}
                          className="w-full p-3 rounded-lg border-0 ring-1 ring-inset ring-border text-sm focus:outline-none focus:ring-1 focus:ring-primary/20 bg-input-bg hover:ring-ring resize-none"
                          defaultValue={course.description}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-sidebar-foreground mb-1.5">Instruktør</label>
                          <div className="relative">
                            <select className="w-full h-11 pl-3 pr-8 rounded-lg border-0 ring-1 ring-inset ring-border text-sm focus:outline-none focus:ring-1 focus:ring-primary/20 bg-input-bg hover:ring-ring appearance-none">
                              <option>{course.instructor.name}</option>
                              <option>Sarah Johnson</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-sidebar-foreground mb-1.5">Kategori</label>
                          <div className="relative">
                            <select className="w-full h-11 pl-3 pr-8 rounded-lg border-0 ring-1 ring-inset ring-border text-sm focus:outline-none focus:ring-1 focus:ring-primary/20 bg-input-bg hover:ring-ring appearance-none">
                              <option>Yoga</option>
                              <option>Pilates</option>
                              <option>Styrke</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Time & Capacity */}
                  <div className="bg-white border border-border rounded-xl shadow-sm p-6">
                    <h3 className="text-base font-semibold text-text-primary mb-1">Tid og Kapasitet</h3>
                    <p className="text-xs text-muted-foreground mb-6">Administrer når og hvor kurset holdes.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-sidebar-foreground mb-1.5">Dato</label>
                        <div className="relative">
                          <Input type="text" defaultValue="24.10.2023" className="pl-9" />
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-sidebar-foreground mb-1.5">Start</label>
                          <Input type="text" defaultValue="09:00" className="text-center" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-sidebar-foreground mb-1.5">Slutt</label>
                          <Input type="text" defaultValue="10:00" className="text-center" />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-border my-5"></div>

                    <div className="flex items-center justify-between">
                      <div>
                        <label className="block text-sm font-medium text-text-primary">Maks antall deltakere</label>
                        <p className="text-xs text-muted-foreground">Begrens hvor mange som kan melde seg på.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setMaxParticipants(Math.max(1, maxParticipants - 1))}
                          className="h-8 w-8 rounded-md border border-border flex items-center justify-center hover:bg-surface-elevated text-text-secondary"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold text-text-primary">{maxParticipants}</span>
                        <button
                          onClick={() => setMaxParticipants(maxParticipants + 1)}
                          className="h-8 w-8 rounded-md border border-border flex items-center justify-center hover:bg-surface-elevated text-text-secondary"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="rounded-xl border border-status-error-border bg-status-error-bg/30 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-status-error-text">Avlys eller slett kurs</h3>
                      <p className="text-xs text-status-error-text/80 mt-1">Dette vil varsle alle påmeldte deltakere og refundere betalinger.</p>
                    </div>
                    <Button variant="outline-soft" size="compact" className="border-status-error-border text-status-error-text hover:bg-status-error-bg whitespace-nowrap">
                      Slett kurs
                    </Button>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="ghost" size="compact">Avbryt</Button>
                    <Button size="compact">Lagre endringer</Button>
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

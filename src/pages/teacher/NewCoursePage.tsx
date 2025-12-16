import { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { nb } from 'date-fns/locale';
import { formatDateNorwegian } from '@/utils/dateUtils';
import {
  Leaf,
  Menu,
  Layers,
  CalendarDays,
  Check,
  Clock,
  MapPin,
  ArrowRight,
  CalendarIcon,
  ChevronDown,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { TIME_SLOTS_DEFAULT } from '@/utils/timeSlots';
import { useAuth } from '@/contexts/AuthContext';
import { createCourse, fetchCourseStyles } from '@/services/courses';
import type { CourseStyle, CourseType as DBCourseType } from '@/types/database';

type CourseType = 'series' | 'single';

const timeSlots = TIME_SLOTS_DEFAULT;

interface FormErrors {
  title?: string;
  startDate?: string;
  startTime?: string;
  duration?: string;
  location?: string;
  price?: string;
  capacity?: string;
}

const NewCoursePage = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useAuth();
  const [courseType, setCourseType] = useState<CourseType>('series');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState('');
  const [isTimeOpen, setIsTimeOpen] = useState(false);
  const [duration, setDuration] = useState('60');
  const [weeks, setWeeks] = useState('1');
  const [isWeeksOpen, setIsWeeksOpen] = useState(false);
  const [eventDays, setEventDays] = useState('1');
  const [isDaysOpen, setIsDaysOpen] = useState(false);
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [capacity, setCapacity] = useState('');
  const [description, setDescription] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Style selection
  const [styles, setStyles] = useState<CourseStyle[]>([]);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [isStyleOpen, setIsStyleOpen] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch styles on mount
  useEffect(() => {
    async function loadStyles() {
      const { data } = await fetchCourseStyles();
      if (data) {
        setStyles(data);
      }
    }
    loadStyles();
  }, []);

  // Validation logic
  const errors = useMemo<FormErrors>(() => {
    const errs: FormErrors = {};

    if (!title.trim()) {
      errs.title = 'Tittel er påkrevd';
    }

    if (!startDate) {
      errs.startDate = 'Dato er påkrevd';
    }

    if (!startTime) {
      errs.startTime = 'Tidspunkt er påkrevd';
    }

    if (!duration || parseInt(duration) <= 0) {
      errs.duration = 'Varighet må være større enn 0';
    }

    if (!location.trim()) {
      errs.location = 'Sted er påkrevd';
    }

    if (!price || parseInt(price) < 0) {
      errs.price = 'Pris er påkrevd';
    }

    if (!capacity || parseInt(capacity) <= 0) {
      errs.capacity = 'Antall plasser er påkrevd';
    }

    return errs;
  }, [title, startDate, startTime, duration, location, price, capacity]);

  const isFormValid = Object.keys(errors).length === 0;

  const showError = (field: keyof FormErrors) => {
    return (touched[field] || submitAttempted) && errors[field];
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleCancel = () => {
    navigate('/teacher/schedule');
  };

  const handlePublish = async () => {
    setSubmitAttempted(true);
    setSubmitError(null);

    if (!isFormValid) {
      return;
    }

    if (!currentOrganization?.id) {
      setSubmitError('Ingen organisasjon valgt');
      return;
    }

    setIsSubmitting(true);

    try {
      // Map form courseType to database course_type
      const dbCourseType: DBCourseType = courseType === 'series' ? 'course-series' : 'event';

      // Format time schedule (day + time)
      const dayName = startDate ? new Intl.DateTimeFormat('nb-NO', { weekday: 'long' }).format(startDate) : '';
      const timeSchedule = `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}er, ${startTime}`;

      const courseData = {
        organization_id: currentOrganization.id,
        title: title.trim(),
        description: description.trim() || null,
        course_type: dbCourseType,
        start_date: startDate?.toISOString().split('T')[0],
        time_schedule: timeSchedule,
        duration: parseInt(duration),
        total_weeks: courseType === 'series' ? parseInt(weeks) : null,
        location: location.trim(),
        price: parseInt(price),
        max_participants: parseInt(capacity),
        status: 'upcoming' as const,
        style_id: selectedStyleId,
      };

      const { error } = await createCourse(courseData);

      if (error) {
        setSubmitError(error.message || 'Kunne ikke opprette kurset');
        return;
      }

      // Navigate to courses list on success
      navigate('/teacher/courses');
    } catch (err) {
      setSubmitError('En feil oppstod');
      console.error('Error creating course:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SidebarProvider>
      <TeacherSidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-surface">
        {/* Mobile Header */}
        <div className="flex md:hidden items-center justify-between p-6 border-b border-border bg-surface/80 backdrop-blur-xl z-30 shrink-0">
          <div className="flex items-center gap-3">
            <Leaf className="h-5 w-5 text-primary" />
            <span className="font-geist text-base font-semibold text-text-primary">Ease</span>
          </div>
          <SidebarTrigger>
            <Menu className="h-6 w-6 text-muted-foreground" />
          </SidebarTrigger>
        </div>

        {/* Header Area */}
        <div className="px-8 py-6 border-b border-border bg-surface">
          <div className="mx-auto max-w-3xl w-full">
            <Breadcrumb className="mb-2">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/teacher/schedule">Timeplan</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Nytt kurs</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="font-geist text-2xl font-medium text-text-primary tracking-tight">
              Opprett nytt kurs
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sett opp et nytt kurs eller workshop i timeplanen.
            </p>
          </div>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          <div className="mx-auto max-w-3xl w-full space-y-8 pb-12">
            {/* Step 1: Course Type Selection */}
            <section className="rounded-2xl border border-border bg-white p-1 shadow-sm">
              <div className="px-6 pt-5 pb-4">
                <h2 className="text-base font-semibold text-text-primary">Velg type</h2>
                <p className="text-xs text-muted-foreground mt-1">Velg om du vil opprette en kursrekke eller enkeltkurs.</p>
              </div>
              <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Option A: Kursrekke */}
                <button
                  type="button"
                  onClick={() => setCourseType('series')}
                  className={`relative flex flex-col gap-3 p-5 rounded-xl text-left cursor-pointer group transition-all ${
                    courseType === 'series'
                      ? 'bg-surface ring-2 ring-text-secondary border border-transparent shadow-sm'
                      : 'border border-border bg-input-bg hover:bg-surface hover:border-ring opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                        courseType === 'series'
                          ? 'bg-surface-elevated text-text-primary'
                          : 'bg-white border border-border text-muted-foreground'
                      }`}
                    >
                      <Layers className="h-5 w-5" />
                    </div>
                    <div
                      className={`h-5 w-5 rounded-full flex items-center justify-center ${
                        courseType === 'series'
                          ? 'bg-text-primary text-white'
                          : 'border border-border bg-white'
                      }`}
                    >
                      {courseType === 'series' && <Check className="h-3 w-3" />}
                    </div>
                  </div>
                  <div>
                    <h3
                      className={`text-base font-semibold ${
                        courseType === 'series' ? 'text-text-primary' : 'text-sidebar-foreground'
                      }`}
                    >
                      Kursrekke
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      For kurs som går over flere uker med faste deltakere.
                    </p>
                  </div>
                </button>

                {/* Option B: Enkeltkurs */}
                <button
                  type="button"
                  onClick={() => setCourseType('single')}
                  className={`relative flex flex-col gap-3 p-5 rounded-xl text-left cursor-pointer group transition-all ${
                    courseType === 'single'
                      ? 'bg-surface ring-2 ring-text-secondary border border-transparent shadow-sm'
                      : 'border border-border bg-input-bg hover:bg-surface hover:border-ring opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                        courseType === 'single'
                          ? 'bg-surface-elevated text-text-primary'
                          : 'bg-white border border-border text-muted-foreground'
                      }`}
                    >
                      <CalendarDays className="h-5 w-5" />
                    </div>
                    <div
                      className={`h-5 w-5 rounded-full flex items-center justify-center ${
                        courseType === 'single'
                          ? 'bg-text-primary text-white'
                          : 'border border-border bg-white'
                      }`}
                    >
                      {courseType === 'single' && <Check className="h-3 w-3" />}
                    </div>
                  </div>
                  <div>
                    <h3
                      className={`text-base font-semibold ${
                        courseType === 'single' ? 'text-text-primary' : 'text-sidebar-foreground'
                      }`}
                    >
                      Enkeltkurs
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      Drop-in timer, workshops eller engangsarrangementer.
                    </p>
                  </div>
                </button>
              </div>
            </section>

            {/* Step 2: Course Details */}
            <section className="rounded-2xl border border-border bg-white p-1 shadow-sm">
              <div className="px-6 pt-5 pb-4">
                <h2 className="text-base font-semibold text-text-primary">Detaljer</h2>
                <p className="text-xs text-muted-foreground mt-1">Angi navn, stil, tidspunkt, varighet og sted for kurset.</p>
              </div>
              <div className="px-6 pb-6 space-y-6">
              {/* Title and Style */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Title */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-sidebar-foreground mb-1.5">
                    Tittel <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="F.eks. Morgenyoga for nybegynnere"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={() => handleBlur('title')}
                    className={`w-full h-11 rounded-xl border px-4 text-text-primary placeholder-text-tertiary text-sm bg-input-bg transition-all focus:border-ring focus:outline-none focus:ring-4 focus:ring-border/30 focus:bg-white hover:border-ring ${
                      showError('title') ? 'border-destructive' : 'border-border'
                    }`}
                  />
                  {showError('title') && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.title}
                    </p>
                  )}
                </div>

                {/* Style Selection */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-sidebar-foreground mb-1.5">
                    Yogastil
                  </label>
                  <Popover open={isStyleOpen} onOpenChange={setIsStyleOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center justify-between w-full h-11 rounded-xl border border-border px-4 text-text-primary text-sm bg-input-bg transition-all text-left focus:border-ring focus:outline-none focus:ring-4 focus:ring-border/30 focus:bg-white hover:border-ring"
                      >
                        <span className={selectedStyleId ? 'text-text-primary' : 'text-text-tertiary'}>
                          {selectedStyleId
                            ? styles.find(s => s.id === selectedStyleId)?.name || 'Velg stil'
                            : 'Velg stil (valgfritt)'}
                        </span>
                        <ChevronDown className={`h-4 w-4 text-text-tertiary transition-transform ${isStyleOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-[300px] p-2 max-h-[280px] overflow-y-auto custom-scrollbar" showOverlay>
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStyleId(null);
                            setIsStyleOpen(false);
                          }}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                            !selectedStyleId
                              ? 'bg-text-primary text-white'
                              : 'text-sidebar-foreground hover:bg-surface-elevated'
                          }`}
                        >
                          <span>Ingen (velg senere)</span>
                          {!selectedStyleId && <Check className="h-4 w-4" />}
                        </button>
                        {styles.map((style) => (
                          <button
                            key={style.id}
                            type="button"
                            onClick={() => {
                              setSelectedStyleId(style.id);
                              setIsStyleOpen(false);
                            }}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                              selectedStyleId === style.id
                                ? 'bg-text-primary text-white'
                                : 'text-sidebar-foreground hover:bg-surface-elevated'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {style.color && (
                                <span
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: style.color }}
                                />
                              )}
                              <span>{style.name}</span>
                            </div>
                            {selectedStyleId === style.id && <Check className="h-4 w-4" />}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-sidebar-foreground mb-1.5">
                    Beskrivelse
                  </label>
                  <textarea
                    placeholder="Beskriv kurset kort..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-border px-4 py-3 text-text-primary placeholder-text-tertiary text-sm bg-input-bg transition-all focus:border-ring focus:outline-none focus:ring-4 focus:ring-border/30 focus:bg-white hover:border-ring resize-none"
                  />
                </div>
              </div>

              {/* Grid for Logistics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Start Date - Calendar Picker */}
                <div className="group">
                  <label className="block text-xs font-medium text-sidebar-foreground mb-1.5">
                    {courseType === 'single' ? 'Dato' : 'Startdato'} <span className="text-red-500">*</span>
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        onBlur={() => handleBlur('startDate')}
                        className={`flex items-center justify-between w-full h-11 rounded-xl border px-4 text-text-primary text-sm bg-input-bg transition-all text-left focus:border-ring focus:outline-none focus:ring-4 focus:ring-border/30 focus:bg-white hover:border-ring ${
                          showError('startDate') ? 'border-destructive' : 'border-border'
                        }`}
                      >
                        <span className={startDate ? 'text-text-primary' : 'text-text-tertiary'}>
                          {startDate ? formatDateNorwegian(startDate) : 'Velg dato'}
                        </span>
                        <CalendarIcon className={`h-4 w-4 ${showError('startDate') ? 'text-red-500' : 'text-text-tertiary'}`} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="p-0" showOverlay>
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => {
                          setStartDate(date);
                          setTouched(prev => ({ ...prev, startDate: true }));
                        }}
                        locale={nb}
                        className="rounded-2xl"
                      />
                    </PopoverContent>
                  </Popover>
                  {showError('startDate') && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.startDate}
                    </p>
                  )}
                </div>

                {/* Start Time - Custom Dropdown */}
                <div>
                  <label className="block text-xs font-medium text-sidebar-foreground mb-1.5">
                    Tidspunkt <span className="text-red-500">*</span>
                  </label>
                  <Popover open={isTimeOpen} onOpenChange={setIsTimeOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        onBlur={() => handleBlur('startTime')}
                        className={`flex items-center justify-between w-full h-11 rounded-xl border px-4 text-text-primary text-sm bg-input-bg transition-all text-left focus:border-ring focus:outline-none focus:ring-4 focus:ring-border/30 focus:bg-white hover:border-ring ${
                          showError('startTime') ? 'border-destructive' : 'border-border'
                        }`}
                      >
                        <span className={startTime ? 'text-text-primary' : 'text-text-tertiary'}>
                          {startTime || 'Velg tid'}
                        </span>
                        <div className="flex items-center gap-2">
                          <Clock className={`h-4 w-4 ${showError('startTime') ? 'text-red-500' : 'text-text-tertiary'}`} />
                          <ChevronDown className={`h-4 w-4 ${showError('startTime') ? 'text-red-500' : 'text-text-tertiary'} transition-transform ${isTimeOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-[200px] p-2 max-h-[280px] overflow-y-auto custom-scrollbar" showOverlay>
                      <div className="flex flex-col gap-0.5">
                        {timeSlots.map((time) => (
                          <button
                            key={time}
                            type="button"
                            onClick={() => {
                              setStartTime(time);
                              setIsTimeOpen(false);
                              setTouched(prev => ({ ...prev, startTime: true }));
                            }}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                              startTime === time
                                ? 'bg-text-primary text-white'
                                : 'text-sidebar-foreground hover:bg-surface-elevated'
                            }`}
                          >
                            <span>{time}</span>
                            {startTime === time && <Check className="h-4 w-4" />}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  {showError('startTime') && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.startTime}
                    </p>
                  )}
                </div>

                {/* Duration - Text Input */}
                <div>
                  <label className="block text-xs font-medium text-sidebar-foreground mb-1.5">
                    Varighet (minutter) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="60"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      onBlur={() => handleBlur('duration')}
                      className={`w-full h-11 rounded-xl border pl-4 pr-12 text-text-primary placeholder-text-tertiary text-sm bg-input-bg transition-all focus:border-ring focus:outline-none focus:ring-4 focus:ring-border/30 focus:bg-white hover:border-ring ${
                        showError('duration') ? 'border-destructive' : 'border-border'
                      }`}
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className={`text-xs font-medium ${showError('duration') ? 'text-red-500' : 'text-muted-foreground'}`}>min</span>
                    </div>
                  </div>
                  {showError('duration') && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.duration}
                    </p>
                  )}
                </div>

                {/* Number of Weeks (series) or Days (single) */}
                {courseType === 'series' ? (
                  <div>
                    <label className="block text-xs font-medium text-sidebar-foreground mb-1.5">
                      Antall uker
                    </label>
                    <Popover open={isWeeksOpen} onOpenChange={setIsWeeksOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="flex items-center justify-between w-full h-11 rounded-xl border border-border px-4 text-text-primary text-sm bg-input-bg transition-all text-left focus:border-ring focus:outline-none focus:ring-4 focus:ring-border/30 focus:bg-white hover:border-ring"
                        >
                          <span className="text-text-primary">
                            {weeks}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">{parseInt(weeks) === 1 ? 'uke' : 'uker'}</span>
                            <ChevronDown className={`h-4 w-4 text-text-tertiary transition-transform ${isWeeksOpen ? 'rotate-180' : ''}`} />
                          </div>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-[200px] p-2 max-h-[280px] overflow-y-auto custom-scrollbar" showOverlay>
                        <div className="flex flex-col gap-0.5">
                          {Array.from({ length: 16 }, (_, i) => i + 1).map((week) => (
                            <button
                              key={week}
                              type="button"
                              onClick={() => {
                                setWeeks(week.toString());
                                setIsWeeksOpen(false);
                              }}
                              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                                weeks === week.toString()
                                  ? 'bg-text-primary text-white'
                                  : 'text-sidebar-foreground hover:bg-surface-elevated'
                              }`}
                            >
                              <span>{week} {week === 1 ? 'uke' : 'uker'}</span>
                              {weeks === week.toString() && <Check className="h-4 w-4" />}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-sidebar-foreground mb-1.5">
                      Antall dager
                    </label>
                    <Popover open={isDaysOpen} onOpenChange={setIsDaysOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="flex items-center justify-between w-full h-11 rounded-xl border border-border px-4 text-text-primary text-sm bg-input-bg transition-all text-left focus:border-ring focus:outline-none focus:ring-4 focus:ring-border/30 focus:bg-white hover:border-ring"
                        >
                          <span className="text-text-primary">
                            {eventDays}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">{parseInt(eventDays) === 1 ? 'dag' : 'dager'}</span>
                            <ChevronDown className={`h-4 w-4 text-text-tertiary transition-transform ${isDaysOpen ? 'rotate-180' : ''}`} />
                          </div>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-[200px] p-2 max-h-[280px] overflow-y-auto custom-scrollbar" showOverlay>
                        <div className="flex flex-col gap-0.5">
                          {Array.from({ length: 10 }, (_, i) => i + 1).map((day) => (
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                setEventDays(day.toString());
                                setIsDaysOpen(false);
                              }}
                              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                                eventDays === day.toString()
                                  ? 'bg-text-primary text-white'
                                  : 'text-sidebar-foreground hover:bg-surface-elevated'
                              }`}
                            >
                              <span>{day} {day === 1 ? 'dag' : 'dager'}</span>
                              {eventDays === day.toString() && <Check className="h-4 w-4" />}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>

              {/* Grid for Location & Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Location */}
                <div className="sm:col-span-2 md:col-span-1">
                  <label className="block text-xs font-medium text-sidebar-foreground mb-1.5">
                    Sted / Lokale <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Skriv inn sted"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      onBlur={() => handleBlur('location')}
                      className={`w-full h-11 rounded-xl border pl-10 pr-4 text-text-primary placeholder-text-tertiary text-sm bg-input-bg transition-all focus:border-ring focus:outline-none focus:ring-4 focus:ring-border/30 focus:bg-white hover:border-ring ${
                        showError('location') ? 'border-destructive' : 'border-border'
                      }`}
                    />
                    <MapPin className={`absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 ${showError('location') ? 'text-red-500' : 'text-text-tertiary'}`} />
                  </div>
                  {showError('location') && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.location}
                    </p>
                  )}
                </div>

                {/* Price */}
                <div className="sm:col-span-2 md:col-span-1">
                  <label className="block text-xs font-medium text-sidebar-foreground mb-1.5">
                    Totalpris <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      onBlur={() => handleBlur('price')}
                      className={`w-full h-11 rounded-xl border pl-4 pr-12 text-text-primary placeholder-text-tertiary text-sm bg-input-bg transition-all focus:border-ring focus:outline-none focus:ring-4 focus:ring-border/30 focus:bg-white hover:border-ring ${
                        showError('price') ? 'border-destructive' : 'border-border'
                      }`}
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className={`text-xs font-medium ${showError('price') ? 'text-red-500' : 'text-muted-foreground'}`}>NOK</span>
                    </div>
                  </div>
                  {showError('price') && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.price}
                    </p>
                  )}
                </div>

                {/* Capacity */}
                <div className="sm:col-span-2 md:col-span-1">
                  <label className="block text-xs font-medium text-sidebar-foreground mb-1.5">
                    Antall plasser <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0"
                      min="1"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      onBlur={() => handleBlur('capacity')}
                      className={`w-full h-11 rounded-xl border pl-4 pr-16 text-text-primary placeholder-text-tertiary text-sm bg-input-bg transition-all focus:border-ring focus:outline-none focus:ring-4 focus:ring-border/30 focus:bg-white hover:border-ring ${
                        showError('capacity') ? 'border-destructive' : 'border-border'
                      }`}
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className={`text-xs font-medium ${showError('capacity') ? 'text-red-500' : 'text-muted-foreground'}`}>plasser</span>
                    </div>
                  </div>
                  {showError('capacity') && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.capacity}
                    </p>
                  )}
                </div>
              </div>
              </div>
            </section>

            {/* Step 3: Participant Info - Hidden for now */}
            {/* <section>
              <div className="flex items-center justify-between pt-4 border-t border-border mb-4">
                <h2 className="text-sm font-medium text-sidebar-foreground uppercase tracking-wide">
                  3. Deltakerinformasjon
                </h2>
              </div>

              <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3 mb-5">
                  <div className="p-2 bg-gray-100 rounded-lg text-muted-foreground">
                    <UserCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-text-primary">Påkrevde felt</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Følgende informasjon må fylles ut av deltakeren ved påmelding.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8">
                  {requiredFields.map((field, index) => (
                    <div
                      key={field.id}
                      className={`flex items-center justify-between py-2 ${
                        index < requiredFields.length - 2
                          ? 'border-b border-surface-elevated sm:border-0'
                          : ''
                      }`}
                    >
                      <span className="text-sm text-sidebar-foreground">{field.label}</span>
                      <div className="flex items-center gap-2 opacity-60 cursor-not-allowed">
                        <span className="text-xxs font-medium text-muted-foreground uppercase">
                          Påkrevd
                        </span>
                        <div className="relative inline-flex h-5 w-9 items-center rounded-full bg-text-primary">
                          <span className="translate-x-4 inline-block h-3.5 w-3.5 transform rounded-full bg-white transition" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section> */}
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="p-6 border-t border-border bg-white/80 backdrop-blur-md z-10">
          <div className="max-w-3xl mx-auto flex flex-col gap-3">
            {submitAttempted && !isFormValid && (
              <div className="flex items-center justify-center gap-2 text-sm text-red-500">
                <AlertCircle className="h-4 w-4" />
                <span>Vennligst fyll ut alle påkrevde felt</span>
              </div>
            )}
            {submitError && (
              <div className="flex items-center justify-center gap-2 text-sm text-red-500">
                <AlertCircle className="h-4 w-4" />
                <span>{submitError}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="compact"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Avbryt
              </Button>
              <Button
                size="compact"
                onClick={handlePublish}
                disabled={isSubmitting || (submitAttempted && !isFormValid)}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Oppretter...</span>
                  </>
                ) : (
                  <>
                    <span>Publiser kurs</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </SidebarProvider>
  );
};

export default NewCoursePage;

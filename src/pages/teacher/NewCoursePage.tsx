import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { nb } from 'date-fns/locale';
import { addDays, format } from 'date-fns';
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
  ChevronRight,
  AlertCircle,
  Loader2,
  Users,
  CalendarClock,
  X,
} from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TIME_SLOTS_DEFAULT } from '@/utils/timeSlots';
import { useAuth } from '@/contexts/AuthContext';
import { createCourse, updateCourse, fetchCourseStyles, type SessionTimeOverride } from '@/services/courses';
import { uploadCourseImage } from '@/services/storage';
import { ImageUpload } from '@/components/ui/image-upload';
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
  // Session times for multi-day events (index 0 is always primary from startTime)
  const [sessionTimes, setSessionTimes] = useState<Record<number, string>>({});
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [capacity, setCapacity] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Style selection
  const [styles, setStyles] = useState<CourseStyle[]>([]);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [isStyleOpen, setIsStyleOpen] = useState(false);

  // Difficulty level
  const [level, setLevel] = useState<'alle' | 'nybegynner' | 'viderekommen'>('nybegynner');

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

  // Refs for scroll-to-error
  const titleRef = useRef<HTMLInputElement>(null);
  const startDateRef = useRef<HTMLButtonElement>(null);
  const startTimeRef = useRef<HTMLButtonElement>(null);
  const durationRef = useRef<HTMLInputElement>(null);
  const locationRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const capacityRef = useRef<HTMLInputElement>(null);

  // Field refs map for scroll-to-error
  const fieldRefs: Record<keyof FormErrors, React.RefObject<HTMLInputElement | HTMLButtonElement | null>> = {
    title: titleRef,
    startDate: startDateRef,
    startTime: startTimeRef,
    duration: durationRef,
    location: locationRef,
    price: priceRef,
    capacity: capacityRef,
  };

  // Validation logic with actionable Norwegian error messages
  const errors = useMemo<FormErrors>(() => {
    const errs: FormErrors = {};

    if (!title.trim()) {
      errs.title = 'Skriv inn en tittel.';
    }

    if (!startDate) {
      errs.startDate = 'Velg en startdato.';
    }

    if (!startTime) {
      errs.startTime = 'Velg et tidspunkt.';
    }

    if (!duration || parseInt(duration) <= 0) {
      errs.duration = 'Angi varighet (minst 1 minutt).';
    }

    if (!location.trim()) {
      errs.location = 'Skriv inn et sted.';
    }

    if (price === '' || parseInt(price) < 0) {
      errs.price = 'Angi en pris (minst 0 NOK).';
    }

    if (!capacity || parseInt(capacity) < 1) {
      errs.capacity = 'Angi antall plasser (minst 1).';
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

  // Generate session dates for multi-day events
  const sessionDates = useMemo(() => {
    if (!startDate || courseType !== 'single') return [];
    const numDays = parseInt(eventDays);
    if (numDays <= 1) return [];

    return Array.from({ length: numDays }, (_, i) => {
      const date = addDays(startDate, i);
      return {
        dayNumber: i + 1,
        date,
        formattedDate: format(date, 'EEE, d. MMM', { locale: nb }),
        time: i === 0 ? startTime : (sessionTimes[i] || startTime),
        isPrimary: i === 0,
      };
    });
  }, [startDate, eventDays, courseType, startTime, sessionTimes]);

  // Update session time for a specific day
  const updateSessionTime = (dayIndex: number, time: string) => {
    setSessionTimes(prev => ({
      ...prev,
      [dayIndex]: time,
    }));
  };

  // Reset session time to primary time
  const resetSessionTime = (dayIndex: number) => {
    setSessionTimes(prev => {
      const newTimes = { ...prev };
      delete newTimes[dayIndex];
      return newTimes;
    });
  };

  const handleCancel = () => {
    navigate('/teacher/schedule');
  };

  const handlePublish = async () => {
    setSubmitAttempted(true);
    setSubmitError(null);

    if (!isFormValid) {
      // Scroll to first invalid field and focus it
      const firstErrorField = (Object.keys(errors) as (keyof FormErrors)[])[0];
      if (firstErrorField && fieldRefs[firstErrorField]?.current) {
        fieldRefs[firstErrorField].current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          fieldRefs[firstErrorField].current?.focus();
        }, 300);
      }
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
      // For course series (recurring weekly): use plural form "Onsdager, 18:00" (same day each week)
      // For events (single or multi-day): use singular form "Onsdag, 18:00" (starting day only)
      const dayName = startDate ? new Intl.DateTimeFormat('nb-NO', { weekday: 'long' }).format(startDate) : '';
      const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
      const timeSchedule = courseType === 'series'
        ? `${capitalizedDay}er, ${startTime}`
        : `${capitalizedDay}, ${startTime}`;

      const courseData = {
        organization_id: currentOrganization.id,
        title: title.trim(),
        description: description.trim() || null,
        course_type: dbCourseType,
        start_date: startDate
          ? `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`
          : undefined,
        time_schedule: timeSchedule,
        duration: parseInt(duration),
        total_weeks: courseType === 'series' ? parseInt(weeks) : null,
        location: location.trim(),
        price: parseInt(price),
        max_participants: parseInt(capacity),
        status: 'upcoming' as const,
        style_id: selectedStyleId,
        level: level,
      };

      // Build session time overrides for multi-day events
      const sessionTimeOverrides: SessionTimeOverride[] = Object.entries(sessionTimes).map(
        ([dayIndex, time]) => ({
          dayIndex: parseInt(dayIndex),
          time,
        })
      );

      const { data: createdCourse, error } = await createCourse(courseData, {
        eventDays: courseType === 'single' ? parseInt(eventDays) : undefined,
        sessionTimeOverrides: sessionTimeOverrides.length > 0 ? sessionTimeOverrides : undefined,
      });

      if (error || !createdCourse) {
        setSubmitError(error?.message || 'Kunne ikke opprette kurset');
        return;
      }

      // Upload image if one was selected
      if (imageFile) {
        const { url: imageUrl, error: uploadError } = await uploadCourseImage(
          createdCourse.id,
          imageFile
        );

        if (!uploadError && imageUrl) {
          // Update course with image URL
          await updateCourse(createdCourse.id, { image_url: imageUrl });
        }
        // If image upload fails, course is still created - just continue
      }

      // Navigate to course detail page on success
      navigate(`/teacher/courses/${createdCourse.id}`);
    } catch {
      setSubmitError('En feil oppstod');
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

        {/* Header / Breadcrumbs - Sticky */}
        <header className="bg-white border-b border-border sticky top-0 z-10 shrink-0">
          <div className="max-w-3xl mx-auto px-6 py-4">
            <nav className="flex items-center text-xs text-muted-foreground mb-2 space-x-2">
              <Link to="/teacher/schedule" className="hover:text-text-primary cursor-pointer transition-colors">
                Timeplan
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-text-primary font-medium">Nytt kurs</span>
            </nav>
            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
                  Opprett nytt kurs
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Sett opp et nytt kurs eller workshop i timeplanen.
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-3xl mx-auto px-6 py-10 space-y-12 pb-32">

            {/* Section 1: Course Type Selection */}
            <section>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-text-primary">Velg type</h2>
                <p className="text-sm text-muted-foreground">Velg om du vil opprette en kursrekke eller enkeltkurs.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option A: Kursrekke */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={courseType === 'series'}
                    onClick={() => setCourseType('series')}
                    className={`relative flex flex-col gap-3 p-5 rounded-xl text-left cursor-pointer group transition-all focus:outline-none focus:ring-4 focus:ring-border/30 ${
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
                        <Layers className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div
                        className={`h-5 w-5 rounded-full flex items-center justify-center ${
                          courseType === 'series'
                            ? 'bg-text-primary text-white'
                            : 'border border-border bg-white'
                        }`}
                      >
                        {courseType === 'series' && <Check className="h-3 w-3" aria-hidden="true" />}
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
                        Best for kurs over flere uker med faste deltakere.
                      </p>
                    </div>
                    {courseType === 'series' && <span className="sr-only">Valgt</span>}
                  </button>

                  {/* Option B: Enkeltkurs */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={courseType === 'single'}
                    onClick={() => setCourseType('single')}
                    className={`relative flex flex-col gap-3 p-5 rounded-xl text-left cursor-pointer group transition-all focus:outline-none focus:ring-4 focus:ring-border/30 ${
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
                        <CalendarDays className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div
                        className={`h-5 w-5 rounded-full flex items-center justify-center ${
                          courseType === 'single'
                            ? 'bg-text-primary text-white'
                            : 'border border-border bg-white'
                        }`}
                      >
                        {courseType === 'single' && <Check className="h-3 w-3" aria-hidden="true" />}
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
                        Best for drop-in, workshop eller engangsarrangement.
                      </p>
                    </div>
                    {courseType === 'single' && <span className="sr-only">Valgt</span>}
                  </button>
                </div>
            </section>

            {/* Section 2: Details */}
            <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-border">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-text-primary">Detaljer</h2>
                <p className="text-sm text-muted-foreground">Angi informasjon om kurset.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Left Column: Title, Style, Description */}
                <div className="md:col-span-7 space-y-5">
                  {/* Title */}
                  <div>
                    <label htmlFor="course-title" className="block text-xs font-medium text-sidebar-foreground mb-1.5">
                      Tittel <span className="text-destructive">*</span>
                    </label>
                    <input
                      ref={titleRef}
                      id="course-title"
                      type="text"
                      placeholder="F.eks. Morgenyoga"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onBlur={() => handleBlur('title')}
                      aria-describedby={showError('title') ? 'title-error' : undefined}
                      aria-invalid={showError('title') ? 'true' : undefined}
                      aria-required="true"
                      className={`w-full h-10 rounded-xl border px-3 text-text-primary placeholder:text-text-tertiary text-sm bg-input-bg transition-all focus:border-ring focus:outline-none focus:ring-4 focus:ring-border/30 focus:bg-white hover:border-ring ${
                        showError('title') ? 'border-destructive' : 'border-border'
                      }`}
                    />
                    {showError('title') && (
                      <p id="title-error" className="mt-1.5 text-xs text-destructive flex items-center gap-1" role="alert">
                        <AlertCircle className="h-3 w-3" aria-hidden="true" />
                        {errors.title}
                      </p>
                    )}
                  </div>

                  {/* Difficulty Level */}
                  <div>
                    <label className="block text-xs font-medium text-sidebar-foreground mb-1.5">
                      Nivå
                    </label>
                    <div className="flex items-center gap-1 p-1 bg-surface-elevated rounded-lg">
                      <button
                        type="button"
                        onClick={() => setLevel('nybegynner')}
                        className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                          level === 'nybegynner'
                            ? 'bg-white text-text-primary shadow-sm'
                            : 'text-muted-foreground hover:text-text-primary'
                        }`}
                      >
                        Nybegynner
                      </button>
                      <button
                        type="button"
                        onClick={() => setLevel('alle')}
                        className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                          level === 'alle'
                            ? 'bg-white text-text-primary shadow-sm'
                            : 'text-muted-foreground hover:text-text-primary'
                        }`}
                      >
                        Middels
                      </button>
                      <button
                        type="button"
                        onClick={() => setLevel('viderekommen')}
                        className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                          level === 'viderekommen'
                            ? 'bg-white text-text-primary shadow-sm'
                            : 'text-muted-foreground hover:text-text-primary'
                        }`}
                      >
                        Viderekommen
                      </button>
                    </div>
                  </div>

                  {/* Style Selection */}
                  <div>
                    <label htmlFor="course-style" className="block text-xs font-medium text-sidebar-foreground mb-1.5">
                      Kategori
                      <span className="ml-2 text-xxs font-normal text-muted-foreground">(Valgfritt)</span>
                    </label>
                    <Popover open={isStyleOpen} onOpenChange={setIsStyleOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="flex items-center justify-between w-full h-10 rounded-xl border border-border px-3 text-text-primary text-sm bg-input-bg transition-all text-left focus:border-ring focus:outline-none focus:ring-4 focus:ring-border/30 focus:bg-white hover:border-ring"
                        >
                          <span className={selectedStyleId ? 'text-text-primary' : 'text-text-tertiary'}>
                            {selectedStyleId
                              ? styles.find(s => s.id === selectedStyleId)?.name || 'Velg stil'
                              : 'Velg stil (valgfritt)'}
                          </span>
                          <ChevronDown className={`h-4 w-4 text-text-tertiary transition-transform ${isStyleOpen ? 'rotate-180' : ''}`} />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-[280px] p-2 max-h-[280px] overflow-y-auto custom-scrollbar" showOverlay>
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
                              <span>{style.name}</span>
                              {selectedStyleId === style.id && <Check className="h-4 w-4" />}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Description */}
                  <div className="relative">
                    <label htmlFor="course-description" className="block text-xs font-medium text-sidebar-foreground mb-1.5">
                      Beskrivelse
                      <span className="ml-2 text-xxs font-normal text-muted-foreground">(Valgfritt)</span>
                    </label>
                    <textarea
                      id="course-description"
                      placeholder="Beskriv kurset..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={600}
                      className="min-h-[120px] w-full rounded-xl border border-border px-3 py-2.5 text-text-primary placeholder:text-text-tertiary text-sm bg-input-bg transition-all focus:border-ring focus:outline-none focus:ring-4 focus:ring-border/30 focus:bg-white hover:border-ring resize-none"
                    />
                    <div className="flex justify-end mt-1.5">
                      <p className={`text-xs ${description.length > 500 ? (description.length > 600 ? 'text-destructive' : 'text-warning') : 'text-text-tertiary'}`}>
                        {description.length}/600
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Column: Image Upload */}
                <div className="md:col-span-5 flex flex-col">
                  <label className="block text-xs font-medium text-sidebar-foreground mb-1.5">
                    Kursbilde
                    <span className="ml-2 text-xxs font-normal text-muted-foreground">(Valgfritt)</span>
                  </label>
                  <div className="flex-1">
                    <ImageUpload
                      value={null}
                      onChange={setImageFile}
                      disabled={isSubmitting}
                      className="h-full"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3: Time & Location */}
            <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-border">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-text-primary">Tid & Sted</h2>
                <p className="text-sm text-muted-foreground">Når og hvor skal dette foregå?</p>
              </div>

              {/* Row 1: Date, Time, Duration, Weeks/Days */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-5">
                {/* Start Date */}
                <div className="col-span-1">
                  <label htmlFor="start-date" className="block text-xs font-medium text-sidebar-foreground mb-1.5">
                    {courseType === 'single' ? 'Dato' : 'Startdato'} <span className="text-destructive">*</span>
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        ref={startDateRef}
                        id="start-date"
                        type="button"
                        onBlur={() => handleBlur('startDate')}
                        aria-describedby={showError('startDate') ? 'startDate-error' : undefined}
                        aria-invalid={showError('startDate') ? 'true' : undefined}
                        aria-required="true"
                        className={`flex items-center justify-between w-full h-10 rounded-xl border px-3 text-text-primary text-sm bg-input-bg transition-all text-left focus:border-ring focus:outline-none focus:ring-4 focus:ring-border/30 focus:bg-white hover:border-ring ${
                          showError('startDate') ? 'border-destructive' : 'border-border'
                        }`}
                      >
                        <span className={`truncate ${startDate ? 'text-text-primary' : 'text-text-tertiary'}`}>
                          {startDate ? formatDateNorwegian(startDate) : 'Velg dato'}
                        </span>
                        <CalendarIcon className={`h-4 w-4 shrink-0 ${showError('startDate') ? 'text-destructive' : 'text-text-tertiary'}`} aria-hidden="true" />
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
                    <p id="startDate-error" className="mt-1.5 text-xs text-destructive flex items-center gap-1" role="alert">
                      <AlertCircle className="h-3 w-3" aria-hidden="true" />
                      {errors.startDate}
                    </p>
                  )}
                </div>

                {/* Time */}
                <div className="col-span-1">
                  <label htmlFor="start-time" className="block text-xs font-medium text-sidebar-foreground mb-1.5">
                    Starttid <span className="text-destructive">*</span>
                  </label>
                  <Popover open={isTimeOpen} onOpenChange={setIsTimeOpen}>
                    <PopoverTrigger asChild>
                      <button
                        ref={startTimeRef}
                        id="start-time"
                        type="button"
                        onBlur={() => handleBlur('startTime')}
                        aria-describedby={showError('startTime') ? 'startTime-error' : undefined}
                        aria-invalid={showError('startTime') ? 'true' : undefined}
                        aria-required="true"
                        className={`flex items-center justify-between w-full h-10 rounded-xl border px-3 text-text-primary text-sm bg-input-bg transition-all text-left focus:border-ring focus:outline-none focus:ring-4 focus:ring-border/30 focus:bg-white hover:border-ring ${
                          showError('startTime') ? 'border-destructive' : 'border-border'
                        }`}
                      >
                        <span className={startTime ? 'text-text-primary' : 'text-text-tertiary'}>
                          {startTime || 'Velg'}
                        </span>
                        <Clock className={`h-4 w-4 shrink-0 ${showError('startTime') ? 'text-destructive' : 'text-text-tertiary'}`} aria-hidden="true" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-[160px] p-2 max-h-[280px] overflow-y-auto custom-scrollbar" showOverlay>
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
                    <p id="startTime-error" className="mt-1.5 text-xs text-destructive flex items-center gap-1" role="alert">
                      <AlertCircle className="h-3 w-3" aria-hidden="true" />
                      {errors.startTime}
                    </p>
                  )}
                </div>

                {/* Duration */}
                <div className="col-span-1">
                  <label htmlFor="duration" className="block text-xs font-medium text-sidebar-foreground mb-1.5">
                    Varighet <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <input
                      ref={durationRef}
                      id="duration"
                      type="number"
                      placeholder="60"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      onBlur={() => handleBlur('duration')}
                      aria-describedby={showError('duration') ? 'duration-error' : undefined}
                      aria-invalid={showError('duration') ? 'true' : undefined}
                      aria-required="true"
                      className={`w-full h-10 rounded-xl border pl-3 pr-12 text-text-primary placeholder:text-text-tertiary text-sm bg-input-bg transition-all focus:border-ring focus:outline-none focus:ring-4 focus:ring-border/30 focus:bg-white hover:border-ring ${
                        showError('duration') ? 'border-destructive' : 'border-border'
                      }`}
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className={`text-xs ${showError('duration') ? 'text-destructive' : 'text-muted-foreground'}`}>min</span>
                    </div>
                  </div>
                  {showError('duration') && (
                    <p id="duration-error" className="mt-1.5 text-xs text-destructive flex items-center gap-1" role="alert">
                      <AlertCircle className="h-3 w-3" aria-hidden="true" />
                      {errors.duration}
                    </p>
                  )}
                </div>

                {/* Weeks/Days */}
                {courseType === 'series' ? (
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-sidebar-foreground mb-1.5">
                      Uker
                    </label>
                    <Popover open={isWeeksOpen} onOpenChange={setIsWeeksOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="flex items-center justify-between w-full h-10 rounded-xl border border-border px-3 text-text-primary text-sm bg-input-bg transition-all text-left focus:border-ring focus:outline-none focus:ring-4 focus:ring-border/30 focus:bg-white hover:border-ring"
                        >
                          <span className="text-text-primary">{weeks}</span>
                          <ChevronDown className={`h-4 w-4 text-text-tertiary transition-transform ${isWeeksOpen ? 'rotate-180' : ''}`} />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-[140px] p-2 max-h-[280px] overflow-y-auto custom-scrollbar" showOverlay>
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
                              <span>{week}</span>
                              {weeks === week.toString() && <Check className="h-4 w-4" />}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                ) : (
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-sidebar-foreground mb-1.5">
                      Dager
                    </label>
                    <Popover open={isDaysOpen} onOpenChange={setIsDaysOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="flex items-center justify-between w-full h-10 rounded-xl border border-border px-3 text-text-primary text-sm bg-input-bg transition-all text-left focus:border-ring focus:outline-none focus:ring-4 focus:ring-border/30 focus:bg-white hover:border-ring"
                        >
                          <span className="text-text-primary">{eventDays}</span>
                          <ChevronDown className={`h-4 w-4 text-text-tertiary transition-transform ${isDaysOpen ? 'rotate-180' : ''}`} />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-[140px] p-2 max-h-[280px] overflow-y-auto custom-scrollbar" showOverlay>
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
                              <span>{day}</span>
                              {eventDays === day.toString() && <Check className="h-4 w-4" />}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}
              </div>

              {/* Session Schedule Panel - Shows when single course has 2+ days */}
              {courseType === 'single' && parseInt(eventDays) >= 2 && startDate && startTime && (
                <div className="bg-surface border border-border rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-300 mb-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Øktplan
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {sessionDates.map((session, index) => (
                      <div
                        key={session.dayNumber}
                        className={`flex items-center gap-4 p-3 rounded-lg ${
                          session.isPrimary
                            ? 'bg-white/50 border border-transparent text-text-tertiary'
                            : 'bg-white border border-border shadow-sm hover:border-ring transition-colors'
                        }`}
                      >
                        {/* Day label */}
                        <div className="w-14 flex flex-col">
                          <span className={`text-xxs font-bold uppercase tracking-wider ${
                            session.isPrimary ? 'opacity-70' : 'text-text-primary'
                          }`}>
                            Dag {session.dayNumber}
                          </span>
                        </div>

                        {/* Date */}
                        <div className={`flex-1 text-sm font-medium capitalize ${
                          session.isPrimary ? 'text-text-tertiary' : 'text-text-primary'
                        }`}>
                          {session.formattedDate}
                        </div>

                        {/* Time input or display */}
                        {session.isPrimary ? (
                          <div className="w-28 text-right text-sm">
                            {session.time}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className={`w-28 h-8 px-2 text-sm text-center font-medium rounded-lg border transition-all cursor-pointer ${
                                    sessionTimes[index]
                                      ? 'bg-white border-warning/30 ring-1 ring-warning/20 text-text-primary'
                                      : 'bg-surface border-border text-text-primary hover:border-ring'
                                  }`}
                                >
                                  {session.time}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent align="end" className="w-[160px] p-2 max-h-[280px] overflow-y-auto custom-scrollbar" showOverlay>
                                <div className="flex flex-col gap-0.5">
                                  {timeSlots.map((time) => (
                                    <button
                                      key={time}
                                      type="button"
                                      onClick={() => {
                                        if (time === startTime) {
                                          resetSessionTime(index);
                                        } else {
                                          updateSessionTime(index, time);
                                        }
                                      }}
                                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                                        session.time === time
                                          ? 'bg-text-primary text-white'
                                          : 'text-sidebar-foreground hover:bg-surface-elevated'
                                      }`}
                                    >
                                      <span>{time}</span>
                                      {session.time === time && <Check className="h-4 w-4" />}
                                    </button>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        )}

                        {/* Primary label or reset button */}
                        <div className="w-16 text-right">
                          {session.isPrimary ? (
                            <span className="text-xs text-text-tertiary opacity-70">Primær</span>
                          ) : sessionTimes[index] ? (
                            <button
                              type="button"
                              onClick={() => resetSessionTime(index)}
                              className="text-text-tertiary hover:text-destructive p-1 rounded-md transition-colors"
                              title="Tilbakestill til primær tid"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Row 2: Location, Price, Capacity - with border separator */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-surface-elevated pt-5">
                {/* Location */}
                <div>
                  <label htmlFor="location" className="block text-xs font-medium text-sidebar-foreground mb-1.5">
                    Sted / Lokale <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <input
                      ref={locationRef}
                      id="location"
                      type="text"
                      placeholder="F.eks. Studio Oslo"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      onBlur={() => handleBlur('location')}
                      aria-describedby={showError('location') ? 'location-error' : undefined}
                      aria-invalid={showError('location') ? 'true' : undefined}
                      aria-required="true"
                      className={`w-full h-10 rounded-xl border pl-9 pr-3 text-text-primary placeholder:text-text-tertiary text-sm bg-input-bg transition-all focus:border-ring focus:outline-none focus:ring-4 focus:ring-border/30 focus:bg-white hover:border-ring ${
                        showError('location') ? 'border-destructive' : 'border-border'
                      }`}
                    />
                    <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${showError('location') ? 'text-destructive' : 'text-text-tertiary'}`} aria-hidden="true" />
                  </div>
                  {showError('location') && (
                    <p id="location-error" className="mt-1.5 text-xs text-destructive flex items-center gap-1" role="alert">
                      <AlertCircle className="h-3 w-3" aria-hidden="true" />
                      {errors.location}
                    </p>
                  )}
                </div>

                {/* Price and Capacity side by side */}
                <div className="grid grid-cols-2 gap-5">
                  {/* Price */}
                  <div>
                    <label htmlFor="price" className="block text-xs font-medium text-sidebar-foreground mb-1.5">
                      Pris <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <input
                        ref={priceRef}
                        id="price"
                        type="number"
                        placeholder="0"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        onBlur={() => handleBlur('price')}
                        aria-describedby={showError('price') ? 'price-error' : undefined}
                        aria-invalid={showError('price') ? 'true' : undefined}
                        aria-required="true"
                        className={`w-full h-10 rounded-xl border pl-3 pr-12 text-text-primary placeholder:text-text-tertiary text-sm bg-input-bg transition-all focus:border-ring focus:outline-none focus:ring-4 focus:ring-border/30 focus:bg-white hover:border-ring ${
                          showError('price') ? 'border-destructive' : 'border-border'
                        }`}
                      />
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <span className={`text-xs ${showError('price') ? 'text-destructive' : 'text-muted-foreground'}`}>NOK</span>
                      </div>
                    </div>
                    {showError('price') && (
                      <p id="price-error" className="mt-1.5 text-xs text-destructive flex items-center gap-1" role="alert">
                        <AlertCircle className="h-3 w-3" aria-hidden="true" />
                        {errors.price}
                      </p>
                    )}
                  </div>

                  {/* Capacity */}
                  <div>
                    <label htmlFor="capacity" className="block text-xs font-medium text-sidebar-foreground mb-1.5">
                      Plasser <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <input
                        ref={capacityRef}
                        id="capacity"
                        type="number"
                        placeholder="0"
                        min="1"
                        value={capacity}
                        onChange={(e) => setCapacity(e.target.value)}
                        onBlur={() => handleBlur('capacity')}
                        aria-describedby={showError('capacity') ? 'capacity-error' : undefined}
                        aria-invalid={showError('capacity') ? 'true' : undefined}
                        aria-required="true"
                        className={`w-full h-10 rounded-xl border pl-9 pr-3 text-text-primary placeholder:text-text-tertiary text-sm bg-input-bg transition-all focus:border-ring focus:outline-none focus:ring-4 focus:ring-border/30 focus:bg-white hover:border-ring ${
                          showError('capacity') ? 'border-destructive' : 'border-border'
                        }`}
                      />
                      <Users className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${showError('capacity') ? 'text-destructive' : 'text-text-tertiary'}`} aria-hidden="true" />
                    </div>
                    {showError('capacity') && (
                      <p id="capacity-error" className="mt-1.5 text-xs text-destructive flex items-center gap-1" role="alert">
                        <AlertCircle className="h-3 w-3" aria-hidden="true" />
                        {errors.capacity}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

          </div>
        </div>

        {/* Sticky Footer */}
        <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-border py-4 px-6 z-50">
          <div className="max-w-3xl mx-auto flex flex-col gap-3">
            {/* Error summary - only show after submit attempt */}
            {submitAttempted && !isFormValid && (
              <div
                className="bg-destructive/10 border border-destructive/20 rounded-lg p-3"
                role="alert"
                aria-live="polite"
              >
                <p className="text-sm text-destructive flex items-center justify-center gap-2">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  Fyll ut de markerte feltene for å publisere kurset.
                </p>
              </div>
            )}
            {submitError && (
              <div
                className="bg-destructive/10 border border-destructive/20 rounded-lg p-3"
                role="alert"
                aria-live="polite"
              >
                <p className="text-sm text-destructive flex items-center justify-center gap-2">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  {submitError}
                </p>
              </div>
            )}
            <div className="flex items-center justify-end space-x-4">
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
                disabled={isSubmitting}
                aria-describedby={isSubmitting ? 'submit-status' : undefined}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    <span id="submit-status">Oppretter...</span>
                  </>
                ) : (
                  <>
                    <span>Publiser kurs</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </footer>
      </main>
    </SidebarProvider>
  );
};

export default NewCoursePage;

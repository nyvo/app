import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { nb } from 'date-fns/locale';
import { addDays, format } from 'date-fns';
import {
  Leaf,
  Menu,
  Layers,
  CalendarDays,
  Check,
  ArrowRight,
  ChevronRight,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { isTimeSlotBooked } from '@/components/ui/time-picker';
import { useAuth } from '@/contexts/AuthContext';
import { createCourse, updateCourse, fetchBookedTimesForDate, type SessionTimeOverride } from '@/services/courses';
import { uploadCourseImage } from '@/services/storage';
import { ImageUpload } from '@/components/ui/image-upload';
import { NewCourseScheduleSection } from '@/components/teacher/NewCourseScheduleSection';
import { useFormDraft, serializeDate, deserializeDate } from '@/hooks/use-form-draft';
import type { CourseType as DBCourseType } from '@/types/database';

type CourseType = 'series' | 'single';

interface FormErrors {
  title?: string;
  startDate?: string;
  startTime?: string;
  duration?: string;
  weeks?: string;
  eventDays?: string;
  location?: string;
  price?: string;
  capacity?: string;
}

// Draft data structure for localStorage persistence
interface CourseDraft {
  courseType: CourseType;
  title: string;
  startDate?: string; // ISO string
  startTime: string;
  duration: number | null;
  weeks: string;
  eventDays: string;
  sessionTimes: Record<number, string>;
  location: string;
  price: string;
  capacity: string;
  description: string;
}

const DRAFT_KEY = 'new-course-draft';

const NewCoursePage = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useAuth();
  const [courseType, setCourseType] = useState<CourseType>('series');
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState<number | null>(60);
  const [weeks, setWeeks] = useState('');
  const [isWeeksOpen, setIsWeeksOpen] = useState(false);
  const [eventDays, setEventDays] = useState('');
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
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showRetryMessage, setShowRetryMessage] = useState(false);
  const submitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Form draft persistence
  const { draft, saveDraft, clearDraft, hasDraft } = useFormDraft<CourseDraft>(DRAFT_KEY);

  // Load draft on mount
  useEffect(() => {
    if (draft && !draftLoaded) {
      setCourseType(draft.courseType || 'series');
      setTitle(draft.title || '');
      setStartDate(deserializeDate(draft.startDate));
      setStartTime(draft.startTime || '');
      setDuration(draft.duration ?? 60);
      setWeeks(draft.weeks || '');
      setEventDays(draft.eventDays || '');
      setSessionTimes(draft.sessionTimes || {});
      setLocation(draft.location || '');
      setPrice(draft.price || '');
      setCapacity(draft.capacity || '');
      setDescription(draft.description || '');
      setDraftLoaded(true);

      // Show toast that draft was restored
      if (draft.title) {
        toast.info('Utkast gjenopprettet', {
          description: 'Utkastet ditt er lastet inn.',
        });
      }
    }
  }, [draft, draftLoaded]);

  // Auto-save draft when form changes (debounced via hook)
  const saveDraftCallback = useCallback(() => {
    saveDraft({
      courseType,
      title,
      startDate: serializeDate(startDate),
      startTime,
      duration,
      weeks,
      eventDays,
      sessionTimes,
      location,
      price,
      capacity,
      description,
    });
  }, [courseType, title, startDate, startTime, duration, weeks, eventDays, sessionTimes, location, price, capacity, description, saveDraft]);

  // Save draft whenever form values change (skip initial load)
  useEffect(() => {
    if (draftLoaded || (!draft && !hasDraft)) {
      saveDraftCallback();
    }
  }, [saveDraftCallback, draftLoaded, draft, hasDraft]);


  // Refs for scroll-to-error
  const titleRef = useRef<HTMLInputElement>(null);
  const startDateRef = useRef<HTMLButtonElement>(null);
  const startTimeRef = useRef<HTMLInputElement>(null);
  const durationRef = useRef<HTMLInputElement>(null);
  const weeksRef = useRef<HTMLButtonElement>(null);
  const eventDaysRef = useRef<HTMLButtonElement>(null);
  const locationRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const capacityRef = useRef<HTMLInputElement>(null);

  // Field refs map for scroll-to-error
  const fieldRefs: Record<keyof FormErrors, React.RefObject<HTMLInputElement | HTMLButtonElement | null>> = {
    title: titleRef,
    startDate: startDateRef,
    startTime: startTimeRef,
    duration: durationRef,
    weeks: weeksRef,
    eventDays: eventDaysRef,
    location: locationRef,
    price: priceRef,
    capacity: capacityRef,
  };

  // Validation logic with actionable Norwegian error messages
  const errors = useMemo<FormErrors>(() => {
    const errs: FormErrors = {};

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      errs.title = 'Gi kurset en tittel';
    }

    if (!startDate) {
      errs.startDate = 'Velg startdato';
    }

    if (!startTime) {
      errs.startTime = 'Velg tidspunkt';
    }

    if (duration === null || duration <= 0) {
      errs.duration = 'Velg varighet';
    }

    // Weeks required for course series
    if (courseType === 'series' && !weeks) {
      errs.weeks = 'Velg antall uker';
    }

    // Days required for single events
    if (courseType === 'single' && !eventDays) {
      errs.eventDays = 'Velg antall dager';
    }

    const trimmedLocation = location.trim();
    if (!trimmedLocation) {
      errs.location = 'Fyll inn sted';
    }

    // Price is required - 0 is allowed for free courses
    if (price === '' || isNaN(parseInt(price)) || parseInt(price) < 0) {
      errs.price = 'Angi pris';
    }

    if (!capacity || parseInt(capacity) < 1) {
      errs.capacity = 'Angi maks antall';
    }

    return errs;
  }, [title, startDate, startTime, duration, weeks, eventDays, courseType, location, price, capacity]);

  const isFormValid = Object.keys(errors).length === 0;

  // Check if form has any user-entered data (for unsaved changes warning)
  const hasUnsavedChanges = useMemo(() => {
    return !!(
      title.trim() ||
      startDate ||
      startTime ||
      location.trim() ||
      price ||
      capacity ||
      description.trim() ||
      imageFile
    );
  }, [title, startDate, startTime, location, price, capacity, description, imageFile]);

  // Warn user before leaving if form has unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !isSubmitting) {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, isSubmitting]);

  // Calculate end date for course series (derived from startDate + weeks)
  const endDate = useMemo(() => {
    if (!startDate || courseType !== 'series') return null;
    const weeksNum = parseInt(weeks) || 1;
    // End date = start date + (weeks - 1) * 7 days (last session day)
    return addDays(startDate, (weeksNum - 1) * 7);
  }, [startDate, weeks, courseType]);

  // Clear time when date changes (different date may have different availability)
  const prevStartDateRef = useRef<Date | undefined>(undefined);
  useEffect(() => {
    // Only clear if we had a previous date and it changed to a different date
    if (prevStartDateRef.current && startDate &&
        prevStartDateRef.current.getTime() !== startDate.getTime() &&
        startTime) {
      setStartTime('');
      setSessionTimes({});
    }
    prevStartDateRef.current = startDate;
  }, [startDate]);

  // Validate time slot when duration changes (may cause conflicts)
  const prevDurationRef = useRef<number | null>(duration);
  useEffect(() => {
    // Skip if duration didn't change, or no time selected, or no date/org
    if (prevDurationRef.current === duration || !startTime || !startDate || !currentOrganization?.id) {
      prevDurationRef.current = duration;
      return;
    }

    const validateTimeWithNewDuration = async () => {
      if (duration === null) {
        prevDurationRef.current = duration;
        return;
      }

      // Fetch booked times for the selected date
      const year = startDate.getFullYear();
      const month = String(startDate.getMonth() + 1).padStart(2, '0');
      const day = String(startDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const { data: bookedSlots } = await fetchBookedTimesForDate(
        currentOrganization.id,
        dateStr
      );

      // Check if current startTime is still valid with new duration
      const conflict = isTimeSlotBooked(startTime, duration, bookedSlots || []);

      if (conflict) {
        setStartTime('');
        setSessionTimes({});
        toast.info('Tidspunktet er ikke lenger ledig. Velg et annet.');
      }

      prevDurationRef.current = duration;
    };

    validateTimeWithNewDuration();
  }, [duration, startTime, startDate, currentOrganization?.id]);

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
    // Prevent double submit
    if (isSubmitting) return;

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
      setSubmitError('Velg et studio først');
      return;
    }

    setIsSubmitting(true);
    setShowRetryMessage(false);

    // Show "safe to retry" message after 4 seconds of waiting
    submitTimerRef.current = setTimeout(() => {
      setShowRetryMessage(true);
    }, 4000);

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

      const titleText = title.trim();

      const courseData = {
        organization_id: currentOrganization.id,
        title: titleText,
        description: description.trim() || null,
        course_type: dbCourseType,
        start_date: startDate
          ? `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`
          : undefined,
        time_schedule: timeSchedule,
        duration: duration || 60,
        total_weeks: courseType === 'series' ? parseInt(weeks) : null,
        location: location.trim(),
        price: parseInt(price) || 0,
        max_participants: parseInt(capacity),
        status: 'upcoming' as const,
      };

      // Build session time overrides for multi-day events
      const sessionTimeOverrides: SessionTimeOverride[] = Object.entries(sessionTimes).map(
        ([dayIndex, time]) => ({
          dayIndex: parseInt(dayIndex),
          time,
        })
      );

      const { data: createdCourse, error, conflicts } = await createCourse(courseData, {
        eventDays: courseType === 'single' ? parseInt(eventDays) : undefined,
        sessionTimeOverrides: sessionTimeOverrides.length > 0 ? sessionTimeOverrides : undefined,
      });

      if (error || !createdCourse) {
        if (conflicts && conflicts.length > 0) {
          setSubmitError('Tidspunktet er opptatt. Velg et annet.');
        } else {
          setSubmitError(error?.message || 'Kunne ikke opprette kurset');
        }
        return;
      }

      // Upload image if one was selected
      let imageUploadFailed = false;
      if (imageFile) {
        const { url: imageUrl, error: uploadError } = await uploadCourseImage(
          createdCourse.id,
          imageFile
        );

        if (!uploadError && imageUrl) {
          // Update course with image URL
          await updateCourse(createdCourse.id, { image_url: imageUrl });
        } else {
          // Image upload failed, but course was created
          imageUploadFailed = true;
        }
      }

      // Show appropriate toast
      if (imageUploadFailed) {
        toast.warning('Kurset er opprettet. Bildet ble ikke lastet opp.');
      } else {
        toast.success('Kurs opprettet');
      }

      // Clear the draft on successful creation
      clearDraft();

      // Navigate to course detail page on success
      navigate(`/teacher/courses/${createdCourse.id}`);
    } catch {
      setSubmitError('Noe gikk galt');
    } finally {
      // Clear the timer
      if (submitTimerRef.current) {
        clearTimeout(submitTimerRef.current);
        submitTimerRef.current = null;
      }
      setIsSubmitting(false);
      setShowRetryMessage(false);
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
            <span className="font-geist text-base font-medium text-text-primary">Ease</span>
          </div>
          <SidebarTrigger>
            <Menu className="h-6 w-6 text-muted-foreground" />
          </SidebarTrigger>
        </div>

        {/* Header / Breadcrumbs - Sticky */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shrink-0">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
            <nav className="flex items-center text-xs text-muted-foreground mb-2 space-x-2">
              <Link to="/teacher/schedule" className="hover:text-text-primary cursor-pointer transition-colors">
                Timeplan
              </Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-text-primary font-medium">Nytt kurs</span>
            </nav>
            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-2xl font-medium text-text-primary tracking-tight">
                  Opprett nytt kurs
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Sett opp et nytt kurs eller workshop.
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-10 sm:space-y-12 pb-44 sm:pb-36">

            {/* Section 1: Course Type Selection */}
            <section>
              <div className="mb-6">
                <h2 id="course-type-label" className="text-lg font-medium text-text-primary">Velg type</h2>
                <p className="text-sm text-muted-foreground">Hva slags kurs vil du opprette?</p>
              </div>
              <div role="radiogroup" aria-labelledby="course-type-label" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option A: Kursrekke */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={courseType === 'series'}
                    onClick={() => setCourseType('series')}
                    className={`relative flex flex-col gap-3 p-5 rounded-xl text-left cursor-pointer group transition-all focus:outline-none focus:ring-4 focus:ring-border/30 ${
                      courseType === 'series'
                        ? 'border-2 border-ring bg-surface-elevated'
                        : 'border border-border bg-input-bg hover:bg-surface hover:border-ring opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div
                        className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                          courseType === 'series'
                            ? 'bg-surface-elevated text-text-primary'
                            : 'bg-white text-muted-foreground border border-border'
                        }`}
                      >
                        <Layers className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div
                        className={`h-5 w-5 rounded-full flex items-center justify-center border transition-all duration-200 ${
                          courseType === 'series'
                            ? 'bg-text-primary border-text-primary text-white'
                            : 'bg-transparent border-gray-200 text-transparent'
                        }`}
                      >
                        {courseType === 'series' && <Check className="h-3 w-3" aria-hidden="true" />}
                      </div>
                    </div>
                    <div>
                      <h3
                        className={`text-base font-medium ${
                          courseType === 'series' ? 'text-text-primary' : 'text-muted-foreground'
                        }`}
                      >
                        Kursrekke
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        For kurs over flere uker.
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
                        ? 'border-2 border-ring bg-surface-elevated'
                        : 'border border-border bg-input-bg hover:bg-surface hover:border-ring opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div
                        className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                          courseType === 'single'
                            ? 'bg-surface-elevated text-text-primary'
                            : 'bg-white text-muted-foreground border border-border'
                        }`}
                      >
                        <CalendarDays className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div
                        className={`h-5 w-5 rounded-full flex items-center justify-center border transition-all duration-200 ${
                          courseType === 'single'
                            ? 'bg-text-primary border-text-primary text-white'
                            : 'bg-transparent border-gray-200 text-transparent'
                        }`}
                      >
                        {courseType === 'single' && <Check className="h-3 w-3" aria-hidden="true" />}
                      </div>
                    </div>
                    <div>
                      <h3
                        className={`text-base font-medium ${
                          courseType === 'single' ? 'text-text-primary' : 'text-muted-foreground'
                        }`}
                      >
                        Enkeltkurs
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        For drop-in, workshop eller enkelthendelse.
                      </p>
                    </div>
                    {courseType === 'single' && <span className="sr-only">Valgt</span>}
                  </button>
                </div>
            </section>

            {/* Section 2: Details */}
            <section className="bg-white rounded-3xl p-6 md:p-8 border border-gray-200">
              <div className="mb-6">
                <h2 className="text-lg font-medium text-text-primary">Detaljer</h2>
                <p className="text-sm text-muted-foreground">Fyll inn kursdetaljene.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Left Column: Title, Style, Description */}
                <div className="md:col-span-7 space-y-5">
                  {/* Title */}
                  <div>
                    <label htmlFor="course-title" className="block text-xs font-medium text-muted-foreground mb-1.5">
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

                  {/* Description */}
                  <div className="relative">
                    <label htmlFor="course-description" className="block text-xs font-medium text-muted-foreground mb-1.5">
                      Beskrivelse
                      <span className="ml-2 text-xxs font-normal text-muted-foreground">Valgfritt</span>
                    </label>
                    <textarea
                      id="course-description"
                      placeholder="Legg til en kort beskrivelse"
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
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Kursbilde
                    <span className="ml-2 text-xxs font-normal text-muted-foreground">Valgfritt</span>
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
            <NewCourseScheduleSection
              courseType={courseType}
              startDate={startDate}
              startTime={startTime}
              duration={duration}
              weeks={weeks}
              eventDays={eventDays}
              sessionTimes={sessionTimes}
              location={location}
              price={price}
              capacity={capacity}
              isWeeksOpen={isWeeksOpen}
              isDaysOpen={isDaysOpen}
              endDate={endDate}
              sessionDates={sessionDates}
              errors={errors}
              touched={touched}
              submitAttempted={submitAttempted}
              organizationId={currentOrganization?.id}
              weeksRef={weeksRef}
              eventDaysRef={eventDaysRef}
              locationRef={locationRef}
              priceRef={priceRef}
              capacityRef={capacityRef}
              onStartDateChange={setStartDate}
              onStartTimeChange={setStartTime}
              onDurationChange={setDuration}
              onWeeksChange={setWeeks}
              onEventDaysChange={setEventDays}
              onWeeksOpenChange={setIsWeeksOpen}
              onDaysOpenChange={setIsDaysOpen}
              onLocationChange={setLocation}
              onPriceChange={setPrice}
              onCapacityChange={setCapacity}
              onBlur={handleBlur}
              onTouchedChange={setTouched}
              showError={showError}
              updateSessionTime={updateSessionTime}
              resetSessionTime={resetSessionTime}
            />

          </div>
        </div>

        {/* Sticky Footer */}
        <footer className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-border py-4 px-4 sm:px-6 z-50 pb-[calc(1rem+env(safe-area-inset-bottom))]">
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
                  Fyll ut de markerte feltene.
                </p>
              </div>
            )}
            {submitError && (
              <div
                className="bg-destructive/10 border border-destructive/20 rounded-lg p-4"
                role="alert"
                aria-live="polite"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm text-destructive flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <p className="whitespace-pre-line">{submitError}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSubmitError(null)}
                    className="text-destructive/60 hover:text-destructive transition-colors p-1 -m-1 rounded"
                    aria-label="Lukk"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
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
              <div className="flex flex-col items-end gap-2">
                {showRetryMessage && isSubmitting && (
                  <p className="text-xs text-muted-foreground animate-in fade-in">
                    Dette kan ta litt tid.
                  </p>
                )}
                <Button
                  size="compact"
                  onClick={handlePublish}
                  disabled={isSubmitting}
                  aria-describedby={isSubmitting ? 'submit-status' : undefined}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      <span id="submit-status">Oppretter</span>
                    </>
                  ) : (
                    <>
                      <span>Publiser</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </SidebarProvider>
  );
};

export default NewCoursePage;
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { addDays, format } from 'date-fns';
import { nb } from 'date-fns/locale';
import {
  Layers,
  CalendarDays,
  Check,
  ArrowRight,
  ChevronDown,
  AlertCircle,
  MapPin,
  X,
  Leaf,
  Menu,
} from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { createCourse, updateCourse } from '@/services/courses';
import { uploadCourseImage } from '@/services/storage';
import { ImageUpload } from '@/components/ui/image-upload';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { TimePicker } from '@/components/ui/time-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { useFormDraft } from '@/hooks/use-form-draft';
import { cn } from '@/lib/utils';
import type { CourseType as DBCourseType } from '@/types/database';

type CourseType = 'series' | 'single';

interface FormErrors {
  title?: string;
  startDate?: string;
  startTime?: string;
  duration?: string;
  weeks?: string;
  location?: string;
  price?: string;
  capacity?: string;
}

interface CourseDraft {
  courseType: CourseType;
  title: string;
  description: string;
  startDate?: string;
  startTime: string;
  duration: number | null;
  weeks: string;
  location: string;
  price: string;
  capacity: string;
}

const DRAFT_KEY = 'create-course-draft';
const DESCRIPTION_MAX_LENGTH = 600;
const DESCRIPTION_WARN_LENGTH = 500;

const CreateCoursePage = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useAuth();

  // Form state
  const [courseType, setCourseType] = useState<CourseType>('series');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState<number | null>(60);
  const [weeks, setWeeks] = useState('');
  const [isWeeksOpen, setIsWeeksOpen] = useState(false);
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [capacity, setCapacity] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Validation state
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form draft persistence
  const { draft, saveDraft, clearDraft, hasDraft } = useFormDraft<CourseDraft>(DRAFT_KEY);

  // Load draft on mount
  useEffect(() => {
    if (draft && !draftLoaded) {
      setCourseType(draft.courseType || 'series');
      setTitle(draft.title || '');
      setDescription(draft.description || '');
      if (draft.startDate) {
        const parsed = new Date(draft.startDate);
        if (!isNaN(parsed.getTime())) setStartDate(parsed);
      }
      setStartTime(draft.startTime || '');
      setDuration(draft.duration ?? 60);
      setWeeks(draft.weeks || '');
      setLocation(draft.location || '');
      setPrice(draft.price || '');
      setCapacity(draft.capacity || '');
      setDraftLoaded(true);

      if (draft.title) {
        toast.info('Utkast gjenopprettet', {
          description: 'Utkastet ditt er lastet inn.',
        });
      }
    }
  }, [draft, draftLoaded]);

  // Auto-save draft
  const saveDraftCallback = useCallback(() => {
    saveDraft({
      courseType,
      title,
      description,
      startDate: startDate?.toISOString(),
      startTime,
      duration,
      weeks,
      location,
      price,
      capacity,
    });
  }, [courseType, title, description, startDate, startTime, duration, weeks, location, price, capacity, saveDraft]);

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
  const locationRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const capacityRef = useRef<HTMLInputElement>(null);

  const fieldRefs: Record<keyof FormErrors, React.RefObject<HTMLInputElement | HTMLButtonElement | null>> = {
    title: titleRef,
    startDate: startDateRef,
    startTime: startTimeRef,
    duration: durationRef,
    weeks: weeksRef,
    location: locationRef,
    price: priceRef,
    capacity: capacityRef,
  };

  // Validation
  const errors = useMemo<FormErrors>(() => {
    const errs: FormErrors = {};
    if (!title.trim()) errs.title = 'Gi kurset en tittel';
    if (!startDate) errs.startDate = 'Velg startdato';
    if (!startTime) errs.startTime = 'Velg tidspunkt';
    if (duration === null || duration <= 0) errs.duration = 'Velg varighet';
    if (courseType === 'series' && !weeks) errs.weeks = 'Velg antall uker';
    if (!location.trim()) errs.location = 'Fyll inn sted';
    if (price === '' || isNaN(parseInt(price)) || parseInt(price) < 0) errs.price = 'Angi pris';
    if (!capacity || parseInt(capacity) < 1) errs.capacity = 'Angi maks antall';
    return errs;
  }, [title, startDate, startTime, duration, weeks, courseType, location, price, capacity]);

  const isFormValid = Object.keys(errors).length === 0;

  // Unsaved changes warning
  const hasUnsavedChanges = useMemo(() => {
    return !!(title.trim() || startDate || startTime || location.trim() || price || capacity || description.trim() || imageFile);
  }, [title, startDate, startTime, location, price, capacity, description, imageFile]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !isSubmitting) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, isSubmitting]);

  // End date derived from startDate + weeks
  const endDate = useMemo(() => {
    if (!startDate || courseType !== 'series') return null;
    const weeksNum = parseInt(weeks) || 1;
    return addDays(startDate, (weeksNum - 1) * 7);
  }, [startDate, weeks, courseType]);

  const showError = (field: keyof FormErrors) => {
    return (touched[field] || submitAttempted) && errors[field];
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleCancel = () => {
    navigate('/teacher/courses');
  };

  const handlePublish = async () => {
    if (isSubmitting) return;
    setSubmitAttempted(true);
    setSubmitError(null);

    if (!isFormValid) {
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

    try {
      const dbCourseType: DBCourseType = courseType === 'series' ? 'course-series' : 'event';

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
        duration: duration || 60,
        total_weeks: courseType === 'series' ? parseInt(weeks) : null,
        location: location.trim(),
        price: parseInt(price) || 0,
        max_participants: parseInt(capacity),
        status: 'upcoming' as const,
      };

      const { data: createdCourse, error, conflicts } = await createCourse(courseData, {
        eventDays: courseType === 'single' ? 1 : undefined,
      });

      if (error || !createdCourse) {
        if (conflicts && conflicts.length > 0) {
          setSubmitError('Tidspunktet er opptatt. Velg et annet.');
        } else {
          setSubmitError(error?.message || 'Kunne ikke opprette kurset');
        }
        return;
      }

      let imageUploadFailed = false;
      if (imageFile) {
        const { url: imageUrl, error: uploadError } = await uploadCourseImage(createdCourse.id, imageFile);
        if (!uploadError && imageUrl) {
          await updateCourse(createdCourse.id, { image_url: imageUrl });
        } else {
          imageUploadFailed = true;
        }
      }

      if (imageUploadFailed) {
        toast.warning('Kurset er opprettet. Bildet ble ikke lastet opp.');
      } else {
        toast.success('Kurs opprettet');
      }

      clearDraft();
      navigate(`/teacher/courses/${createdCourse.id}`);
    } catch {
      setSubmitError('Noe gikk galt');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Shared input classes
  const inputClass = (field: keyof FormErrors) =>
    `w-full h-11 rounded-lg border px-4 text-text-primary placeholder:text-text-tertiary text-sm bg-input-bg transition-all focus:outline-none focus:bg-white focus-visible:ring-2 focus-visible:ring-zinc-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white hover:border-zinc-400 ${
      showError(field) ? 'border-destructive' : 'border-zinc-300'
    }`;

  return (
    <SidebarProvider>
      <TeacherSidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-white">
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

        {/* Header with Breadcrumbs + Actions */}
        <header className="bg-white border-b border-zinc-100 sticky top-0 z-10 shrink-0">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4">
            <Breadcrumb className="mb-2">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/teacher/courses">Kurs</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Opprett nytt kurs</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="flex justify-between items-end">
              <h1 className="text-2xl font-medium text-text-primary tracking-tight">
                Opprett nytt kurs
              </h1>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="compact"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Avbryt
                </Button>
                <Button
                  type="button"
                  size="compact"
                  onClick={handlePublish}
                  disabled={isSubmitting}
                  loading={isSubmitting}
                  loadingText="Oppretter"
                >
                  <span>Publiser</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Content — Concept 1: Focus layout */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-12 pb-44 sm:pb-36">
            <div className="space-y-14 sm:space-y-16">

              {/* ── Section 1: Course Structure ── */}
              <section>
                <div className="mb-6">
                  <h2 id="course-type-label" className="text-sm font-medium text-text-primary">Kurstype</h2>
                  <p className="text-sm text-muted-foreground">Hva slags kurs vil du opprette?</p>
                </div>
                <div role="radiogroup" aria-labelledby="course-type-label" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option A: Course Series */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={courseType === 'series'}
                    onClick={() => setCourseType('series')}
                    className={`relative flex flex-col gap-3 p-5 rounded-2xl text-left cursor-pointer group transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white bg-white ${
                      courseType === 'series'
                        ? 'border-2 border-zinc-400'
                        : 'border border-zinc-200 hover:border-zinc-400 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        courseType === 'series'
                          ? 'bg-zinc-100 text-text-primary'
                          : 'bg-zinc-50 text-muted-foreground border border-zinc-100'
                      }`}>
                        <Layers className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center border transition-all duration-200 ${
                        courseType === 'series'
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'bg-transparent border-zinc-200 text-transparent'
                      }`}>
                        {courseType === 'series' && <Check className="h-3 w-3" aria-hidden="true" />}
                      </div>
                    </div>
                    <div>
                      <h3 className={`text-base font-medium ${courseType === 'series' ? 'text-text-primary' : 'text-muted-foreground'}`}>
                        Kursrekke
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        For kurs over flere uker.
                      </p>
                    </div>
                    {courseType === 'series' && <span className="sr-only">Valgt</span>}
                  </button>

                  {/* Option B: Single Session */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={courseType === 'single'}
                    onClick={() => setCourseType('single')}
                    className={`relative flex flex-col gap-3 p-5 rounded-2xl text-left cursor-pointer group transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white bg-white ${
                      courseType === 'single'
                        ? 'border-2 border-zinc-400'
                        : 'border border-zinc-200 hover:border-zinc-400 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        courseType === 'single'
                          ? 'bg-zinc-100 text-text-primary'
                          : 'bg-zinc-50 text-muted-foreground border border-zinc-100'
                      }`}>
                        <CalendarDays className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center border transition-all duration-200 ${
                        courseType === 'single'
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'bg-transparent border-zinc-200 text-transparent'
                      }`}>
                        {courseType === 'single' && <Check className="h-3 w-3" aria-hidden="true" />}
                      </div>
                    </div>
                    <div>
                      <h3 className={`text-base font-medium ${courseType === 'single' ? 'text-text-primary' : 'text-muted-foreground'}`}>
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

              {/* ── Section 2: Basic Details ── */}
              <section>
                <div className="mb-6 border-b border-zinc-100 pb-2">
                  <h2 className="text-sm font-medium text-muted-foreground">Detaljer</h2>
                </div>
                <div className="space-y-6">
                  {/* Title */}
                  <div>
                    <label htmlFor="create-title" className="block text-xs font-medium text-text-primary mb-1.5">
                      Tittel <span className="text-destructive">*</span>
                    </label>
                    <Input
                      ref={titleRef}
                      id="create-title"
                      type="text"
                      placeholder="F.eks. Morgenyoga"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onBlur={() => handleBlur('title')}
                      aria-describedby={showError('title') ? 'create-title-error' : undefined}
                      aria-invalid={showError('title') ? 'true' : undefined}
                      aria-required="true"
                      className={cn(
                        "w-full h-11",
                        showError('title') && "border-destructive focus-visible:ring-destructive"
                      )}
                    />
                    {showError('title') && (
                      <p id="create-title-error" className="mt-1.5 text-xs text-destructive flex items-center gap-1" role="alert">
                        <AlertCircle className="h-3 w-3" aria-hidden="true" />
                        {errors.title}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div className="relative">
                    <label htmlFor="create-description" className="block text-xs font-medium text-text-primary mb-1.5">
                      Beskrivelse
                      <span className="ml-2 text-xs font-normal text-muted-foreground">Valgfritt</span>
                    </label>
                    <Textarea
                      id="create-description"
                      placeholder="Hva vil studentene lære?"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={DESCRIPTION_MAX_LENGTH}
                      rows={3}
                      className="min-h-[100px]"
                    />
                    <div className="flex justify-end mt-1.5">
                      <p className={`text-xs ${description.length > DESCRIPTION_WARN_LENGTH ? (description.length > DESCRIPTION_MAX_LENGTH ? 'text-destructive' : 'text-warning') : 'text-text-tertiary'}`}>
                        {description.length}/{DESCRIPTION_MAX_LENGTH}
                      </p>
                    </div>
                  </div>

                  {/* Cover Image */}
                  <div>
                    <label className="block text-xs font-medium text-text-primary mb-1.5">
                      Kursbilde
                      <span className="ml-2 text-xs font-normal text-muted-foreground">Valgfritt</span>
                    </label>
                    <div className="h-40">
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

              {/* ── Section 3: Schedule & Location ── */}
              <section>
                <div className="mb-6 border-b border-zinc-100 pb-2">
                  <h2 className="text-sm font-medium text-muted-foreground">Tid og sted</h2>
                </div>
                <div className="space-y-6">
                  {/* Date + Weeks row */}
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="create-start-date" className="block text-xs font-medium text-text-primary mb-1.5">
                        {courseType === 'single' ? 'Dato' : 'Startdato'} <span className="text-destructive">*</span>
                      </label>
                      <DatePicker
                        id="create-start-date"
                        value={startDate}
                        onChange={(date) => {
                          setStartDate(date);
                          setTouched(prev => ({ ...prev, startDate: true }));
                        }}
                        onBlur={() => handleBlur('startDate')}
                        error={!!showError('startDate')}
                        placeholder="Velg dato"
                      />
                      {showError('startDate') && (
                        <p id="startDate-error" className="mt-1.5 text-xs text-destructive flex items-center gap-1" role="alert">
                          <AlertCircle className="h-3 w-3" aria-hidden="true" />
                          {errors.startDate}
                        </p>
                      )}
                    </div>

                    {courseType === 'series' && (
                      <div>
                        <label className="flex items-center gap-1 text-xs font-medium text-text-primary mb-1.5">
                          Uker <span className="text-destructive">*</span>
                          <InfoTooltip content="Hvor mange uker kurset varer" />
                        </label>
                        <Popover open={isWeeksOpen} onOpenChange={setIsWeeksOpen}>
                          <PopoverTrigger asChild>
                            <button
                              ref={weeksRef}
                              type="button"
                              onBlur={() => handleBlur('weeks')}
                              aria-describedby={showError('weeks') ? 'weeks-error' : undefined}
                              aria-invalid={showError('weeks') ? 'true' : undefined}
                              aria-required="true"
                              className={`flex items-center justify-between w-full h-11 rounded-lg border px-4 text-text-primary text-sm bg-input-bg transition-all text-left focus:outline-none focus:bg-white focus-visible:ring-2 focus-visible:ring-zinc-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white hover:border-zinc-400 ios-ease ${
                                showError('weeks') ? 'border-destructive' : 'border-zinc-300'
                              }`}
                            >
                              <span className={weeks ? 'text-text-primary' : 'text-text-tertiary'}>{weeks || 'Velg'}</span>
                              <ChevronDown className={`h-4 w-4 text-text-tertiary opacity-50 transition-transform ${isWeeksOpen ? 'rotate-180' : ''} ${showError('weeks') ? 'text-destructive' : ''}`} />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-[140px] p-3 max-h-[280px] overflow-y-auto custom-scrollbar" showOverlay>
                            <div className="flex flex-col gap-1">
                              {Array.from({ length: 16 }, (_, i) => i + 1).map((week) => (
                                <button
                                  key={week}
                                  type="button"
                                  onClick={() => {
                                    setWeeks(week.toString());
                                    setIsWeeksOpen(false);
                                    setTouched(prev => ({ ...prev, weeks: true }));
                                  }}
                                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-normal transition-colors ${
                                    weeks === week.toString()
                                      ? 'bg-primary text-primary-foreground'
                                      : 'text-sidebar-foreground hover:bg-secondary hover:text-text-primary'
                                  }`}
                                >
                                  <span>{week}</span>
                                  {weeks === week.toString() && <Check className="h-4 w-4" />}
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                        {showError('weeks') && (
                          <p id="weeks-error" className="mt-1.5 text-xs text-destructive flex items-center gap-1" role="alert">
                            <AlertCircle className="h-3 w-3" aria-hidden="true" />
                            {errors.weeks}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Time + Duration row */}
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="create-start-time" className="block text-xs font-medium text-text-primary mb-1.5">
                        Starttid <span className="text-destructive">*</span>
                      </label>
                      <TimePicker
                        id="create-start-time"
                        value={startTime}
                        onChange={(time) => {
                          setStartTime(time);
                          setTouched(prev => ({ ...prev, startTime: true }));
                        }}
                        onBlur={() => handleBlur('startTime')}
                        error={!!showError('startTime')}
                      />
                      {showError('startTime') && (
                        <p id="startTime-error" className="mt-1.5 text-xs text-destructive flex items-center gap-1" role="alert">
                          <AlertCircle className="h-3 w-3" aria-hidden="true" />
                          {errors.startTime}
                        </p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="create-duration" className="block text-xs font-medium text-text-primary mb-1.5">
                        Varighet <span className="text-destructive">*</span>
                      </label>
                      <Select
                        value={duration?.toString() || ""}
                        onValueChange={(val) => {
                          setDuration(parseInt(val));
                          setTouched(prev => ({ ...prev, duration: true }));
                        }}
                      >
                        <SelectTrigger
                          id="create-duration"
                          onBlur={() => handleBlur('duration')}
                          className={cn(
                            "w-full h-11 bg-input-bg",
                            showError('duration') ? "border-destructive" : "border-zinc-300"
                          )}
                        >
                          <SelectValue placeholder="Velg" />
                        </SelectTrigger>
                        <SelectContent>
                          {[15, 30, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240].map((mins) => (
                            <SelectItem key={mins} value={mins.toString()}>
                              {mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} t ${mins % 60 > 0 ? `${mins % 60} min` : ''}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {showError('duration') && (
                        <p id="duration-error" className="mt-1.5 text-xs text-destructive flex items-center gap-1" role="alert">
                          <AlertCircle className="h-3 w-3" aria-hidden="true" />
                          {errors.duration}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* End date feedback */}
                  {courseType === 'series' && endDate && parseInt(weeks) >= 2 && (
                    <p className="text-sm text-muted-foreground -mt-2">
                      Slutter {format(endDate, 'd. MMMM', { locale: nb })}
                    </p>
                  )}

                  {/* Location */}
                  <div>
                    <label htmlFor="create-location" className="block text-xs font-medium text-text-primary mb-1.5">
                      Sted <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <Input
                        ref={locationRef}
                        id="create-location"
                        type="text"
                        placeholder="F.eks. Studioet, Grünerløkka"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        onBlur={() => handleBlur('location')}
                        aria-describedby={showError('location') ? 'create-location-error' : undefined}
                        aria-invalid={showError('location') ? 'true' : undefined}
                        aria-required="true"
                        className={cn(
                          "w-full h-11 pl-9",
                          showError('location') ? 'border-destructive focus-visible:ring-destructive' : 'border-zinc-300'
                        )}
                      />
                      <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${showError('location') ? 'text-destructive' : 'text-text-tertiary'}`} aria-hidden="true" />
                    </div>
                    {showError('location') && (
                      <p id="create-location-error" className="mt-1.5 text-xs text-destructive flex items-center gap-1" role="alert">
                        <AlertCircle className="h-3 w-3" aria-hidden="true" />
                        {errors.location}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              {/* ── Section 4: Admission ── */}
              <section>
                <div className="mb-6 border-b border-zinc-100 pb-2">
                  <h2 className="text-sm font-medium text-muted-foreground">Påmelding</h2>
                </div>
                <div className="grid grid-cols-2 gap-5">
                  {/* Price */}
                  <div>
                    <label htmlFor="create-price" className="block text-xs font-medium text-text-primary mb-1.5">
                      Pris <span className="text-destructive">*</span>
                      <span className="ml-2 text-xs font-normal text-muted-foreground">per person</span>
                    </label>
                    <div className="relative">
                      <Input
                        ref={priceRef}
                        id="create-price"
                        type="number"
                        placeholder="0"
                        min="0"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        onBlur={() => handleBlur('price')}
                        aria-describedby={showError('price') ? 'create-price-error' : undefined}
                        aria-invalid={showError('price') ? 'true' : undefined}
                        aria-required="true"
                        className={cn(
                          "w-full h-11 pr-12",
                          showError('price') ? 'border-destructive focus-visible:ring-destructive' : 'border-zinc-300'
                        )}
                      />
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <span className={`text-xs ${showError('price') ? 'text-destructive' : 'text-muted-foreground'}`}>NOK</span>
                      </div>
                    </div>
                    {showError('price') && (
                      <p id="create-price-error" className="mt-1.5 text-xs text-destructive flex items-center gap-1" role="alert">
                        <AlertCircle className="h-3 w-3" aria-hidden="true" />
                        {errors.price}
                      </p>
                    )}
                  </div>

                  {/* Capacity */}
                  <div>
                    <label htmlFor="create-capacity" className="block text-xs font-medium text-text-primary mb-1.5">
                      Maks deltakere <span className="text-destructive">*</span>
                    </label>
                    <Input
                      ref={capacityRef}
                      id="create-capacity"
                      type="number"
                      placeholder=""
                      min="1"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      onBlur={() => handleBlur('capacity')}
                      aria-describedby={showError('capacity') ? 'create-capacity-error' : undefined}
                      aria-invalid={showError('capacity') ? 'true' : undefined}
                      aria-required="true"
                      className={cn(
                        "w-full h-11",
                        showError('capacity') ? 'border-destructive focus-visible:ring-destructive' : 'border-zinc-300'
                      )}
                    />
                    {showError('capacity') && (
                      <p id="create-capacity-error" className="mt-1.5 text-xs text-destructive flex items-center gap-1" role="alert">
                        <AlertCircle className="h-3 w-3" aria-hidden="true" />
                        {errors.capacity}
                      </p>
                    )}
                  </div>
                </div>
              </section>

            </div>
          </div>
        </div>

        {/* Bottom error bar — only visible on submit errors */}
        {(submitError || (submitAttempted && !isFormValid)) && (
          <div className="bg-white/80 backdrop-blur-lg border-t border-border py-3 px-4 sm:px-6 z-50">
            <div className="max-w-2xl mx-auto">
              {submitAttempted && !isFormValid && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3" role="alert" aria-live="polite">
                  <p className="text-sm text-destructive flex items-center justify-center gap-2">
                    <AlertCircle className="h-4 w-4" aria-hidden="true" />
                    Fyll ut de markerte feltene.
                  </p>
                </div>
              )}
              {submitError && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4" role="alert" aria-live="polite">
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
            </div>
          </div>
        )}
      </main>
    </SidebarProvider>
  );
};

export default CreateCoursePage;

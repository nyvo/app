import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { addDays, format } from 'date-fns';
import { nb } from 'date-fns/locale';
import {
  Layers,
  CalendarDays,
  Check,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  AlertCircle,
  MapPin,
  X,
  Leaf,
  Menu,
  Plus,
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
import { RadioGroup, RadioGroupItem, RadioGroupCardItem } from '@/components/ui/radio-group';
import { Alert } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { CreateCourseReview } from '@/components/teacher/CreateCourseReview';
import { Stepper } from '@/components/ui/stepper';
import { useFormDraft } from '@/hooks/use-form-draft';
import { tabVariants, tabTransition, pageVariants, pageTransition } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { CourseType as DBCourseType, Json } from '@/types/database';
import type { AudienceLevel, EquipmentInfo, PracticalInfo } from '@/types/practicalInfo';
import { AUDIENCE_LEVEL_OPTIONS, EQUIPMENT_OPTIONS, ARRIVAL_PRESET_OPTIONS, ARRIVAL_NONE_VALUE, ARRIVAL_DEFAULT_MINUTES, CUSTOM_BULLET_PLACEHOLDERS, CUSTOM_BULLETS_MAX_COUNT, CUSTOM_BULLET_MAX_LENGTH, ARRIVAL_MINUTES_MAX, practicalInfoToHighlights } from '@/utils/practicalInfoUtils';

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
  audienceLevel?: string;
  equipment?: string;
  arrivalMinutes?: string;
  customBullets?: string[];
  stepIndex?: number;
}

const DRAFT_KEY = 'create-course-draft';
const DESCRIPTION_MAX_LENGTH = 600;
const DESCRIPTION_WARN_LENGTH = 500;

const CREATE_COURSE_STEPS = [
  { id: 'details', label: 'Detaljer' },
  { id: 'time-place', label: 'Tid og sted' },
  { id: 'registration', label: 'Påmelding' },
] as const;

const CreateCoursePage = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useAuth();

  // Stepper state (0, 1, 2)
  const [currentStep, setCurrentStep] = useState(0);

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

  // Practical info state
  const [audienceLevel, setAudienceLevel] = useState<AudienceLevel | ''>('ALL_LEVELS');
  const [equipment, setEquipment] = useState<EquipmentInfo | ''>('');
  const [arrivalMinutes, setArrivalMinutes] = useState(ARRIVAL_DEFAULT_MINUTES);
  const [customBullets, setCustomBullets] = useState<string[]>([]);

  // Validation state
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [showReviewView, setShowReviewView] = useState(false);

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
      setAudienceLevel((draft.audienceLevel as AudienceLevel) || 'ALL_LEVELS');
      setEquipment((draft.equipment as EquipmentInfo) || '');
      setArrivalMinutes(draft.arrivalMinutes ?? ARRIVAL_DEFAULT_MINUTES);
      setCustomBullets(draft.customBullets || []);
      const clampedStep = Math.min(2, Math.max(0, draft.stepIndex ?? 0));
      setCurrentStep(clampedStep);
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
      audienceLevel: audienceLevel || undefined,
      equipment: equipment || undefined,
      arrivalMinutes: arrivalMinutes || undefined,
      customBullets: customBullets.length > 0 ? customBullets : undefined,
      stepIndex: currentStep,
    });
  }, [courseType, title, description, startDate, startTime, duration, weeks, location, price, capacity, audienceLevel, equipment, arrivalMinutes, customBullets, currentStep, saveDraft]);

  useEffect(() => {
    if (draftLoaded || (!draft && !hasDraft)) {
      saveDraftCallback();
    }
  }, [saveDraftCallback, draftLoaded, draft, hasDraft]);

  // Refs for scroll-to-error and content area (scroll to top on step change)
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const startDateRef = useRef<HTMLButtonElement>(null);
  const startTimeRef = useRef<HTMLInputElement>(null);
  const durationRef = useRef<HTMLButtonElement>(null);
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

  // Validation (price allows 0 for free courses; capacity >= 1; duration > 0)
  const errors = useMemo<FormErrors>(() => {
    const errs: FormErrors = {};
    if (!title.trim()) errs.title = 'Gi kurset en tittel';
    if (!startDate) errs.startDate = 'Velg startdato';
    if (!startTime) errs.startTime = 'Velg tidspunkt';
    if (duration === null || duration <= 0) errs.duration = 'Velg varighet';
    if (courseType === 'series' && !weeks) errs.weeks = 'Velg antall uker';
    if (!location.trim()) errs.location = 'Fyll inn sted';
    const priceNum = parseInt(price, 10);
    if (price === '' || isNaN(priceNum) || priceNum < 0) errs.price = 'Angi pris';
    const capacityNum = parseInt(capacity, 10);
    if (!capacity || isNaN(capacityNum) || capacityNum < 1) errs.capacity = 'Angi maks antall';
    return errs;
  }, [title, startDate, startTime, duration, weeks, courseType, location, price, capacity]);

  // Per-step required fields (stepFields[1] depends on courseType so series→single doesn't block on weeks)
  const stepFields = useMemo<(keyof FormErrors)[][]>(() => [
    ['title'],
    ['startDate', 'startTime', 'duration', 'location', ...(courseType === 'series' ? (['weeks'] as (keyof FormErrors)[]) : [])],
    ['price', 'capacity'],
  ], [courseType]);

  const validateStep = useCallback((stepIndex: number) => {
    const fields = stepFields[stepIndex] ?? [];
    return fields.every((f) => !errors[f]);
  }, [stepFields, errors]);

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

  // Build practical info for submission and preview
  const currentPracticalInfo = useMemo<PracticalInfo | null>(() => {
    const info: PracticalInfo = {};
    if (audienceLevel) info.audience_level = audienceLevel;
    if (equipment) info.equipment = equipment;
    const arrivalNum = parseInt(arrivalMinutes);
    if (!isNaN(arrivalNum) && arrivalNum > 0 && arrivalNum <= ARRIVAL_MINUTES_MAX) {
      info.arrival_minutes_before = arrivalNum;
    }
    const filtered = customBullets.filter(b => b.trim()).map(b => b.trim().slice(0, CUSTOM_BULLET_MAX_LENGTH));
    if (filtered.length > 0) info.custom_bullets = filtered;
    return Object.keys(info).length > 0 ? info : null;
  }, [audienceLevel, equipment, arrivalMinutes, customBullets]);

  // Pre-formatted labels for the review step
  const reviewLabels = useMemo(() => {
    const typeLabel = courseType === 'series' ? 'Kursrekke' : 'Enkeltkurs';

    const startDateLabel = startDate
      ? (() => {
          const pattern = startDate.getFullYear() === new Date().getFullYear()
            ? 'EEEE d. MMMM'
            : 'EEEE d. MMMM yyyy';
          const formatted = format(startDate, pattern, { locale: nb });
          return formatted.charAt(0).toUpperCase() + formatted.slice(1);
        })()
      : 'Ikke angitt';

    const durationMins = duration != null && duration > 0 ? duration : null;
    const durationStr = durationMins
      ? durationMins < 60
        ? `${durationMins} min`
        : durationMins % 60 > 0
          ? `${Math.floor(durationMins / 60)} t ${durationMins % 60} min`
          : `${Math.floor(durationMins / 60)} t`
      : null;
    const timeAndDurationLabel = startTime
      ? `${startTime}${durationStr ? ` \u00b7 ${durationStr}` : ''}`
      : 'Ikke angitt';

    const weeksLabel = courseType === 'series' && weeks ? `${weeks} uker` : null;

    const priceNum = price !== '' ? parseInt(price, 10) : null;
    const priceLabel =
      priceNum != null && !isNaN(priceNum) && priceNum >= 0
        ? `${priceNum} kr`
        : 'Pris ikke angitt';

    const capNum = capacity ? parseInt(capacity, 10) : null;
    const capacityLabel =
      capNum != null && !isNaN(capNum) && capNum >= 1
        ? `${capNum} plasser`
        : 'Ingen grense';

    const highlights = practicalInfoToHighlights(currentPracticalInfo);
    const practicalInfoLabel = highlights.length > 0 ? highlights.join(' \u00b7 ') : null;

    return {
      courseTypeLabel: typeLabel,
      startDateLabel,
      timeAndDurationLabel,
      weeksLabel,
      locationLabel: location.trim() || 'Ikke angitt',
      priceLabel,
      capacityLabel,
      practicalInfoLabel,
    };
  }, [courseType, startDate, startTime, duration, weeks, location, price, capacity, currentPracticalInfo]);

  const showError = (field: keyof FormErrors) => {
    return (touched[field] || submitAttempted) && errors[field];
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleCancel = () => {
    navigate('/teacher/courses');
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      setSubmitAttempted(true);
      const fields = stepFields[currentStep] ?? [];
      for (const field of fields) {
        if (errors[field]) {
          const ref = fieldRefs[field]?.current;
          if (ref) {
            ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => ref.focus(), 300);
          }
          return;
        }
      }
      return;
    }
    setSubmitAttempted(false);
    setCurrentStep((prev) => Math.min(2, prev + 1));
    contentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setSubmitAttempted(false);
    setCurrentStep((prev) => Math.max(0, prev - 1));
    contentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePublish = async () => {
    if (isSubmitting) return;
    setSubmitAttempted(true);
    setSubmitError(null);

    if (!isFormValid) {
      setSubmitAttempted(true);
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
        practical_info: currentPracticalInfo ? (currentPracticalInfo as unknown as Json) : null,
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
            <Menu className="h-6 w-6 text-text-secondary" />
          </SidebarTrigger>
        </div>

        {/* Header with Breadcrumbs */}
        <header className="bg-white border-b border-zinc-100 shrink-0">
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
            <h1 className="text-2xl font-medium text-text-primary tracking-tight">
              {showReviewView ? 'Sjekk detaljer' : 'Opprett nytt kurs'}
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              {showReviewView
                ? 'Kontroller at informasjonen stemmer før du publiserer.'
                : 'Sett opp et nytt kurs eller workshop.'}
            </p>
          </div>
        </header>

        {/* Stepper + Form or Review */}
        <div
          ref={contentScrollRef}
          className="flex-1 overflow-y-auto custom-scrollbar"
        >
          {showReviewView ? (
            <motion.div
              key="review"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              transition={pageTransition}
              className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-10"
            >
              {submitAttempted && !isFormValid && (
                <div className="mb-6 rounded-xl border border-destructive/30 bg-status-error-bg px-4 py-3 text-sm text-status-error-text" role="alert">
                  Fyll ut de påkrevde feltene. Gå tilbake til redigering for å rette opp.
                </div>
              )}
              <CreateCourseReview
                courseTypeLabel={reviewLabels.courseTypeLabel}
                title={title.trim() || 'Ikke angitt'}
                description={description}
                hasCoverImage={!!imageFile}
                startDateLabel={reviewLabels.startDateLabel}
                timeAndDurationLabel={reviewLabels.timeAndDurationLabel}
                weeksLabel={reviewLabels.weeksLabel}
                locationLabel={reviewLabels.locationLabel}
                capacityLabel={reviewLabels.capacityLabel}
                priceLabel={reviewLabels.priceLabel}
                practicalInfoLabel={reviewLabels.practicalInfoLabel}
              />
            </motion.div>
          ) : (
            <>
              <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                <Stepper
                  steps={CREATE_COURSE_STEPS}
                  currentStep={currentStep}
                  onStepSelect={(index) => index < currentStep && setCurrentStep(index)}
                  className="mb-8"
                />
              </div>
              <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-10">
                {currentStep === 0 && (
              <motion.div
                key="step-0"
                variants={tabVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={tabTransition}
                className="space-y-14 sm:space-y-16"
              >
              {/* ── Step 1: Kurstype + Detaljer ── */}
              <section>
                <div className="mb-6">
                  <h2 id="course-type-label" className="text-sm font-medium text-text-primary">Kurstype</h2>
                  <p className="text-sm text-text-secondary mt-1">Hva slags kurs vil du opprette?</p>
                </div>
                <RadioGroup
                  value={courseType}
                  onValueChange={(v) => setCourseType(v as CourseType)}
                  aria-labelledby="course-type-label"
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  <RadioGroupCardItem
                    value="series"
                    icon={Layers}
                    title="Kursrekke"
                    description="For kurs over flere uker."
                  />
                  <RadioGroupCardItem
                    value="single"
                    icon={CalendarDays}
                    title="Enkeltkurs"
                    description="For drop-in, workshop eller enkelthendelse."
                  />
                </RadioGroup>
              </section>

              {/* ── Section 2: Basic Details ── */}
              <section>
                <div className="mb-6 border-b border-zinc-100 pb-2">
                  <h2 className="text-sm font-medium text-text-secondary">Detaljer</h2>
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
                      <span className="ml-2 text-xs font-normal text-text-secondary">Valgfritt</span>
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
                      <span className="ml-2 text-xs font-normal text-text-secondary">Valgfritt</span>
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
              </motion.div>
            )}
            {currentStep === 1 && (
              <motion.div
                key="step-1"
                variants={tabVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={tabTransition}
                className="space-y-14 sm:space-y-16"
              >
              {/* ── Step 2: Tid og sted ── */}
              <section>
                <div className="mb-6 border-b border-zinc-100 pb-2">
                  <h2 className="text-sm font-medium text-text-secondary">Tid og sted</h2>
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
                        fromDate={new Date()}
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
                              className={`flex items-center justify-between w-full h-11 rounded-lg border px-4 text-text-primary text-sm bg-input-bg text-left focus:outline-none focus:bg-white focus-visible:ring-2 focus-visible:ring-zinc-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white hover:border-zinc-400 ios-ease ${
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
                          ref={durationRef}
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
                    <p className="text-sm text-text-secondary -mt-2">
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
              </motion.div>
            )}
            {currentStep === 2 && (
              <motion.div
                key="step-2"
                variants={tabVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={tabTransition}
                className="space-y-14 sm:space-y-16"
              >
              {/* ── Step 3: Påmelding ── */}
              <section>
                <div className="mb-6 border-b border-zinc-100 pb-2">
                  <h2 className="text-sm font-medium text-text-secondary">Påmelding</h2>
                </div>
                <div className="grid grid-cols-2 gap-5">
                  {/* Price */}
                  <div>
                    <label htmlFor="create-price" className="block text-xs font-medium text-text-primary mb-1.5">
                      Pris <span className="text-destructive">*</span>
                      <span className="ml-2 text-xs font-normal text-text-secondary">per person</span>
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
                        <span className={`text-xs ${showError('price') ? 'text-destructive' : 'text-text-secondary'}`}>NOK</span>
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

              {/* ── Section 5: Praktisk info (optional) ── */}
              <section>
                <div className="mb-6">
                  <h2 className="text-sm font-medium text-text-primary">Praktisk info</h2>
                  <p className="text-sm text-text-secondary mt-1">Hjelp elevene dine med å komme forberedt ved å vise dette på kurssiden.</p>
                </div>
                <div className="space-y-6">
                  {/* Audience Level - Segmented pills (single-select) */}
                  <div>
                    <label className="block text-xs font-medium text-text-primary mb-2.5">
                      Nivå
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {AUDIENCE_LEVEL_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setAudienceLevel(opt.value)}
                          className={cn(
                            'px-3.5 py-1.5 rounded-full text-sm border smooth-transition',
                            audienceLevel === opt.value
                              ? 'bg-zinc-900 text-white border-zinc-900'
                              : 'bg-white text-text-secondary border-zinc-200 hover:border-zinc-300 hover:text-text-primary'
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-text-tertiary mt-2">
                      Velg det laveste nivået som passer.
                    </p>
                  </div>

                  {/* Equipment - Radio buttons (single factual statement) */}
                  <div>
                    <label className="block text-xs font-medium text-text-primary mb-2.5">
                      Utstyr
                    </label>
                    <RadioGroup
                      value={equipment}
                      onValueChange={(val) => setEquipment(val as EquipmentInfo)}
                    >
                      {EQUIPMENT_OPTIONS.map((opt) => (
                        <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer py-1">
                          <RadioGroupItem value={opt.value} />
                          <span className="text-sm text-text-primary">{opt.label}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>

                  {/* Arrival time - Dropdown select */}
                  <div>
                    <label className="block text-xs font-medium text-text-primary mb-1.5">
                      Oppmøte før start
                    </label>
                    <Select
                      value={arrivalMinutes || ARRIVAL_NONE_VALUE}
                      onValueChange={(val) => setArrivalMinutes(val === ARRIVAL_NONE_VALUE ? '' : val)}
                    >
                      <SelectTrigger className="w-52 h-11 bg-input-bg border-zinc-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ARRIVAL_PRESET_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Custom bullets */}
                  <div>
                    <label className="block text-xs font-medium text-text-primary mb-1.5">
                      Egne punkter
                      <span className="ml-2 text-xs font-normal text-text-secondary">Maks {CUSTOM_BULLETS_MAX_COUNT}</span>
                    </label>
                    <div className="space-y-2">
                      {customBullets.map((bullet, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Input
                            type="text"
                            placeholder={CUSTOM_BULLET_PLACEHOLDERS[i] || CUSTOM_BULLET_PLACEHOLDERS[0]}
                            value={bullet}
                            maxLength={CUSTOM_BULLET_MAX_LENGTH}
                            onChange={(e) => {
                              const updated = [...customBullets];
                              updated[i] = e.target.value;
                              setCustomBullets(updated);
                            }}
                            className="flex-1 h-10"
                          />
                          <button
                            type="button"
                            onClick={() => setCustomBullets(customBullets.filter((_, j) => j !== i))}
                            className="text-text-tertiary hover:text-destructive p-1 smooth-transition"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                      {customBullets.length < CUSTOM_BULLETS_MAX_COUNT && (
                        <button
                          type="button"
                          onClick={() => setCustomBullets([...customBullets, ''])}
                          className="text-sm text-text-secondary hover:text-text-primary flex items-center gap-1 smooth-transition"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Legg til punkt
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </section>
              </motion.div>
            )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="bg-white/80 backdrop-blur-lg border-t border-border py-4 px-4 sm:px-6 shrink-0 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="max-w-2xl mx-auto flex flex-col gap-3">
            {!showReviewView && submitAttempted && !validateStep(currentStep) && (
              <Alert variant="destructive" size="sm" aria-live="polite">
                <p className="text-sm text-destructive text-center">
                  Fyll ut de markerte feltene.
                </p>
              </Alert>
            )}
            {submitError && (
              <Alert variant="destructive" size="sm" aria-live="polite">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-destructive whitespace-pre-line">{submitError}</p>
                  <button
                    type="button"
                    onClick={() => setSubmitError(null)}
                    className="text-destructive/60 hover:text-destructive transition-colors p-1 -m-1 rounded"
                    aria-label="Lukk"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </Alert>
            )}
            <div className="flex items-center justify-end space-x-3">
              <Button
                type="button"
                variant="ghost"
                size="compact"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Avbryt
              </Button>
              {showReviewView ? (
                <>
                  <Button
                    type="button"
                    variant="outline-soft"
                    size="compact"
                    onClick={() => setShowReviewView(false)}
                    disabled={isSubmitting}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                    Tilbake til redigering
                  </Button>
                  <Button
                    type="button"
                    size="compact"
                    onClick={handlePublish}
                    disabled={isSubmitting}
                    loading={isSubmitting}
                    loadingText="Oppretter"
                  >
                    <span>Publiser kurs</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </>
              ) : (
                <>
                  {currentStep > 0 && (
                    <Button
                      type="button"
                      variant="outline-soft"
                      size="compact"
                      onClick={handleBack}
                      disabled={isSubmitting}
                    >
                      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                      Tilbake
                    </Button>
                  )}
                  {currentStep < 2 && (
                    <Button
                      type="button"
                      size="compact"
                      onClick={handleNext}
                      disabled={isSubmitting}
                    >
                      Neste
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  )}
                  {currentStep === 2 && (
                    <div className="flex flex-col items-end gap-1.5">
                      <Button
                        type="button"
                        size="compact"
                        onClick={() => setShowReviewView(true)}
                        disabled={isSubmitting || !isFormValid}
                      >
                        <span>Sjekk og publiser</span>
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                      {!isFormValid && (
                        <p className="text-xs text-text-secondary">
                          Fyll ut alle påkrevde felt for å fortsette
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </footer>

      </main>
    </SidebarProvider>
  );
};

export default CreateCoursePage;

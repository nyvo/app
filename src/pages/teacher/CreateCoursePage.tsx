import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { addDays } from 'date-fns';
import {
  Layers,
  CalendarDays,
  Check,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  AlertCircle,
  X,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { useAuth } from '@/contexts/AuthContext';
import { createCourse, updateCourse, fetchExistingSessions } from '@/services/courses';
import type { ExistingSession } from '@/services/courses';
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
import { RadioGroup, RadioGroupItem, RadioGroupCardItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Stepper } from '@/components/ui/stepper';

import { tabVariants, tabTransition } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { CourseType as DBCourseType, Json } from '@/types/database';
import type { AudienceLevel, EquipmentInfo, PracticalInfo } from '@/types/practicalInfo';
import { AUDIENCE_LEVEL_OPTIONS, EQUIPMENT_OPTIONS, ARRIVAL_PRESET_OPTIONS, ARRIVAL_NONE_VALUE, ARRIVAL_DEFAULT_MINUTES, CUSTOM_BULLET_PLACEHOLDERS, CUSTOM_BULLETS_MAX_COUNT, CUSTOM_BULLET_MAX_LENGTH, ARRIVAL_MINUTES_MAX } from '@/utils/practicalInfoUtils';

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

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);


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

  // Clear conflict error when timeslot fields change
  useEffect(() => {
    if (submitError === 'conflict') {
      setSubmitError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, startTime, duration, weeks]);

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

  // Fetch existing sessions for the selected date(s) to show overlap warnings
  const [existingSessions, setExistingSessions] = useState<ExistingSession[]>([]);

  useEffect(() => {
    if (!startDate || !currentOrganization?.id) {
      setExistingSessions([]);
      return;
    }

    const dates: string[] = [];
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    if (courseType === 'series') {
      const weeksNum = parseInt(weeks) || 1;
      for (let i = 0; i < weeksNum; i++) {
        dates.push(fmt(addDays(startDate, i * 7)));
      }
    } else {
      dates.push(fmt(startDate));
    }

    fetchExistingSessions(currentOrganization.id, dates).then(({ data }) => {
      setExistingSessions(data);
    });
  }, [startDate, weeks, courseType, currentOrganization?.id]);

  // Check if the selected time + duration overlaps with any existing session
  const timeConflicts = useMemo(() => {
    if (!startTime || existingSessions.length === 0) return [];

    const dur = duration || 60;
    const candidateStart = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
    const candidateEnd = candidateStart + dur;

    return existingSessions.filter(
      s => candidateStart < s.endMinutes && s.startMinutes < candidateEnd
    );
  }, [startTime, duration, existingSessions]);

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
        status: 'draft' as const,
        practical_info: currentPracticalInfo ? (currentPracticalInfo as unknown as Json) : null,
      };

      const { data: createdCourse, error, conflicts } = await createCourse(courseData, {
        eventDays: courseType === 'single' ? 1 : undefined,
      });

      if (error || !createdCourse) {
        if (conflicts && conflicts.length > 0) {
          setSubmitError('conflict');
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
        toast.warning('Kurset er opprettet. Last opp kursbilde fra kurssiden.');
      } else {
        toast.success('Kurs opprettet');
      }

      navigate(`/teacher/courses/${createdCourse.id}`);
    } catch {
      setSubmitError('Noe gikk galt. Prøv igjen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <MobileTeacherHeader title="Opprett kurs" />

      <div
        ref={contentScrollRef}
        className="custom-scrollbar flex-1 overflow-y-auto"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
          <header className="space-y-3">
            <Breadcrumb>
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
            <div className="space-y-1">
              <h1 className="type-heading-1 text-foreground">
                Opprett nytt kurs
              </h1>
              <p className="type-body text-muted-foreground">
                Sett opp et nytt kurs eller arrangement.
              </p>
            </div>
          </header>

          <div className="rounded-xl bg-surface-muted/50 p-4 sm:p-5">
            <Stepper
              steps={CREATE_COURSE_STEPS}
              currentStep={currentStep}
              onStepSelect={(index) => index < currentStep && setCurrentStep(index)}
            />
          </div>

          <div className="rounded-xl border border-border bg-surface p-6 sm:p-8">
            <div className="pb-2">
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
                  <h2 id="course-type-label" className="type-title text-foreground">Kurstype</h2>
                  <p className="type-body mt-1 text-muted-foreground">Hva slags kurs vil du opprette?</p>
                </div>
                <RadioGroup
                  value={courseType}
                  onValueChange={(v) => setCourseType(v as CourseType)}
                  aria-labelledby="course-type-label"
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
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
                    title="Arrangement"
                    description="For enkeltkurs, workshops eller arrangementer."
                  />
                </RadioGroup>
              </section>

              {/* ── Section 2: Basic Details ── */}
              <section>
                <div className="mb-6">
                  <h2 className="type-title text-foreground">Detaljer</h2>
                </div>
                <div className="space-y-6">
                  {/* Title */}
                  <div>
                    <label htmlFor="create-title" className="type-label-sm mb-1.5 block text-foreground">
                      Tittel
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
                      <p id="create-title-error" className="type-meta mt-1.5 flex items-center gap-1 text-destructive" role="alert">
                        <AlertCircle className="h-3 w-3" aria-hidden="true" />
                        {errors.title}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div className="relative">
                    <label htmlFor="create-description" className="type-label-sm mb-1.5 block text-foreground">
                      Beskrivelse
                      <span className="type-meta ml-2 text-muted-foreground">Valgfritt</span>
                    </label>
                    <Textarea
                      id="create-description"
                      placeholder="Beskriv kurset kort for deltakerne"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={DESCRIPTION_MAX_LENGTH}
                      rows={3}
                      className="min-h-[100px]"
                    />
                    <div className="flex justify-end mt-1.5">
                      <p className={`type-meta ${description.length > DESCRIPTION_WARN_LENGTH ? (description.length > DESCRIPTION_MAX_LENGTH ? 'text-destructive' : 'text-warning') : 'text-muted-foreground'}`}>
                        {description.length}/{DESCRIPTION_MAX_LENGTH}
                      </p>
                    </div>
                  </div>

                  {/* Cover Image */}
                  <div>
                    <label className="type-label-sm mb-1.5 block text-foreground">
                      Kursbilde
                      <span className="type-meta ml-2 text-muted-foreground">Valgfritt</span>
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
                <div className="space-y-6">
                  {/* Date + Weeks row */}
                  <div className={cn("grid grid-cols-1 gap-5", courseType === 'series' && "sm:grid-cols-2")}>
                    <div>
                      <label htmlFor="create-start-date" className="type-label-sm mb-1.5 block text-foreground">
                        {courseType === 'single' ? 'Dato' : 'Startdato'}
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
                        <p id="startDate-error" className="type-meta mt-1.5 flex items-center gap-1 text-destructive" role="alert">
                          <AlertCircle className="h-3 w-3" aria-hidden="true" />
                          {errors.startDate}
                        </p>
                      )}
                    </div>

                    {courseType === 'series' && (
                      <div>
                        <label className="type-label-sm mb-1.5 block text-foreground">
                          Uker
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
                              className={`type-label flex h-11 w-full items-center justify-between rounded-lg border bg-surface px-4 text-left text-foreground focus:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 hover:border-ring ios-ease ${
                                showError('weeks') ? 'border-destructive' : 'border-input'
                              }`}
                            >
                              <span className={weeks ? 'text-foreground' : 'text-muted-foreground'}>{weeks || 'Velg'}</span>
                              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isWeeksOpen ? 'rotate-180' : ''} ${showError('weeks') ? 'text-destructive' : ''}`} />
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
                                  className={`type-body flex items-center justify-between rounded-lg px-3 py-2 transition-colors ${
                                    weeks === week.toString()
                                      ? 'bg-primary text-primary-foreground'
                                      : 'text-sidebar-foreground hover:bg-secondary hover:text-foreground'
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
                          <p id="weeks-error" className="type-meta mt-1.5 flex items-center gap-1 text-destructive" role="alert">
                            <AlertCircle className="h-3 w-3" aria-hidden="true" />
                            {errors.weeks}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Time + Duration row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="create-start-time" className="type-label-sm mb-1.5 block text-foreground">
                        Starttid
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
                        <p id="startTime-error" className="type-meta mt-1.5 flex items-center gap-1 text-destructive" role="alert">
                          <AlertCircle className="h-3 w-3" aria-hidden="true" />
                          {errors.startTime}
                        </p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="create-duration" className="type-label-sm mb-1.5 block text-foreground">
                        Varighet
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
                            "w-full h-11",
                            showError('duration') ? "border-destructive" : "border-input"
                          )}
                        >
                          <SelectValue placeholder="Velg" />
                        </SelectTrigger>
                        <SelectContent>
                          {[15, 30, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240].map((mins) => (
                            <SelectItem key={mins} value={mins.toString()}>
                              {mins < 60 ? `${mins} min` : mins % 60 > 0 ? `${Math.floor(mins / 60)}t ${mins % 60}min` : `${Math.floor(mins / 60)} ${Math.floor(mins / 60) === 1 ? 'time' : 'timer'}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {showError('duration') && (
                        <p id="duration-error" className="type-meta mt-1.5 flex items-center gap-1 text-destructive" role="alert">
                          <AlertCircle className="h-3 w-3" aria-hidden="true" />
                          {errors.duration}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Time conflict warning */}
                  {timeConflicts.length > 0 && (
                    <Alert variant="warning" size="sm">

                      <AlertDescription variant="warning">
                        {timeConflicts.length === 1
                          ? `«${timeConflicts[0].courseTitle}» overlapper (kl. ${timeConflicts[0].startTime}–${timeConflicts[0].endTime})`
                          : `${timeConflicts.length} kurs overlapper med dette tidspunktet`}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Location */}
                  <div>
                    <label htmlFor="create-location" className="type-label-sm mb-1.5 block text-foreground">
                      Sted
                    </label>
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
                        "w-full h-11",
                        showError('location') ? 'border-destructive focus-visible:ring-destructive' : 'border-input'
                      )}
                    />
                    {showError('location') && (
                      <p id="create-location-error" className="type-meta mt-1.5 flex items-center gap-1 text-destructive" role="alert">
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
                <div className="mb-6">
                  <h2 className="type-title text-foreground">Påmelding</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Price */}
                  <div>
                    <label htmlFor="create-price" className="type-label-sm mb-1.5 block text-foreground">
                      Pris
                      <span className="type-meta ml-2 text-muted-foreground">per person</span>
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
                          showError('price') ? 'border-destructive focus-visible:ring-destructive' : 'border-input'
                        )}
                      />
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <span className={`type-meta ${showError('price') ? 'text-destructive' : 'text-muted-foreground'}`}>kr</span>
                      </div>
                    </div>
                    {showError('price') && (
                      <p id="create-price-error" className="type-meta mt-1.5 flex items-center gap-1 text-destructive" role="alert">
                        <AlertCircle className="h-3 w-3" aria-hidden="true" />
                        {errors.price}
                      </p>
                    )}
                  </div>

                  {/* Capacity */}
                  <div>
                    <label htmlFor="create-capacity" className="type-label-sm mb-1.5 block text-foreground">
                      Maks antall deltakere
                    </label>
                    <Input
                      ref={capacityRef}
                      id="create-capacity"
                      type="number"
                      placeholder="F.eks. 20"
                      min="1"
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                      onBlur={() => handleBlur('capacity')}
                      aria-describedby={showError('capacity') ? 'create-capacity-error' : undefined}
                      aria-invalid={showError('capacity') ? 'true' : undefined}
                      aria-required="true"
                      className={cn(
                        "w-full h-11",
                        showError('capacity') ? 'border-destructive focus-visible:ring-destructive' : 'border-input'
                      )}
                    />
                    {showError('capacity') && (
                      <p id="create-capacity-error" className="type-meta mt-1.5 flex items-center gap-1 text-destructive" role="alert">
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
                  <h2 className="type-title text-foreground">Praktisk info</h2>
                  <p className="type-body mt-1 text-muted-foreground">Dette vises på kurssiden og hjelper deltakerne å komme forberedt.</p>
                </div>
                <div className="space-y-6">
                  {/* Audience Level - Segmented pills (single-select) */}
                  <div>
                    <label className="type-label-sm mb-2.5 block text-foreground">
                      Nivå
                      <span className="type-meta ml-2 text-muted-foreground">Valgfritt</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {AUDIENCE_LEVEL_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setAudienceLevel(opt.value)}
                          className={cn(
                            'type-label rounded-md border px-3.5 py-1.5 smooth-transition',
                            audienceLevel === opt.value
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-surface text-muted-foreground border-border hover:border-input hover:text-foreground'
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <p className="type-meta mt-2 text-muted-foreground">
                      Velg hvem kurset passer for.
                    </p>
                  </div>

                  {/* Equipment - Radio buttons (single factual statement) */}
                  <div>
                    <label className="type-label-sm mb-2.5 block text-foreground">
                      Utstyr
                      <span className="type-meta ml-2 text-muted-foreground">Valgfritt</span>
                    </label>
                    <RadioGroup
                      value={equipment}
                      onValueChange={(val) => setEquipment(val as EquipmentInfo)}
                    >
                      {EQUIPMENT_OPTIONS.map((opt) => (
                        <label key={opt.value} className="flex items-center gap-2.5 cursor-pointer py-1">
                          <RadioGroupItem value={opt.value} />
                          <span className="type-body text-foreground">{opt.label}</span>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>

                  {/* Arrival time - Dropdown select */}
                  <div>
                    <label className="type-label-sm mb-1.5 block text-foreground">
                      Oppmøte før start
                      <span className="type-meta ml-2 text-muted-foreground">Valgfritt</span>
                    </label>
                    <Select
                      value={arrivalMinutes || ARRIVAL_NONE_VALUE}
                      onValueChange={(val) => setArrivalMinutes(val === ARRIVAL_NONE_VALUE ? '' : val)}
                    >
                      <SelectTrigger className="w-full sm:w-52 h-11 border-input">
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
                    <label className="type-label-sm mb-1.5 block text-foreground">
                      Egne punkter
                      <span className="type-meta ml-2 text-muted-foreground">Maks {CUSTOM_BULLETS_MAX_COUNT}</span>
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
                            className="h-11 flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            type="button"
                            onClick={() => setCustomBullets(customBullets.filter((_, j) => j !== i))}
                            className="text-muted-foreground hover:text-destructive hover:bg-transparent"
                            aria-label={`Fjern punkt ${i + 1}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {customBullets.length < CUSTOM_BULLETS_MAX_COUNT && (
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          onClick={() => setCustomBullets([...customBullets, ''])}
                          className="type-body text-muted-foreground h-auto p-0 hover:bg-transparent hover:text-foreground"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Legg til punkt
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </section>
              </motion.div>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="shrink-0 border-t border-border bg-background/80 px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-lg sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
            {submitAttempted && !validateStep(currentStep) && (
              <Alert variant="destructive" size="sm" aria-live="polite">
                <p className="type-body text-center text-destructive">
                  Fyll ut de markerte feltene.
                </p>
              </Alert>
            )}
            {submitError && (
              <Alert variant="destructive" size="sm" aria-live="polite">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="type-body text-destructive">
                      {submitError === 'conflict' ? 'Tidspunktet er opptatt. Velg et annet.' : submitError}
                    </p>
                    {submitError === 'conflict' && currentStep !== 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentStep(1);
                          contentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                          setTimeout(() => startTimeRef.current?.focus(), 400);
                        }}
                        className="type-meta whitespace-nowrap text-destructive underline underline-offset-2 transition-colors hover:text-destructive/80"
                      >
                        Endre tidspunkt
                      </button>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    type="button"
                    onClick={() => setSubmitError(null)}
                    className="text-destructive/60 hover:text-destructive hover:bg-transparent shrink-0"
                    aria-label="Lukk"
                  >
                    <X className="h-4 w-4" />
                  </Button>
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
                    <Button
                      type="button"
                      size="compact"
                      onClick={handlePublish}
                      disabled={isSubmitting}
                      loading={isSubmitting}
                      loadingText="Oppretter …"
                    >
                      Opprett kurs
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  )}
            </div>
          </div>
      </footer>
    </div>
  );
};

export default CreateCoursePage;

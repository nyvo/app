import { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
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

type CourseType = 'series' | 'single';

const timeSlots = TIME_SLOTS_DEFAULT;

interface FormErrors {
  startDate?: string;
  startTime?: string;
  duration?: string;
  weeks?: string;
  location?: string;
  price?: string;
}

const NewCoursePage = () => {
  const navigate = useNavigate();
  const [courseType, setCourseType] = useState<CourseType>('series');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState('');
  const [isTimeOpen, setIsTimeOpen] = useState(false);
  const [duration, setDuration] = useState('60');
  const [weeks, setWeeks] = useState('8');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Validation logic
  const errors = useMemo<FormErrors>(() => {
    const errs: FormErrors = {};

    if (!startDate) {
      errs.startDate = 'Dato er påkrevd';
    }

    if (!startTime) {
      errs.startTime = 'Tidspunkt er påkrevd';
    }

    if (!duration || parseInt(duration) <= 0) {
      errs.duration = 'Varighet må være større enn 0';
    }

    if (courseType === 'series' && (!weeks || parseInt(weeks) <= 0)) {
      errs.weeks = 'Antall uker må være større enn 0';
    }

    if (!location.trim()) {
      errs.location = 'Sted er påkrevd';
    }

    if (!price || parseInt(price) < 0) {
      errs.price = 'Pris er påkrevd';
    }

    return errs;
  }, [startDate, startTime, duration, weeks, location, price, courseType]);

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

  const handlePublish = () => {
    setSubmitAttempted(true);

    if (!isFormValid) {
      return;
    }

    console.log({
      courseType,
      startDate,
      startTime,
      duration,
      weeks,
      location,
      price,
    });
    navigate('/teacher/schedule');
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
            <h1 className="font-geist text-3xl font-medium text-text-primary tracking-tight">
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
            <section className="rounded-3xl border border-border bg-white p-6 md:p-8 shadow-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-4">
                1. Velg type
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Option A: Kursrekke */}
                <button
                  type="button"
                  onClick={() => setCourseType('series')}
                  className={`relative flex flex-col gap-3 p-5 rounded-2xl text-left cursor-pointer group transition-all ${
                    courseType === 'series'
                      ? 'bg-surface border-2 border-text-primary shadow-sm'
                      : 'border border-border bg-surface/50 hover:bg-surface hover:border-ring opacity-70 hover:opacity-100'
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
                  className={`relative flex flex-col gap-3 p-5 rounded-2xl text-left cursor-pointer group transition-all ${
                    courseType === 'single'
                      ? 'bg-surface border-2 border-text-primary shadow-sm'
                      : 'border border-border bg-surface/50 hover:bg-surface hover:border-ring opacity-70 hover:opacity-100'
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
            <section className="rounded-3xl border border-border bg-white p-6 md:p-8 shadow-sm space-y-6">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                2. Detaljer
              </h2>

              {/* Grid for Logistics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Start Date - Calendar Picker */}
                <div className="group space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    {courseType === 'single' ? 'Dato' : 'Startdato'} <span className="text-red-500">*</span>
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        onBlur={() => handleBlur('startDate')}
                        className={`flex items-center justify-between w-full rounded-xl border py-2.5 px-4 text-text-primary text-sm bg-surface transition-all text-left focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${
                          showError('startDate') ? 'border-red-500' : 'border-border'
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
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Tidspunkt <span className="text-red-500">*</span>
                  </label>
                  <Popover open={isTimeOpen} onOpenChange={setIsTimeOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        onBlur={() => handleBlur('startTime')}
                        className={`flex items-center justify-between w-full rounded-xl border py-2.5 px-4 text-text-primary text-sm bg-surface transition-all text-left focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${
                          showError('startTime') ? 'border-red-500' : 'border-border'
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
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Varighet (minutter) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="60"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      onBlur={() => handleBlur('duration')}
                      className={`w-full rounded-xl border py-2.5 pl-4 pr-12 text-text-primary placeholder-text-tertiary text-sm bg-surface transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${
                        showError('duration') ? 'border-red-500' : 'border-border'
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

                {/* Number of Weeks - Text Input (only for series) */}
                <div className={`space-y-2 ${courseType === 'single' ? 'opacity-50' : ''}`}>
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Antall uker {courseType === 'series' && <span className="text-red-500">*</span>}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="8"
                      value={courseType === 'single' ? '1' : weeks}
                      onChange={(e) => setWeeks(e.target.value)}
                      onBlur={() => handleBlur('weeks')}
                      disabled={courseType === 'single'}
                      className={`w-full rounded-xl border py-2.5 pl-4 pr-14 text-sm transition-all ${
                        courseType === 'single'
                          ? 'bg-surface-elevated text-text-tertiary border-border cursor-not-allowed'
                          : showError('weeks')
                          ? 'bg-surface text-text-primary border-red-500 placeholder-text-tertiary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                          : 'bg-surface text-text-primary border-border placeholder-text-tertiary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                      }`}
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className={`text-xs font-medium ${courseType === 'single' ? 'text-text-tertiary' : showError('weeks') ? 'text-red-500' : 'text-muted-foreground'}`}>{courseType === 'single' ? 'uke' : 'uker'}</span>
                    </div>
                  </div>
                  {courseType === 'series' && showError('weeks') && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.weeks}
                    </p>
                  )}
                </div>
              </div>

              {/* Grid for Location & Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Location */}
                <div className="sm:col-span-2 md:col-span-1 space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Sted / Lokale <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Skriv inn sted"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      onBlur={() => handleBlur('location')}
                      className={`w-full rounded-xl border py-2.5 pl-10 pr-4 text-text-primary placeholder-text-tertiary text-sm bg-surface transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${
                        showError('location') ? 'border-red-500' : 'border-border'
                      }`}
                    />
                    <MapPin className={`absolute left-3.5 top-3 h-4 w-4 ${showError('location') ? 'text-red-500' : 'text-text-tertiary'}`} />
                  </div>
                  {showError('location') && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.location}
                    </p>
                  )}
                </div>

                {/* Price */}
                <div className="sm:col-span-2 md:col-span-1 space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Totalpris <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      onBlur={() => handleBlur('price')}
                      className={`w-full rounded-xl border py-2.5 pl-4 pr-12 text-text-primary placeholder-text-tertiary text-sm bg-surface transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${
                        showError('price') ? 'border-red-500' : 'border-border'
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
                  <div className="p-2 bg-[#F7F5F2] rounded-lg text-muted-foreground">
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
        <div className="p-6 border-t border-border bg-surface z-10">
          <div className="max-w-3xl mx-auto flex flex-col gap-3">
            {submitAttempted && !isFormValid && (
              <div className="flex items-center justify-center gap-2 text-sm text-red-500">
                <AlertCircle className="h-4 w-4" />
                <span>Vennligst fyll ut alle påkrevde felt</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleCancel}
                className="h-10 rounded-lg border border-border bg-white px-3 py-2 text-xs font-medium text-text-secondary shadow-sm hover:bg-surface-elevated hover:text-text-primary ios-ease"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={submitAttempted && !isFormValid}
                className={`flex items-center gap-2 h-10 rounded-lg px-3 py-2 text-xs font-medium shadow-sm ios-ease ${
                  submitAttempted && !isFormValid
                    ? 'bg-text-tertiary text-white cursor-not-allowed'
                    : 'bg-text-primary text-white hover:bg-sidebar-foreground'
                }`}
              >
                <span>Publiser kurs</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </SidebarProvider>
  );
};

export default NewCoursePage;

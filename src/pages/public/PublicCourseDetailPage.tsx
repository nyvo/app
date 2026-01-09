import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  MapPin,
  Info,
  ArrowRight,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Leaf,
  Check,
  Loader2,
  CheckCircle2,
  Layers,
  User,
  LogOut,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchPublicCourseById, type PublicCourseWithDetails } from '@/services/publicCourses';
import { fetchCourseSessions } from '@/services/courses';
import { checkCourseAvailability } from '@/services/signups';
import { checkIfAlreadySignedUp } from '@/services/studentSignups';
import { createCheckoutSession } from '@/services/checkout';
import { toast } from 'sonner';
import type { CourseSession } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Helper to format date for display
function formatCourseDate(dateString: string | null): { month: string; day: string; dayName: string; fullDate: string; shortDate: string } {
  if (!dateString) {
    return { month: '—', day: '—', dayName: '', fullDate: 'Dato ikke satt', shortDate: '—' };
  }

  const date = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
  const days = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
  const shortDays = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];

  return {
    month: months[date.getMonth()],
    day: String(date.getDate()).padStart(2, '0'),
    dayName: days[date.getDay()],
    fullDate: `${days[date.getDay()]}, ${date.getDate()}. ${months[date.getMonth()]}`,
    shortDate: `${shortDays[date.getDay()]}, ${date.getDate()}. ${months[date.getMonth()]}`
  };
}

// Extract time from time_schedule (e.g., "Mandager, 18:00" -> "18:00")
function extractTime(timeSchedule: string | null): string {
  if (!timeSchedule) return '';
  const match = timeSchedule.match(/(\d{1,2}:\d{2})/);
  return match ? match[1] : '';
}

// Format duration display (always in minutes)
function formatDuration(duration: number | null): string {
  if (!duration) return '';
  return `${duration} min`;
}

// Map level to display text
function getLevelDisplay(level: string | null): string {
  switch (level) {
    case 'nybegynner': return 'Nybegynner';
    case 'viderekommen': return 'Viderekommen';
    case 'alle': return 'Middels';
    default: return '';
  }
}

// Format time to HH:MM (strip seconds if present, e.g., "07:15:00" -> "07:15")
function formatTime(time: string): string {
  const parts = time.split(':');
  return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : time;
}

// Format time range for session (e.g., "07:15 - 08:15")
function formatTimeRange(startTime: string, endTime: string | null, duration: number | null): string {
  const formattedStart = formatTime(startTime);
  if (endTime) {
    return `${formattedStart} - ${formatTime(endTime)}`;
  }
  if (duration && startTime) {
    // Calculate end time from start time + duration
    const [hours, minutes] = startTime.split(':').map(Number);
    const endMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(endMinutes / 60) % 24;
    const endMins = endMinutes % 60;
    return `${formattedStart} - ${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
  }
  return formattedStart;
}

// Get schedule description based on session pattern
function getScheduleDescription(sessions: CourseSession[], _isSeries: boolean): string {
  if (sessions.length === 0) return '';

  // Get unique weekdays (0-6)
  const weekdays = sessions.map(s => new Date(s.session_date).getDay());
  const uniqueWeekdays = [...new Set(weekdays)];

  // All sessions on same weekday
  if (uniqueWeekdays.length === 1) {
    const dayName = new Intl.DateTimeFormat('nb-NO', { weekday: 'long' })
      .format(new Date(sessions[0].session_date)).toLowerCase();
    return `Hver ${dayName}`;
  }

  // Multiple different weekdays - show date range
  const firstDate = new Date(sessions[0].session_date);
  const lastDate = new Date(sessions[sessions.length - 1].session_date);

  const firstDay = firstDate.getDate();
  const lastDay = lastDate.getDate();

  // Check if same month
  if (firstDate.getMonth() === lastDate.getMonth()) {
    const month = new Intl.DateTimeFormat('nb-NO', { month: 'long' })
      .format(lastDate).toLowerCase();
    return `${firstDay}. - ${lastDay}. ${month}`;
  }

  // Different months
  const firstMonth = new Intl.DateTimeFormat('nb-NO', { month: 'short' })
    .format(firstDate).replace('.', '');
  const lastMonth = new Intl.DateTimeFormat('nb-NO', { month: 'short' })
    .format(lastDate).replace('.', '');
  return `${firstDay}. ${firstMonth} - ${lastDay}. ${lastMonth}`;
}

const PublicCourseDetailPage = () => {
  const { slug, courseId } = useParams<{ slug: string; courseId: string }>();
  const { user, userType, profile, signOut } = useAuth();

  // Data fetching state
  const [course, setCourse] = useState<PublicCourseWithDetails | null>(null);
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isAlreadySignedUp, setIsAlreadySignedUp] = useState(false);
  const [signupStatus, setSignupStatus] = useState<string | null>(null);

  // Booking flow state
  const [step, setStep] = useState(1);
  const [bookingSuccess, _setBookingSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    message: '',
    termsAccepted: false
  });

  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Pre-fill form data for authenticated students
  useEffect(() => {
    if (user && userType === 'student' && profile) {
      const nameParts = profile.name?.split(' ') || [];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      setFormData(prev => ({
        ...prev,
        firstName,
        lastName,
        email: profile.email || ''
      }));
    }
  }, [user, userType, profile]);

  // Fetch course data and sessions
  useEffect(() => {
    async function loadCourseAndSessions() {
      if (!courseId) {
        setFetchError('Kurs ikke funnet');
        setLoading(false);
        return;
      }

      setLoading(true);
      setFetchError(null);

      // Fetch course data
      const { data, error } = await fetchPublicCourseById(courseId);

      if (error) {
        setFetchError('Kunne ikke laste kurs');
        setLoading(false);
        return;
      }

      if (!data) {
        setFetchError('Kurset finnes ikke eller er ikke tilgjengelig');
        setLoading(false);
        return;
      }

      setCourse(data);

      // Fetch sessions for the course
      const { data: sessionsData, error: sessionsError } = await fetchCourseSessions(courseId);
      if (!sessionsError && sessionsData) {
        setSessions(sessionsData);
      }

      // Check if student is already signed up
      if (user && profile?.email) {
        const { isSignedUp, signupStatus: status } = await checkIfAlreadySignedUp(
          courseId,
          user.id,
          profile.email
        );
        setIsAlreadySignedUp(isSignedUp);
        setSignupStatus(status);
      }

      setLoading(false);
    }

    loadCourseAndSessions();
  }, [courseId, user, profile?.email]);

  // Handle cancelled payment return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('cancelled') === 'true') {
      toast.info('Betalingen ble avbrutt', {
        description: 'Du kan prøve på nytt når du er klar.',
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));

    const newErrors = { ...errors };

    if (field === 'firstName' && !formData.firstName.trim()) {
      newErrors.firstName = true;
    } else if (field === 'firstName') {
      delete newErrors.firstName;
    }

    if (field === 'lastName' && !formData.lastName.trim()) {
      newErrors.lastName = true;
    } else if (field === 'lastName') {
      delete newErrors.lastName;
    }

    if (field === 'email') {
      if (!formData.email.trim()) {
        newErrors.email = true;
      } else if (!validateEmail(formData.email)) {
        newErrors.email = true;
      } else {
        delete newErrors.email;
      }
    }

    setErrors(newErrors);
  };

  const validateForm = () => {
    const newErrors: Record<string, boolean> = {};
    let isValid = true;

    // For authenticated students, name and email are pre-filled from profile
    // For guests, validate all fields
    const isAuthStudent = user && userType === 'student';

    if (!isAuthStudent) {
      if (!formData.firstName.trim()) {
        newErrors.firstName = true;
        isValid = false;
      }
      if (!formData.lastName.trim()) {
        newErrors.lastName = true;
        isValid = false;
      }
      if (!formData.email.trim()) {
        newErrors.email = true;
        isValid = false;
      } else if (!validateEmail(formData.email)) {
        newErrors.email = true;
        isValid = false;
      }
    }

    if (!formData.termsAccepted) {
      newErrors.termsAccepted = true;
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error when user starts typing/fixing
    if (errors[name]) {
        setErrors(prev => ({
            ...prev,
            [name]: false
        }));
    }
  };

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched on submit
    setTouched({ firstName: true, lastName: true, email: true, termsAccepted: true });

    if (!validateForm()) {
        // Find first error and focus
        const firstErrorField = document.querySelector('[aria-invalid="true"]') as HTMLElement;
        if (firstErrorField) {
            firstErrorField.focus();
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    }

    if (!course || !courseId || !slug) return;

    setSubmitting(true);
    setSubmitError(null);

    // 1. Check availability
    const { available, error: availError } = await checkCourseAvailability(courseId);

    if (availError) {
      setSubmitError('Kunne ikke sjekke tilgjengelighet. Prøv igjen.');
      toast.error('Kunne ikke sjekke tilgjengelighet');
      setSubmitting(false);
      return;
    }

    if (available <= 0) {
      setSubmitError('Beklager, kurset er fullt. Prøv et annet kurs.');
      toast.error('Kurset er fullt');
      setSubmitting(false);
      return;
    }

    // 2. Create Stripe checkout session
    const currentUrl = window.location.origin;
    const { data: checkoutData, error: checkoutError } = await createCheckoutSession({
      courseId,
      organizationSlug: slug,
      customerEmail: formData.email,
      customerName: `${formData.firstName} ${formData.lastName}`.trim(),
      customerPhone: formData.phone || undefined,
      successUrl: `${currentUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${currentUrl}/studio/${slug}/${courseId}?cancelled=true`,
    });

    if (checkoutError || !checkoutData) {
      setSubmitError(checkoutError || 'Kunne ikke starte betalingen. Prøv igjen.');
      toast.error('Kunne ikke starte betaling');
      setSubmitting(false);
      return;
    }

    // 3. Redirect to Stripe Checkout
    if (checkoutData.url) {
      window.location.href = checkoutData.url;
    } else {
      setSubmitError('Kunne ikke omdirigere til betaling. Prøv igjen.');
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (step === 2 && timeLeft > 0 && !bookingSuccess) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, timeLeft, bookingSuccess]);

  const handleNextStep = () => {
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevStep = () => {
    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-surface flex items-center justify-center font-geist">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Laster kurs...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (fetchError || !course) {
    const backUrl = slug ? `/studio/${slug}` : '/';
    return (
      <div className="min-h-screen w-full bg-surface font-geist">
        <header className="fixed top-0 left-0 right-0 z-40 border-b border-border/80 bg-surface/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link to={backUrl} className="flex items-center gap-3 cursor-pointer">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm border border-border text-primary">
                <Leaf className="h-5 w-5" />
              </div>
              <span className="font-geist text-lg font-semibold text-text-primary tracking-tight">Ease</span>
            </Link>
          </div>
        </header>
        <main className="pt-24 px-4 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-3xl border border-destructive/30 bg-white p-12 shadow-sm text-center">
              <p className="text-sm text-destructive mb-4">{fetchError || 'Kurset ble ikke funnet'}</p>
              <Button asChild variant="outline" size="compact">
                <Link to={backUrl}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Tilbake til kurs
                </Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Success state after booking
  if (bookingSuccess) {
    const dateInfo = formatCourseDate(course.start_date);
    const time = extractTime(course.time_schedule);
    const studioUrl = slug ? `/studio/${slug}` : '/';

    return (
      <div className="min-h-screen w-full bg-surface font-geist">
        <header className="fixed top-0 left-0 right-0 z-40 border-b border-border/80 bg-surface/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link to={studioUrl} className="flex items-center gap-3 cursor-pointer">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm border border-border text-primary">
                <Leaf className="h-5 w-5" />
              </div>
              <span className="font-geist text-lg font-semibold text-text-primary tracking-tight">Ease</span>
            </Link>
          </div>
        </header>
        <main className="pt-24 px-4 sm:px-6 pb-24">
          <div className="mx-auto max-w-lg text-center">
            <div className="rounded-3xl border border-border bg-white p-8 md:p-12 shadow-sm">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-status-confirmed-bg">
                <CheckCircle2 className="h-8 w-8 text-status-confirmed-text" />
              </div>
              <h1 className="font-geist text-2xl md:text-3xl font-semibold text-text-primary mb-3">
                Påmelding bekreftet!
              </h1>
              <p className="text-muted-foreground mb-8">
                Du er nå påmeldt <span className="font-medium text-text-primary">{course.title}</span>.
                {(user && userType === 'student' && profile?.email) ? (
                  <> En bekreftelse er sendt til {profile.email}.</>
                ) : (
                  <> En bekreftelse er sendt til {formData.email}.</>
                )}
              </p>

              <div className="rounded-xl bg-surface border border-border p-4 mb-8 text-left">
                <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-3">Kursdetaljer</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dato</span>
                    <span className="font-medium text-text-primary">{dateInfo.fullDate}</span>
                  </div>
                  {time && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tid</span>
                      <span className="font-medium text-text-primary">Kl {time}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sted</span>
                    <span className="font-medium text-text-primary">{course.location || 'Ikke angitt'}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 mt-2">
                    <span className="text-muted-foreground">Betalt</span>
                    <span className="font-semibold text-text-primary">{course.price || 0} kr</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {user && userType === 'student' ? (
                  <>
                    <Button asChild className="w-full" size="compact">
                      <Link to="/student/dashboard">Se dine påmeldinger</Link>
                    </Button>
                    <Button asChild variant="outline-soft" className="w-full" size="compact">
                      <Link to={studioUrl}>Se flere kurs</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild className="w-full" size="compact">
                      <Link to={studioUrl}>Se flere kurs</Link>
                    </Button>
                    <p className="text-xs text-text-tertiary">
                      <Link to="/student/login" className="underline underline-offset-2 hover:text-text-primary">
                        Logg inn
                      </Link>{' '}
                      eller{' '}
                      <Link to="/student/register" className="underline underline-offset-2 hover:text-text-primary">
                        registrer deg
                      </Link>{' '}
                      for å se dine påmeldinger
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Main course detail / booking flow
  const dateInfo = formatCourseDate(course.start_date);
  const time = extractTime(course.time_schedule);
  const durationDisplay = formatDuration(course.duration);
  const levelDisplay = getLevelDisplay(course.level);
  const isFull = course.spots_available === 0;
  const isFewSpots = course.spots_available > 0 && course.spots_available <= 3;
  const isSeries = course.course_type === 'course-series';
  const studioUrl = slug ? `/studio/${slug}` : '/';

  return (
    <>
      <style>{`
        .bg-pattern-dot {
            background-image: radial-gradient(var(--color-ring) 1px, transparent 1px);
            background-size: 20px 20px;
        }
        .input-focus {
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        /* Custom checkbox styling */
        .checkbox-wrapper:checked + div {
            background-color: var(--color-text-primary);
            border-color: var(--color-text-primary);
        }
        .checkbox-wrapper:checked + div svg {
            display: block;
        }
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-4px); }
            75% { transform: translateX(4px); }
        }
        .animate-shake {
            animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>

      <div className="min-h-screen w-full bg-surface text-sidebar-foreground overflow-x-hidden pb-32 lg:pb-0 font-geist">

        {/* Public Header */}
        <header className="fixed top-0 left-0 right-0 z-40 border-b border-border/80 bg-surface/90 backdrop-blur-xl">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
                <Link to={studioUrl} className="flex items-center gap-3 cursor-pointer">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm border border-border text-primary">
                        <Leaf className="h-5 w-5" />
                    </div>
                    <span className="font-geist text-lg font-semibold text-text-primary tracking-tight">Ease</span>
                </Link>

                {step === 1 ? (
                  user && userType === 'student' ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline-soft" size="compact" className="gap-2">
                          <User className="h-3.5 w-3.5" />
                          {profile?.name?.split(' ')[0] || 'Min profil'}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem asChild>
                          <Link to="/student/dashboard" className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            Mine påmeldinger
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={signOut} className="flex items-center gap-2 text-status-error-text">
                          <LogOut className="h-4 w-4" />
                          Logg ut
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Button asChild size="compact">
                      <Link to="/student/login">Logg inn</Link>
                    </Button>
                  )
                ) : (
                  /* Simple Progress Indicator (Desktop) */
                  <div className="hidden md:flex items-center gap-2 text-sm font-medium">
                      <span className="text-text-tertiary">Kurs</span>
                      <ChevronRight className="h-4 w-4 text-border" />
                      <span className="text-text-primary">Detaljer</span>
                      <ChevronRight className="h-4 w-4 text-border" />
                      <span className="text-text-tertiary">Betaling</span>
                  </div>
                )}
            </div>
        </header>

        {/* Main Content */}
        <main className="pt-24 px-4 sm:px-6">
            <div className="mx-auto max-w-5xl">

                {/* Breadcrumb / Back Navigation */}
                <div className="mb-6">
                    {step === 1 ? (
                      <Link to={studioUrl} className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-text-primary transition-colors group">
                          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                          Tilbake til timeplan
                      </Link>
                    ) : (
                      <button onClick={handlePrevStep} className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-text-primary transition-colors group cursor-pointer">
                          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                          Tilbake til kursdetaljer
                      </button>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">

                    {/* Left Column with AnimatePresence */}
                    <div className="relative">
                      <AnimatePresence mode="wait">
                        {step === 1 ? (
                          /* STEP 1: COURSE DETAILS */
                          <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="space-y-8"
                          >
                              {/* Header Section */}
                              <div className="space-y-4">
                                  <h1 className="font-geist text-3xl md:text-4xl font-semibold tracking-tight text-text-primary">
                                      {course.title}
                                  </h1>

                                  {/* Metadata Row */}
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm text-muted-foreground border-b border-border pb-6">
                                      <div className="flex items-center gap-2">
                                          <Calendar className="h-4 w-4 text-text-tertiary" />
                                          <span>{dateInfo.fullDate}</span>
                                      </div>
                                      {time && (
                                        <>
                                          <div className="hidden sm:block h-3 w-px bg-border"></div>
                                          <div className="flex items-center gap-2">
                                              <Clock className="h-4 w-4 text-text-tertiary" />
                                              <span>Kl {time}{durationDisplay && ` (${durationDisplay})`}</span>
                                          </div>
                                        </>
                                      )}
                                      {course.location && (
                                        <>
                                          <div className="hidden sm:block h-3 w-px bg-border"></div>
                                          <div className="flex items-center gap-2">
                                              <MapPin className="h-4 w-4 text-text-tertiary" />
                                              <span>{course.location}</span>
                                          </div>
                                        </>
                                      )}
                                  </div>
                              </div>

                              {/* Hero Image */}
                              {course.image_url && (
                                <div className="relative overflow-hidden rounded-3xl border border-border bg-surface-elevated shadow-sm">
                                    <div className="aspect-[16/7] w-full bg-gradient-to-br from-border to-surface-elevated relative">
                                        <img src={course.image_url} alt={course.title} className="absolute inset-0 h-full w-full object-cover opacity-90" />
                                    </div>
                                </div>
                              )}

                              {/* Description Block */}
                              <div className="space-y-4">
                                  <h2 className="font-geist text-lg font-semibold text-text-primary">Om kurset</h2>
                                  {course.description && (
                                    <div className="prose prose-gray prose-sm max-w-none text-muted-foreground leading-relaxed">
                                        <p>{course.description}</p>
                                    </div>
                                  )}
                                  {/* Course tags */}
                                  <div className="flex flex-wrap items-center gap-2">
                                      {course.style && (
                                        <span className="inline-flex items-center rounded-full bg-surface-elevated px-2.5 py-1 text-xs font-medium text-text-secondary border border-border">
                                            {course.style.name}
                                        </span>
                                      )}
                                      {levelDisplay && (
                                        <span className="inline-flex items-center rounded-full bg-surface-elevated px-2.5 py-1 text-xs font-medium text-text-secondary border border-border">
                                            Nivå: {levelDisplay}
                                        </span>
                                      )}
                                      {isSeries && (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary">
                                          <Layers className="h-3 w-3" />
                                          Kursrekke
                                        </span>
                                      )}
                                  </div>
                              </div>

                              {/* Program Overview - Show if multiple sessions */}
                              {sessions.length > 1 && (
                                <div className="space-y-4">
                                    <h2 className="font-geist text-lg font-semibold text-text-primary">
                                      Program oversikt
                                      <span className="text-muted-foreground font-normal ml-2">
                                        ({sessions.length} {isSeries ? 'uker' : 'dager'})
                                      </span>
                                    </h2>
                                    <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden p-5 space-y-4">
                                        {/* Schedule header */}
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs text-muted-foreground mb-0.5">
                                                  {getScheduleDescription(sessions, isSeries)}
                                                </p>
                                                <p className="text-sm font-medium text-text-primary">
                                                  Kl {formatTimeRange(sessions[0]?.start_time || '', sessions[0]?.end_time || null, course.duration)}
                                                </p>
                                            </div>
                                            <Clock className="h-4 w-4 text-text-tertiary" />
                                        </div>

                                        {/* Date chips */}
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground mb-2">Datoer</p>
                                            <div className="flex flex-wrap gap-2">
                                                {sessions.map((session) => {
                                                  const sessionDate = new Date(session.session_date);
                                                  const day = sessionDate.getDate();
                                                  const month = new Intl.DateTimeFormat('nb-NO', { month: 'short' }).format(sessionDate);
                                                  const isCompleted = session.status === 'completed';

                                                  return (
                                                    <span
                                                      key={session.id}
                                                      className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                                        isCompleted
                                                          ? 'bg-surface-elevated/50 text-text-tertiary border-border line-through'
                                                          : 'bg-surface-elevated text-text-primary border-border hover:border-ring'
                                                      }`}
                                                    >
                                                      {day}. {month.charAt(0).toUpperCase() + month.slice(1).replace('.', '')}
                                                    </span>
                                                  );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                              )}

                              {/* Location Block */}
                              {course.location && (
                                <div className="mb-12">
                                    <h2 className="mb-3 font-geist text-lg font-semibold text-text-primary">Sted & Oppmøte</h2>
                                    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
                                        <div className="flex flex-col md:flex-row">
                                            <div className="bg-pattern-dot flex h-32 w-full items-center justify-center bg-surface md:h-auto md:w-32 shrink-0 border-b md:border-b-0 md:border-r border-border">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-text-primary text-white shadow-lg">
                                                    <MapPin className="h-5 w-5" />
                                                </div>
                                            </div>
                                            <div className="p-5">
                                                <h4 className="font-medium text-text-primary">{course.location}</h4>
                                                <div className="mt-3 flex items-start gap-2 text-xs text-text-tertiary">
                                                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                                                    <p>Døren åpner 15 minutter før kurset starter.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                              )}
                          </motion.div>
                        ) : (
                          /* STEP 2: GUEST DETAILS */
                          <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="space-y-8"
                          >
                              <form id="booking-form" onSubmit={handleSubmit} className="space-y-8" noValidate>
                                {/* Title Block */}
                                <div>
                                    <h1 className="font-geist text-3xl md:text-4xl font-semibold tracking-tight text-text-primary">
                                        Deltakerinformasjon
                                    </h1>
                                    <p className="mt-2 text-muted-foreground">
                                        Vennligst fyll inn dine detaljer. Felter merket med <span className="text-status-error-text">*</span> er påkrevde.
                                    </p>
                                </div>

                                {/* Error message */}
                                {submitError && (
                                  <div className="rounded-xl border border-destructive/30 bg-status-error-bg p-4">
                                    <p className="text-sm text-status-error-text">{submitError}</p>
                                  </div>
                                )}

                                {/* Attendee 1 (Main Contact) */}
                                <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
                                    <div className="mb-5 flex items-center justify-between border-b border-surface-elevated pb-4">
                                        <h2 className="font-geist text-lg font-semibold text-text-primary">Deltaker</h2>
                                    </div>

                                    <div className="space-y-5">
                                        {/* Name Fields */}
                                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                            <div>
                                                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                                    Fornavn <span className="text-status-error-text">*</span>
                                                </label>
                                                <Input
                                                    type="text"
                                                    name="firstName"
                                                    value={formData.firstName}
                                                    onChange={handleInputChange}
                                                    onBlur={() => handleBlur('firstName')}
                                                    placeholder="Ola"
                                                    aria-invalid={!!errors.firstName}
                                                    disabled={submitting}
                                                    className={errors.firstName ? 'border-status-error-text bg-status-error-bg focus:border-status-error-text focus:ring-status-error-text/20 animate-shake' : ''}
                                                />
                                                {errors.firstName && touched.firstName && (
                                                    <p className="text-xs text-status-error-text font-medium mt-1.5">Fornavn er påkrevd</p>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                                    Etternavn <span className="text-status-error-text">*</span>
                                                </label>
                                                <Input
                                                    type="text"
                                                    name="lastName"
                                                    value={formData.lastName}
                                                    onChange={handleInputChange}
                                                    onBlur={() => handleBlur('lastName')}
                                                    placeholder="Nordmann"
                                                    aria-invalid={!!errors.lastName}
                                                    disabled={submitting}
                                                    className={errors.lastName ? 'border-status-error-text bg-status-error-bg focus:border-status-error-text focus:ring-status-error-text/20 animate-shake' : ''}
                                                />
                                                {errors.lastName && touched.lastName && (
                                                    <p className="text-xs text-status-error-text font-medium mt-1.5">Etternavn er påkrevd</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Contact Fields */}
                                        <div>
                                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                                                E-postadresse <span className="text-status-error-text">*</span>
                                            </label>
                                            <Input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                onBlur={() => handleBlur('email')}
                                                placeholder="ola@eksempel.no"
                                                aria-invalid={!!errors.email}
                                                disabled={submitting}
                                                className={errors.email ? 'border-status-error-text bg-status-error-bg focus:border-status-error-text focus:ring-status-error-text/20 animate-shake' : ''}
                                            />
                                            {errors.email && touched.email ? (
                                                <p className="text-xs text-status-error-text font-medium mt-1.5">Gyldig e-postadresse er påkrevd</p>
                                            ) : (
                                                <p className="text-xs text-text-tertiary mt-1.5">Ordrebekreftelse sendes hit.</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Telefonnummer <span className="text-text-tertiary">(Valgfritt)</span></label>
                                            <Input
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleInputChange}
                                                placeholder="+47 000 00 000"
                                                disabled={submitting}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Kommentar til instruktør <span className="text-text-tertiary">(Valgfritt)</span></label>
                                            <textarea
                                                name="message"
                                                value={formData.message}
                                                onChange={handleInputChange}
                                                placeholder="Skriv en beskjed..."
                                                rows={3}
                                                disabled={submitting}
                                                className="block w-full rounded-xl border border-border bg-input-bg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-ring focus:bg-white focus:outline-none focus:ring-4 focus:ring-border/30 hover:border-ring ios-ease resize-none disabled:opacity-50"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Terms Checkbox */}
                                <div className="flex items-start gap-3 px-1">
                                    <label className="relative flex items-center justify-center cursor-pointer p-0.5">
                                        <input
                                            type="checkbox"
                                            name="termsAccepted"
                                            checked={formData.termsAccepted}
                                            onChange={handleInputChange}
                                            required
                                            disabled={submitting}
                                            className="checkbox-wrapper peer sr-only"
                                        />
                                        <div className={`h-4 w-4 rounded-sm border bg-white transition-all peer-focus:ring-2 peer-focus:ring-border hover:border-text-tertiary ${errors.termsAccepted ? 'border-status-error-text ring-1 ring-status-error-text' : 'border-ring'}`}>
                                            <Check className="hidden h-3 w-3 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={3} />
                                        </div>
                                    </label>
                                    <div className="flex flex-col">
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            Jeg godtar <Link to="/terms" target="_blank" className="text-text-primary underline underline-offset-2 hover:text-primary">vilkår for påmelding</Link>. <span className="text-status-error-text">*</span>
                                        </p>
                                        {errors.termsAccepted && (
                                            <p className="text-xs text-status-error-text font-medium mt-1">Du må godta vilkårene</p>
                                        )}
                                    </div>
                                </div>
                              </form>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Right Column: Sticky Booking Action */}
                    <div className="relative hidden lg:block">
                        <div className="sticky top-28 space-y-4">

                            {/* Main Booking Card */}
                            <div className="rounded-3xl border border-border bg-white p-6 shadow-xl shadow-gray-900/5">

                                {step === 1 ? (
                                  <>
                                    <div className="mb-6 flex items-start justify-between">
                                        <div>
                                            <div className="text-3xl font-semibold text-text-primary tracking-tight">{course.price || 0} kr</div>
                                            <div className="text-xs text-text-tertiary mt-1">per person</div>
                                        </div>
                                        {isFull ? (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-border px-2 py-0.5 text-xxs font-medium text-text-secondary">
                                            Fullt
                                          </span>
                                        ) : isFewSpots ? (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-status-waitlist-bg px-2 py-0.5 text-xxs font-medium text-status-waitlist-text">
                                            {course.spots_available} {course.spots_available === 1 ? 'plass' : 'plasser'} igjen
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-status-confirmed-bg px-2 py-0.5 text-xxs font-medium text-status-confirmed-text">
                                              <span className="relative flex h-1.5 w-1.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-confirmed-text opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-status-confirmed-text"></span>
                                              </span>
                                              {course.spots_available} plasser igjen
                                          </span>
                                        )}
                                    </div>

                                    <div className="mb-6 space-y-3 rounded-xl bg-surface p-4 border border-border/50">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Dato</span>
                                            <span className="font-medium text-text-primary">{dateInfo.shortDate}</span>
                                        </div>
                                        {time && (
                                          <div className="flex items-center justify-between text-sm">
                                              <span className="text-muted-foreground">Tid</span>
                                              <span className="font-medium text-text-primary">Kl {time}</span>
                                          </div>
                                        )}
                                        {course.location && (
                                          <div className="flex items-center justify-between text-sm">
                                              <span className="text-muted-foreground">Sted</span>
                                              <span className="font-medium text-text-primary">{course.location}</span>
                                          </div>
                                        )}
                                    </div>

                                    {isAlreadySignedUp && (
                                      <div className="mb-4 rounded-xl bg-status-confirmed-bg border border-status-confirmed-border p-4 flex items-center gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-status-confirmed-text" />
                                        <div>
                                          <p className="text-sm font-medium text-status-confirmed-text">
                                            {signupStatus === 'confirmed' ? 'Du er påmeldt' : 'På venteliste'}
                                          </p>
                                          <p className="text-xs text-status-confirmed-text/70">
                                            {signupStatus === 'confirmed'
                                              ? 'Se dine påmeldinger i dashbordet'
                                              : 'Du vil bli varslet hvis det blir ledig plass'}
                                          </p>
                                        </div>
                                      </div>
                                    )}

                                    <Button
                                        onClick={handleNextStep}
                                        size="compact"
                                        className="w-full"
                                        disabled={isFull || isAlreadySignedUp}
                                    >
                                        <span className="relative z-10 flex items-center justify-center gap-2">
                                            {isAlreadySignedUp ? 'Allerede påmeldt' : isFull ? 'Kurset er fullt' : 'Påmelding'}
                                            {!isFull && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
                                        </span>
                                    </Button>

                                    {!(user && userType === 'student') && (
                                      <p className="mt-4 text-center text-xs text-text-tertiary">
                                          <Link to="/student/login" className="underline underline-offset-2 hover:text-text-primary transition-colors">Logg inn</Link> eller <Link to="/student/register" className="underline underline-offset-2 hover:text-text-primary transition-colors">registrer deg</Link> for å lagre denne bestillingen i din kursoversikt
                                      </p>
                                    )}
                                  </>
                                ) : (
                                  /* Step 2 Summary */
                                  <>
                                    {/* Content without nested card wrapper */}
                                    <h3 className="mb-4 font-geist text-lg font-semibold text-text-primary">Sammendrag</h3>

                                    <div className="flex gap-4 border-b border-surface-elevated pb-5">
                                        {course.image_url && (
                                          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-elevated">
                                              <img src={course.image_url} className="h-full w-full object-cover" alt={course.title} />
                                          </div>
                                        )}
                                        <div>
                                            <h4 className="font-medium text-text-primary leading-tight">{course.title}</h4>
                                            <p className="mt-1 text-xs text-muted-foreground">{dateInfo.shortDate} {time && `Kl ${time}`}</p>
                                            {course.location && <p className="text-xs text-muted-foreground">{course.location}</p>}
                                        </div>
                                    </div>

                                    <div className="space-y-3 py-5">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Kursavgift</span>
                                            <span className="font-medium text-text-primary">{course.price || 0} kr</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Servicegebyr</span>
                                            <span className="font-medium text-text-primary">0 kr</span>
                                        </div>
                                    </div>

                                    <div className="border-t border-surface-elevated pt-4 pb-6">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-text-primary">Totalt å betale</span>
                                            <span className="font-geist text-xl font-bold text-text-primary tracking-tight">{course.price || 0} kr</span>
                                        </div>
                                    </div>

                                    {/* Unified Reservation & Payment Section */}
                                    <div className="rounded-xl bg-surface border border-border p-4">
                                        {/* Reservation Note */}
                                        <div className="flex gap-3 mb-4 border-b border-border/60 pb-4">
                                            <Clock className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-medium text-text-primary">Vi reserverer plassen din</p>
                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                    Fullfør innen <span className="font-medium text-text-primary">{formatTime(timeLeft)}</span> minutter.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Secure Payment */}
                                        <div>
                                            <div className="flex gap-3 mb-2">
                                                <ShieldCheck className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                                                <div className="space-y-0.5">
                                                    <p className="text-xs font-medium text-text-primary">Sikker betaling</p>
                                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                                        Vi aksepterer Vipps, Visa og Mastercard.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 pl-7 opacity-90">
                                                <img src="/badges/vipps.svg" alt="Vipps" className="h-5 w-auto" />
                                                <img src="/badges/visa.svg" alt="Visa" className="h-3 w-auto" />
                                                <img src="/badges/mastercard.svg" alt="Mastercard" className="h-5 w-auto" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Final Action Button */}
                                    <div className="mt-6">
                                        <Button
                                            size="compact"
                                            type="submit"
                                            form="booking-form"
                                            className="w-full shadow-lg hover:shadow-xl transition-all"
                                            disabled={submitting}
                                        >
                                            {submitting ? (
                                              <span className="relative z-10 flex items-center justify-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Behandler...
                                              </span>
                                            ) : (
                                              <span className="relative z-10 flex items-center justify-center gap-2">
                                                  Fullfør påmelding
                                                  <ArrowRight className="h-4 w-4" />
                                              </span>
                                            )}
                                        </Button>
                                    </div>
                                  </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        {/* Mobile Sticky Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-white/80 backdrop-blur-xl lg:hidden">
            <div className="mx-auto flex max-w-lg items-center justify-between p-4">
                {step === 1 ? (
                  <>
                    <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Total pris</span>
                        <span className="font-geist text-xl font-semibold text-text-primary">{course.price || 0} kr</span>
                    </div>
                    <Button onClick={handleNextStep} className="shadow-lg" size="compact" disabled={isFull || isAlreadySignedUp}>
                        {isAlreadySignedUp ? (
                          <span className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            Påmeldt
                          </span>
                        ) : isFull ? 'Fullt' : 'Book nå'}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            Total
                        </span>
                        <span className="font-geist text-xl font-semibold text-text-primary">{course.price || 0} kr</span>
                    </div>
                    <Button
                        className="shadow-lg flex items-center gap-2"
                        size="compact"
                        type="submit"
                        form="booking-form"
                        disabled={submitting}
                    >
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Behandler
                          </>
                        ) : (
                          <>
                            Fullfør
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                    </Button>
                  </>
                )}
            </div>
        </div>
      </div>
    </>
  );
};

export default PublicCourseDetailPage;

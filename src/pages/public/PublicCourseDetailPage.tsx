import React, { useState, useEffect, useCallback } from 'react';
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
  BookOpen,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchPublicCourseById, type PublicCourseWithDetails } from '@/services/publicCourses';
import { fetchCourseSessions } from '@/services/courses';
import { checkCourseAvailability } from '@/services/signups';
import { checkIfAlreadySignedUp } from '@/services/studentSignups';
import { createCheckoutSession } from '@/services/checkout';
import { joinWaitlist, getWaitlistCount } from '@/services/waitlist';
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
    return { month: '—', day: '—', dayName: '', fullDate: 'Dato mangler', shortDate: '—' };
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

// Format date range from first to last session (e.g., "24. jan – 9. mai")
function getSessionDateRange(sessions: CourseSession[]): string {
  if (sessions.length === 0) return '';

  const firstDate = new Date(sessions[0].session_date);
  const lastDate = new Date(sessions[sessions.length - 1].session_date);

  const firstDay = firstDate.getDate();
  const lastDay = lastDate.getDate();

  const firstMonth = new Intl.DateTimeFormat('nb-NO', { month: 'short' })
    .format(firstDate).replace('.', '');
  const lastMonth = new Intl.DateTimeFormat('nb-NO', { month: 'short' })
    .format(lastDate).replace('.', '');

  // Same month
  if (firstDate.getMonth() === lastDate.getMonth() && firstDate.getFullYear() === lastDate.getFullYear()) {
    return `${firstDay}. – ${lastDay}. ${firstMonth}`;
  }

  return `${firstDay}. ${firstMonth} – ${lastDay}. ${lastMonth}`;
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
  const [redirectingToPayment, setRedirectingToPayment] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Waitlist state
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);
  const [currentWaitlistCount, setCurrentWaitlistCount] = useState<number | null>(null);

  // Progressive disclosure for dates
  const [showAllDates, setShowAllDates] = useState(false);

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
        setFetchError('Fant ikke kurset');
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

      // Fetch waitlist count to show position preview on join button
      const { count: waitlistCount } = await getWaitlistCount(courseId);
      setCurrentWaitlistCount(waitlistCount);

      // Check if student is already signed up (only for student accounts)
      if (user && userType === 'student' && profile?.email) {
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
  }, [courseId, user, userType, profile?.email]);

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
      setSubmitError('Kunne ikke sjekke tilgjengelighet. Prøv på nytt.');
      toast.error('Kunne ikke sjekke tilgjengelighet');
      setSubmitting(false);
      return;
    }

    if (available <= 0) {
      setSubmitError('Kurset er fullt.');
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
      successUrl: `${currentUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&org=${slug}`,
      cancelUrl: `${currentUrl}/studio/${slug}/${courseId}?cancelled=true`,
    });

    if (checkoutError || !checkoutData) {
      setSubmitError(checkoutError || 'Kunne ikke starte betaling. Prøv på nytt.');
      toast.error('Kunne ikke starte betaling');
      setSubmitting(false);
      return;
    }

    // 3. Redirect to Stripe Checkout
    if (checkoutData.url) {
      // Show "redirecting" state and navigate immediately
      // The state change renders synchronously before navigation
      setSubmitting(false);
      setRedirectingToPayment(true);

      // Navigate immediately - the UI will show briefly during page transition
      window.location.href = checkoutData.url;
    } else {
      setSubmitError('Kunne ikke gå til betaling. Prøv på nytt.');
      setSubmitting(false);
    }
  };

  const handleNextStep = useCallback(() => {
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handlePrevStep = useCallback(() => {
    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Handle joining waitlist (free, no payment)
  const handleJoinWaitlist = async () => {
    if (!course || !courseId || !slug) return;

    // For waitlist, we need basic info - use step 2 form or pre-filled data
    // If user is authenticated student, use their profile
    const isAuthStudent = user && userType === 'student';

    if (!isAuthStudent) {
      // For guests, go to step 2 to collect info, but we'll handle it differently
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // For authenticated students, join directly
    setJoiningWaitlist(true);

    const { data, error } = await joinWaitlist({
      courseId,
      organizationId: course.organization_id,
      customerEmail: profile?.email || '',
      customerName: profile?.name || '',
      customerPhone: profile?.phone || undefined
    });

    if (error) {
      toast.error(error);
      setJoiningWaitlist(false);
      return;
    }

    if (data) {
      setWaitlistSuccess(true);
      setWaitlistPosition(data.waitlist_position);
      toast.success(`Du er nummer ${data.waitlist_position} på ventelisten.`);
    }

    setJoiningWaitlist(false);
  };

  // Handle waitlist submission from form (for guests)
  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!course || !courseId) return;

    // Validate form
    setTouched({ firstName: true, lastName: true, email: true, termsAccepted: true });

    const newErrors: Record<string, boolean> = {};
    let isValid = true;

    if (!formData.firstName.trim()) {
      newErrors.firstName = true;
      isValid = false;
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = true;
      isValid = false;
    }
    if (!formData.email.trim() || !validateEmail(formData.email)) {
      newErrors.email = true;
      isValid = false;
    }
    if (!formData.termsAccepted) {
      newErrors.termsAccepted = true;
      isValid = false;
    }

    setErrors(newErrors);

    if (!isValid) return;

    setJoiningWaitlist(true);

    const { data, error } = await joinWaitlist({
      courseId,
      organizationId: course.organization_id,
      customerEmail: formData.email,
      customerName: `${formData.firstName} ${formData.lastName}`.trim(),
      customerPhone: formData.phone || undefined
    });

    if (error) {
      toast.error(error);
      setJoiningWaitlist(false);
      return;
    }

    if (data) {
      setWaitlistSuccess(true);
      setWaitlistPosition(data.waitlist_position);
      toast.success(`Du er nummer ${data.waitlist_position} på ventelisten.`);
    }

    setJoiningWaitlist(false);
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

  // Redirecting to payment state
  if (redirectingToPayment) {
    return (
      <div className="min-h-screen w-full bg-surface flex items-center justify-center font-geist">
        <div className="text-center max-w-xs px-4">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-status-info-bg">
            <ExternalLink className="h-7 w-7 text-status-info-text" />
          </div>
          <p className="text-lg font-medium text-text-primary mb-2">Sender deg til betaling</p>
          <p className="text-sm text-muted-foreground mb-4">
            Du blir nå sendt til en sikker betalingsside.
          </p>
          <div className="flex items-center justify-center gap-3 opacity-70">
            <img src="/badges/vipps.svg" alt="Vipps" className="h-5 w-auto" />
            <img src="/badges/visa.svg" alt="Visa" className="h-3 w-auto" />
            <img src="/badges/mastercard.svg" alt="Mastercard" className="h-5 w-auto" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (fetchError || !course) {
    const backUrl = slug ? `/studio/${slug}` : '/';
    return (
      <div className="min-h-screen w-full bg-surface font-geist">
        <header className="fixed top-0 left-0 right-0 z-40 border-b border-gray-200 bg-surface/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link to={backUrl} className="flex items-center gap-3 cursor-pointer">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-gray-200 text-primary">
                <Leaf className="h-5 w-5" />
              </div>
              <span className="font-geist text-lg font-medium text-text-primary tracking-tight">Ease</span>
            </Link>
          </div>
        </header>
        <main className="pt-24 px-4 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-3xl border border-destructive/30 bg-white p-12 text-center">
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
        <header className="fixed top-0 left-0 right-0 z-40 border-b border-gray-200 bg-surface/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link to={studioUrl} className="flex items-center gap-3 cursor-pointer">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-gray-200 text-primary">
                <Leaf className="h-5 w-5" />
              </div>
              <span className="font-geist text-lg font-medium text-text-primary tracking-tight">Ease</span>
            </Link>
          </div>
        </header>
        <main className="pt-24 px-4 sm:px-6 pb-24">
          <div className="mx-auto max-w-lg text-center">
            <div className="rounded-3xl bg-white p-8 md:p-12 border border-gray-200">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-status-confirmed-bg">
                <CheckCircle2 className="h-8 w-8 text-status-confirmed-text" />
              </div>
              <h1 className="font-geist text-2xl md:text-3xl font-medium text-text-primary mb-3">
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

              <div className="rounded-xl bg-surface p-4 mb-8 text-left">
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
                    <span className="font-medium text-text-primary">{course.price || 0} kr</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {user && userType === 'student' ? (
                  <>
                    <Button asChild className="w-full" size="compact">
                      <Link to="/student/dashboard">Mine påmeldinger</Link>
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

  // Waitlist success state
  if (waitlistSuccess) {
    const studioUrl = slug ? `/studio/${slug}` : '/';
    const customerEmail = (user && userType === 'student' && profile?.email) ? profile.email : formData.email;

    return (
      <div className="min-h-screen w-full bg-surface font-geist">
        <header className="fixed top-0 left-0 right-0 z-40 border-b border-gray-200 bg-surface/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link to={studioUrl} className="flex items-center gap-3 cursor-pointer">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-gray-200 text-primary">
                <Leaf className="h-5 w-5" />
              </div>
              <span className="font-geist text-lg font-medium text-text-primary tracking-tight">Ease</span>
            </Link>
          </div>
        </header>
        <main className="pt-24 px-4 sm:px-6 pb-24">
          <div className="mx-auto max-w-lg text-center">
            <div className="rounded-3xl bg-white p-8 md:p-12 border border-gray-200">
              {/* Position badge */}
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-status-waitlist-bg">
                <span className="text-3xl font-bold text-status-waitlist-text">#{waitlistPosition}</span>
              </div>

              <h1 className="font-geist text-2xl md:text-3xl font-medium text-text-primary mb-3">
                Du er på ventelisten
              </h1>
              <p className="text-muted-foreground mb-8">
                Du har plass <span className="font-medium text-status-waitlist-text">#{waitlistPosition}</span> på ventelisten for{' '}
                <span className="font-medium text-text-primary">{course.title}</span>.
              </p>

              <div className="rounded-xl bg-status-confirmed-bg border border-status-confirmed-border p-4 mb-8 text-left">
                <h3 className="text-sm font-medium text-status-confirmed-text mb-2">Hva skjer videre?</h3>
                <ul className="text-sm text-status-confirmed-text/90 space-y-2">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>Vi varsler deg på <strong>{customerEmail}</strong> når en plass blir ledig.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>Du har 24 timer på å bekrefte.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>Ingen betaling nå.</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                {user && userType === 'student' ? (
                  <>
                    <Button asChild className="w-full" size="compact">
                      <Link to="/student/dashboard">Mine påmeldinger</Link>
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

  // Price display
  const displayPrice = course.price;

  // Check if course has ended (use end_date for series, start_date for single events)
  const courseEndDate = course.end_date ? new Date(course.end_date) : (course.start_date ? new Date(course.start_date) : null);
  const isEnded = courseEndDate ? courseEndDate < new Date(new Date().setHours(0, 0, 0, 0)) : false;

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
        <header className="fixed top-0 left-0 right-0 z-40 border-b border-gray-200 bg-surface/90 backdrop-blur-xl">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
                <Link to={studioUrl} className="flex items-center gap-3 cursor-pointer">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-gray-200 text-primary">
                        <Leaf className="h-5 w-5" />
                    </div>
                    <span className="font-geist text-lg font-medium text-text-primary tracking-tight">Ease</span>
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
                  <nav aria-label="Påmeldingssteg" className="hidden md:flex items-center gap-2 text-sm font-medium">
                      <span className="text-text-tertiary" aria-hidden="true">Kurs</span>
                      <ChevronRight className="h-4 w-4 text-border" aria-hidden="true" />
                      <span className="text-text-primary" aria-current="step">Detaljer</span>
                      <ChevronRight className="h-4 w-4 text-border" aria-hidden="true" />
                      <span className="text-text-tertiary" aria-hidden="true">Betaling</span>
                      <span className="sr-only">Steg 2 av 3: Deltakerinformasjon</span>
                  </nav>
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
                                  <h1 className="font-geist text-3xl md:text-4xl font-medium tracking-tight text-text-primary">
                                      {course.title}
                                  </h1>

                                  {/* Metadata Row */}
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm text-muted-foreground border-b border-gray-100 pb-6">
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
                                <div className="relative overflow-hidden rounded-3xl bg-surface-elevated border border-gray-200">
                                    <div className="aspect-[16/7] w-full bg-gradient-to-br from-border to-surface-elevated relative">
                                        <img src={course.image_url} alt={course.title} className="absolute inset-0 h-full w-full object-cover opacity-90" />
                                    </div>
                                </div>
                              )}

                              {/* Description Block */}
                              <div className="space-y-4">
                                  <h2 className="font-geist text-lg font-medium text-text-primary">Om kurset</h2>
                                  {course.description && (
                                    <div className="prose prose-gray prose-sm max-w-none text-muted-foreground leading-relaxed">
                                        <p>{course.description}</p>
                                    </div>
                                  )}
                                  {/* Course tags */}
                                  <div className="flex flex-wrap items-center gap-2">
                                      {course.style && (
                                        <span className="inline-flex items-center rounded-full bg-surface-elevated px-2.5 py-1 text-xs font-medium text-text-secondary">
                                            {course.style.name}
                                        </span>
                                      )}
                                      {levelDisplay && (
                                        <span className="inline-flex items-center rounded-full bg-surface-elevated px-2.5 py-1 text-xs font-medium text-text-secondary">
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
                              {sessions.length > 1 && (() => {
                                const scheduleDescription = getScheduleDescription(sessions, isSeries);
                                const isRegularSchedule = scheduleDescription.startsWith('Hver ');
                                const dateRange = getSessionDateRange(sessions);

                                return (
                                  <div className="space-y-4">
                                      <h2 className="font-geist text-lg font-medium text-text-primary">
                                        Program oversikt
                                        <span className="text-muted-foreground font-normal ml-2">
                                          ({sessions.length} {isSeries ? 'uker' : 'dager'})
                                        </span>
                                      </h2>
                                      <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden p-5 space-y-4">
                                          {/* Schedule header */}
                                          <div className="flex items-center justify-between">
                                              <div>
                                                  <p className="text-xs text-muted-foreground mb-0.5">
                                                    {scheduleDescription}
                                                    {isRegularSchedule && dateRange && (
                                                      <span className="ml-1">· {dateRange}</span>
                                                    )}
                                                  </p>
                                                  <p className="text-sm font-medium text-text-primary">
                                                    Kl {formatTimeRange(sessions[0]?.start_time || '', sessions[0]?.end_time || null, course.duration)}
                                                  </p>
                                              </div>
                                              <Clock className="h-4 w-4 text-text-tertiary" />
                                          </div>

                                          {/* Progressive disclosure toggle for regular schedules */}
                                          {isRegularSchedule && (
                                            <button
                                              onClick={() => setShowAllDates(!showAllDates)}
                                              className="text-xs text-muted-foreground hover:text-text-secondary transition-colors"
                                            >
                                              {showAllDates ? 'Skjul datoer' : `Vis alle datoer (${sessions.length})`}
                                            </button>
                                          )}

                                          {/* Date chips - always shown for irregular, toggled for regular */}
                                          {(showAllDates || !isRegularSchedule) && (
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
                                          )}
                                      </div>
                                  </div>
                                );
                              })()}

                              {/* Location Block */}
                              {course.location && (
                                <div className="mb-12">
                                    <h2 className="mb-3 font-geist text-lg font-medium text-text-primary">Sted & Oppmøte</h2>
                                    <div className="overflow-hidden rounded-2xl bg-white border border-gray-200">
                                        <div className="flex flex-col md:flex-row">
                                            <div className="bg-pattern-dot flex h-32 w-full items-center justify-center bg-surface md:h-auto md:w-32 shrink-0 border-b md:border-b-0 md:border-r border-border">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-text-primary text-white">
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
                                    <h1 className="font-geist text-3xl md:text-4xl font-medium tracking-tight text-text-primary">
                                        Deltakerinformasjon
                                    </h1>
                                    <p className="mt-2 text-muted-foreground">
                                        Vennligst fyll inn dine detaljer. Felter merket med <span className="text-destructive">*</span> er påkrevde.
                                    </p>
                                </div>

                                {/* Error message */}
                                {submitError && (
                                  <div className="rounded-xl border border-destructive/30 bg-status-error-bg p-4">
                                    <p className="text-sm text-status-error-text">{submitError}</p>
                                  </div>
                                )}

                                {/* Attendee 1 (Main Contact) */}
                                <div className="rounded-2xl bg-white p-6 border border-gray-200">
                                    <div className="mb-5 flex items-center justify-between border-b border-surface-elevated pb-4">
                                        <h2 className="font-geist text-lg font-medium text-text-primary">Deltaker</h2>
                                    </div>

                                    <div className="space-y-5">
                                        {/* Name Fields */}
                                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                            <div>
                                                <label htmlFor="firstName" className="block text-xs font-medium text-muted-foreground mb-1.5">
                                                    Fornavn <span className="text-destructive">*</span>
                                                </label>
                                                <Input
                                                    id="firstName"
                                                    type="text"
                                                    name="firstName"
                                                    value={formData.firstName}
                                                    onChange={handleInputChange}
                                                    onBlur={() => handleBlur('firstName')}
                                                    placeholder="Ola"
                                                    aria-invalid={!!errors.firstName}
                                                    aria-describedby={errors.firstName && touched.firstName ? 'firstName-error' : undefined}
                                                    aria-required="true"
                                                    disabled={submitting}
                                                    className={errors.firstName ? 'border-status-error-text bg-status-error-bg focus:border-status-error-text focus:ring-status-error-text/20 animate-shake' : ''}
                                                />
                                                {errors.firstName && touched.firstName && (
                                                    <p id="firstName-error" role="alert" className="text-xs text-status-error-text font-medium mt-1.5">Fornavn er påkrevd</p>
                                                )}
                                            </div>
                                            <div>
                                                <label htmlFor="lastName" className="block text-xs font-medium text-muted-foreground mb-1.5">
                                                    Etternavn <span className="text-destructive">*</span>
                                                </label>
                                                <Input
                                                    id="lastName"
                                                    type="text"
                                                    name="lastName"
                                                    value={formData.lastName}
                                                    onChange={handleInputChange}
                                                    onBlur={() => handleBlur('lastName')}
                                                    placeholder="Nordmann"
                                                    aria-invalid={!!errors.lastName}
                                                    aria-describedby={errors.lastName && touched.lastName ? 'lastName-error' : undefined}
                                                    aria-required="true"
                                                    disabled={submitting}
                                                    className={errors.lastName ? 'border-status-error-text bg-status-error-bg focus:border-status-error-text focus:ring-status-error-text/20 animate-shake' : ''}
                                                />
                                                {errors.lastName && touched.lastName && (
                                                    <p id="lastName-error" role="alert" className="text-xs text-status-error-text font-medium mt-1.5">Etternavn er påkrevd</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Contact Fields */}
                                        <div>
                                            <label htmlFor="email" className="block text-xs font-medium text-muted-foreground mb-1.5">
                                                E-postadresse <span className="text-destructive">*</span>
                                            </label>
                                            <Input
                                                id="email"
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                onBlur={() => handleBlur('email')}
                                                placeholder="ola@eksempel.no"
                                                aria-invalid={!!errors.email}
                                                aria-describedby={errors.email && touched.email ? 'email-error' : 'email-hint'}
                                                aria-required="true"
                                                disabled={submitting}
                                                className={errors.email ? 'border-status-error-text bg-status-error-bg focus:border-status-error-text focus:ring-status-error-text/20 animate-shake' : ''}
                                            />
                                            {errors.email && touched.email ? (
                                                <p id="email-error" role="alert" className="text-xs text-status-error-text font-medium mt-1.5">Gyldig e-postadresse er påkrevd</p>
                                            ) : (
                                                <p id="email-hint" className="text-xs text-text-tertiary mt-1.5">Ordrebekreftelse sendes hit.</p>
                                            )}
                                        </div>

                                        <div>
                                            <label htmlFor="phone" className="block text-xs font-medium text-muted-foreground mb-1.5">
                                                Telefonnummer <span className="text-text-tertiary font-normal">(valgfritt)</span>
                                            </label>
                                            <Input
                                                id="phone"
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleInputChange}
                                                placeholder="+47 000 00 000"
                                                aria-describedby="phone-hint"
                                                disabled={submitting}
                                            />
                                            <p id="phone-hint" className="text-xs text-text-tertiary mt-1.5">For eventuell kontakt ved endringer.</p>
                                        </div>

                                        <div>
                                            <label htmlFor="message" className="block text-xs font-medium text-muted-foreground mb-1.5">
                                                Kommentar til instruktør <span className="text-text-tertiary font-normal">(valgfritt)</span>
                                            </label>
                                            <textarea
                                                id="message"
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
                                            id="termsAccepted"
                                            type="checkbox"
                                            name="termsAccepted"
                                            checked={formData.termsAccepted}
                                            onChange={handleInputChange}
                                            required
                                            disabled={submitting}
                                            aria-describedby={errors.termsAccepted ? 'terms-error' : undefined}
                                            aria-invalid={!!errors.termsAccepted}
                                            className="checkbox-wrapper peer sr-only"
                                        />
                                        <div className={`h-4 w-4 rounded-sm border bg-white transition-all peer-focus-visible:ring-4 peer-focus-visible:ring-ring/30 hover:border-text-tertiary ${errors.termsAccepted ? 'border-status-error-text ring-1 ring-status-error-text' : 'border-ring'}`}>
                                            <Check className="hidden h-3 w-3 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={3} />
                                        </div>
                                    </label>
                                    <div className="flex flex-col">
                                        <label htmlFor="termsAccepted" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                                            Jeg godtar <Link to="/terms" target="_blank" className="text-text-primary underline underline-offset-2 hover:text-primary">vilkår for påmelding</Link>. <span className="text-destructive">*</span>
                                        </label>
                                        {errors.termsAccepted && (
                                            <p id="terms-error" role="alert" className="text-xs text-status-error-text font-medium mt-1">Du må godta vilkårene</p>
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
                            <div className="rounded-3xl bg-white p-6 border border-gray-200">

                                {isEnded ? (
                                  /* Course has ended - show archived state */
                                  <>
                                    <div className="mb-6 flex items-start justify-between">
                                        <div>
                                            <div className="text-2xl font-medium text-text-tertiary tracking-tight">Avsluttet</div>
                                            <div className="text-xs text-text-tertiary mt-1">Dette kurset er ferdig</div>
                                        </div>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-surface-elevated px-2 py-0.5 text-xxs font-medium text-text-tertiary">
                                            Arkivert
                                        </span>
                                    </div>

                                    <div className="mb-6 space-y-3 rounded-xl bg-surface p-4">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Dato</span>
                                            <span className="font-medium text-text-secondary">{dateInfo.shortDate}</span>
                                        </div>
                                        {time && (
                                          <div className="flex items-center justify-between text-sm">
                                              <span className="text-muted-foreground">Tid</span>
                                              <span className="font-medium text-text-secondary">Kl {time}</span>
                                          </div>
                                        )}
                                        {course.location && (
                                          <div className="flex items-center justify-between text-sm">
                                              <span className="text-muted-foreground">Sted</span>
                                              <span className="font-medium text-text-secondary">{course.location}</span>
                                          </div>
                                        )}
                                    </div>

                                    <Button
                                      asChild
                                      size="compact"
                                      className="w-full"
                                      variant="outline"
                                    >
                                      <Link to={studioUrl}>
                                        <span className="relative z-10 flex items-center justify-center gap-2">
                                          Se kommende kurs
                                          <ArrowRight className="h-4 w-4" />
                                        </span>
                                      </Link>
                                    </Button>
                                  </>
                                ) : step === 1 ? (
                                  <>
                                    <div className="mb-6 flex items-start justify-between">
                                        <div>
                                            <div className="text-3xl font-medium text-text-primary tracking-tight">{displayPrice || 0} kr</div>
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

                                    <div className="mb-6 space-y-3 rounded-xl bg-surface p-4">
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

                                    {isFull && !isAlreadySignedUp ? (
                                      <Button
                                        onClick={handleJoinWaitlist}
                                        size="compact"
                                        className="w-full"
                                        variant="outline"
                                        disabled={joiningWaitlist}
                                      >
                                        <span className="relative z-10 flex items-center justify-center gap-2">
                                          {joiningWaitlist ? (
                                            <>
                                              <Loader2 className="h-4 w-4 animate-spin" />
                                              Melder på...
                                            </>
                                          ) : (
                                            <>
                                              Venteliste
                                              {currentWaitlistCount !== null && (
                                                <span className="text-xs opacity-70">
                                                  (plass #{currentWaitlistCount + 1})
                                                </span>
                                              )}
                                              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                            </>
                                          )}
                                        </span>
                                      </Button>
                                    ) : (
                                      <Button
                                        onClick={handleNextStep}
                                        size="compact"
                                        className="w-full"
                                        disabled={isAlreadySignedUp}
                                      >
                                        <span className="relative z-10 flex items-center justify-center gap-2">
                                          {isAlreadySignedUp ? 'Allerede påmeldt' : 'Påmelding'}
                                          {!isAlreadySignedUp && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
                                        </span>
                                      </Button>
                                    )}

                                    {!(user && userType === 'student') && (
                                      <p className="mt-4 text-center text-xs text-text-tertiary">
                                          <Link to="/student/login" className="underline underline-offset-2 hover:text-text-primary transition-colors">Logg inn</Link> eller <Link to="/student/register" className="underline underline-offset-2 hover:text-text-primary transition-colors">registrer deg</Link> for å lagre denne bestillingen i din kursoversikt
                                      </p>
                                    )}
                                  </>
                                ) : isFull ? (
                                  /* Step 2 for Waitlist */
                                  <>
                                    <h3 className="mb-4 font-geist text-lg font-medium text-text-primary">Venteliste</h3>

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

                                    <div className="rounded-xl bg-status-waitlist-bg border border-status-waitlist-border p-4 my-5">
                                        <p className="text-sm font-medium text-status-waitlist-text mb-2">Kurset er fullt</p>
                                        <p className="text-xs text-status-waitlist-text/80 leading-relaxed">
                                          Meld deg på ventelisten, så får du beskjed når det blir ledig. Du har da 24 timer på å bekrefte.
                                        </p>
                                    </div>

                                    <div className="rounded-xl bg-surface p-4">
                                        <div className="flex gap-3">
                                            <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-medium text-text-primary">Ingen betaling nå</p>
                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                    Du betaler kun {displayPrice || 0} kr når en plass blir tilgjengelig og du bekrefter den.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Waitlist Action Button */}
                                    <div className="mt-6">
                                        <Button
                                            size="compact"
                                            onClick={handleWaitlistSubmit}
                                            className="w-full transition-all"
                                            disabled={joiningWaitlist}
                                        >
                                            {joiningWaitlist ? (
                                              <span className="relative z-10 flex items-center justify-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Melder på
                                              </span>
                                            ) : (
                                              <span className="relative z-10 flex items-center justify-center gap-2">
                                                  Meld meg på ventelisten
                                                  {currentWaitlistCount !== null && (
                                                    <span className="text-xs opacity-70">
                                                      (plass {currentWaitlistCount + 1})
                                                    </span>
                                                  )}
                                                  <ArrowRight className="h-4 w-4" />
                                              </span>
                                            )}
                                        </Button>
                                    </div>
                                  </>
                                ) : (
                                  /* Step 2 Summary - Normal Booking */
                                  <>
                                    {/* Content without nested card wrapper */}
                                    <h3 className="mb-4 font-geist text-lg font-medium text-text-primary">Sammendrag</h3>

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
                                            <span className="font-medium text-text-primary">{displayPrice || 0} kr</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Servicegebyr</span>
                                            <span className="font-medium text-text-primary">0 kr</span>
                                        </div>
                                    </div>

                                    <div className="border-t border-surface-elevated pt-4 pb-6">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-text-primary">Totalt å betale</span>
                                            <span className="font-geist text-xl font-bold text-text-primary tracking-tight">{displayPrice || 0} kr</span>
                                        </div>
                                    </div>

                                    {/* Secure Payment Section */}
                                    <div className="rounded-xl bg-surface p-4">
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

                                    {/* Final Action Button */}
                                    <div className="mt-6">
                                        <Button
                                            size="compact"
                                            type="submit"
                                            form="booking-form"
                                            className="w-full transition-all"
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
                {isEnded ? (
                  /* Course ended - mobile */
                  <>
                    <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Status</span>
                        <span className="font-geist text-base font-medium text-text-tertiary">Avsluttet</span>
                    </div>
                    <Button
                      asChild
                      size="compact"
                      variant="outline"
                    >
                      <Link to={studioUrl}>Se kommende kurs</Link>
                    </Button>
                  </>
                ) : step === 1 ? (
                  <>
                    <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Total pris</span>
                        <span className="font-geist text-xl font-medium text-text-primary">{displayPrice || 0} kr</span>
                    </div>
                    {isFull && !isAlreadySignedUp ? (
                      <Button
                        onClick={handleJoinWaitlist}
                        variant="outline"
                        size="compact"
                        disabled={joiningWaitlist}
                      >
                        {joiningWaitlist ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Melder på...
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            Venteliste
                            {currentWaitlistCount !== null && (
                              <span className="text-xs opacity-70">(#{currentWaitlistCount + 1})</span>
                            )}
                          </span>
                        )}
                      </Button>
                    ) : (
                      <Button
                        onClick={handleNextStep}
                        size="compact"
                        disabled={isAlreadySignedUp}
                      >
                        {isAlreadySignedUp ? (
                          <span className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            Påmeldt
                          </span>
                        ) : (
                          'Book nå'
                        )}
                      </Button>
                    )}
                  </>
                ) : isFull ? (
                  /* Step 2 Mobile - Waitlist */
                  <>
                    <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Venteliste</span>
                        <span className="font-geist text-sm font-medium text-status-waitlist-text">Ingen betaling nå</span>
                    </div>
                    <Button
                        className="flex items-center gap-2"
                        size="compact"
                        onClick={handleWaitlistSubmit}
                        disabled={joiningWaitlist}
                    >
                        {joiningWaitlist ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Melder på...
                          </>
                        ) : (
                          <>
                            Meld på
                            {currentWaitlistCount !== null && (
                              <span className="text-xs opacity-70">(#{currentWaitlistCount + 1})</span>
                            )}
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                    </Button>
                  </>
                ) : (
                  /* Step 2 Mobile - Normal Booking */
                  <>
                    <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            Total
                        </span>
                        <span className="font-geist text-xl font-medium text-text-primary">{displayPrice || 0} kr</span>
                    </div>
                    <Button
                        className="flex items-center gap-2"
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

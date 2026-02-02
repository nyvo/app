import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Leaf,
  Loader2,
  CheckCircle2,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchPublicCourseById, type PublicCourseWithDetails } from '@/services/publicCourses';
import { fetchCourseSessions } from '@/services/courses';
import { checkCourseAvailability } from '@/services/signups';
import { checkIfAlreadySignedUp } from '@/services/studentSignups';
import { createCheckoutSession } from '@/services/checkout';
import { joinWaitlist, getWaitlistCount } from '@/services/waitlist';
import { toast } from 'sonner';
import type { CourseSession } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';

// Import new components
import { PublicCourseHeader } from '@/components/public/course-details/PublicCourseHeader';
import { CourseHero } from '@/components/public/course-details/CourseHero';
import { InstructorCard } from '@/components/public/course-details/InstructorCard';
import { CourseMetaGrid } from '@/components/public/course-details/CourseMetaGrid';
import { CourseDescription } from '@/components/public/course-details/CourseDescription';
import { SessionList } from '@/components/public/course-details/SessionList';
import { BookingSidebar } from '@/components/public/course-details/BookingSidebar';
import { MobileStickyBar } from '@/components/public/course-details/MobileStickyBar';

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

// Extract time from time_schedule and convert to 24-hour format
function extractTime(timeSchedule: string | null): string {
  if (!timeSchedule) return '';

  // Match time with optional AM/PM
  const match = timeSchedule.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return '';

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const meridiem = match[3]?.toUpperCase();

  // Convert to 24-hour format if AM/PM is present
  if (meridiem === 'PM' && hours !== 12) {
    hours += 12;
  } else if (meridiem === 'AM' && hours === 12) {
    hours = 0;
  }

  return `${hours.toString().padStart(2, '0')}:${minutes}`;
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

  // Booking flow state
  const [bookingSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [redirectingToPayment, setRedirectingToPayment] = useState(false);

  // Waitlist state
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);
  const [currentWaitlistCount, setCurrentWaitlistCount] = useState<number | null>(null);

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

      // Fetch waitlist count
      const { count: waitlistCount } = await getWaitlistCount(courseId);
      setCurrentWaitlistCount(waitlistCount);

      // Check if student is already signed up
      if (user && userType === 'student' && profile?.email) {
        const { isSignedUp } = await checkIfAlreadySignedUp(
          courseId,
          user.id,
          profile.email
        );
        setIsAlreadySignedUp(isSignedUp);
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

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: false
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setTouched({ firstName: true, lastName: true, email: true, termsAccepted: true });

    if (!validateForm()) {
      const firstErrorField = document.querySelector('[aria-invalid="true"]') as HTMLElement;
      if (firstErrorField) {
        firstErrorField.focus();
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (!course || !courseId || !slug) return;

    setSubmitting(true);

    // Check availability
    const { available, error: availError } = await checkCourseAvailability(courseId);

    if (availError) {
      toast.error('Kunne ikke sjekke tilgjengelighet. Prøv på nytt.');
      toast.error('Kunne ikke sjekke tilgjengelighet');
      setSubmitting(false);
      return;
    }

    if (available <= 0) {
      toast.error('Kurset er fullt.');
      toast.error('Kurset er fullt');
      setSubmitting(false);
      return;
    }

    // Create Stripe checkout session
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
      toast.error(checkoutError || 'Kunne ikke starte betaling. Prøv på nytt.');
      setSubmitting(false);
      return;
    }

    // Redirect to Stripe Checkout
    if (checkoutData.url) {
      setSubmitting(false);
      setRedirectingToPayment(true);
      window.location.href = checkoutData.url;
    } else {
      toast.error('Kunne ikke gå til betaling. Prøv på nytt.');
      setSubmitting(false);
    }
  };

  const handleJoinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form first (same as regular booking)
    setTouched({ firstName: true, lastName: true, email: true, termsAccepted: true });

    if (!validateForm()) {
      const firstErrorField = document.querySelector('[aria-invalid="true"]') as HTMLElement;
      if (firstErrorField) {
        firstErrorField.focus();
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (!course || !courseId) return;

    setJoiningWaitlist(true);

    const isAuthStudent = user && userType === 'student';
    const { data, error } = await joinWaitlist({
      courseId,
      organizationId: course.organization_id,
      customerEmail: isAuthStudent ? (profile?.email || '') : formData.email,
      customerName: isAuthStudent ? (profile?.name || '') : `${formData.firstName} ${formData.lastName}`.trim(),
      customerPhone: isAuthStudent ? (profile?.phone || undefined) : (formData.phone || undefined)
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
      <div className="min-h-screen w-full bg-surface flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-text-primary" />
      </div>
    );
  }

  // Error state
  if (fetchError || !course) {
    const backUrl = slug ? `/studio/${slug}` : '/';
    return (
      <div className="min-h-screen w-full bg-surface">
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link to={backUrl} className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-gray-200">
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
        <header className="border-b border-gray-200 bg-white sticky top-0 z-40">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link to={studioUrl} className="flex items-center gap-3 cursor-pointer">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-gray-200">
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
        <header className="border-b border-gray-200 bg-white sticky top-0 z-40">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link to={studioUrl} className="flex items-center gap-3 cursor-pointer">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-gray-200">
                <Leaf className="h-5 w-5" />
              </div>
              <span className="font-geist text-lg font-medium text-text-primary tracking-tight">Ease</span>
            </Link>
          </div>
        </header>
        <main className="pt-24 px-4 sm:px-6 pb-24">
          <div className="mx-auto max-w-lg text-center">
            <div className="rounded-3xl bg-white p-8 md:p-12 border border-gray-200">
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
  const isFull = course.spots_available === 0;
  const studioUrl = slug ? `/studio/${slug}` : '/';
  const courseEndDate = course.end_date ? new Date(course.end_date) : (course.start_date ? new Date(course.start_date) : null);
  const isEnded = courseEndDate ? courseEndDate < new Date(new Date().setHours(0, 0, 0, 0)) : false;
  const isAuthStudent = Boolean(user && userType === 'student');

  return (
    <div className="min-h-screen w-full bg-surface overflow-x-hidden pb-32 lg:pb-0">
      {/* Header */}
      <PublicCourseHeader
        organizationSlug={slug || ''}
        organizationName={course.organization?.name || 'Ease'}
        user={user}
        userType={userType}
        onSignOut={signOut}
      />

      {/* Main Content */}
      <main className="pt-24 px-4 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            {/* Left Column */}
            <div className="lg:col-span-8 space-y-8">
              {/* Hero */}
              <CourseHero
                title={course.title}
                description={course.description}
              />

              {/* Instructor */}
              {course.instructor && (
                <InstructorCard
                  instructor={{
                    name: course.instructor.name || 'Instructor',
                    role: 'Instructor',
                    avatar_url: course.instructor.avatar_url,
                    profileUrl: undefined, // TODO: Add profile URL when available
                  }}
                />
              )}

              {/* Meta Grid */}
              <CourseMetaGrid
                time={time}
                location={course.location}
                duration={course.duration}
                dateInfo={dateInfo}
              />

              {/* Description */}
              <CourseDescription
                description={course.description}
                highlights={[
                  'Egnet for alle nivåer med litt erfaring',
                  'Matter og utstyr inkludert',
                  'Møt opp 10 minutter før start'
                ]}
              />

              {/* Sessions (if course series) */}
              {course.course_type === 'course-series' && sessions.length > 0 && (
                <SessionList
                  sessions={sessions}
                  highlightNextSession={true}
                />
              )}
            </div>

            {/* Right Column (Sidebar) */}
            <div className="lg:col-span-4">
              <BookingSidebar
                course={course}
                isFull={isFull}
                isAlreadySignedUp={isAlreadySignedUp}
                formData={formData}
                errors={errors}
                touched={touched}
                submitting={submitting}
                joiningWaitlist={joiningWaitlist}
                redirectingToPayment={redirectingToPayment}
                currentWaitlistCount={currentWaitlistCount}
                isAuthStudent={isAuthStudent}
                onSubmit={handleSubmit}
                onJoinWaitlist={handleJoinWaitlist}
                onInputChange={handleInputChange}
                onBlur={handleBlur}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Sticky Bar */}
      <MobileStickyBar
        price={course.price}
        isFull={isFull}
        isAlreadySignedUp={isAlreadySignedUp}
        submitting={submitting}
        joiningWaitlist={joiningWaitlist}
        currentWaitlistCount={currentWaitlistCount}
        isEnded={isEnded}
        studioUrl={studioUrl}
      />
    </div>
  );
};

export default PublicCourseDetailPage;

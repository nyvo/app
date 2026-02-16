import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Leaf,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { fetchPublicCourseById, type PublicCourseWithDetails } from '@/services/publicCourses';
import { fetchCourseSessions } from '@/services/courses';
import { checkCourseAvailability } from '@/services/signups';
import { checkIfAlreadySignedUp } from '@/services/studentSignups';
import { createCheckoutSession } from '@/services/checkout';
import { toast } from 'sonner';
import type { CourseSession } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { practicalInfoToHighlights } from '@/utils/practicalInfoUtils';

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
  const [submitting, setSubmitting] = useState(false);
  const [redirectingToPayment, setRedirectingToPayment] = useState(false);


  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
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
        setFetchError('Kunne ikke hente kurs');
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
        description: 'Du kan prøve igjen når du er klar.',
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
      toast.error('Kunne ikke sjekke tilgjengelighet. Prøv igjen.');
      setSubmitting(false);
      return;
    }

    if (available <= 0) {
      toast.error('Kurset er fullt.');
      setSubmitting(false);
      return;
    }

    // Create Stripe checkout session (URLs are constructed server-side)
    const { data: checkoutData, error: checkoutError } = await createCheckoutSession({
      courseId,
      organizationSlug: slug,
      customerEmail: formData.email,
      customerName: `${formData.firstName} ${formData.lastName}`.trim(),
    });

    if (checkoutError || !checkoutData) {
      toast.error(checkoutError?.message || 'Kunne ikke starte betaling. Prøv igjen.');
      setSubmitting(false);
      return;
    }

    // Redirect to Stripe Checkout
    if (checkoutData.url) {
      setSubmitting(false);
      setRedirectingToPayment(true);
      window.location.href = checkoutData.url;
    } else {
      toast.error('Kunne ikke gå til betaling. Prøv igjen.');
      setSubmitting(false);
    }
  };


  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-surface flex items-center justify-center">
        <Spinner size="xl" />
      </div>
    );
  }

  // Error state
  if (fetchError || !course) {
    const backUrl = slug ? `/studio/${slug}` : '/';
    return (
      <div className="min-h-screen w-full bg-surface">
        <header className="border-b border-zinc-200 bg-surface">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link to={backUrl} className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-zinc-100">
                <Leaf className="h-5 w-5" />
              </div>
              <span className="font-geist text-lg font-medium text-text-primary tracking-tight">Ease</span>
            </Link>
          </div>
        </header>
        <main className="pt-24 px-4 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-2xl border border-destructive/30 bg-white p-12 text-center">
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
                highlights={practicalInfoToHighlights(course.practical_info)}
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
                redirectingToPayment={redirectingToPayment}
                isAuthStudent={isAuthStudent}
                onSubmit={handleSubmit}
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
        isEnded={isEnded}
        studioUrl={studioUrl}
      />
    </div>
  );
};

export default PublicCourseDetailPage;

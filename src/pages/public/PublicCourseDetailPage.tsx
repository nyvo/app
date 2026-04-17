import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ChevronLeft,
} from '@/lib/icons';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { fetchPublicCourseById, type PublicCourseWithDetails } from '@/services/publicCourses';
import { checkCourseAvailability, createSignup, sendSignupConfirmationEmail } from '@/services/signups';
import { createPaymentIntent } from '@/services/checkout';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { friendlyError } from '@/lib/error-messages';
import { practicalInfoToHighlights } from '@/utils/practicalInfoUtils';
import { isValidEmail } from '@/lib/utils';

// Import new components
import { PublicCourseHeader } from '@/components/public/course-details/PublicCourseHeader';
import { CourseHero } from '@/components/public/course-details/CourseHero';
import { InstructorCard } from '@/components/public/course-details/InstructorCard';
import { CourseMetaGrid } from '@/components/public/course-details/CourseMetaGrid';
import { CourseDescription } from '@/components/public/course-details/CourseDescription';
import { BookingSidebar } from '@/components/public/course-details/BookingSidebar';

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
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Booking flow state
  const [submitting, setSubmitting] = useState(false);

  // Embedded payment state
  const [clientSecret, setClientSecret] = useState<string | null>(null);

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
      setLoading(false);
    }

    loadCourseAndSessions();
  }, [courseId, user, userType, profile?.email]);


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
      } else if (!isValidEmail(formData.email)) {
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
      } else if (!isValidEmail(formData.email)) {
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

    const isFree = !course.price || course.price <= 0;

    if (isFree) {
      // Free course: create signup directly without payment
      const { data: signupData, error: signupError } = await createSignup({
        course_id: courseId,
        organization_id: course.organization_id,
        participant_name: `${formData.firstName} ${formData.lastName}`.trim(),
        participant_email: formData.email,
        status: 'confirmed',
        payment_status: 'paid',
        user_id: user?.id || null,
        note: formData.message || null,
      });

      if (signupError) {
        toast.error(friendlyError(signupError, 'Kunne ikke fullføre påmelding. Prøv igjen.'));
        setSubmitting(false);
        return;
      }

      // Send confirmation email (non-blocking) — server looks up data by IDs
      if (signupData?.id) {
        sendSignupConfirmationEmail(courseId, signupData.id);
      }

      toast.success('Påmelding fullført');
      setSubmitting(false);
      window.location.href = `/checkout/success?free=true&org=${slug}`;
      return;
    }

    // Paid course: create PaymentIntent for embedded payment
    const { data: paymentData, error: paymentError } = await createPaymentIntent({
      courseId,
      organizationSlug: slug,
      customerEmail: formData.email,
      customerName: `${formData.firstName} ${formData.lastName}`.trim(),
    });

    if (paymentError || !paymentData) {
      toast.error(friendlyError(paymentError, 'Kunne ikke starte betaling. Prøv igjen.'));
      setSubmitting(false);
      return;
    }

    // Show inline payment form
    setClientSecret(paymentData.clientSecret);
    setSubmitting(false);
  };

  const handlePaymentSuccess = (paymentIntentId: string) => {
    setClientSecret(null);
    // Navigate to success page with payment_intent_id
    window.location.href = `/checkout/success?payment_intent_id=${paymentIntentId}&org=${slug}`;
  };

  const handlePaymentBack = () => {
    setClientSecret(null);
  };

  const handlePaymentError = (error: string) => {
    // Error is shown inside the dialog, only toast if dialog closes
    console.error('Payment error:', error);
  };


  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background" role="status" aria-live="polite">
        <Card className="w-full max-w-lg border-border bg-card">
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 text-center">
            <Spinner size="xl" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Laster kurs</p>
          </div>
        </Card>
        <span className="sr-only">Laster kurs</span>
      </div>
    );
  }

  const backUrl = slug ? `/studio/${slug}` : '/';

  if (fetchError || !course) {
    return (
      <div className="min-h-screen w-full bg-background">
        <header className="border-b border-border bg-background">
          <div className="mx-auto flex h-16 max-w-6xl items-center px-6">
            <Link to={backUrl} className="text-base font-medium text-foreground">
              Ease
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-6 py-16 md:py-24">
          <Card className="border-border bg-card">
            <EmptyState
              title={fetchError || 'Kurset ble ikke funnet'}
              description="Siden kan være flyttet, utilgjengelig eller ikke lenger aktiv."
              variant="public"
              action={
                <Button asChild variant="outline" size="compact">
                  <Link to={backUrl}>
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Tilbake til kurs
                  </Link>
                </Button>
              }
            />
          </Card>
        </main>
      </div>
    );
  }

  // Main course detail / booking flow
  const dateInfo = formatCourseDate(course.start_date);
  const time = extractTime(course.time_schedule);
  const isFull = course.spots_available === 0;
  const isAuthStudent = Boolean(user && userType === 'student');

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Header */}
      <PublicCourseHeader
        organizationSlug={slug || ''}
        organizationName={course.organization?.name || 'Ease'}
        user={user}
        userType={userType}
        onSignOut={signOut}
      />

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-6 py-8 md:py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-14">
          {/* Left Column — Course Info (5/12), hidden on mobile during payment */}
          <div className={`md:col-span-5 space-y-10 ${clientSecret ? 'hidden md:block' : ''}`}>
            {/* Hero + Description grouped tightly */}
            <div className="space-y-4">
              <CourseHero
                title={course.title}
                description={course.description}
                spotsAvailable={course.spots_available}
              />

              <CourseDescription
                description={course.description}
                highlights={practicalInfoToHighlights(course.practical_info)}
              />
            </div>

            {/* Meta: Date/Time + Location */}
            <CourseMetaGrid
              time={time}
              location={course.location}
              duration={course.duration}
              dateInfo={dateInfo}
            />

            {/* Instructor */}
            {course.instructor && (
              <InstructorCard
                instructor={{
                  name: course.instructor.name || 'Instruktør',
                  role: 'Instruktør',
                  avatar_url: course.instructor.avatar_url,
                  profileUrl: undefined,
                }}
              />
            )}
          </div>

          {/* Right Column — Booking Form (7/12) */}
          <div className="md:col-span-7">
            <BookingSidebar
              course={course}
              isFull={isFull}
              isAlreadySignedUp={false}
              formData={formData}
              errors={errors}
              touched={touched}
              submitting={submitting}
              isAuthStudent={isAuthStudent}
              onSubmit={handleSubmit}
              onInputChange={handleInputChange}
              onBlur={handleBlur}
              clientSecret={clientSecret}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
              onPaymentBack={handlePaymentBack}
            />
          </div>
        </div>
      </main>

    </div>
  );
};

export default PublicCourseDetailPage;

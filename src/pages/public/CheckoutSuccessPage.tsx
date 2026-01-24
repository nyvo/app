import { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, Leaf, AlertCircle, Home, BookOpen, Calendar, Clock, MapPin, CreditCard, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface SignupDetails {
  id: string;
  participant_name: string;
  participant_email: string;
  amount_paid: number;
  course: {
    id: string;
    title: string;
    start_date: string | null;
    time_schedule: string | null;
    location: string | null;
    organization: {
      slug: string;
      name: string;
    };
  };
}

const CheckoutSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const orgSlugFromUrl = searchParams.get('org');
  const { user, userType } = useAuth();

  const [loading, setLoading] = useState(true);
  const [signup, setSignup] = useState<SignupDetails | null>(null);
  const [error, _setError] = useState<string | null>(null);
  const [bookingFailed, setBookingFailed] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const toastShownRef = useRef(false);

  useEffect(() => {
    async function fetchSignupDetails() {
      if (!sessionId) {
        // No session ID, just show generic success
        if (!toastShownRef.current) {
          toast.success('Betaling fullført');
          toastShownRef.current = true;
        }
        setLoading(false);
        return;
      }

      // Retry fetching signup details (webhook may take a moment to process)
      const maxRetries = 15;
      const retryDelay = 2000; // 2 seconds between retries

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        // Update attempt counter for UI feedback
        setAttemptCount(attempt);

        // Wait before each attempt (including first, to give webhook time)
        await new Promise(resolve => setTimeout(resolve, retryDelay));

        // Query by stripe_checkout_session_id
        const { data, error: fetchError } = await supabase
          .from('signups')
          .select(`
            id,
            participant_name,
            participant_email,
            amount_paid,
            course:courses(
              id,
              title,
              start_date,
              time_schedule,
              location,
              organization:organizations(slug, name)
            )
          `)
          .eq('stripe_checkout_session_id', sessionId)
          .single();

        if (data && !fetchError) {
          setSignup(data as unknown as SignupDetails);
          if (!toastShownRef.current) {
            toast.success('Betaling fullført');
            toastShownRef.current = true;
          }
          setLoading(false);
          return;
        }

        // If last attempt failed, show appropriate message
        // With manual capture, if no signup exists it means the booking failed
        // (course was full, payment was cancelled - user was NOT charged)
        if (attempt === maxRetries) {
          console.warn('Signup not found after max retries:', {
            sessionId,
            attempts: maxRetries,
            totalWaitTime: `${maxRetries * retryDelay / 1000}s`,
            lastError: fetchError?.message || 'No data returned',
          });

          // Mark as booking failed - user will see appropriate message
          // The org slug is available from the URL parameter for redirect
          setBookingFailed(true);
          if (!toastShownRef.current) {
            toast.info('Påmeldingen kunne ikke fullføres');
            toastShownRef.current = true;
          }
          setLoading(false);
          return;
        }
      }
    }

    fetchSignupDetails();
  }, [sessionId]);

  // Format date for display
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Ikke satt';
    const date = new Date(dateString);
    const days = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
    const months = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
    return `${days[date.getDay()]}, ${date.getDate()}. ${months[date.getMonth()]}`;
  };

  // Extract time from time_schedule
  const extractTime = (timeSchedule: string | null): string => {
    if (!timeSchedule) return '';
    const match = timeSchedule.match(/(\d{1,2}:\d{2})/);
    return match ? match[1] : '';
  };

  if (loading) {
    // Show progressive feedback based on how long we've been waiting
    const getLoadingMessage = () => {
      if (attemptCount <= 3) {
        return 'Bekrefter betaling';
      } else if (attemptCount <= 6) {
        return 'Behandler betaling';
      } else if (attemptCount <= 10) {
        return 'Nesten klar';
      } else {
        return 'Dette tar litt tid';
      }
    };

    return (
      <div className="min-h-screen w-full bg-surface flex items-center justify-center font-geist">
        <div className="text-center max-w-xs px-4" role="status" aria-live="polite" aria-atomic="true">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-status-info-bg">
            <Loader2 className="h-8 w-8 animate-spin text-status-info-text" aria-hidden="true" />
          </div>
          <p className="text-base font-medium text-text-primary mb-2">{getLoadingMessage()}</p>
          <p className="text-sm text-muted-foreground">
            Bekrefter med banken. Ikke lukk vinduet.
          </p>
          {attemptCount > 8 && (
            <p className="text-xs text-text-tertiary mt-4">
              Du får beskjed når betalingen er klar.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-surface font-geist">
        <header className="fixed top-0 left-0 right-0 z-40 border-b border-gray-200 bg-surface/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-gray-200 text-primary">
                <Leaf className="h-5 w-5" />
              </div>
              <span className="text-lg font-medium text-text-primary tracking-tight">Ease</span>
            </Link>
          </div>
        </header>
        <main className="pt-24 px-4 sm:px-6 pb-24">
          <div className="mx-auto max-w-lg text-center">
            <div className="rounded-3xl border border-destructive/30 bg-white p-8 md:p-12">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-status-error-bg">
                <AlertCircle className="h-8 w-8 text-status-error-text" />
              </div>
              <h1 className="font-geist text-2xl md:text-3xl font-medium text-text-primary mb-3">
                Noe gikk galt
              </h1>
              <p className="text-muted-foreground mb-8">{error}</p>
              <Button asChild>
                <Link to="/">
                  <Home className="h-4 w-4 mr-2" />
                  Til forsiden
                </Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Determine studio URL from signup data or URL parameter
  const studioUrl = signup?.course?.organization?.slug
    ? `/studio/${signup.course.organization.slug}`
    : orgSlugFromUrl
      ? `/studio/${orgSlugFromUrl}`
      : '/';

  // Show booking failed state
  if (bookingFailed) {
    const failedStudioUrl = orgSlugFromUrl ? `/studio/${orgSlugFromUrl}` : '/';

    return (
      <div className="min-h-screen w-full bg-surface font-geist">
        <header className="fixed top-0 left-0 right-0 z-40 border-b border-gray-200 bg-surface/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link to={failedStudioUrl} className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-gray-200 text-primary">
                <Leaf className="h-5 w-5" />
              </div>
              <span className="text-lg font-medium text-text-primary tracking-tight">Ease</span>
            </Link>
          </div>
        </header>
        <main className="pt-24 px-4 sm:px-6 pb-24">
          <div className="mx-auto max-w-lg text-center">
            <div className="rounded-3xl bg-white p-8 md:p-12 border border-gray-200">
              {/* Most important message first - no charge */}
              <div className="bg-status-confirmed-bg border-2 border-status-confirmed-border rounded-2xl p-5 mb-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-status-confirmed-text" />
                  <p className="text-base text-status-confirmed-text font-medium">
                    Ingenting er trukket
                  </p>
                </div>
                <p className="text-sm text-status-confirmed-text/80">
                  Ingen penger er trukket.
                </p>
              </div>

              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-status-waitlist-bg">
                <AlertCircle className="h-6 w-6 text-status-waitlist-text" />
              </div>
              <h1 className="font-geist text-xl md:text-2xl font-medium text-text-primary mb-2">
                Kurset ble fullt
              </h1>
              <p className="text-sm text-muted-foreground mb-6">
                Kurset ble fullt før påmeldingen ble bekreftet.
              </p>
              <Button asChild>
                <Link to={failedStudioUrl}>
                  Se andre kurs
                </Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-surface font-geist">
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-gray-200 bg-surface/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to={studioUrl} className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-gray-200 text-primary">
              <Leaf className="h-5 w-5" />
            </div>
            <span className="text-lg font-medium text-text-primary tracking-tight">Ease</span>
          </Link>
        </div>
      </header>

      <main className="pt-24 px-4 sm:px-6 pb-24">
        <div className="mx-auto max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">

            {/* Left Column: Success Message */}
            <div className="flex flex-col justify-center text-center md:text-left pt-4 md:pt-8">
              <div className="mx-auto md:mx-0 mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-status-confirmed-bg">
                <CheckCircle2 className="h-8 w-8 text-status-confirmed-text" />
              </div>

              <h1 className="font-geist text-3xl md:text-4xl font-medium text-text-primary mb-4">
                Betaling fullført
              </h1>

              <div className="text-muted-foreground mb-6 text-base leading-relaxed">
                {signup ? (
                  <p>Du er påmeldt <span className="font-medium text-text-primary">{signup.course.title}</span>.</p>
                ) : (
                  <p>Betalingen er bekreftet.</p>
                )}
              </div>

              {/* Email confirmation notice */}
              <div className="rounded-xl bg-status-info-bg border border-status-info-border p-4 mb-8 text-left">
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-status-info-text mt-0.5 flex-shrink-0" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium text-status-info-text">Bekreftelse sendt</p>
                    <p className="text-xs text-status-info-text/80 mt-0.5">
                      {signup ? (
                        <>Vi sender kvittering til <span className="font-medium">{signup.participant_email}</span>.</>
                      ) : (
                        <>Vi sender kvittering til e-postadressen du oppga.</>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                {user && userType === 'student' ? (
                  <>
                    <Button asChild size="default" className="w-full sm:w-auto">
                      <Link to="/student/dashboard">
                        <BookOpen className="h-4 w-4 mr-2" />
                        Mine kurs
                      </Link>
                    </Button>
                    <Button asChild variant="outline-soft" size="default" className="w-full sm:w-auto">
                      <Link to={studioUrl}>Se flere kurs</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button asChild size="default" className="w-full sm:w-auto">
                      <Link to={studioUrl}>Se flere kurs</Link>
                    </Button>
                    <div className="flex items-center justify-center sm:justify-start pt-2 sm:pt-0 sm:pl-4 text-xs text-text-tertiary">
                      <span>
                        <Link to="/student/login" className="underline underline-offset-2 hover:text-text-primary">Logg inn</Link>
                        {' '}eller{' '}
                        <Link to="/student/register" className="underline underline-offset-2 hover:text-text-primary">registrer deg</Link>
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right Column: Order Details */}
            {signup && (
              <div className="rounded-3xl bg-white p-6 md:p-8 border border-gray-200 relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 -mt-16 -mr-16 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />

                <h3 className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-6 relative z-10">
                  Kvittering
                </h3>

                <div className="space-y-5 relative z-10">
                  <div className="pb-5 border-b border-gray-100">
                    <span className="block text-xs text-muted-foreground mb-1">Kurs</span>
                    <span className="block font-medium text-lg text-text-primary">{signup.course.title}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {signup.course.start_date && (
                      <div>
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <Calendar className="h-3.5 w-3.5" /> Dato
                        </span>
                        <span className="font-medium text-text-primary text-sm">
                          {formatDate(signup.course.start_date)}
                        </span>
                      </div>
                    )}
                    
                    {signup.course.time_schedule && (
                      <div>
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                          <Clock className="h-3.5 w-3.5" /> Tid
                        </span>
                        <span className="font-medium text-text-primary text-sm">
                          Kl {extractTime(signup.course.time_schedule)}
                        </span>
                      </div>
                    )}
                  </div>

                  {signup.course.location && (
                    <div>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <MapPin className="h-3.5 w-3.5" /> Sted
                      </span>
                      <span className="font-medium text-text-primary text-sm">{signup.course.location}</span>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CreditCard className="h-3.5 w-3.5" /> Betalt
                    </span>
                    <span className="font-bold text-xl text-text-primary">{signup.amount_paid} kr</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CheckoutSuccessPage;

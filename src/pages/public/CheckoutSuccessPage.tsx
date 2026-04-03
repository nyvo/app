import { useEffect, useState, useRef } from 'react';
import { logger } from '@/lib/logger';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCircle2, Leaf, AlertCircle, Home, BookOpen, Calendar, Clock, MapPin, CreditCard, Mail } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { formatKroner } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { extractTimeFromSchedule } from '@/utils/timeExtraction';

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
  const paymentIntentId = searchParams.get('payment_intent_id');
  const orgSlugFromUrl = searchParams.get('org');
  const isFreeSignup = searchParams.get('free') === 'true';
  const { user, userType } = useAuth();
  const lookupId = sessionId || paymentIntentId;

  const [loading, setLoading] = useState(true);
  const [signup, setSignup] = useState<SignupDetails | null>(null);
  const [error, _setError] = useState<string | null>(null);
  const [bookingFailed, setBookingFailed] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const toastShownRef = useRef(false);

  useEffect(() => {
    async function fetchSignupDetails() {
      if (!lookupId) {
        // No identifier — free signup or generic success
        if (!toastShownRef.current) {
          toast.success(isFreeSignup ? 'Påmelding fullført' : 'Betaling fullført');
          toastShownRef.current = true;
        }
        setLoading(false);
        return;
      }

      // Determine which column to query by
      const lookupColumn = paymentIntentId
        ? 'stripe_payment_intent_id'
        : 'stripe_checkout_session_id';

      // Retry fetching signup details with exponential backoff
      // Webhook may take a moment to process; total wait ~55s
      const maxRetries = 12;
      const delays = [1000, 2000, 2000, 4000, 4000, 4000, 8000, 8000, 8000, 8000, 8000, 8000];

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        // Update attempt counter for UI feedback
        setAttemptCount(attempt + 1);

        // Wait before each attempt (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, delays[attempt] || 8000));

        // Query by the appropriate Stripe identifier
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
          .eq(lookupColumn, lookupId)
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

        // If last attempt failed, show softer message
        if (attempt === maxRetries - 1) {
          logger.warn('Signup not found after max retries:', {
            lookupId,
            lookupColumn,
            attempts: maxRetries,
            lastError: fetchError?.message || 'No data returned',
          });

          // Show softer fallback — payment succeeded but webhook is slow
          setBookingFailed(true);
          if (!toastShownRef.current) {
            toast.info('Betalingen er bekreftet. Bekreftelse kommer på e-post.');
            toastShownRef.current = true;
          }
          setLoading(false);
          return;
        }
      }
    }

    fetchSignupDetails();
  }, [lookupId, paymentIntentId, isFreeSignup]);

  // Format date for display
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Ikke angitt';
    const date = new Date(dateString);
    const days = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
    const months = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
    return `${days[date.getDay()]} ${date.getDate()}. ${months[date.getMonth()]}`;
  };


  if (loading) {
    // Show progressive feedback based on how long we've been waiting
    const getLoadingMessage = () => {
      if (attemptCount <= 3) {
        return 'Bekrefter betaling';
      } else if (attemptCount <= 6) {
        return 'Behandler betaling';
      } else if (attemptCount <= 10) {
        return 'Vent litt';
      } else {
        return 'Dette tar litt tid';
      }
    };

    return (
      <div className="min-h-screen w-full bg-background flex items-center justify-center">
        <div className="text-center max-w-xs px-4" role="status" aria-live="polite" aria-atomic="true">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-surface-subtle">
            <Spinner size="xl" className="text-foreground" />
          </div>
          <p className="type-label mb-2 text-foreground">{getLoadingMessage()}</p>
          <p className="type-body text-muted-foreground">
            Bekrefter med banken. Ikke lukk denne siden.
          </p>
          {attemptCount > 8 && (
            <p className="type-meta mt-4 text-muted-foreground">
              Du får beskjed når betalingen er klar.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-background">
        <header className="fixed top-0 left-0 right-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background border border-border text-primary">
                <Leaf className="h-5 w-5" />
              </div>
              <span className="type-title text-foreground">Ease</span>
            </Link>
          </div>
        </header>
        <main className="pt-24 px-4 sm:px-6 pb-24">
          <div className="mx-auto max-w-lg text-center">
            <Card className="p-8 md:p-12">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-surface-subtle">
                <AlertCircle className="h-8 w-8 text-status-error-text" />
              </div>
              <h1 className="type-heading-1 mb-3 text-foreground">
                Noe gikk galt
              </h1>
              <p className="type-body text-muted-foreground mb-8">{error}</p>
              <Button asChild variant="default">
                <Link to="/">
                  <Home className="h-4 w-4 mr-2" />
                  Til forsiden
                </Link>
              </Button>
            </Card>
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
      <div className="min-h-screen w-full bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="type-heading-1 mb-3 text-foreground">
            Betalingen er bekreftet
          </h1>
          <p className="text-muted-foreground mb-8">
            Bekreftelsen tar litt tid. Du vil motta en bekreftelse på e-post når påmeldingen er klar.
          </p>
          <Button asChild variant="default">
            <Link to={failedStudioUrl}>
              Tilbake
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background">
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to={studioUrl} className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background border border-border text-primary">
              <Leaf className="h-5 w-5" />
            </div>
            <span className="type-title text-foreground">Ease</span>
          </Link>
        </div>
      </header>

      <main className="pt-24 px-4 sm:px-6 pb-24">
        <div className="mx-auto max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">

            {/* Left Column: Success Message */}
            <div className="flex flex-col justify-center text-center md:text-left pt-4 md:pt-8">
              <div className="mx-auto md:mx-0 mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-surface-subtle">
                <CheckCircle2 className="h-8 w-8 text-status-confirmed-text" />
              </div>

              <h1 className="type-heading-1 mb-4 text-foreground">
                {isFreeSignup ? 'Påmelding fullført' : 'Betaling fullført'}
              </h1>

              <div className="text-muted-foreground mb-6 text-base leading-relaxed">
                {signup ? (
                  <p>Du er påmeldt <span className="font-medium text-foreground">{signup.course.title}</span>.</p>
                ) : (
                  <p>{isFreeSignup ? 'Du er nå påmeldt.' : 'Betalingen er bekreftet.'}</p>
                )}
              </div>

              {/* Email confirmation notice */}
              <Alert variant="info" icon={Mail} className="mb-8 text-left">
                <div>
                  <AlertTitle variant="info" className="type-title">Bekreftelse sendt</AlertTitle>
                  <AlertDescription variant="info">
                    {signup ? (
                      <>Kvittering sendt til <span className="font-medium">{signup.participant_email}</span>.</>
                    ) : (
                      <>Kvittering sendt til e-postadressen du oppga.</>
                    )}
                  </AlertDescription>
                </div>
              </Alert>

              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                {user && userType === 'student' ? (
                  <>
                    <Button asChild variant="default" size="default" className="w-full sm:w-auto">
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
                    <Button asChild variant="default" size="default" className="w-full sm:w-auto">
                      <Link to={studioUrl}>Se flere kurs</Link>
                    </Button>
                    <div className="type-meta flex items-center justify-center pt-2 text-muted-foreground sm:justify-start sm:pl-4 sm:pt-0">
                      <span>
                        <Link to="/student/login" className="underline underline-offset-2 hover:text-foreground">Logg inn</Link>
                        {' '}for å se kursene dine
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right Column: Order Details */}
            {signup && (
              <Card className="p-6 md:p-8">
                <div className="space-y-5">
                  <div className="pb-5 border-b border-border">
                    <span className="type-meta mb-1 block text-muted-foreground">Kurs</span>
                    <span className="type-label block text-foreground">{signup.course.title}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {signup.course.start_date && (
                      <div>
                        <span className="type-meta mb-1 flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" /> Dato
                        </span>
                        <span className="type-label text-foreground">
                          {formatDate(signup.course.start_date)}
                        </span>
                      </div>
                    )}
                    
                    {signup.course.time_schedule && (
                      <div>
                        <span className="type-meta mb-1 flex items-center gap-1.5 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" /> Tid
                        </span>
                        <span className="type-label text-foreground">
                          kl. {extractTimeFromSchedule(signup.course.time_schedule)?.time ?? ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {signup.course.location && (
                    <div>
                      <span className="type-meta mb-1 flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" /> Sted
                      </span>
                      <span className="type-label text-foreground">{signup.course.location}</span>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between">
                    <span className="type-meta flex items-center gap-1.5 text-muted-foreground">
                      <CreditCard className="h-3.5 w-3.5" /> Betalt
                    </span>
                    <span className="font-medium text-xl text-foreground">{formatKroner(signup.amount_paid)}</span>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CheckoutSuccessPage;

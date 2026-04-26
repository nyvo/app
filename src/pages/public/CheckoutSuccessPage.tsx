import { useEffect, useState, useRef } from 'react';
import { logger } from '@/lib/logger';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Leaf, AlertCircle, Home, CircleCheck, ImageIcon } from '@/lib/icons';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { finalizeDinteroTransaction } from '@/services/checkout';
import { formatKroner } from '@/lib/utils';
import { extractTimeFromSchedule } from '@/utils/timeExtraction';

const WEEKDAYS = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'] as const;
const MONTHS = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'] as const;
const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'] as const;

// Today, Norwegian short form: "26. apr 2026". Used in the receipt footer.
function formatBookingDate(d: Date): string {
  return `${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

// Short reference derived from the signup UUID — first 8 hex chars uppercase
// with a dash for readability ("A3F4-C2D8"). Stable for support lookups.
function shortRef(id: string): string {
  const hex = id.replace(/-/g, '').toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

interface SignupDetails {
  id: string;
  participant_name: string;
  participant_email: string;
  amount_paid: number;
  // The next four fields are filled by migration 20260426010000.
  // Older RPC deploys return undefined; the page renders graceful fallbacks.
  created_at?: string | null;
  course: {
    id: string;
    title: string;
    start_date: string | null;
    time_schedule: string | null;
    location: string | null;
    image_url?: string | null;
    organization: {
      slug: string;
      name: string;
      email?: string | null;
      logo_url?: string | null;
    };
  };
}

const CheckoutSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const transactionId = searchParams.get('transaction_id');
  const merchantReference = searchParams.get('ref');
  const orgSlugFromUrl = searchParams.get('org');
  const isFreeSignup = searchParams.get('free') === 'true';
  const lookupId = transactionId || merchantReference;

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

      // Client-driven finalization: tell the server to capture + create the signup.
      // Idempotent — short-circuits if already processed. This is the primary path;
      // the polling loop below is a safety net in case the call fails mid-flight.
      if (transactionId) {
        const { error: finalizeError } = await finalizeDinteroTransaction(
          transactionId,
          merchantReference,
        );
        if (finalizeError) {
          logger.warn('Finalize call failed, falling back to poll:', finalizeError.message);
        }
      }

      // Poll for the signup (fast on the happy path since finalize already created it).
      // Keeps a safety net for webhook-driven deliveries and retries.
      const maxRetries = 12;
      const delays = [500, 1000, 2000, 2000, 4000, 4000, 4000, 8000, 8000, 8000, 8000, 8000];

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        setAttemptCount(attempt + 1);

        // Wait before each attempt (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, delays[attempt] || 8000));

        // Server-side lookup via SECURITY DEFINER RPC — avoids exposing
        // all paid signups through a broad SELECT RLS policy.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: fetchError } = await (supabase.rpc as any)(
          'get_signup_by_dintero_id',
          {
            p_transaction_id: transactionId,
            p_merchant_reference: merchantReference,
          }
        );

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
  }, [lookupId, transactionId, merchantReference, isFreeSignup]);

  // Format a YYYY-MM-DD date as "Mandag 2. februar". Returns null on bad input
  // so callers can fall back gracefully instead of rendering "Ikke angitt".
  const formatDate = (dateString: string | null): string | null => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return `${WEEKDAYS[date.getDay()]} ${date.getDate()}. ${MONTHS[date.getMonth()]}`;
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
          <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-muted">
            <Spinner size="xl" className="text-foreground" />
          </div>
          <p className="text-sm font-medium mb-2 text-foreground">{getLoadingMessage()}</p>
          <p className="text-sm text-muted-foreground">
            Bekrefter med banken. Ikke lukk denne siden.
          </p>
          {attemptCount > 8 && (
            <p className="text-xs mt-4 text-muted-foreground">
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
        <header className="fixed top-0 left-0 right-0 z-40 border-b border-border bg-surface-elevated backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-background border border-border text-primary">
                <Leaf className="size-5" />
              </div>
              <span className="text-base font-medium text-foreground">Ease</span>
            </Link>
          </div>
        </header>
        <main className="pt-24 px-4 sm:px-6 pb-24">
          <div className="mx-auto max-w-lg text-center">
            <Card className="p-8 md:p-12">
              <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-muted">
                <AlertCircle className="size-8 text-destructive" />
              </div>
              <h1 className="text-3xl font-semibold tracking-tight mb-3 text-foreground">
                Noe gikk galt
              </h1>
              <p className="text-base text-muted-foreground mb-8">{error}</p>
              <Button asChild variant="default">
                <Link to="/">
                  <Home className="size-4 mr-2" />
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
          <h1 className="text-3xl font-semibold tracking-tight mb-3 text-foreground">
            Betalingen er bekreftet
          </h1>
          <p className="text-base text-muted-foreground mb-8">
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
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-border bg-surface-elevated backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to={studioUrl} className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-background border border-border text-primary">
              <Leaf className="size-5" />
            </div>
            <span className="text-base font-medium text-foreground">Ease</span>
          </Link>
        </div>
      </header>

      <main className="pt-24 px-4 sm:px-6 pb-24">
        <div className="mx-auto max-w-xl">
          {(() => {
            const dateLong = formatDate(signup?.course.start_date ?? null);
            const time = extractTimeFromSchedule(signup?.course.time_schedule)?.time ?? null;
            const orgName = signup?.course.organization?.name ?? null;
            const orgLogo = signup?.course.organization?.logo_url ?? null;
            const orgEmail = signup?.course.organization?.email ?? null;
            const courseImage = signup?.course.image_url ?? null;
            const isFree = isFreeSignup || (signup?.amount_paid ?? 0) === 0;
            const bookedAt = signup?.created_at ? new Date(signup.created_at) : new Date();
            const whenLine = [dateLong, time ? `kl. ${time}` : null].filter(Boolean).join(' · ');

            return (
              <>
                {/* Studio brand chip — centered above the success card, tells the
                    user "this confirmation is from {studio}". Falls back to a
                    monogram tile when the studio has no uploaded logo. */}
                {orgName && (
                  <div className="flex items-center justify-center gap-2.5 pt-4 sm:pt-8">
                    {orgLogo ? (
                      <img
                        src={orgLogo}
                        alt=""
                        className="size-8 rounded-md object-cover bg-muted"
                      />
                    ) : (
                      <div className="flex size-8 items-center justify-center rounded-md bg-muted text-sm font-semibold text-muted-foreground">
                        {orgName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-base font-semibold text-foreground">{orgName}</span>
                  </div>
                )}

                {/* Success card — single centered surface, Uvodo-shaped. */}
                <div className="mt-8 sm:mt-10 rounded-lg border border-border bg-card p-7 sm:p-10 ring-1 ring-foreground/[0.04] shadow-[0_8px_32px_-12px_rgba(0,0,0,0.14)]">
                  {/* Soft success indicator */}
                  <div className="flex size-12 items-center justify-center rounded-full bg-success/10">
                    <CircleCheck className="size-6 text-success" />
                  </div>

                  {/* Hero copy — warm, single-color subline */}
                  <h1 className="mt-6 text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
                    Du er påmeldt.
                  </h1>
                  <p className="mt-3 text-base text-muted-foreground">
                    {signup
                      ? `Du er påmeldt. Vi har sendt en bekreftelse til ${signup.participant_email}.`
                      : isFreeSignup
                        ? 'Du er påmeldt. Vi har sendt en bekreftelse til e-posten din.'
                        : 'Betalingen er bekreftet. Vi har sendt en bekreftelse til e-posten din.'}
                  </p>

                  {signup && (
                    <>
                      {/* Course card — image + title + date/time. Nested card-in-card. */}
                      <div className="mt-7 flex items-center gap-4 rounded-lg border border-border bg-background p-3.5">
                        <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
                          {courseImage ? (
                            <img
                              src={courseImage}
                              alt=""
                              className="absolute inset-0 size-full object-cover"
                            />
                          ) : (
                            <div className="flex size-full items-center justify-center text-muted-foreground">
                              <ImageIcon className="size-5" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{signup.course.title}</p>
                          {whenLine && (
                            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">{whenLine}</p>
                          )}
                          {signup.course.location && (
                            <p className="mt-0.5 text-xs text-muted-foreground truncate">{signup.course.location}</p>
                          )}
                        </div>
                      </div>

                      {/* Discreet meta row — booking date + paid amount */}
                      <div className="mt-6 border-t border-border pt-5 space-y-2.5 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Påmeldt</span>
                          <span className="font-medium text-foreground">{formatBookingDate(bookedAt)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">{isFree ? 'Pris' : 'Betalt'}</span>
                          <span className="font-medium text-foreground tabular-nums">
                            {isFree ? 'Gratis' : formatKroner(signup.amount_paid)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Referanse</span>
                          <span className="font-medium text-foreground tabular-nums">{shortRef(signup.id)}</span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Support — contact studio if anything's off */}
                  {orgEmail && (
                    <div className="mt-6 border-t border-border pt-5 text-sm text-muted-foreground">
                      Trenger du hjelp? Send en e-post til{' '}
                      <a
                        href={`mailto:${orgEmail}`}
                        className="text-foreground underline decoration-muted-foreground/40 underline-offset-2 hover:decoration-foreground"
                      >
                        {orgEmail}
                      </a>
                      .
                    </div>
                  )}
                </div>

                {/* Single calm CTA below the card */}
                <div className="mt-8 flex justify-center">
                  <Button asChild size="default">
                    <Link to={studioUrl}>Se flere kurs</Link>
                  </Button>
                </div>
              </>
            );
          })()}
        </div>
      </main>
    </div>
  );
};

export default CheckoutSuccessPage;

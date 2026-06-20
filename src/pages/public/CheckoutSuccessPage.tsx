import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { Link, useSearchParams } from 'react-router-dom';
import { ImageIcon, Check, X, Clock } from '@/lib/icons';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { PageState } from '@/components/page-state/page-state';
import { supabase } from '@/lib/supabase';
import { claimMySignups } from '@/services/signups';
import { useAuth } from '@/contexts/AuthContext';
import { AUTH_ROUTES } from '@/lib/auth-routes';
import { formatKroner } from '@/lib/utils';
import { extractTimeFromSchedule } from '@/utils/timeExtraction';
import { toLocalDate } from '@/utils/dateUtils';

const WEEKDAYS = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'] as const;
const MONTHS = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'] as const;
const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'] as const;
const SUPPORT_EMAIL = 'hei@openspot.no';

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
  payment_status?: string | null;
  status?: string | null;
  // Masked (k•••@example.com) — the anon receipt lookup never returns the
  // full address; the claim magic link is sent server-side by
  // send-booking-claim-link, which resolves the address itself.
  participant_email_masked: string;
  amount_paid: number;
  created_at?: string | null;
  course: {
    id: string;
    title: string;
    start_date: string | null;
    time_schedule: string | null;
    location: string | null;
    image_url?: string | null;
    /**
     * Studio identity — RPC populates this from the seller (legal/billing
     * entity) plus the slug from the team owned by that seller.
     */
    seller: {
      name: string;
      logo_url?: string | null;
      team_slug: string;
    };
  };
}

const CheckoutSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const orgSlugFromUrl = searchParams.get('org');
  const isFreeSignup = searchParams.get('free') === 'true';
  // Manual signups (paid course, free-tier seller) confirm like free signups:
  // payment is arranged with the studio.
  const isManualSignup = searchParams.get('manual') === 'true';
  // Stripe checkout returns with ?payment_intent=pi_… (Stripe appends it to our return_url).
  // The webhook captures + mints the signup async; here we poll get_signup_by_stripe_id.
  const paymentIntentId = searchParams.get('payment_intent');
  const isStripe = Boolean(paymentIntentId);
  // The attempt id round-trips in the return URL (?ref=…) — used to read the attempt's terminal
  // status when no signup is minted (capacity-reject void after authorize).
  const attemptRef = searchParams.get('ref');

  const [loading, setLoading] = useState(true);
  const [signup, setSignup] = useState<SignupDetails | null>(null);
  const [error, _setError] = useState<string | null>(null);
  const [bookingFailed, setBookingFailed] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function fetchSignupDetails() {
      if (!isStripe) {
        setLoading(false);
        return;
      }

      // Poll for the signup — the webhook captures + creates the signup async.
      const maxRetries = 12;
      const delays = [500, 1000, 2000, 2000, 4000, 4000, 4000, 8000, 8000, 8000, 8000, 8000];

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        if (cancelled) return;
        setAttemptCount(attempt + 1);

        // Wait before each attempt (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, delays[attempt] || 8000));
        if (cancelled) return;

        // Server-side lookup via SECURITY DEFINER RPC — avoids exposing
        // all paid signups through a broad SELECT RLS policy.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error: fetchError } = await (supabase.rpc as any)('get_signup_by_stripe_id', {
          p_payment_intent_id: paymentIntentId,
        });
        if (cancelled) return;

        if (data && !fetchError) {
          const row = data as unknown as SignupDetails;
          // Capture failed (or payment otherwise didn't complete) — never tell
          // the buyer they're enrolled.
          if (row.payment_status === 'failed') {
            setPaymentFailed(true);
            setLoading(false);
            return;
          }
          // Only a captured, confirmed signup is a real "Du er påmeldt".
          if (row.payment_status === 'paid' && row.status === 'confirmed') {
            setSignup(row);
            setLoading(false);
            return;
          }
          // Otherwise (still pending, refunded, cancelled) keep polling; the
          // max-retries fallback below shows the softer "tar litt tid" state.
        }

        // No signup yet — if the payment attempt was voided/failed (the manual-capture
        // capacity-reject race: the course filled between authorize and capture, so the webhook
        // cancelled the PI and never minted a signup), the buyer is NOT enrolled and was NOT
        // charged. Surface that instead of the optimistic "we're processing" fallback below.
        if (attemptRef) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: attemptStatus } = await (supabase.rpc as any)('get_payment_attempt_status', {
            p_attempt_id: attemptRef,
          });
          if (cancelled) return;
          if (attemptStatus === 'voided' || attemptStatus === 'failed') {
            setPaymentFailed(true);
            setLoading(false);
            return;
          }
        }

        // If last attempt failed, show softer message
        if (attempt === maxRetries - 1) {
          logger.warn('Signup not found after max retries:', {
            paymentIntentId,
            attempts: maxRetries,
            lastError: fetchError?.message || 'No data returned',
          });

          // Show softer fallback — payment succeeded but webhook is slow
          setBookingFailed(true);
          setLoading(false);
          return;
        }
      }
    }

    fetchSignupDetails();
    return () => {
      cancelled = true;
    };
  }, [isStripe, paymentIntentId, attemptRef]);

  // A logged-in user's fresh booking is still a guest row (checkout never
  // threads buyer_id) — claim it on the spot so it shows on /overview
  // immediately instead of waiting for the next session start.
  useEffect(() => {
    if (!user || !signup) return;
    void claimMySignups().then(({ error: claimError }) => {
      if (claimError) logger.error('Receipt: claim_my_signups failed', claimError);
    });
  }, [user, signup]);

  // Format a YYYY-MM-DD date as "Mandag 2. februar". Returns null on bad input
  // so callers can fall back gracefully instead of rendering "Ikke angitt".
  const formatDate = (dateString: string | null): string | null => {
    if (!dateString) return null;
    const date = toLocalDate(dateString);
    if (isNaN(date.getTime())) return null;
    return `${WEEKDAYS[date.getDay()]} ${date.getDate()}. ${MONTHS[date.getMonth()]}`;
  };


  if (loading) {
    // Two tiers only — the headline stays the same; after ~8 attempts we
    // add a quiet line acknowledging the longer wait.
    const isLongWait = attemptCount > 8;

    return (
      <div className="min-h-screen w-full bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-4" role="status" aria-live="polite" aria-atomic="true">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
            <Spinner size="lg" className="text-foreground" />
          </div>
          <p className="mb-3 text-3xl font-medium text-foreground">Bekrefter betaling</p>
          <p className="text-base text-foreground-muted">
            {isLongWait
              ? 'Det tar litt lenger tid enn vanlig. Du får bekreftelsen på e-post om vi ikke blir ferdige her.'
              : 'Vi bekrefter med banken. Ikke lukk denne siden.'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-background">
        <header className="fixed top-0 left-0 right-0 z-40 border-b border-border bg-surface-elevated backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link to="/" className="flex items-center">
              <span className="text-base font-medium text-foreground">Openspot</span>
            </Link>
          </div>
        </header>
        <div className="pt-16">
          <PageState variant="server-error" description={error} />
        </div>
      </div>
    );
  }

  // Determine studio URL from signup data or URL parameter
  const studioUrl = signup?.course?.seller?.team_slug
    ? `/${signup.course.seller.team_slug}`
    : orgSlugFromUrl
      ? `/${orgSlugFromUrl}`
      : '/';

  // Show booking failed state
  if (bookingFailed) {
    const failedStudioUrl = orgSlugFromUrl ? `/${orgSlugFromUrl}` : '/';

    return (
      <div className="min-h-screen w-full bg-background flex items-center justify-center px-4">
        <div className="flex flex-col items-center text-center max-w-md">
          <div
            aria-hidden="true"
            className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted text-foreground"
          >
            <Clock className="size-6" strokeWidth={2.5} />
          </div>
          <h1 className="mb-3 text-3xl font-medium text-foreground">
            Vi behandler påmeldingen din
          </h1>
          <p className="mb-8 text-base text-foreground-muted">
            Det tar litt lenger tid enn vanlig. Du får en bekreftelse på e-post så snart betalingen er gjennomført.
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

  // Payment didn't capture — don't tell the buyer they're enrolled.
  if (paymentFailed) {
    const failedStudioUrl = orgSlugFromUrl ? `/${orgSlugFromUrl}` : '/';

    return (
      <div className="min-h-screen w-full bg-background flex items-center justify-center px-4">
        <div className="flex flex-col items-center text-center max-w-md">
          <div
            aria-hidden="true"
            className="mb-4 flex size-12 items-center justify-center rounded-full bg-danger text-danger-foreground"
          >
            <X className="size-6" strokeWidth={2.5} />
          </div>
          <h1 className="mb-3 text-3xl font-medium text-foreground">
            Betalingen gikk ikke gjennom
          </h1>
          <p className="mb-8 text-base text-foreground-muted">
            Du er ikke påmeldt ennå – prøv igjen eller kontakt studioet.
          </p>
          <Button asChild variant="default">
            <Link to={failedStudioUrl}>Tilbake</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="flex w-full items-center justify-center px-4 py-8 sm:px-6">
        <Link to={studioUrl} className="flex select-none items-center">
          <span className="text-base font-medium text-foreground">Openspot</span>
        </Link>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pb-16 sm:px-6 md:items-center">
        <div className="w-full max-w-md">
          {(() => {
            const dateLong = formatDate(signup?.course.start_date ?? null);
            const time = extractTimeFromSchedule(signup?.course.time_schedule)?.time ?? null;
            const courseImage = signup?.course.image_url ?? null;
            const isFree = isFreeSignup || (signup?.amount_paid ?? 0) === 0;
            const bookedAt = signup?.created_at ? new Date(signup.created_at) : new Date();
            const whenLine = [dateLong, time ? `kl. ${time}` : null].filter(Boolean).join(' · ');

            return (
              <>
                  {/* Title block — neutral circle + green check, centered heading. */}
                  <div className="flex flex-col items-center text-center">
                    <div
                      aria-hidden="true"
                      className="flex size-12 items-center justify-center rounded-full bg-success text-success-foreground"
                    >
                      <Check className="size-6" strokeWidth={2.5} />
                    </div>
                    <h1 className="mt-4 text-3xl font-medium text-foreground">Du er påmeldt</h1>
                    <p className="mt-2 text-base text-foreground-muted">
                      {signup
                        ? `Vi har sendt en bekreftelse til ${signup.participant_email_masked}.`
                        : 'Vi har sendt en bekreftelse til e-posten din.'}
                    </p>
                    {isManualSignup && (
                      <p className="mt-1 text-base text-foreground-muted">
                        Betaling avtales direkte med studioet.
                      </p>
                    )}
                  </div>

                  {signup && (
                    <>
                      {/* Course pane — image + title + date/time. */}
                      <div className="mt-8 flex items-center gap-4 rounded-lg border border-border bg-background p-3.5">
                        <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
                          {courseImage ? (
                            <img
                              src={courseImage}
                              alt=""
                              className="absolute inset-0 size-full object-cover"
                            />
                          ) : (
                            <div className="flex size-full items-center justify-center text-foreground-muted">
                              <ImageIcon className="size-5" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-medium text-foreground">{signup.course.title}</p>
                          {whenLine && (
                            <p className="mt-0.5 text-sm text-foreground-muted tabular-nums">{whenLine}</p>
                          )}
                          {signup.course.location && (
                            <p className="mt-0.5 text-sm text-foreground-muted truncate">{signup.course.location}</p>
                          )}
                        </div>
                      </div>

                      {/* Discreet meta row — booking date + paid amount */}
                      <div className="mt-6 border-t border-border pt-6 space-y-2.5 text-base">
                        <div className="flex items-center justify-between">
                          <span className="text-foreground-muted">Påmeldt</span>
                          <span className="font-medium text-foreground">{formatBookingDate(bookedAt)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-foreground-muted">{isFree ? 'Pris' : 'Betalt'}</span>
                          <span className="font-medium text-foreground tabular-nums">
                            {isFree ? 'Gratis' : formatKroner(signup.amount_paid)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-foreground-muted">Referanse</span>
                          <span className="font-medium text-foreground tabular-nums">{shortRef(signup.id)}</span>
                        </div>
                      </div>
                      {/* Account offer — logged-in users go straight to the
                          (auto-claimed) overview. */}
                      {user && (
                        <div className="mt-8">
                          <Button asChild variant="default" className="w-full">
                            <Link to={AUTH_ROUTES.dashboard}>Se påmeldingene dine</Link>
                          </Button>
                        </div>
                      )}
                    </>
                  )}

                  {/* Support — use platform support so seller emails stay private. */}
                  <p className="mt-6 text-base text-foreground-muted">
                    Trenger du hjelp? Send en e-post til{' '}
                    <a
                      href={`mailto:${SUPPORT_EMAIL}`}
                      className="text-foreground underline decoration-foreground-muted/40 underline-offset-2 hover:decoration-foreground"
                    >
                      {SUPPORT_EMAIL}
                    </a>
                    .
                  </p>
              </>
            );
          })()}
        </div>
      </main>
    </div>
  );
};

export default CheckoutSuccessPage;

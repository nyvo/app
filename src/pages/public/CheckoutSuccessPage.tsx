import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { Link, useSearchParams } from 'react-router-dom';
import { ImageIcon, Check } from '@/lib/icons';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { PageState } from '@/components/page-state/page-state';
import { supabase } from '@/lib/supabase';
import { finalizeDinteroTransaction } from '@/services/checkout';
import { formatKroner } from '@/lib/utils';
import { extractTimeFromSchedule } from '@/utils/timeExtraction';

const WEEKDAYS = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'] as const;
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
    /**
     * Studio identity — RPC populates this from the seller (legal/billing
     * entity) plus the slug from the team owned by that seller. The seller
     * name, email, logo_url come from `sellers`; `team_slug` is the public
     * URL fragment.
     */
    seller: {
      name: string;
      email?: string | null;
      logo_url?: string | null;
      team_slug: string;
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

  useEffect(() => {
    async function fetchSignupDetails() {
      if (!lookupId) {
        // No identifier — free signup or generic success
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
    // Two tiers only — the headline stays the same; after ~8 attempts we
    // add a quiet line acknowledging the longer wait (Studio § 10 threshold
    // gradient). Verbose cycling labels ("Vent litt", "Dette tar litt tid")
    // were noise dressed up as progress.
    const isLongWait = attemptCount > 8;

    return (
      <div className="min-h-screen w-full bg-background flex items-center justify-center">
        <div className="text-center max-w-xs px-4" role="status" aria-live="polite" aria-atomic="true">
          <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-muted">
            <Spinner size="xl" className="text-foreground" />
          </div>
          <p className="text-sm font-medium mb-2 text-foreground">Bekrefter betaling</p>
          <p className="text-sm text-foreground-muted">
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
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-medium tracking-tight mb-3 text-foreground">
            Betalingen er bekreftet
          </h1>
          <p className="text-base text-foreground-muted mb-8">
            Bekreftelsen tar litt tid. Vi sender deg en e-post når påmeldingen er klar.
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
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="flex w-full items-center justify-center px-4 py-8 sm:px-6">
        <Link to={studioUrl} className="flex select-none items-center">
          <span className="text-base font-medium text-foreground">Openspot</span>
        </Link>
      </header>

      <main className="flex-1 px-4 pb-16 sm:px-6">
        <div className="mx-auto w-full max-w-xl">
          {(() => {
            const dateLong = formatDate(signup?.course.start_date ?? null);
            const time = extractTimeFromSchedule(signup?.course.time_schedule)?.time ?? null;
            const orgEmail = signup?.course.seller?.email ?? null;
            const courseImage = signup?.course.image_url ?? null;
            const isFree = isFreeSignup || (signup?.amount_paid ?? 0) === 0;
            const bookedAt = signup?.created_at ? new Date(signup.created_at) : new Date();
            const whenLine = [dateLong, time ? `kl. ${time}` : null].filter(Boolean).join(' · ');

            return (
              <div className="overflow-hidden rounded-lg border border-border bg-surface">
                <div className="p-6 sm:p-8">
                  {/* Title block — green check, title, description, all centered. */}
                  <div className="flex flex-col items-center text-center">
                    <div
                      aria-hidden="true"
                      className="flex size-8 items-center justify-center rounded-full bg-success text-success-foreground"
                    >
                      <Check className="size-4" strokeWidth={2.5} />
                    </div>
                    <h1 className="mt-4 text-base font-medium text-foreground">Du er påmeldt</h1>
                    <p className="mt-1 text-sm text-foreground-muted">
                      {signup
                        ? `Vi har sendt en bekreftelse til ${signup.participant_email}.`
                        : 'Vi har sendt en bekreftelse til e-posten din.'}
                    </p>
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
                          <p className="truncate text-sm font-medium text-foreground">{signup.course.title}</p>
                          {whenLine && (
                            <p className="mt-0.5 text-xs text-foreground-muted tabular-nums">{whenLine}</p>
                          )}
                          {signup.course.location && (
                            <p className="mt-0.5 text-xs text-foreground-muted truncate">{signup.course.location}</p>
                          )}
                        </div>
                      </div>

                      {/* Discreet meta row — booking date + paid amount */}
                      <div className="mt-6 border-t border-border pt-6 space-y-2.5 text-sm">
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
                    </>
                  )}

                  {/* Support — contact studio if anything's off */}
                  {orgEmail && (
                    <p className="mt-6 text-sm text-foreground-muted">
                      Trenger du hjelp? Send en e-post til{' '}
                      <a
                        href={`mailto:${orgEmail}`}
                        className="text-foreground underline decoration-foreground-muted/40 underline-offset-2 hover:decoration-foreground"
                      >
                        {orgEmail}
                      </a>
                      .
                    </p>
                  )}
                </div>

                {/* Policy footer inset — separated by hairline, muted bg.
                    Cal.com pattern: cancellation reinforcement gets its own
                    block so customers who missed it during booking find it. */}
                {!isFree && (
                  <div className="border-t border-border-subtle bg-muted px-6 py-4 sm:px-8 text-center">
                    <p className="text-xs text-foreground-muted">
                      Avbestill innen 24 timer før kurset for full refusjon.
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </main>
    </div>
  );
};

export default CheckoutSuccessPage;

import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, X, Clock, Mail, ArrowUpRight } from '@/lib/icons';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { PageState } from '@/components/page-state/page-state';
import { supabase } from '@/lib/supabase';
import { claimMySignups } from '@/services/signups';
import { useAuth } from '@/contexts/AuthContext';
import { formatKroner } from '@/lib/utils';
import { extractTimeFromSchedule } from '@/utils/timeExtraction';
import { toLocalDate } from '@/utils/dateUtils';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { readFreeReceipt, type FreeReceipt } from '@/lib/free-receipt';
import { BrandFooter } from '@/components/public/BrandFooter';
import { PublicCard } from '@/components/public/PublicCard';
import { directionsUrl } from '@/components/public/studio/studioFacts';
import { WEEKDAYS_LONG as WEEKDAYS, MONTHS_LONG as MONTHS } from '@/lib/calendar-nb';

// Full Norwegian date, e.g. "26. april 2026". Used in the receipt footer.
function formatBookingDate(d: Date): string {
  return `${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// Short reference derived from the signup UUID — last 6 hex chars uppercase
// ("E7F9C2"), the SAME derivation the confirmation/receipt emails use
// (shortBookingId in supabase/functions/_shared/format.ts), so the page and
// the email always quote one identical reference for support lookups.
function shortRef(id: string): string {
  return id.replace(/-/g, '').slice(-6).toUpperCase();
}

interface SignupDetails {
  id: string;
  payment_status?: string | null;
  status?: string | null;
  // Full address — the receipt URL's unguessable payment-intent id is the
  // effective access token (see 20260714123000_receipt_full_email).
  participant_email: string;
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
     * entity), whose slug is the public storefront path.
     */
    seller: {
      name: string;
      logo_url?: string | null;
      slug: string;
    };
  };
}

// Unified shape the recap pane renders from, regardless of whether the buyer
// paid (server-polled SignupDetails) or signed up free (client-side
// sessionStorage receipt — see src/lib/free-receipt.ts). Keeps a single JSX
// block instead of two near-duplicate render paths.
interface DisplaySignup {
  id: string;
  participantEmail: string;
  amountPaid: number;
  createdAt: string | null;
  course: {
    title: string;
    startDate: string | null;
    timeSchedule: string | null;
    // Free path only — the paid-path RPC doesn't return duration; the ICS
    // end-time resolver treats null as "no duration signal".
    durationMinutes: number | null;
    location: string | null;
    // Only ever populated on the free path — CheckoutPage already has the
    // course's coordinates in memory. The paid-path RPC only returns a plain
    // location string, so this stays null there and directionsUrl falls back
    // to its text-search branch.
    locationLat: number | null;
    locationLon: number | null;
    locationPlaceId: string | null;
    imageUrl: string | null;
    sellerSlug: string;
    sellerName: string | null;
    sellerLogoUrl: string | null;
  };
}

const CheckoutSuccessPage = () => {
  useDocumentTitle('Kvittering');
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  // Only accept a plain slug — anything else (e.g. `?org=/evil.com` → a
  // protocol-relative href) falls back to the front page.
  const rawOrgSlug = searchParams.get('org');
  const orgSlugFromUrl = rawOrgSlug && /^[a-z0-9-]+$/.test(rawOrgSlug) ? rawOrgSlug : null;
  const isFreeSignup = searchParams.get('free') === 'true';
  // Stripe checkout returns with ?payment_intent=pi_… (Stripe appends it to our return_url).
  // The webhook captures + mints the signup async; here we poll get_signup_by_stripe_id.
  const paymentIntentId = searchParams.get('payment_intent');
  const isStripe = Boolean(paymentIntentId);
  // The attempt id round-trips in the return URL (?ref=…) — used to read the attempt's terminal
  // status when no signup is minted (capacity-reject void after authorize).
  const attemptRef = searchParams.get('ref');

  const [loading, setLoading] = useState(true);
  const [signup, setSignup] = useState<SignupDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bookingFailed, setBookingFailed] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  // A voided attempt (capacity-reject after authorize) is not a decline — the
  // buyer was never charged. Tracked separately for its own copy.
  const [paymentVoided, setPaymentVoided] = useState(false);
  // ?ref points at no payment_attempt row (stale/garbage link) — stop the long
  // poll early and show the neutral "Sjekk e-posten din" state.
  const [refUnknown, setRefUnknown] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);

  // Free path: the checkout page stashed a client-side receipt in
  // sessionStorage (keyed by ?sid=signup id) before redirecting — see
  // src/lib/free-receipt.ts for why there's no server-side lookup here. Read
  // once into state (lazy initializer) and left in storage — it's
  // session-scoped and masked, so keeping it costs nothing and lets an F5 on
  // the receipt page keep working. If it's missing or malformed (storage
  // cleared, fresh tab, tampered), the page falls back to the generic
  // no-recap free confirmation.
  const [freeReceipt] = useState<FreeReceipt | null>(() =>
    isFreeSignup ? readFreeReceipt(searchParams.get('sid')) : null,
  );

  useEffect(() => {
    let cancelled = false;
    async function fetchSignupDetails() {
      if (!paymentIntentId) {
        setLoading(false);
        return;
      }

      // Poll for the signup — the webhook captures + creates the signup async.
      const maxRetries = 12;
      const delays = [500, 1000, 2000, 2000, 4000, 4000, 4000, 8000, 8000, 8000, 8000, 8000];
      // Distinguishes "server answered, signup not minted yet" (webhook slow →
      // optimistic fallback) from "every request failed" (buyer offline →
      // telling them 'vi behandler påmeldingen' would be a guess).
      let anyResponseReceived = false;
      // Counts consecutive null results from the attempt-status RPC. status is
      // NOT NULL for any real attempt, so a null (with no error) means the ?ref
      // points to no attempt at all — a stale/garbage link.
      let consecutiveRefNull = 0;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        if (cancelled) return;
        setAttemptCount(attempt + 1);

        // Wait before each attempt (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, delays[attempt] || 8000));
        if (cancelled) return;

        // Server-side lookup via SECURITY DEFINER RPC — avoids exposing
        // all paid signups through a broad SELECT RLS policy.
        const { data, error: fetchError } = await supabase.rpc('get_signup_by_stripe_id', {
          p_payment_intent_id: paymentIntentId,
        });
        if (cancelled) return;
        if (!fetchError) anyResponseReceived = true;

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
          const { data: attemptStatus, error: attemptErr } = await supabase.rpc('get_payment_attempt_status', {
            p_attempt_id: attemptRef,
          });
          if (cancelled) return;
          // Voided = the course filled between authorize and capture; the buyer
          // was never charged. Distinct copy from a genuine decline (failed).
          if (attemptStatus === 'voided') {
            setPaymentVoided(true);
            setLoading(false);
            return;
          }
          if (attemptStatus === 'failed') {
            setPaymentFailed(true);
            setLoading(false);
            return;
          }
          // A null status (no error) means no such attempt — the ?ref is stale.
          // After ~3 consecutive nulls, stop the long hold + false "vi
          // behandler" and show the neutral "Sjekk e-posten din" state.
          if (!attemptErr && attemptStatus == null) {
            consecutiveRefNull += 1;
            if (consecutiveRefNull >= 3) {
              setRefUnknown(true);
              setLoading(false);
              return;
            }
          } else {
            consecutiveRefNull = 0;
          }
        }

        // If last attempt failed, show softer message
        if (attempt === maxRetries - 1) {
          logger.warn('Signup not found after max retries:', {
            paymentIntentId,
            attempts: maxRetries,
            anyResponseReceived,
            lastError: fetchError?.message || 'No data returned',
          });

          if (!anyResponseReceived) {
            // Never reached the server — network problem on the buyer's end.
            // Don't claim we're processing anything; we don't know.
            setError('Får ikke kontakt med serveren. Sjekk nettet og last siden på nytt.');
            setLoading(false);
            return;
          }

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
      <div className="min-h-dvh w-full bg-surface flex flex-col">
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center max-w-md px-4" role="status" aria-live="polite" aria-atomic="true">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
              <Spinner size="lg" className="text-foreground" />
            </div>
            <h1 className="mb-3 text-3xl font-medium text-foreground">Bekrefter betaling</h1>
            <p className="text-base text-foreground-muted">
              {isLongWait
                ? 'Det tar litt lenger tid enn vanlig. Du får bekreftelsen på e-post om vi ikke blir ferdige her.'
                : 'Vi bekrefter med banken. Ikke lukk denne siden.'}
            </p>
          </div>
        </div>
        <BrandFooter />
      </div>
    );
  }

  if (error) {
    // Bare full-page state — the checkout this page continues from has no
    // StorefrontHeader, so its terminal states don't grow one either.
    return <PageState variant="server-error" description={error} />;
  }

  // Single shape the recap pane renders from — paid (polled) or free
  // (sessionStorage, read into state above), whichever is present.
  const displaySignup: DisplaySignup | null = signup
    ? {
        id: signup.id,
        participantEmail: signup.participant_email,
        amountPaid: signup.amount_paid,
        createdAt: signup.created_at ?? null,
        course: {
          title: signup.course.title,
          startDate: signup.course.start_date,
          timeSchedule: signup.course.time_schedule,
          durationMinutes: null,
          location: signup.course.location,
          locationLat: null,
          locationLon: null,
          locationPlaceId: null,
          imageUrl: signup.course.image_url ?? null,
          sellerSlug: signup.course.seller.slug,
          sellerName: signup.course.seller.name ?? null,
          sellerLogoUrl: signup.course.seller.logo_url ?? null,
        },
      }
    : freeReceipt
      ? {
          id: freeReceipt.signupId,
          participantEmail: freeReceipt.participantEmail,
          amountPaid: 0,
          createdAt: freeReceipt.createdAt,
          course: {
            title: freeReceipt.courseTitle,
            startDate: freeReceipt.startDate,
            timeSchedule: freeReceipt.timeSchedule,
            durationMinutes: freeReceipt.durationMinutes ?? null,
            location: freeReceipt.location,
            locationLat: freeReceipt.locationLat,
            locationLon: freeReceipt.locationLon,
            locationPlaceId: freeReceipt.locationPlaceId,
            imageUrl: freeReceipt.imageUrl,
            sellerSlug: freeReceipt.sellerSlug,
            sellerName: freeReceipt.sellerName || null,
            sellerLogoUrl: freeReceipt.sellerLogoUrl ?? null,
          },
        }
      : null;


  // Show booking failed state
  if (bookingFailed) {
    const failedStudioUrl = orgSlugFromUrl ? `/${orgSlugFromUrl}` : '/';

    return (
      <div className="min-h-dvh w-full bg-surface flex flex-col px-4">
        <div className="flex flex-1 items-center justify-center">
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
        <BrandFooter />
      </div>
    );
  }

  // Attempt was voided (course filled before capture) — not a decline, and
  // nothing was charged. Same title as a decline, reassuring body.
  if (paymentVoided) {
    const failedStudioUrl = orgSlugFromUrl ? `/${orgSlugFromUrl}` : '/';

    return (
      <div className="min-h-dvh w-full bg-surface flex flex-col px-4">
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center text-center max-w-md">
            <div
              aria-hidden="true"
              className="mb-4 flex size-12 items-center justify-center rounded-full bg-danger-subtle text-danger"
            >
              <X className="size-6" strokeWidth={2.5} />
            </div>
            <h1 className="mb-3 text-3xl font-medium text-foreground">
              Betalingen gikk ikke gjennom
            </h1>
            <p className="mb-8 text-base text-foreground-muted">
              Kurset ble fullt før betalingen ble fullført. Beløpet er ikke trukket.
            </p>
            <Button asChild variant="default">
              <Link to={failedStudioUrl}>Tilbake</Link>
            </Button>
          </div>
        </div>
        <BrandFooter />
      </div>
    );
  }

  // Payment didn't capture — don't tell the buyer they're enrolled.
  if (paymentFailed) {
    const failedStudioUrl = orgSlugFromUrl ? `/${orgSlugFromUrl}` : '/';

    return (
      <div className="min-h-dvh w-full bg-surface flex flex-col px-4">
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center text-center max-w-md">
            <div
              aria-hidden="true"
              className="mb-4 flex size-12 items-center justify-center rounded-full bg-danger-subtle text-danger"
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
        <BrandFooter />
      </div>
    );
  }

  // Reached without any known success signal — not a free signup and no
  // Stripe payment_intent to poll (e.g. a paid return that dropped its params).
  // The Stripe poll always resolves to signup / paymentFailed / bookingFailed,
  // so this branch is the *only* way to arrive here with nothing confirmed.
  // Never imply enrolment: point at the receipt email + support.
  // `refUnknown` routes a stale/garbage ?ref here early (see the poll above)
  // instead of the long hold + false "vi behandler".
  if ((!isFreeSignup && !isStripe) || refUnknown) {
    const fallbackStudioUrl = orgSlugFromUrl ? `/${orgSlugFromUrl}` : '/';

    return (
      <div className="min-h-dvh w-full bg-surface flex flex-col px-4">
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center text-center max-w-md">
            <div
              aria-hidden="true"
              className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted text-foreground"
            >
              <Mail className="size-6" strokeWidth={2.5} />
            </div>
            <h1 className="mb-3 text-3xl font-medium text-foreground">
              Sjekk e-posten din
            </h1>
            <p className="mb-8 text-base text-foreground-muted">
              Vi fant ingen bekreftelse her – sjekk e-posten din for kvittering.
            </p>
            <Button asChild variant="default">
              <Link to={fallbackStudioUrl}>Tilbake</Link>
            </Button>
          </div>
        </div>
        <BrandFooter />
      </div>
    );
  }

  // Direction A ("kvittering i kortet", 2026-07-20): the receipt continues the
  // checkout's own shell — same 568px column, no StorefrontHeader, and the
  // same PublicCard with the course as its header band. The card the buyer
  // just filled in "answers" with the receipt.
  return (
    <div className="min-h-dvh w-full bg-background text-foreground flex flex-col">
      <main className="mx-auto w-full max-w-[568px] px-4 pt-12 pb-16 sm:px-6 md:pt-20">
        <div className="w-full">
          {(() => {
            const dateLong = formatDate(displaySignup?.course.startDate ?? null);
            const time = extractTimeFromSchedule(displaySignup?.course.timeSchedule)?.time ?? null;
            const courseImage = displaySignup?.course.imageUrl ?? null;
            const isFree = displaySignup ? displaySignup.amountPaid === 0 : isFreeSignup;
            const bookedAt = displaySignup?.createdAt ? new Date(displaySignup.createdAt) : new Date();
            const whenLine = [dateLong, time ? `kl. ${time}` : null].filter(Boolean).join(' ');

            const directionsHref = displaySignup?.course.location
              ? directionsUrl({
                  label: displaySignup.course.location,
                  address: displaySignup.course.location,
                  lat: displaySignup.course.locationLat,
                  lon: displaySignup.course.locationLon,
                  placeId: displaySignup.course.locationPlaceId,
                })
              : null;

            return (
              <>
                  {/* Title block — neutral circle + green check, centered heading.
                      One-time first-success moment: a restrained staggered
                      entrance (circle → heading/subtext → course pane). */}
                  <div className="flex flex-col items-center text-center">
                    <div
                      aria-hidden="true"
                      className="flex size-12 items-center justify-center rounded-full bg-success-subtle text-success animate-in fade-in-0 zoom-in-95 duration-300"
                    >
                      <Check className="size-6" strokeWidth={2.5} />
                    </div>
                    <h1 className="mt-4 text-3xl font-medium text-foreground animate-in fade-in-0 slide-in-from-bottom-1 duration-300 delay-80 fill-mode-backwards">Du er påmeldt</h1>
                    <p className="mt-2 text-base text-foreground-muted animate-in fade-in-0 slide-in-from-bottom-1 duration-300 delay-80 fill-mode-backwards">
                      {displaySignup
                        ? `Vi har sendt en bekreftelse til ${displaySignup.participantEmail}.`
                        : 'Vi har sendt en bekreftelse til e-posten din.'}
                    </p>
                  </div>

                  {displaySignup && (
                    <>
                      {/* Receipt card — the same PublicCard grammar as checkout:
                          course band on bg-muted, receipt content in the body. */}
                      <PublicCard
                        className="mt-8 animate-in fade-in-0 slide-in-from-bottom-1 duration-300 delay-160 fill-mode-backwards"
                        header={
                          <>
                            {courseImage && <ReceiptThumb src={courseImage} />}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">{displaySignup.course.title}</p>
                              {whenLine && (
                                <p className="truncate text-xs text-foreground tabular-nums">{whenLine}</p>
                              )}
                            </div>
                          </>
                        }
                      >
                        {/* Receipt rows — one label/value rule on every line.
                            Sted doubles as the directions link when we can
                            build one (azure = inline links). */}
                        <div className="space-y-2.5 text-sm">
                          {displaySignup.course.location && (
                            <div className="flex items-start justify-between gap-4">
                              <span className="text-foreground-muted">Sted</span>
                              {directionsHref ? (
                                <a
                                  href={directionsHref}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="focus-ring inline-flex items-center gap-1 rounded text-right font-medium text-primary underline-offset-4 hover:underline"
                                >
                                  {displaySignup.course.location}
                                  <ArrowUpRight className="size-3.5 shrink-0" strokeWidth={1.75} />
                                </a>
                              ) : (
                                <span className="text-right font-medium text-foreground">{displaySignup.course.location}</span>
                              )}
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-foreground-muted">Påmeldt</span>
                            <span className="font-medium text-foreground">{formatBookingDate(bookedAt)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-foreground-muted">{isFree ? 'Pris' : 'Betalt'}</span>
                            <span className="font-medium text-foreground tabular-nums">
                              {isFree ? 'Gratis' : formatKroner(displaySignup.amountPaid)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-foreground-muted">Referanse</span>
                            <span className="font-medium text-foreground tabular-nums">{shortRef(displaySignup.id)}</span>
                          </div>
                        </div>
                      </PublicCard>
                    </>
                  )}
              </>
            );
          })()}
        </div>
      </main>
      <BrandFooter />
    </div>
  );
};

/** Course thumb in the receipt card's header band — same size-9 anatomy as the
 * checkout band. Reflow, never a placeholder (PR #225 rule): with no image the
 * band renders text-only, and a failed load removes the thumb entirely. */
function ReceiptThumb({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <div className="size-9 shrink-0 overflow-hidden rounded-lg bg-background">
      <img
        src={src}
        alt=""
        className="media-outline size-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export default CheckoutSuccessPage;

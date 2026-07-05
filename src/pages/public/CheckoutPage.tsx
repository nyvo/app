import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FieldError } from '@/components/ui/field-error';
import { PageState } from '@/components/page-state/page-state';
import { Elements, PaymentElement, useStripe as useStripeHook, useElements } from '@stripe/react-stripe-js';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import { ChevronLeft, Check } from '@/lib/icons';
import { formatKroner, formatPersonName, isValidEmail, isValidPhone, cn } from '@/lib/utils';
import { calculateServiceFee } from '@/lib/pricing';
import { friendlyError } from '@/lib/error-messages';
import { fetchPublicCourseBySlug, resolveCourseImage, singleDayCount, type PublicCourseWithDetails } from '@/services/publicCourses';
import { createStripeSession } from '@/services/checkout';
import { createFreeSignup } from '@/services/signups';
import { supabase } from '@/lib/supabase';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { osloNowKey, toLocalDate } from '@/utils/dateUtils';
import type { AvailableTicketType } from '@/types/database';

interface FormState {
  name: string;
  email: string;
  phone: string;
  note: string;
  terms: boolean;
}

/**
 * Combined checkout page: kontaktinfo + betaling on one route. Replaces the
 * BookingPanel step-1 / step-2 split. The Stripe Elements block loads lazily
 * once the form is valid + a tier is selected; selecting a different tier via
 * "Endre" destroys the existing session and re-creates with the new one.
 */
const CheckoutPage = () => {
  useDocumentTitle('Påmelding');
  const { slug, courseSlug } = useParams<{ slug: string; courseSlug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ name: '', email: '', phone: '', note: '', terms: false });
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  // Two-step in-place flow: 'contact' shows the kontaktinfo form, 'payment'
  // swaps that block for the live Stripe Elements block. No route change.
  const [step, setStep] = useState<'contact' | 'payment'>('contact');

  // ── Load course + tiers ────────────────────────────────────────────────
  // One query owns the load; redirect decisions come back as data and are
  // performed by the effect below (queryFn stays side-effect-free). A failed
  // tier fetch throws → retryable server-error page instead of a silently
  // disabled submit button.
  type CheckoutData =
    | { kind: 'redirect'; ownerSlug: string }
    | { kind: 'not-found' }
    | { kind: 'ok'; course: PublicCourseWithDetails; tiers: AvailableTicketType[] };

  const checkoutQuery = useQuery({
    queryKey: ['checkout', slug, courseSlug],
    enabled: !!slug && !!courseSlug,
    queryFn: async (): Promise<CheckoutData> => {
      const { data: courseData, error: courseErr } = await fetchPublicCourseBySlug(slug!, courseSlug!);
      if (courseErr || !courseData) return { kind: 'not-found' };

      const ownerSlug = courseData.seller?.slug;
      if (ownerSlug && ownerSlug !== slug) {
        return { kind: 'redirect', ownerSlug };
      }

      // Load all standard-audience tiers via public RPC.
      const { data: tierData, error: tierErr } = await supabase.rpc('available_ticket_types', {
        p_course_id: courseData.id,
      });
      if (tierErr) throw tierErr;
      const allTiers = ((tierData ?? []) as AvailableTicketType[]).filter(
        (t) => t.audience === 'standard',
      );
      return { kind: 'ok', course: courseData, tiers: allTiers };
    },
  });

  useEffect(() => {
    if (checkoutQuery.data?.kind !== 'redirect') return;
    const query = searchParams.toString();
    navigate(
      `/${checkoutQuery.data.ownerSlug}/${courseSlug}/pamelding${query ? `?${query}` : ''}`,
      { replace: true },
    );
  }, [checkoutQuery.data, courseSlug, searchParams, navigate]);

  const course = checkoutQuery.data?.kind === 'ok' ? checkoutQuery.data.course : null;
  const tiers = useMemo(
    () => (checkoutQuery.data?.kind === 'ok' ? checkoutQuery.data.tiers : []),
    [checkoutQuery.data],
  );
  const loading = checkoutQuery.isPending || checkoutQuery.data?.kind === 'redirect';
  const error = !slug || !courseSlug || checkoutQuery.data?.kind === 'not-found'
    ? 'not-found'
    : checkoutQuery.isError
      ? 'load-failed'
      : null;

  // Honour ?billett= from the detail-page rail once tiers arrive. "main" →
  // primary tier (first non-drop-in), "drop-in" → drop-in tier. Fall back to
  // the primary tier when missing/invalid. Runs once (selectedTierId guard),
  // so a background refetch never clobbers the buyer's own selection.
  useEffect(() => {
    if (selectedTierId !== null || tiers.length === 0) return;
    const requested = searchParams.get('billett');
    const dropIn = tiers.find((t) => t.ticket_kind === 'drop_in');
    const main =
      tiers.find((t) => t.is_default && t.ticket_kind !== 'drop_in')
      ?? tiers.find((t) => t.ticket_kind !== 'drop_in')
      ?? tiers[0];

    let initial: AvailableTicketType | undefined;
    if (requested === 'drop-in' && dropIn) initial = dropIn;
    else if (requested === 'main' && main) initial = main;
    else initial = main ?? tiers[0];
    setSelectedTierId(initial?.id ?? null);
  }, [tiers, searchParams, selectedTierId]);

  const isFree = !course?.price || course.price <= 0;
  const isCancelled = course?.status === 'cancelled';
  // Free signups need no payment rails; paid needs Stripe onboarding complete.
  const paymentReady =
    isFree || (course?.seller?.stripe_onboarding_complete ?? false);

  const selectedTier = tiers.find((t) => t.id === selectedTierId) ?? null;
  const isDropInSelected = selectedTier?.ticket_kind === 'drop_in';
  // Course-wide capacity gates the package tiers only. A drop-in occupies a
  // single class, so it stays purchasable while the NEXT session has room —
  // available_ticket_types gates its visibility per session and the edge
  // function enforces that capacity before authorizing payment.
  const isFull =
    course?.max_participants != null
    && course.spots_available <= 0
    && !isDropInSelected;

  // Drop-in flow: pick the next class automatically — the first session that
  // hasn't started yet. Same model as BookingPanel; no session picker.
  // undefined = loading / not applicable, null = no upcoming session.
  const [dropInSessionId, setDropInSessionId] = useState<string | null | undefined>(undefined);
  // Query failure is not "no sessions" — track it separately so the buyer
  // sees a retryable error instead of the false "ingen kommende timer".
  const [dropInLookupFailed, setDropInLookupFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setDropInLookupFailed(false);
    if (!isDropInSelected || !course?.id) {
      setDropInSessionId(undefined);
      return;
    }
    void (async () => {
      // Session rows store naive Norwegian local times — compare against "now"
      // in Europe/Oslo ("YYYY-MM-DD HH:mm:ss", lexically ordered).
      const osloNow = osloNowKey();
      const { data, error: sessionsErr } = await supabase
        .from('course_sessions')
        .select('id, session_date, start_time, status')
        .eq('course_id', course.id)
        .gte('session_date', osloNow.slice(0, 10))
        .neq('status', 'cancelled')
        .order('session_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(10);
      if (cancelled) return;
      if (sessionsErr) {
        setDropInSessionId(undefined);
        setDropInLookupFailed(true);
        return;
      }
      const next = (data as { id: string; session_date: string; start_time: string }[] | null)
        ?.find((s) => `${s.session_date} ${s.start_time}` > osloNow);
      setDropInSessionId(next?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [isDropInSelected, course?.id]);

  // ── Pricing ─────────────────────────────────────────────────────────────
  const tierPrice = selectedTier?.price ?? course?.price ?? 0;
  const fee = calculateServiceFee(tierPrice);
  const total = tierPrice + fee;

  // ── Form validity ───────────────────────────────────────────────────────
  const formValid =
    form.name.trim().length > 0
    && isValidEmail(form.email)
    && isValidPhone(form.phone)
    && form.terms
    && !!selectedTier
    // Drop-in needs a resolved next class before the buyer can continue.
    && (!isDropInSelected || typeof dropInSessionId === 'string');

  // Inline phone error, shown only after blur and only when the field holds
  // something that isn't a valid number — an empty field just keeps the
  // submit button disabled (matches the app's field-error pattern).
  const phoneError =
    phoneTouched && form.phone.trim().length > 0 && !isValidPhone(form.phone)
      ? 'Skriv inn et gyldig telefonnummer.'
      : null;

  // Client-side email format error (mirrors phone). The server-side
  // emailMessage (e.g. "already signed up") shares the same slot — the two
  // can't co-occur, since a malformed email never reaches the server.
  const emailFormatError =
    emailTouched && form.email.trim().length > 0 && !isValidEmail(form.email)
      ? 'Skriv inn en gyldig e-postadresse.'
      : null;
  const emailError = emailFormatError || emailMessage;

  // ── Stripe session state ─────────────────────────────────────────────────
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [stripeSession, setStripeSession] = useState<
    { clientSecret: string; paymentIntentId: string; attemptId: string; tierId: string } | null
  >(null);

  // ── Advance to payment step — validates against the server BEFORE advancing
  //    so a 409 or "fullt" stays on the form with the right error visible.
  async function handleAdvanceToPayment() {
    if (isFree || !course || !slug || !selectedTier || submitting) return;
    setSubmitting(true);
    setSessionError(null);
    setEmailMessage(null);

    // No client-side capacity pre-check: course-wide counts are wrong for
    // per-session capacity (drop-ins from past classes inflate them). The edge
    // function's soft check answers with the right inline error, and nothing is
    // authorized until the buyer confirms in the payment step.
    const sessionParams = {
      courseId: course.id,
      organizationSlug: slug,
      ticketTypeId: selectedTier.id,
      sessionId: isDropInSelected && typeof dropInSessionId === 'string' ? dropInSessionId : undefined,
      customerEmail: form.email.trim(),
      customerName: formatPersonName(form.name),
      customerPhone: form.phone.trim() || undefined,
      customerNote: form.note.trim() || undefined,
    };

    const { data, error: payErr, status } = await createStripeSession(sessionParams);
    if (payErr || !data) {
      // 4xx errors from the edge function are already user-friendly Norwegian.
      // 5xx / network / unknown fall through friendlyError.
      const isServerValidation = status >= 400 && status < 500;
      const msg = isServerValidation && payErr?.message
        ? payErr.message
        : friendlyError(payErr, 'Kunne ikke starte betaling. Prøv igjen.');
      if (status === 409) setEmailMessage(msg);
      else setSessionError(msg);
      setSubmitting(false);
      return;
    }

    setStripeSession({
      clientSecret: data.clientSecret,
      paymentIntentId: data.paymentIntentId,
      attemptId: data.attemptId,
      tierId: selectedTier.id,
    });
    setStep('payment');
    setSubmitting(false);
  }

  // ── Free signup submit ──────────────────────────────────────────────────
  async function handleFreeSubmit() {
    if (!course || !slug || submitting) return;
    setSubmitting(true);
    setEmailMessage(null);
    const { error: signupErr } = await createFreeSignup({
      courseId: course.id,
      participantName: formatPersonName(form.name),
      participantEmail: form.email.trim(),
      participantPhone: form.phone.trim() || undefined,
      participantNote: form.note.trim() || undefined,
    });
    if (signupErr) {
      toast.error(friendlyError(signupErr, 'Kunne ikke fullføre påmelding. Prøv igjen.'));
      setSubmitting(false);
      return;
    }
    window.location.href = `/checkout/success?free=true&org=${slug}`;
  }

  // ── States ──────────────────────────────────────────────────────────────
  if (loading) {
    return <CheckoutSkeleton />;
  }
  if (error === 'load-failed') {
    return <PageState variant="server-error" />;
  }
  if (error || !course) {
    return <PageState variant="public-course" />;
  }

  const backHref = `/${slug}/${courseSlug}`;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="flex w-full items-center justify-center px-4 py-8 sm:px-6">
        <Link to={`/${slug}`} className="flex select-none items-center">
          <span className="text-base font-medium text-foreground">Openspot</span>
        </Link>
      </header>
      <div className="mx-auto max-w-6xl w-full px-4 sm:px-6 lg:px-8 pb-16">
        <button
          type="button"
          onClick={() => {
            if (step === 'payment') {
              setStep('contact');
              setStripeSession(null);
              setSessionError(null);
            } else {
              navigate(backHref);
            }
          }}
          className="mb-8 px-2 sm:px-6 inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors cursor-pointer"
        >
          <ChevronLeft className="size-4" strokeWidth={1.75} />
          Tilbake
        </button>

        {isCancelled && (
          <Alert variant="warning" className="mb-8">
            <AlertDescription>Kurset er avlyst.</AlertDescription>
          </Alert>
        )}
        {!isCancelled && isFull && (
          <Alert variant="warning" className="mb-8">
            <AlertDescription>Kurset er fullt.</AlertDescription>
          </Alert>
        )}
        {!isCancelled && !isFull && !paymentReady && (
          <Alert variant="warning" className="mb-8">
            <AlertDescription>Påmelding åpner snart. Studioet fullfører oppsettet.</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1fr)_320px] md:gap-6 md:items-start lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
          <div className="space-y-6 max-w-[552px] min-w-0">
            {step === 'contact' || isFree ? (
              <>
                <CheckoutStepHeader step={1} showSteps={!isFree} />

                <div className="px-2 sm:px-6">
                  <div className="space-y-4">
                    <Field label="Navn" htmlFor="name">
                      <Input
                        id="name"
                        type="text"
                        autoComplete="name"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      />
                    </Field>
                    <Field label="E-post" htmlFor="email">
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        value={form.email}
                        onChange={(e) => {
                          setForm((f) => ({ ...f, email: e.target.value }));
                          if (emailMessage || sessionError) {
                            setEmailMessage(null);
                            setSessionError(null);
                          }
                        }}
                        onBlur={() => setEmailTouched(true)}
                        aria-invalid={!!emailError}
                        aria-describedby={emailError ? 'email-error' : undefined}
                        className={emailError ? 'border-danger bg-danger-subtle' : undefined}
                      />
                      {emailError && <FieldError id="email-error">{emailError}</FieldError>}
                    </Field>
                    <Field label="Telefon" htmlFor="phone">
                      <Input
                        id="phone"
                        type="tel"
                        autoComplete="tel"
                        value={form.phone}
                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                        onBlur={() => setPhoneTouched(true)}
                        aria-invalid={!!phoneError}
                        aria-describedby={phoneError ? 'phone-error' : undefined}
                        className={phoneError ? 'border-danger bg-danger-subtle' : undefined}
                      />
                      {phoneError && <FieldError id="phone-error">{phoneError}</FieldError>}
                    </Field>
                    <Field label="Melding (valgfritt)" htmlFor="note">
                      <Textarea
                        id="note"
                        value={form.note}
                        onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                        placeholder="Allergier, skader eller annet vi bør vite."
                        rows={4}
                      />
                    </Field>
                    <label className="flex items-start gap-3 cursor-pointer text-sm text-foreground pt-1">
                      <Checkbox
                        checked={form.terms}
                        onCheckedChange={(v) =>
                          setForm((f) => ({ ...f, terms: v === true }))
                        }
                        className="mt-0.5"
                      />
                      <span>
                        Jeg godtar{' '}
                        <Link
                          to="/terms"
                          className="underline decoration-foreground-disabled underline-offset-2 hover:decoration-foreground"
                        >
                          vilkår og angrerett
                        </Link>
                        .
                      </span>
                    </label>
                  </div>
                </div>

                <div className="px-2 sm:px-6 space-y-2">
                  {isFree ? (
                    <Button
                      className="w-full"
                      disabled={!formValid || submitting || !paymentReady || isFull || isCancelled}
                      onClick={handleFreeSubmit}
                    >
                      Bekreft påmelding
                    </Button>
                  ) : (
                    <>
                      <Button
                        className="w-full"
                        disabled={!formValid || submitting || !paymentReady || isFull || isCancelled}
                        onClick={handleAdvanceToPayment}
                      >
                        {submitting ? 'Et øyeblikk…' : 'Fortsett til betaling'}
                      </Button>
                      {sessionError && (
                        <p className="text-sm text-danger text-center">{sessionError}</p>
                      )}
                      {isDropInSelected && dropInLookupFailed && (
                        <p className="text-sm text-danger text-center">Kunne ikke hente neste time. Prøv igjen.</p>
                      )}
                      {isDropInSelected && dropInSessionId === null && (
                        <p className="text-sm text-danger text-center">Ingen kommende timer for drop-in.</p>
                      )}
                      {course.seller?.name && (
                        <p className="text-sm text-foreground-muted text-center">
                          Påmeldingen er hos {course.seller.name}.
                        </p>
                      )}
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <CheckoutStepHeader step={2} />

                <div id="payment" className="scroll-mt-6">
                  <StripeEmbed
                    clientSecret={stripeSession?.clientSecret ?? null}
                    total={total}
                    errorMessage={sessionError}
                    returnUrl={`${window.location.origin}/checkout/success?ref=${encodeURIComponent(stripeSession?.attemptId ?? '')}&org=${slug}`}
                  />
                </div>
              </>
            )}
          </div>

          <aside>
            <div className="md:sticky md:top-10">
              <CheckoutSummary
                course={course}
                selectedTier={selectedTier}
                subtotal={tierPrice}
                fee={fee}
                total={total}
                isFree={isFree}
              />
            </div>
          </aside>
        </div>
      </div>

    </div>
  );
};

// ── Sub-components ───────────────────────────────────────────────────────

const CHECKOUT_STEPS = ['Kontakt', 'Betaling'] as const;

/** Visual progress for the two in-checkout stages: the Kontakt form (1) and
 * the Betaling block (2). Ticket choice happened on the course page and isn't
 * counted — a single-class booking shouldn't read as a 3-step funnel.
 * Free signups have no Betaling stage at all → `showSteps=false`
 * renders just the title. */
function CheckoutStepHeader({ step, showSteps = true }: { step: 1 | 2; showSteps?: boolean }) {
  const currentIndex = step - 1;
  if (!showSteps) {
    return (
      <div className="px-2 sm:px-6">
        <h1 className="text-base font-medium text-foreground">Påmelding</h1>
      </div>
    );
  }
  return (
    <div className="px-2 sm:px-6">
      <h1 className="text-base font-medium text-foreground">Påmelding</h1>
      <ol className="mt-4 flex items-center">
        {CHECKOUT_STEPS.map((label, i) => {
          const done = i < currentIndex;
          const current = i === currentIndex;
          const isLast = i === CHECKOUT_STEPS.length - 1;
          return (
            <li key={label} className={cn('flex items-center', !isLast && 'flex-1')}>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums transition-colors',
                    done && 'bg-primary text-primary-foreground',
                    current && 'bg-primary text-primary-foreground ring-4 ring-selection-light',
                    !done && !current && 'border border-border text-foreground-muted',
                  )}
                >
                  {done ? <Check className="size-3.5" strokeWidth={2.5} /> : i + 1}
                </span>
                <span
                  className={cn(
                    'whitespace-nowrap text-xs sm:text-sm',
                    current
                      ? 'font-medium text-foreground'
                      : done
                        ? 'text-foreground'
                        : 'text-foreground-muted',
                  )}
                >
                  {label}
                </span>
              </div>
              {!isLast && (
                <span
                  aria-hidden
                  className={cn('mx-2 h-px flex-1 sm:mx-3', done ? 'bg-primary' : 'bg-border')}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * Stripe Elements payment block. Mounts the PaymentElement once the PaymentIntent client secret
 * is available; the "Betal" button confirms and Stripe redirects to `returnUrl`. With manual
 * capture the authorization redirects as redirect_status=succeeded — capture happens server-side
 * in stripe-connect-webhook.
 */
function StripeEmbed({
  clientSecret,
  total,
  returnUrl,
  errorMessage,
}: {
  clientSecret: string | null;
  total: number;
  returnUrl: string;
  errorMessage: string | null;
}) {
  // Missing publishable key — surface a clear error instead of an Elements
  // provider that never mounts (buyer would otherwise stare at a forever-skeleton).
  if (!isStripeConfigured) {
    return (
      <Alert variant="error">
        <AlertDescription>
          Betaling er ikke tilgjengelig akkurat nå. Prøv igjen senere eller kontakt studioet.
        </AlertDescription>
      </Alert>
    );
  }

  if (errorMessage) {
    return (
      <Alert variant="error">
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
    );
  }

  if (!clientSecret) {
    return (
      <div className="rounded-xl border border-card bg-surface p-5">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full mt-3" />
        <Skeleton className="h-11 w-full mt-4 rounded-full" />
      </div>
    );
  }

  return (
    <Elements
      stripe={getStripe()}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: { fontFamily: 'system-ui, sans-serif', borderRadius: '6px' },
        },
      }}
    >
      <StripePaymentForm total={total} returnUrl={returnUrl} />
    </Elements>
  );
}

function StripePaymentForm({ total, returnUrl }: { total: number; returnUrl: string }) {
  const stripe = useStripeHook();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setErrorMsg(null);
    // On success Stripe redirects to returnUrl; we only reach past this on an immediate
    // validation/decline error.
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    });
    if (error) {
      setErrorMsg(friendlyError(error, 'Betalingen kunne ikke fullføres. Prøv igjen.'));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement />
      {errorMsg && <p className="text-sm text-danger">{errorMsg}</p>}
      <Button type="submit" className="w-full" loading={submitting} disabled={!stripe || !elements}>
        {`Betal ${formatKroner(total)}`}
      </Button>
    </form>
  );
}

function CheckoutSummary({
  course,
  selectedTier,
  subtotal,
  fee,
  total,
  isFree,
}: {
  course: PublicCourseWithDetails;
  selectedTier: AvailableTicketType | null;
  subtotal: number;
  fee: number;
  total: number;
  isFree: boolean;
}) {
  const meta = buildMeta(course);
  const img = resolveCourseImage(course);

  return (
    <div className="overflow-hidden rounded-2xl border border-card bg-surface shadow-soft">
      <div className="p-5 space-y-5">
        {/* Course header — thumbnail + identity, so the buyer can see what
            they're paying for, like Airbnb/Expedia checkout summaries. */}
        <div className="flex gap-3">
          {img && (
            <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
              <img src={img} alt="" className="size-full object-cover" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm text-foreground-muted">{course.seller?.name}</p>
            <h3 className="mt-0.5 text-base font-medium text-foreground">
              {course.title}
            </h3>
            {meta && (
              <p className="mt-1 text-sm text-foreground-muted">{meta}</p>
            )}
          </div>
        </div>

        {selectedTier && (
          <>
            <div className="border-t border-border" />
            {!isFree && (
              <>
                <div className="space-y-2 text-base">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-foreground-muted">{selectedTier.label}</span>
                    <span className="tabular-nums text-foreground-muted">
                      {formatKroner(subtotal)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-foreground-muted">Tjenestegebyr</span>
                    <span className="tabular-nums text-foreground-muted">
                      {formatKroner(fee)}
                    </span>
                  </div>
                </div>
                <div className="border-t border-border" />
              </>
            )}
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-base font-medium text-foreground">Totalt</span>
              <span className="text-xl font-medium tabular-nums text-foreground">
                {formatKroner(total)}
              </span>
            </div>
          </>
        )}

        {!isFree && (
          <div className="border-t border-border pt-4">
            <p className="text-center text-xs text-foreground-muted">Sikker betaling</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="flex w-full items-center justify-center px-4 py-8 sm:px-6">
        <span className="text-base font-medium text-foreground">Openspot</span>
      </header>
      <div className="mx-auto max-w-6xl w-full px-4 sm:px-6 lg:px-8 pb-16">
        <Skeleton className="mb-8 h-4 w-32" />
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1fr)_320px] md:gap-6 md:items-start lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
          <div className="space-y-6 max-w-[552px]">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-44 w-full rounded-xl" />
          </div>
          <Skeleton className="hidden md:block h-72 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────

const SHORT_WEEKDAYS = ['søn.', 'man.', 'tir.', 'ons.', 'tor.', 'fre.', 'lør.'] as const;

function buildMeta(course: PublicCourseWithDetails): string | null {
  const isMultiDaySingle = course.format === 'single' && singleDayCount(course) > 1;
  const typeLabel =
    course.delivery_mode === 'online' ? 'Nettkurs'
    : course.format === 'series' ? 'Kursrekke'
    : isMultiDaySingle ? 'Kurs'
    : 'Enkelttime';
  const m = course.time_schedule?.match(/(\d{1,2}:\d{2})/);
  const time = m ? m[1] : null;
  const dateStr = course.next_session?.session_date ?? course.start_date;
  if (course.format === 'series' && dateStr && time) {
    // toLocalDate: `new Date('YYYY-MM-DD')` parses as UTC midnight, showing
    // the wrong weekday for any buyer in a timezone west of UTC.
    const d = toLocalDate(dateStr);
    if (!isNaN(d.getTime())) {
      return `${typeLabel} · ${SHORT_WEEKDAYS[d.getDay()]} kl. ${time}`;
    }
  }
  if (time) return `${typeLabel} · kl. ${time}`;
  return typeLabel;
}

export default CheckoutPage;

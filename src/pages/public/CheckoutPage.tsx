import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FieldError } from '@/components/ui/field-error';
import { PageState } from '@/components/page-state/page-state';
import { DelayedFallback } from '@/components/ui/delayed-fallback';
import { Elements, PaymentElement, useStripe as useStripeHook, useElements } from '@stripe/react-stripe-js';
import type { Stripe } from '@stripe/stripe-js';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import { withTimeout } from '@/lib/with-timeout';
import { ChevronLeft, Check, Lock } from '@/lib/icons';
import { formatCoursePrice, formatKroner, formatPersonName, isValidEmail, isValidPhone, cn } from '@/lib/utils';
import { calculateServiceFee } from '@/lib/pricing';
import { friendlyError } from '@/lib/error-messages';
import { fetchPublicCourseBySlug, resolveCourseImage, singleDayCount, type PublicCourseWithDetails } from '@/services/publicCourses';
import { createStripeSession } from '@/services/checkout';
import { createFreeSignup } from '@/services/signups';
import { saveFreeReceipt, maskEmail } from '@/lib/free-receipt';
import { supabase } from '@/lib/supabase';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { osloNowKey, toLocalDate } from '@/utils/dateUtils';
import { SegmentedTabs } from '@/components/teacher/SegmentedTabs';
import type { TicketId } from '@/components/public/course-details/BookingRailLite';
import { buildMainTierConstraintLabel, buildNextSessionLabel } from '@/components/public/course-details/schedule-format';
import type { AvailableTicketType } from '@/types/database';

interface FormState {
  name: string;
  email: string;
  phone: string;
  note: string;
  terms: boolean;
}

/**
 * The free-signup edge function (create-free-signup) rejects any course with
 * price > 0 and only ever enrolls the course's default tier — a paid course
 * can't be "freed" by picking a zero-price add-on tier. So both the resolved
 * tier price AND the course price itself must be zero before this page can
 * route to the no-payment flow. Exported so the free/paid branch decision is
 * unit-testable independently of the page. The server keeps its own guard.
 */
export function deriveIsFree(
  tierPrice: number | null | undefined,
  coursePrice: number | null | undefined,
): boolean {
  return (tierPrice ?? coursePrice ?? 0) === 0 && coursePrice === 0;
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
  const [attempted, setAttempted] = useState(false);
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
      // A query/network failure is retryable — throw so the load-failed branch
      // renders server-error. Only a null row (error === null) is not-found.
      if (courseErr) throw courseErr;
      if (!courseData) return { kind: 'not-found' };

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

  const isCancelled = course?.status === 'cancelled';

  const selectedTier = tiers.find((t) => t.id === selectedTierId) ?? null;

  // ── Pricing ─────────────────────────────────────────────────────────────
  const tierPrice = selectedTier?.price ?? course?.price ?? 0;
  const fee = calculateServiceFee(tierPrice);
  const total = tierPrice + fee;

  // Strict semantics (see deriveIsFree): both the selected tier AND the course
  // itself must be free before this page can route to the no-payment flow.
  const isFree = deriveIsFree(selectedTier?.price, course?.price);
  // Free signups need no payment rails; paid needs Stripe onboarding complete.
  const paymentReady =
    isFree || (course?.seller?.stripe_onboarding_complete ?? false);

  const isDropInSelected = selectedTier?.ticket_kind === 'drop_in';
  // Course-wide capacity gates the package tiers only. A drop-in occupies a
  // single class, so it stays purchasable while the NEXT session has room —
  // available_ticket_types gates its visibility per session and the edge
  // function enforces that capacity before authorizing payment.
  const isFull =
    course?.max_participants != null
    && course.spots_available <= 0
    && !isDropInSelected;

  // No sellable tiers on a paid course (started, no late signups, no drop-in) —
  // mirror the rail's "Påmelding stengt": show a warning instead of a working-
  // looking form whose pay button silently no-ops on the missing tier. Free
  // courses use the tier-less free path; full courses get their own alert.
  const closed = !isFree && !isFull && tiers.length === 0;

  // Drop-in flow: pick the next class automatically — the first session that
  // hasn't started yet. Same model as BookingPanel; no session picker.
  // undefined = loading / not applicable, null = no upcoming session.
  const [dropInSessionId, setDropInSessionId] = useState<string | null | undefined>(undefined);
  // Same lookup's date/time — feeds the Billett constraint line ("Neste økt:
  // …"). Kept alongside dropInSessionId rather than re-fetched, since the
  // query already selects session_date/start_time.
  const [dropInNextSession, setDropInNextSession] = useState<
    { session_date: string; start_time: string } | null | undefined
  >(undefined);
  // Query failure is not "no sessions" — track it separately so the buyer
  // sees a retryable error instead of the false "ingen kommende timer".
  const [dropInLookupFailed, setDropInLookupFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setDropInLookupFailed(false);
    if (!isDropInSelected || !course?.id) {
      setDropInSessionId(undefined);
      setDropInNextSession(undefined);
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
        setDropInNextSession(undefined);
        setDropInLookupFailed(true);
        return;
      }
      const next = (data as { id: string; session_date: string; start_time: string }[] | null)
        ?.find((s) => `${s.session_date} ${s.start_time}` > osloNow);
      setDropInSessionId(next?.id ?? null);
      setDropInNextSession(next ? { session_date: next.session_date, start_time: next.start_time } : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [isDropInSelected, course?.id]);

  // Drop-in's next-class lookup is still in flight — the buyer can't continue
  // until it resolves, so show a loading button rather than a dead click.
  const dropInResolving = isDropInSelected && dropInSessionId === undefined;

  // ── Billett toggle ───────────────────────────────────────────────────────
  // Only rendered when there's a real choice — main + drop-in. A single-tier
  // course skips this section entirely; the receipt already names what's
  // being bought.
  const mainTier = tiers.find((t) => t.ticket_kind !== 'drop_in') ?? null;
  const dropInTier = tiers.find((t) => t.ticket_kind === 'drop_in') ?? null;
  const showBillett = tiers.length === 2 && !!mainTier && !!dropInTier;
  const billettSpotsLeft = course?.spots_available ?? 0;
  const billettLowStock = billettSpotsLeft > 0 && billettSpotsLeft <= 3;
  const billettConstraintLabel = isDropInSelected
    ? (dropInResolving ? null : buildNextSessionLabel(dropInNextSession ?? null))
    : course && mainTier
      ? buildMainTierConstraintLabel(course, mainTier)
      : null;

  // ── Form validation ─────────────────────────────────────────────────────
  // Blur shows format errors on non-empty fields; a failed submit attempt
  // (`attempted`) surfaces every invalid field, empty ones included.
  const nameError =
    attempted && form.name.trim().length === 0 ? 'Skriv inn navnet ditt.' : null;

  const phoneError =
    !isValidPhone(form.phone) && (attempted || (phoneTouched && form.phone.trim().length > 0))
      ? 'Skriv inn et gyldig telefonnummer.'
      : null;

  // Client-side email format error (mirrors phone). The server-side
  // emailMessage (e.g. "already signed up") shares the same slot — the two
  // can't co-occur, since a malformed email never reaches the server.
  const emailFormatError =
    !isValidEmail(form.email.trim()) && (attempted || (emailTouched && form.email.trim().length > 0))
      ? 'Skriv inn en gyldig e-postadresse.'
      : null;
  const emailError = emailFormatError || emailMessage;

  const termsError = attempted && !form.terms ? 'Du må godta vilkårene.' : null;

  // ── Stripe session state ─────────────────────────────────────────────────
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [stripeSession, setStripeSession] = useState<
    { clientSecret: string; paymentIntentId: string; attemptId: string; tierId: string } | null
  >(null);

  // ── Advance to payment step — validates against the server BEFORE advancing
  //    so a 409 or "fullt" stays on the form with the right error visible.
  async function handleAdvanceToPayment() {
    if (isFree || !course || !slug || submitting) return;
    // No tier resolved to sell — should be unreachable (the closed state hides
    // the form) but never let the pay action be a silent no-op.
    if (!selectedTier) {
      setSessionError('Påmeldingen er stengt.');
      return;
    }
    // Drop-in needs a resolved next class before the buyer can continue.
    if (isDropInSelected && typeof dropInSessionId !== 'string') return;
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
    const { data, error: signupErr } = await createFreeSignup({
      courseId: course.id,
      participantName: formatPersonName(form.name),
      participantEmail: form.email.trim(),
      participantPhone: form.phone.trim() || undefined,
      participantNote: form.note.trim() || undefined,
    });
    if (signupErr || !data) {
      // Surface inline under the email field (like the paid path's 409) rather
      // than a toast — the dominant free-signup failure is "already signed up",
      // which belongs next to the email that caused it.
      setEmailMessage(friendlyError(signupErr, 'Kunne ikke fullføre påmelding. Prøv igjen.'));
      setSubmitting(false);
      return;
    }

    // Thread the course context through to the success page so it can render
    // the same recap pane as the paid path — see src/lib/free-receipt.ts for
    // why this travels via sessionStorage instead of a server-side lookup.
    saveFreeReceipt({
      signupId: data.signupId,
      courseId: course.id,
      courseTitle: course.title,
      startDate: course.next_session?.session_date ?? course.start_date ?? null,
      timeSchedule: course.time_schedule ?? null,
      durationMinutes: course.duration ?? null,
      location: course.location ?? null,
      locationLat: course.location_lat ?? null,
      locationLon: course.location_lon ?? null,
      locationPlaceId: course.location_place_id ?? null,
      imageUrl: resolveCourseImage(course),
      sellerName: course.seller?.name ?? '',
      sellerSlug: course.seller?.slug ?? slug,
      participantEmailMasked: maskEmail(form.email.trim()),
      createdAt: new Date().toISOString(),
    });

    navigate(`/checkout/success?free=true&org=${slug}&sid=${encodeURIComponent(data.signupId)}`);
  }

  // ── Contact-step submit — validate on attempt, focus the first invalid
  //    field, otherwise hand off to the free/paid flow.
  function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAttempted(true);
    const firstInvalid =
      form.name.trim().length === 0 ? 'name'
      : !isValidEmail(form.email.trim()) ? 'email'
      : !isValidPhone(form.phone) ? 'phone'
      : !form.terms ? 'terms'
      : null;
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus();
      return;
    }
    if (isFree) void handleFreeSubmit();
    else void handleAdvanceToPayment();
  }

  // ── States ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <DelayedFallback>
        <CheckoutSkeleton />
      </DelayedFallback>
    );
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
          className="focus-ring mb-8 rounded inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors cursor-pointer"
        >
          <ChevronLeft className="size-4" strokeWidth={1.75} />
          {step === 'payment' ? 'Tilbake' : 'Tilbake til kurset'}
        </button>

        {isCancelled && (
          <Alert variant="warning" className="mb-8">
            <AlertDescription>Kurset er avlyst.</AlertDescription>
          </Alert>
        )}
        {!isCancelled && closed && (
          <Alert variant="warning" className="mb-8">
            <AlertDescription>Påmeldingen er stengt. Kurset har startet.</AlertDescription>
          </Alert>
        )}
        {!isCancelled && !closed && isFull && (
          <Alert variant="warning" className="mb-8">
            <AlertDescription>Kurset er fullt.</AlertDescription>
          </Alert>
        )}
        {!isCancelled && !closed && !isFull && !paymentReady && (
          <Alert variant="warning" className="mb-8">
            <AlertDescription>Påmelding åpner snart. Studioet fullfører oppsettet.</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1fr)_320px] md:gap-8 md:items-start lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
          <div className="space-y-6 max-w-[552px] min-w-0">
            {!closed && showBillett && mainTier && dropInTier && (
              <BillettSection
                mainTier={mainTier}
                dropInTier={dropInTier}
                selectedKind={isDropInSelected ? 'drop-in' : 'main'}
                onSelect={(kind) => {
                  const tier = kind === 'drop-in' ? dropInTier : mainTier;
                  if (tier) setSelectedTierId(tier.id);
                }}
                constraintLabel={billettConstraintLabel}
                lowStock={billettLowStock}
                spotsLeft={billettSpotsLeft}
                disabled={step === 'payment'}
              />
            )}
            {closed ? null : step === 'contact' || isFree ? (
              <>
                <CheckoutStepHeader step={1} showSteps={!isFree} />

                {/* Mobile-only condensed summary — the full aside summary sits below
                    the fold on <md, so the buyer needs the course + total in view
                    before filling in the contact form. */}
                <div className="md:hidden">
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-panel px-4 py-3">
                    <span className="truncate text-sm font-medium text-foreground">{course.title}</span>
                    <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                      {formatCoursePrice(total)}
                    </span>
                  </div>
                </div>

                <form onSubmit={handleContactSubmit} noValidate className="space-y-6">
                  <div>
                    <div className="space-y-4">
                      <Field label="Navn" htmlFor="name">
                        <Input
                          id="name"
                          type="text"
                          autoComplete="name"
                          value={form.name}
                          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                          aria-invalid={!!nameError}
                          aria-describedby={nameError ? 'name-error' : undefined}
                        />
                        {nameError && <FieldError id="name-error">{nameError}</FieldError>}
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
                      <div>
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id="terms"
                            checked={form.terms}
                            onCheckedChange={(v) =>
                              setForm((f) => ({ ...f, terms: v === true }))
                            }
                            aria-invalid={!!termsError}
                            aria-describedby={termsError ? 'terms-error' : undefined}
                            className="mt-0.5"
                          />
                          {/* The link is a SIBLING of the label, not a descendant — clicking
                              it must open /terms, not toggle the checkbox. */}
                          <p className="text-sm text-foreground">
                            <label htmlFor="terms" className="cursor-pointer">Jeg godtar</label>{' '}
                            <a
                              href="/terms"
                              target="_blank"
                              rel="noreferrer"
                              className="focus-ring rounded underline decoration-foreground-disabled underline-offset-2 hover:decoration-foreground"
                            >
                              vilkår og angrerett
                            </a>
                            .
                          </p>
                        </div>
                        {termsError && (
                          <FieldError id="terms-error" className="pl-7">{termsError}</FieldError>
                        )}
                        <p className="mt-2 pl-7 text-xs text-foreground-muted">
                          Kurs med fastsatt dato er unntatt angrerett. Se vilkårene.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {isFree ? (
                      <Button
                        type="submit"
                        className="w-full"
                        loading={submitting}
                        disabled={!paymentReady || isFull || isCancelled}
                      >
                        Bekreft påmelding
                      </Button>
                    ) : (
                      <>
                        <Button
                          type="submit"
                          className="w-full"
                          loading={submitting || dropInResolving}
                          loadingText="Et øyeblikk…"
                          disabled={!paymentReady || isFull || isCancelled}
                        >
                          Fortsett til betaling
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
                </form>
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
      <div>
        <h1 className="text-base font-medium text-foreground">Fullfør påmeldingen</h1>
      </div>
    );
  }
  return (
    <div>
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
                    // Progress is chrome → near-black fills; azure stays on
                    // links/selected tints (the current-step halo keeps the
                    // selection-light ring as its semantic accent).
                    'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums transition-colors',
                    done && 'bg-foreground text-background',
                    current && 'bg-foreground text-background ring-4 ring-selection-light',
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
                  className={cn('mx-2 h-px flex-1 sm:mx-3', done ? 'bg-foreground' : 'bg-border')}
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
    <div className="space-y-2">
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
  // Resolve the Stripe.js instance ourselves (with a timeout) rather than
  // handing the raw promise to <Elements>: a blocked/slow script (ad blocker,
  // offline) would otherwise leave the provider in a forever-loading state.
  // getStripe() memoizes loadStripe app-wide, so this is cheap on remount.
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [stripeFailed, setStripeFailed] = useState(false);
  useEffect(() => {
    if (!isStripeConfigured) return;
    let cancelled = false;
    withTimeout(getStripe(), 10000, 'Stripe.js lastet ikke i tide')
      .then((s) => {
        if (cancelled) return;
        if (s) setStripe(s);
        else setStripeFailed(true);
      })
      .catch(() => {
        if (!cancelled) setStripeFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  // Stripe.js failed to load (blocked or timed out) — the payment form can
  // never mount, so stop the skeleton and tell the buyer how to recover.
  if (stripeFailed) {
    return (
      <Alert variant="error">
        <AlertDescription>
          Betalingen kunne ikke lastes. Slå av eventuelle annonseblokkere og last siden på nytt.
        </AlertDescription>
      </Alert>
    );
  }

  if (!clientSecret || !stripe) {
    return (
      <div className="rounded-xl bg-panel p-5">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full mt-3" />
        <Skeleton className="h-11 w-full mt-4 rounded-full" />
      </div>
    );
  }

  return (
    <Elements
      stripe={stripe}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            // Stripe loads its PaymentElement in a cross-origin iframe, so it
            // can't inherit the page's @font-face — 'Geist Variable' is
            // self-hosted with no public URL to pass via Stripe's `fonts`
            // config, so this falls back to system-ui in every browser.
            fontFamily: "'Geist Variable', system-ui, sans-serif",
            // Stripe's appearance API validates color strings and rejects
            // OKLCH in some versions — hardcoded to the resolved sRGB hex of
            // the matching src/index.css tokens rather than risk a silent
            // fallback to Stripe's default blue:
            //   colorPrimary → --primary   oklch(0.540 0.150 245) → #0074BF
            //   colorText    → --foreground (--neutral-12) oklch(0.185 0.004 250) → #111314
            //   colorDanger  → --danger (--red-11) oklch(0.540 0.170 25) → #BD3838
            colorPrimary: '#0074BF',
            colorText: '#111314',
            colorDanger: '#BD3838',
            borderRadius: '6px',
          },
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
      <p className="flex items-center justify-center gap-1.5 text-[12.5px] text-foreground-muted">
        <Lock className="size-[13px]" strokeWidth={2} aria-hidden="true" />
        Sikker betaling
      </p>
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

  // Started-course edge: the selected tier is the package, prorated down to
  // the remaining weeks. The receipt (not the tier label) carries the story —
  // ordinær pris, a named deduction, the result — so the buyer sees why the
  // total isn't the course's list price.
  const isProrated =
    !!selectedTier &&
    selectedTier.ticket_kind !== 'drop_in' &&
    course.total_weeks != null &&
    selectedTier.weeks < course.total_weeks;
  const heldCount = isProrated ? course.total_weeks! - selectedTier!.weeks : 0;
  const deduction = isProrated ? (course.price ?? 0) - subtotal : 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-card bg-surface shadow-soft">
      <div className="p-6 space-y-5">
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
            <h2 className="mt-0.5 text-base font-medium text-foreground">
              {course.title}
            </h2>
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
                <div className="space-y-2.5 text-base">
                  {isProrated ? (
                    <>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-foreground-muted">{selectedTier.label}, ordinær pris</span>
                        <span className="tabular-nums text-foreground-muted">
                          {formatKroner(course.price ?? 0)}
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-foreground-muted">
                          Fratrekk for {heldCount} holdte {heldCount === 1 ? 'økt' : 'økter'}
                        </span>
                        <span className="tabular-nums text-success">
                          −{formatKroner(deduction)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-foreground-muted">{selectedTier.label}</span>
                      <span className="tabular-nums text-foreground-muted">
                        {formatKroner(subtotal)}
                      </span>
                    </div>
                  )}
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
            <div className="space-y-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-base font-medium text-foreground">Totalt</span>
                <span className="text-xl font-medium tabular-nums text-foreground">
                  {formatCoursePrice(total)}
                </span>
              </div>
              {!isFree && (
                <p className="text-xs text-foreground-muted">Ingen mva. kommer i tillegg.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Billett toggle — the prebuilt SegmentedTabs radiogroup, above the contact
 * form. Only rendered when there's a real choice (main + drop-in); a
 * single-tier course skips this section entirely. Locked (disabled) once
 * the payment step has a live PaymentIntent, so the tier can't change under
 * a Stripe session that was created for a different price.
 */
function BillettSection({
  mainTier,
  dropInTier,
  selectedKind,
  onSelect,
  constraintLabel,
  lowStock,
  spotsLeft,
  disabled,
}: {
  mainTier: AvailableTicketType;
  dropInTier: AvailableTicketType;
  selectedKind: TicketId;
  onSelect: (kind: TicketId) => void;
  constraintLabel: string | null;
  lowStock: boolean;
  spotsLeft: number;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground">Billett</span>
        {lowStock && (
          <span className="text-[13px] text-warning">
            {spotsLeft} {spotsLeft === 1 ? 'plass' : 'plasser'} igjen
          </span>
        )}
      </div>
      <SegmentedTabs<TicketId>
        role="radiogroup"
        ariaLabel="Billett"
        stretch
        size="lg"
        disabled={disabled}
        value={selectedKind}
        onChange={onSelect}
        tabs={[
          { key: 'main', label: mainTier.label },
          { key: 'drop-in', label: dropInTier.label },
        ]}
      />
      {constraintLabel && (
        <p className="text-[13.5px] text-foreground-muted">{constraintLabel}</p>
      )}
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
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1fr)_320px] md:gap-8 md:items-start lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
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

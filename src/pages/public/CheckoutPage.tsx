import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FieldError } from '@/components/ui/field-error';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { embedDinteroCheckout, type DinteroCheckoutInstance } from '@/lib/dintero';
import { ChevronLeft, ChevronDown, Lock } from '@/lib/icons';
import { formatKroner, formatPersonName, isValidEmail, isValidPhone, cn } from '@/lib/utils';
import { calculateServiceFee } from '@/lib/pricing';
import { friendlyError } from '@/lib/error-messages';
import { fetchPublicCourseBySlug, resolveCourseImage, singleDayCount, type PublicCourseWithDetails } from '@/services/publicCourses';
import { createDinteroSession } from '@/services/checkout';
import { createFreeSignup, createManualSignup, checkCourseAvailability } from '@/services/signups';
import { supabase } from '@/lib/supabase';
import type { AvailableTicketType } from '@/types/database';

interface FormState {
  name: string;
  email: string;
  phone: string;
  note: string;
  terms: boolean;
}

interface DinteroSessionRef {
  sid: string;
  merchantReference: string;
  tierId: string; // tracks which tier the session was created for
}

/**
 * Combined checkout page: kontaktinfo + betaling on one route. Replaces the
 * BookingPanel step-1 / step-2 split. The Dintero iframe loads lazily once
 * the form is valid + a tier is selected; selecting a different tier via
 * "Endre" destroys the existing session and re-creates with the new one.
 */
const CheckoutPage = () => {
  const { slug, courseSlug } = useParams<{ slug: string; courseSlug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState<PublicCourseWithDetails | null>(null);
  const [tiers, setTiers] = useState<AvailableTicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ name: '', email: '', phone: '', note: '', terms: false });
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  // Two-step in-place flow: 'contact' shows the kontaktinfo form, 'payment'
  // swaps that block for the live Dintero iframe. No route change.
  const [step, setStep] = useState<'contact' | 'payment'>('contact');
  // Below md the filled summary column is hidden, so a collapsible bar carries
  // the full summary (identity, date/time, price) — nothing dropped on tablet.
  const [summaryOpen, setSummaryOpen] = useState(false);

  // Load Inter font for the checkout surface only — needed to exact-match
  // Dintero's iframe typography on titles like "Kontaktinfo". Cleaned up
  // on unmount so the rest of the app continues using Geist.
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@600&display=swap';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // ── Load course + tiers ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    if (!slug || !courseSlug) {
      setError('not-found');
      setLoading(false);
      return;
    }
    void (async () => {
      const { data: courseData, error: courseErr } = await fetchPublicCourseBySlug(slug, courseSlug);
      if (cancelled) return;
      if (courseErr || !courseData) {
        setError('not-found');
        setLoading(false);
        return;
      }

      const ownerSlug = courseData.seller?.slug;
      if (ownerSlug && ownerSlug !== slug) {
        const query = searchParams.toString();
        navigate(
          `/${ownerSlug}/${courseSlug}/pamelding${query ? `?${query}` : ''}`,
          { replace: true },
        );
        return;
      }

      setCourse(courseData);

      // Load all standard-audience tiers via public RPC.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: tierData } = await (supabase.rpc as any)('available_ticket_types', {
        p_course_id: courseData.id,
      });
      if (cancelled) return;
      const allTiers = ((tierData ?? []) as AvailableTicketType[]).filter(
        (t) => t.audience === 'standard',
      );
      setTiers(allTiers);

      // Honour ?billett= from the detail-page rail. "main" → primary tier
      // (first non-drop-in), "drop-in" → drop-in tier. Fall back to the
      // primary tier when missing/invalid.
      const requested = searchParams.get('billett');
      const dropIn = allTiers.find((t) => t.ticket_kind === 'drop_in');
      const main =
        allTiers.find((t) => t.is_default && t.ticket_kind !== 'drop_in')
        ?? allTiers.find((t) => t.ticket_kind !== 'drop_in')
        ?? allTiers[0];

      let initial: AvailableTicketType | undefined;
      if (requested === 'drop-in' && dropIn) initial = dropIn;
      else if (requested === 'main' && main) initial = main;
      else initial = main ?? allTiers[0];
      setSelectedTierId(initial?.id ?? null);

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, courseSlug, searchParams, navigate]);

  const isFree = !course?.price || course.price <= 0;
  // Paid course on a seller without integrated payments → manual branch:
  // record the signup, no Dintero iframe, payment arranged with the studio.
  const isManual = !isFree && !(course?.seller?.uses_integrated_payments ?? false);
  const isCancelled = course?.status === 'cancelled';
  const isFull =
    course?.max_participants != null && course.spots_available <= 0;
  // Free and manual signups need no payment rails; integrated needs Dintero.
  const paymentReady =
    isFree || isManual || (course?.seller?.dintero_onboarding_complete ?? false);

  const selectedTier = tiers.find((t) => t.id === selectedTierId) ?? null;
  const isDropInSelected = selectedTier?.ticket_kind === 'drop_in';

  // Drop-in flow: honour the session the buyer picked on the course page
  // (?okt=<id>) when it's still a bookable upcoming session, otherwise fall
  // back to the next available one. The booking card pins a specific date, so
  // its selection must carry through here rather than being silently overridden.
  const requestedSessionId = searchParams.get('okt');
  const [dropInSessionId, setDropInSessionId] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!isDropInSelected || !course?.id) {
      setDropInSessionId(null);
      return;
    }
    void (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from('course_sessions')
        .select('id, session_date, start_time, status')
        .eq('course_id', course.id)
        .gte('session_date', today)
        .neq('status', 'cancelled')
        .order('session_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(50);
      if (cancelled) return;
      const rows = (data as { id: string }[] | null) ?? [];
      const requested = requestedSessionId
        ? rows.find((r) => r.id === requestedSessionId)
        : undefined;
      setDropInSessionId(requested?.id ?? rows[0]?.id ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [isDropInSelected, course?.id, requestedSessionId]);

  // ── Pricing ─────────────────────────────────────────────────────────────
  // No service fee on manual courses — the platform isn't in the money flow.
  const tierPrice = selectedTier?.price ?? course?.price ?? 0;
  const fee = isManual ? 0 : calculateServiceFee(tierPrice);
  const total = tierPrice + fee;

  // ── Form validity ───────────────────────────────────────────────────────
  const formValid =
    form.name.trim().length > 0
    && isValidEmail(form.email)
    && isValidPhone(form.phone)
    && form.terms
    && !!selectedTier;

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

  // ── Dintero session creation, triggered by the "Fortsett til betaling"
  //    click handler below. Living in a handler (vs useEffect on step change)
  //    lets us validate against the server BEFORE advancing the step — a 409
  //    or "fullt" stays the user on the form with the right error visible.
  const [session, setSession] = useState<DinteroSessionRef | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  async function handleAdvanceToPayment() {
    if (isFree || isManual || !course || !slug || !selectedTier || submitting) return;
    setSubmitting(true);
    setSessionError(null);
    setEmailMessage(null);

    const { available } = await checkCourseAvailability(course.id);
    if (available <= 0) {
      setSessionError('Kurset er fullt.');
      setSubmitting(false);
      return;
    }

    const { data, error: payErr, status } = await createDinteroSession({
      courseId: course.id,
      organizationSlug: slug,
      ticketTypeId: selectedTier.id,
      sessionId: isDropInSelected ? dropInSessionId ?? undefined : undefined,
      customerEmail: form.email.trim(),
      customerName: formatPersonName(form.name),
      customerPhone: form.phone.trim() || undefined,
      customerNote: form.note.trim() || undefined,
    });
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

    setSession({
      sid: data.sid,
      merchantReference: data.merchantReference,
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

  // ── Manual signup submit (paid course, payment arranged with the studio) ──
  async function handleManualSubmit() {
    if (!course || !slug || !selectedTier || submitting) return;
    setSubmitting(true);
    setEmailMessage(null);
    const { error: signupErr } = await createManualSignup({
      courseId: course.id,
      ticketTypeId: selectedTier.id,
      courseSessionId: isDropInSelected ? dropInSessionId ?? undefined : undefined,
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
    window.location.href = `/checkout/success?manual=true&org=${slug}`;
  }

  // ── States ──────────────────────────────────────────────────────────────
  const close = () => {
    if (slug && courseSlug) navigate(`/${slug}/${courseSlug}`);
    else navigate(-1);
  };

  if (loading) {
    return (
      <CheckoutModalShell onClose={close}>
        <CheckoutLoadingBody />
      </CheckoutModalShell>
    );
  }
  if (error || !course) {
    return (
      <CheckoutModalShell onClose={close}>
        <div className="py-6 text-center">
          <p className="text-base font-medium text-foreground">Fant ikke kurset</p>
          <p className="mt-1 text-sm text-foreground-muted">
            Kurset finnes ikke lenger, eller lenken er feil.
          </p>
          <Button variant="outline" className="mt-5" onClick={close}>
            Tilbake
          </Button>
        </div>
      </CheckoutModalShell>
    );
  }

  // Paid + integrated payments is the only branch with a real payment step;
  // free and manuell collapse to a single confirm screen with no stepper.
  const stepped = !isFree && !isManual;
  const onPayment = stepped && step === 'payment';
  const blocked = isCancelled || isFull || !paymentReady;

  const header = (
    <>
      {onPayment && (
        <button
          type="button"
          aria-label="Tilbake"
          onClick={() => {
            setStep('contact');
            setSession(null);
            setSessionError(null);
          }}
          className="-ml-1 flex size-8 shrink-0 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="size-5" strokeWidth={1.75} />
        </button>
      )}
      <DialogTitle className="text-base font-medium text-foreground">Påmelding</DialogTitle>
      {stepped && <MiniStepper onPayment={onPayment} />}
    </>
  );

  return (
    <CheckoutModalShell
      onClose={close}
      header={header}
      summary={
        <SummaryPanel
          course={course}
          selectedTier={selectedTier}
          subtotal={tierPrice}
          fee={fee}
          total={total}
          isFree={isFree}
          isManual={isManual}
        />
      }
    >
      {/* mobile/tablet (< md) — the filled summary column is hidden, so a
          collapsible bar carries the full summary, nothing dropped. */}
      <div className="mb-6 overflow-hidden rounded-xl border border-border md:hidden">
        <button
          type="button"
          onClick={() => setSummaryOpen((o) => !o)}
          aria-expanded={summaryOpen}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-sm"
        >
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
            {summaryOpen ? 'Skjul sammendrag' : 'Vis sammendrag'}
            <ChevronDown
              className={cn('size-4 transition-transform', summaryOpen && 'rotate-180')}
              strokeWidth={1.75}
            />
          </span>
          <span className="font-medium tabular-nums text-foreground">{formatKroner(total)}</span>
        </button>
        {summaryOpen && (
          <div className="border-t border-border p-4">
            <SummaryContent
              course={course}
              selectedTier={selectedTier}
              subtotal={tierPrice}
              fee={fee}
              total={total}
              isFree={isFree}
              isManual={isManual}
            />
          </div>
        )}
      </div>

      {isCancelled && (
        <Alert variant="warning" className="mb-6">
          <AlertDescription>Kurset er avlyst.</AlertDescription>
        </Alert>
      )}
      {!isCancelled && isFull && (
        <Alert variant="warning" className="mb-6">
          <AlertDescription>Kurset er fullt.</AlertDescription>
        </Alert>
      )}
      {!isCancelled && !isFull && !paymentReady && (
        <Alert variant="warning" className="mb-6">
          <AlertDescription>Påmelding åpner snart. Studioet fullfører oppsettet.</AlertDescription>
        </Alert>
      )}

      {onPayment ? (
        <section>
          <h2 className="text-base font-medium text-foreground">Betaling</h2>
          <p className="mt-1 text-sm text-foreground-muted">Betal med Vipps eller kort.</p>
          <div id="payment" className="mt-6 scroll-mt-6">
            <DinteroEmbed
              sid={session?.sid ?? null}
              enabled={true}
              loading={false}
              errorMessage={sessionError}
              onPaymentAuthorized={(transactionId) => {
                if (!session) return;
                const ref = encodeURIComponent(session.merchantReference);
                window.location.href = `/checkout/success?transaction_id=${transactionId}&ref=${ref}&org=${slug}`;
              }}
            />
          </div>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-foreground-muted">
            <Lock className="size-3.5" strokeWidth={1.75} />
            Sikker betaling
          </p>
        </section>
      ) : (
        <section>
          <h2 className="text-base font-medium text-foreground">Hvem melder vi på?</h2>

          <div className="mt-6 space-y-4">
            <FloatingField
              id="co-name"
              label="Navn"
              autoComplete="name"
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            />
            <FloatingField
              id="co-email"
              label="E-post"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={form.email}
              onChange={(v) => {
                setForm((f) => ({ ...f, email: v }));
                if (emailMessage || sessionError) {
                  setEmailMessage(null);
                  setSessionError(null);
                }
              }}
              onBlur={() => setEmailTouched(true)}
              error={emailError}
            />
            <FloatingField
              id="co-phone"
              label="Telefon"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
              onBlur={() => setPhoneTouched(true)}
              error={phoneError}
            />
            <FloatingField
              id="co-note"
              label="Melding til studioet (valgfritt)"
              multiline
              rows={3}
              muted
              value={form.note}
              onChange={(v) => setForm((f) => ({ ...f, note: v }))}
            />
          </div>

          {(isFree || isManual) && (
            <div className="mt-8 space-y-2">
              <h2 className="text-base font-medium text-foreground">Betaling</h2>
              <div className="rounded-2xl bg-muted p-4">
                <p className="text-sm text-foreground">
                  {isFree
                    ? 'Dette er et gratis kurs.'
                    : 'Studioet sender deg betalingsinformasjon på e-post.'}
                </p>
              </div>
            </div>
          )}

          <div className="mt-8">
            <label className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
              <Checkbox
                checked={form.terms}
                onCheckedChange={(v) => setForm((f) => ({ ...f, terms: v === true }))}
                className="mt-0.5"
              />
              <span>
                Jeg godtar{' '}
                <Link
                  to="/terms"
                  className="underline decoration-foreground-disabled underline-offset-2 hover:decoration-foreground"
                >
                  vilkårene
                </Link>
                .
              </span>
            </label>

            <Button
              size="cta"
              className="mt-4 w-full"
              disabled={!formValid || submitting || blocked}
              onClick={isFree ? handleFreeSubmit : isManual ? handleManualSubmit : handleAdvanceToPayment}
            >
              {submitting
                ? 'Et øyeblikk…'
                : isFree || isManual
                  ? 'Meld meg på'
                  : 'Fortsett til betaling'}
            </Button>
            {sessionError && (
              <p className="mt-2 text-center text-sm text-danger">{sessionError}</p>
            )}
          </div>
        </section>
      )}
    </CheckoutModalShell>
  );
};

// ── Sub-components ───────────────────────────────────────────────────────

/**
 * The checkout modal: a centered Dialog with the /dev/checkout-3 split layout —
 * the step on the left (header pinned, body scrolls), the filled neutral summary
 * on the right. Closing it returns to the course page.
 */
function CheckoutModalShell({
  onClose,
  header,
  summary,
  children,
}: {
  onClose: () => void;
  header?: React.ReactNode;
  summary?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="flex max-h-[calc(100dvh-3rem)] gap-0 overflow-hidden p-0 sm:max-w-[840px]">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center gap-3 border-b border-border px-6 py-4 pr-14 md:pr-6">
            {header ?? <DialogTitle className="text-base font-medium text-foreground">Påmelding</DialogTitle>}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{children}</div>
        </div>
        {summary}
      </DialogContent>
    </Dialog>
  );
}

/** Header breadcrumb for the paid two-step flow (Kontakt → Betaling). */
function MiniStepper({ onPayment }: { onPayment: boolean }) {
  return (
    <nav aria-label="Fremdrift" className="ml-auto flex items-center gap-2 text-xs">
      <span className={cn(onPayment ? 'text-foreground-muted' : 'font-medium text-foreground')}>Kontakt</span>
      <span aria-hidden className={cn('h-px w-4', onPayment ? 'bg-primary' : 'bg-border')} />
      <span className={cn(onPayment ? 'font-medium text-foreground' : 'text-foreground-muted')}>Betaling</span>
    </nav>
  );
}

/**
 * Floating-label field (public-page style — the label rests inside the input,
 * then shrinks to the top-left on focus/fill). Controlled, with inline error.
 */
function FloatingField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  autoComplete,
  inputMode,
  multiline = false,
  rows = 3,
  error,
  muted = false,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  autoComplete?: string;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email';
  multiline?: boolean;
  rows?: number;
  error?: string | null;
  /** Optional field — recedes to a borderless grey fill at rest, and becomes a
   *  normal white bordered field on focus or once it has content, so it doesn't
   *  read as required next to the mandatory fields. */
  muted?: boolean;
}) {
  const fieldBase = cn(
    'peer w-full rounded-lg border bg-surface px-3.5 text-base text-foreground placeholder-transparent transition-colors focus:outline-none focus:ring-2',
    error
      ? 'border-danger bg-danger-subtle focus:border-danger focus:ring-danger/30'
      : muted
        ? 'border-transparent bg-muted focus:border-foreground focus:bg-surface focus:ring-ring/30 [&:not(:placeholder-shown)]:border-border [&:not(:placeholder-shown)]:bg-surface'
        : 'border-border focus:border-foreground focus:ring-ring/30',
  );
  const floats =
    'peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-xs';
  return (
    <div>
      <div className="relative">
        {multiline ? (
          <textarea
            id={id}
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder=" "
            aria-invalid={!!error}
            className={cn(fieldBase, 'pb-2 pt-6')}
          />
        ) : (
          <input
            id={id}
            type={type}
            inputMode={inputMode}
            autoComplete={autoComplete}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder=" "
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            className={cn(fieldBase, 'h-14 pb-1 pt-5')}
          />
        )}
        <label
          htmlFor={id}
          className={cn(
            'pointer-events-none absolute left-3.5 text-base text-foreground-muted transition-all',
            multiline ? 'top-4' : 'top-1/2 -translate-y-1/2',
            floats,
          )}
        >
          {label}
        </label>
      </div>
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </div>
  );
}

/** Loading placeholder shaped for the modal body. */
function CheckoutLoadingBody() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-5 w-44" />
      <Skeleton className="h-14 w-full rounded-lg" />
      <Skeleton className="h-14 w-full rounded-lg" />
      <Skeleton className="h-14 w-full rounded-lg" />
      <Skeleton className="mt-4 h-11 w-full rounded-full" />
    </div>
  );
}

/**
 * Inline Dintero iframe container. When `enabled=false` (form invalid),
 * renders a greyed placeholder with a helper line. When `sid` is set,
 * mounts the embed via `embedDinteroCheckout`.
 */
function DinteroEmbed({
  sid,
  enabled,
  loading,
  errorMessage,
  onPaymentAuthorized,
}: {
  sid: string | null;
  enabled: boolean;
  loading: boolean;
  errorMessage: string | null;
  onPaymentAuthorized: (transactionId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const checkoutRef = useRef<DinteroCheckoutInstance | null>(null);
  const [embedError, setEmbedError] = useState<string | null>(null);

  // Read onPaymentAuthorized through a ref so a fresh inline-arrow identity from
  // the parent doesn't land in the effect deps and tear down + re-embed the
  // iframe mid-payment. Same callbackRef pattern as use-realtime-subscription.
  const onPaymentAuthorizedRef = useRef(onPaymentAuthorized);
  useEffect(() => {
    onPaymentAuthorizedRef.current = onPaymentAuthorized;
  }, [onPaymentAuthorized]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !sid) return;
    let disposed = false;
    embedDinteroCheckout({
      container,
      sid,
      onPaymentAuthorized: (transactionId) => onPaymentAuthorizedRef.current(transactionId),
      onPaymentError: (msg) => setEmbedError(msg),
      onSessionCancel: () => {
        // No-op: user can still adjust the form above. Iframe stays mounted
        // until they navigate away.
      },
    })
      .then((instance) => {
        if (disposed) {
          instance.destroy?.();
          return;
        }
        checkoutRef.current = instance;
      })
      .catch((err: unknown) => {
        const msg = friendlyError(err, 'Kunne ikke laste betaling.');
        setEmbedError(msg);
      });
    return () => {
      disposed = true;
      checkoutRef.current?.destroy?.();
      checkoutRef.current = null;
      container.innerHTML = '';
    };
  }, [sid]);

  if (errorMessage || embedError) {
    return (
      <Alert variant="error">
        <AlertDescription>{errorMessage ?? embedError}</AlertDescription>
      </Alert>
    );
  }

  if (!enabled) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5 opacity-50">
        <p className="text-base text-foreground-muted">
          Fyll ut kontaktinfo og godta vilkår.
        </p>
      </div>
    );
  }

  if (loading || !sid) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5">
        <Skeleton className="h-11 w-full rounded-full" />
        <Skeleton className="h-9 w-1/3 mt-4 mx-auto" />
        <Skeleton className="h-10 w-full mt-4" />
        <Skeleton className="h-10 w-full mt-3" />
      </div>
    );
  }

  // Sticky container: Dintero's iframe will render into this div.
  return <div ref={containerRef} />;
}

/**
 * The summary content — identity, type/time meta, then the price breakdown.
 * Shared by the desktop side panel and the mobile/tablet collapsible so the two
 * can't drift and neither drops information. A free booking totals to "0 kr"
 * (formatKroner), never "Gratis".
 */
function SummaryContent({
  course,
  selectedTier,
  subtotal,
  fee,
  total,
  isFree,
  isManual,
}: {
  course: PublicCourseWithDetails;
  selectedTier: AvailableTicketType | null;
  subtotal: number;
  fee: number;
  total: number;
  isFree: boolean;
  isManual: boolean;
}) {
  const meta = buildMeta(course);
  const img = resolveCourseImage(course);

  return (
    <div className="space-y-5">
      <div className="flex gap-3">
        {img && (
          <div className="size-14 shrink-0 overflow-hidden rounded-lg bg-surface">
            <img src={img} alt="" className="size-full object-cover" />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm text-foreground-muted">{course.seller?.name}</p>
          <h3 className="mt-0.5 text-base font-medium leading-snug text-foreground">{course.title}</h3>
          {meta && <p className="mt-1 text-sm text-foreground-muted">{meta}</p>}
        </div>
      </div>

      {selectedTier && (
        <>
          <div className="border-t border-border" />
          {!isFree && (
            <>
              <div className="space-y-2 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-foreground">{selectedTier.label}</span>
                  <span className="tabular-nums text-foreground">{formatKroner(subtotal)}</span>
                </div>
                {!isManual && (
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-foreground-muted">Tjenestegebyr</span>
                    <span className="tabular-nums text-foreground-muted">{formatKroner(fee)}</span>
                  </div>
                )}
              </div>
              <div className="border-t border-border" />
            </>
          )}
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-base font-medium text-foreground">Totalt</span>
            <span className="text-xl font-medium tabular-nums text-foreground">{formatKroner(total)}</span>
          </div>
        </>
      )}
    </div>
  );
}

/** The right column on desktop (≥ md) — SummaryContent on a filled bg-muted
 *  panel running the full modal height. Below md it's hidden in favour of the
 *  collapsible summary in the body. */
function SummaryPanel(props: React.ComponentProps<typeof SummaryContent>) {
  return (
    <aside className="hidden w-[300px] shrink-0 bg-muted p-6 md:block">
      <SummaryContent {...props} />
    </aside>
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
  // With a time, the schedule is the useful line — the format is already
  // conveyed by the ticket label in the summary, so no "type · time" chain.
  if (course.format === 'series' && dateStr && time) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return `${SHORT_WEEKDAYS[d.getDay()]} kl. ${time}`;
    }
  }
  if (time) return `kl. ${time}`;
  return typeLabel;
}

export default CheckoutPage;

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageState } from '@/components/page-state/page-state';
import { embedDinteroCheckout, type DinteroCheckoutInstance } from '@/lib/dintero';
import { ChevronLeft } from '@/lib/icons';
import { formatKroner, isValidEmail } from '@/lib/utils';
import { calculateServiceFee } from '@/lib/pricing';
import { friendlyError } from '@/lib/error-messages';
import { fetchPublicCourseBySlug, type PublicCourseWithDetails } from '@/services/publicCourses';
import { createDinteroSession } from '@/services/checkout';
import { createFreeSignup, checkCourseAvailability } from '@/services/signups';
import { supabase } from '@/lib/supabase';
import type { AvailableTicketType } from '@/types/database';

interface FormState {
  name: string;
  email: string;
  phone: string;
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
  const [form, setForm] = useState<FormState>({ name: '', email: '', phone: '', terms: false });
  const [submitting, setSubmitting] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  // Two-step in-place flow: 'contact' shows the kontaktinfo form, 'payment'
  // swaps that block for the live Dintero iframe. No route change.
  const [step, setStep] = useState<'contact' | 'payment'>('contact');

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
  const isCancelled = course?.status === 'cancelled';
  const isFull =
    course?.max_participants != null && course.spots_available <= 0;
  const paymentReady =
    isFree || (course?.seller?.dintero_onboarding_complete ?? false);

  const selectedTier = tiers.find((t) => t.id === selectedTierId) ?? null;
  const isDropInSelected = selectedTier?.ticket_kind === 'drop_in';

  // Drop-in flow: pick the next available session automatically. Same model
  // as BookingPanel — we don't expose a session picker to the buyer.
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
        .limit(1);
      if (cancelled) return;
      const first = (data as { id: string }[] | null)?.[0];
      setDropInSessionId(first?.id ?? null);
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
    && form.phone.trim().length > 0
    && form.terms
    && !!selectedTier;

  // ── Dintero session creation, triggered by the "Fortsett til betaling"
  //    click handler below. Living in a handler (vs useEffect on step change)
  //    lets us validate against the server BEFORE advancing the step — a 409
  //    or "fullt" stays the user on the form with the right error visible.
  const [session, setSession] = useState<DinteroSessionRef | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  async function handleAdvanceToPayment() {
    if (isFree || !course || !slug || !selectedTier || submitting) return;
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
      customerName: form.name.trim(),
      customerPhone: form.phone.trim() || undefined,
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
      participantName: form.name.trim(),
      participantEmail: form.email.trim(),
      participantPhone: form.phone.trim() || undefined,
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
      <div className="mx-auto max-w-5xl w-full px-4 sm:px-6 lg:px-8 pb-16">
        <button
          type="button"
          onClick={() => {
            if (step === 'payment') {
              setStep('contact');
              setSession(null);
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

        {(step === 'contact' || isFree) && (
          <h2
            className="px-2 sm:px-6 max-w-[552px] mb-6 text-xl font-semibold tracking-tight text-[#171717]"
            style={{ fontFamily: 'Inter, -apple-system, system-ui, sans-serif' }}
          >
            Kontaktinfo
          </h2>
        )}

        <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1fr)_320px] md:gap-6 md:items-start lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
          <div className="space-y-6 max-w-[552px] min-w-0">
            {step === 'contact' || isFree ? (
              <>
                <div className="px-2 sm:px-6">
                  <div className="space-y-4">
                    <Field label="Fullt navn" htmlFor="name">
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
                        aria-invalid={!!emailMessage}
                      />
                      {emailMessage && (
                        <p className="text-xs text-danger mt-1">{emailMessage}</p>
                      )}
                    </Field>
                    <Field label="Telefon" htmlFor="phone">
                      <Input
                        id="phone"
                        type="tel"
                        autoComplete="tel"
                        value={form.phone}
                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
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
                        <p className="text-xs text-danger text-center">{sessionError}</p>
                      )}
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <div id="payment" className="scroll-mt-6">
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

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !sid) return;
    let disposed = false;
    embedDinteroCheckout({
      container,
      sid,
      onPaymentAuthorized,
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
  }, [sid, onPaymentAuthorized]);

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
        <p className="text-sm text-foreground-muted">
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

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="p-5 space-y-5">
        <div>
          <p className="text-sm text-foreground-muted">{course.seller?.name}</p>
          <h3 className="mt-0.5 text-base font-semibold tracking-tight text-foreground">
            {course.title}
          </h3>
          {meta && (
            <p className="mt-2 text-sm text-foreground-muted">{meta}</p>
          )}
        </div>

        {selectedTier && (
          <>
            <div className="border-t border-border" />
            {!isFree && (
              <>
                <div className="space-y-2 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-foreground">{selectedTier.label}</span>
                    <span className="tabular-nums text-foreground">
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
              <span className="text-base font-semibold tabular-nums text-foreground">
                {formatKroner(total)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-6 pb-16">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-8 h-10 w-2/3 max-w-md" />
        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
          <div className="space-y-6 max-w-[560px]">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-44 w-full rounded-xl" />
          </div>
          <Skeleton className="hidden lg:block h-72 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────

const SHORT_WEEKDAYS = ['søn.', 'man.', 'tir.', 'ons.', 'tor.', 'fre.', 'lør.'] as const;

function buildMeta(course: PublicCourseWithDetails): string | null {
  const typeLabel =
    course.delivery_mode === 'online' ? 'Nettkurs'
    : course.format === 'series' ? 'Kursrekke'
    : 'Enkelttime';
  const m = course.time_schedule?.match(/(\d{1,2}:\d{2})/);
  const time = m ? m[1] : null;
  const dateStr = course.next_session?.session_date ?? course.start_date;
  if (course.format === 'series' && dateStr && time) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return `${typeLabel} · ${SHORT_WEEKDAYS[d.getDay()]} kl. ${time}`;
    }
  }
  if (time) return `${typeLabel} · kl. ${time}`;
  return typeLabel;
}

export default CheckoutPage;

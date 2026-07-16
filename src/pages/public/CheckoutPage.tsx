import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupCardItem } from '@/components/ui/radio-group';
import { FieldError } from '@/components/ui/field-error';
import { PageState } from '@/components/page-state/page-state';
import { DelayedFallback } from '@/components/ui/delayed-fallback';
import { FloatingField } from '@/components/public/FloatingField';
import { useAuth } from '@/contexts/AuthContext';
import { StorefrontHeader } from '@/components/public/StorefrontHeader';
import { Elements, PaymentElement, useStripe as useStripeHook, useElements } from '@stripe/react-stripe-js';
import type { Stripe } from '@stripe/stripe-js';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import { withTimeout } from '@/lib/with-timeout';
import { ChevronLeft, Lock, Plus } from '@/lib/icons';
import { formatKroner, formatPersonName, isValidEmail, isValidPhone, cn } from '@/lib/utils';
import { calculateDiscountedPrice, calculateServiceFee } from '@/lib/pricing';
import { friendlyError } from '@/lib/error-messages';
import { fetchPublicCourseBySlug, resolveCourseImage, type PublicCourseWithDetails } from '@/services/publicCourses';
import { createStripeSession } from '@/services/checkout';
import { createFreeSignup } from '@/services/signups';
import { saveFreeReceipt } from '@/lib/free-receipt';
import { supabase } from '@/lib/supabase';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { osloNowKey } from '@/utils/dateUtils';
import { SegmentedTabs } from '@/components/teacher/SegmentedTabs';
import type { TicketId } from '@/components/public/course-details/BookingRailLite';
import {
  buildCheckoutContextMeta,
  buildNextSessionLabel,
} from '@/components/public/course-details/schedule-format';
import type { AvailableTicketType } from '@/types/database';

export interface FormState {
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

/** First invalid contact field, focus-order — shared by the free and paid submit handlers. */
function firstInvalidField(form: FormState): 'name' | 'email' | 'phone' | 'terms' | null {
  if (form.name.trim().length === 0) return 'name';
  if (!isValidEmail(form.email.trim())) return 'email';
  if (!isValidPhone(form.phone)) return 'phone';
  if (!form.terms) return 'terms';
  return null;
}

/**
 * Resolve a src/index.css token to a Stripe-safe color. Stripe's appearance
 * API validates color strings and rejects OKLCH in some versions, so the
 * computed token is normalized through a canvas fill — browsers serialize an
 * opaque `fillStyle` back as sRGB hex. Reading the live token (instead of a
 * hand-copied hex) means a token retune can't silently leave checkout on
 * stale brand colors; the fallback is the last-known resolved value.
 */
function tokenToHex(varName: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (!raw) return fallback;
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return fallback;
  ctx.fillStyle = fallback; // seed with a known-valid color
  ctx.fillStyle = raw; // an invalid/unsupported value leaves the seed in place
  // Chromium with CSS Color 4 canvas support round-trips `oklch(...)` in
  // fillStyle as-is (Stripe rejects it and falls back to its default theme),
  // so serialize via a painted pixel — getImageData always yields sRGB bytes.
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/** `#rrggbb` → `rgba(...)` — for translucent mirrors of opaque tokens
 *  (tokenToHex's canvas round-trip can't carry alpha). */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Stripe Elements appearance for the deferred-intent Payment Element.
// Resolved lazily (and once) so the tokens are read after index.css is live.
let stripeAppearance: {
  theme: 'stripe';
  labels: 'floating';
  variables: Record<string, string>;
  rules: Record<string, Record<string, string>>;
} | null = null;
function getStripeAppearance() {
  const foreground = tokenToHex('--foreground', '#111314');
  const muted = tokenToHex('--foreground-muted', '#5f6771');
  stripeAppearance ??= {
    theme: 'stripe',
    // No static titles above the card fields — labels float inside the
    // inputs, matching the page's own FloatingField grammar. (Appearance API
    // has no way to remove labels; floating is the sanctioned mode.)
    labels: 'floating',
    variables: {
      // Stripe loads its PaymentElement in a cross-origin iframe, so it can't
      // inherit the page's @font-face — 'Geist Variable' is self-hosted with
      // no public URL to pass via Stripe's `fonts` config, so this falls back
      // to system-ui in every browser.
      fontFamily: "'Geist Variable', system-ui, sans-serif",
      colorPrimary: tokenToHex('--primary', '#0074bf'),
      colorText: foreground,
      colorDanger: tokenToHex('--danger', '#bd3838'),
      // FloatingField's resting label/value size.
      fontSizeBase: '16px',
      // Match the page's own FloatingField inputs (rounded-xl = 10px) so the
      // Stripe fields read as part of the same form.
      borderRadius: '10px',
    },
    // Mirror FloatingField's geometry (src/components/public/FloatingField.tsx):
    // 52px shell = pt-24 + 24px text line + pb-4, px-4, border-input hairline,
    // 11px muted floated caption, neutral (foreground) focus border.
    rules: {
      // No explicit padding: the floating-labels layout reserves caption
      // head-room inside the input itself, so forcing FloatingField's
      // 24/4 padding double-counts the top and gives the field a "forehead".
      // Stripe owns the vertical geometry; we match ink, edge and size.
      '.Input': {
        border: `1px solid ${tokenToHex('--input', '#c9cdd3')}`,
        boxShadow: 'none',
        fontSize: '16px',
      },
      '.Input:focus': {
        borderColor: foreground,
        // ring-2 ring-ring-subtle = foreground ink at 15% alpha.
        boxShadow: `0 0 0 2px ${hexToRgba(foreground, 0.15)}`,
      },
      '.Label': {
        color: muted,
        fontSize: '16px',
      },
      '.Label--floating': {
        color: muted,
        fontSize: '11px',
        lineHeight: '11px',
      },
      // fontSizeBase is 16px for the field grammar — pull messages back down
      // to the page's error size (FieldError is text-sm).
      '.Error': {
        fontSize: '14px',
      },
    },
  };
  return stripeAppearance;
}

/**
 * Resolve Stripe.js once, gated on `enabled` (paid + payment-ready courses
 * only — a free course never loads the script). Timeout-wrapped: a
 * blocked/slow script (ad blocker, offline) surfaces as a failure instead of
 * an Elements provider that never mounts. getStripe() memoizes loadStripe
 * app-wide, so this is cheap across remounts.
 */
function useStripeInstance(enabled: boolean): { stripe: Stripe | null; stripeFailed: boolean } {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [stripeFailed, setStripeFailed] = useState(false);
  useEffect(() => {
    if (!enabled || !isStripeConfigured) return;
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
  }, [enabled]);
  return { stripe, stripeFailed };
}

/**
 * Single-screen checkout: billett, kontaktopplysninger and betaling on one
 * route (docs/design/booking-detail-cta-first.html, the "t1s2" frames — THE
 * design source of truth). Paid courses use Stripe's deferred-intent
 * pattern: the Payment Element mounts on page load against a
 * `mode: 'payment'` Elements instance (no PaymentIntent yet); the "Betal"
 * button validates, calls `elements.submit()`, THEN creates the
 * destination-charge PaymentIntent via the unchanged create-stripe-connect-
 * session edge function, and finally confirms with the returned client
 * secret. Switching Billett tiers updates the live amount via
 * `elements.update()` — see ElementsAmountSync below.
 */
const CheckoutPage = () => {
  useDocumentTitle('Påmelding');
  const { slug, courseSlug } = useParams<{ slug: string; courseSlug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ name: '', email: '', phone: '', note: '', terms: false });
  // Checkout stays guest-first, but a signed-in buyer shouldn't retype what
  // the account already knows. The profile loads async — fill on arrival,
  // never overwriting a field the buyer has already typed in.
  const { profile } = useAuth();
  useEffect(() => {
    if (!profile) return;
    setForm((f) => ({
      ...f,
      name: f.name || profile.name || '',
      email: f.email || profile.email || '',
      phone: f.phone || profile.phone || '',
    }));
  }, [profile]);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

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

  // Honor-system discounts — student and honnør are separately priced (the
  // rates routinely differ), each offered per seller and claimed with a quiet
  // toggle below the payment fields. Trust-based by design (no verification);
  // the edge function re-applies the same percent server-side.
  const discountOffers: DiscountOffer[] = [
    { audience: 'student' as const, label: 'student', percent: course?.seller?.student_discount_percent },
    { audience: 'senior' as const, label: 'pensjonist', percent: course?.seller?.senior_discount_percent },
  ].filter((o): o is DiscountOffer => o.percent != null);
  const [claimedAudience, setClaimedAudience] = useState<'student' | 'senior' | null>(null);
  const claimedOffer = discountOffers.find((o) => o.audience === claimedAudience) ?? null;
  const discountApplied = claimedOffer != null && tierPrice > 0;
  const discountedPrice = discountApplied
    ? calculateDiscountedPrice(tierPrice, claimedOffer.percent)
    : tierPrice;

  const fee = calculateServiceFee(discountedPrice);
  const total = discountedPrice + fee;

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

  // The interactive section (fields + billett + betaling) needs a resolvable
  // path to completion — closed has none, and an unpaid-ready seller (mid
  // onboarding) has no working payment rail, so Stripe.js is never even
  // requested (useStripeInstance below) and this would otherwise hang on a
  // permanent loading skeleton.
  const formReady = !closed && (isFree || paymentReady);

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
  // Drop-in selected → the context row's meta line swaps to the concrete
  // session being bought. The value updates in an existing slot; nothing
  // floats under the toggle.
  const contextMetaOverride = (() => {
    if (!isDropInSelected || dropInResolving) return undefined;
    const next = buildNextSessionLabel(dropInNextSession ?? null);
    if (!next) return undefined;
    const seller = course?.seller?.name;
    return seller ? `${next}, ${seller}` : next;
  })();

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

  const termsError = attempted && !form.terms ? 'Godta vilkårene for å fortsette.' : null;

  const onEmailEdited = () => {
    if (emailMessage || sessionError) {
      setEmailMessage(null);
      setSessionError(null);
    }
  };
  const onEmailBlur = () => setEmailTouched(true);
  const onPhoneBlur = () => setPhoneTouched(true);

  const { stripe, stripeFailed } = useStripeInstance(!isFree && paymentReady);

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
      setEmailMessage(friendlyError(signupErr, 'Kunne ikke fullføre påmeldingen. Prøv igjen.'));
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
      sellerLogoUrl: course.seller?.logo_url ?? null,
      participantEmail: form.email.trim(),
      createdAt: new Date().toISOString(),
    });

    navigate(`/checkout/success?free=true&org=${slug}&sid=${encodeURIComponent(data.signupId)}`);
  }

  function handleFreeFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAttempted(true);
    const invalid = firstInvalidField(form);
    if (invalid) {
      document.getElementById(invalid)?.focus();
      return;
    }
    void handleFreeSubmit();
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
  const amountOre = Math.round(total * 100);

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <StorefrontHeader
        name={course.seller?.name}
        slug={slug}
        logoUrl={course.seller?.logo_url}
      />
      <div className="mx-auto max-w-6xl w-full px-4 sm:px-6 lg:px-8 pb-16">

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

        <div className="mx-auto max-w-[520px] space-y-6">
          <button
            type="button"
            onClick={() => navigate(backHref)}
            className="focus-ring -mb-1 rounded inline-flex items-center gap-1.5 self-start text-sm text-foreground-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <ChevronLeft className="size-4" strokeWidth={1.75} />
            Tilbake til kurset
          </button>
          <CheckoutTitle />
          <CheckoutCourseContext
            course={course}
            metaOverride={contextMetaOverride}
            metaLoading={isDropInSelected && dropInResolving}
            trailing={
              !closed && !showBillett && billettLowStock ? (
                <span className="ml-auto whitespace-nowrap text-xs tabular-nums text-warning">
                  {billettSpotsLeft} {billettSpotsLeft === 1 ? 'plass' : 'plasser'} igjen
                </span>
              ) : undefined
            }
          />

          {!closed && showBillett && mainTier && dropInTier && (
            <BillettSection
              mainTier={mainTier}
              dropInTier={dropInTier}
              selectedKind={isDropInSelected ? 'drop-in' : 'main'}
              onSelect={(kind) => {
                const tier = kind === 'drop-in' ? dropInTier : mainTier;
                if (tier) setSelectedTierId(tier.id);
              }}
              lowStock={billettLowStock}
              spotsLeft={billettSpotsLeft}
              disabled={submitting}
            />
          )}

          {formReady && (
            isFree ? (
              <form onSubmit={handleFreeFormSubmit} noValidate className="space-y-6">
                <ContactFields
                  form={form}
                  setForm={setForm}
                  nameError={nameError}
                  emailError={emailError}
                  phoneError={phoneError}
                  onEmailEdited={onEmailEdited}
                  onEmailBlur={onEmailBlur}
                  onPhoneBlur={onPhoneBlur}
                />
                <TermsField form={form} setForm={setForm} error={termsError} />
                <CheckoutReceipt
                  course={course}
                  selectedTier={selectedTier}
                  subtotal={tierPrice}
                  fee={fee}
                  total={total}
                  isFree
                />
                <Button
                  type="submit"
                  size="cta"
                  className="w-full"
                  loading={submitting}
                  disabled={!paymentReady || isFull || isCancelled}
                >
                  Bekreft påmelding
                </Button>
              </form>
            ) : !isStripeConfigured ? (
              <Alert variant="error">
                <AlertDescription>
                  Betaling er ikke tilgjengelig akkurat nå. Prøv igjen senere eller kontakt studioet.
                </AlertDescription>
              </Alert>
            ) : stripeFailed ? (
              <Alert variant="error">
                <AlertDescription>
                  Betalingen kunne ikke lastes. Slå av eventuelle annonseblokkere og last siden på nytt.
                </AlertDescription>
              </Alert>
            ) : !stripe || !selectedTier || total <= 0 ? (
              <PaidCheckoutSkeleton />
            ) : (
              <Elements
                stripe={stripe}
                options={{
                  mode: 'payment',
                  amount: amountOre,
                  currency: 'nok',
                  captureMethod: 'manual',
                  // Locked to bokmål — default 'auto' follows the buyer's
                  // browser language, which splits the page into two languages
                  // (Norwegian form, English payment fields) for any
                  // non-Norwegian system locale.
                  locale: 'nb',
                  appearance: getStripeAppearance(),
                }}
              >
                <ElementsAmountSync amountOre={amountOre} />
                <PaidCheckoutForm
                  course={course}
                  slug={slug!}
                  selectedTier={selectedTier}
                  tierPrice={tierPrice}
                  fee={fee}
                  total={total}
                  discountOffers={discountOffers}
                  claimedAudience={claimedAudience}
                  setClaimedAudience={setClaimedAudience}
                  claimedOffer={claimedOffer}
                  discountAmount={discountApplied ? tierPrice - discountedPrice : 0}
                  isDropInSelected={isDropInSelected}
                  dropInSessionId={dropInSessionId}
                  dropInResolving={dropInResolving}
                  dropInLookupFailed={dropInLookupFailed}
                  showNoUpcomingDropIn={isDropInSelected && dropInSessionId === null}
                  form={form}
                  setForm={setForm}
                  nameError={nameError}
                  emailError={emailError}
                  phoneError={phoneError}
                  termsError={termsError}
                  onEmailEdited={onEmailEdited}
                  onEmailBlur={onEmailBlur}
                  onPhoneBlur={onPhoneBlur}
                  setAttempted={setAttempted}
                  submitting={submitting}
                  setSubmitting={setSubmitting}
                  sessionError={sessionError}
                  setSessionError={setSessionError}
                  setEmailMessage={setEmailMessage}
                  payDisabled={!paymentReady || isFull || isCancelled}
                />
              </Elements>
            )
          )}
        </div>
      </div>
    </div>
  );
};

// ── Sub-components ───────────────────────────────────────────────────────

/** "Fullfør påmeldingen" — no step indicator; billett/opplysninger/betaling
 * render together on one screen, so there's nothing left to count. */
export function CheckoutTitle() {
  return (
    <h1 className="mt-3 text-2xl font-medium text-foreground">
      Fullfør påmeldingen
    </h1>
  );
}

/** Reacts to Billett tier switches by pushing the new amount into the
 * already-mounted deferred Elements instance — `elements.update()` is the
 * documented way to change a `mode: 'payment'` Elements' amount without
 * remounting the Payment Element. Lives inside `<Elements>` so it can reach
 * `useElements()`; `amountOre` itself is owned by the page (Billett state). */
function ElementsAmountSync({ amountOre }: { amountOre: number }) {
  const elements = useElements();
  useEffect(() => {
    if (!elements) return;
    void elements.update({ amount: amountOre });
  }, [elements, amountOre]);
  return null;
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

const FLAB_CLASS = 'text-[13.5px] font-medium text-foreground';

/**
 * The contact-step fields — Fullt navn / E-post / Telefon as floating-label
 * fields (the public-page input grammar), then a collapsed "Legg til
 * melding" affordance that expands to a labeled Textarea. Terms live in the
 * separate `TermsField` (positioned at the end of the form, see CheckoutPage).
 * Extracted presentationally (markup unchanged) so the dev preview at
 * /dev/checkout-t1-preview renders the exact same fields the live page shows.
 */
export function ContactFields({
  form,
  setForm,
  nameError,
  emailError,
  phoneError,
  onEmailEdited,
  onEmailBlur,
  onPhoneBlur,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  nameError: string | null;
  emailError: string | null;
  phoneError: string | null;
  /** Fired on every email keystroke — the page clears stale server messages. */
  onEmailEdited?: () => void;
  onEmailBlur?: () => void;
  onPhoneBlur?: () => void;
}) {
  const [noteOpen, setNoteOpen] = useState(form.note.trim().length > 0);
  // Only steal focus into the textarea when the buyer just clicked "Legg til
  // melding" — not when noteOpen starts true because the field already has
  // content. Read/written only in the handler + effect below, never during
  // render.
  const shouldFocusNoteRef = useRef(false);
  useEffect(() => {
    if (noteOpen && shouldFocusNoteRef.current) {
      shouldFocusNoteRef.current = false;
      document.getElementById('note')?.focus();
    }
  }, [noteOpen]);

  return (
    <div>
      <p className={cn(FLAB_CLASS, 'mb-[9px]')}>Dine opplysninger</p>
      <div className="space-y-2.5">
        <div>
          <FloatingField
            id="name"
            label="Fullt navn"
            autoComplete="name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            aria-invalid={!!nameError}
            aria-describedby={nameError ? 'name-error' : undefined}
          />
          {nameError && <FieldError id="name-error">{nameError}</FieldError>}
        </div>
        <div>
          <FloatingField
            id="email"
            label="E-post"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => {
              setForm((f) => ({ ...f, email: e.target.value }));
              onEmailEdited?.();
            }}
            onBlur={onEmailBlur}
            aria-invalid={!!emailError}
            aria-describedby={emailError ? 'email-error' : undefined}
          />
          {emailError && <FieldError id="email-error">{emailError}</FieldError>}
        </div>
        <div>
          <FloatingField
            id="phone"
            label="Telefon"
            type="tel"
            autoComplete="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            onBlur={onPhoneBlur}
            aria-invalid={!!phoneError}
            aria-describedby={phoneError ? 'phone-error' : undefined}
          />
          {phoneError && <FieldError id="phone-error">{phoneError}</FieldError>}
        </div>
      </div>

      {noteOpen ? (
        <div className="mt-2.5">
          <Field label="Melding (valgfritt)" htmlFor="note">
            <Textarea
              id="note"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Allergier, skader eller annet vi bør vite."
              rows={3}
            />
          </Field>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            shouldFocusNoteRef.current = true;
            setNoteOpen(true);
          }}
          className="focus-ring mt-2.5 inline-flex items-center gap-1.5 rounded text-sm text-foreground-muted transition-colors hover:text-foreground cursor-pointer"
        >
          <Plus className="size-4" strokeWidth={1.75} />
          Legg til melding
        </button>
      )}
    </div>
  );
}

/**
 * Terms checkbox. Kept functionally identical to
 * the previous inline block, just extracted so it can sit at the end of the
 * form (directly before the receipt + pay action) per the mock — the
 * "Ingen mva. kommer i tillegg." / "Påmeldingen er hos X." lines that used
 * to live near the total are dropped entirely.
 */
/** «Studentrabatt» / «Pensjonistrabatt» — compound noun for summaries. */
function discountNoun(offer: DiscountOffer): string {
  return `${offer.label.charAt(0).toUpperCase()}${offer.label.slice(1)}rabatt`;
}

/**
 * Honor-system discount — progressive disclosure in Stripe Checkout's
 * promo-code grammar: a collapsed one-line trigger (the form's own «+ Legg
 * til melding» pattern) → the offered rates as radio cards (structure from
 * Mobbin: Turo's protection-plan rows; label left, resulting price right) →
 * a compact applied row with «Fjern». The form's resting length is one line
 * in every state, and no discount is the untouched default. Trust-based, so
 * there is deliberately no verification step.
 */
export function DiscountSection({
  offers,
  tierPrice,
  claimed,
  onChange,
  disabled,
}: {
  offers: DiscountOffer[];
  tierPrice: number;
  claimed: 'student' | 'senior' | null;
  onChange: (next: 'student' | 'senior' | null) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const claimedOffer = offers.find((o) => o.audience === claimed) ?? null;

  // Applied — one summary line: what's active, and the way out.
  if (claimedOffer) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="text-foreground">
          {discountNoun(claimedOffer)}{' '}
          <span className="text-foreground-muted">−{claimedOffer.percent} %</span>
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            onChange(null);
            setOpen(false);
          }}
          className="focus-ring rounded text-sm font-medium text-primary underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
        >
          Fjern
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded text-sm text-foreground-muted transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus
          className={cn('size-4 transition-transform duration-150 ease-out', open && 'rotate-45')}
          strokeWidth={1.75}
        />
        Student- eller pensjonistrabatt
      </button>
      {open && (
        <RadioGroup
          value=""
          onValueChange={(v) => {
            onChange(v as 'student' | 'senior');
            setOpen(false);
          }}
          disabled={disabled}
          aria-label="Rabatt"
          className="mt-2.5 gap-2 animate-in fade-in-0 duration-150"
        >
          {offers.map((offer) => (
            <RadioGroupCardItem
              key={offer.audience}
              value={offer.audience}
              title={`${offer.label.charAt(0).toUpperCase()}${offer.label.slice(1)}`}
              description={`${offer.percent} % rabatt`}
              trailing={
                <span className="tabular-nums">
                  {formatKroner(calculateDiscountedPrice(tierPrice, offer.percent))}
                </span>
              }
            />
          ))}
        </RadioGroup>
      )}
    </div>
  );
}

export function TermsField({
  form,
  setForm,
  error,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  error: string | null;
}) {
  return (
    <div>
      <div className="flex items-start gap-3">
        <Checkbox
          id="terms"
          checked={form.terms}
          onCheckedChange={(v) => setForm((f) => ({ ...f, terms: v === true }))}
          aria-invalid={!!error}
          aria-describedby={error ? 'terms-error' : undefined}
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
            className="focus-ring rounded text-primary underline underline-offset-2 hover:decoration-2"
          >
            vilkår og angrerett
          </a>
          .
        </p>
      </div>
      {error && <FieldError id="terms-error" className="pl-7">{error}</FieldError>}
    </div>
  );
}

/**
 * The pay button + "Sikker betaling" trust line under the Payment Element.
 * Extracted presentationally (markup unchanged) so the dev preview can render
 * the payment step's action row without a live Stripe intent.
 */
/**
 * Docks the pay button (and its inline errors) to the viewport bottom on
 * phones while the form scrolls; in-flow and unchanged on ≥sm. Flat
 * background + hairline only — checkout is zero-expression chrome. Shared
 * with the dev preview so both render the pinned state identically.
 */
export function PayButtonDock({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-2 max-sm:sticky max-sm:bottom-0 max-sm:z-10 max-sm:-mx-4 max-sm:px-4 max-sm:bg-background max-sm:pt-3 max-sm:pb-[max(1rem,env(safe-area-inset-bottom))] max-sm:border-t max-sm:border-border-subtle">
      {children}
    </div>
  );
}

export function PayButtonRow({
  total,
  submitting,
  disabled,
}: {
  total: number;
  submitting: boolean;
  disabled: boolean;
}) {
  return (
    <>
      <Button type="submit" size="cta" className="w-full" loading={submitting} disabled={disabled}>
        {`Betal ${formatKroner(total)}`}
      </Button>
      <p className="flex items-center justify-center gap-1.5 text-[12.5px] text-foreground-muted">
        <Lock className="size-[13px]" strokeWidth={2} aria-hidden="true" />
        Sikker betaling
      </p>
    </>
  );
}

/**
 * Wraps the payment slot with its "Betaling" label — shared so the live
 * Stripe Payment Element and the dev preview's placeholder render the
 * payment section identically.
 */
export function CheckoutPaymentSection({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <p className={cn(FLAB_CLASS, 'mb-[9px]')}>Betaling</p>
      <div id="payment" className="scroll-mt-6">
        {children}
      </div>
    </div>
  );
}

function PaidCheckoutSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2.5">
        <Skeleton className="h-[52px] w-full rounded-xl" />
        <Skeleton className="h-[52px] w-full rounded-xl" />
        <Skeleton className="h-[52px] w-full rounded-xl" />
      </div>
      <div className="rounded-xl bg-panel p-5">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="mt-3 h-10 w-full" />
      </div>
      <Skeleton className="h-10 w-full rounded-full" />
    </div>
  );
}

/** One offered honor-system discount, shaped for the checkout toggle row. */
export interface DiscountOffer {
  audience: 'student' | 'senior';
  /** Lowercase Norwegian noun for the claim sentence ("student"/"pensjonist"). */
  label: string;
  percent: number;
}

interface PaidCheckoutFormProps {
  course: PublicCourseWithDetails;
  slug: string;
  selectedTier: AvailableTicketType;
  tierPrice: number;
  fee: number;
  total: number;
  /** Seller's offered honor-system discounts; empty = none. */
  discountOffers: DiscountOffer[];
  claimedAudience: 'student' | 'senior' | null;
  setClaimedAudience: React.Dispatch<React.SetStateAction<'student' | 'senior' | null>>;
  /** The claimed offer, resolved; null when nothing is claimed. */
  claimedOffer: DiscountOffer | null;
  /** Kroner taken off the tier price when the claim is active, else 0. */
  discountAmount: number;
  isDropInSelected: boolean;
  dropInSessionId: string | null | undefined;
  dropInResolving: boolean;
  dropInLookupFailed: boolean;
  showNoUpcomingDropIn: boolean;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  nameError: string | null;
  emailError: string | null;
  phoneError: string | null;
  termsError: string | null;
  onEmailEdited: () => void;
  onEmailBlur: () => void;
  onPhoneBlur: () => void;
  setAttempted: React.Dispatch<React.SetStateAction<boolean>>;
  submitting: boolean;
  setSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  sessionError: string | null;
  setSessionError: React.Dispatch<React.SetStateAction<string | null>>;
  setEmailMessage: React.Dispatch<React.SetStateAction<string | null>>;
  payDisabled: boolean;
}

/**
 * The paid checkout's single <form> — Dine opplysninger, Betaling (the real
 * Payment Element, tabs layout), Terms, receipt and pay action. Lives inside
 * `<Elements>` so it can call `elements.submit()` / `stripe.confirmPayment()`
 * (Stripe's documented deferred-intent submit sequence): validate →
 * elements.submit() → create the PaymentIntent via the existing edge
 * function → confirmPayment with the returned client secret. On success
 * Stripe redirects the browser to `return_url`; failures at any step render
 * inline below the pay button (the same slot `sessionError` used before).
 */
function PaidCheckoutForm({
  course,
  slug,
  selectedTier,
  tierPrice,
  fee,
  total,
  discountOffers,
  claimedAudience,
  setClaimedAudience,
  claimedOffer,
  discountAmount,
  isDropInSelected,
  dropInSessionId,
  dropInResolving,
  dropInLookupFailed,
  showNoUpcomingDropIn,
  form,
  setForm,
  nameError,
  emailError,
  phoneError,
  termsError,
  onEmailEdited,
  onEmailBlur,
  onPhoneBlur,
  setAttempted,
  submitting,
  setSubmitting,
  sessionError,
  setSessionError,
  setEmailMessage,
  payDisabled,
}: PaidCheckoutFormProps) {
  const stripe = useStripeHook();
  const elements = useElements();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAttempted(true);
    const invalid = firstInvalidField(form);
    if (invalid) {
      document.getElementById(invalid)?.focus();
      return;
    }
    // Drop-in needs a resolved next class before the buyer can continue.
    if (isDropInSelected && typeof dropInSessionId !== 'string') return;
    if (!stripe || !elements || submitting) return;

    setSubmitting(true);
    setSessionError(null);
    setEmailMessage(null);

    // Deferred-intent step 1: validate the Payment Element's own inputs
    // before touching the network — an incomplete card never reaches
    // create-stripe-connect-session.
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setSessionError(friendlyError(submitError, 'Betalingen kunne ikke fullføres. Prøv igjen.'));
      setSubmitting(false);
      return;
    }

    // Step 2: create the destination-charge PaymentIntent server-side
    // (unchanged edge function) — no client-side capacity pre-check: course-
    // wide counts are wrong for per-session capacity (drop-ins from past
    // classes inflate them). The edge function's soft check answers with the
    // right inline error, and nothing is authorized until confirmPayment.
    const { data, error: payErr, status } = await createStripeSession({
      courseId: course.id,
      organizationSlug: slug,
      ticketTypeId: selectedTier.id,
      sessionId: isDropInSelected && typeof dropInSessionId === 'string' ? dropInSessionId : undefined,
      customerEmail: form.email.trim(),
      customerName: formatPersonName(form.name),
      customerPhone: form.phone.trim() || undefined,
      customerNote: form.note.trim() || undefined,
      discountAudience: claimedOffer?.audience,
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

    // Step 2b: the PaymentIntent was created on_behalf_of the studio's
    // connected account (C7). Deferred-intent Elements must declare the same
    // account, or confirmPayment is rejected with an on_behalf_of mismatch.
    await elements.update({ onBehalfOf: data.stripeAccountId });

    // Step 3: confirm against the just-created PaymentIntent. With manual
    // capture the authorization redirects as redirect_status=succeeded —
    // capture happens server-side in stripe-connect-webhook.
    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      clientSecret: data.clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success?ref=${encodeURIComponent(data.attemptId)}&org=${slug}`,
      },
    });
    if (confirmError) {
      setSessionError(friendlyError(confirmError, 'Betalingen kunne ikke fullføres. Prøv igjen.'));
      setSubmitting(false);
    }
    // On success Stripe redirects the browser to return_url — nothing more to do.
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <ContactFields
        form={form}
        setForm={setForm}
        nameError={nameError}
        emailError={emailError}
        phoneError={phoneError}
        onEmailEdited={onEmailEdited}
        onEmailBlur={onEmailBlur}
        onPhoneBlur={onPhoneBlur}
      />

      <CheckoutPaymentSection>
        <PaymentElement options={{ layout: 'tabs' }} />
      </CheckoutPaymentSection>

      <TermsField form={form} setForm={setForm} error={termsError} />

      {/* Discount lives with the order summary it modifies — Stripe
          Checkout's promo-code position — collapsed to one line by default
          so the form never grows for buyers it doesn't apply to. */}
      {discountOffers.length > 0 && (
        <DiscountSection
          offers={discountOffers}
          tierPrice={tierPrice}
          claimed={claimedAudience}
          onChange={setClaimedAudience}
          disabled={submitting}
        />
      )}

      <CheckoutReceipt
        course={course}
        selectedTier={selectedTier}
        subtotal={tierPrice}
        fee={fee}
        total={total}
        isFree={false}
        discount={
          claimedOffer && discountAmount > 0
            ? { label: claimedOffer.label, percent: claimedOffer.percent, amount: discountAmount }
            : null
        }
      />

      <PayButtonDock>
        <PayButtonRow
          total={total}
          submitting={submitting || dropInResolving}
          disabled={!stripe || !elements || payDisabled}
        />
        {sessionError && <p className="text-sm text-danger text-center">{sessionError}</p>}
        {dropInLookupFailed && (
          <p className="text-sm text-danger text-center">Kunne ikke hente neste time. Prøv igjen.</p>
        )}
        {showNoUpcomingDropIn && (
          <p className="text-sm text-danger text-center">Ingen kommende timer for drop-in.</p>
        )}
      </PayButtonDock>
    </form>
  );
}

/**
 * Course identity row — thumbnail + title + schedule/seller line. Sits
 * directly under the title on every state. Unlike the price receipt it
 * doesn't depend on a resolved tier, so it stays visible even in the
 * closed-signup state. `trailing` renders the single-tier low-stock badge
 * (only shown here when there's no Billett section to carry it — see mock's
 * enkeltkurs variant).
 */
export function CheckoutCourseContext({
  course,
  trailing,
  metaOverride,
  metaLoading = false,
}: {
  course: PublicCourseWithDetails;
  trailing?: React.ReactNode;
  /** Replaces the default meta line, e.g. drop-in's «Neste økt: …». */
  metaOverride?: string | null;
  /** True while the override is being resolved (drop-in session lookup). */
  metaLoading?: boolean;
}) {
  const meta = metaOverride ?? buildCheckoutContextMeta(course, course.seller?.name ?? null);
  const img = resolveCourseImage(course);

  return (
    <div className="mt-[18px] flex items-center gap-3">
      <div className="size-11 shrink-0 overflow-hidden rounded-xl bg-muted">
        {img && <img src={img} alt="" className="media-outline size-full object-cover" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-medium text-foreground">{course.title}</p>
        {metaLoading ? (
          <Skeleton className="mt-1 h-[13px] w-44" />
        ) : (
          meta && <MetaLine text={meta} />
        )}
      </div>
      {trailing}
    </div>
  );
}

function ReceiptRow({
  label,
  amount,
  amountClassName,
}: {
  label: string;
  /** Usually a formatted kroner string; the proration deduction passes a
   *  success Badge instead. */
  amount: React.ReactNode;
  amountClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-[3px] text-[14.5px] text-foreground-muted">
      <span>{label}</span>
      <span className={cn('tabular-nums', amountClassName ?? 'text-foreground')}>{amount}</span>
    </div>
  );
}

/**
 * Line-by-line price receipt — hairline rows (no card, no bg fill), the tier
 * price (or the started-course proration pair) muted-label / foreground-
 * amount, Tjenestegebyr fully muted, a top hairline, then the emphasized
 * Totalt row. Matches the mock's `.rcpt` grammar exactly.
 */
export function CheckoutReceipt({
  course,
  selectedTier,
  subtotal,
  fee,
  total,
  isFree,
  discount = null,
}: {
  course: PublicCourseWithDetails;
  selectedTier: AvailableTicketType | null;
  subtotal: number;
  fee: number;
  total: number;
  isFree: boolean;
  /** Claimed honor-system discount — renders its own deduction row. */
  discount?: { label: string; percent: number; amount: number } | null;
}) {
  if (!selectedTier) return null;

  // Started-course edge: the selected tier is the package, prorated down to
  // the remaining weeks. The receipt (not the tier label) carries the story —
  // ordinær pris, a named deduction, the result — so the buyer sees why the
  // total isn't the course's list price.
  const isProrated =
    selectedTier.ticket_kind !== 'drop_in' &&
    course.total_weeks != null &&
    selectedTier.weeks < course.total_weeks;
  const heldCount = isProrated ? course.total_weeks! - selectedTier.weeks : 0;
  const deduction = isProrated ? (course.price ?? 0) - subtotal : 0;

  return (
    <div className="mt-[26px] border-t border-border-subtle pt-3">
      {!isFree && (
        <>
          {isProrated ? (
            <>
              <ReceiptRow label={`${selectedTier.label}, ordinær pris`} amount={formatKroner(course.price ?? 0)} />
              <ReceiptRow
                label={`Fratrekk for ${heldCount} holdte ${heldCount === 1 ? 'økt' : 'økter'}`}
                amount={
                  // The one tinted element in the receipt — the status-pill
                  // grammar (subtle fill + matching ink), rect like table
                  // status badges, so the saving reads as a highlight.
                  <Badge variant="success" shape="rect" size="sm" className="tabular-nums">
                    −{formatKroner(deduction)}
                  </Badge>
                }
              />
            </>
          ) : (
            <ReceiptRow label={selectedTier.label} amount={formatKroner(subtotal)} />
          )}
          {discount && (
            <ReceiptRow
              label={`${discount.label.charAt(0).toUpperCase()}${discount.label.slice(1)}rabatt (−${discount.percent} %)`}
              amount={
                <Badge variant="success" shape="rect" size="sm" className="tabular-nums">
                  −{formatKroner(discount.amount)}
                </Badge>
              }
            />
          )}
          <ReceiptRow label="Tjenestegebyr" amount={formatKroner(fee)} amountClassName="text-foreground-muted" />
        </>
      )}
      <div
        className={cn(
          'flex items-baseline justify-between gap-3 text-base font-medium text-foreground',
          !isFree && 'mt-2 border-t border-border-subtle pt-3',
        )}
      >
        <span>Totalt</span>
        <span className="text-xl tabular-nums">{formatKroner(total)}</span>
      </div>
    </div>
  );
}

/**
 * Billett toggle — the prebuilt SegmentedTabs radiogroup, above the contact
 * form. Only rendered when there's a real choice (main + drop-in); a
 * single-tier course skips this section entirely. Disabled while a payment
 * is being submitted, so the tier can't change mid-confirmation.
 */
export function BillettSection({
  mainTier,
  dropInTier,
  selectedKind,
  onSelect,
  lowStock,
  spotsLeft,
  disabled,
}: {
  mainTier: AvailableTicketType;
  dropInTier: AvailableTicketType;
  selectedKind: TicketId;
  onSelect: (kind: TicketId) => void;
  lowStock: boolean;
  spotsLeft: number;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2.5">
      <p className={FLAB_CLASS}>
        Billett
        {lowStock && (
          <span className="ml-2.5 font-normal tabular-nums text-warning">
            {spotsLeft} {spotsLeft === 1 ? 'plass' : 'plasser'} igjen
          </span>
        )}
      </p>
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
    </div>
  );
}

/** Crossfades the context meta line when its value swaps (billett toggle).
 * A 2px blur masks the text exchange so it reads as one element changing,
 * not two overlapping; transitions (not keyframes) keep rapid toggles
 * interruptible. Honors prefers-reduced-motion. */
function MetaLine({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState(text);
  const [swapping, setSwapping] = useState(false);

  useEffect(() => {
    if (text === displayed) return;
    setSwapping(true);
    const t = window.setTimeout(() => {
      setDisplayed(text);
      setSwapping(false);
    }, 120);
    return () => window.clearTimeout(t);
  }, [text, displayed]);

  return (
    <p
      className={cn(
        'mt-px truncate text-xs text-foreground-muted transition-[opacity,filter] duration-150 ease-out motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:blur-none',
        swapping && 'opacity-0 blur-[2px]',
      )}
    >
      {displayed}
    </p>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="min-h-dvh bg-background">
      <StorefrontHeader />
      <div className="mx-auto max-w-6xl w-full px-4 sm:px-6 lg:px-8 pb-16">
        <div className="mx-auto max-w-[520px] space-y-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-44 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export default CheckoutPage;

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Minus } from '@/lib/icons';
import { EmbeddedPayment } from '@/components/public/course-details/EmbeddedPayment';
import { friendlyError } from '@/lib/error-messages';
import { formatKroner, isValidEmail } from '@/lib/utils';
import { calculateServiceFee, calculateTotalPrice } from '@/lib/pricing';
import { checkCourseAvailability, createFreeSignup } from '@/services/signups';
import { createDinteroSession } from '@/services/checkout';
import { supabase } from '@/lib/supabase';
import type { PublicCourseWithDetails } from '@/services/publicCourses';
import type { AvailableTicketType } from '@/types/database';

const SHORT_WEEKDAYS = ['søn.', 'man.', 'tir.', 'ons.', 'tor.', 'fre.', 'lør.'] as const;

// Builds the meta line above the course title in the booking summary:
// "Kursrekke · ons. kl. 18:00". Count ("X ganger") is intentionally NOT
// here — it lives next to the price as `for X ganger`, anchoring the
// total to what the buyer is paying for.
function buildBookingMeta(course: PublicCourseWithDetails): string | null {
  const parts: string[] = [];
  const typeLabel =
    course.course_type === 'course-series' ? 'Kursrekke'
    : course.course_type === 'online' ? 'Nettkurs'
    : course.course_type === 'event' ? 'Arrangement'
    : null;
  if (typeLabel) parts.push(typeLabel);
  const m = course.time_schedule?.match(/(\d{1,2}:\d{2})/);
  const time = m ? m[1] : null;
  const dateStr = course.next_session?.session_date ?? course.start_date;
  if (course.course_type === 'course-series' && dateStr && time) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) parts.push(`${SHORT_WEEKDAYS[d.getDay()]} kl. ${time}`);
    else parts.push(`kl. ${time}`);
  } else if (time) {
    parts.push(`kl. ${time}`);
  }
  return parts.length ? parts.join(' · ') : null;
}

interface BookingPanelProps {
  course: PublicCourseWithDetails;
  studioSlug: string;
}

interface FormState {
  name: string;
  email: string;
  terms: boolean;
}


/**
 * Booking panel — used as a sticky right rail on desktop and inline on mobile.
 * Three states:
 *  - cancelled / full → status message in place of form
 *  - default → receipt-style summary (course + price breakdown) + form + submit
 *  - dinteroSession active → folded receipt + embedded Dintero iframe
 */
interface UpcomingSession {
  id: string
  session_date: string
  start_time: string
  seatsRemaining: number | null // null = unlimited (course has no max_participants)
}

export function BookingPanel({ course, studioSlug }: BookingPanelProps) {
  const [form, setForm] = useState<FormState>({ name: '', email: '', terms: false });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dinteroSession, setDinteroSession] = useState<{ sid: string; merchantReference: string } | null>(null);
  // All buyable ticket types for this course, plus the user's current pick.
  // Free courses skip this entirely (no ticket type required).
  const [tiers, setTiers] = useState<AvailableTicketType[]>([]);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  // Drop-in flow only: upcoming sessions + the auto-picked session.
  // Drop-in is treated as "I want to come soon" — we auto-select the next
  // available session rather than showing a calendar picker, since the
  // typical case is "this week".
  const [sessions, setSessions] = useState<UpcomingSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const selectedTier = tiers.find(t => t.id === selectedTierId) ?? null;
  const isDropInSelected = selectedTier?.ticket_kind === 'drop_in';
  const hasDropInTier = tiers.some(t => t.ticket_kind === 'drop_in');
  // First session with seats remaining. Used both for the auto-pick when
  // drop-in is selected AND for the date subtext shown inside the drop-in
  // tier card (so the buyer sees what they're committing to before clicking
  // the radio).
  const nextDropInSession =
    sessions.find(s => s.seatsRemaining == null || s.seatsRemaining > 0) ?? null;
  // Drop-in submit is blocked when no session has seats.
  const dropInUnavailable = isDropInSelected && !selectedSessionId;

  // Load tiers via the public RPC (filters out inactive / out-of-window rows).
  useEffect(() => {
    let cancelled = false
    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase.rpc as any)('available_ticket_types', { p_course_id: course.id })
      if (cancelled) return
      const result = (data ?? []) as AvailableTicketType[]
      setTiers(result)
      // Pre-select the explicitly-marked default if it's a non-drop-in tier
      // (drop-in needs a session pick before we can submit). Else first
      // non-drop-in. Else first row (means the only option is drop-in).
      const initial =
        result.find(t => t.is_default && t.ticket_kind !== 'drop_in')
        ?? result.find(t => t.ticket_kind !== 'drop_in')
        ?? result[0]
        ?? null
      setSelectedTierId(initial?.id ?? null)
    })()
    return () => { cancelled = true }
  }, [course.id])

  // Drop-in flow: fetch upcoming sessions whenever the course offers a drop-in
  // tier. We need the date eagerly so the drop-in tier card can show its
  // resolved session date as subtext (helps the buyer see what they're
  // committing to before they click the radio).
  useEffect(() => {
    if (!hasDropInTier) {
      setSessions([])
      setSelectedSessionId(null)
      return
    }
    let cancelled = false
    void (async () => {
      const today = new Date().toISOString().slice(0, 10)
      const { data: sessionRows } = await supabase
        .from('course_sessions')
        .select('id, session_date, start_time, status')
        .eq('course_id', course.id)
        .gte('session_date', today)
        .neq('status', 'cancelled')
        .order('session_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(20)
      if (cancelled || !sessionRows) return

      // Compute seats remaining for each via the per-session count helper.
      // Empty for unlimited (max_participants = null on the course).
      const cap = course.max_participants
      const ids = sessionRows.map(s => (s as { id: string }).id)
      const counts: Record<string, number> = {}
      if (cap != null && ids.length > 0) {
        // RPC count_signups_for_session takes one arg, so we call it per id in
        // parallel. With 20 sessions max this is fine; if it ever becomes a
        // bottleneck we'd add a batched RPC.
        await Promise.all(ids.map(async id => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data } = await (supabase.rpc as any)('count_signups_for_session', { p_course_session_id: id })
          counts[id] = typeof data === 'number' ? data : 0
        }))
      }

      const upcoming: UpcomingSession[] = sessionRows.map(s => {
        const row = s as { id: string; session_date: string; start_time: string }
        return {
          id: row.id,
          session_date: row.session_date,
          start_time: row.start_time,
          seatsRemaining: cap == null ? null : Math.max(0, cap - (counts[row.id] ?? 0)),
        }
      })
      setSessions(upcoming)
      // Pre-select the first session that still has seats.
      const firstAvailable = upcoming.find(s => s.seatsRemaining == null || s.seatsRemaining > 0)
      setSelectedSessionId(firstAvailable?.id ?? null)
    })()
    return () => { cancelled = true }
  }, [hasDropInTier, course.id, course.max_participants])

  const isFull = course.max_participants !== null && course.spots_available <= 0;
  const isFree = !course.price || course.price <= 0;
  const isCancelled = course.status === 'cancelled';

  // Booking is locked when the studio's payment provider isn't set up yet.
  // Free courses bypass the payment provider, so they're never locked.
  // The form still renders so the page looks complete; an overlay above the
  // form blocks interaction and shows "Påmelding åpner snart".
  const paymentReady = isFree || (course.seller?.dintero_onboarding_complete ?? false);
  const lockBooking = !paymentReady;

  // Three-state availability badge: full / low / many.
  // Unlimited capacity (max_participants null) is treated as "many".
  type SpotsState = 'full' | 'low' | 'many';
  const spotsState: SpotsState =
    course.max_participants !== null && course.spots_available <= 0
      ? 'full'
      : course.max_participants !== null &&
        course.spots_available > 0 &&
        course.spots_available <= 3
        ? 'low'
        : 'many';

  // Norwegian: 1 plass / 2+ plasser. Hidden when `spotsState === 'many'`,
  // so the 'many' arm here is unreachable in render.
  const spotsLabel =
    spotsState === 'full'
      ? 'Fullt'
      : spotsState === 'low'
        ? `${course.spots_available} ${course.spots_available === 1 ? 'plass' : 'plasser'} igjen`
        : 'Ledige plasser';

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: false }));
    // Editing the email clears any server-side duplicate-signup message —
    // they're typing, presumably to a different address.
    if (key === 'email' && emailMessage) setEmailMessage(null);
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = true;
    if (!form.email.trim() || !isValidEmail(form.email)) next.email = true;
    if (!form.terms) next.terms = true;
    setErrors(next);
    // Drop-in needs a session — auto-selected, but bail safely if none was
    // available (the disabled submit button should already prevent this).
    return Object.keys(next).length === 0 && !dropInUnavailable;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Belt-and-braces: the overlay already blocks clicks, but a keyboard user
    // could still tab to a (disabled) submit button. Bail before any network call.
    if (lockBooking) return;
    setEmailMessage(null);
    if (!validate()) return;
    setSubmitting(true);

    const { available, error: availError } = await checkCourseAvailability(course.id);
    if (availError) {
      toast.error('Kunne ikke sjekke tilgjengelighet. Prøv igjen.');
      setSubmitting(false);
      return;
    }
    if (available <= 0) {
      toast.error('Kurset er fullt.');
      setSubmitting(false);
      return;
    }

    if (isFree) {
      const { error: signupError } = await createFreeSignup({
        courseId: course.id,
        participantName: form.name.trim(),
        participantEmail: form.email.trim(),
      });
      if (signupError) {
        toast.error(friendlyError(signupError, 'Kunne ikke fullføre påmelding. Prøv igjen.'));
        setSubmitting(false);
        return;
      }
      window.location.href = `/checkout/success?free=true&org=${studioSlug}`;
      return;
    }

    if (!selectedTier) {
      toast.error('Påmelding er ikke tilgjengelig akkurat nå. Prøv igjen om et øyeblikk.');
      setSubmitting(false);
      return;
    }

    const { data: paymentData, error: paymentError, status } = await createDinteroSession({
      courseId: course.id,
      organizationSlug: studioSlug,
      ticketTypeId: selectedTier.id,
      sessionId: isDropInSelected ? selectedSessionId ?? undefined : undefined,
      customerEmail: form.email.trim(),
      customerName: form.name.trim(),
    });
    if (paymentError || !paymentData) {
      // 409 = expected validation rejection (duplicate signup, race-lost full).
      // Pin it to the email field so the user can correct it without a stray toast.
      if (status === 409 && paymentError) {
        setErrors(prev => ({ ...prev, email: true }));
        setEmailMessage(paymentError.message || 'Kunne ikke fullføre påmeldingen.');
      } else {
        toast.error(friendlyError(paymentError, 'Kunne ikke starte betaling. Prøv igjen.'));
      }
      setSubmitting(false);
      return;
    }
    setDinteroSession({ sid: paymentData.sid, merchantReference: paymentData.merchantReference });
    setSubmitting(false);
  }

  const meta = buildBookingMeta(course);
  // Price + label are sourced from the selected tier when paid; for free
  // courses there's no ticket type and we just show "Gratis".
  const tierPrice = selectedTier?.price ?? course.price ?? 0;
  const ticketLabel = selectedTier?.label ?? 'Standard';
  const fee = calculateServiceFee(tierPrice);
  const total = calculateTotalPrice(tierPrice);

  // ── Embedded payment state — receipt summary + Dintero iframe in one card ─
  if (dinteroSession) {
    return (
      <EmbeddedPayment
        sid={dinteroSession.sid}
        courseName={course.title}
        courseMeta={meta}
        ticketLabel={ticketLabel}
        customerName={form.name.trim()}
        customerEmail={form.email.trim()}
        price={tierPrice}
        onPaymentSuccess={(transactionId) => {
          const ref = encodeURIComponent(dinteroSession.merchantReference);
          window.location.href = `/checkout/success?transaction_id=${transactionId}&ref=${ref}&org=${studioSlug}`;
        }}
        onPaymentError={() => {
          // Error is displayed in the EmbeddedPayment component; keep the iframe mounted.
        }}
        onBack={() => setDinteroSession(null)}
      />
    );
  }

  // Shared chrome — single hairline border, no shadow, overflow-hidden so
  // the rounded corners clip the bottom disclosure cleanly.
  const panelClass = 'rounded-lg border border-border bg-card p-6 overflow-hidden';

  // Reused header — meta line above title (12px tabular muted), then 16px
  // semibold title. Spots badge floats top-right.
  const courseHeader = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        {meta && <p className="text-xs text-muted-foreground tabular-nums">{meta}</p>}
        <h3 className="mt-0.5 text-base font-semibold leading-snug text-foreground">{course.title}</h3>
      </div>
      {spotsState === 'low' && (
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-relaxed bg-warning/15 text-warning shrink-0">
          {spotsLabel}
        </span>
      )}
    </div>
  );

  // ── Cancelled ───────────────────────────────────────────────────────────
  if (isCancelled) {
    return (
      <div className={`${panelClass} space-y-4`}>
        {courseHeader}
        <Alert variant="warning" size="sm">
          <AlertDescription>Kurset er avlyst.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // ── Full ────────────────────────────────────────────────────────────────
  if (isFull) {
    return (
      <div className={`${panelClass} space-y-4`}>
        {courseHeader}
        <div className="rounded-md bg-muted/60 px-4 py-3 text-center">
          <p className="text-sm font-medium text-foreground">Kurset er fullt</p>
          <p className="text-xs mt-0.5 text-muted-foreground">Ingen ledige plasser igjen.</p>
        </div>
      </div>
    );
  }

  // ── Default — step 1: receipt summary + name/email + continue ──────────
  return (
    <div className="relative">
    <form id="booking" onSubmit={handleSubmit} className={panelClass}>
      {courseHeader}

      {/* Ticket-type picker — only renders for paid courses with multiple
          buyable tiers. Single-tier courses keep the page clean (the choice
          is implicit). Drop-in tiers always show because they pivot to a
          session picker below. */}
      {!isFree && tiers.length > 1 && (
        <div className="mt-5 border-t border-border pt-4 space-y-2">
          <p className="text-sm font-medium text-foreground">Velg billett</p>
          <div className="space-y-2">
            {tiers.map(tier => {
              const selected = tier.id === selectedTierId;
              const audienceLabel =
                tier.audience === 'student' ? 'Student / ufør / pensjon'
                : tier.audience === 'senior' ? 'Senior'
                : tier.audience === 'staff' ? 'Personale'
                : null;
              const salesEnds = tier.sales_ends_at ? new Date(tier.sales_ends_at) : null;
              const isDropIn = tier.ticket_kind === 'drop_in';
              // Drop-in cards display their resolved next-available session
              // date as subtext — that's what the buyer is committing to,
              // and replaces the redundant "Drop-in" badge that used to sit
              // next to the (already-says-Drop-in) title.
              let dropInDateLine: string | null = null;
              let dropInDisabled = false;
              if (isDropIn) {
                if (sessions.length === 0) {
                  dropInDateLine = null; // sessions still loading or none upcoming
                } else if (!nextDropInSession) {
                  dropInDateLine = 'Ingen ledige timer akkurat nå';
                  dropInDisabled = true;
                } else {
                  const dt = new Date(`${nextDropInSession.session_date}T${nextDropInSession.start_time}`);
                  const dateLabel = dt.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' });
                  const timeLabel = nextDropInSession.start_time.slice(0, 5);
                  const cap = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
                  dropInDateLine = `${cap} · kl. ${timeLabel}`;
                }
              }
              return (
                <label
                  key={tier.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                    selected ? 'border-foreground bg-muted/40 ring-1 ring-inset ring-border' : 'border-border hover:bg-muted/40'
                  } ${dropInDisabled ? 'pointer-events-none opacity-60' : ''}`}
                >
                  <input
                    type="radio"
                    name="ticket-type"
                    className="mt-1 size-4 cursor-pointer"
                    checked={selected}
                    disabled={dropInDisabled}
                    onChange={() => setSelectedTierId(tier.id)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">{tier.label}</span>
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {formatKroner(tier.price)}
                      </span>
                    </div>
                    {dropInDateLine && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{dropInDateLine}</p>
                    )}
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      {audienceLabel && <span>{audienceLabel}</span>}
                      {!isDropIn && tier.weeks ? <span>{tier.weeks} uker</span> : null}
                      {salesEnds && (
                        <span>Tilbud t.o.m. {salesEnds.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long' })}</span>
                      )}
                      {tier.seats_remaining != null && tier.seats_remaining <= 5 && tier.seats_remaining > 0 && (
                        <span className="text-warning">{tier.seats_remaining} igjen</span>
                      )}
                    </div>
                    {tier.description && tier.description !== tier.label && (
                      <p className="mt-1 text-xs text-muted-foreground">{tier.description}</p>
                    )}
                  </div>
                </label>
              )
            })}
          </div>
        </div>
      )}

      {/* The drop-in date now lives inside its tier card as subtext (above)
          — no standalone confirmation card needed. */}

      {/* Price breakdown — surface the all-in total before the CTA so step 2
          carries no surprise charges (EU price-transparency directive). */}
      {!isFree ? (
        <div className="mt-5 border-t border-border pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-foreground">{ticketLabel}</span>
            <span className="tabular-nums text-foreground">{formatKroner(tierPrice)}</span>
          </div>
          {fee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Servicegebyr</span>
              <span className="tabular-nums text-muted-foreground">{formatKroner(fee)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
            <span className="text-foreground">Totalt</span>
            <span className="tabular-nums text-foreground">{formatKroner(total)}</span>
          </div>
        </div>
      ) : (
        <div className="mt-5 border-t border-border pt-4 flex justify-between text-sm font-semibold">
          <span className="text-foreground">Pris</span>
          <span className="tabular-nums text-foreground">Gratis</span>
        </div>
      )}

      {/* Name + email */}
      <div className="mt-5 border-t border-border pt-5 space-y-3">
        <div>
          <label htmlFor="bk-name" className="text-xs font-medium mb-1.5 block text-foreground">
            Navn
          </label>
          <Input
            id="bk-name"
            type="text"
            autoComplete="name"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            aria-invalid={errors.name || undefined}
          />
          {errors.name && <p role="alert" className="text-xs font-medium text-destructive mt-1">Fyll inn navn.</p>}
        </div>

        <div>
          <label htmlFor="bk-email" className="text-xs font-medium mb-1.5 block text-foreground">
            E-post
          </label>
          <Input
            id="bk-email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            aria-invalid={errors.email || undefined}
          />
          {errors.email && (
            <p role="alert" className="text-xs font-medium text-destructive mt-1">
              {emailMessage ?? 'Fyll inn en gyldig e-postadresse.'}
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <div className="flex items-start gap-2.5">
          <Checkbox
            id="bk-terms"
            checked={form.terms}
            onCheckedChange={(v) => updateField('terms', v === true)}
            aria-invalid={errors.terms || undefined}
            className="mt-0.5"
          />
          <label htmlFor="bk-terms" className="text-xs text-muted-foreground leading-relaxed select-none cursor-pointer">
            Jeg godtar{' '}
            <Link to="/terms" target="_blank" className="text-foreground underline underline-offset-2 decoration-muted-foreground/40 hover:decoration-foreground">
              vilkår og angrerett
            </Link>
            .
          </label>
        </div>
        {errors.terms && <p role="alert" className="text-xs font-medium text-destructive">Du må godta vilkårene for å gå videre.</p>}
      </div>

      <Button
        type="submit"
        className="mt-5 w-full"
        size="cta"
        disabled={submitting || lockBooking || dropInUnavailable}
        loading={submitting}
        loadingText={isFree ? 'Melder på' : 'Fortsetter'}
      >
        {isFree ? 'Meld på' : 'Fortsett til betaling'}
      </Button>

      {/* Fine print — collapsible disclosure for cancellation + terms.
          Native <details> so we have full control over icons (+/−) and
          the edge-to-edge border. Negative margins extend it to the
          panel edges; overflow-hidden on the form clips the rounded corners. */}
      <details className="group/disc -mx-6 -mb-6 mt-5 border-t border-border">
        <summary className="flex items-center justify-between px-6 py-3 cursor-pointer text-xs font-medium text-foreground list-none [&::-webkit-details-marker]:hidden">
          <span>Avbestilling og vilkår</span>
          <Plus className="size-3.5 text-muted-foreground group-open/disc:hidden" strokeWidth={2} />
          <Minus className="size-3.5 text-muted-foreground hidden group-open/disc:block" strokeWidth={2} />
        </summary>
        <p className="px-6 pb-4 text-xs leading-relaxed text-muted-foreground">
          Trenger du å avbestille, ta kontakt med studioet. Refusjon avgjøres av studioet fra sak til sak.
        </p>
      </details>

    </form>
    {lockBooking && (
      <div
        className="absolute inset-0 flex items-center justify-center rounded-lg bg-surface-elevated"
        aria-live="polite"
      >
        <div className="rounded-full border border-border bg-background px-5 py-2.5 shadow-sm">
          <p className="text-sm font-medium text-foreground">Påmelding åpner snart</p>
        </div>
      </div>
    )}
    </div>
  );
}

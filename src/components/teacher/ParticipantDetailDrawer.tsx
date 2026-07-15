import { useMemo, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/user-avatar';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatKroner, cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  CalendarX,
  Copy,
  CreditCard,
  Undo2,
  UserCheck,
  UserMinus,
  type LucideIcon,
} from '@/lib/icons';
import type { SignupWithProfile } from '@/services/signups';
import type { PaymentStatus, SignupStatus, TicketAudience } from '@/types/database';

interface ParticipantDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signup: SignupWithProfile | null;
  /** Resolves to `true` on success, `false` on failure — the drawer stays open
   *  on failure so the error toast isn't dismissed with the panel. */
  onCancelEnrollment: (signupId: string, refund: boolean) => Promise<boolean>;
}

type ConfirmKind = 'cancel-no-refund' | 'cancel-with-refund' | 'refund-only' | null;

const AUDIENCE_LABEL: Record<TicketAudience, string> = {
  standard: 'Standard',
  student: 'Student',
  senior: 'Honnør',
  staff: 'Personale',
};

function formatNorwegianShort(input: string | null | undefined): string {
  if (!input) return '';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  const datePart = new Intl.DateTimeFormat('nb-NO', {
    day: 'numeric',
    month: 'short',
  }).format(d);
  const timePart = new Intl.DateTimeFormat('nb-NO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
  return `${datePart} kl. ${timePart}`;
}

// Map `payment_product` slug to a display label. Stripe sets 'stripe';
// 'manual' is the teacher-added path (payment settled off-platform);
// unknown products fall back to a humanised tail segment.
function paymentMethodLabel(product: string | null | undefined): string | null {
  if (!product) return null;
  const map: Record<string, string> = {
    'stripe': 'Kort',
    'manual': 'Utenfor plattformen',
  };
  if (map[product]) return map[product];
  const tail = product.split('.').pop() ?? product;
  return tail.charAt(0).toUpperCase() + tail.slice(1);
}

function ticketLabel(
  kind: SignupWithProfile['ticket_kind_snapshot'],
  audience: SignupWithProfile['ticket_audience_snapshot'],
  labelSnapshot?: string | null,
): string {
  const base =
    kind === 'drop_in'
      ? 'Drop-in'
      : audience && audience !== 'standard'
        ? `Hele kurset – ${AUDIENCE_LABEL[audience].toLowerCase()}`
        : 'Hele kurset';
  // Honor-system discount claim, marked on the label snapshot at charge time
  // (create-stripe-connect-session) — the seller's only trace of the claim.
  const discountMark = labelSnapshot?.match(/– (?:student|pensjonist) \(−\d+ %\)/)?.[0];
  return discountMark ? `${base} ${discountMark}` : base;
}

type ActivityTone = 'success' | 'danger' | 'warning' | 'neutral';

type ActivityEvent = {
  icon: LucideIcon;
  tone: ActivityTone;
  label: string;
  timestamp: string;
};

// Circular node — container + icon share the hue (badge subtle treatment).
const ACTIVITY_TONE: Record<ActivityTone, string> = {
  success: 'bg-success-subtle text-success',
  danger: 'bg-danger-subtle text-danger',
  warning: 'bg-warning-subtle text-warning',
  neutral: 'bg-muted text-foreground-muted',
};

/**
 * Partial refund (price adjustment): money went back but the booking stays
 * confirmed and keeps its spot — must not be presented as a full refund.
 * Exported so the Påmeldte roster (CoursePage) can derive the same signal
 * for SignupStatusBadge — this drawer is the source of truth for "partial".
 */
export function isPartiallyRefunded(signup: SignupWithProfile): boolean {
  return (
    signup.refund_amount != null &&
    signup.amount_paid != null &&
    signup.amount_paid > 0 &&
    signup.refund_amount < signup.amount_paid
  );
}

function buildActivity(signup: SignupWithProfile): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  const isPaid =
    signup.payment_status === 'paid' && !!signup.amount_paid && signup.amount_paid > 0;

  // Stripe checkout creates the signup row *after* capture, so payment and
  // signup confirmation are atomic. Showing them as separate events implies
  // a lifecycle that doesn't exist in our model. Collapse into one truthful
  // finalisation event.
  //
  // A signup is "separable" (signup pre-existed payment) only when paid
  // without a processor transaction id — i.e. teacher used "Merk som betalt"
  // on a row that was pending. Stripe creates the signup atomically at
  // capture, so stripe_payment_intent_id present means atomic payment.
  const paidAtomically =
    isPaid && !!signup.stripe_payment_intent_id;

  // An unsettled payment (pending/failed) must not paint the signup event
  // green — that made problem rows look healthy in the drawer.
  const paymentUnsettled =
    signup.payment_status === 'pending' || signup.payment_status === 'failed';

  // Teacher-added rows never went through checkout — "Påmeldt" would imply
  // the participant signed themselves up.
  const isManual = signup.payment_product === 'manual';

  if (signup.created_at) {
    events.push({
      icon: paidAtomically ? CreditCard : UserCheck,
      tone: paymentUnsettled ? 'neutral' : 'success',
      label: isManual ? 'Lagt til manuelt' : paidAtomically ? 'Påmeldt og betalt' : 'Påmeldt',
      timestamp: formatNorwegianShort(signup.created_at),
    });
  }

  // Separate payment event only when the signup existed before payment —
  // i.e. manually marked paid (no Stripe txn id). updated_at is the
  // teacher's action timestamp in that case.
  if (isPaid && !paidAtomically) {
    events.push({
      icon: CreditCard,
      tone: 'success',
      label: 'Betalt',
      timestamp: formatNorwegianShort(signup.updated_at ?? signup.created_at),
    });
  }

  // A failed charge is an event in its own right — without it the timeline
  // reads as a healthy "Påmeldt" while the roster flags the row. updated_at
  // is the closest timestamp we hold for the failure.
  if (signup.payment_status === 'failed') {
    events.push({
      icon: CreditCard,
      tone: 'danger',
      label: 'Betaling feilet',
      timestamp: formatNorwegianShort(signup.updated_at ?? signup.created_at),
    });
  }

  // Cancellation comes before the refund it triggers, so the refund reads as
  // the most recent event once the list is reversed to newest-first.
  if (signup.status === 'cancelled') {
    events.push({
      icon: UserMinus,
      tone: 'danger',
      label: 'Avbestilt',
      timestamp: formatNorwegianShort(signup.cancelled_at ?? signup.updated_at),
    });
  } else if (signup.status === 'course_cancelled') {
    events.push({
      icon: CalendarX,
      tone: 'warning',
      label: 'Kurs avlyst',
      timestamp: formatNorwegianShort(signup.cancelled_at ?? signup.updated_at),
    });
  }

  if (signup.refunded_at) {
    events.push({
      icon: Undo2,
      tone: 'neutral',
      label: signup.refund_amount
        ? `${isPartiallyRefunded(signup) ? 'Delvis refundert' : 'Refundert'} ${formatKroner(signup.refund_amount)}`
        : 'Refundert',
      timestamp: formatNorwegianShort(signup.refunded_at),
    });
  }

  // Newest first reads more naturally for an activity log.
  return events.reverse();
}

export function ParticipantDetailDrawer({
  open,
  onOpenChange,
  signup,
  onCancelEnrollment,
}: ParticipantDetailDrawerProps) {
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [loading, setLoading] = useState(false);

  const activity = useMemo(
    () => (signup ? buildActivity(signup) : []),
    [signup],
  );

  if (!signup) return null;

  const name = signup.participant_name || signup.profile?.name || 'Ukjent';
  const email = signup.participant_email || signup.profile?.email || '';
  const phone = signup.participant_phone || '';
  const status = signup.status as SignupStatus;
  const paymentStatus = signup.payment_status as PaymentStatus;
  const isCancelled = status === 'cancelled' || status === 'course_cancelled';
  const isPaid =
    paymentStatus === 'paid' && signup.amount_paid != null && signup.amount_paid > 0;
  // Refundable when paid through Stripe (stripe_payment_intent_id present).
  const canRefund =
    isPaid && !!signup.stripe_payment_intent_id;
  // Footer renders when there's something to do: an active signup always has a
  // cancel action; a cancelled one only when there's still money to refund.
  const hasActions = !isCancelled || canRefund;

  // Manual adds settle off-platform — we don't know what actually changed
  // hands, so showing the tier price as "Beløp" would claim a transaction
  // the platform never processed. The Metode row carries the story instead.
  const isManual = signup.payment_product === 'manual';
  const expectedPrice = isManual
    ? null
    : signup.amount_paid != null ? signup.amount_paid : signup.ticket_type?.price ?? null;
  // Partially refunded bookings stay confirmed and keep their spot — don't
  // strike the price or present them as fully refunded.
  const isPartialRefund = paymentStatus === 'refunded' && isPartiallyRefunded(signup);
  const priceStrike = paymentStatus === 'refunded' && !isPartialRefund;
  // 'external' only exists on historical rows from the deleted off-platform
  // path — surface it as the payment method rather than a processor label.
  const paymentMethod =
    paymentStatus === 'external'
      ? 'Avtales direkte'
      : paymentMethodLabel(signup.payment_product);

  const runAction = async (fn: () => Promise<boolean>) => {
    setLoading(true);
    try {
      // Only dismiss the confirm dialog + drawer when the action succeeded —
      // a failed refund keeps them open so the teacher can retry.
      const ok = await fn();
      if (ok) {
        setConfirmKind(null);
        onOpenChange(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (value: string, kind: 'e-post' | 'telefonnummer') => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${kind === 'e-post' ? 'E-post' : 'Telefonnummer'} kopiert`);
    } catch {
      toast.error('Kunne ikke kopiere');
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="p-0 gap-0 bg-background"
          // Read-only detail panel: keep focus on the row that opened it rather
          // than auto-focusing the first copy button (which would ring the email).
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Header — identity + status at a glance. Close X is provided by SheetContent. */}
          <SheetHeader className="gap-0 border-b border-border-subtle px-6 py-5">
            <SheetTitle className="sr-only">Deltakerdetaljer</SheetTitle>
            <SheetDescription className="sr-only">
              Betaling, kontaktinfo og aktivitet for {name}.
            </SheetDescription>
            {/* Identity only — current state is carried by the Betaling section
                and the activity timeline, not a redundant header badge. */}
            <div className="flex items-center gap-3 pr-10">
              <UserAvatar name={name} email={email} size="lg" />
              <p className="min-w-0 flex-1 truncate text-lg font-medium text-foreground leading-snug">
                {name}
              </p>
            </div>
          </SheetHeader>

          {/* Scrollable body — flat groups divided by hairline rules, no nested cards */}
          <div className="flex-1 divide-y divide-border-subtle overflow-y-auto px-6">
            <DetailGroup title="Betaling">
              <dl className="space-y-2.5">
                {/* Exception states only — settled payments stay silent here
                    (the amount/method rows + timeline carry the happy path).
                    Without this row the drawer read as healthy while the
                    roster flagged the same signup. */}
                {(paymentStatus === 'pending' || paymentStatus === 'failed') && (
                  <Row
                    label="Status"
                    value={
                      <Badge
                        variant={paymentStatus === 'failed' ? 'destructive' : 'warning'}
                        shape="rect"
                        size="sm"
                      >
                        {paymentStatus === 'failed' ? 'Betaling feilet' : 'Venter på betaling'}
                      </Badge>
                    }
                  />
                )}
                <Row
                  label="Billett"
                  value={ticketLabel(
                    signup.ticket_kind_snapshot,
                    signup.ticket_audience_snapshot,
                    signup.ticket_label_snapshot,
                  )}
                />
                {expectedPrice != null && (
                  <Row
                    label="Beløp"
                    value={
                      <span
                        className={cn(
                          'tabular-nums',
                          priceStrike &&
                            'text-foreground-muted line-through decoration-foreground-muted/60',
                        )}
                      >
                        {expectedPrice > 0 ? formatKroner(expectedPrice) : 'Gratis'}
                      </span>
                    }
                  />
                )}
                {paymentMethod && <Row label="Metode" value={paymentMethod} />}
                {signup.refund_amount != null && signup.refund_amount > 0 && (
                  <Row
                    label="Refundert"
                    value={
                      <span className="tabular-nums text-foreground-muted">
                        {formatKroner(signup.refund_amount)}
                      </span>
                    }
                  />
                )}
              </dl>
            </DetailGroup>

            {(email || phone) && (
              <DetailGroup title="Kontakt">
                <dl className="space-y-2.5">
                  {email && (
                    <CopyRow
                      label="E-post"
                      value={email}
                      onCopy={() => copyToClipboard(email, 'e-post')}
                    />
                  )}
                  {phone && (
                    <CopyRow
                      label="Telefon"
                      value={phone}
                      onCopy={() => copyToClipboard(phone, 'telefonnummer')}
                    />
                  )}
                </dl>
              </DetailGroup>
            )}

            {signup.note && (
              // On manual adds the note is the teacher's own, not the participant's.
              <DetailGroup title={isManual ? 'Notat' : 'Notat fra deltakeren'}>
                <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
                  {signup.note}
                </p>
              </DetailGroup>
            )}

            {activity.length > 0 && (
              <DetailGroup title="Aktivitet">
                <ol>
                  {activity.map((event, idx) => {
                    const Icon = event.icon;
                    const isLast = idx === activity.length - 1;
                    return (
                      <li key={idx} className="relative flex items-center gap-3 pb-4 last:pb-0">
                        {/* Connector — links this node down to the next event */}
                        {!isLast && (
                          <span
                            aria-hidden="true"
                            className="absolute bottom-0 left-[11.5px] top-6 w-px bg-border"
                          />
                        )}
                        <span
                          aria-hidden="true"
                          className={cn(
                            'flex size-6 shrink-0 items-center justify-center rounded-full',
                            ACTIVITY_TONE[event.tone],
                          )}
                        >
                          <Icon className="size-3.5" />
                        </span>
                        <div className="flex min-w-0 flex-1 items-baseline justify-between gap-4">
                          <span className="text-base text-foreground">{event.label}</span>
                          <span className="shrink-0 whitespace-nowrap text-sm tabular-nums text-foreground-muted">
                            {event.timestamp}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </DetailGroup>
            )}
          </div>

          {/* Footer — direct actions (≤2): recommended action primary, the
              alternative secondary. Destructive emphasis lives in the dialog. */}
          {hasActions && (
            <SheetFooter className="border-t border-border-subtle px-6 py-4">
              {isCancelled ? (
                <Button
                  className="w-full"
                  disabled={loading}
                  onClick={() => setConfirmKind('refund-only')}
                >
                  Refunder beløp
                </Button>
              ) : canRefund ? (
                // Paid via card: cancel with or without refund.
                <>
                  <Button
                    className="w-full"
                    disabled={loading}
                    onClick={() => setConfirmKind('cancel-with-refund')}
                  >
                    Avbestill og refunder
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full"
                    disabled={loading}
                    onClick={() => setConfirmKind('cancel-no-refund')}
                  >
                    Avbestill uten refusjon
                  </Button>
                </>
              ) : (
                // Free / non-card active signup: only cancel (solo → primary).
                <Button
                  className="w-full"
                  disabled={loading}
                  onClick={() => setConfirmKind('cancel-no-refund')}
                >
                  Avbestill
                </Button>
              )}
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmKind === 'cancel-no-refund'}
        onOpenChange={(o) => !o && !loading && setConfirmKind(null)}
        title="Avbestill påmelding"
        body={
          isPaid
            ? <><strong>{name}</strong> avbestilles uten refusjon.</>
            : <><strong>{name}</strong> avbestilles og plassen frigjøres.</>
        }
        actionLabel="Avbestill"
        cancelLabel="Behold"
        destructive
        loading={loading}
        loadingText="Avbestiller"
        onConfirm={() => runAction(() => onCancelEnrollment(signup.id, false))}
      />

      <ConfirmDialog
        open={confirmKind === 'cancel-with-refund'}
        onOpenChange={(o) => !o && !loading && setConfirmKind(null)}
        title="Avbestill og refunder"
        body={<><strong>{name}</strong> avbestilles og refunderes <strong>{formatKroner(signup.amount_paid ?? 0)}</strong>.</>}
        actionLabel="Avbestill og refunder"
        cancelLabel="Behold"
        destructive
        loading={loading}
        loadingText="Refunderer"
        onConfirm={() => runAction(() => onCancelEnrollment(signup.id, true))}
      />

      <ConfirmDialog
        open={confirmKind === 'refund-only'}
        onOpenChange={(o) => !o && !loading && setConfirmKind(null)}
        title="Refunder beløp"
        body={<><strong>{name}</strong> refunderes <strong>{formatKroner(signup.amount_paid ?? 0)}</strong>.</>}
        actionLabel="Refunder"
        destructive
        loading={loading}
        loadingText="Refunderer"
        // Reuse cancel-enrollment with refund=true; the edge function detects
        // the already-cancelled state and processes refund-only without
        // changing the signup status.
        onConfirm={() => runAction(() => onCancelEnrollment(signup.id, true))}
      />

    </>
  );
}

function DetailGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-5">
      <h3 className="mb-3 text-base font-medium text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-sm text-foreground-muted">{label}</dt>
      <dd className="min-w-0 break-words text-right text-base text-foreground">{value}</dd>
    </div>
  );
}

// Contact row whose value is itself the copy affordance — a trailing copy icon
// reveals on hover. Keeps high-impact actions in the footer menu and makes
// email/phone copyable in one tap, right where they're shown.
function CopyRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-sm text-foreground-muted">{label}</dt>
      <button
        type="button"
        onClick={onCopy}
        aria-label={`Kopier ${label.toLowerCase()}`}
        className="group flex min-w-0 items-center gap-1.5 text-right text-base text-foreground"
      >
        <span className="truncate">{value}</span>
        <Copy className="size-4 shrink-0 text-foreground-muted transition-colors group-hover:text-foreground" />
      </button>
    </div>
  );
}

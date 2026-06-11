import { useMemo, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { PaymentBadge } from '@/components/ui/payment-badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatKroner, cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Calendar,
  CalendarPlus,
  Copy,
  CreditCard,
  Mail,
  Phone,
  RefreshCw,
  Ticket,
  Wallet,
  XCircle,
  type LucideIcon,
} from '@/lib/icons';
import type { SignupWithProfile } from '@/services/signups';
import type { PaymentStatus, SignupStatus, TicketAudience } from '@/types/database';

interface ParticipantDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signup: SignupWithProfile | null;
  /** Used in confirm dialog scopes (cancel/refund) for context. */
  courseTitle: string;
  onCancelEnrollment: (signupId: string, refund: boolean) => Promise<void>;
  onMarkResolved: (signupId: string) => Promise<void>;
}

type ConfirmKind = 'cancel-no-refund' | 'cancel-with-refund' | 'refund-only' | 'resolve' | null;

const AUDIENCE_LABEL: Record<TicketAudience, string> = {
  standard: 'Standard',
  student: 'Student',
  senior: 'Honnør',
  staff: 'Personale',
};

function formatNorwegianDateTime(input: string | null | undefined): string {
  if (!input) return '';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  const datePart = new Intl.DateTimeFormat('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d);
  const timePart = new Intl.DateTimeFormat('nb-NO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
  return `${datePart} kl. ${timePart}`;
}

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
  return `${datePart}, kl. ${timePart}`;
}

// Map Dintero's `payment_product` slug (e.g. `payex.creditcard`, `vipps.vipps`)
// to a display label. Unknown products fall back to a humanised tail segment
// so new Dintero offerings don't render as blank.
function paymentMethodLabel(product: string | null | undefined): string | null {
  if (!product) return null;
  const map: Record<string, string> = {
    'vipps.vipps': 'Vipps',
    'payex.creditcard': 'Kort',
    'payex.visa': 'Visa',
    'payex.mastercard': 'Mastercard',
    'payex.applepay': 'Apple Pay',
    'payex.googlepay': 'Google Pay',
    'payex.swish': 'Swish',
    'instabank.finance': 'Instabank',
    'instabank.invoice': 'Instabank faktura',
    'instabank.installment': 'Instabank delbetaling',
    'collectorbank.invoice': 'Walley faktura',
    'collectorbank.partpayment': 'Walley delbetaling',
  };
  if (map[product]) return map[product];
  const tail = product.split('.').pop() ?? product;
  return tail.charAt(0).toUpperCase() + tail.slice(1);
}

function ticketLabel(
  kind: SignupWithProfile['ticket_kind_snapshot'],
  audience: SignupWithProfile['ticket_audience_snapshot'],
): string {
  if (kind === 'drop_in') return 'Drop-in';
  if (audience && audience !== 'standard') {
    return `Kursrekke — ${AUDIENCE_LABEL[audience].toLowerCase()}`;
  }
  return 'Kursrekke';
}

type ActivityEvent = {
  icon: LucideIcon;
  label: string;
  timestamp: string;
};

function buildActivity(signup: SignupWithProfile): ActivityEvent[] {
  const events: ActivityEvent[] = [];

  const isPaid =
    signup.payment_status === 'paid' && !!signup.amount_paid && signup.amount_paid > 0;

  // Dintero embedded checkout creates the signup row *after* capture, so
  // payment and signup confirmation are atomic. Showing them as separate
  // events implies a lifecycle that doesn't exist in our model. Collapse
  // into one truthful finalisation event.
  //
  // A signup is "separable" (signup pre-existed payment) only when paid
  // without a Dintero transaction id — i.e. teacher used "Merk som betalt"
  // on a row that was pending. Payment-link flows are rare enough that
  // joining payment_attempts to detect them isn't worth the cost.
  const paidAtomically = isPaid && !!signup.dintero_transaction_id;

  if (signup.created_at) {
    events.push({
      icon: paidAtomically ? CreditCard : CalendarPlus,
      label: paidAtomically
        ? 'Betaling mottatt og påmelding bekreftet'
        : 'Påmelding bekreftet',
      timestamp: formatNorwegianShort(signup.created_at),
    });
  }

  // Separate payment event only when the signup existed before payment —
  // i.e. manually marked paid (no Dintero txn id). updated_at is the
  // teacher's action timestamp in that case.
  if (isPaid && !paidAtomically) {
    events.push({
      icon: CreditCard,
      label: 'Betaling mottatt',
      timestamp: formatNorwegianShort(signup.updated_at ?? signup.created_at),
    });
  }

  if (signup.refunded_at) {
    events.push({
      icon: RefreshCw,
      label: signup.refund_amount
        ? `Refundert · ${formatKroner(signup.refund_amount)}`
        : 'Refundert',
      timestamp: formatNorwegianShort(signup.refunded_at),
    });
  }

  if (signup.status === 'cancelled') {
    events.push({
      icon: XCircle,
      label: 'Påmelding avbestilt',
      timestamp: formatNorwegianShort(signup.cancelled_at ?? signup.updated_at),
    });
  } else if (signup.status === 'course_cancelled') {
    events.push({
      icon: XCircle,
      label: 'Kurs avlyst',
      timestamp: formatNorwegianShort(signup.cancelled_at ?? signup.updated_at),
    });
  }

  // Newest first reads more naturally for an activity log.
  return events.reverse();
}

export function ParticipantDetailDrawer({
  open,
  onOpenChange,
  signup,
  courseTitle,
  onCancelEnrollment,
  onMarkResolved,
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
  const canRefund = isPaid && !!signup.dintero_transaction_id;
  const canMarkResolved =
    paymentStatus === 'pending' || paymentStatus === 'failed' || paymentStatus === 'external';
  // The action menu now holds only high-impact actions (copy moved inline onto the
  // contact rows). A cancelled signup with nothing to refund has none — disable.
  const hasActions = !isCancelled || canRefund;

  const expectedPrice =
    signup.amount_paid != null ? signup.amount_paid : signup.ticket_type?.price ?? null;
  const priceStrike = paymentStatus === 'refunded';
  const paymentMethod = paymentMethodLabel(signup.payment_product);
  const signupLabel = status === 'cancelled' ? 'Avbestilt' : undefined;
  const paymentLabel =
    paymentStatus === 'pending'
      ? 'Venter'
      : paymentStatus === 'failed'
        ? 'Mislykket'
        : undefined;

  const runAction = async (fn: () => Promise<void>) => {
    setLoading(true);
    try {
      await fn();
      setConfirmKind(null);
      onOpenChange(false);
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
        <SheetContent side="right" className="sm:max-w-[440px] p-0 gap-0 bg-background">
          {/* Header — avatar + identity. Close X is provided by SheetContent. */}
          <SheetHeader className="px-6 py-5 border-b border-border-subtle">
            <SheetTitle className="sr-only">Deltakerdetaljer</SheetTitle>
            <div className="flex items-start gap-3 pr-10">
              <UserAvatar name={name} email={email} size="lg" />
              <div className="min-w-0 pt-0.5">
                <p className="text-base font-medium tracking-tight text-foreground leading-snug truncate">
                  {name}
                </p>
                {email && (
                  <p className="text-sm text-foreground-muted truncate mt-0.5">{email}</p>
                )}
              </div>
            </div>
          </SheetHeader>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
            {/* Status mini-cards */}
            <div className="grid grid-cols-2 gap-3">
              <StatusTile label="Påmelding">
                <StatusBadge status={status} customLabel={signupLabel} />
              </StatusTile>
              <StatusTile label="Betaling">
                <PaymentBadge status={paymentStatus} customLabel={paymentLabel} visibility="always" />
              </StatusTile>
            </div>

            {/* Detail card — sections divided by hairline rules */}
            <div className="rounded-xl border border-border bg-surface divide-y divide-border-subtle">
              <Section title="Påmeldingsdetaljer">
                <DetailRow
                  icon={Calendar}
                  label="Påmeldt"
                  value={formatNorwegianDateTime(signup.created_at)}
                />
                <DetailRow
                  icon={Ticket}
                  label="Billett"
                  value={ticketLabel(signup.ticket_kind_snapshot, signup.ticket_audience_snapshot)}
                />
              </Section>

              {expectedPrice != null && (
                <Section title="Betaling">
                  <DetailRow
                    icon={Wallet}
                    label="Beløp"
                    value={
                      <span
                        className={cn(
                          'tabular-nums font-medium text-foreground',
                          priceStrike &&
                            'text-foreground-muted line-through decoration-foreground-muted/60',
                        )}
                      >
                        {expectedPrice > 0 ? formatKroner(expectedPrice) : 'Gratis'}
                      </span>
                    }
                  />
                  {paymentMethod && (
                    <DetailRow
                      icon={CreditCard}
                      label="Metode"
                      value={paymentMethod}
                    />
                  )}
                  {signup.refund_amount != null && signup.refund_amount > 0 && (
                    <DetailRow
                      icon={RefreshCw}
                      label="Refundert"
                      value={
                        <span className="tabular-nums text-foreground-muted">
                          {formatKroner(signup.refund_amount)}
                        </span>
                      }
                    />
                  )}
                </Section>
              )}

              {(email || phone) && (
                <Section title="Kontakt">
                  {email && (
                    <CopyRow
                      icon={Mail}
                      label="E-post"
                      value={email}
                      onCopy={() => copyToClipboard(email, 'e-post')}
                    />
                  )}
                  {phone && (
                    <CopyRow
                      icon={Phone}
                      label="Telefon"
                      value={phone}
                      onCopy={() => copyToClipboard(phone, 'telefonnummer')}
                    />
                  )}
                </Section>
              )}

              {signup.note && (
                <Section title="Notat fra deltakeren">
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {signup.note}
                  </p>
                </Section>
              )}
            </div>

            {/* Activity log */}
            {activity.length > 0 && (
              <div className="rounded-xl border border-border bg-surface p-5">
                <h3 className="text-sm font-medium text-foreground mb-4">Aktivitetslogg</h3>
                <ol className="space-y-3.5">
                  {activity.map((event, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span
                        className="size-7 rounded-full bg-muted text-foreground-muted flex items-center justify-center shrink-0"
                        aria-hidden="true"
                      >
                        <event.icon className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-sm text-foreground leading-tight">{event.label}</p>
                        <p className="text-xs text-foreground-muted mt-1">{event.timestamp}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          {/* Footer — single dropdown trigger */}
          <SheetFooter className="px-6 py-4 border-t border-border-subtle">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="w-full"
                  disabled={loading || !hasActions}
                >
                  Handlinger
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                side="top"
                sideOffset={8}
                className="w-[var(--radix-dropdown-menu-trigger-width)]"
              >
                {!isCancelled && canMarkResolved && (
                  <DropdownMenuItem onSelect={() => setConfirmKind('resolve')}>
                    Merk som betalt
                  </DropdownMenuItem>
                )}

                {!isCancelled && canRefund && (
                  <DropdownMenuItem onSelect={() => setConfirmKind('cancel-with-refund')}>
                    Avbestill og refunder
                  </DropdownMenuItem>
                )}

                {isCancelled && canRefund && (
                  <DropdownMenuItem onSelect={() => setConfirmKind('refund-only')}>
                    Refunder beløp
                  </DropdownMenuItem>
                )}

                {!isCancelled && (
                  <>
                    {(canMarkResolved || canRefund) && <DropdownMenuSeparator />}
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() => setConfirmKind('cancel-no-refund')}
                    >
                      Avbestill påmelding
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmKind === 'cancel-no-refund'}
        onOpenChange={(o) => !o && !loading && setConfirmKind(null)}
        ariaLabel="Avbestill påmelding"
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
        loadingText="Avbestiller…"
        onConfirm={() => runAction(() => onCancelEnrollment(signup.id, false))}
      />

      <ConfirmDialog
        open={confirmKind === 'cancel-with-refund'}
        onOpenChange={(o) => !o && !loading && setConfirmKind(null)}
        ariaLabel="Avbestill og refunder"
        title="Avbestill og refunder"
        body={<><strong>{name}</strong> avbestilles og refunderes <strong>{formatKroner(signup.amount_paid ?? 0)}</strong>.</>}
        actionLabel="Avbestill og refunder"
        cancelLabel="Behold"
        destructive
        loading={loading}
        loadingText="Refunderer…"
        onConfirm={() => runAction(() => onCancelEnrollment(signup.id, true))}
      />

      <ConfirmDialog
        open={confirmKind === 'refund-only'}
        onOpenChange={(o) => !o && !loading && setConfirmKind(null)}
        ariaLabel="Refunder beløp"
        title="Refunder beløp"
        body={<><strong>{name}</strong> refunderes <strong>{formatKroner(signup.amount_paid ?? 0)}</strong>.</>}
        actionLabel="Refunder"
        destructive
        loading={loading}
        loadingText="Refunderer…"
        // Reuse cancel-enrollment with refund=true; the edge function detects
        // the already-cancelled state and processes refund-only without
        // changing the signup status.
        onConfirm={() => runAction(() => onCancelEnrollment(signup.id, true))}
      />

      <ConfirmDialog
        open={confirmKind === 'resolve'}
        onOpenChange={(o) => !o && !loading && setConfirmKind(null)}
        ariaLabel="Merk som betalt"
        title="Merk som betalt"
        body={<><strong>{name}</strong> markeres som betalt for <strong>{courseTitle}</strong>.</>}
        actionLabel="Merk som betalt"
        loading={loading}
        loadingText="Lagrer…"
        onConfirm={() => runAction(() => onMarkResolved(signup.id))}
      />
    </>
  );
}

function StatusTile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h3 className="text-sm font-medium text-foreground">{label}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="p-5">
      <h3 className="text-sm font-medium text-foreground mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="size-4 text-foreground-muted shrink-0 mt-0.5" aria-hidden="true" />
      <dt className="text-sm text-foreground-muted shrink-0">{label}</dt>
      <dd className="text-sm text-foreground ml-auto text-right min-w-0 break-words">
        {value}
      </dd>
    </div>
  );
}

// Contact row whose value is itself the copy affordance — a trailing copy icon
// reveals on hover. Keeps high-impact actions in the footer menu and makes
// email/phone copyable in one tap, right where they're shown.
function CopyRow({
  icon: Icon,
  label,
  value,
  onCopy,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="size-4 text-foreground-muted shrink-0 mt-0.5" aria-hidden="true" />
      <dt className="text-sm text-foreground-muted shrink-0">{label}</dt>
      <button
        type="button"
        onClick={onCopy}
        aria-label={`Kopier ${label.toLowerCase()}`}
        className="group ml-auto flex min-w-0 items-center gap-1.5 text-right text-sm text-foreground"
      >
        <span className="truncate">{value}</span>
        <Copy className="size-3.5 shrink-0 text-foreground-muted transition-colors group-hover:text-foreground" />
      </button>
    </div>
  );
}

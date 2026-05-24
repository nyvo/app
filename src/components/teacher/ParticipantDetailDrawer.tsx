import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge, type badgeVariants } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import type { VariantProps } from 'class-variance-authority';
import { ConfirmDialog, ConfirmScopeItem } from '@/components/ui/confirm-dialog';
import { formatKroner, cn } from '@/lib/utils';
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

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

// Signup status — only the signup lifecycle, no payment info.
function signupBadge(status: SignupStatus): { label: string; variant: BadgeVariant } {
  if (status === 'cancelled') return { label: 'Avbestilt', variant: 'neutral' };
  if (status === 'course_cancelled') return { label: 'Kurs avlyst', variant: 'warning' };
  return { label: 'Påmeldt', variant: 'success' };
}

// Payment status — only the money state, no signup context.
function paymentBadge(status: PaymentStatus): { label: string; variant: BadgeVariant } {
  if (status === 'paid') return { label: 'Betalt', variant: 'success' };
  if (status === 'pending') return { label: 'Venter', variant: 'warning' };
  if (status === 'failed') return { label: 'Mislykket', variant: 'destructive' };
  return { label: 'Refundert', variant: 'neutral' };
}

function ticketLabel(
  kind: SignupWithProfile['ticket_kind_snapshot'],
  audience: SignupWithProfile['ticket_audience_snapshot'],
): string {
  if (kind === 'drop_in') return 'Drop-in';
  // Package — append audience qualifier only when notable.
  if (audience && audience !== 'standard') {
    return `Kursrekke — ${AUDIENCE_LABEL[audience].toLowerCase()}`;
  }
  return 'Kursrekke';
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

  if (!signup) return null;

  const name = signup.participant_name || signup.profile?.name || 'Ukjent';
  const email = signup.participant_email || signup.profile?.email || '';
  const status = signup.status as SignupStatus;
  const paymentStatus = signup.payment_status as PaymentStatus;
  const isCancelled = status === 'cancelled' || status === 'course_cancelled';
  const isPaid =
    paymentStatus === 'paid' && signup.amount_paid != null && signup.amount_paid > 0;
  const canRefund = isPaid && !!signup.dintero_transaction_id;
  const canMarkResolved = paymentStatus === 'pending' || paymentStatus === 'failed';

  // Expected price: actual amount paid when present, else ticket type list price.
  // Same logic as the table — keeps display amount stable across states.
  const expectedPrice =
    signup.amount_paid != null ? signup.amount_paid : signup.ticket_type?.price ?? null;
  // Strike-through only when the money is actually gone (refunded). A cancelled
  // signup with kept payment is NOT struck — the studio still has that money.
  const priceStrike = paymentStatus === 'refunded';

  const runAction = async (fn: () => Promise<void>) => {
    setLoading(true);
    try {
      await fn();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="sm:max-w-[440px] p-0 gap-0">
          <SheetHeader className="px-6 py-5 border-b border-border-subtle">
            <SheetTitle className="sr-only">Deltakerdetaljer</SheetTitle>
            <div className="flex items-center gap-3">
              <UserAvatar name={name} email={email} size="lg" />
              <div className="min-w-0">
                <p className="text-lg font-medium tracking-tight text-foreground leading-tight truncate">
                  {name}
                </p>
                <p className="text-base text-foreground-muted truncate mt-0.5">{email}</p>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <dl className="space-y-1">
              <DetailRow label="Påmeldt" value={formatNorwegianDateTime(signup.created_at)} />
              <DetailRow
                label="Billett"
                value={ticketLabel(signup.ticket_kind_snapshot, signup.ticket_audience_snapshot)}
              />
              <DetailRow
                label="Påmelding"
                value={
                  (() => {
                    const b = signupBadge(status);
                    return <Badge variant={b.variant} shape="pill" size="sm">{b.label}</Badge>;
                  })()
                }
              />
              <DetailRow
                label="Betaling"
                value={
                  (() => {
                    const b = paymentBadge(paymentStatus);
                    return <Badge variant={b.variant} shape="pill" size="sm">{b.label}</Badge>;
                  })()
                }
              />
              {expectedPrice != null && (
                <DetailRow
                  label="Beløp"
                  value={
                    <span
                      className={cn(
                        'tabular-nums font-medium',
                        priceStrike && 'text-foreground-muted line-through decoration-foreground-muted/60',
                      )}
                    >
                      {expectedPrice > 0 ? formatKroner(expectedPrice) : 'Gratis'}
                    </span>
                  }
                />
              )}
            </dl>

            {signup.note && (
              <div className="mt-6 pt-5 border-t border-border-subtle">
                <p className="text-sm text-foreground-muted mb-2">Notat fra deltakeren</p>
                <div className="rounded-md bg-muted px-3 py-2.5">
                  <p className="text-base text-foreground whitespace-pre-wrap leading-relaxed">
                    {signup.note}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer renders when there's anything actionable. A cancelled
              signup with kept payment is actionable (refund-only). */}
          {(!isCancelled || canRefund) && (
            <SheetFooter className="flex-col gap-2 px-6 py-4 border-t border-border-subtle sm:flex-col">
              {!isCancelled && canMarkResolved && (
                <Button
                  size="sm"
                  className="w-full"
                  disabled={loading}
                  onClick={() => setConfirmKind('resolve')}
                >
                  Merk som betalt
                </Button>
              )}
              {!isCancelled && canRefund && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={loading}
                  onClick={() => setConfirmKind('cancel-with-refund')}
                >
                  Avbestill og refunder
                </Button>
              )}
              {isCancelled && canRefund && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={loading}
                  onClick={() => setConfirmKind('refund-only')}
                >
                  Refunder beløp
                </Button>
              )}
              {!isCancelled && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-danger hover:text-danger"
                disabled={loading}
                onClick={() => setConfirmKind('cancel-no-refund')}
              >
                Avbestill påmelding
              </Button>
              )}
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirm: cancel without refund */}
      <ConfirmDialog
        open={confirmKind === 'cancel-no-refund'}
        onOpenChange={(o) => !o && setConfirmKind(null)}
        ariaLabel="Avbestill påmelding"
        headline={
          isPaid ? 'Avbestill påmeldingen uten refusjon?' : 'Avbestill påmeldingen?'
        }
        scope={
          <ConfirmScopeItem
            name={name}
            meta={email}
            trailing={isPaid && signup.amount_paid != null ? formatKroner(signup.amount_paid) : undefined}
          />
        }
        actionLabel="Avbestill"
        onConfirm={() => {
          setConfirmKind(null);
          runAction(() => onCancelEnrollment(signup.id, false));
        }}
      />

      {/* Confirm: cancel + refund (active signup) */}
      <ConfirmDialog
        open={confirmKind === 'cancel-with-refund'}
        onOpenChange={(o) => !o && setConfirmKind(null)}
        ariaLabel="Avbestill og refunder"
        headline="Avbestill og refunder?"
        scope={
          <ConfirmScopeItem
            name={name}
            meta={email}
            trailing={signup.amount_paid != null ? formatKroner(signup.amount_paid) : undefined}
          />
        }
        actionLabel="Avbestill og refunder"
        onConfirm={() => {
          setConfirmKind(null);
          runAction(() => onCancelEnrollment(signup.id, true));
        }}
      />

      {/* Confirm: refund only (already-cancelled signup with kept payment) */}
      <ConfirmDialog
        open={confirmKind === 'refund-only'}
        onOpenChange={(o) => !o && setConfirmKind(null)}
        ariaLabel="Refunder beløp"
        headline="Refunder beløpet?"
        scope={
          <ConfirmScopeItem
            name={name}
            meta={email}
            trailing={signup.amount_paid != null ? formatKroner(signup.amount_paid) : undefined}
          />
        }
        actionLabel="Refunder"
        onConfirm={() => {
          setConfirmKind(null);
          // Reuse the cancel-enrollment service with refund=true; the edge
          // function detects the already-cancelled state and processes
          // refund-only without changing the signup status.
          runAction(() => onCancelEnrollment(signup.id, true));
        }}
      />

      {/* Confirm: mark resolved */}
      <ConfirmDialog
        open={confirmKind === 'resolve'}
        onOpenChange={(o) => !o && setConfirmKind(null)}
        ariaLabel="Merk som betalt"
        headline="Merk påmeldingen som betalt?"
        scope={
          <ConfirmScopeItem
            name={name}
            meta={`${email} · ${courseTitle}`}
          />
        }
        actionLabel="Merk som betalt"
        onConfirm={() => {
          setConfirmKind(null);
          runAction(() => onMarkResolved(signup.id));
        }}
      />
    </>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="text-base text-foreground-muted">{label}</dt>
      <dd className="text-base text-foreground text-right capitalize-first">{value}</dd>
    </div>
  );
}

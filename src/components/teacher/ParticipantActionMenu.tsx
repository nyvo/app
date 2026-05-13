import { useState } from 'react';
import { MoreHorizontal } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { formatKroner } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog, ConfirmScopeItem } from '@/components/ui/confirm-dialog';
import type { ExceptionType, PaymentStatus } from '@/types/database';

/** Minimal shape the action menu needs — satisfied by both SignupDisplay and DisplayParticipant */
export interface ActionableParticipant {
  id: string;
  participantName: string;
  participantEmail: string;
  className: string;
  paymentStatus: PaymentStatus;
  amountPaid?: number | null;
  exceptionType?: ExceptionType | null;
  status?: string;
  dinteroTransactionId?: string | null;
}

export interface ParticipantActionHandlers {
  onCancelEnrollment: (signupId: string, refund: boolean) => Promise<void>;
  onMarkResolved: (signupId: string) => Promise<void>;
}

interface ParticipantActionMenuProps {
  signup: ActionableParticipant;
  handlers: ParticipantActionHandlers;
}

type ConfirmDialog = 'cancel-no-refund' | 'cancel-with-refund' | 'resolve' | null;

export function ParticipantActionMenu({ signup, handlers }: ParticipantActionMenuProps) {
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>(null);

  const runAction = async (action: () => Promise<void>) => {
    setLoading(true);
    try {
      await action();
    } finally {
      setLoading(false);
    }
  };

  const { exceptionType } = signup;
  // Cancelled signups are terminal: no actions available. Render a disabled
  // trigger anyway so the row's action-menu slot stays visually consistent
  // across the list — empty cells make the layout look broken.
  if (signup.status === 'cancelled' || signup.status === 'course_cancelled') {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        className="shrink-0"
        aria-label="Ingen handlinger tilgjengelig"
        disabled
      >
        <MoreHorizontal className="size-4" />
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            aria-label="Handlinger"
            disabled={loading}
          >
            {loading ? (
              <Spinner size="sm" />
            ) : (
              <MoreHorizontal className="size-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">

          {/* Exception resolution actions — only for problem signups.
              No section label; the "Merk som betalt" item is self-explanatory
              and the row's badge already names the exception. */}
          {(exceptionType === 'payment_failed' || exceptionType === 'pending_payment') && (
            <>
              <DropdownMenuItem
                onClick={() => setConfirmDialog('resolve')}
                disabled={loading}
              >
                Merk som betalt
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {/* Base cancel actions — the early return above guarantees the signup
              isn't already cancelled, so these always render. The refund
              option is gated on having a Dintero transaction to reverse;
              manually-added signups (no integrated payment) can only cancel,
              since the platform never received their money. */}
          {(() => {
            const isPaid = signup.paymentStatus === 'paid' && signup.amountPaid != null && signup.amountPaid > 0;
            const canRefund = isPaid && !!signup.dinteroTransactionId;
            return (
              <>
                <DropdownMenuItem
                  onClick={() => setConfirmDialog('cancel-no-refund')}
                  disabled={loading}
                >
                  Avbestill
                </DropdownMenuItem>
                {canRefund && (
                  <DropdownMenuItem
                    onClick={() => setConfirmDialog('cancel-with-refund')}
                    disabled={loading}
                  >
                    Avbestill med refusjon
                  </DropdownMenuItem>
                )}
              </>
            );
          })()}

        </DropdownMenuContent>
      </DropdownMenu>

      {/* Cancel WITHOUT refund */}
      <ConfirmDialog
        open={confirmDialog === 'cancel-no-refund'}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
        ariaLabel="Avbestill påmelding"
        headline={
          signup.paymentStatus === 'paid' && signup.amountPaid != null && signup.amountPaid > 0
            ? 'Påmeldingen avbestilles uten refusjon. Det kan ikke angres.'
            : 'Påmeldingen avbestilles. Det kan ikke angres.'
        }
        scope={
          <ConfirmScopeItem
            name={signup.participantName}
            meta={signup.participantEmail}
            trailing={
              signup.paymentStatus === 'paid' && signup.amountPaid != null && signup.amountPaid > 0
                ? formatKroner(signup.amountPaid)
                : undefined
            }
          />
        }
        actionLabel="Avbestill"
        onConfirm={() => {
          setConfirmDialog(null);
          runAction(() => handlers.onCancelEnrollment(signup.id, false));
        }}
      />

      {/* Cancel WITH refund (only for paid signups) */}
      <ConfirmDialog
        open={confirmDialog === 'cancel-with-refund'}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
        ariaLabel="Avbestill med refusjon"
        headline="Påmeldingen avbestilles og hele beløpet refunderes (5–10 virkedager)."
        scope={
          <ConfirmScopeItem
            name={signup.participantName}
            meta={signup.participantEmail}
            trailing={
              signup.amountPaid != null && signup.amountPaid > 0
                ? formatKroner(signup.amountPaid)
                : undefined
            }
          />
        }
        actionLabel="Avbestill og refunder"
        onConfirm={() => {
          setConfirmDialog(null);
          runAction(() => handlers.onCancelEnrollment(signup.id, true));
        }}
      />

      {/* Mark as resolved confirmation dialog */}
      <ConfirmDialog
        open={confirmDialog === 'resolve'}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
        ariaLabel="Merk som betalt"
        headline="Betalingen merkes som mottatt utenom betalingsløsningen (kontant, Vipps e.l.)."
        scope={
          <ConfirmScopeItem
            name={signup.participantName}
            meta={signup.participantEmail}
            trailing={
              signup.amountPaid != null && signup.amountPaid > 0
                ? formatKroner(signup.amountPaid)
                : undefined
            }
          />
        }
        actionLabel="Merk som betalt"
        actionVariant="default"
        onConfirm={() => {
          setConfirmDialog(null);
          runAction(() => handlers.onMarkResolved(signup.id));
        }}
      />
    </>
  );
}

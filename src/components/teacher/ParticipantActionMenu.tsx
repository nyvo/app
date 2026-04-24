import { useState } from 'react';
import { MoreHorizontal, CheckCircle, XCircle, Send } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { formatKroner } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  onSendPaymentLink: (signupId: string) => Promise<void>;
  onCancelEnrollment: (signupId: string, refund: boolean) => Promise<void>;
  onMarkResolved: (signupId: string) => Promise<void>;
  onSendReminder?: (signupId: string) => Promise<void>;
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
  const isCancelled = signup.status === 'cancelled' || signup.status === 'course_cancelled';
  const hasExceptionActions = !!exceptionType;
  const hasBaseActions = !isCancelled;
  // Don't render menu if there are no actions to show
  if (!hasExceptionActions && !hasBaseActions) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="min-h-[44px] min-w-[44px] flex-shrink-0"
            aria-label="Handlinger"
            disabled={loading}
          >
            {loading ? (
              <Spinner size="md" />
            ) : (
              <MoreHorizontal className="size-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">

          {/* Exception resolution actions — only for problem signups */}
          {exceptionType === 'payment_failed' && (
            <>
              <DropdownMenuLabel className="text-xs font-medium tracking-wide text-muted-foreground">
                Betaling feilet
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => runAction(() => handlers.onSendPaymentLink(signup.id))}
                disabled={loading}
              >
                <Send className="size-4 mr-2" />
                Send betalingslenke på nytt
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setConfirmDialog('resolve')}
                disabled={loading}
              >
                <CheckCircle className="size-4 mr-2" />
                Merk som betalt
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {exceptionType === 'pending_payment' && (
            <>
              <DropdownMenuLabel className="text-xs font-medium tracking-wide text-muted-foreground">
                Venter på betaling
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => runAction(() => handlers.onSendPaymentLink(signup.id))}
                disabled={loading}
              >
                <Send className="size-4 mr-2" />
                Send påminnelse
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setConfirmDialog('resolve')}
                disabled={loading}
              >
                <CheckCircle className="size-4 mr-2" />
                Merk som betalt
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {/* Base actions — available for all active (non-cancelled) participants */}
          {signup.status !== 'cancelled' && signup.status !== 'course_cancelled' && (() => {
            const isPaid = signup.paymentStatus === 'paid' && signup.amountPaid != null && signup.amountPaid > 0;
            return (
              <>
                <DropdownMenuItem
                  onClick={() => setConfirmDialog('cancel-no-refund')}
                  disabled={loading}
                  className="text-destructive focus:text-destructive"
                >
                  <XCircle className="size-4 mr-2" />
                  Avbestill uten refusjon
                </DropdownMenuItem>
                {isPaid && (
                  <DropdownMenuItem
                    onClick={() => setConfirmDialog('cancel-with-refund')}
                    disabled={loading}
                    className="text-destructive focus:text-destructive"
                  >
                    <XCircle className="size-4 mr-2" />
                    Avbestill med refusjon
                  </DropdownMenuItem>
                )}
              </>
            );
          })()}

        </DropdownMenuContent>
      </DropdownMenu>

      {/* Cancel WITHOUT refund */}
      <AlertDialog open={confirmDialog === 'cancel-no-refund'} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Avbestill uten refusjon?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-1">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground truncate">{signup.participantName}</p>
                    <p className="text-xs font-mono text-muted-foreground truncate">{signup.participantEmail}</p>
                  </div>
                  {signup.paymentStatus === 'paid' && signup.amountPaid != null && signup.amountPaid > 0 && (
                    <span className="text-sm font-medium font-mono tabular-nums text-foreground">{formatKroner(signup.amountPaid)}</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {signup.paymentStatus === 'paid' && signup.amountPaid != null && signup.amountPaid > 0
                    ? 'Deltakeren beholder påmeldingsbeløpet. Du kan refundere manuelt via betalingsoversikten.'
                    : 'Deltakeren mister plassen sin. Dette kan ikke angres.'}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirmDialog(null);
                runAction(() => handlers.onCancelEnrollment(signup.id, false));
              }}
            >
              Avbestill
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel WITH refund (only for paid signups) */}
      <AlertDialog open={confirmDialog === 'cancel-with-refund'} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Avbestill med refusjon?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-1">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground truncate">{signup.participantName}</p>
                    <p className="text-xs font-mono text-muted-foreground truncate">{signup.participantEmail}</p>
                  </div>
                  {signup.amountPaid != null && signup.amountPaid > 0 && (
                    <span className="text-sm font-medium font-mono tabular-nums text-foreground">{formatKroner(signup.amountPaid)}</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Hele beløpet refunderes til betalingskortet. Refusjonen tar vanligvis 5–10 virkedager.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirmDialog(null);
                runAction(() => handlers.onCancelEnrollment(signup.id, true));
              }}
            >
              Avbestill og refunder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mark as resolved confirmation dialog */}
      <AlertDialog open={confirmDialog === 'resolve'} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Merk som betalt?</AlertDialogTitle>
            <AlertDialogDescription>
              Betalingen for {signup.participantName} merkes som mottatt utenom betalingsløsningen (kontant, Vipps, e.l.).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDialog(null);
                runAction(() => handlers.onMarkResolved(signup.id));
              }}
            >
              Merk som betalt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

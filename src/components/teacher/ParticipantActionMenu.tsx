import { useState } from 'react';
import { MoreHorizontal, CheckCircle, XCircle, Send } from 'lucide-react';
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
import type { ExceptionType } from '@/hooks/use-grouped-signups';
import type { PaymentStatus } from '@/types/database';

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

type ConfirmDialog = 'cancel' | 'resolve' | null;

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
              <MoreHorizontal className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">

          {/* Exception resolution actions — only for problem signups */}
          {exceptionType === 'payment_failed' && (
            <>
              <DropdownMenuLabel className="type-meta text-muted-foreground">
                Betaling feilet
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => runAction(() => handlers.onSendPaymentLink(signup.id))}
                disabled={loading}
              >
                <Send className="h-4 w-4 mr-2" />
                Send betalingslenke på nytt
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setConfirmDialog('resolve')}
                disabled={loading}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Merk som betalt
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {exceptionType === 'pending_payment' && (
            <>
              <DropdownMenuLabel className="type-meta text-muted-foreground">
                Venter på betaling
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => runAction(() => handlers.onSendPaymentLink(signup.id))}
                disabled={loading}
              >
                <Send className="h-4 w-4 mr-2" />
                Send påminnelse
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setConfirmDialog('resolve')}
                disabled={loading}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Merk som betalt
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {/* Base actions — available for all active (non-cancelled) participants */}
          {signup.status !== 'cancelled' && signup.status !== 'course_cancelled' && (
            <DropdownMenuItem
              onClick={() => setConfirmDialog('cancel')}
              disabled={loading}
              className="text-destructive focus:text-destructive"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Avbestill påmelding
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Cancel enrollment confirmation dialog */}
      <AlertDialog open={confirmDialog === 'cancel'} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Avbestill påmelding?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div className="rounded-lg border border-border bg-background/50 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="type-label text-foreground">{signup.participantName}</p>
                      <p className="type-meta text-muted-foreground">{signup.participantEmail}</p>
                    </div>
                    {signup.paymentStatus === 'paid' && signup.amountPaid != null && signup.amountPaid > 0 && (
                      <span className="type-label text-foreground tabular-nums">{formatKroner(signup.amountPaid)}</span>
                    )}
                  </div>
                </div>
                <p className="type-body text-muted-foreground">
                  {signup.paymentStatus === 'paid' && signup.amountPaid != null && signup.amountPaid > 0
                    ? 'Deltakeren har betalt og får refusjon via Stripe.'
                    : 'Dette kan ikke angres.'}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              className="bg-status-error-bg border-status-error-border text-status-error-text hover:bg-status-error-bg/80"
              onClick={() => {
                const hasRefund = signup.paymentStatus === 'paid' && signup.amountPaid != null && signup.amountPaid > 0;
                setConfirmDialog(null);
                runAction(() => handlers.onCancelEnrollment(signup.id, hasRefund));
              }}
            >
              Avbestill
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
              Betalingen for {signup.participantName} merkes som mottatt utenom Stripe (kontant, Vipps, e.l.).
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

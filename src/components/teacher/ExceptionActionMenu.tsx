import { useState } from 'react';
import { MoreHorizontal, Link, CheckCircle, XCircle } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { formatKroner } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
import type { SignupDisplay } from '@/hooks/use-grouped-signups';

export interface ExceptionActionHandlers {
  onSendPaymentLink: (signupId: string) => Promise<void>;
  onCancelEnrollment: (signupId: string, refund: boolean) => Promise<void>;
  onMarkResolved: (signupId: string) => Promise<void>;
}

interface ExceptionActionMenuProps {
  signup: SignupDisplay;
  handlers: ExceptionActionHandlers;
}

type ConfirmDialog = 'cancel' | 'resolve' | null;

export function ExceptionActionMenu({ signup, handlers }: ExceptionActionMenuProps) {
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
          <button
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-zinc-50 smooth-transition text-text-tertiary hover:text-text-secondary flex-shrink-0"
            aria-label="Handlinger"
            disabled={loading}
          >
            {loading ? (
              <Spinner size="md" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* Payment failed actions */}
          {exceptionType === 'payment_failed' && (
            <>
              <DropdownMenuItem
                onClick={() => runAction(() => handlers.onSendPaymentLink(signup.id))}
                disabled={loading}
              >
                <Link className="h-4 w-4 mr-2" />
                Send betalingslenke
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setConfirmDialog('resolve')}
                disabled={loading}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Merk som betalt
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setConfirmDialog('cancel')}
                disabled={loading}
                className="text-destructive focus:text-destructive"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Avbestill deltaker
              </DropdownMenuItem>
            </>
          )}

          {/* Pending payment actions */}
          {exceptionType === 'pending_payment' && (
            <>
              <DropdownMenuItem
                onClick={() => runAction(() => handlers.onSendPaymentLink(signup.id))}
                disabled={loading}
              >
                <Link className="h-4 w-4 mr-2" />
                Send betalingslenke
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setConfirmDialog('cancel')}
                disabled={loading}
                className="text-destructive focus:text-destructive"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Avbestill deltaker
              </DropdownMenuItem>
            </>
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
                <div className="rounded-xl border border-zinc-200 bg-surface/50 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-text-primary">{signup.participantName}</p>
                      <p className="text-xs text-text-secondary">{signup.participantEmail}</p>
                    </div>
                    {signup.paymentStatus === 'paid' && signup.amountPaid != null && signup.amountPaid > 0 && (
                      <span className="text-sm font-medium text-text-primary tabular-nums">{formatKroner(signup.amountPaid)}</span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-text-secondary">
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
              Betalingen for {signup.participantName} registreres som mottatt utenom Stripe (kontant, Vipps, e.l.).
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

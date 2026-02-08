import { useState } from 'react';
import { MoreHorizontal, Link, CheckCircle, XCircle, Loader2 } from 'lucide-react';
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
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-surface-elevated transition-colors text-text-tertiary hover:text-text-secondary flex-shrink-0"
            aria-label="Handlinger"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
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
                Avmeld deltaker
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
                Avmeld deltaker
              </DropdownMenuItem>
            </>
          )}

        </DropdownMenuContent>
      </DropdownMenu>

      {/* Cancel enrollment confirmation dialog */}
      <AlertDialog open={confirmDialog === 'cancel'} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Avmeld deltaker</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på at du vil avmelde <strong>{signup.participantName}</strong> fra {signup.className}?
              {signup.paymentStatus === 'paid' && ' Deltakeren har betalt og vil motta refusjon.'}
              {signup.paymentStatus !== 'paid' && ' Denne handlingen kan ikke angres.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setConfirmDialog(null);
                runAction(() => handlers.onCancelEnrollment(signup.id, signup.paymentStatus === 'paid'));
              }}
            >
              Avmeld
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mark as resolved confirmation dialog */}
      <AlertDialog open={confirmDialog === 'resolve'} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Merk som betalt</AlertDialogTitle>
            <AlertDialogDescription>
              Bekreft at betalingen for <strong>{signup.participantName}</strong> er mottatt
              utenom Stripe (kontant, Vipps, etc.). Påmeldingen vil bli markert som betalt.
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

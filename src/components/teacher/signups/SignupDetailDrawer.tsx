import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ExternalLink, Mail, FileText, CheckCircle, UserMinus, CreditCard } from '@/lib/icons';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
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
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn, formatKroner } from '@/lib/utils';
import { getInitials } from '@/utils/stringUtils';
import { friendlyError } from '@/lib/error-messages';
import { teacherCancelSignup, markPaymentResolved } from '@/services/signups';
import type { SignupDisplay, TicketAudience } from '@/types/database';
import { routes } from '@/lib/routes';

interface SignupDetailDrawerProps {
  signup: SignupDisplay | null;
  onClose: () => void;
  /** Called after a successful action so the caller can refetch its list. */
  onMutate?: () => void;
}

// ---------------------------------------------------------------------------
// THE drawer — single instance for the whole teacher shell. Shows participant
// detail and offers the same actions as ParticipantActionMenu, just inline
// instead of behind a 3-dot menu. Action confirmations use AlertDialog
// (modal layered above the Sheet — Radix handles z-index automatically).
// ---------------------------------------------------------------------------

const AVATAR_TONES = [
  '#6B7280', '#4F6CB0', '#A66B4F', '#5C7E5A',
  '#8B6A8F', '#B07B4F', '#707070', '#6E6E84',
] as const;

function avatarToneFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

const AUDIENCE_LABEL: Record<TicketAudience, string> = {
  standard: 'Standard',
  student: 'Student / ufør',
  senior: 'Senior',
  staff: 'Personale',
};

type PillKind = 'confirmed' | 'pending' | 'failed' | 'refunded' | 'cancelled';

function pillFor(signup: SignupDisplay): { kind: PillKind; label: string } {
  if (signup.status === 'cancelled' || signup.status === 'course_cancelled') {
    if (signup.paymentStatus === 'refunded') return { kind: 'refunded', label: 'Refundert' };
    return { kind: 'cancelled', label: 'Avbestilt' };
  }
  if (signup.paymentStatus === 'failed') return { kind: 'failed', label: 'Betaling feilet' };
  if (signup.paymentStatus === 'pending') return { kind: 'pending', label: 'Venter på betaling' };
  return { kind: 'confirmed', label: 'Påmeldt' };
}

function StatusPill({ kind, label }: { kind: PillKind; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium leading-[1.5]',
        kind === 'failed' && 'bg-foreground text-background',
        kind === 'confirmed' && 'bg-muted text-foreground',
        kind === 'pending' && 'bg-muted text-foreground-muted',
        kind === 'refunded' && 'bg-muted text-foreground-muted',
        kind === 'cancelled' && 'bg-muted text-foreground-muted line-through',
      )}
    >
      {label}
    </span>
  );
}

function formatPackageWindow(
  totalWeeks: number | null | undefined,
  startDate: string | null | undefined,
): string | null {
  if (!totalWeeks || totalWeeks <= 0) return null;
  if (!startDate) return totalWeeks === 1 ? '1 uke' : `${totalWeeks} uker`;
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return `${totalWeeks} uker`;
  const today = new Date();
  const weeksElapsed = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
  if (weeksElapsed < 0) return totalWeeks === 1 ? '1 uke' : `${totalWeeks} uker`;
  const currentWeek = Math.min(weeksElapsed + 1, totalWeeks);
  return `uke ${currentWeek} av ${totalWeeks}`;
}

type ConfirmKind = 'cancel-no-refund' | 'cancel-with-refund' | 'resolve' | null;

export function SignupDetailDrawer({ signup, onClose, onMutate }: SignupDetailDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmKind>(null);

  // Sheet renders nothing useful without a signup. Keep the component
  // mounted always (it's wired to context) and toggle `open` based on data.
  const isOpen = signup !== null;

  const handleCancelEnrollment = async (refund: boolean) => {
    if (!signup) return;
    setLoading(true);
    try {
      const { error } = await teacherCancelSignup(signup.id, { refund });
      if (error) {
        toast.error(friendlyError(error.message));
        return;
      }
      toast.success(refund ? 'Påmelding avbestilt og refundert.' : 'Påmelding avbestilt.');
      onMutate?.();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleMarkResolved = async () => {
    if (!signup) return;
    setLoading(true);
    try {
      const { error } = await markPaymentResolved(signup.id);
      if (error) {
        toast.error(friendlyError(error.message));
        return;
      }
      toast.success('Betaling registrert.');
      onMutate?.();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!signup) {
    // Render the Sheet shell empty so its mount/unmount behavior is
    // predictable. Returning null entirely also works because we control
    // `open` via the signup prop.
    return null;
  }

  const isCancelled = signup.status === 'cancelled' || signup.status === 'course_cancelled';
  const isDropIn = signup.ticketKind === 'drop_in';
  const audienceLabel = signup.ticketAudience ? AUDIENCE_LABEL[signup.ticketAudience] : null;
  const ticketTag = isDropIn ? 'Drop-in' : (audienceLabel ?? signup.ticketLabel ?? 'Standard');
  const dateLine = isDropIn
    ? `${signup.classDate}${signup.classTime ? ` · ${signup.classTime}` : ''}`
    : formatPackageWindow(signup.courseTotalWeeks, signup.courseStartDate);
  const pill = pillFor(signup);
  const tone = avatarToneFor(signup.participantName || signup.participantEmail || '?');

  const isPaid = signup.paymentStatus === 'paid' && signup.amountPaid != null && signup.amountPaid > 0;
  const isRefundable = isPaid && !!signup.dinteroTransactionId;
  const showResolveAction =
    !isCancelled && (signup.exceptionType === 'payment_failed' || signup.exceptionType === 'pending_payment');

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(next) => !next && onClose()}>
        <SheetContent
          side="right"
          className="flex flex-col gap-0 sm:max-w-md w-full p-0"
        >
          <SheetHeader className="px-6 py-5 border-b">
            <div className="flex items-start gap-3">
              <div
                className="size-12 shrink-0 rounded-full inline-flex items-center justify-center text-white text-sm font-semibold tracking-tight"
                style={{ background: tone }}
                aria-hidden
              >
                {getInitials(signup.participantName || signup.participantEmail || null)}
              </div>
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-base font-medium leading-tight truncate">
                  {signup.participantName}
                </SheetTitle>
                <SheetDescription className="text-xs text-foreground-muted mt-0.5 truncate">
                  {signup.participantEmail}
                </SheetDescription>
                <div className="mt-2">
                  <StatusPill kind={pill.kind} label={pill.label} />
                </div>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            {/* Course context */}
            <section className="px-6 py-4 space-y-3 border-b">
              <h3 className="text-xs font-medium tracking-wide text-foreground-muted uppercase">Kurs</h3>
              <Link
                to={routes.course(signup.courseId)}
                className="group flex items-center gap-2 text-sm font-medium text-foreground hover:underline decoration-muted-foreground underline-offset-2"
                onClick={onClose}
              >
                <span className="truncate">{signup.className}</span>
                <ExternalLink className="size-3.5 shrink-0 text-foreground-muted transition-colors group-hover:text-foreground" />
              </Link>
              <dl className="text-xs text-foreground-muted space-y-1.5 tabular-nums">
                {dateLine && (
                  <div className="flex justify-between gap-3">
                    <dt>{isDropIn ? 'Tid' : 'Varighet'}</dt>
                    <dd className="text-foreground">{dateLine}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt>Billett</dt>
                  <dd className="text-foreground">{ticketTag}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Beløp</dt>
                  <dd className="text-foreground font-medium">
                    {signup.amountPaid != null && signup.amountPaid > 0
                      ? formatKroner(signup.amountPaid)
                      : 'Gratis'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Påmeldt</dt>
                  <dd className="text-foreground">{signup.registeredAt}</dd>
                </div>
              </dl>
            </section>

            {/* Note — read-only for now; inline edit is a future enhancement */}
            {signup.note && (
              <section className="px-6 py-4 space-y-2 border-b">
                <h3 className="text-xs font-medium tracking-wide text-foreground-muted uppercase flex items-center gap-1.5">
                  <FileText className="size-3" strokeWidth={1.75} />
                  Notat
                </h3>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {signup.note}
                </p>
              </section>
            )}

            {/* Quick actions: email link */}
            {signup.participantEmail && (
              <section className="px-6 py-4 border-b">
                <a
                  href={`mailto:${signup.participantEmail}`}
                  className="inline-flex items-center gap-2 text-sm text-foreground hover:underline decoration-muted-foreground underline-offset-2"
                >
                  <Mail className="size-3.5 text-foreground-muted" />
                  Send e-post
                </a>
              </section>
            )}
          </div>

          {/* Footer — primary actions. Mirrors ParticipantActionMenu but
              inline. Cancelled signups are terminal: no actions shown. */}
          {!isCancelled && (
            <div className="border-t px-6 py-4 space-y-2 bg-background">
              {showResolveAction && (
                <Button
                  variant="default"
                  className="w-full justify-start"
                  onClick={() => setConfirmDialog('resolve')}
                  disabled={loading}
                >
                  <CheckCircle className="size-4" />
                  Merk som betalt
                </Button>
              )}
              <Button
                variant="outline-soft"
                className="w-full justify-start"
                onClick={() => setConfirmDialog('cancel-no-refund')}
                disabled={loading}
              >
                <UserMinus className="size-4" />
                Avbestill
              </Button>
              {isRefundable && (
                <Button
                  variant="outline-soft"
                  className="w-full justify-start"
                  onClick={() => setConfirmDialog('cancel-with-refund')}
                  disabled={loading}
                >
                  <CreditCard className="size-4" />
                  Avbestill med refusjon
                </Button>
              )}
              {loading && (
                <div className="flex justify-center pt-1">
                  <Spinner size="sm" />
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirmation dialogs — layered above the Sheet */}
      <AlertDialog open={confirmDialog === 'cancel-no-refund'} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Avbestill påmelding?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-1">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground truncate">{signup.participantName}</p>
                    <p className="text-xs text-foreground-muted truncate">{signup.participantEmail}</p>
                  </div>
                  {isPaid && (
                    <span className="text-sm font-medium tabular-nums text-foreground">
                      {formatKroner(signup.amountPaid ?? 0)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground-muted">
                  {isPaid
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
                handleCancelEnrollment(false);
              }}
            >
              Avbestill
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDialog === 'cancel-with-refund'} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Avbestill med refusjon?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-1">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground truncate">{signup.participantName}</p>
                    <p className="text-xs text-foreground-muted truncate">{signup.participantEmail}</p>
                  </div>
                  <span className="text-sm font-medium tabular-nums text-foreground">
                    {formatKroner(signup.amountPaid ?? 0)}
                  </span>
                </div>
                <p className="text-sm text-foreground-muted">
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
                handleCancelEnrollment(true);
              }}
            >
              Avbestill og refunder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                handleMarkResolved();
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

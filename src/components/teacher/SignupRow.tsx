import { Link } from 'react-router-dom';
import { FileText, MoreHorizontal } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/user-avatar';
import { SignupStatusBadge } from '@/components/ui/signup-status-badge';
import { NotePopover } from '@/components/ui/note-popover';
import { ParticipantActionMenu, type ParticipantActionHandlers } from './ParticipantActionMenu';
import type { SignupDisplay } from '@/types/database';

interface SignupRowProps {
  signup: SignupDisplay;
  actionHandlers?: ParticipantActionHandlers;
  hideCourse?: boolean;
}

export function SignupRow({ signup, actionHandlers, hideCourse = false }: SignupRowProps) {
  const isCancelled = signup.status === 'cancelled' || signup.status === 'course_cancelled';
  const hasActions = !!actionHandlers && (
    !isCancelled || !!signup.stripePaymentIntentId || !!signup.exceptionType
  );

  return (
    <tr className={cn('group smooth-transition', !isCancelled && 'hover:bg-muted')}>
      {/* Navn */}
      <td className="px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar name={signup.participantName} email={signup.participantEmail} size="sm" />
          <div className="min-w-0">
            <p className={cn(
              'text-sm font-medium truncate',
              isCancelled ? 'text-muted-foreground' : 'text-foreground',
            )}>
              {signup.participantName}
            </p>
            <p className="text-xs font-medium tracking-wide truncate text-muted-foreground">
              {signup.participantEmail}
            </p>
            {!hideCourse && (
              <Link
                to={`/teacher/courses/${signup.courseId}`}
                className="mt-0.5 inline-block max-w-full truncate text-xs font-medium tracking-wide text-muted-foreground smooth-transition hover:text-foreground sm:hidden"
              >
                {signup.className}
              </Link>
            )}
          </div>
        </div>
      </td>

      {/* Kurs */}
      {!hideCourse && (
        <td className="hidden px-4 py-4 sm:table-cell sm:px-6">
          <Link
            to={`/teacher/courses/${signup.courseId}`}
            className="inline-block min-w-0 max-w-[14rem] truncate text-sm font-medium text-muted-foreground smooth-transition hover:text-foreground"
          >
            {signup.className}
          </Link>
        </td>
      )}

      {/* Status (derived from signup + payment) */}
      <td className="px-4 py-3 sm:px-6">
        <SignupStatusBadge status={signup.status} paymentStatus={signup.paymentStatus} />
      </td>

      {/* Kvittering */}
      <td className="hidden px-4 py-4 sm:px-6 md:table-cell">
        {signup.receiptUrl && (
          <a
            href={signup.receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground smooth-transition hover:bg-muted hover:text-foreground"
            aria-label="Åpne kvittering"
            title="Åpne kvittering"
          >
            <FileText className="h-4 w-4" />
          </a>
        )}
      </td>

      {/* Notater */}
      <td className="hidden px-4 py-4 text-right sm:table-cell sm:px-6">
        <NotePopover note={signup.note} />
      </td>

      {/* Handlinger */}
      <td className="px-4 py-4 sm:px-6">
        {hasActions && actionHandlers ? (
          <ParticipantActionMenu signup={signup} handlers={actionHandlers} />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center">
            <MoreHorizontal className="h-4 w-4 text-muted-foreground/30" />
          </div>
        )}
      </td>
    </tr>
  );
}

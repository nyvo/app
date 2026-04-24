import { Link } from 'react-router-dom';
import { MoreHorizontal } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/user-avatar';
import { SignupStatusBadge } from '@/components/ui/signup-status-badge';
import { NotePopover } from '@/components/ui/note-popover';
import { TableRow, TableCell } from '@/components/ui/table';
import { ParticipantActionMenu, type ParticipantActionHandlers } from './ParticipantActionMenu';
import type { SignupDisplay } from '@/types/database';

interface SignupRowProps {
  signup: SignupDisplay;
  actionHandlers?: ParticipantActionHandlers;
  hideCourse?: boolean;
}

export function SignupRow({ signup, actionHandlers, hideCourse = false }: SignupRowProps) {
  const isCancelled = signup.status === 'cancelled' || signup.status === 'course_cancelled';
  // Cancelled signups are terminal — no actions, the row shows a disabled
  // placeholder instead of an active trigger. (Before, refunded signups
  // had dinteroTransactionId set which kept hasActions=true, so the trigger
  // rendered but ParticipantActionMenu returned null → empty cell.)
  const hasActions = !!actionHandlers && !isCancelled;

  return (
    <TableRow className={cn(isCancelled && 'bg-muted/50 hover:bg-muted/50')}>
      {/* Navn */}
      <TableCell>
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar name={signup.participantName} email={signup.participantEmail} size="sm" />
          <div className="min-w-0">
            <p className={cn(
              'text-sm font-medium truncate',
              isCancelled ? 'text-muted-foreground' : 'text-foreground',
            )}>
              {signup.participantName}
            </p>
            <p className="text-xs font-mono truncate text-muted-foreground">
              {signup.participantEmail}
            </p>
            {!hideCourse && (
              <Link
                to={`/teacher/courses/${signup.courseId}`}
                className="mt-0.5 inline-block max-w-full truncate text-xs text-muted-foreground smooth-transition hover:text-foreground sm:hidden"
              >
                {signup.className}
              </Link>
            )}
          </div>
        </div>
      </TableCell>

      {/* Kurs */}
      {!hideCourse && (
        <TableCell className="hidden sm:table-cell">
          <Link
            to={`/teacher/courses/${signup.courseId}`}
            className="inline-block min-w-0 max-w-[14rem] truncate text-sm font-medium text-muted-foreground smooth-transition hover:text-foreground"
          >
            {signup.className}
          </Link>
        </TableCell>
      )}

      {/* Status (derived from signup + payment) */}
      <TableCell>
        <SignupStatusBadge status={signup.status} paymentStatus={signup.paymentStatus} />
      </TableCell>

      {/* Notater */}
      <TableCell className="hidden sm:table-cell">
        <NotePopover note={signup.note} />
      </TableCell>

      {/* Handlinger */}
      <TableCell>
        {hasActions && actionHandlers ? (
          <ParticipantActionMenu signup={signup} handlers={actionHandlers} />
        ) : (
          <div className="flex size-8 items-center justify-center" aria-hidden="true">
            <MoreHorizontal className="size-4 text-disabled-foreground" />
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

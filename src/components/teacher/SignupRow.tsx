import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/user-avatar';
import { PaymentBadge } from '@/components/ui/payment-badge';
import { NotePopover } from '@/components/ui/note-popover';
import { ParticipantActionMenu, type ParticipantActionHandlers } from './ParticipantActionMenu';
import type { SignupDisplay } from '@/types/database';

interface SignupRowProps {
  signup: SignupDisplay;
  actionHandlers?: ParticipantActionHandlers;
}

export function SignupRow({ signup, actionHandlers }: SignupRowProps) {
  const isCancelled = signup.status === 'cancelled' || signup.status === 'course_cancelled';

  return (
    <div className={cn(
      "flex items-start gap-3 px-3 py-3",
      !isCancelled && "hover:bg-surface-muted/40",
      isCancelled && "opacity-60"
    )}>
      <UserAvatar
        name={signup.participantName}
        email={signup.participantEmail}
        size="xs"
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <p className={cn(
          "type-label truncate",
          isCancelled ? "text-muted-foreground line-through" : "text-foreground"
        )}>
          {signup.participantName}
        </p>
        <p className="type-meta truncate text-muted-foreground">
          {signup.participantEmail}
        </p>
        <div className="mt-0.5 flex items-center gap-1 type-meta text-muted-foreground">
          <span className="truncate">{signup.className}</span>
          {signup.classDate && (
            <>
              <span>·</span>
              <span className="whitespace-nowrap">{signup.classDate}</span>
            </>
          )}
          {signup.classTime && (
            <>
              <span>·</span>
              <span className="whitespace-nowrap">{signup.classTime}</span>
            </>
          )}
          <span className="ml-auto whitespace-nowrap flex-shrink-0">{signup.registeredAt}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
        <PaymentBadge status={signup.paymentStatus} size="sm" mode="badge" />
        <NotePopover note={signup.note} />
        {!isCancelled && actionHandlers && (
          <ParticipantActionMenu signup={signup} handlers={actionHandlers} />
        )}
      </div>
    </div>
  );
}

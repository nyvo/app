import { Link } from 'react-router-dom';
import { ArrowUpRight, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/user-avatar';
import { PaymentBadge } from '@/components/ui/payment-badge';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { StickyNote } from 'lucide-react';
import { ParticipantActionMenu, type ParticipantActionHandlers } from './ParticipantActionMenu';
import type { SignupDisplay } from '@/types/database';

interface SignupRowProps {
  signup: SignupDisplay;
  actionHandlers?: ParticipantActionHandlers;
}

export function SignupRow({ signup, actionHandlers }: SignupRowProps) {
  const isCancelled = signup.status === 'cancelled' || signup.status === 'course_cancelled';
  const showPaymentBadge = signup.paymentStatus !== 'paid';
  const hasActions = !!actionHandlers && (
    !isCancelled || !!signup.stripePaymentIntentId || !!signup.exceptionType
  );

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
        className="mt-px"
      />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
          <p className={cn(
            "text-sm font-medium truncate",
            isCancelled ? "text-muted-foreground line-through" : "text-foreground"
          )}>
            {signup.participantName}
          </p>
          {showPaymentBadge && (
            <PaymentBadge status={signup.paymentStatus} size="sm" mode="badge" />
          )}
          {signup.note && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="cursor-pointer hover:opacity-80 smooth-transition" aria-label="Vis notat">
                  <StatusIndicator variant="info" mode="badge" size="sm" label="Notat" icon={StickyNote} />
                </button>
              </PopoverTrigger>
              <PopoverContent align="center" side="top" className="w-56 p-3">
                <div className="flex items-start gap-2">
                  <StickyNote className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground leading-relaxed">{signup.note}</p>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
        <p className={cn("text-xs font-medium tracking-wide truncate", isCancelled ? "text-muted-foreground" : "text-muted-foreground/70")}>
          {signup.participantEmail}
        </p>
        <div className="mt-0.5 flex items-center gap-0.5 text-xs font-medium tracking-wide text-muted-foreground">
          <Link
            to={`/teacher/courses/${signup.courseId}`}
            className="inline-flex items-center gap-0.5 truncate min-w-0 hover:text-foreground smooth-transition"
          >
            <span className="truncate">{signup.className}</span>
            <ArrowUpRight className="h-3 w-3 flex-shrink-0" />
          </Link>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="text-xs font-medium tracking-wide text-muted-foreground whitespace-nowrap hidden sm:inline">{signup.registeredAt}</span>
        {hasActions ? (
          <ParticipantActionMenu signup={signup} handlers={actionHandlers} />
        ) : (
          <div className="min-h-[44px] min-w-[44px] flex items-center justify-center">
            <MoreHorizontal className="h-4 w-4 text-muted-foreground/30" />
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { ChevronRight, AlertTriangle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DateBadge } from '@/components/ui/date-badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import { StatusBadge } from '@/components/ui/status-badge';
import { PaymentBadge } from '@/components/ui/payment-badge';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { NotePopover } from '@/components/ui/note-popover';
import { ParticipantActionMenu, type ParticipantActionHandlers } from './ParticipantActionMenu';
import type { SignupGroup as SignupGroupType, SignupDisplay } from '@/hooks/use-grouped-signups';


interface SignupGroupProps {
  group: SignupGroupType;
  defaultExpanded?: boolean;
  actionHandlers?: ParticipantActionHandlers;
}

export function SignupGroup({ group, defaultExpanded = false, actionHandlers }: SignupGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={cn(
      "rounded-lg smooth-transition",
      isExpanded ? "border border-border bg-background" : "hover:bg-surface-muted/40"
    )}>
      {/* Group Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full cursor-pointer items-center gap-3 px-3 py-3 text-left smooth-transition"
        aria-expanded={isExpanded}
        aria-controls={`group-content-${group.key}`}
      >
        <DateBadge date={group.classDate} />

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <h3 className="type-label truncate text-foreground">
              {group.courseTitle}
            </h3>
            {group.hasExceptions && (
              <StatusIndicator
                variant="warning"
                mode="badge"
                size="sm"
                label="Krever oppfølging"
                count={group.counts.exceptions}
                icon={AlertTriangle}
                ariaLabel={`${group.counts.exceptions} påmeldinger krever oppmerksomhet`}
                className="flex-shrink-0"
              />
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {group.classTime && (
              <span className="type-meta text-muted-foreground">{group.classTime}</span>
            )}
            <span className="type-meta inline-flex items-center gap-1 text-muted-foreground">
              <Users className="h-3 w-3" />
              {group.capacity ? `${group.counts.confirmed}/${group.capacity}` : `${group.counts.confirmed}`} påmeldt
            </span>
          </div>
        </div>

        <ChevronRight
          className={cn(
            'h-5 w-5 text-muted-foreground transition-transform flex-shrink-0',
            isExpanded && 'rotate-90'
          )}
        />
      </button>

      {/* Expanded Content — single flat list, exceptions first */}
      {isExpanded && (
        <div id={`group-content-${group.key}`} className="px-3 pb-3">
          {/* All participants in one flat list — no separation */}
          {(group.signups.exceptions.length > 0 || group.signups.confirmed.length > 0 || group.signups.cancelled.length > 0) ? (
            <div className="overflow-hidden rounded-lg border border-border bg-surface-muted/35">
              {group.signups.exceptions.map(signup => (
                <ParticipantRow key={signup.id} signup={signup} actionHandlers={actionHandlers} />
              ))}
              {group.signups.confirmed.map(signup => (
                <ParticipantRow key={signup.id} signup={signup} actionHandlers={actionHandlers} />
              ))}
              {group.signups.cancelled.map(signup => (
                <ParticipantRow key={signup.id} signup={signup} isCancelled />
              ))}
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="type-body text-muted-foreground">Ingen aktive påmeldinger</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Unified participant row — handles normal, exception, and cancelled states
function ParticipantRow({
  signup,
  isCancelled = false,
  actionHandlers,
}: {
  signup: SignupDisplay;
  isCancelled?: boolean;
  actionHandlers?: ParticipantActionHandlers;
}) {
  return (
    <div className={cn(
      "flex items-center gap-3 px-3 py-3",
      !isCancelled && "hover:bg-background/70",
      isCancelled && "opacity-60"
    )}>
      <UserAvatar
        name={signup.participantName}
        email={signup.participantEmail}
        size="xs"
      />
      <div className="flex-1 min-w-0">
        <p className={cn(
          "type-label truncate",
          isCancelled ? "text-muted-foreground line-through" : "text-foreground"
        )}>
          {signup.participantName}
        </p>
        <p className="type-meta truncate text-muted-foreground">{signup.participantEmail}</p>
      </div>
      {/* Payment badge as proper badge (not colored text) */}
      <PaymentBadge status={signup.paymentStatus} size="sm" mode="badge" />
      {/* Cancelled status badge */}
      {isCancelled && <StatusBadge status={signup.status} size="sm" />}
      <NotePopover note={signup.note} />
      {/* Action menu — all active participants, contextual for exceptions */}
      {!isCancelled && actionHandlers && (
        <ParticipantActionMenu signup={signup} handlers={actionHandlers} />
      )}
    </div>
  );
}

export default SignupGroup;

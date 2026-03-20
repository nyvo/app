import { useState } from 'react';
import { ChevronRight, AlertTriangle, Calendar, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/user-avatar';
import { StatusBadge } from '@/components/ui/status-badge';
import { PaymentBadge } from '@/components/ui/payment-badge';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { NotePopover } from '@/components/ui/note-popover';
import { ParticipantActionMenu, type ParticipantActionHandlers } from './ParticipantActionMenu';
import type { SignupGroup as SignupGroupType, SignupDisplay } from '@/hooks/use-grouped-signups';

// Format date for display
function formatGroupDate(date: Date): string {
  const days = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
  const months = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
  return `${days[date.getDay()]} ${date.getDate()}. ${months[date.getMonth()]}`;
}

interface SignupGroupProps {
  group: SignupGroupType;
  defaultExpanded?: boolean;
  actionHandlers?: ParticipantActionHandlers;
}

export function SignupGroup({ group, defaultExpanded = false, actionHandlers }: SignupGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={cn(
      "px-2 rounded-lg smooth-transition",
      isExpanded ? "bg-zinc-50/50" : "hover:bg-zinc-50/50 border-b border-zinc-100"
    )}>
      {/* Group Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full py-3.5 flex items-center justify-between cursor-pointer smooth-transition text-left"
        aria-expanded={isExpanded}
        aria-controls={`group-content-${group.key}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <h3 className="text-sm font-medium text-text-primary truncate">
              {group.courseTitle}
            </h3>
            {group.hasExceptions && (
              <StatusIndicator
                variant="critical"
                mode="badge"
                size="sm"
                count={group.counts.exceptions}
                label="krever oppmerksomhet"
                icon={AlertTriangle}
                ariaLabel={`${group.counts.exceptions} påmeldinger krever oppmerksomhet`}
                className="flex-shrink-0"
              />
            )}
          </div>
          {/* Desktop: horizontal meta */}
          <div className="hidden md:flex items-center gap-4 mt-1">
            <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
              <Calendar className="h-3.5 w-3.5" />
              {formatGroupDate(group.classDate)}{group.classTime && `, ${group.classTime}`}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
              <Users className="h-3.5 w-3.5" />
              {group.capacity ? `${group.counts.confirmed}/${group.capacity}` : `${group.counts.confirmed}`} påmeldt
            </span>
          </div>
          {/* Mobile: stacked meta */}
          <div className="flex md:hidden flex-col gap-0.5 mt-1">
            <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
              <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
              {formatGroupDate(group.classDate)}{group.classTime && `, ${group.classTime}`}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
              <Users className="h-3.5 w-3.5 flex-shrink-0" />
              {group.capacity ? `${group.counts.confirmed}/${group.capacity}` : `${group.counts.confirmed}`} påmeldt
            </span>
          </div>
        </div>
        <ChevronRight
          className={cn(
            'h-5 w-5 text-text-tertiary transition-transform flex-shrink-0 ml-2 md:ml-4',
            isExpanded && 'rotate-90'
          )}
        />
      </button>

      {/* Expanded Content — single flat list, exceptions first */}
      {isExpanded && (
        <div id={`group-content-${group.key}`} className="pl-4 ml-2 border-l-2 border-zinc-200 mt-2 pb-2">
          {/* All participants in one flat list — no separation */}
          {(group.signups.exceptions.length > 0 || group.signups.confirmed.length > 0 || group.signups.cancelled.length > 0) ? (
            <div className="divide-y divide-zinc-100">
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
              <p className="text-sm text-text-secondary">Ingen aktive påmeldinger</p>
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
      "flex items-center gap-3 py-2.5",
      isCancelled && "opacity-60"
    )}>
      <UserAvatar
        name={signup.participantName}
        email={signup.participantEmail}
        size="xs"
      />
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium truncate",
          isCancelled ? "text-text-secondary line-through" : "text-text-primary"
        )}>
          {signup.participantName}
        </p>
        <p className="text-xs text-text-secondary truncate">{signup.participantEmail}</p>
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

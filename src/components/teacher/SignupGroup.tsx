import { useState } from 'react';
import { ChevronRight, AlertTriangle, Calendar, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/user-avatar';
import { StatusBadge } from '@/components/ui/status-badge';
import { PaymentBadge } from '@/components/ui/payment-badge';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { NotePopover } from '@/components/ui/note-popover';
import { ExceptionActionMenu, type ExceptionActionHandlers } from './ExceptionActionMenu';
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
  actionHandlers?: ExceptionActionHandlers;
}

export function SignupGroup({ group, defaultExpanded = false, actionHandlers }: SignupGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || group.hasExceptions);

  const totalActive = group.counts.confirmed;

  return (
    <div className="rounded-2xl bg-white border border-zinc-200 overflow-hidden">
      {/* Group Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 md:px-6 md:py-4 flex items-center justify-between cursor-pointer hover:bg-zinc-50 smooth-transition text-left"
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
          {/* Desktop: horizontal layout */}
          <div className="hidden md:flex items-center gap-4 mt-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
              <Calendar className="h-3.5 w-3.5 text-text-tertiary" />
              {formatGroupDate(group.classDate)}{group.classTime && `, ${group.classTime}`}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
              <Users className="h-3.5 w-3.5 text-text-tertiary" />
              {group.counts.confirmed} påmeldt
            </span>
          </div>
          {/* Mobile: stacked layout */}
          <div className="flex md:hidden flex-col gap-1 mt-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
              <Calendar className="h-3.5 w-3.5 text-text-tertiary flex-shrink-0" />
              {formatGroupDate(group.classDate)}{group.classTime && `, ${group.classTime}`}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
              <Users className="h-3.5 w-3.5 text-text-tertiary flex-shrink-0" />
              {group.counts.confirmed} påmeldt
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

      {/* Expanded Content */}
      {isExpanded && (
        <div id={`group-content-${group.key}`} className="border-t border-zinc-100">
          {/* Exceptions Section */}
          {group.signups.exceptions.length > 0 && (
            <div className="px-4 py-2 md:px-6">
              <div className="divide-y divide-zinc-100">
                {group.signups.exceptions.map(signup => (
                  <ExceptionRow key={signup.id} signup={signup} actionHandlers={actionHandlers} />
                ))}
              </div>
            </div>
          )}

          {/* Confirmed Section */}
          {group.signups.confirmed.length > 0 && (
            <div className={cn("px-4 py-2 md:px-6", group.signups.exceptions.length > 0 && "border-t border-zinc-100")}>
              <h4 className="text-xs font-medium text-text-secondary mb-2">
                Påmeldt ({group.signups.confirmed.length})
              </h4>
              <div className="divide-y divide-zinc-100">
                {group.signups.confirmed.map(signup => (
                  <ParticipantRow key={signup.id} signup={signup} />
                ))}
              </div>
            </div>
          )}

          {/* Cancelled Section */}
          {group.signups.cancelled.length > 0 && (
            <div className="px-4 py-2 md:px-6 border-t border-zinc-100">
              <h4 className="text-xs font-medium text-text-secondary mb-2">
                Avbestilt ({group.signups.cancelled.length})
              </h4>
              <div className="divide-y divide-zinc-100">
                {group.signups.cancelled.map(signup => (
                  <CancelledRow key={signup.id} signup={signup} />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {totalActive === 0 && group.signups.exceptions.length === 0 && (
            <div className="px-4 py-8 md:px-6 text-center">
              <p className="text-sm text-text-secondary">Ingen aktive påmeldinger</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Exception row with action menu
function ExceptionRow({ signup, actionHandlers }: { signup: SignupDisplay; actionHandlers?: ExceptionActionHandlers }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <UserAvatar
        name={signup.participantName}
        email={signup.participantEmail}
        size="xs"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{signup.participantName}</p>
        <p className="text-xs text-text-secondary truncate">{signup.participantEmail}</p>
      </div>
      {/* Payment badge: exception-only (paid is silent by default) */}
      <PaymentBadge status={signup.paymentStatus} size="sm" mode="text-icon" />
      <NotePopover note={signup.note} />
      {actionHandlers && signup.exceptionType && (
        <ExceptionActionMenu signup={signup} handlers={actionHandlers} />
      )}
    </div>
  );
}

// Standard participant row
function ParticipantRow({ signup }: { signup: SignupDisplay }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <UserAvatar
        name={signup.participantName}
        email={signup.participantEmail}
        size="xs"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{signup.participantName}</p>
        <p className="text-xs text-text-secondary truncate">{signup.participantEmail}</p>
      </div>
      {/* Payment badge: exception-only (paid is silent by default) */}
      <PaymentBadge status={signup.paymentStatus} size="sm" mode="text-icon" />
      <NotePopover note={signup.note} />
    </div>
  );
}

// Cancelled row with muted styling
function CancelledRow({ signup }: { signup: SignupDisplay }) {
  return (
    <div className="flex items-center gap-3 py-1.5 opacity-70" aria-disabled="true">
      <UserAvatar
        name={signup.participantName}
        email={signup.participantEmail}
        size="xs"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-secondary truncate line-through">{signup.participantName}</p>
        <p className="text-xs text-text-secondary truncate">{signup.participantEmail}</p>
      </div>
      <StatusBadge status={signup.status} size="sm" />
      {/* Payment badge: exception-only (paid is silent by default) */}
      <PaymentBadge status={signup.paymentStatus} size="sm" mode="text-icon" />
      <NotePopover note={signup.note} />
    </div>
  );
}

export default SignupGroup;

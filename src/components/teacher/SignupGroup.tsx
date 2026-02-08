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
  onToggleAttendance?: (signupId: string) => void;
}

export function SignupGroup({ group, defaultExpanded = false, actionHandlers, onToggleAttendance }: SignupGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || group.hasExceptions);

  const totalActive = group.counts.confirmed;

  return (
    <div className="rounded-2xl bg-white border border-zinc-200 overflow-hidden">
      {/* Group Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 md:px-6 md:py-4 flex items-center justify-between cursor-pointer hover:bg-secondary/50 transition-colors text-left"
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
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 text-text-tertiary" />
              {formatGroupDate(group.classDate)}{group.classTime && `, ${group.classTime}`}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5 text-text-tertiary" />
              {group.counts.confirmed} påmeldt
            </span>
          </div>
          {/* Mobile: stacked layout */}
          <div className="flex md:hidden flex-col gap-1 mt-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 text-text-tertiary flex-shrink-0" />
              {formatGroupDate(group.classDate)}{group.classTime && `, ${group.classTime}`}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
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
            <div className="px-4 py-3 md:px-6 bg-surface/30">
              <h4 role="alert" className="text-xxs font-medium uppercase tracking-wider text-status-error-text mb-3 flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3" />
                Krever handling ({group.signups.exceptions.length})
              </h4>
              <div className="space-y-2">
                {group.signups.exceptions.map(signup => (
                  <ExceptionRow key={signup.id} signup={signup} actionHandlers={actionHandlers} />
                ))}
              </div>
            </div>
          )}

          {/* Confirmed Section */}
          {group.signups.confirmed.length > 0 && (
            <div className="px-4 py-3 md:px-6">
              <h4 className="text-xxs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                Påmeldt ({group.signups.confirmed.length})
              </h4>
              <div className="space-y-1">
                {group.signups.confirmed.map(signup => (
                  <ParticipantRow key={signup.id} signup={signup} onToggleAttendance={onToggleAttendance} />
                ))}
              </div>
            </div>
          )}

          {/* Cancelled Section */}
          {group.signups.cancelled.length > 0 && (
            <div className="px-4 py-3 md:px-6 border-t border-zinc-100 bg-surface/30">
              <h4 className="text-xxs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                Avbestilt ({group.signups.cancelled.length})
              </h4>
              <div className="space-y-1">
                {group.signups.cancelled.map(signup => (
                  <CancelledRow key={signup.id} signup={signup} />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {totalActive === 0 && group.signups.exceptions.length === 0 && (
            <div className="px-4 py-8 md:px-6 text-center">
              <p className="text-sm text-muted-foreground">Ingen aktive påmeldinger</p>
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
    <div className="flex items-center gap-3 p-3 rounded-lg">
      <UserAvatar
        name={signup.participantName}
        email={signup.participantEmail}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{signup.participantName}</p>
        <p className="text-xs text-muted-foreground truncate">{signup.participantEmail}</p>
      </div>
      {/* Payment badge: exception-only (paid is silent by default) */}
      <PaymentBadge status={signup.paymentStatus} size="sm" />
      <NotePopover note={signup.note} />
      {actionHandlers && signup.exceptionType && (
        <ExceptionActionMenu signup={signup} handlers={actionHandlers} />
      )}
    </div>
  );
}

interface ParticipantRowProps {
  signup: SignupDisplay;
  onToggleAttendance?: (signupId: string) => void;
}

// Standard participant row
function ParticipantRow({ signup, onToggleAttendance }: ParticipantRowProps) {
  return (
    <div className="flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-secondary/50 transition-colors">
      <UserAvatar
        name={signup.participantName}
        email={signup.participantEmail}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{signup.participantName}</p>
        <p className="text-xs text-muted-foreground truncate">{signup.participantEmail}</p>
      </div>
      {/* Attendance check-in */}
      <button
        onClick={() => onToggleAttendance?.(signup.id)}
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all",
          signup.attended
            ? "bg-status-confirmed-bg text-status-confirmed-text border border-status-confirmed-border"
            : "bg-surface text-text-tertiary border border-zinc-200 hover:border-zinc-300"
        )}
      >
        <div className={cn(
          "h-1 w-1 rounded-full",
          signup.attended ? "bg-status-confirmed-text" : "bg-text-tertiary"
        )} />
        {signup.attended ? 'Til stede' : 'Sjekk inn'}
      </button>
      {/* Payment badge: exception-only (paid is silent by default) */}
      <PaymentBadge status={signup.paymentStatus} size="sm" />
      <NotePopover note={signup.note} />
    </div>
  );
}

// Cancelled row with muted styling
function CancelledRow({ signup }: { signup: SignupDisplay }) {
  return (
    <div className="flex items-center gap-3 py-2 px-1 rounded-lg opacity-70" aria-disabled="true">
      <UserAvatar
        name={signup.participantName}
        email={signup.participantEmail}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-secondary truncate line-through">{signup.participantName}</p>
        <p className="text-xs text-muted-foreground truncate">{signup.participantEmail}</p>
      </div>
      <StatusBadge status={signup.status} size="sm" />
      {/* Payment badge: exception-only (paid is silent by default) */}
      <PaymentBadge status={signup.paymentStatus} size="sm" />
      <NotePopover note={signup.note} />
    </div>
  );
}

export default SignupGroup;

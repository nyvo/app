import { useState } from 'react';
import { ChevronRight, AlertTriangle, Clock, Calendar, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ParticipantAvatar } from '@/components/ui/participant-avatar';
import { StatusBadge } from '@/components/ui/status-badge';
import { PaymentBadge } from '@/components/ui/payment-badge';
import { NotePopover } from '@/components/ui/note-popover';
import type { SignupGroup as SignupGroupType, SignupDisplay, EXCEPTION_CONFIG } from '@/hooks/use-grouped-signups';

// Format date for display
function formatGroupDate(date: Date): string {
  const days = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
  const months = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
  return `${days[date.getDay()]} ${date.getDate()}. ${months[date.getMonth()]}`;
}

// Exception config for styling
const exceptionConfig: typeof EXCEPTION_CONFIG = {
  payment_failed: {
    label: 'Betaling feilet',
    bgColor: 'bg-status-error-bg/30',
    textColor: 'text-status-error-text',
    borderColor: 'border-status-error-border',
  },
  offer_expiring: {
    label: 'Tilbud utløper snart',
    bgColor: 'bg-status-waitlist-bg/30',
    textColor: 'text-status-waitlist-text',
    borderColor: 'border-status-waitlist-border',
  },
  pending_payment: {
    label: 'Venter betaling',
    bgColor: 'bg-gray-100/50',
    textColor: 'text-gray-600',
    borderColor: 'border-gray-300',
  },
};

interface SignupGroupProps {
  group: SignupGroupType;
  defaultExpanded?: boolean;
}

export function SignupGroup({ group, defaultExpanded = false }: SignupGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || group.hasExceptions);

  const totalActive = group.counts.confirmed + group.counts.waitlist;

  return (
    <div className="rounded-3xl bg-white border border-gray-200 overflow-hidden">
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
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-status-error-bg text-status-error-text text-xxs font-medium flex-shrink-0">
                <AlertTriangle className="h-3 w-3" />
                {group.counts.exceptions}
              </span>
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
              {group.counts.waitlist > 0 && (
                <span className="text-status-waitlist-text">· {group.counts.waitlist} venteliste</span>
              )}
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
              {group.counts.waitlist > 0 && (
                <span className="text-status-waitlist-text ml-1">· {group.counts.waitlist} venteliste</span>
              )}
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
        <div id={`group-content-${group.key}`} className="border-t border-gray-100">
          {/* Exceptions Section */}
          {group.signups.exceptions.length > 0 && (
            <div className="px-4 py-3 md:px-6 bg-surface/30">
              <h4 className="text-xxs font-medium uppercase tracking-wide text-status-error-text mb-3 flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3" />
                Krever handling ({group.signups.exceptions.length})
              </h4>
              <div className="space-y-2">
                {group.signups.exceptions.map(signup => (
                  <ExceptionRow key={signup.id} signup={signup} />
                ))}
              </div>
            </div>
          )}

          {/* Confirmed Section */}
          {group.signups.confirmed.length > 0 && (
            <div className="px-4 py-3 md:px-6">
              <h4 className="text-xxs font-medium uppercase tracking-wide text-muted-foreground mb-3">
                Påmeldt ({group.signups.confirmed.length})
              </h4>
              <div className="space-y-1">
                {group.signups.confirmed.map(signup => (
                  <ParticipantRow key={signup.id} signup={signup} />
                ))}
              </div>
            </div>
          )}

          {/* Waitlist Section */}
          {group.signups.waitlist.length > 0 && (
            <div className="px-4 py-3 md:px-6 border-t border-gray-100">
              <h4 className="text-xxs font-medium uppercase tracking-wide text-status-waitlist-text mb-3">
                Venteliste ({group.signups.waitlist.length})
              </h4>
              <div className="space-y-1">
                {group.signups.waitlist.map(signup => (
                  <WaitlistRow key={signup.id} signup={signup} />
                ))}
              </div>
            </div>
          )}

          {/* Cancelled Section */}
          {group.signups.cancelled.length > 0 && (
            <div className="px-4 py-3 md:px-6 border-t border-gray-100 bg-surface/30">
              <h4 className="text-xxs font-medium uppercase tracking-wide text-muted-foreground mb-3">
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

// Exception row with highlighted border
function ExceptionRow({ signup }: { signup: SignupDisplay }) {
  const config = signup.exceptionType ? exceptionConfig[signup.exceptionType] : null;

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl border-l-2',
        config?.bgColor,
        config?.borderColor
      )}
    >
      <ParticipantAvatar
        participant={{ name: signup.participantName, email: signup.participantEmail }}
        size="sm"
        showPhoto={false}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{signup.participantName}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {signup.exceptionType === 'payment_failed' ? (
            <AlertTriangle className={cn('h-3 w-3', config?.textColor)} />
          ) : (
            <Clock className={cn('h-3 w-3', config?.textColor)} />
          )}
          <span className={cn('text-xs font-medium', config?.textColor)}>
            {config?.label}
          </span>
        </div>
      </div>
      <NotePopover note={signup.note} />
    </div>
  );
}

// Standard participant row
function ParticipantRow({ signup }: { signup: SignupDisplay }) {
  return (
    <div className="flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-secondary/50 transition-colors">
      <ParticipantAvatar
        participant={{ name: signup.participantName, email: signup.participantEmail }}
        size="sm"
        showPhoto={false}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{signup.participantName}</p>
        <p className="text-xs text-muted-foreground truncate">{signup.participantEmail}</p>
      </div>
      <PaymentBadge status={signup.paymentStatus} size="sm" />
      <NotePopover note={signup.note} />
    </div>
  );
}

// Waitlist row with position
function WaitlistRow({ signup }: { signup: SignupDisplay }) {
  return (
    <div className="flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-secondary/50 transition-colors">
      <span className="w-6 text-center text-xs font-medium text-status-waitlist-text">
        #{signup.waitlistPosition || '–'}
      </span>
      <ParticipantAvatar
        participant={{ name: signup.participantName, email: signup.participantEmail }}
        size="sm"
        showPhoto={false}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">{signup.participantName}</p>
        <p className="text-xs text-muted-foreground truncate">{signup.participantEmail}</p>
      </div>
      <StatusBadge status="waitlist" size="sm" />
      <NotePopover note={signup.note} />
    </div>
  );
}

// Cancelled row with muted styling
function CancelledRow({ signup }: { signup: SignupDisplay }) {
  return (
    <div className="flex items-center gap-3 py-2 px-1 rounded-lg opacity-60">
      <ParticipantAvatar
        participant={{ name: signup.participantName, email: signup.participantEmail }}
        size="sm"
        showPhoto={false}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-secondary truncate">{signup.participantName}</p>
        <p className="text-xs text-muted-foreground truncate">{signup.participantEmail}</p>
      </div>
      <StatusBadge status={signup.status} size="sm" />
      <PaymentBadge status={signup.paymentStatus} size="sm" />
      <NotePopover note={signup.note} />
    </div>
  );
}

export default SignupGroup;

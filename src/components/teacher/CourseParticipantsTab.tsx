import { useState, useMemo } from 'react';
import { Plus, FileText } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatKroner } from '@/lib/utils';
import { getInitials } from '@/utils/stringUtils';
import type { PaymentStatus } from '@/components/ui/payment-badge';
import type { SignupStatus } from '@/components/ui/status-badge';
import { ParticipantActionMenu, type ParticipantActionHandlers, type ActionableParticipant } from './ParticipantActionMenu';
import { SignupFilterDropdown, type CombinedFilter } from './SignupFilterDropdown';
import type { ExceptionType, TicketAudience, TicketKind } from '@/types/database';

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

export interface DisplayParticipant {
  id: string;
  name: string;
  email: string;
  status: SignupStatus;
  paymentStatus: PaymentStatus;
  amountPaid?: number | null;
  notes?: string;
  // Optional ticket info — when present, surfaces in the row meta line.
  ticketKind?: TicketKind;
  ticketAudience?: TicketAudience;
  /** Pre-formatted "uke 3 av 13" / "3. mai · 17:30" — what the participant committed to. */
  ticketContext?: string;
  /** Pre-formatted "2 timer siden" / "i går" / "5 dager siden" — relative signup time. */
  registeredAgo?: string;
}

interface CourseParticipantsTabProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  participants: DisplayParticipant[];
  participantsLoading: boolean;
  onOpenAddDialog: () => void;
  courseName: string;
  actionHandlers: ParticipantActionHandlers;
}

function detectException(paymentStatus: PaymentStatus, status: SignupStatus): ExceptionType | null {
  if (status === 'cancelled' || status === 'course_cancelled') return null;
  if (paymentStatus === 'failed') return 'payment_failed';
  if (paymentStatus === 'pending') return 'pending_payment';
  return null;
}

function toActionable(p: DisplayParticipant, courseName: string): ActionableParticipant {
  return {
    id: p.id,
    participantName: p.name,
    participantEmail: p.email,
    className: courseName,
    paymentStatus: p.paymentStatus,
    amountPaid: p.amountPaid,
    status: p.status,
    exceptionType: detectException(p.paymentStatus, p.status),
  };
}

type PillKind = 'confirmed' | 'pending' | 'failed' | 'refunded' | 'cancelled';

function pillFor(p: DisplayParticipant): { kind: PillKind; label: string } {
  if (p.status === 'cancelled' || p.status === 'course_cancelled') {
    if (p.paymentStatus === 'refunded') return { kind: 'refunded', label: 'Refundert' };
    return { kind: 'cancelled', label: 'Avbestilt' };
  }
  if (p.paymentStatus === 'failed') return { kind: 'failed', label: 'Betaling feilet' };
  if (p.paymentStatus === 'pending') return { kind: 'pending', label: 'Venter' };
  return { kind: 'confirmed', label: 'Påmeldt' };
}

function ParticipantRow({
  p,
  courseName,
  actionHandlers,
}: {
  p: DisplayParticipant;
  courseName: string;
  actionHandlers: ParticipantActionHandlers;
}) {
  const tone = avatarToneFor(p.name || p.email || '?');
  const pill = pillFor(p);
  const isCancelled = p.status === 'cancelled' || p.status === 'course_cancelled';

  // Meta line: ticket label · context (uke X av Y / session date)
  const ticketTag = p.ticketKind === 'drop_in'
    ? 'Drop-in'
    : (p.ticketAudience ? AUDIENCE_LABEL[p.ticketAudience] : 'Standard');
  const metaParts: string[] = [ticketTag];
  if (p.ticketContext) metaParts.push(p.ticketContext);

  return (
    <div className={cn(
      'grid items-center gap-4 px-4 py-3.5',
      'grid-cols-[32px_minmax(0,1fr)_32px] md:grid-cols-[32px_minmax(0,1fr)_160px_32px]',
      'transition-colors duration-100 hover:bg-muted/50',
    )}>
      <div
        className="size-8 shrink-0 rounded-full inline-flex items-center justify-center text-white text-[11px] font-semibold tracking-tight"
        style={{ background: tone }}
        aria-label={p.name || p.email || 'Bruker'}
      >
        {getInitials(p.name || p.email || null)}
      </div>

      <div className="min-w-0 flex flex-col gap-0.5">
        <p className={cn(
          'text-sm font-medium leading-[1.3] truncate',
          isCancelled ? 'text-muted-foreground' : 'text-foreground',
        )}>
          <span>{p.name}</span>
          {p.notes && (
            <span
              className="ml-1.5 inline-flex items-center align-middle text-muted-foreground"
              title={p.notes}
            >
              <FileText className="size-3" strokeWidth={1.75} />
            </span>
          )}
        </p>
        <p className="text-xs leading-[1.4] text-muted-foreground tabular-nums truncate">
          {metaParts.map((part, i) => (
            <span key={i}>
              {i > 0 && <span className="text-disabled-foreground mx-1.5">·</span>}
              {part}
            </span>
          ))}
        </p>
        <p className="text-xs leading-[1.4] text-muted-foreground truncate">{p.email}</p>
      </div>

      <div className="hidden md:flex flex-col items-end justify-center gap-1 self-center">
        <span className={cn(
          'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium leading-[1.5]',
          pill.kind === 'failed' && 'bg-foreground text-background',
          pill.kind === 'confirmed' && 'bg-muted text-foreground',
          pill.kind === 'pending' && 'bg-muted text-muted-foreground',
          pill.kind === 'refunded' && 'bg-muted text-muted-foreground',
          pill.kind === 'cancelled' && 'bg-muted text-muted-foreground line-through',
        )}>
          {pill.label}
        </span>
        {p.amountPaid != null && (
          <span className="text-[13px] font-medium text-foreground tabular-nums leading-none">
            {p.amountPaid > 0 ? formatKroner(p.amountPaid) : 'Gratis'}
          </span>
        )}
        {p.registeredAgo && (
          <span className="text-[11px] text-muted-foreground tabular-nums leading-none">
            {p.registeredAgo}
          </span>
        )}
      </div>

      <div className="flex justify-end">
        <ParticipantActionMenu
          signup={toActionable(p, courseName)}
          handlers={actionHandlers}
        />
      </div>
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="grid grid-cols-[32px_minmax(0,1fr)_160px_32px] items-center gap-4 px-4 py-3.5">
      <Skeleton className="size-8 rounded-full" />
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-4 w-40 max-w-full" />
        <Skeleton className="h-3 w-56 max-w-full" />
        <Skeleton className="h-3 w-32 max-w-full" />
      </div>
      <div className="hidden md:flex flex-col items-end gap-1.5">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-3 w-12" />
      </div>
      <Skeleton className="size-8 rounded-md" />
    </div>
  );
}

export const CourseParticipantsTab = ({
  searchQuery,
  onSearchQueryChange,
  participants,
  participantsLoading,
  onOpenAddDialog,
  courseName,
  actionHandlers,
}: CourseParticipantsTabProps) => {
  const [combinedFilter, setCombinedFilter] = useState<CombinedFilter>('all');

  const filterCounts = useMemo((): Record<CombinedFilter, number> => {
    const counts: Record<CombinedFilter, number> = {
      all: participants.length,
      payment_issues: 0,
      cancelled: 0,
      refunded: 0,
      ended: 0,
    };
    for (const p of participants) {
      if ((p.paymentStatus === 'pending' && p.status === 'confirmed') || p.paymentStatus === 'failed') counts.payment_issues++;
      if (p.status === 'cancelled' || p.status === 'course_cancelled') counts.cancelled++;
      if (p.paymentStatus === 'refunded') counts.refunded++;
    }
    return counts;
  }, [participants]);

  const filteredParticipants = useMemo(() => {
    let result = participants;
    switch (combinedFilter) {
      case 'payment_issues':
        result = result.filter(p => (p.paymentStatus === 'pending' && p.status === 'confirmed') || p.paymentStatus === 'failed');
        break;
      case 'cancelled':
        result = result.filter(p => p.status === 'cancelled' || p.status === 'course_cancelled');
        break;
      case 'refunded':
        result = result.filter(p => p.paymentStatus === 'refunded');
        break;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q),
      );
    }

    return result;
  }, [participants, combinedFilter, searchQuery]);

  const hasActiveFilters = combinedFilter !== 'all' || searchQuery.trim() !== '';

  const clearFilters = () => {
    setCombinedFilter('all');
    onSearchQueryChange('');
  };

  return (
    <>
      {/* Toolbar — OUTSIDE the frame */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3">
        <SignupFilterDropdown
          value={combinedFilter}
          onChange={setCombinedFilter}
          counts={filterCounts}
        />
        <div className="flex w-full items-center gap-2 md:ml-auto md:w-auto">
          <SearchInput
            value={searchQuery}
            onChange={onSearchQueryChange}
            placeholder="Søk etter deltaker"
            aria-label="Søk etter deltaker"
            className="flex-1 md:max-w-xs"
          />
          <Button size="sm" onClick={onOpenAddDialog}>
            <Plus className="size-4" />
            Legg til
          </Button>
        </div>
      </div>

      {/* Frame — rows + footer */}
      <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
        {participantsLoading ? (
          <>
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </>
        ) : filteredParticipants.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-12 text-center">
            <p className="text-sm font-medium text-foreground">
              {hasActiveFilters ? 'Ingen deltakere funnet' : 'Ingen deltakere ennå'}
            </p>
            <p className="text-xs text-muted-foreground">
              {hasActiveFilters ? 'Prøv å justere filtrene.' : 'Deltakere vises her når de melder seg på.'}
            </p>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-2">
                Nullstill filter
              </Button>
            )}
          </div>
        ) : (
          filteredParticipants.map(p => (
            <ParticipantRow
              key={p.id}
              p={p}
              courseName={courseName}
              actionHandlers={actionHandlers}
            />
          ))
        )}
      </div>
    </>
  );
};

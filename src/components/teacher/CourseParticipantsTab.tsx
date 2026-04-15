import { useState, useMemo } from 'react';
import {
  Plus,
  FileText,
} from 'lucide-react';
import { SkeletonTableRow } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { UserAvatar } from '@/components/ui/user-avatar';
import { PaymentBadge, type PaymentStatus } from '@/components/ui/payment-badge';
import { StatusBadge, type SignupStatus } from '@/components/ui/status-badge';
import { NotePopover } from '@/components/ui/note-popover';
import { Card } from '@/components/ui/card';
import { ParticipantActionMenu, type ParticipantActionHandlers, type ActionableParticipant } from './ParticipantActionMenu';
import { SignupFilterDropdown, type CombinedFilter } from './SignupFilterDropdown';
import type { ExceptionType } from '@/types/database';

export interface DisplayParticipant {
  id: string;
  name: string;
  email: string;
  status: SignupStatus;
  paymentStatus: PaymentStatus;
  amountPaid?: number | null;
  notes?: string;
  receiptUrl?: string;
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

  // Count participants per filter option
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

  // Apply combined filter + search
  const filteredParticipants = useMemo(() => {
    let result = participants;

    // Combined filter
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

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q)
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
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
          <SearchInput
            value={searchQuery}
            onChange={onSearchQueryChange}
            placeholder="Søk etter deltaker"
            aria-label="Søk etter deltaker"
            className="flex-1 max-w-xs"
          />
          <SignupFilterDropdown
            value={combinedFilter}
            onChange={setCombinedFilter}
            counts={filterCounts}
          />
        </div>
        <Button size="compact" onClick={onOpenAddDialog}>
          <Plus className="h-4 w-4" />
          Legg til deltaker
        </Button>
      </div>

      {/* Table Container */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-background/50">
                <th scope="col" className="text-xs font-medium tracking-wide w-auto px-4 py-3 text-muted-foreground sm:px-6">Navn</th>
                <th scope="col" className="text-xs font-medium tracking-wide w-32 px-4 py-3 text-muted-foreground sm:px-6">Status</th>
                <th scope="col" className="text-xs font-medium tracking-wide hidden w-40 px-4 py-3 text-muted-foreground sm:px-6 md:table-cell">Betaling</th>
                <th scope="col" className="text-xs font-medium tracking-wide hidden w-20 px-4 py-3 text-muted-foreground sm:px-6 md:table-cell">Kvittering</th>
                <th scope="col" className="text-xs font-medium tracking-wide hidden w-20 px-4 py-3 text-right text-muted-foreground sm:table-cell sm:px-6">Notater</th>
                <th scope="col" className="text-xs font-medium tracking-wide w-12 px-4 py-3 text-muted-foreground sm:px-6"><span className="sr-only">Handlinger</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {participantsLoading ? (
                <>
                  <SkeletonTableRow columns={6} hasAvatar={true} />
                  <SkeletonTableRow columns={6} hasAvatar={true} />
                  <SkeletonTableRow columns={6} hasAvatar={true} />
                  <tr className="sr-only"><td colSpan={6}>Laster deltakere</td></tr>
                </>
              ) : filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <p className="text-sm text-muted-foreground">{hasActiveFilters ? 'Ingen deltakere funnet' : 'Ingen deltakere ennå'}</p>
                    {hasActiveFilters && (
                      <Button variant="link" size="sm" onClick={clearFilters} className="text-xs font-medium tracking-wide text-primary">
                        Nullstill filter
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((participant) => (
                  <tr key={participant.id} className="group smooth-transition hover:bg-surface-muted">
                    {/* Navn */}
                    <td className="px-4 py-4 sm:px-6">
                      <div className="flex min-w-0 items-center gap-3">
                        <UserAvatar name={participant.name} email={participant.email} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate text-foreground">{participant.name}</p>
                          <p className="text-xs font-medium tracking-wide truncate text-muted-foreground">{participant.email}</p>
                        </div>
                      </div>
                    </td>
                    {/* Status (signup) */}
                    <td className="px-4 py-3 sm:px-6">
                      <StatusBadge status={participant.status} />
                    </td>
                    {/* Betaling (payment) */}
                    <td className="hidden px-4 py-4 sm:px-6 md:table-cell">
                      <PaymentBadge status={participant.paymentStatus} />
                    </td>
                    {/* Kvittering (receipt) */}
                    <td className="hidden px-4 py-4 sm:px-6 md:table-cell">
                      {participant.receiptUrl && (
                        <a
                          href={participant.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground smooth-transition hover:bg-surface-muted hover:text-foreground"
                          aria-label="Åpne kvittering"
                          title="Åpne kvittering"
                        >
                          <FileText className="h-4 w-4" />
                        </a>
                      )}
                    </td>
                    {/* Notater */}
                    <td className="hidden px-4 py-4 text-right sm:table-cell sm:px-6">
                      <NotePopover note={participant.notes} />
                    </td>
                    {/* Handlinger */}
                    <td className="px-4 py-4 sm:px-6">
                      <ParticipantActionMenu
                        signup={toActionable(participant, courseName)}
                        handlers={actionHandlers}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

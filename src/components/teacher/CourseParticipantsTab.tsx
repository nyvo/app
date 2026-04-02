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
import type { ExceptionType } from '@/hooks/use-grouped-signups';

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
      pending_payment: 0,
      payment_failed: 0,
      cancelled: 0,
      refunded: 0,
    };
    for (const p of participants) {
      if (p.paymentStatus === 'pending' && p.status === 'confirmed') counts.pending_payment++;
      if (p.paymentStatus === 'failed') counts.payment_failed++;
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
      case 'pending_payment':
        result = result.filter(p => p.paymentStatus === 'pending' && p.status === 'confirmed');
        break;
      case 'payment_failed':
        result = result.filter(p => p.paymentStatus === 'failed');
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
      <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between mb-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center flex-1">
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
                <th scope="col" className="py-3 px-3 sm:px-6 text-xs font-medium text-muted-foreground w-auto">Navn</th>
                <th scope="col" className="py-3 px-3 sm:px-6 text-xs font-medium text-muted-foreground w-32">Status</th>
                <th scope="col" className="py-3 px-3 sm:px-6 text-xs font-medium text-muted-foreground w-40 hidden md:table-cell">Betaling</th>
                <th scope="col" className="py-3 px-3 sm:px-6 text-xs font-medium text-muted-foreground w-20 hidden md:table-cell">Kvittering</th>
                <th scope="col" className="py-3 px-3 sm:px-6 text-xs font-medium text-muted-foreground text-right w-20 hidden sm:table-cell">Notater</th>
                <th scope="col" className="py-3 px-3 sm:px-6 text-xs font-medium text-muted-foreground w-12"><span className="sr-only">Handlinger</span></th>
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
                      <button
                        onClick={clearFilters}
                        className="mt-2 text-xs text-primary hover:underline"
                      >
                        Nullstill filter
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((participant) => (
                  <tr key={participant.id} className="group hover:bg-muted smooth-transition">
                    {/* Navn */}
                    <td className="py-4 px-3 sm:px-6">
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar name={participant.name} email={participant.email} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{participant.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{participant.email}</p>
                        </div>
                      </div>
                    </td>
                    {/* Status (signup) */}
                    <td className="py-3 px-3 sm:px-6">
                      <StatusBadge status={participant.status} />
                    </td>
                    {/* Betaling (payment) */}
                    <td className="py-4 px-3 sm:px-6 hidden md:table-cell">
                      <PaymentBadge status={participant.paymentStatus} />
                    </td>
                    {/* Kvittering (receipt) */}
                    <td className="py-4 px-3 sm:px-6 hidden md:table-cell">
                      {participant.receiptUrl && (
                        <a
                          href={participant.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted smooth-transition"
                          aria-label="Åpne kvittering"
                          title="Åpne kvittering"
                        >
                          <FileText className="h-4 w-4" />
                        </a>
                      )}
                    </td>
                    {/* Notater */}
                    <td className="py-4 px-3 sm:px-6 text-right hidden sm:table-cell">
                      <NotePopover note={participant.notes} />
                    </td>
                    {/* Handlinger */}
                    <td className="py-4 px-3 sm:px-6">
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

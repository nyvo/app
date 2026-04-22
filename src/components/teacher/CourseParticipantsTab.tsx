import { useState, useMemo } from 'react';
import {
  Plus,
  FileText,
} from '@/lib/icons';
import { SkeletonTableRow } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { UserAvatar } from '@/components/ui/user-avatar';
import type { PaymentStatus } from '@/components/ui/payment-badge';
import type { SignupStatus } from '@/components/ui/status-badge';
import { SignupStatusBadge } from '@/components/ui/signup-status-badge';
import { NotePopover } from '@/components/ui/note-popover';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
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
    <Card className="overflow-hidden gap-0 py-0 divide-y divide-border">
      {/* Toolbar */}
      <div className="flex flex-col justify-between gap-3 p-3 md:flex-row md:items-center">
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
        <Button size="sm" onClick={onOpenAddDialog}>
          <Plus className="size-4" />
          Legg til deltaker
        </Button>
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          <tr>
            <TableHead className="min-w-[220px] max-w-[360px] w-[40%]">Navn</TableHead>
            <TableHead className="w-40">Status</TableHead>
            <TableHead className="hidden w-20 md:table-cell">Kvittering</TableHead>
            <TableHead className="hidden w-36 sm:table-cell">Notater</TableHead>
            <TableHead className="w-12"><span className="sr-only">Handlinger</span></TableHead>
          </tr>
        </TableHeader>
        <TableBody>
          {participantsLoading ? (
            <>
              <SkeletonTableRow columns={5} hasAvatar={true} />
              <SkeletonTableRow columns={5} hasAvatar={true} />
              <SkeletonTableRow columns={5} hasAvatar={true} />
              <tr className="sr-only"><td colSpan={5}>Laster deltakere</td></tr>
            </>
          ) : filteredParticipants.length === 0 ? (
            <tr>
              <td colSpan={5}>
                <div className="flex flex-col items-center gap-1 py-8 text-center">
                  <p className="text-sm font-medium text-foreground">{hasActiveFilters ? 'Ingen deltakere funnet' : 'Ingen deltakere ennå'}</p>
                  <p className="text-xs text-muted-foreground">
                    {hasActiveFilters ? 'Prøv å justere filtrene.' : 'Deltakere vises her når de melder seg på.'}
                  </p>
                  {hasActiveFilters && (
                    <Button variant="link" size="sm" onClick={clearFilters} className="mt-2 text-xs font-medium tracking-wide text-primary">
                      Nullstill filter
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            filteredParticipants.map((participant) => (
              <TableRow key={participant.id}>
                {/* Navn */}
                <TableCell>
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar name={participant.name} email={participant.email} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">{participant.name}</p>
                      <p className="text-xs font-mono truncate text-muted-foreground">{participant.email}</p>
                    </div>
                  </div>
                </TableCell>
                {/* Status (derived from signup + payment) */}
                <TableCell>
                  <SignupStatusBadge status={participant.status} paymentStatus={participant.paymentStatus} />
                </TableCell>
                {/* Kvittering (receipt) */}
                <TableCell className="hidden md:table-cell">
                  {participant.receiptUrl && (
                    <a
                      href={participant.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground smooth-transition hover:bg-muted hover:text-foreground"
                      aria-label="Åpne kvittering"
                      title="Åpne kvittering"
                    >
                      <FileText className="size-4" />
                    </a>
                  )}
                </TableCell>
                {/* Notater */}
                <TableCell className="hidden sm:table-cell">
                  <NotePopover note={participant.notes} />
                </TableCell>
                {/* Handlinger */}
                <TableCell>
                  <ParticipantActionMenu
                    signup={toActionable(participant, courseName)}
                    handlers={actionHandlers}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
};

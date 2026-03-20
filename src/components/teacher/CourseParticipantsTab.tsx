import {
  Plus,
  FileText,
  X,
} from 'lucide-react';
import { SkeletonTableRow } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { FilterTabs, FilterTab } from '@/components/ui/filter-tabs';
import { UserAvatar } from '@/components/ui/user-avatar';
import { PaymentBadge, type PaymentStatus } from '@/components/ui/payment-badge';
import { StatusBadge, type SignupStatus } from '@/components/ui/status-badge';
import { NotePopover } from '@/components/ui/note-popover';
import { ParticipantActionMenu, type ParticipantActionHandlers, type ActionableParticipant } from './ParticipantActionMenu';
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
  statusFilter: SignupStatus | 'all';
  onStatusFilterChange: (filter: SignupStatus | 'all') => void;
  paymentFilter: PaymentStatus | 'all';
  onPaymentFilterChange: (filter: PaymentStatus | 'all') => void;
  filteredParticipants: DisplayParticipant[];
  participantsLoading: boolean;
  activeFiltersCount: number;
  onClearFilters: () => void;
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
  statusFilter,
  onStatusFilterChange,
  paymentFilter,
  onPaymentFilterChange,
  filteredParticipants,
  participantsLoading,
  activeFiltersCount,
  onClearFilters,
  onOpenAddDialog,
  courseName,
  actionHandlers,
}: CourseParticipantsTabProps) => {
  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1">
          <div className="relative w-full sm:w-80">
            <SearchInput
              value={searchQuery}
              onChange={onSearchQueryChange}
              placeholder="Søk etter deltaker"
              aria-label="Søk etter deltaker"
            />
          </div>
          <FilterTabs variant="pill" value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as SignupStatus | 'all')}>
            <FilterTab value="all">Alle</FilterTab>
            <FilterTab value="confirmed">Påmeldt</FilterTab>
            <FilterTab value="cancelled">Avbestilt</FilterTab>
          </FilterTabs>
        </div>
        <Button size="compact" onClick={onOpenAddDialog}>
          <Plus className="h-4 w-4" />
          Legg til deltaker
        </Button>
      </div>

      {/* Active Filter Chips */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {statusFilter !== 'all' && (
            <button
              onClick={() => onStatusFilterChange('all')}
              aria-label={`Fjern filter: Status ${
                statusFilter === 'confirmed' ? 'Påmeldt' :
                'Avbestilt'
              }`}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-elevated text-xs font-medium text-text-primary border border-border hover:border-zinc-400 smooth-transition"
            >
              Status: {
                statusFilter === 'confirmed' ? 'Påmeldt' :
                'Avbestilt'
              }
              <X className="h-3 w-3" />
            </button>
          )}
          {paymentFilter !== 'all' && (
            <button
              onClick={() => onPaymentFilterChange('all')}
              aria-label={`Fjern filter: Betaling ${paymentFilter === 'paid' ? 'Betalt' : 'Venter betaling'}`}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-elevated text-xs font-medium text-text-primary border border-border hover:border-zinc-400 smooth-transition"
            >
              Betaling: {paymentFilter === 'paid' ? 'Betalt' : 'Venter betaling'}
              <X className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={onClearFilters}
            className="text-xs font-medium text-text-secondary hover:text-text-primary smooth-transition"
          >
            Nullstill alle
          </button>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-surface/50">
                <th className="py-3 px-3 sm:px-6 text-xs font-medium text-text-secondary w-auto">Navn</th>
                <th className="py-3 px-3 sm:px-6 text-xs font-medium text-text-secondary w-32">Status</th>
                <th className="py-3 px-3 sm:px-6 text-xs font-medium text-text-secondary w-40 hidden md:table-cell">Betaling</th>
                <th className="py-3 px-3 sm:px-6 text-xs font-medium text-text-secondary w-20 hidden md:table-cell">Kvittering</th>
                <th className="py-3 px-3 sm:px-6 text-xs font-medium text-text-secondary text-right w-20 hidden sm:table-cell">Notater</th>
                <th className="py-3 px-3 sm:px-6 text-xs font-medium text-text-secondary w-12"><span className="sr-only">Handlinger</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {participantsLoading ? (
                <>
                  <SkeletonTableRow columns={6} hasAvatar={true} />
                  <SkeletonTableRow columns={6} hasAvatar={true} />
                  <SkeletonTableRow columns={6} hasAvatar={true} />
                  <span className="sr-only">Laster deltakere</span>
                </>
              ) : filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <p className="text-sm text-text-secondary">Ingen deltakere funnet</p>
                    {activeFiltersCount > 0 && (
                      <button
                        onClick={onClearFilters}
                        className="mt-2 text-xs text-primary hover:underline"
                      >
                        Nullstill filter
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((participant) => (
                  <tr key={participant.id} className="group hover:bg-zinc-50 smooth-transition">
                    {/* Navn */}
                    <td className="py-4 px-3 sm:px-6">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={participant.name} email={participant.email} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">{participant.name}</p>
                          <p className="text-xs text-text-secondary truncate">{participant.email}</p>
                        </div>
                      </div>
                    </td>
                    {/* Status (signup) */}
                    <td className="py-3 px-3 sm:px-6">
                      <StatusBadge status={participant.status} />
                    </td>
                    {/* Betaling (payment) - exception-only (paid is silent by default) */}
                    <td className="py-4 px-3 sm:px-6 hidden md:table-cell">
                      <PaymentBadge status={participant.paymentStatus} />
                    </td>
                    {/* Kvittering (receipt) - icon-only when present */}
                    <td className="py-4 px-3 sm:px-6 hidden md:table-cell">
                      {participant.receiptUrl && (
                        <a
                          href={participant.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-zinc-50 smooth-transition"
                          aria-label="Åpne kvittering"
                          title="Åpne kvittering"
                        >
                          <FileText className="h-4 w-4" />
                        </a>
                      )}
                    </td>
                    {/* Notater - icon-only when present */}
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
      </div>

    </div>
  );
};

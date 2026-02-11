import {
  Filter,
  Plus,
  FileText,
  X,
} from 'lucide-react';
import { SkeletonTableRow } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { UserAvatar } from '@/components/ui/user-avatar';
import { PaymentBadge, type PaymentStatus } from '@/components/ui/payment-badge';
import { StatusBadge, type SignupStatus } from '@/components/ui/status-badge';
import { NotePopover } from '@/components/ui/note-popover';

interface DisplayParticipant {
  id: string;
  name: string;
  email: string;
  status: SignupStatus;
  paymentStatus: PaymentStatus;
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
}: CourseParticipantsTabProps) => {
  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="relative w-full sm:w-80">
          <SearchInput
            value={searchQuery}
            onChange={onSearchQueryChange}
            placeholder="Søk etter deltaker"
            aria-label="Søk etter deltaker"
          />
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline-soft" size="compact" className="relative">
                <Filter className="h-3.5 w-3.5" />
                Filter
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-0 rounded-2xl border-zinc-200" role="dialog" aria-label="Filter deltakere">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
                <span className="text-sm font-medium text-text-primary">Filter</span>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={onClearFilters}
                    aria-label="Nullstill alle filtre"
                    className="text-xs font-medium text-muted-foreground hover:text-text-primary smooth-transition"
                  >
                    Nullstill alle
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="p-4 space-y-5">
                {/* Status: Segmented Control */}
                <div>
                  <p id="status-label" className="text-xxs font-medium uppercase tracking-wider text-text-tertiary mb-2">
                    Status
                  </p>
                  <div
                    role="radiogroup"
                    aria-labelledby="status-label"
                    className="flex gap-1 border-b border-border"
                  >
                    {([
                      { value: 'confirmed', label: 'Påmeldt' },
                      { value: 'cancelled', label: 'Avbestilt' },
                    ] as const).map((option) => (
                      <button
                        key={option.value}
                        role="radio"
                        aria-checked={statusFilter === option.value}
                        onClick={() => onStatusFilterChange(statusFilter === option.value ? 'all' : option.value)}
                        className={`flex-1 py-1.5 px-3 text-xs font-medium smooth-transition focus-visible:ring-2 focus-visible:ring-zinc-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white outline-none -mb-px border-b-2 ${
                          statusFilter === option.value
                            ? 'border-text-primary text-text-primary'
                            : 'border-transparent text-muted-foreground hover:text-text-primary'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment: Radio Group */}
                <div>
                  <p id="payment-label" className="text-xxs font-medium uppercase tracking-wider text-text-tertiary mb-2">
                    Betaling
                  </p>
                  <div role="radiogroup" aria-labelledby="payment-label" className="space-y-1">
                    {([
                      { value: 'paid', label: 'Betalt' },
                      { value: 'pending', label: 'Venter' },
                    ] as const).map((option) => (
                      <button
                        key={option.value}
                        role="radio"
                        aria-checked={paymentFilter === option.value}
                        onClick={() => onPaymentFilterChange(paymentFilter === option.value ? 'all' : option.value)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-zinc-50 smooth-transition focus-visible:ring-2 focus-visible:ring-zinc-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white outline-none"
                      >
                        <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          paymentFilter === option.value
                            ? 'border-primary'
                            : 'border-zinc-300'
                        }`}>
                          {paymentFilter === option.value && (
                            <div className="h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <span className={`text-sm font-normal ${
                          paymentFilter === option.value ? 'text-text-primary' : 'text-text-secondary'
                        }`}>
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Result count footer */}
              <div className="px-4 py-2.5 border-t border-border bg-surface/50">
                <p className="text-xxs font-medium text-text-tertiary uppercase tracking-wider">
                  <span className="text-text-primary">{filteredParticipants.length}</span> {filteredParticipants.length === 1 ? 'resultat' : 'resultater'}
                </p>
              </div>
            </PopoverContent>
          </Popover>
          <Button size="compact" onClick={onOpenAddDialog}>
            <Plus className="h-4 w-4" />
            Legg til deltaker
          </Button>
        </div>
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
              aria-label={`Fjern filter: Betaling ${paymentFilter === 'paid' ? 'Betalt' : 'Venter'}`}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-elevated text-xs font-medium text-text-primary border border-border hover:border-zinc-400 smooth-transition"
            >
              Betaling: {paymentFilter === 'paid' ? 'Betalt' : 'Venter'}
              <X className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={onClearFilters}
            className="text-xs font-medium text-muted-foreground hover:text-text-primary smooth-transition"
          >
            Nullstill alle
          </button>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 bg-surface/50">
                <th className="py-2.5 px-6 text-xxs font-medium text-text-tertiary uppercase tracking-wider w-auto">Navn</th>
                <th className="py-2.5 px-6 text-xxs font-medium text-text-tertiary uppercase tracking-wider w-32">Status</th>
                <th className="py-2.5 px-6 text-xxs font-medium text-text-tertiary uppercase tracking-wider w-40">Betaling</th>
                <th className="py-2.5 px-6 text-xxs font-medium text-text-tertiary uppercase tracking-wider w-20">Kvittering</th>
                <th className="py-2.5 px-6 text-xxs font-medium text-text-tertiary uppercase tracking-wider text-right w-20">Notater</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {participantsLoading ? (
                <>
                  <SkeletonTableRow columns={5} hasAvatar={true} />
                  <SkeletonTableRow columns={5} hasAvatar={true} />
                  <SkeletonTableRow columns={5} hasAvatar={true} />
                  <span className="sr-only">Laster deltakere</span>
                </>
              ) : filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <p className="text-sm text-muted-foreground">Ingen deltakere funnet</p>
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
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={participant.name} email={participant.email} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-text-primary">{participant.name}</p>
                          <p className="text-xs text-muted-foreground">{participant.email}</p>
                        </div>
                      </div>
                    </td>
                    {/* Status (signup) */}
                    <td className="py-3 px-6">
                      <StatusBadge status={participant.status} />
                    </td>
                    {/* Betaling (payment) - exception-only (paid is silent by default) */}
                    <td className="py-4 px-6">
                      <PaymentBadge status={participant.paymentStatus} />
                    </td>
                    {/* Kvittering (receipt) - icon-only when present */}
                    <td className="py-4 px-6">
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
                    <td className="py-4 px-6 text-right">
                      <NotePopover note={participant.notes} />
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

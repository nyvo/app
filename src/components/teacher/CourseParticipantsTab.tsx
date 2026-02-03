import {
  Filter,
  Plus,
  FileText,
  ArrowUpCircle,
  Trash2,
  Send,
  X,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { SkeletonTableRow } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ParticipantAvatar } from '@/components/ui/participant-avatar';
import { PaymentBadge, type PaymentStatus } from '@/components/ui/payment-badge';
import { StatusBadge, type SignupStatus } from '@/components/ui/status-badge';
import { StatusIndicator } from '@/components/ui/status-indicator';
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

interface WaitlistEntry {
  id: string;
  participant_name: string | null;
  participant_email: string | null;
  waitlist_position: number | null;
  offer_status: string | null;
  offer_expires_at: string | null;
  created_at: string;
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
  waitlist: WaitlistEntry[];
  waitlistLoading: boolean;
  promotingId: string | null;
  removingId: string | null;
  onPromote: (id: string) => void;
  onRemoveFromWaitlist: (id: string) => void;
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
  waitlist,
  waitlistLoading,
  promotingId,
  removingId,
  onPromote,
  onRemoveFromWaitlist,
  onOpenAddDialog,
}: CourseParticipantsTabProps) => {
  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
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
                  <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-text-primary text-xxs font-medium text-white flex items-center justify-center shadow-sm">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-0 rounded-xl" role="dialog" aria-label="Filter deltakere">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
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
                  <p id="status-label" className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary mb-2">
                    Status
                  </p>
                  <div
                    role="radiogroup"
                    aria-labelledby="status-label"
                    className="flex gap-1 p-1 bg-surface-elevated rounded-xl"
                  >
                    {([
                      { value: 'confirmed', label: 'Påmeldt' },
                      { value: 'waitlist', label: 'Venteliste' },
                      { value: 'cancelled', label: 'Avbestilt' },
                    ] as const).map((option) => (
                      <button
                        key={option.value}
                        role="radio"
                        aria-checked={statusFilter === option.value}
                        onClick={() => onStatusFilterChange(statusFilter === option.value ? 'all' : option.value)}
                        className={`flex-1 rounded-lg py-1.5 px-3 text-xs font-medium smooth-transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                          statusFilter === option.value
                            ? 'bg-white text-text-primary shadow-sm'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment: Radio Group */}
                <div>
                  <p id="payment-label" className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary mb-2">
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
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-surface smooth-transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          paymentFilter === option.value
                            ? 'border-text-primary'
                            : 'border-gray-300'
                        }`}>
                          {paymentFilter === option.value && (
                            <div className="h-2 w-2 rounded-full bg-text-primary" />
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
                <p className="text-xxs text-muted-foreground">
                  <span className="font-medium text-text-primary">{filteredParticipants.length}</span> {filteredParticipants.length === 1 ? 'resultat' : 'resultater'}
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
                statusFilter === 'waitlist' ? 'Venteliste' :
                'Avbestilt'
              }`}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-elevated text-xs font-medium text-text-primary border border-border hover:border-ring smooth-transition"
            >
              Status: {
                statusFilter === 'confirmed' ? 'Påmeldt' :
                statusFilter === 'waitlist' ? 'Venteliste' :
                'Avbestilt'
              }
              <X className="h-3 w-3" />
            </button>
          )}
          {paymentFilter !== 'all' && (
            <button
              onClick={() => onPaymentFilterChange('all')}
              aria-label={`Fjern filter: Betaling ${paymentFilter === 'paid' ? 'Betalt' : 'Venter'}`}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-elevated text-xs font-medium text-text-primary border border-border hover:border-ring smooth-transition"
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
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface/50">
                <th className="py-3 px-6 text-xxs font-medium text-muted-foreground uppercase tracking-wide w-auto">Navn</th>
                <th className="py-3 px-6 text-xxs font-medium text-muted-foreground uppercase tracking-wide w-32">Status</th>
                <th className="py-3 px-6 text-xxs font-medium text-muted-foreground uppercase tracking-wide w-40">Betaling</th>
                <th className="py-3 px-6 text-xxs font-medium text-muted-foreground uppercase tracking-wide w-20">Kvittering</th>
                <th className="py-3 px-6 text-xxs font-medium text-muted-foreground uppercase tracking-wide text-right w-20">Notater</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
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
                  <tr key={participant.id} className="group hover:bg-secondary transition-colors">
                    {/* Navn */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <ParticipantAvatar participant={participant} size="sm" showPhoto={false} />
                        <div>
                          <p className="text-sm font-medium text-text-primary">{participant.name}</p>
                          <p className="text-xs text-muted-foreground">{participant.email}</p>
                        </div>
                      </div>
                    </td>
                    {/* Status (attendance) */}
                    <td className="py-4 px-6">
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
                          className="inline-flex items-center justify-center h-8 w-8 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-elevated transition-colors"
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

      {/* Waitlist Section */}
      {(waitlist.length > 0 || waitlistLoading) && (
        <div className="bg-white rounded-xl border border-border overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-sm font-medium text-text-primary">
              Venteliste ({waitlist.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface/50">
                  <th className="py-3 px-6 text-xxs font-medium text-muted-foreground uppercase tracking-wide w-12">#</th>
                  <th className="py-3 px-6 text-xxs font-medium text-muted-foreground uppercase tracking-wide">Navn</th>
                  <th className="py-3 px-6 text-xxs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="py-3 px-6 text-xxs font-medium text-muted-foreground uppercase tracking-wide">Tid på liste</th>
                  <th className="py-3 px-6 text-xxs font-medium text-muted-foreground uppercase tracking-wide text-right">Handlinger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {waitlistLoading ? (
                  <>
                    <SkeletonTableRow columns={5} hasAvatar={true} />
                    <SkeletonTableRow columns={5} hasAvatar={true} />
                    <span className="sr-only">Laster venteliste</span>
                  </>
                ) : (
                  waitlist.map((entry) => {
                    const timeOnList = (() => {
                      const created = new Date(entry.created_at);
                      const now = new Date();
                      const diffMs = now.getTime() - created.getTime();
                      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                      const diffDays = Math.floor(diffHours / 24);
                      if (diffDays > 0) return `${diffDays}d`;
                      if (diffHours > 0) return `${diffHours}t`;
                      return 'Nå';
                    })();

                    const offerExpiry = entry.offer_expires_at ? (() => {
                      const expires = new Date(entry.offer_expires_at);
                      const now = new Date();
                      const diffMs = expires.getTime() - now.getTime();
                      if (diffMs <= 0) return 'Utløpt';
                      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                      if (diffHours > 0) return `${diffHours}t ${diffMins}m igjen`;
                      return `${diffMins}m igjen`;
                    })() : null;

                    return (
                      <tr key={entry.id} className="group hover:bg-secondary transition-colors">
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-surface-elevated text-xs font-medium text-text-secondary">
                            {entry.waitlist_position}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <ParticipantAvatar participant={{ name: entry.participant_name || '', email: entry.participant_email || '' }} size="sm" showPhoto={false} />
                            <div>
                              <p className="text-sm font-medium text-text-primary">{entry.participant_name || 'Ukjent'}</p>
                              <p className="text-xs text-muted-foreground">{entry.participant_email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {entry.offer_status === 'pending' ? (
                            <div className="flex flex-col gap-0.5">
                              <StatusIndicator
                                variant="success"
                                mode="badge"
                                size="sm"
                                label="Tilbud sendt"
                                icon={Send}
                                ariaLabel="Tilbud sendt til venteliste"
                                className="w-fit"
                              />
                              {offerExpiry && (
                                <span className="text-xxs text-muted-foreground">{offerExpiry}</span>
                              )}
                            </div>
                          ) : entry.offer_status === 'expired' ? (
                            <StatusIndicator
                              variant="warning"
                              mode="badge"
                              size="sm"
                              label="Utløpt"
                            />
                          ) : entry.offer_status === 'skipped' ? (
                            <StatusIndicator
                              variant="neutral"
                              mode="badge"
                              size="sm"
                              label="Hoppet over"
                            />
                          ) : (
                            <StatusIndicator
                              variant="warning"
                              mode="badge"
                              size="sm"
                              label="Venter"
                              ariaLabel="Venter på tilbud fra venteliste"
                            />
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm text-muted-foreground">{timeOnList}</span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {(!entry.offer_status || entry.offer_status === 'expired' || entry.offer_status === 'skipped') && (
                              <Button
                                variant="outline-soft"
                                size="compact"
                                onClick={() => onPromote(entry.id)}
                                disabled={promotingId === entry.id}
                              >
                                {promotingId === entry.id ? (
                                  <Spinner size="xs" />
                                ) : (
                                  <ArrowUpCircle className="h-3 w-3" />
                                )}
                                Send tilbud
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="compact"
                              onClick={() => onRemoveFromWaitlist(entry.id)}
                              disabled={removingId === entry.id}
                              className="text-muted-foreground hover:text-status-error-text"
                            >
                              {removingId === entry.id ? (
                                <Spinner size="xs" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

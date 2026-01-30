import {
  Filter,
  Plus,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ArrowUpCircle,
  Trash2,
  Send,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { SkeletonTableRow } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ParticipantAvatar } from '@/components/ui/participant-avatar';
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
  displayParticipants: DisplayParticipant[];
  participantsLoading: boolean;
  activeFiltersCount: number;
  onClearFilters: () => void;
  waitlist: WaitlistEntry[];
  waitlistLoading: boolean;
  promotingId: string | null;
  removingId: string | null;
  onPromote: (id: string) => void;
  onRemoveFromWaitlist: (id: string) => void;
}

export const CourseParticipantsTab = ({
  searchQuery,
  onSearchQueryChange,
  statusFilter,
  onStatusFilterChange,
  paymentFilter,
  onPaymentFilterChange,
  filteredParticipants,
  displayParticipants,
  participantsLoading,
  activeFiltersCount,
  onClearFilters,
  waitlist,
  waitlistLoading,
  promotingId,
  removingId,
  onPromote,
  onRemoveFromWaitlist,
}: CourseParticipantsTabProps) => {
  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div className="relative w-full sm:w-80">
          <SearchInput
            value={searchQuery}
            onChange={onSearchQueryChange}
            placeholder="S\u00f8k etter deltaker"
            aria-label="S\u00f8k etter deltaker"
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
            <PopoverContent align="end" className="w-64 p-0 rounded-xl">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-medium text-text-primary">Filter</span>
                {activeFiltersCount > 0 && (
                  <button
                    onClick={onClearFilters}
                    className="text-xs font-medium text-muted-foreground hover:text-text-primary transition-colors"
                  >
                    Nullstill
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="p-4 space-y-5">
                {/* Status Section */}
                <div>
                  <p className="text-xxs font-semibold uppercase tracking-wide text-text-tertiary mb-2.5">
                    Status
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: 'all', label: 'Alle' },
                      { value: 'confirmed', label: 'P\u00e5meldt' },
                      { value: 'waitlist', label: 'Venteliste' },
                      { value: 'cancelled', label: 'Avbestilt' },
                    ] as const).map((option) => (
                      <button
                        key={option.value}
                        onClick={() => onStatusFilterChange(option.value)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          statusFilter === option.value
                            ? 'bg-gray-900 text-white shadow-sm'
                            : 'bg-surface-elevated text-text-secondary hover:bg-surface hover:text-text-primary'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                          statusFilter === option.value ? 'bg-white' : 'bg-text-tertiary'
                        }`} />
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Section */}
                <div>
                  <p className="text-xxs font-semibold uppercase tracking-wide text-text-tertiary mb-2.5">
                    Betaling
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: 'all', label: 'Alle' },
                      { value: 'paid', label: 'Betalt' },
                      { value: 'pending', label: 'Venter' },
                    ] as const).map((option) => (
                      <button
                        key={option.value}
                        onClick={() => onPaymentFilterChange(option.value)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          paymentFilter === option.value
                            ? 'bg-gray-900 text-white shadow-sm'
                            : 'bg-surface-elevated text-text-secondary hover:bg-surface hover:text-text-primary'
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                          paymentFilter === option.value ? 'bg-white' : 'bg-text-tertiary'
                        }`} />
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button size="compact">
            <Plus className="h-4 w-4" />
            Legg til deltaker
          </Button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-surface/50">
                <th className="py-3 px-6 text-xxs font-semibold text-muted-foreground uppercase tracking-wide">Navn</th>
                <th className="py-3 px-6 text-xxs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="py-3 px-6 text-xxs font-semibold text-muted-foreground uppercase tracking-wide">Betalt</th>
                <th className="py-3 px-6 text-xxs font-semibold text-muted-foreground uppercase tracking-wide">Kvittering</th>
                <th className="py-3 px-6 text-xxs font-semibold text-muted-foreground uppercase tracking-wide text-right">Notater</th>
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
                    {/* Betalt (payment) */}
                    <td className="py-4 px-6">
                      <PaymentBadge status={participant.paymentStatus} />
                    </td>
                    {/* Kvittering (receipt) */}
                    <td className="py-4 px-6">
                      {participant.receiptUrl ? (
                        <a
                          href={participant.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Se kvittering
                        </a>
                      ) : (
                        <span className="text-text-tertiary text-xs">\u2014</span>
                      )}
                    </td>
                    {/* Notater */}
                    <td className="py-4 px-6 text-right">
                      {participant.notes ? (
                        <NotePopover note={participant.notes} />
                      ) : (
                        <span className="text-text-tertiary">\u2014</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-gray-100 bg-surface/50 flex items-center justify-between">
          <span className="text-xxs text-muted-foreground">Viser <span className="font-medium text-text-primary">{filteredParticipants.length}</span> av <span className="font-medium text-text-primary">{displayParticipants.length}</span> deltakere</span>
          <div className="flex items-center gap-2">
            <button className="p-1.5 rounded-lg bg-white shadow-sm hover:shadow-md hover:text-text-primary text-text-tertiary disabled:opacity-50 transition-all" disabled>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="p-1.5 rounded-lg bg-white shadow-sm hover:shadow-md text-text-primary transition-all">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Waitlist Section */}
      {(waitlist.length > 0 || waitlistLoading) && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-gray-100 bg-status-waitlist-bg/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-text-primary">Venteliste</h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xxs font-medium bg-status-waitlist-bg text-status-waitlist-text border border-status-waitlist-border">
                  {waitlist.length} {waitlist.length === 1 ? 'person' : 'personer'}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Deltakere som venter p\u00e5 ledig plass. Send tilbud for \u00e5 gi dem mulighet til \u00e5 betale.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-surface/50">
                  <th className="py-3 px-6 text-xxs font-semibold text-muted-foreground uppercase tracking-wide w-12">#</th>
                  <th className="py-3 px-6 text-xxs font-semibold text-muted-foreground uppercase tracking-wide">Navn</th>
                  <th className="py-3 px-6 text-xxs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="py-3 px-6 text-xxs font-semibold text-muted-foreground uppercase tracking-wide">Tid p\u00e5 liste</th>
                  <th className="py-3 px-6 text-xxs font-semibold text-muted-foreground uppercase tracking-wide text-right">Handlinger</th>
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
                      return 'N\u00e5';
                    })();

                    const offerExpiry = entry.offer_expires_at ? (() => {
                      const expires = new Date(entry.offer_expires_at);
                      const now = new Date();
                      const diffMs = expires.getTime() - now.getTime();
                      if (diffMs <= 0) return 'Utl\u00f8pt';
                      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                      if (diffHours > 0) return `${diffHours}t ${diffMins}m igjen`;
                      return `${diffMins}m igjen`;
                    })() : null;

                    return (
                      <tr key={entry.id} className="group hover:bg-secondary transition-colors">
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-surface-elevated text-xs font-semibold text-text-secondary">
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
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xxs font-medium bg-blue-50 text-blue-700 border border-blue-200 w-fit">
                                <Send className="h-3 w-3" />
                                Tilbud sendt
                              </span>
                              {offerExpiry && (
                                <span className="text-xxs text-muted-foreground">{offerExpiry}</span>
                              )}
                            </div>
                          ) : entry.offer_status === 'expired' ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xxs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              Utl\u00f8pt
                            </span>
                          ) : entry.offer_status === 'skipped' ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xxs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                              Hoppet over
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xxs font-medium bg-status-waitlist-bg text-status-waitlist-text border border-status-waitlist-border">
                              Venter
                            </span>
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

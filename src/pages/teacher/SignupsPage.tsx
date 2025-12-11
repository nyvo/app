import { useState, useMemo } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Calendar,
  MoreHorizontal,
  StickyNote,
  Leaf,
  Menu,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { StatusBadge } from '@/components/ui/status-badge';
import { ParticipantAvatar } from '@/components/ui/participant-avatar';
import type { SignupPaymentType } from '@/types/dashboard';
import { useEmptyState } from '@/context/EmptyStateContext';
import { SearchInput } from '@/components/ui/search-input';
import EmptyStateToggle from '@/components/ui/EmptyStateToggle';
import { mockSignups, emptySignups } from '@/data/mockData';

// Sort types
type SortField = 'classDateTime' | 'registeredAt' | null;
type SortDirection = 'asc' | 'desc';

// Sortable column header component
const SortableHeader = ({
  label,
  field,
  currentSort,
  currentDirection,
  onSort,
}: {
  label: string;
  field: SortField;
  currentSort: SortField;
  currentDirection: SortDirection;
  onSort: (field: SortField) => void;
}) => {
  const isActive = currentSort === field;

  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1.5 group text-xxs font-semibold uppercase tracking-wide text-muted-foreground hover:text-text-primary transition-colors"
    >
      {label}
      <span className={`transition-colors ${isActive ? 'text-text-primary' : 'text-text-tertiary group-hover:text-muted-foreground'}`}>
        {isActive ? (
          currentDirection === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5" />
        )}
      </span>
    </button>
  );
};


// Payment badge component
const PaymentBadge = ({ paymentType, paymentDetails }: { paymentType: SignupPaymentType; paymentDetails?: string }) => {
  if (paymentType === 'unpaid') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-status-error-border bg-status-error-bg px-2 py-0.5 text-xs font-medium text-status-error-text">
        Ikke betalt
      </span>
    );
  }

  const labels: Record<SignupPaymentType, string> = {
    klippekort: `Klippekort${paymentDetails ? ` (${paymentDetails})` : ''}`,
    månedskort: 'Månedskort',
    'drop-in': `Drop-in${paymentDetails ? ` (${paymentDetails})` : ''}`,
    halvårskort: 'Halvårskort',
    unpaid: 'Ikke betalt',
  };

  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-0.5 text-xs font-medium text-text-secondary">
      {labels[paymentType]}
    </span>
  );
};

// Note tooltip component
const NoteTooltip = ({ note, hasNote }: { note?: string; hasNote: boolean }) => {
  if (!hasNote) return null;

  return (
    <div className="group/note relative inline-flex">
      <StickyNote className={`h-4 w-4 cursor-help ${note ? 'text-warning' : 'text-text-tertiary group-hover:text-warning'} transition-colors`} />
      {note && (
        <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 w-48 rounded-lg bg-text-primary p-2 text-[10px] text-surface-elevated shadow-lg opacity-0 invisible group-hover/note:opacity-100 group-hover/note:visible transition-all z-20">
          {note}
        </div>
      )}
    </div>
  );
};


export const SignupsPage = () => {
  const { showEmptyState } = useEmptyState();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [statusFilter, setStatusFilter] = useState<string>('Alle');
  const [classFilter, setClassFilter] = useState<string>('Alle');

  // Handle sort toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with default asc direction
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filtered and sorted signups
  const filteredAndSortedSignups = useMemo(() => {
    const data = showEmptyState ? emptySignups : mockSignups;
    
    // First filter by search query
    let result = data;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (signup) =>
          signup.participant.name.toLowerCase().includes(query) ||
          signup.participant.email.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter !== 'Alle') {
      if (statusFilter === 'Påmeldt') {
        result = result.filter(s => s.status === 'confirmed');
      } else if (statusFilter === 'Venteliste') {
        result = result.filter(s => s.status === 'waitlist');
      } else if (statusFilter === 'Avbestilt') {
        result = result.filter(s => s.status === 'cancelled');
      }
    }

    // Filter by class (simple implementation)
    if (classFilter !== 'Alle') {
      result = result.filter(s => s.className === classFilter);
    }

    // Then sort if a sort field is selected
    if (sortField) {
      result = [...result].sort((a, b) => {
        let comparison = 0;

        if (sortField === 'classDateTime') {
          comparison = a.classDateTime.getTime() - b.classDateTime.getTime();
        } else if (sortField === 'registeredAt') {
          comparison = a.registeredAtTimestamp.getTime() - b.registeredAtTimestamp.getTime();
        }

        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [searchQuery, sortField, sortDirection, showEmptyState]);

  return (
    <SidebarProvider>
      <TeacherSidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-surface">
        {/* Mobile Header */}
        <div className="flex md:hidden items-center justify-between p-6 border-b border-border bg-surface/80 backdrop-blur-xl z-30 shrink-0">
          <div className="flex items-center gap-3">
            <Leaf className="h-5 w-5 text-primary" />
            <span className="font-geist text-base font-semibold text-text-primary">Ease</span>
          </div>
          <SidebarTrigger>
            <Menu className="h-6 w-6 text-muted-foreground" />
          </SidebarTrigger>
        </div>

        {/* Header Toolbar */}
        <header className="flex flex-col gap-6 px-8 py-8 shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="font-geist text-2xl font-medium tracking-tight text-text-primary">Påmeldinger</h1>
              <p className="text-sm text-muted-foreground mt-1">Oversikt over studenter og bookinger.</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-xs font-medium text-text-secondary hover:bg-surface-elevated hover:text-text-primary ios-ease shadow-sm">
                <Download className="h-3.5 w-3.5" />
                Eksporter
              </button>
              <button className="flex items-center gap-2 rounded-lg bg-text-primary border border-text-primary px-3 py-2 text-xs font-medium text-white hover:bg-sidebar-foreground hover:border-sidebar-foreground shadow-md shadow-text-primary/10 ios-ease">
                <Plus className="h-3.5 w-3.5" />
                Manuell booking
              </button>
            </div>
          </div>

          {/* Removed Stats Cards per request */}

          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Søk etter navn eller e-post..."
              aria-label="Søk etter deltakere"
              className="flex-1 max-w-md"
            />

            {/* Filter Dropdowns */}
            <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={`flex items-center gap-2 h-10 rounded-lg border px-3 py-2 text-xs font-medium ios-ease shadow-sm whitespace-nowrap ${statusFilter !== 'Alle' ? 'bg-white text-text-primary border-border' : 'bg-white text-text-secondary border-border hover:bg-surface-elevated hover:text-text-primary'}`}>
                    <Filter className="h-3.5 w-3.5" />
                    Status: {statusFilter}
                    <ChevronDown className="ml-1 h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {['Alle', 'Påmeldt', 'Venteliste', 'Avbestilt'].map((status) => (
                    <DropdownMenuItem key={status} onClick={() => setStatusFilter(status)}>
                      {status}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={`flex items-center gap-2 h-10 rounded-lg border px-3 py-2 text-xs font-medium ios-ease shadow-sm whitespace-nowrap ${classFilter !== 'Alle' ? 'bg-white text-text-primary border-border' : 'bg-white text-text-secondary border-border hover:bg-surface-elevated hover:text-text-primary'}`}>
                    Kurs: {classFilter}
                    <ChevronDown className="ml-1 h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setClassFilter('Alle')}>Alle</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setClassFilter('Vinyasa Flow')}>Vinyasa Flow</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setClassFilter('Yin Yoga')}>Yin Yoga</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setClassFilter('Meditation')}>Meditation</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

            </div>
          </div>
        </header>

        {/* Table Container */}
        <div className="flex-1 overflow-hidden px-8 pb-8">
          <div className="h-full rounded-2xl border border-border bg-white shadow-sm overflow-hidden flex flex-col">
            {/* Empty State or Table */}
            {filteredAndSortedSignups.length === 0 ? (
              <>
                {/* Table Header for empty state */}
                <div className="border-b border-border bg-surface/50 px-6 py-3">
                  <div className="flex items-center">
                    <div className="flex-[2] text-xxs font-semibold uppercase tracking-wide text-muted-foreground">Deltaker</div>
                    <div className="flex-[2] text-xxs font-semibold uppercase tracking-wide text-muted-foreground">Kurs & Tid</div>
                    <div className="flex-1 text-xxs font-semibold uppercase tracking-wide text-muted-foreground">Påmeldt</div>
                    <div className="flex-1 text-xxs font-semibold uppercase tracking-wide text-muted-foreground">Status</div>
                    <div className="flex-1 text-xxs font-semibold uppercase tracking-wide text-muted-foreground">Betaling</div>
                    <div className="w-12 text-xxs font-semibold uppercase tracking-wide text-muted-foreground text-center">Notat</div>
                    <div className="w-12"></div>
                  </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white">
                  <div className="mb-4 rounded-full bg-surface p-4 border border-surface-elevated">
                    <Search className="h-8 w-8 text-text-tertiary stroke-[1.5]" />
                  </div>
                  <h3 className="font-geist text-sm font-medium text-text-primary">Ingen resultater</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {showEmptyState ? 'Det er ingen påmeldinger å vise.' : 'Prøv å søke etter et annet navn eller e-post'}
                  </p>
                </div>
              </>
            ) : (
              <div className="overflow-auto flex-1 custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-surface/50 border-b border-border">
                    <tr>
                      <th className="py-3 px-6 flex-[2] text-xxs font-semibold uppercase tracking-wide text-muted-foreground" style={{ width: '20%' }}>Deltaker</th>
                      <th className="py-3 px-6" style={{ width: '22%' }}>
                        <SortableHeader
                          label="Kurs & Tid"
                          field="classDateTime"
                          currentSort={sortField}
                          currentDirection={sortDirection}
                          onSort={handleSort}
                        />
                      </th>
                      <th className="py-3 px-6" style={{ width: '14%' }}>
                        <SortableHeader
                          label="Påmeldt"
                          field="registeredAt"
                          currentSort={sortField}
                          currentDirection={sortDirection}
                          onSort={handleSort}
                        />
                      </th>
                      <th className="py-3 px-6 text-xxs font-semibold uppercase tracking-wide text-muted-foreground" style={{ width: '14%' }}>Status</th>
                      <th className="py-3 px-6 text-xxs font-semibold uppercase tracking-wide text-muted-foreground" style={{ width: '14%' }}>Betaling</th>
                      <th className="py-3 px-6 text-xxs font-semibold uppercase tracking-wide text-muted-foreground text-center" style={{ width: '8%' }}>Notat</th>
                      <th className="py-3 px-4" style={{ width: '8%' }}></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-elevated bg-white">
                    {filteredAndSortedSignups.map((signup) => (
                    <tr key={signup.id} className="group hover:bg-secondary transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <ParticipantAvatar participant={signup.participant} showPhoto={false} />
                          <div>
                            <p className="text-sm font-medium text-text-primary">{signup.participant.name}</p>
                            <p className="text-xs text-muted-foreground">{signup.participant.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-text-primary">{signup.className}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Calendar className="h-3 w-3 text-text-tertiary" />
                            <span className="text-xs text-muted-foreground">{signup.classDate}, {signup.classTime}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-text-secondary">{signup.registeredAt}</span>
                      </td>
                      <td className="py-4 px-6">
                        <StatusBadge status={signup.status} waitlistPosition={signup.waitlistPosition} />
                      </td>
                      <td className="py-4 px-6">
                        <PaymentBadge paymentType={signup.paymentType} paymentDetails={signup.paymentDetails} />
                      </td>
                      <td className="py-4 px-6 text-center">
                        <NoteTooltip note={signup.note} hasNote={!!signup.note} />
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button className="rounded-lg p-2 text-text-tertiary opacity-0 group-hover:opacity-100 hover:bg-surface-elevated hover:text-text-primary transition-all" aria-label="Flere handlinger">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Footer */}
            <div className="border-t border-border bg-surface/50 px-6 py-3 flex items-center justify-between">
              <span className="text-xxs text-muted-foreground">
                Viser <span className="font-medium text-text-primary">{filteredAndSortedSignups.length > 0 ? '1' : '0'}-{filteredAndSortedSignups.length}</span> av <span className="font-medium text-text-primary">{filteredAndSortedSignups.length}</span> resultater
                {searchQuery && <span className="ml-1">(filtrert)</span>}
              </span>
              <div className="flex items-center gap-2">
                <button className="rounded-lg border border-border bg-white p-1.5 text-text-tertiary hover:border-ring hover:text-text-primary disabled:opacity-50 transition-all">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button className="rounded-lg border border-border bg-white p-1.5 text-text-primary hover:border-ring transition-all">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--color-border);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--color-ring);
        }
      `}</style>
      <EmptyStateToggle />
    </SidebarProvider>
  );
};

export default SignupsPage;

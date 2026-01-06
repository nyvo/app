import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  Calendar,
  Leaf,
  Menu,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2
} from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { pageVariants, pageTransition } from '@/lib/motion';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { StatusBadge, type SignupStatus } from '@/components/ui/status-badge';
import { PaymentBadge, type PaymentStatus } from '@/components/ui/payment-badge';
import { ParticipantAvatar } from '@/components/ui/participant-avatar';
import { SearchInput } from '@/components/ui/search-input';
import { NotePopover } from '@/components/ui/note-popover';
import { fetchAllSignups, type SignupWithDetails } from '@/services/signups';
import { useAuth } from '@/contexts/AuthContext';

// Sort types
type SortField = 'classDateTime' | 'registeredAt' | null;
type SortDirection = 'asc' | 'desc';

// Display type for table rows
interface SignupDisplay {
  id: string;
  participantName: string;
  participantEmail: string;
  className: string;
  classDate: string;
  classTime: string;
  classDateTime: Date;
  registeredAt: string;
  registeredAtDate: Date;
  status: SignupStatus;
  paymentStatus: PaymentStatus;
  note?: string;
}

// Format date for display
function formatDate(dateString: string | null): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  const months = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
  return `${date.getDate()}. ${months[date.getMonth()]}`;
}

// Format time from time_schedule
function extractTime(timeSchedule: string | null): string {
  if (!timeSchedule) return '';
  const match = timeSchedule.match(/(\d{1,2}:\d{2})/);
  return match ? match[1] : '';
}

// Format relative date
function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'I dag';
  if (diffDays === 1) return 'I går';
  if (diffDays < 7) return `${diffDays} dager siden`;

  const months = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
  return `${date.getDate()}. ${months[date.getMonth()]}`;
}

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

export const SignupsPage = () => {
  const { currentOrganization } = useAuth();
  const [signups, setSignups] = useState<SignupWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [statusFilter, setStatusFilter] = useState<string>('Alle');
  const [classFilter, setClassFilter] = useState<string>('Alle');

  // Fetch signups from database
  useEffect(() => {
    async function loadSignups() {
      if (!currentOrganization?.id) return;

      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await fetchAllSignups(currentOrganization.id);

      if (fetchError) {
        setError('Kunne ikke laste påmeldinger');
        setLoading(false);
        return;
      }

      setSignups(data || []);
      setLoading(false);
    }

    loadSignups();
  }, [currentOrganization?.id]);

  // Transform signups to display format
  const displaySignups: SignupDisplay[] = useMemo(() => {
    return signups.map(signup => {
      const courseTitle = signup.course?.title || 'Ukjent kurs';
      const courseDate = signup.course?.start_date || null;
      const courseTime = extractTime(signup.course?.time_schedule || null);

      return {
        id: signup.id,
        participantName: signup.participant_name || signup.profile?.name || 'Ukjent',
        participantEmail: signup.participant_email || signup.profile?.email || '',
        className: courseTitle,
        classDate: formatDate(courseDate),
        classTime: courseTime,
        classDateTime: courseDate ? new Date(courseDate) : new Date(),
        registeredAt: formatRelativeDate(signup.created_at),
        registeredAtDate: new Date(signup.created_at),
        status: signup.status as SignupStatus,
        paymentStatus: signup.payment_status as PaymentStatus,
        note: signup.note || undefined
      };
    });
  }, [signups]);

  // Get unique class names for filter dropdown
  const uniqueClassNames = useMemo(() => {
    const names = new Set(displaySignups.map(s => s.className));
    return Array.from(names).sort();
  }, [displaySignups]);

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
    let result = displaySignups;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (signup) =>
          signup.participantName.toLowerCase().includes(query) ||
          signup.participantEmail.toLowerCase().includes(query)
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

    // Filter by class
    if (classFilter !== 'Alle') {
      result = result.filter(s => s.className === classFilter);
    }

    // Sort if a sort field is selected
    if (sortField) {
      result = [...result].sort((a, b) => {
        let comparison = 0;

        if (sortField === 'classDateTime') {
          comparison = a.classDateTime.getTime() - b.classDateTime.getTime();
        } else if (sortField === 'registeredAt') {
          comparison = a.registeredAtDate.getTime() - b.registeredAtDate.getTime();
        }

        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [displaySignups, searchQuery, sortField, sortDirection, statusFilter, classFilter]);

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
        <motion.header
          variants={pageVariants}
          initial="initial"
          animate="animate"
          transition={pageTransition}
          className="flex flex-col gap-6 px-8 py-8 shrink-0"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="font-geist text-2xl font-medium tracking-tight text-text-primary">Påmeldinger</h1>
              <p className="text-sm text-muted-foreground mt-1">Oversikt over studenter og bookinger.</p>
            </div>
          </div>

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
                  <button className={`flex items-center gap-2 h-10 rounded-lg border px-3 py-2 text-xs font-medium ios-ease shadow-sm whitespace-nowrap cursor-pointer ${statusFilter !== 'Alle' ? 'bg-white text-text-primary border-border' : 'bg-white text-text-secondary border-border hover:bg-surface-elevated hover:text-text-primary'}`}>
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
                  <button className={`flex items-center gap-2 h-10 rounded-lg border px-3 py-2 text-xs font-medium ios-ease shadow-sm whitespace-nowrap cursor-pointer ${classFilter !== 'Alle' ? 'bg-white text-text-primary border-border' : 'bg-white text-text-secondary border-border hover:bg-surface-elevated hover:text-text-primary'}`}>
                    Kurs: {classFilter}
                    <ChevronDown className="ml-1 h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setClassFilter('Alle')}>Alle</DropdownMenuItem>
                  {uniqueClassNames.map((className) => (
                    <DropdownMenuItem key={className} onClick={() => setClassFilter(className)}>
                      {className}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </motion.header>

        {/* Table Container */}
        <div className="flex-1 overflow-hidden px-8 pb-8">
          <div className="h-full rounded-2xl border border-border bg-white shadow-sm overflow-hidden flex flex-col">
            {/* Loading State */}
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white">
                <Loader2 className="h-8 w-8 animate-spin text-text-tertiary mb-4" />
                <p className="text-sm text-muted-foreground">Laster påmeldinger...</p>
              </div>
            ) : error ? (
              /* Error State */
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white">
                <p className="text-sm text-destructive">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 text-xs text-primary hover:underline"
                >
                  Prøv igjen
                </button>
              </div>
            ) : filteredAndSortedSignups.length === 0 ? (
              /* Empty State or No Results */
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
                  <h3 className="font-geist text-sm font-medium text-text-primary">
                    {displaySignups.length === 0 ? 'Ingen påmeldinger ennå' : 'Ingen resultater'}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {displaySignups.length === 0
                      ? 'Påmeldinger vil vises her når studenter melder seg på kurs.'
                      : 'Prøv å søke etter et annet navn eller e-post'}
                  </p>
                </div>
              </>
            ) : (
              /* Table with Data */
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-elevated bg-white">
                    {filteredAndSortedSignups.map((signup) => (
                    <tr key={signup.id} className="group hover:bg-secondary transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <ParticipantAvatar
                            participant={{ name: signup.participantName, email: signup.participantEmail }}
                            showPhoto={false}
                          />
                          <div>
                            <p className="text-sm font-medium text-text-primary">{signup.participantName}</p>
                            <p className="text-xs text-muted-foreground">{signup.participantEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-text-primary">{signup.className}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Calendar className="h-3 w-3 text-text-tertiary" />
                            <span className="text-xs text-muted-foreground">
                              {signup.classDate}{signup.classTime && `, ${signup.classTime}`}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-text-secondary">{signup.registeredAt}</span>
                      </td>
                      <td className="py-4 px-6">
                        <StatusBadge status={signup.status} />
                      </td>
                      <td className="py-4 px-6">
                        <PaymentBadge status={signup.paymentStatus} />
                      </td>
                      <td className="py-4 px-6 text-center">
                        <NotePopover note={signup.note} />
                      </td>
                    </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Results Footer */}
            <div className="border-t border-border bg-surface/50 px-6 py-3">
              <span className="text-xxs text-muted-foreground">
                Viser <span className="font-medium text-text-primary">{filteredAndSortedSignups.length}</span> av <span className="font-medium text-text-primary">{displaySignups.length}</span> resultater
                {searchQuery && <span className="ml-1">(filtrert)</span>}
              </span>
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
    </SidebarProvider>
  );
};

export default SignupsPage;

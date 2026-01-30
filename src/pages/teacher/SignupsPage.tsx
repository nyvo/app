import { useState, useMemo, useEffect, useCallback } from 'react';
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
  LayoutGrid,
  List,
  AlertCircle
} from 'lucide-react';
import { ErrorState } from '@/components/ui/error-state';
import { SkeletonTableRows } from '@/components/ui/skeleton';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { pageVariants, pageTransition } from '@/lib/motion';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { StatusBadge, type SignupStatus } from '@/components/ui/status-badge';
import { PaymentBadge, type PaymentStatus } from '@/components/ui/payment-badge';
import { ParticipantAvatar } from '@/components/ui/participant-avatar';
import { SearchInput } from '@/components/ui/search-input';
import { NotePopover } from '@/components/ui/note-popover';
import { SmartSignupsView } from '@/components/teacher/SmartSignupsView';
import { fetchAllSignups, type SignupWithDetails } from '@/services/signups';
import {
  useGroupedSignups,
  type SignupDisplay,
  type TimeFilter,
  type ModeFilter,
  type StatusFilter,
  type PaymentFilter,
} from '@/hooks/use-grouped-signups';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

// Sort types
type SortField = 'classDateTime' | 'registeredAt' | null;
type SortDirection = 'asc' | 'desc';
type ViewMode = 'smart' | 'table';

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
      className="flex items-center gap-1.5 group text-xxs font-medium uppercase tracking-wide text-muted-foreground hover:text-text-primary transition-colors"
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

// Primary Mode Tabs (Aktive / Avsluttet / Krever handling)
const ModeTabs = ({
  value,
  onChange,
  exceptionCount,
}: {
  value: ModeFilter;
  onChange: (value: ModeFilter) => void;
  exceptionCount: number;
}) => {
  const tabs: Array<{ value: ModeFilter; label: string; hasWarning?: boolean }> = [
    { value: 'active', label: 'Aktive' },
    { value: 'ended', label: 'Avsluttet' },
    { value: 'needs_attention', label: 'Krever handling', hasWarning: true },
  ];

  return (
    <div className="flex gap-1 p-1 bg-surface-elevated rounded-xl">
      {tabs.map(tab => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'flex items-center gap-1.5 rounded-lg py-2 px-4 text-xs font-medium transition-all whitespace-nowrap',
            value === tab.value
              ? 'bg-white text-text-primary shadow-sm'
              : 'text-muted-foreground hover:text-text-primary'
          )}
        >
          {tab.hasWarning && (
            <AlertCircle className={cn(
              'h-3.5 w-3.5',
              value === tab.value ? 'text-status-error-text' : 'text-status-error-text'
            )} />
          )}
          {tab.label}
          {tab.hasWarning && exceptionCount > 0 && (
            <span className={cn(
              'px-1.5 py-0.5 rounded-full text-xxs font-medium',
              value === tab.value
                ? 'bg-status-error-bg text-status-error-text'
                : 'bg-status-error-bg text-status-error-text'
            )}>
              {exceptionCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

// Time dropdown filter (secondary - demoted from segmented control)
const TimeDropdown = ({
  value,
  onChange,
}: {
  value: TimeFilter | null;
  onChange: (value: TimeFilter | null) => void;
}) => {
  const options: Array<{ value: TimeFilter | null; label: string }> = [
    { value: 'upcoming', label: 'Kommende' },
    { value: 'today', label: 'I dag' },
    { value: 'this_week', label: 'Denne uken' },
    { value: null, label: 'Alle' },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cn(
          'flex items-center gap-2 h-10 rounded-lg border px-3 py-2 text-xs font-medium ios-ease whitespace-nowrap cursor-pointer',
          value !== 'upcoming'
            ? 'bg-white text-text-primary border-border'
            : 'bg-white text-text-secondary border-border hover:bg-surface-elevated hover:text-text-primary'
        )}>
          <Calendar className="h-3.5 w-3.5" />
          Tid
          <ChevronDown className="ml-1 h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {options.map(option => (
          <DropdownMenuItem key={option.value ?? 'all'} onClick={() => onChange(option.value)}>
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Status dropdown filter
const StatusDropdown = ({
  value,
  onChange,
}: {
  value: StatusFilter;
  onChange: (value: StatusFilter) => void;
}) => {
  const options: Array<{ value: StatusFilter; label: string }> = [
    { value: 'all', label: 'Alle' },
    { value: 'confirmed', label: 'Påmeldt' },
    { value: 'waitlist', label: 'Venteliste' },
    { value: 'cancelled', label: 'Avbestilt' },
  ];

  const currentLabel = options.find(o => o.value === value)?.label || 'Alle';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cn(
          'flex items-center gap-2 h-10 rounded-lg border px-3 py-2 text-xs font-medium ios-ease whitespace-nowrap cursor-pointer',
          value !== 'all'
            ? 'bg-white text-text-primary border-border'
            : 'bg-white text-text-secondary border-border hover:bg-surface-elevated hover:text-text-primary'
        )}>
          <Filter className="h-3.5 w-3.5" />
          Status: {currentLabel}
          <ChevronDown className="ml-1 h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {options.map(option => (
          <DropdownMenuItem key={option.value} onClick={() => onChange(option.value)}>
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Payment dropdown filter
const PaymentDropdown = ({
  value,
  onChange,
}: {
  value: PaymentFilter;
  onChange: (value: PaymentFilter) => void;
}) => {
  const options: Array<{ value: PaymentFilter; label: string }> = [
    { value: 'all', label: 'Alle' },
    { value: 'paid', label: 'Betalt' },
    { value: 'refunded', label: 'Refundert' },
  ];

  const currentLabel = options.find(o => o.value === value)?.label || 'Alle';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cn(
          'flex items-center gap-2 h-10 rounded-lg border px-3 py-2 text-xs font-medium ios-ease whitespace-nowrap cursor-pointer',
          value !== 'all'
            ? 'bg-white text-text-primary border-border'
            : 'bg-white text-text-secondary border-border hover:bg-surface-elevated hover:text-text-primary'
        )}>
          Betaling: {currentLabel}
          <ChevronDown className="ml-1 h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {options.map(option => (
          <DropdownMenuItem key={option.value} onClick={() => onChange(option.value)}>
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// View toggle component
const ViewToggle = ({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}) => {
  return (
    <div className="flex items-center gap-1 bg-surface-elevated rounded-lg p-1">
      <button
        onClick={() => onChange('smart')}
        className={cn(
          'p-2 rounded-md transition-colors',
          value === 'smart' ? 'bg-white shadow-sm text-text-primary' : 'text-text-tertiary hover:text-text-primary'
        )}
        aria-label="Oversiktsvisning"
        title="Oversikt (gruppert)"
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        onClick={() => onChange('table')}
        className={cn(
          'p-2 rounded-md transition-colors',
          value === 'table' ? 'bg-white shadow-sm text-text-primary' : 'text-text-tertiary hover:text-text-primary'
        )}
        aria-label="Tabellvisning"
        title="Alle påmeldinger (tabell)"
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
};

export const SignupsPage = () => {
  const { currentOrganization } = useAuth();
  const isMobile = useIsMobile();
  const [signups, setSignups] = useState<SignupWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('smart');
  const [searchQuery, setSearchQuery] = useState('');

  // Smart view filters (new architecture)
  const [modeFilter, setModeFilter] = useState<ModeFilter>('active');
  const [timeFilter, setTimeFilter] = useState<TimeFilter | null>('upcoming'); // Default to "Kommende"
  const [statusFilterSmart, setStatusFilterSmart] = useState<StatusFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');

  // Table view filters (separate state)
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [statusFilter, setStatusFilter] = useState<string>('Alle');
  const [classFilter, setClassFilter] = useState<string>('Alle');

  // Fetch signups from database
  const loadSignups = useCallback(async () => {
    if (!currentOrganization?.id) return;

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await fetchAllSignups(currentOrganization.id);

    if (fetchError) {
      setError('Sjekk internettforbindelsen og prøv på nytt.');
      setLoading(false);
      return;
    }

    setSignups(data || []);
    setLoading(false);
  }, [currentOrganization?.id]);

  // Initial load
  useEffect(() => {
    loadSignups();
  }, [loadSignups]);

  // Transform signups to display format (shared between views)
  const displaySignups: SignupDisplay[] = useMemo(() => {
    return signups.map(signup => {
      const courseTitle = signup.course?.title || 'Ukjent kurs';
      const courseDate = signup.course?.start_date || null;
      const courseTime = extractTime(signup.course?.time_schedule || null);

      return {
        id: signup.id,
        courseId: signup.course?.id || signup.course_id,
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
        note: signup.note || undefined,
        // Additional fields for exception detection
        waitlistPosition: signup.waitlist_position || undefined,
        offerStatus: signup.offer_status || null,
        offerExpiresAt: signup.offer_expires_at ? new Date(signup.offer_expires_at) : null,
      };
    });
  }, [signups]);

  // Use grouped signups hook for smart view
  const { groups, stats, hasActiveFilters } = useGroupedSignups(displaySignups, {
    modeFilter,
    timeFilter,
    statusFilter: statusFilterSmart,
    paymentFilter,
    searchQuery,
  });

  // Reset secondary filters when switching modes
  // Each mode has appropriate default time filter
  const handleModeChange = (newMode: ModeFilter) => {
    setModeFilter(newMode);

    // Set appropriate time filter default per mode
    if (newMode === 'active') {
      setTimeFilter('upcoming'); // Aktive → default "Kommende"
    } else if (newMode === 'needs_attention') {
      setTimeFilter(null); // Krever handling → default "Alle"
    } else if (newMode === 'ended') {
      setTimeFilter(null); // Avsluttet → no time filter (hidden)
    }

    // Reset other filters to defaults
    setStatusFilterSmart('all');
    setPaymentFilter('all');
  };

  // Determine if time filter should be visible based on mode
  const showTimeFilter = modeFilter !== 'ended';

  // Get the appropriate default time filter for current mode
  const getDefaultTimeFilter = (): TimeFilter | null => {
    if (modeFilter === 'active') return 'upcoming';
    return null; // needs_attention and ended default to null (Alle)
  };

  // Clear all secondary filters (reset to mode-appropriate defaults)
  const clearFilters = () => {
    setTimeFilter(getDefaultTimeFilter());
    setStatusFilterSmart('all');
    setPaymentFilter('all');
    setSearchQuery('');
  };

  // Get unique class names for filter dropdown (table view)
  const uniqueClassNames = useMemo(() => {
    const names = new Set(displaySignups.map(s => s.className));
    return Array.from(names).sort();
  }, [displaySignups]);

  // Handle sort toggle (table view)
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filtered and sorted signups for table view
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

  // hasActiveFilters comes from the hook and tracks all secondary filters

  return (
    <SidebarProvider>
      <TeacherSidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-surface">
        {/* Mobile Header */}
        <div className="flex md:hidden items-center justify-between p-6 border-b border-border bg-surface/80 backdrop-blur-xl z-30 shrink-0">
          <div className="flex items-center gap-3">
            <Leaf className="h-5 w-5 text-primary" />
            <span className="font-geist text-base font-medium text-text-primary">Ease</span>
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
            <ViewToggle value={viewMode} onChange={setViewMode} />
          </div>

          {/* Filters Bar */}
          {viewMode === 'smart' ? (
            /* Smart View Filters - Single Tab Row + Secondary Dropdowns */
            <div className="flex flex-col gap-5">
              {/* Primary Mode Tabs - ONE tab row only */}
              <ModeTabs
                value={modeFilter}
                onChange={handleModeChange}
                exceptionCount={stats.totalExceptions}
              />

              {/* Secondary Filters Row - visually distinct from tabs */}
              <div className="flex flex-col md:flex-row gap-3 md:items-center">
                {/* Search is visually strongest among secondary controls */}
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Søk etter navn eller e-post"
                  aria-label="Søk etter deltakere"
                  className="flex-1 max-w-xs"
                />
                {/* Secondary filters - lightweight and optional */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Time filter: only shown for Aktive and Krever handling modes */}
                  {showTimeFilter && (
                    <TimeDropdown value={timeFilter} onChange={setTimeFilter} />
                  )}
                  <StatusDropdown value={statusFilterSmart} onChange={setStatusFilterSmart} />
                  {/* Payment filter only visible in "Krever handling" mode */}
                  {modeFilter === 'needs_attention' && (
                    <PaymentDropdown value={paymentFilter} onChange={setPaymentFilter} />
                  )}

                  {/* Clear filters button - only when filters deviate from defaults */}
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-muted-foreground hover:text-text-primary underline underline-offset-2 ml-2"
                    >
                      Nullstill
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Table View Filters */
            <div className="flex flex-col md:flex-row gap-3">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Søk etter navn eller e-post"
                aria-label="Søk etter deltakere"
                className="flex-1 max-w-md"
              />
              <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={`flex items-center gap-2 h-10 rounded-lg border px-3 py-2 text-xs font-medium ios-ease whitespace-nowrap cursor-pointer ${statusFilter !== 'Alle' ? 'bg-white text-text-primary border-border' : 'bg-white text-text-secondary border-border hover:bg-surface-elevated hover:text-text-primary'}`}>
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
                    <button className={`flex items-center gap-2 h-10 rounded-lg border px-3 py-2 text-xs font-medium ios-ease whitespace-nowrap cursor-pointer ${classFilter !== 'Alle' ? 'bg-white text-text-primary border-border' : 'bg-white text-text-secondary border-border hover:bg-surface-elevated hover:text-text-primary'}`}>
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
          )}
        </motion.header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden px-8 pb-8">
          {viewMode === 'smart' ? (
            /* Smart Grouped View */
            <div className="h-full overflow-auto custom-scrollbar">
              {error ? (
                <ErrorState
                  title="Kunne ikke laste påmeldinger"
                  message={error}
                  onRetry={loadSignups}
                  className="rounded-3xl bg-white border border-gray-200"
                />
              ) : (
                <SmartSignupsView
                  groups={groups}
                  stats={stats}
                  isLoading={loading}
                  isEmpty={displaySignups.length === 0}
                  hasFilters={hasActiveFilters}
                  mode={modeFilter}
                  onClearFilters={clearFilters}
                />
              )}
            </div>
          ) : (
            /* Table View */
            <div className="h-full rounded-3xl bg-white border border-gray-200 overflow-hidden flex flex-col">
              {/* Loading State */}
              {loading ? (
                <div className="overflow-auto flex-1" role="status" aria-live="polite" aria-label="Laster påmeldinger">
                  <span className="sr-only">Henter påmeldinger</span>
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-white border-b border-gray-200 z-10">
                      <tr>
                        <th className="py-3 px-6 text-xxs font-medium uppercase tracking-wide text-muted-foreground" style={{ width: '20%' }}>Deltaker</th>
                        <th className="py-3 px-6 text-xxs font-medium uppercase tracking-wide text-muted-foreground" style={{ width: '22%' }}>Kurs & Tid</th>
                        <th className="py-3 px-6 text-xxs font-medium uppercase tracking-wide text-muted-foreground" style={{ width: '14%' }}>Påmeldt</th>
                        <th className="py-3 px-6 text-xxs font-medium uppercase tracking-wide text-muted-foreground" style={{ width: '14%' }}>Status</th>
                        <th className="py-3 px-6 text-xxs font-medium uppercase tracking-wide text-muted-foreground" style={{ width: '14%' }}>Betaling</th>
                        <th className="py-3 px-6 text-xxs font-medium uppercase tracking-wide text-muted-foreground text-center" style={{ width: '8%' }}>Notat</th>
                      </tr>
                    </thead>
                    <SkeletonTableRows rows={8} columns={6} hasAvatar={true} />
                  </table>
                </div>
              ) : error ? (
                /* Error State */
                <ErrorState
                  title="Kunne ikke laste påmeldinger"
                  message={error}
                  onRetry={loadSignups}
                  className="flex-1 bg-white"
                />
              ) : filteredAndSortedSignups.length === 0 ? (
                /* Empty State or No Results */
                <>
                  {/* Table Header for empty state - hidden on mobile */}
                  <div className="hidden md:block border-b border-gray-200 bg-surface/50 px-6 py-3">
                    <div className="flex items-center">
                      <div className="flex-[2] text-xxs font-medium uppercase tracking-wide text-muted-foreground">Deltaker</div>
                      <div className="flex-[2] text-xxs font-medium uppercase tracking-wide text-muted-foreground">Kurs & Tid</div>
                      <div className="flex-1 text-xxs font-medium uppercase tracking-wide text-muted-foreground">Påmeldt</div>
                      <div className="flex-1 text-xxs font-medium uppercase tracking-wide text-muted-foreground">Status</div>
                      <div className="flex-1 text-xxs font-medium uppercase tracking-wide text-muted-foreground">Betaling</div>
                      <div className="w-12 text-xxs font-medium uppercase tracking-wide text-muted-foreground text-center">Notat</div>
                      <div className="w-12"></div>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 text-center bg-white">
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
              ) : isMobile ? (
                /* Mobile Card Layout */
                <div className="flex-1 overflow-auto custom-scrollbar divide-y divide-gray-200 bg-white">
                  {filteredAndSortedSignups.map((signup) => (
                    <div key={signup.id} className="p-4 hover:bg-secondary transition-colors">
                      {/* Row 1: Avatar + Name + Status */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <ParticipantAvatar
                            participant={{ name: signup.participantName, email: signup.participantEmail }}
                            showPhoto={false}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">{signup.participantName}</p>
                            <p className="text-xs text-muted-foreground truncate">{signup.participantEmail}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <NotePopover note={signup.note} />
                        </div>
                      </div>

                      {/* Row 2: Course info */}
                      <div className="mb-3 pl-[44px]">
                        <p className="text-sm font-medium text-text-primary truncate">{signup.className}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Calendar className="h-3 w-3 text-text-tertiary flex-shrink-0" />
                          <span className="text-xs text-muted-foreground">
                            {signup.classDate}{signup.classTime && `, ${signup.classTime}`}
                          </span>
                        </div>
                      </div>

                      {/* Row 3: Badges + Date */}
                      <div className="flex items-center justify-between pl-[44px]">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={signup.status} size="sm" />
                          <PaymentBadge status={signup.paymentStatus} size="sm" />
                        </div>
                        <span className="text-xs text-text-tertiary">{signup.registeredAt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Desktop Table Layout */
                <div className="overflow-auto flex-1 custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-white border-b border-gray-200 z-10">
                      <tr>
                        <th className="py-3 px-6 flex-[2] text-xxs font-medium uppercase tracking-wide text-muted-foreground" style={{ width: '20%' }}>Deltaker</th>
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
                        <th className="py-3 px-6 text-xxs font-medium uppercase tracking-wide text-muted-foreground" style={{ width: '14%' }}>Status</th>
                        <th className="py-3 px-6 text-xxs font-medium uppercase tracking-wide text-muted-foreground" style={{ width: '14%' }}>Betaling</th>
                        <th className="py-3 px-6 text-xxs font-medium uppercase tracking-wide text-muted-foreground text-center" style={{ width: '8%' }}>Notat</th>
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
          )}
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

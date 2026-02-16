import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Filter,
  ChevronDown,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { ErrorState } from '@/components/ui/error-state';
import { FilterTabs, FilterTab } from '@/components/ui/filter-tabs';
import { SidebarProvider } from '@/components/ui/sidebar';
import { pageVariants, pageTransition } from '@/lib/motion';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import type { SignupStatus } from '@/components/ui/status-badge';
import type { PaymentStatus } from '@/components/ui/payment-badge';
import { SearchInput } from '@/components/ui/search-input';
import { SmartSignupsView } from '@/components/teacher/SmartSignupsView';
import { toast } from 'sonner';
import {
  fetchAllSignups,
  teacherCancelSignup,
  sendPaymentLink,
  markPaymentResolved,
  type SignupWithDetails,
} from '@/services/signups';
import type { ExceptionActionHandlers } from '@/components/teacher/ExceptionActionMenu';
import {
  useGroupedSignups,
  type SignupDisplay,
  type TimeFilter,
  type ModeFilter,
  type StatusFilter,
  type PaymentFilter,
} from '@/hooks/use-grouped-signups';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

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

export const SignupsPage = () => {
  const { currentOrganization } = useAuth();
  const [signups, setSignups] = useState<SignupWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  // Filters state
  const [modeFilter, setModeFilter] = useState<ModeFilter>('active');
  const [timeFilter, setTimeFilter] = useState<TimeFilter | null>('upcoming');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');

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

  // Transform signups to display format
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
        stripePaymentIntentId: signup.stripe_payment_intent_id || null,
        organizationId: signup.organization_id,
      };
    });
  }, [signups]);

  // Use grouped signups hook
  const { groups, stats, hasActiveFilters } = useGroupedSignups(displaySignups, {
    modeFilter,
    timeFilter,
    statusFilter,
    paymentFilter,
    searchQuery,
  });

  // Reset secondary filters when switching modes
  const handleModeChange = (newMode: ModeFilter) => {
    setModeFilter(newMode);

    if (newMode === 'active') {
      setTimeFilter('upcoming');
    } else if (newMode === 'needs_attention') {
      setTimeFilter(null);
    } else if (newMode === 'ended') {
      setTimeFilter(null);
    }

    setStatusFilter('all');
    setPaymentFilter('all');
  };

  const showTimeFilter = modeFilter === 'active';

  const getDefaultTimeFilter = (): TimeFilter | null => {
    if (modeFilter === 'active') return 'upcoming';
    return null;
  };

  const clearFilters = () => {
    setTimeFilter(getDefaultTimeFilter());
    setStatusFilter('all');
    setPaymentFilter('all');
    setSearchQuery('');
  };

  // ============================================
  // EXCEPTION ACTION HANDLERS
  // ============================================

  const actionHandlers: ExceptionActionHandlers = useMemo(() => ({
    onSendPaymentLink: async (signupId: string) => {
      const { error } = await sendPaymentLink(signupId);
      if (!error) {
        toast.success('Betalingslenke sendt');
      } else {
        toast.error(error.message);
      }
    },
    onCancelEnrollment: async (signupId: string, refund: boolean) => {
      const { error } = await teacherCancelSignup(signupId, { refund });
      if (!error) {
        toast.success('Deltaker avmeldt');
        loadSignups();
      } else {
        toast.error(error.message);
      }
    },
    onMarkResolved: async (signupId: string) => {
      const { error } = await markPaymentResolved(signupId);
      if (!error) {
        toast.success('Markert som betalt');
        loadSignups();
      } else {
        toast.error('Kunne ikke oppdatere status');
      }
    },
  }), [loadSignups]);

  return (
    <SidebarProvider>
      <TeacherSidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-surface">
        <MobileTeacherHeader title="Påmeldinger" />

        {/* Header Toolbar */}
        <motion.header
          variants={pageVariants}
          initial="initial"
          animate="animate"
          transition={pageTransition}
          className="flex flex-col gap-6 px-8 py-8 shrink-0"
        >
          <div>
            <h1 className="font-geist text-2xl font-medium tracking-tight text-text-primary">Påmeldinger</h1>
            <p className="text-sm text-text-secondary mt-1">Oversikt over studenter og bookinger.</p>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col gap-5">
            {/* Primary Mode Tabs */}
            <FilterTabs value={modeFilter} onValueChange={(v) => handleModeChange(v as ModeFilter)}>
              <FilterTab value="active">Aktive</FilterTab>
              <FilterTab value="ended">Avsluttet</FilterTab>
              <FilterTab value="needs_attention" className="flex items-center gap-1.5">
                <AlertCircle className={cn(
                  'h-3.5 w-3.5',
                  modeFilter === 'needs_attention' ? 'text-status-error-text' : 'text-zinc-400'
                )} />
                Krever handling
                {stats.totalExceptions > 0 && (
                  <span className={cn(
                    'px-1.5 py-0.5 rounded-full text-xxs font-medium',
                    modeFilter === 'needs_attention'
                      ? 'bg-status-error-bg text-status-error-text'
                      : 'bg-zinc-100 text-zinc-500'
                  )}>
                    {stats.totalExceptions}
                  </span>
                )}
              </FilterTab>
            </FilterTabs>

            {/* Secondary Filters Row */}
            <div className="flex flex-col md:flex-row gap-3 md:items-center">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Søk etter navn eller e-post"
                aria-label="Søk etter deltakere"
                className="flex-1 max-w-xs"
              />
              <div className="flex items-center gap-2 flex-wrap">
                {showTimeFilter && (
                  <TimeDropdown value={timeFilter} onChange={setTimeFilter} />
                )}
                {modeFilter !== 'needs_attention' && (
                  <StatusDropdown value={statusFilter} onChange={setStatusFilter} />
                )}

                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-text-secondary hover:text-text-primary underline underline-offset-2 ml-2"
                  >
                    Nullstill
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden px-8 pb-8">
          <div className="h-full overflow-auto custom-scrollbar">
            {error ? (
              <ErrorState
                title="Kunne ikke laste påmeldinger"
                message={error}
                onRetry={loadSignups}
                className="rounded-2xl bg-white border border-zinc-200"
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
                actionHandlers={actionHandlers}
              />
            )}
          </div>
        </div>
      </main>

    </SidebarProvider>
  );
};

export default SignupsPage;

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
  Archive,
} from 'lucide-react';
import { ErrorState } from '@/components/ui/error-state';
import { SidebarProvider } from '@/components/ui/sidebar';
import { pageVariants, pageTransition } from '@/lib/motion';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import type { SignupStatus } from '@/components/ui/status-badge';
import type { PaymentStatus } from '@/components/ui/payment-badge';
import { SearchInput } from '@/components/ui/search-input';
import { SmartSignupsView } from '@/components/teacher/SmartSignupsView';
import { toast } from 'sonner';
import { friendlyError } from '@/lib/error-messages';
import {
  fetchAllSignups,
  teacherCancelSignup,
  sendPaymentLink,
  markPaymentResolved,
  type SignupWithDetails,
} from '@/services/signups';
import type { ParticipantActionHandlers } from '@/components/teacher/ParticipantActionMenu';
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
    { value: null, label: 'Alle' },
    { value: 'upcoming', label: 'Kommende' },
    { value: 'today', label: 'I dag' },
    { value: 'this_week', label: 'Denne uken' },
  ];

  const currentLabel = options.find(o => o.value === value)?.label || 'Alle';
  const isActive = value !== null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cn(
          'flex items-center gap-2 h-10 rounded-lg border px-3 py-2 text-xs font-medium ios-ease whitespace-nowrap cursor-pointer',
          isActive
            ? 'bg-white text-text-primary border-border'
            : 'bg-white text-text-secondary border-border hover:bg-surface-elevated hover:text-text-primary'
        )}>
          <Calendar className="h-3.5 w-3.5" />
          Tid: {currentLabel}
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
  const [timeFilter, setTimeFilter] = useState<TimeFilter | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');

  // Fetch signups from database
  const loadSignups = useCallback(async () => {
    if (!currentOrganization?.id) return;

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await fetchAllSignups(currentOrganization.id);

    if (fetchError) {
      setError('Kunne ikke laste påmeldinger. Sjekk internettforbindelsen og prøv på nytt.');
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
    const todayStr = new Date().toISOString().split('T')[0];

    return signups.map(signup => {
      const courseTitle = signup.course?.title || 'Ukjent kurs';
      // For drop-in signups, use class_date (actual session date).
      // For course-series without class_date, use end_date so the signup
      // appears as "upcoming" while the course is still running. Fall back
      // to start_date only if end_date isn't set.
      const displayDate = signup.class_date
        || signup.course?.end_date
        || signup.course?.start_date
        || null;
      const displayTime = signup.class_time || extractTime(signup.course?.time_schedule || null);

      // A course has ended if its status is completed/cancelled,
      // or if end_date has passed (for course-series that haven't been marked completed yet)
      const courseStatus = signup.course?.status;
      const courseEndDate = signup.course?.end_date;
      const courseEnded =
        courseStatus === 'completed' ||
        courseStatus === 'cancelled' ||
        (courseEndDate != null && courseEndDate < todayStr);

      return {
        id: signup.id,
        courseId: signup.course?.id || signup.course_id,
        participantName: signup.participant_name || signup.profile?.name || 'Ukjent',
        participantEmail: signup.participant_email || signup.profile?.email || '',
        className: courseTitle,
        classDate: formatDate(displayDate),
        classTime: displayTime,
        classDateTime: displayDate ? new Date(displayDate) : new Date(),
        registeredAt: formatRelativeDate(signup.created_at || ''),
        registeredAtDate: new Date(signup.created_at || ''),
        status: signup.status as SignupStatus,
        paymentStatus: signup.payment_status as PaymentStatus,
        note: signup.note || undefined,
        amountPaid: signup.amount_paid ?? null,
        stripePaymentIntentId: signup.stripe_payment_intent_id || null,
        organizationId: signup.organization_id,
        courseEnded,
        courseCapacity: signup.course?.max_participants ?? null,
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
    setTimeFilter(null);
    setStatusFilter('all');
    setPaymentFilter('all');
  };

  const showTimeFilter = modeFilter === 'active';

  const clearFilters = () => {
    setTimeFilter(null);
    setStatusFilter('all');
    setPaymentFilter('all');
    setSearchQuery('');
  };

  // ============================================
  // EXCEPTION ACTION HANDLERS
  // ============================================

  const actionHandlers: ParticipantActionHandlers = useMemo(() => ({
    onSendPaymentLink: async (signupId: string) => {
      const { error } = await sendPaymentLink(signupId);
      if (!error) {
        toast.success('Betalingslenke sendt');
      } else {
        toast.error(friendlyError(error, 'Kunne ikke sende betalingslenke'));
      }
    },
    onCancelEnrollment: async (signupId: string, refund: boolean) => {
      const { error } = await teacherCancelSignup(signupId, { refund });
      if (!error) {
        toast.success('Deltaker avbestilt');
        loadSignups();
      } else {
        toast.error(friendlyError(error, 'Kunne ikke avbestille deltaker'));
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
      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto bg-surface">
        <MobileTeacherHeader title="Påmeldinger" />

        {/* Header */}
        <motion.header
          variants={pageVariants}
          initial="initial"
          animate="animate"
          transition={pageTransition}
          className="shrink-0 px-6 lg:px-8 pt-6 lg:pt-8 pb-0"
        >
          <div className="mb-8">
            <h1 className="font-geist text-2xl font-medium tracking-tight text-text-primary">Påmeldinger</h1>
            <p className="text-sm text-text-secondary mt-1">Oversikt over deltakere og påmeldinger.</p>
          </div>

          {/* Filters row */}
          <div className="flex flex-col md:flex-row gap-3 md:items-center pb-4">
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
              <StatusDropdown value={statusFilter} onChange={setStatusFilter} />

              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-text-secondary hover:text-text-primary underline underline-offset-2 ml-2"
                >
                  Nullstill
                </button>
              )}
            </div>
            <div className="md:ml-auto">
              <button
                onClick={() => handleModeChange(modeFilter === 'ended' ? 'active' : 'ended')}
                className={cn(
                  'flex items-center gap-2 h-10 rounded-lg border px-3 py-2 text-xs font-medium ios-ease whitespace-nowrap cursor-pointer',
                  modeFilter === 'ended'
                    ? 'bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800'
                    : 'bg-white text-text-secondary border-border hover:bg-surface-elevated hover:text-text-primary'
                )}
              >
                <Archive className="h-3.5 w-3.5" />
                Arkiv
              </button>
            </div>
          </div>
        </motion.header>

        {/* Content Area */}
        <div className="flex-1 px-6 lg:px-8 pb-6 lg:pb-8">
          <div>
            {error ? (
              <ErrorState
                title="Kunne ikke laste påmeldinger"
                message={error}
                onRetry={loadSignups}
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

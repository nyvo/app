import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { SignupFilterDropdown, type CombinedFilter } from '@/components/teacher/SignupFilterDropdown';
import { ErrorState } from '@/components/ui/error-state';

import { pageVariants, pageTransition } from '@/lib/motion';

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
  type StatusFilter,
  type PaymentFilter,
} from '@/hooks/use-grouped-signups';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { typedFrom } from '@/lib/supabase';

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

// Combined signup filter — merges status + payment into one meaningful dropdown
export const SignupsPage = () => {
  const { currentOrganization } = useAuth();
  const [signups, setSignups] = useState<SignupWithDetails[]>([]);
  const [nextSessionDates, setNextSessionDates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  // Filters state
  const [combinedFilter, setCombinedFilter] = useState<CombinedFilter>('all');
  const [showPast, setShowPast] = useState(false);

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

    const signupsData = data || [];
    setSignups(signupsData);

    // Fetch next upcoming session date per course (for DateBadge)
    const courseIds = [...new Set(signupsData.map(s => s.course_id).filter(Boolean))];
    if (courseIds.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const { data: sessionsData } = await typedFrom('course_sessions')
        .select('course_id, session_date')
        .in('course_id', courseIds)
        .gte('session_date', today)
        .order('session_date', { ascending: true });

      const nextDates: Record<string, string> = {};
      (sessionsData as { course_id: string; session_date: string }[] | null)?.forEach(s => {
        if (!nextDates[s.course_id]) {
          nextDates[s.course_id] = s.session_date;
        }
      });
      setNextSessionDates(nextDates);
    }

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
      // Date priority for DateBadge:
      // 1. class_date (drop-in signups with a specific session)
      // 2. Next upcoming session (fetched from course_sessions)
      // 3. start_date as fallback
      const courseId = signup.course?.id || signup.course_id;
      const displayDate = signup.class_date
        || nextSessionDates[courseId]
        || signup.course?.start_date
        || null;
      const displayTime = signup.class_time || extractTime(signup.course?.time_schedule || null);

      // A course has ended if its dates are in the past (same logic as courses page)
      const courseEndDate = signup.course?.end_date;
      const courseStartDate = signup.course?.start_date;
      const cutoffDate = courseEndDate || courseStartDate;
      const courseEnded = cutoffDate != null && cutoffDate < todayStr;

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
  }, [signups, nextSessionDates]);

  // Count signups per filter option (active signups only)
  const filterCounts = useMemo((): Record<CombinedFilter, number> => {
    const active = displaySignups.filter(s => !s.courseEnded && s.status !== 'cancelled' && s.status !== 'course_cancelled');

    const counts: Record<CombinedFilter, number> = {
      all: active.length,
      pending_payment: 0,
      payment_failed: 0,
      cancelled: 0,
      refunded: 0,
    };
    for (const s of active) {
      if (s.paymentStatus === 'pending' && s.status === 'confirmed') counts.pending_payment++;
      if (s.paymentStatus === 'failed') counts.payment_failed++;
      if (s.status === 'cancelled' || s.status === 'course_cancelled') counts.cancelled++;
      if (s.paymentStatus === 'refunded') counts.refunded++;
    }
    return counts;
  }, [displaySignups]);

  // Map combined filter to hook params
  const hookFilters = useMemo(() => {
    let statusFilter: StatusFilter = 'all';
    let paymentFilter: PaymentFilter = 'all';

    switch (combinedFilter) {
      case 'cancelled':
        statusFilter = 'cancelled';
        break;
      case 'refunded':
        paymentFilter = 'refunded';
        break;
    }

    return { statusFilter, paymentFilter };
  }, [combinedFilter]);

  // Pre-filter for combined filter options that the hook can't handle directly
  const filteredDisplaySignups = useMemo(() => {
    if (combinedFilter === 'pending_payment') {
      return displaySignups.filter(s => s.paymentStatus === 'pending' && s.status === 'confirmed');
    }
    if (combinedFilter === 'payment_failed') {
      return displaySignups.filter(s => s.paymentStatus === 'failed');
    }
    return displaySignups;
  }, [displaySignups, combinedFilter]);

  // Active signups (main view)
  const { groups, stats, hasActiveFilters } = useGroupedSignups(filteredDisplaySignups, {
    modeFilter: 'active',
    timeFilter: null,
    statusFilter: hookFilters.statusFilter,
    paymentFilter: hookFilters.paymentFilter,
    searchQuery,
  });

  // Past signups — only date-based (courseEnded), no cancelled-signup mixing
  const pastDisplaySignups = useMemo(
    () => displaySignups.filter(s => s.courseEnded),
    [displaySignups]
  );
  const { groups: pastGroups } = useGroupedSignups(pastDisplaySignups, {
    modeFilter: 'ended',
    timeFilter: null,
    statusFilter: 'all',
    paymentFilter: 'all',
    searchQuery,
  });

  // Auto-expand past section when search finds results there
  useEffect(() => {
    if (searchQuery.trim() && pastGroups.length > 0) {
      setShowPast(true);
    } else if (!searchQuery.trim()) {
      setShowPast(false);
    }
  }, [searchQuery, pastGroups.length]);

  const clearFilters = () => {
    setCombinedFilter('all');
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
              <SignupFilterDropdown value={combinedFilter} onChange={setCombinedFilter} counts={filterCounts} />
            </div>
          </div>
        </motion.header>

        {/* Content Area */}
        <div className="flex-1 px-6 lg:px-8 pb-6 lg:pb-8">
          {error ? (
            <ErrorState
              title="Kunne ikke laste påmeldinger"
              message={error}
              onRetry={loadSignups}
            />
          ) : (
            <div>
              <SmartSignupsView
                groups={groups}
                stats={stats}
                isLoading={loading}
                isEmpty={displaySignups.length === 0}
                hasFilters={hasActiveFilters || combinedFilter !== 'all'}
                mode="active"
                onClearFilters={clearFilters}
                actionHandlers={actionHandlers}
              />

              {/* Past / ended section */}
              {!loading && pastGroups.length > 0 && (
                <div className="mt-8">
                  <button
                    onClick={() => setShowPast(prev => !prev)}
                    className="flex items-center gap-2 border-t border-zinc-200 pt-4 w-full text-left cursor-pointer"
                  >
                    <ChevronRight className={cn(
                      'h-3.5 w-3.5 text-text-tertiary smooth-transition',
                      showPast && 'rotate-90'
                    )} />
                    <span className="text-sm font-medium text-text-tertiary">
                      {pastGroups.length} avsluttede kurs
                    </span>
                  </button>

                  {showPast && (
                    <div className="mt-6 opacity-60">
                      <SmartSignupsView
                        groups={pastGroups}
                        stats={stats}
                        isLoading={false}
                        isEmpty={false}
                        hasFilters={false}
                        mode="ended"
                        actionHandlers={actionHandlers}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
  );
};

export default SignupsPage;

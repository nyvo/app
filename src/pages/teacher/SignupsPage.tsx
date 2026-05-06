import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Search, Filter } from '@/lib/icons';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';

import { pageVariants, pageTransition } from '@/lib/motion';

import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import type { SignupStatus, PaymentStatus, ExceptionType, SignupDisplay, CourseType, TicketAudience, TicketKind } from '@/types/database';
import { SearchInput } from '@/components/ui/search-input';
import {
  SignupListView,
  PastSignupsList,
  SIGNUPS_INITIAL_VISIBLE,
  SIGNUPS_LOAD_MORE_INCREMENT,
  SIGNUPS_SHOW_ALL_THRESHOLD,
} from '@/components/teacher/SignupListView';
import { SignupsKpiStrip, type SignupsKpis } from '@/components/teacher/SignupsKpiStrip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { friendlyError } from '@/lib/error-messages';
import {
  fetchAllSignups,
  teacherCancelSignup,
  markPaymentResolved,
  type SignupWithDetails,
} from '@/services/signups';
import type { ParticipantActionHandlers } from '@/components/teacher/ParticipantActionMenu';
import { useAuth } from '@/contexts/AuthContext';
import { typedFrom } from '@/lib/supabase';
import { cn } from '@/lib/utils';

function formatDate(dateString: string | null): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  const months = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
  return `${date.getDate()}. ${months[date.getMonth()]}`;
}

function extractTime(timeSchedule: string | null): string {
  if (!timeSchedule) return '';
  const match = timeSchedule.match(/(\d{1,2}:\d{2})/);
  return match ? match[1] : '';
}

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

function detectException(signup: SignupDisplay): ExceptionType | null {
  if (signup.status === 'cancelled' || signup.status === 'course_cancelled') return null;
  if (signup.paymentStatus === 'failed') return 'payment_failed';
  if (signup.paymentStatus === 'pending' && signup.status === 'confirmed') return 'pending_payment';
  return null;
}

function isFollowup(s: SignupDisplay): boolean {
  if (s.paymentStatus === 'pending' && s.status === 'confirmed') return true;
  if (s.paymentStatus === 'failed') return true;
  if (s.status === 'course_cancelled' && s.paymentStatus !== 'refunded') return true;
  return false;
}

type ViewTab = 'active' | 'followup' | 'past';

/**
 * Inline segmented control — same shape as the one on /teacher/courses.
 * Muted track, active pill flips to bg-background + soft shadow.
 */
function SegmentedTabs({
  value,
  onChange,
  tabs,
}: {
  value: ViewTab;
  onChange: (v: ViewTab) => void;
  tabs: { key: ViewTab; label: string; count?: number }[];
}) {
  return (
    <div role="tablist" aria-label="Filtrer påmeldinger" className="inline-flex rounded-lg bg-muted p-0.5 gap-0.5 w-fit">
      {tabs.map(t => {
        const active = value === t.key;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              'outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
              active
                ? 'bg-background text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={cn(
                'tabular-nums text-xs',
                active ? 'text-foreground' : 'text-muted-foreground',
              )}>
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export const SignupsPage = () => {
  const { currentSeller } = useAuth();
  const [signups, setSignups] = useState<SignupWithDetails[]>([]);
  const [nextSessionDates, setNextSessionDates] = useState<Record<string, string>>({});
  const [kpis, setKpis] = useState<SignupsKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [viewTab, setViewTab] = useState<ViewTab>('active');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [visibleCount, setVisibleCount] = useState(SIGNUPS_INITIAL_VISIBLE);

  const loadSignups = useCallback(async () => {
    if (!currentSeller?.id) return;

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await fetchAllSignups(currentSeller.id);

    if (fetchError) {
      setError('Kunne ikke laste påmeldinger. Sjekk internettforbindelsen og prøv på nytt.');
      setLoading(false);
      return;
    }

    const signupsData = data || [];
    setSignups(signupsData);

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
  }, [currentSeller?.id]);

  useEffect(() => { loadSignups(); }, [loadSignups]);

  // Distinct courses on this org's signups — drives the course filter dropdown.
  const courseOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of signups) {
      const id = s.course?.id || s.course_id;
      const title = s.course?.title || 'Ukjent kurs';
      if (id && !seen.has(id)) seen.set(id, title);
    }
    return Array.from(seen.entries()).map(([id, title]) => ({ id, title }));
  }, [signups]);

  // Transform → display rows.
  const displaySignups: SignupDisplay[] = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    const mapped = signups.map(signup => {
      const courseTitle = signup.course?.title || 'Ukjent kurs';
      const courseId = signup.course?.id || signup.course_id;
      const displayDate = signup.course_session?.session_date
        || nextSessionDates[courseId]
        || signup.course?.start_date
        || null;
      const rawTime = signup.course_session?.start_time
        || extractTime(signup.course?.time_schedule || null);
      const displayTime = rawTime ? rawTime.slice(0, 5) : '';

      const courseEndDate = signup.course?.end_date;
      const courseStartDate = signup.course?.start_date;
      const cutoffDate = courseEndDate || courseStartDate;
      const courseEnded = cutoffDate != null && cutoffDate < todayStr;

      const display: SignupDisplay = {
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
        dinteroTransactionId: signup.dintero_transaction_id || null,
        sellerId: signup.seller_id,
        courseEnded,
        courseEndDate: courseEndDate ?? courseStartDate ?? null,
        courseCapacity: signup.course?.max_participants ?? null,
        ticketLabel: signup.ticket_label_snapshot,
        ticketKind: signup.ticket_kind_snapshot as TicketKind | undefined,
        ticketAudience: signup.ticket_audience_snapshot as TicketAudience | undefined,
        courseType: signup.course?.course_type as CourseType | undefined,
        courseStartDate: courseStartDate ?? null,
        courseTotalWeeks: signup.course?.total_weeks ?? null,
      };

      display.exceptionType = detectException(display);
      return display;
    });

    mapped.sort((a, b) => b.registeredAtDate.getTime() - a.registeredAtDate.getTime());
    return mapped;
  }, [signups, nextSessionDates]);

  // ── Compute KPIs ───────────────────────────────────────────────────────
  useEffect(() => {
    if (loading) return;
    const weekStart = new Date();
    const day = weekStart.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    weekStart.setDate(weekStart.getDate() + diffToMonday);
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    let newThisWeek = 0;
    let monthRevenue = 0;
    let cancellationsThisMonth = 0;
    let followupCount = 0;

    for (const s of displaySignups) {
      if (isFollowup(s)) followupCount++;
      const t = s.registeredAtDate.getTime();
      const isConfirmed = s.status === 'confirmed';
      const isCancelled = s.status === 'cancelled' || s.status === 'course_cancelled';
      if (isConfirmed && t >= weekStart.getTime()) newThisWeek++;
      if (isConfirmed && t >= monthStart.getTime()) monthRevenue += s.amountPaid ?? 0;
      if (isCancelled && t >= monthStart.getTime()) cancellationsThisMonth++;
    }

    setKpis({ newThisWeek, followupCount, cancellationsThisMonth, monthRevenue });
  }, [displaySignups, loading]);

  const followupCount = useMemo(
    () => displaySignups.reduce((n, s) => n + (isFollowup(s) ? 1 : 0), 0),
    [displaySignups],
  );

  const filteredSignups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    let result = displaySignups.filter(s => {
      if (viewTab === 'followup') return isFollowup(s);
      if (viewTab === 'past') return !!s.courseEnded && !isFollowup(s);
      return !s.courseEnded && !isFollowup(s);
    });

    if (courseFilter !== 'all') {
      result = result.filter(s => s.courseId === courseFilter);
    }

    if (q) {
      result = result.filter(s =>
        s.participantName.toLowerCase().includes(q) ||
        s.participantEmail.toLowerCase().includes(q),
      );
    }

    const sorted = [...result];
    sorted.sort((a, b) => {
      if (viewTab === 'followup') {
        return a.registeredAtDate.getTime() - b.registeredAtDate.getTime();
      }
      if (viewTab === 'past') {
        const aEnd = a.courseEndDate || '';
        const bEnd = b.courseEndDate || '';
        const byCourseEnd = bEnd.localeCompare(aEnd);
        if (byCourseEnd !== 0) return byCourseEnd;
        return b.registeredAtDate.getTime() - a.registeredAtDate.getTime();
      }
      return b.registeredAtDate.getTime() - a.registeredAtDate.getTime();
    });
    return sorted;
  }, [displaySignups, viewTab, searchQuery, courseFilter]);

  useEffect(() => {
    setVisibleCount(SIGNUPS_INITIAL_VISIBLE);
  }, [viewTab, searchQuery, courseFilter]);

  const usePastGrouping = viewTab === 'past' && !searchQuery && courseFilter === 'all' && filteredSignups.length > 0;
  const effectiveVisible = (filteredSignups.length - visibleCount) <= SIGNUPS_SHOW_ALL_THRESHOLD
    ? filteredSignups.length
    : visibleCount;
  const visibleSignups = filteredSignups.slice(0, effectiveVisible);
  const remainingCount = filteredSignups.length - effectiveVisible;
  const isTruncated = remainingCount > 0;
  const canCollapse = visibleCount > SIGNUPS_INITIAL_VISIBLE;
  const showPagination = !error && !usePastGrouping && filteredSignups.length > 0 && (isTruncated || canCollapse);

  const clearFilters = () => {
    setViewTab('active');
    setSearchQuery('');
    setCourseFilter('all');
  };

  const hasFilters = viewTab !== 'active' || searchQuery.trim() !== '' || courseFilter !== 'all';

  const actionHandlers: ParticipantActionHandlers = useMemo(() => ({
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

  const tabs: { key: ViewTab; label: string; count?: number }[] = [
    { key: 'active', label: 'Påmeldinger' },
    { key: 'followup', label: 'Til oppfølging', count: followupCount > 0 ? followupCount : undefined },
    { key: 'past', label: 'Fullførte' },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-full overflow-y-auto bg-background">
      <MobileTeacherHeader title="Påmeldinger" />

      <motion.header
        variants={pageVariants}
        initial="initial"
        animate="animate"
        transition={pageTransition}
        className="shrink-0 px-6 lg:px-8 pt-6 lg:pt-8 pb-0"
      >
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-foreground">Påmeldinger</h1>
          <p className="text-sm mt-1 text-muted-foreground">Hvem som er påmeldt, hva de kjøpte, og hva som trenger oppfølging.</p>
        </div>
      </motion.header>

      <div className="flex-1 px-6 lg:px-8 pb-6 lg:pb-8">
        {/* KPI strip */}
        <SignupsKpiStrip kpis={kpis} loading={loading} />

        {/* Toolbar — OUTSIDE the frame */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3">
          <SegmentedTabs value={viewTab} onChange={setViewTab} tabs={tabs} />
          <div className="flex w-full items-center gap-2 md:ml-auto md:w-auto">
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="w-44" aria-label="Filtrer kurs">
                <Filter className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle kurs</SelectItem>
                {courseOptions.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Søk etter navn eller e-post"
              aria-label="Søk etter deltakere"
              className="w-full md:w-auto md:max-w-xs"
            />
          </div>
        </div>

        {/* Frame */}
        <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
          {error ? (
            <ErrorState
              title="Kunne ikke laste påmeldinger"
              message={error}
              onRetry={loadSignups}
            />
          ) : usePastGrouping ? (
            loading ? null : filteredSignups.length === 0 ? (
              <EmptyState
                icon={hasFilters ? Search : Calendar}
                title={hasFilters ? 'Ingen treff' : 'Ingen fullførte påmeldinger'}
                description={hasFilters ? 'Prøv et annet søkeord eller bytt fane.' : 'Påmeldinger dukker opp her når kurs er ferdige.'}
                className="py-16"
              />
            ) : (
              <div className="p-3">
                <PastSignupsList
                  signups={filteredSignups}
                  actionHandlers={actionHandlers}
                  onMutate={loadSignups}
                />
              </div>
            )
          ) : (
            <SignupListView
              signups={visibleSignups}
              isLoading={loading}
              isEmpty={displaySignups.length === 0}
              hasFilters={hasFilters}
              onClearFilters={clearFilters}
              actionHandlers={actionHandlers}
              viewTab={viewTab}
              onMutate={loadSignups}
            />
          )}

          {/* Footer — INSIDE frame, single row */}
          {showPagination && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-background">
              <span className="text-xs text-muted-foreground tabular-nums">
                Viser {effectiveVisible} av {filteredSignups.length} påmeldinger
              </span>
              <div className="flex gap-2">
                {canCollapse && (
                  <Button
                    variant="outline-soft"
                    size="sm"
                    onClick={() => setVisibleCount(SIGNUPS_INITIAL_VISIBLE)}
                  >
                    Vis færre
                  </Button>
                )}
                {isTruncated && (
                  <Button
                    variant="outline-soft"
                    size="sm"
                    onClick={() => setVisibleCount(prev => prev + SIGNUPS_LOAD_MORE_INCREMENT)}
                  >
                    Vis {Math.min(remainingCount, SIGNUPS_LOAD_MORE_INCREMENT)} flere
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignupsPage;

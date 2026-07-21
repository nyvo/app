import { useState, useCallback, useEffect, lazy, Suspense, type ReactNode } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { routes } from '@/lib/routes';
import { Button } from '@/components/ui/button';
import { NotificationsPopover } from '@/components/notifications/NotificationsPopover';
import { PageShell } from '@/components/teacher/PageShell';
import { FramedCard, FramedCardPanel } from '@/components/teacher/FramedCard';
import { ParticipantDetailDrawer } from '@/components/teacher/ParticipantDetailDrawer';
import { WelcomeBand } from '@/components/teacher/dashboard/WelcomeBand';
// Lazy: IncomeChart is the only recharts consumer in product code, and
// recharts alone is a ~350 KB chunk — keep it out of the dashboard's own
// chunk so the overview paints without waiting for chart internals.
const IncomeChart = lazy(() =>
  import('@/components/teacher/dashboard/IncomeChart').then((m) => ({ default: m.IncomeChart })),
);
import {
  fetchIncomeSeries,
  fetchPlatformFeeMonth,
  type IncomeRange,
  type IncomeSeries,
} from '@/services/income';
import { DateBadge } from '@/components/ui/date-badge';
import { formatKroner } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DelayedFallback } from '@/components/ui/delayed-fallback';
import { useAuth } from '@/contexts/AuthContext';
import { fetchNextSessions } from '@/services/courses';
import type { Course as CourseDB, CourseSession } from '@/types/database';
import {
  fetchRecentSignups,
  teacherCancelSignup,
  type SignupWithDetails,
} from '@/services/signups';
import { friendlyError } from '@/lib/error-messages';
import { toast } from 'sonner';
import { extractTimeFromSchedule } from '@/utils/timeExtraction';
import { formatRelativeTimePast } from '@/utils/dateFormatting';
import { useMultiTableSubscription } from '@/hooks/use-realtime-subscription';
import { isProSeller, shouldShowPlatformFeeUpsell } from '@/lib/payments';
import type {
  Course as DashboardCourse,
  CourseStyleType as DashboardCourseType,
} from '@/types/dashboard';

const ROW_LIMIT = 3;

const DAY_NAMES = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'] as const;

function mapSessionForDashboard(
  session: CourseSession,
  course: CourseDB,
  signupCount?: number,
): DashboardCourse {
  const styleType: DashboardCourseType = course.format === 'series' ? 'course-series' : 'event';
  const subtitle = course.location || (course.format === 'series' ? 'Kursrekke' : 'Enkelttime');

  return {
    id: course.id,
    title: course.title,
    subtitle,
    time: session.start_time?.slice(0, 5) || (extractTimeFromSchedule(course.time_schedule)?.time ?? ''),
    type: styleType,
    date: session.session_date || undefined,
    imageUrl: course.image_url,
    signups: signupCount,
    capacity: course.max_participants ?? undefined,
  };
}

function dayLabel(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return '';
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'I dag';
  if (diffDays === 1) return 'I morgen';
  return DAY_NAMES[target.getDay()];
}

const TeacherDashboard = () => {
  const { currentSeller } = useAuth();
  const isPro = isProSeller(currentSeller);
  const sellerId = currentSeller?.id;
  const queryClient = useQueryClient();
  const [incomeRange, setIncomeRange] = useState<IncomeRange>('month');
  const [selectedSignupId, setSelectedSignupId] = useState<string | null>(null);
  // Snapshot of the drawer's signup, taken at click time and refreshed only
  // while the row is still present in the top-3 cache. A realtime refetch can
  // drop the row out of that top-3 window while the drawer is open — without
  // this snapshot the drawer would blank mid-read instead of just going stale.
  const [selectedSignupSnapshot, setSelectedSignupSnapshot] = useState<SignupWithDetails | null>(
    null,
  );
  // Bumped by the chart error-fallback's retry and passed as the boundary's
  // resetKey, so retry actually remounts the crashed chart subtree.
  const [chartRetryCount, setChartRetryCount] = useState(0);

  // Server state on TanStack Query. What the old hand-rolled version needed
  // bespoke code for comes free here: background refetch errors keep
  // last-known data (no false empty states), realtime events invalidate
  // instead of re-orchestrating fetches, and focus-refetch keeps a kept-open
  // dashboard current.
  const nextSessionsQuery = useQuery({
    queryKey: ['dashboard-next-sessions', sellerId],
    enabled: !!sellerId,
    queryFn: async (): Promise<DashboardCourse[]> => {
      const { data, error } = await fetchNextSessions(sellerId!, ROW_LIMIT);
      if (error) throw error;
      return (data ?? []).map(({ session, course, signupCount }) =>
        mapSessionForDashboard(session, course, signupCount),
      );
    },
  });

  const recentSignupsQuery = useQuery({
    queryKey: ['dashboard-recent-signups', sellerId],
    enabled: !!sellerId,
    queryFn: async (): Promise<SignupWithDetails[]> => {
      const { data, error } = await fetchRecentSignups(sellerId!, ROW_LIMIT);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Income chart — keyed on the range so toggling 7/30 dager/12 mnd is
  // cached per range; keepPreviousData shows the old series while the next
  // one loads instead of flashing a skeleton.
  const incomeQuery = useQuery({
    queryKey: ['income-series', sellerId, incomeRange],
    enabled: !!sellerId,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<IncomeSeries> => {
      const { data, error } = await fetchIncomeSeries(sellerId!, incomeRange);
      if (error || !data) throw error ?? new Error('Income series unavailable');
      return data;
    },
  });

  // Free-tier fee line — this month's platform take, the seller's self-serve
  // Pro crossover math. Not fetched for Pro (their take is 0).
  const feeQuery = useQuery({
    queryKey: ['platform-fee-month', sellerId],
    enabled: !!sellerId && !isPro,
    queryFn: async (): Promise<number> => {
      const { data, error } = await fetchPlatformFeeMonth(sellerId!);
      if (error) throw error;
      return data;
    },
  });

  const refetchDashboardData = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['dashboard-next-sessions', sellerId] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard-recent-signups', sellerId] });
    void queryClient.invalidateQueries({ queryKey: ['income-series', sellerId] });
  }, [queryClient, sellerId]);

  // Drawer actions mirror the course page; invalidation refreshes the lists.
  const handleCancelEnrollment = async (signupId: string, refund: boolean): Promise<boolean> => {
    const { error } = await teacherCancelSignup(signupId, { refund });
    if (error) {
      toast.error(friendlyError(error, 'Kunne ikke avbestille påmeldingen'));
      return false;
    }
    toast.success(refund ? 'Påmelding avbestilt og refusjon behandlet' : 'Påmelding avbestilt');
    refetchDashboardData();
    return true;
  };

  useMultiTableSubscription(
    [
      { table: 'signups', filter: `seller_id=eq.${currentSeller?.id}` },
      { table: 'courses', filter: `seller_id=eq.${currentSeller?.id}` },
    ],
    refetchDashboardData,
    !!currentSeller?.id,
    currentSeller?.id,
  );

  const handleSelectSignup = useCallback(
    (signupId: string) => {
      setSelectedSignupId(signupId);
      setSelectedSignupSnapshot(
        recentSignupsQuery.data?.find((s) => s.id === signupId) ?? null,
      );
    },
    [recentSignupsQuery.data],
  );

  // Keep the snapshot current while the row is still present; otherwise keep
  // the last-known value rather than blanking the open drawer.
  useEffect(() => {
    if (selectedSignupId === null) return;
    const fresh = recentSignupsQuery.data?.find((s) => s.id === selectedSignupId);
    if (fresh) setSelectedSignupSnapshot(fresh);
  }, [recentSignupsQuery.data, selectedSignupId]);

  const dashboardCourses = nextSessionsQuery.data ?? null;
  const recentSignupsRaw = recentSignupsQuery.data ?? null;
  const incomeSeries = incomeQuery.data ?? null;
  const monthPlatformFee = feeQuery.data ?? 0;
  const isLoading = !!sellerId && (nextSessionsQuery.isPending || recentSignupsQuery.isPending);
  // Error page only when a list failed with NOTHING to show — a failed
  // background refetch keeps rendering last-known data.
  const loadError =
    (nextSessionsQuery.isError && nextSessionsQuery.data === undefined) ||
    (recentSignupsQuery.isError && recentSignupsQuery.data === undefined)
      ? 'Prøv igjen om litt.'
      : null;
  const incomeLoadFailed = incomeQuery.isError && incomeQuery.data === undefined;
  const platformFeeHint = shouldShowPlatformFeeUpsell(monthPlatformFee, isPro)
    ? <PlatformFeeHint feeNok={monthPlatformFee} />
    : undefined;
  const retryDashboardLists = useCallback(() => {
    void nextSessionsQuery.refetch();
    void recentSignupsQuery.refetch();
  }, [nextSessionsQuery, recentSignupsQuery]);

  return (
    <>
      <PageShell
        title="Oversikt"
        action={<NotificationsPopover />}
      >
          {loadError ? (
            <ErrorState
              title="Kunne ikke laste oversikten"
              message={loadError}
              onRetry={retryDashboardLists}
            />
          ) : (
            <div className="space-y-12">
              <WelcomeBand />
              {/* Chart-first is deliberate here (kept 2026-07-07 after an
                  audit proposed list-first per ui-patterns §2.5). */}
              <ErrorBoundary
                resetKey={chartRetryCount}
                fallback={
                  <FramedCard title="Inntekt">
                    <FramedCardPanel className="items-center justify-center p-6">
                      <ErrorState
                        variant="inline"
                        onRetry={() => {
                          refetchDashboardData();
                          setChartRetryCount((count) => count + 1);
                        }}
                      />
                    </FramedCardPanel>
                  </FramedCard>
                }
              >
                {incomeLoadFailed ? (
                  // Query-level failure (not a render crash): the boundary
                  // never trips, so surface the retryable error card here.
                  <FramedCard title="Inntekt">
                    <FramedCardPanel className="items-center justify-center">
                      <ErrorState
                        variant="inline"
                        title="Kunne ikke laste inntekten"
                        message="Prøv igjen om litt."
                        onRetry={() => incomeQuery.refetch()}
                      />
                    </FramedCardPanel>
                  </FramedCard>
                ) : (
                  <Suspense
                    fallback={
                      <DelayedFallback>
                        <IncomeChartFallback footer={platformFeeHint} />
                      </DelayedFallback>
                    }
                  >
                    <IncomeChart
                      series={incomeSeries}
                      isLoading={incomeSeries === null}
                      isFetching={incomeQuery.isFetching && !incomeQuery.isPending}
                      range={incomeRange}
                      onRangeChange={setIncomeRange}
                      footer={platformFeeHint}
                    />
                  </Suspense>
                )}
              </ErrorBoundary>

              {/* Equal-status modules share one composition while each keeps
                  its honest row count and independent interaction model. */}
              <DashboardActivityGrid
                courses={dashboardCourses}
                signups={recentSignupsRaw}
                isLoading={isLoading}
                onSelectSignup={handleSelectSignup}
              />
            </div>
          )}
      </PageShell>

      <ParticipantDetailDrawer
        open={selectedSignupId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSignupId(null);
            setSelectedSignupSnapshot(null);
          }
        }}
        signup={selectedSignupSnapshot}
        onCancelEnrollment={handleCancelEnrollment}
      />
    </>
  );
};

/**
 * Suspense fallback while the IncomeChart chunk (recharts) loads — mirrors the
 * real card anatomy (header action; total; plot; optional consequence footer)
 * so the chunk-load swap doesn't jump the layout. Only the data slots shimmer;
 * the plot is a quiet hairline-framed reservation, not a solid pulsing slab —
 * a 260px animated rectangle dominated the whole page while loading.
 */
function IncomeChartFallback({ footer }: { footer?: ReactNode }) {
  return (
    <FramedCard
      title="Inntekt"
      action={<Skeleton className="h-8 w-32 rounded-lg" />}
    >
      <FramedCardPanel className="px-4 py-5 sm:py-6">
        <Skeleton className="h-9 w-40" />
        <div
          aria-hidden="true"
          className="mt-6 h-[220px] w-full rounded-lg border border-border-subtle sm:h-[260px]"
        />
      </FramedCardPanel>
      {footer}
    </FramedCard>
  );
}

/**
 * The free tier's upgrade surface: this month's platform take as the lead
 * line, so the crossover math is the seller's own numbers — no salesmanship.
 * Two-tier text carries the consequence; the high-contrast action remains
 * unmistakable while the shared frame keeps the footer subordinate to data.
 * Exported so /dev/dashboard-preview can render it without auth.
 */
export function PlatformFeeHint({ feeNok }: { feeNok: number }) {
  const month = new Intl.DateTimeFormat('nb-NO', { month: 'long' }).format(new Date());
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface px-4 py-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium tabular-nums text-foreground">
          {formatKroner(feeNok)} i plattformgebyr så langt i {month}
        </p>
        <p className="text-sm text-foreground-muted">Med Pro beholder du alt</p>
      </div>
      <Button asChild className="w-full shrink-0 sm:w-auto">
        <Link to={routes.settingsBilling}>Oppgrader</Link>
      </Button>
    </div>
  );
}

// ─── Neste kurs ───────────────────────────────────────────────────────────
//
// These are independent data sets, but equal-status dashboard modules. Their
// shells align on desktop while the inset list keeps the actual row count
// honest: no filler row, stretched item, or explanatory copy is needed.

export function DashboardActivityGrid({
  courses,
  signups,
  isLoading,
  onSelectSignup,
}: {
  courses: DashboardCourse[] | null;
  signups: SignupWithDetails[] | null;
  isLoading: boolean;
  onSelectSignup: (signupId: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
      <UpcomingCoursesSection courses={courses} isLoading={isLoading} />
      <RecentSignupsSection
        signups={signups}
        isLoading={isLoading}
        onSelect={onSelectSignup}
      />
    </div>
  );
}

export function UpcomingCoursesSection({
  courses,
  isLoading,
}: {
  courses: DashboardCourse[] | null;
  isLoading: boolean;
}) {
  const items = (courses ?? []).slice(0, ROW_LIMIT);
  const showSkeleton = isLoading && courses === null;

  return (
    <section className="h-full">
      <FramedCard title="Neste kurs" className="h-full">
        {showSkeleton ? (
          <DelayedFallback>
            <RowsSkeleton variant="course" />
          </DelayedFallback>
        ) : items.length === 0 ? (
          <FramedCardPanel className="items-center justify-center p-6">
            <EmptyState
              variant="compact"
              title="Ingen kommende kurs"
              description="Opprett et kurs for å fylle timeplanen."
            />
          </FramedCardPanel>
        ) : (
          <FramedCardPanel className="divide-y divide-border-subtle">
            {items.map((course) => (
              <UpcomingCourseCard
                key={`${course.id}-${course.date}-${course.time}`}
                course={course}
              />
            ))}
          </FramedCardPanel>
        )}
      </FramedCard>
    </section>
  );
}

function UpcomingCourseCard({ course }: { course: DashboardCourse }) {
  const day = dayLabel(course.date);
  const time = course.time;
  const when = [day, time && `kl. ${time}`].filter(Boolean).join(' ');
  const hasCapacity = course.signups != null && course.capacity != null;

  return (
    <Link
      to={routes.course(course.id)}
      className="flex items-center gap-3 px-4 py-4 no-underline outline-none transition-colors hover:bg-hover active:bg-pressed focus-visible:bg-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring-subtle motion-reduce:transition-none"
    >
      <DateBadge dateStr={course.date} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium text-foreground">{course.title}</p>
        <p className="truncate text-sm text-foreground-muted">{when || '—'}</p>
      </div>
      {hasCapacity && (
        <span className="shrink-0 text-sm tabular-nums text-foreground-muted">
          {course.signups} / {course.capacity}
        </span>
      )}
    </Link>
  );
}

// ─── Siste påmeldinger ────────────────────────────────────────────────────

export function RecentSignupsSection({
  signups,
  isLoading,
  onSelect,
}: {
  signups: SignupWithDetails[] | null;
  isLoading: boolean;
  onSelect: (signupId: string) => void;
}) {
  const items = (signups ?? []).slice(0, ROW_LIMIT);
  const showSkeleton = isLoading && signups === null;

  return (
    <section className="h-full">
      <FramedCard title="Siste påmeldinger" className="h-full">
        {showSkeleton ? (
          <DelayedFallback>
            <RowsSkeleton variant="signup" />
          </DelayedFallback>
        ) : items.length === 0 ? (
          <FramedCardPanel className="items-center justify-center p-6">
            <EmptyState
              variant="compact"
              title="Ingen påmeldinger ennå"
              description="Nye påmeldinger vises her."
            />
          </FramedCardPanel>
        ) : (
          <FramedCardPanel className="divide-y divide-border-subtle">
            {items.map((signup) => (
              <SignupCard key={signup.id} signup={signup} onSelect={onSelect} />
            ))}
          </FramedCardPanel>
        )}
      </FramedCard>
    </section>
  );
}

function SignupCard({
  signup,
  onSelect,
}: {
  signup: SignupWithDetails;
  onSelect: (signupId: string) => void;
}) {
  const name = signup.profile?.name || signup.participant_name || 'Ukjent deltaker';
  const courseTitle = signup.course?.title;
  const when = signup.created_at ? formatRelativeTimePast(signup.created_at) : '';
  // No payment-state marker here (removed 2026-07-14): this list is a pulse,
  // not a worklist — pending/failed detail lives in the participant drawer.

  return (
    <button
      type="button"
      onClick={() => onSelect(signup.id)}
      className="flex w-full cursor-pointer items-center gap-3 px-4 py-4 text-left outline-none transition-colors hover:bg-hover active:bg-pressed focus-visible:bg-hover focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring-subtle motion-reduce:transition-none"
    >
      <UserAvatar name={name} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium text-foreground">{name}</p>
        <p className="truncate text-sm text-foreground-muted">
          {courseTitle ?? 'Ny påmelding'}
        </p>
      </div>
      <span className="shrink-0 text-sm tabular-nums text-foreground-muted">{when}</span>
    </button>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────

function RowsSkeleton({ variant }: { variant: 'course' | 'signup' }) {
  // Mirrors the real inset-list anatomy so loading never swaps between two
  // different container grammars.
  return (
    <FramedCardPanel className="divide-y divide-border-subtle">
      {Array.from({ length: ROW_LIMIT }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-4">
          <Skeleton className={variant === 'course' ? 'size-10 rounded-lg' : 'size-10 rounded-full'} />
          <div className="flex h-11 min-w-0 flex-1 flex-col justify-center gap-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3.5 w-24" />
          </div>
          <Skeleton className="h-3.5 w-8 shrink-0" />
        </div>
      ))}
    </FramedCardPanel>
  );
}

export default TeacherDashboard;

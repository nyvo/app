import { useState, useCallback, lazy, Suspense } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { routes } from '@/lib/routes';
import { Button } from '@/components/ui/button';
import { NotificationsPopover } from '@/components/notifications/NotificationsPopover';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { PageShell } from '@/components/teacher/PageShell';
import { FramedCard, FramedCardPanel } from '@/components/teacher/FramedCard';
import { ChevronRight } from '@/lib/icons';
import { ParticipantDetailDrawer } from '@/components/teacher/ParticipantDetailDrawer';
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
import { PaymentBadge } from '@/components/ui/payment-badge';
import { cn, formatKroner } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
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
import { isProSeller } from '@/lib/payments';
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

  // Income chart — keyed on the range so toggling Uke/Måned/År is cached per
  // range; keepPreviousData shows the old series while the next one loads
  // instead of flashing a skeleton.
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
  const handleCancelEnrollment = async (signupId: string, refund: boolean) => {
    const { error } = await teacherCancelSignup(signupId, { refund });
    if (error) {
      toast.error(friendlyError(error, 'Kunne ikke avbestille påmeldingen.'));
      return;
    }
    toast.success(refund ? 'Påmelding avbestilt og refusjon behandlet' : 'Påmelding avbestilt');
    refetchDashboardData();
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
      ? 'Kunne ikke laste oversikten.'
      : null;

  return (
    <div className="flex-1 overflow-y-auto bg-canvas h-full">
      <MobileTeacherHeader />

      <PageShell
        title="Oversikt"
        action={<NotificationsPopover />}
      >
          {loadError ? (
            <ErrorState
              title="Kunne ikke laste oversikten"
              message={loadError}
              onRetry={() => window.location.reload()}
            />
          ) : (
            <div className="space-y-12">
              {/* Chart-first is deliberate here (kept 2026-07-07 after an
                  audit proposed list-first per ui-patterns §2.5). */}
              <div className="space-y-3">
                <Suspense fallback={<Skeleton className="h-[280px] w-full rounded-lg" />}>
                  <IncomeChart
                    series={incomeSeries}
                    isLoading={incomeSeries === null}
                    range={incomeRange}
                    onRangeChange={setIncomeRange}
                  />
                </Suspense>
                {!isPro && monthPlatformFee > 0 && (
                  <PlatformFeeHint feeNok={monthPlatformFee} />
                )}
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <UpcomingCoursesSection courses={dashboardCourses} isLoading={isLoading} />
                <RecentSignupsSection
                  signups={recentSignupsRaw}
                  isLoading={isLoading}
                  onSelect={setSelectedSignupId}
                />
              </div>
            </div>
          )}
      </PageShell>

      <ParticipantDetailDrawer
        open={selectedSignupId !== null}
        onOpenChange={(open) => !open && setSelectedSignupId(null)}
        signup={recentSignupsRaw?.find((s) => s.id === selectedSignupId) ?? null}
        onCancelEnrollment={handleCancelEnrollment}
      />
    </div>
  );
};

/**
 * The free tier's upgrade surface: this month's platform take next to the Pro
 * price, so the crossover math is the seller's own numbers — no salesmanship.
 * Exported so /dev/dashboard-preview can render it without auth.
 */
export function PlatformFeeHint({ feeNok }: { feeNok: number }) {
  const month = new Intl.DateTimeFormat('nb-NO', { month: 'long' }).format(new Date());
  // Filled panel container, text left + action right (the Rox billing / Kajabi
  // upgrade-prompt shape) — not a floating line under the chart.
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-panel px-5 py-4 sm:flex-row sm:items-center">
      <p className="min-w-0 flex-1 text-sm text-foreground-muted">
        Du har betalt {formatKroner(feeNok)} i plattformgebyr i {month}. Med Pro: {formatKroner(0)}.
      </p>
      <Button asChild variant="secondary" className="w-full shrink-0 sm:w-auto">
        <Link to={routes.settingsBilling}>Se Pro</Link>
      </Button>
    </div>
  );
}

// ─── Neste kurs ───────────────────────────────────────────────────────────

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
    <FramedCard title="Neste kurs" className="min-h-56 flex-1">
      {showSkeleton ? (
        <RowsSkeleton variant="course" />
      ) : items.length === 0 ? (
        <FramedCardPanel className="items-center justify-center">
          <EmptyState
            variant="compact"
            title="Ingen kommende kurs"
            description="Opprett et kurs for å fylle timeplanen."
            action={
              <Button asChild variant="default">
                <Link to={routes.coursesNew}>Opprett kurs</Link>
              </Button>
            }
          />
        </FramedCardPanel>
      ) : (
        <FramedCardPanel className="divide-y divide-border-subtle">
          {items.map((course) => (
            <UpcomingCourseRow
              key={`${course.id}-${course.date}-${course.time}`}
              course={course}
            />
          ))}
        </FramedCardPanel>
      )}
    </FramedCard>
  );
}

function UpcomingCourseRow({ course }: { course: DashboardCourse }) {
  const day = dayLabel(course.date);
  const time = course.time;
  const when = [day, time && `kl. ${time}`].filter(Boolean).join(' · ');
  const hasCapacity = course.signups != null && course.capacity != null;

  return (
    <Link
      to={routes.course(course.id)}
      className="group flex items-center gap-3 px-5 py-4 no-underline outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <DateBadge dateStr={course.date} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium text-foreground">{course.title}</p>
        <p className="truncate text-base text-foreground-muted">{when || '—'}</p>
      </div>
      {/* Trailing slot: meta at rest, chevron on hover (150ms ease-out swap —
          transform+opacity only; hover: is hover-capable-device gated). */}
      <span className="relative flex min-w-4 shrink-0 items-center justify-end">
        {hasCapacity && (
          <span className="inline-block text-sm tabular-nums text-foreground-muted transition-[opacity,transform] duration-150 ease-out group-hover:translate-x-1 group-hover:opacity-0">
            {course.signups} / {course.capacity}
          </span>
        )}
        <ChevronRight className="absolute right-0 size-4 -translate-x-1 text-foreground-subtle opacity-0 transition-[opacity,transform] duration-150 ease-out group-hover:translate-x-0 group-hover:opacity-100" />
      </span>
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
    <FramedCard title="Siste påmeldinger" className="min-h-56 flex-1">
      {showSkeleton ? (
        <RowsSkeleton variant="signup" />
      ) : items.length === 0 ? (
        <FramedCardPanel className="items-center justify-center">
          <EmptyState
            variant="compact"
            title="Ingen påmeldinger ennå"
            description="Nye påmeldinger vises her."
          />
        </FramedCardPanel>
      ) : (
        <FramedCardPanel className="divide-y divide-border-subtle">
          {items.map((signup) => (
            <SignupRow key={signup.id} signup={signup} onSelect={onSelect} />
          ))}
        </FramedCardPanel>
      )}
    </FramedCard>
  );
}

function SignupRow({
  signup,
  onSelect,
}: {
  signup: SignupWithDetails;
  onSelect: (signupId: string) => void;
}) {
  const name = signup.profile?.name || signup.participant_name || 'Ukjent deltaker';
  const courseTitle = signup.course?.title;
  const when = signup.created_at ? formatRelativeTimePast(signup.created_at) : '';
  // Actionable-only badge: pending/failed call for attention. Settled states
  // (paid, refunded, external) stay silent here — this card is a pulse, not
  // a ledger; the full status lives in the participant drawer. On exception
  // rows the badge is the one trailing token on mobile; the timestamp yields.
  const hasExceptionBadge =
    signup.payment_status === 'pending' || signup.payment_status === 'failed';

  return (
    <button
      type="button"
      onClick={() => onSelect(signup.id)}
      className="group flex w-full items-center gap-3 px-5 py-4 text-left outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <UserAvatar name={name} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium text-foreground">{name}</p>
        <p className="truncate text-base text-foreground-muted">
          {courseTitle ?? 'Ny påmelding'}
        </p>
      </div>
      {hasExceptionBadge && signup.payment_status && (
        <PaymentBadge status={signup.payment_status} className="shrink-0" />
      )}
      {/* Trailing slot: timestamp at rest, chevron on hover (150ms ease-out
          swap — transform+opacity only). The badge never yields to hover. */}
      <span
        className={cn(
          'relative flex min-w-4 shrink-0 items-center justify-end',
          hasExceptionBadge && 'hidden sm:flex',
        )}
      >
        <span className="inline-block text-sm tabular-nums text-foreground-muted transition-[opacity,transform] duration-150 ease-out group-hover:translate-x-1 group-hover:opacity-0">
          {when}
        </span>
        <ChevronRight className="absolute right-0 size-4 -translate-x-1 text-foreground-subtle opacity-0 transition-[opacity,transform] duration-150 ease-out group-hover:translate-x-0 group-hover:opacity-100" />
      </span>
    </button>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────

function RowsSkeleton({ variant }: { variant: 'course' | 'signup' }) {
  // Mirrors the real row anatomy (leading 40px block + two 24px text lines +
  // trailing meta) so the list doesn't jump in height when data lands — and
  // the real container recipe (divided rows inside the white inset) so
  // loading never flashes the wrong shape.
  if (variant === 'course') {
    return (
      <FramedCardPanel className="divide-y divide-border-subtle">
        {Array.from({ length: ROW_LIMIT }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-4">
            <Skeleton className="size-10 rounded-lg" />
            <div className="flex h-12 min-w-0 flex-1 flex-col justify-center gap-2">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3.5 w-24" />
            </div>
            <Skeleton className="h-3.5 w-8 shrink-0" />
          </div>
        ))}
      </FramedCardPanel>
    );
  }

  return (
    <FramedCardPanel className="divide-y divide-border-subtle">
      {Array.from({ length: ROW_LIMIT }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-4">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex h-12 min-w-0 flex-1 flex-col justify-center gap-2">
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

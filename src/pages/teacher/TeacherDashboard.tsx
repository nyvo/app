import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { Link } from 'react-router-dom';
import { routes } from '@/lib/routes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NotificationsPopover } from '@/components/notifications/NotificationsPopover';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { PageShell } from '@/components/teacher/PageShell';
import { ParticipantDetailDrawer } from '@/components/teacher/ParticipantDetailDrawer';
import { IncomeChart } from '@/components/teacher/dashboard/IncomeChart';
import { fetchIncomeSeries, type IncomeRange, type IncomeSeries } from '@/services/income';
import { DateBadge } from '@/components/ui/date-badge';
import { PaymentBadge } from '@/components/ui/payment-badge';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCourses, fetchNextSessions } from '@/services/courses';
import type { Course as CourseDB, CourseSession } from '@/types/database';
import {
  fetchRecentSignups,
  teacherCancelSignup,
  markPaymentResolved,
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
  const subtitle = course.location || (course.format === 'series' ? 'Kursrekke' : 'Enkeltkurs');

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
  const [dashboardCourses, setDashboardCourses] = useState<DashboardCourse[] | null>(null);
  const [recentSignupsRaw, setRecentSignupsRaw] = useState<SignupWithDetails[] | null>(null);
  const [incomeSeries, setIncomeSeries] = useState<IncomeSeries | null>(null);
  const [incomeRange, setIncomeRange] = useState<IncomeRange>('month');
  const incomeRangeRef = useRef<IncomeRange>('month');
  incomeRangeRef.current = incomeRange;
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedSignupId, setSelectedSignupId] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  function processDashboardResults(
    nextSessionsResult: Awaited<ReturnType<typeof fetchNextSessions>>,
    signupsResult: Awaited<ReturnType<typeof fetchRecentSignups>>,
  ) {
    if (nextSessionsResult.data && nextSessionsResult.data.length > 0) {
      setDashboardCourses(
        nextSessionsResult.data.map(({ session, course, signupCount }) =>
          mapSessionForDashboard(session, course, signupCount),
        ),
      );
    } else {
      setDashboardCourses([]);
    }

    setRecentSignupsRaw(signupsResult.data ?? []);
  }

  const refetchDashboardData = useCallback(async () => {
    if (!currentSeller?.id) return;

    const [, nextSessionsResult, signupsResult, incomeResult] = await Promise.all([
      fetchCourses(currentSeller.id),
      fetchNextSessions(currentSeller.id, ROW_LIMIT),
      fetchRecentSignups(currentSeller.id, ROW_LIMIT),
      isPro
        ? fetchIncomeSeries(currentSeller.id, incomeRangeRef.current)
        : Promise.resolve({ data: null, error: null }),
    ]);

    processDashboardResults(nextSessionsResult, signupsResult);
    if (isPro && incomeResult.data) setIncomeSeries(incomeResult.data);
  }, [currentSeller?.id, isPro]);

  // Drawer actions mirror the course page; refetch refreshes the recent list.
  const handleCancelEnrollment = async (signupId: string, refund: boolean) => {
    const { error } = await teacherCancelSignup(signupId, { refund });
    if (error) {
      toast.error(friendlyError(error, 'Kunne ikke avbestille påmeldingen.'));
      return;
    }
    toast.success(refund ? 'Påmelding avbestilt og refusjon behandlet' : 'Påmelding avbestilt');
    refetchDashboardData();
  };

  const handleMarkResolved = async (signupId: string) => {
    const { error } = await markPaymentResolved(signupId);
    if (error) {
      toast.error(friendlyError(error, 'Kunne ikke merke som betalt.'));
      return;
    }
    toast.success('Påmelding merket som betalt');
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

  // Initial data fetch
  useEffect(() => {
    let isActive = true;

    async function loadDashboardData() {
      if (!currentSeller?.id) {
        setIsLoading(false);
        return;
      }

      if (!hasLoadedRef.current) {
        setIsLoading(true);
      }
      setLoadError(null);

      try {
        const [coursesResult, nextSessionsResult, signupsResult] = await Promise.all([
          fetchCourses(currentSeller.id),
          fetchNextSessions(currentSeller.id, ROW_LIMIT),
          fetchRecentSignups(currentSeller.id, ROW_LIMIT),
        ]);

        if (!isActive) return;

        if (coursesResult.error) {
          logger.error('Failed to fetch courses:', coursesResult.error);
          setLoadError('Kunne ikke laste kurs');
        }

        processDashboardResults(nextSessionsResult, signupsResult);
      } catch (err) {
        logger.error('Dashboard load error:', err);
        if (isActive) {
          setLoadError('Noe gikk galt. Prøv igjen.');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
          hasLoadedRef.current = true;
        }
      }
    }

    loadDashboardData();

    return () => {
      isActive = false;
    };
  }, [currentSeller?.id]);

  // Income chart — refetches whenever the range toggle changes, independent
  // of the main dashboard loader so toggling Uke/Måned/År stays snappy.
  useEffect(() => {
    if (!currentSeller?.id || !isPro) {
      setIncomeSeries(null);
      return;
    }
    let isActive = true;
    fetchIncomeSeries(currentSeller.id, incomeRange).then((result) => {
      if (!isActive) return;
      if (result.data) setIncomeSeries(result.data);
      else if (result.error) logger.error('Failed to fetch income:', result.error);
    });
    return () => {
      isActive = false;
    };
  }, [currentSeller?.id, incomeRange, isPro]);

  return (
    <div className="flex-1 overflow-y-auto bg-background h-full">
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
            <div className="space-y-8">
              {isPro ? (
                <IncomeChart
                  series={incomeSeries}
                  isLoading={incomeSeries === null}
                  range={incomeRange}
                  onRangeChange={setIncomeRange}
                />
              ) : (
                <ManualPaymentsPanel />
              )}

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
        courseTitle={
          recentSignupsRaw?.find((s) => s.id === selectedSignupId)?.course?.title ?? ''
        }
        onCancelEnrollment={handleCancelEnrollment}
        onMarkResolved={handleMarkResolved}
      />
    </div>
  );
};

/**
 * Free-tier replacement for the income chart. Exported (with the section
 * components below) so /dev/dashboard-preview can render the real states
 * without auth — same pattern as BillingPlanSections.
 */
export function ManualPaymentsPanel() {
  return (
    <section className="rounded-xl border border-border bg-background p-6 sm:p-8">
      {/* Header anatomy mirrors IncomeChart: muted label row left, control
          right, hero line below — the two cards swap for each other by tier. */}
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground-muted">Betalinger</p>
          <Badge variant="neutral" size="sm">Start</Badge>
        </div>
        <Button asChild variant="default" className="shrink-0">
          <Link to={routes.settingsBilling}>Se Pro</Link>
        </Button>
      </header>
      <h2 className="mt-2 text-xl font-medium tracking-tight text-foreground">
        Betaling avtales direkte med instruktør
      </h2>
      <p className="mt-3 max-w-2xl text-base text-foreground-muted">
        Påmeldinger registreres i Openspot, men Vipps, faktura eller annen betaling skjer utenfor plattformen.
        Pro aktiverer kortbetaling, servicegebyr og automatiske utbetalinger.
      </p>
    </section>
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
    <section className="flex flex-col">
      <h2 className="mb-3 text-lg font-medium tracking-tight text-foreground">Neste kurs</h2>
      <div className="flex min-h-56 flex-1 flex-col rounded-xl border border-border bg-background p-3">
        {showSkeleton ? (
          <RowsSkeleton variant="course" />
        ) : items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
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
          </div>
        ) : (
          <div className="space-y-1">
            {items.map((course) => (
              <UpcomingCourseRow
                key={`${course.id}-${course.date}-${course.time}`}
                course={course}
              />
            ))}
          </div>
        )}
      </div>
    </section>
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
      className="flex items-center gap-3 rounded-lg p-3 no-underline outline-none transition-colors duration-150 hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring-subtle"
    >
      <DateBadge dateStr={course.date} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium text-foreground">{course.title}</p>
        <p className="truncate text-base text-foreground-muted">{when || '—'}</p>
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
    <section className="flex flex-col">
      <h2 className="mb-3 text-lg font-medium tracking-tight text-foreground">
        Siste påmeldinger
      </h2>
      <div className="flex min-h-56 flex-1 flex-col rounded-xl border border-border bg-background p-3">
        {showSkeleton ? (
          <RowsSkeleton variant="signup" />
        ) : items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              variant="compact"
              title="Ingen påmeldinger ennå"
              description="Nye påmeldinger vises her."
            />
          </div>
        ) : (
          <div className="space-y-1">
            {items.map((signup) => (
              <SignupRow key={signup.id} signup={signup} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>
    </section>
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
  // Exception-only badge (silent on paid) — mirrors the course participants
  // list so the same entity gets the same treatment. On exception rows the
  // badge is the one trailing token on mobile; the timestamp yields (it
  // remains in the participant drawer).
  const hasExceptionBadge = !!signup.payment_status && signup.payment_status !== 'paid';

  return (
    <button
      type="button"
      onClick={() => onSelect(signup.id)}
      className="flex w-full items-center gap-3 rounded-lg p-3 text-left outline-none transition-colors duration-150 cursor-pointer hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring-subtle"
    >
      <UserAvatar name={name} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium text-foreground">{name}</p>
        <p className="truncate text-base text-foreground-muted">
          {courseTitle ?? 'Ny påmelding'}
        </p>
      </div>
      {signup.payment_status && (
        <PaymentBadge status={signup.payment_status} className="shrink-0" />
      )}
      <span
        className={cn(
          'shrink-0 text-sm tabular-nums text-foreground-muted',
          hasExceptionBadge && 'hidden sm:inline',
        )}
      >
        {when}
      </span>
    </button>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────

function RowsSkeleton({ variant }: { variant: 'course' | 'signup' }) {
  // Mirrors the real row anatomy (leading 40px block + two 24px text lines +
  // trailing meta) so the list doesn't jump in height when data lands.
  return (
    <div className="space-y-1">
      {Array.from({ length: ROW_LIMIT }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton
            className={variant === 'course' ? 'size-10 rounded-lg' : 'size-10 rounded-full'}
          />
          <div className="flex h-12 min-w-0 flex-1 flex-col justify-center gap-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3.5 w-24" />
          </div>
          <Skeleton className="h-3.5 w-8 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export default TeacherDashboard;

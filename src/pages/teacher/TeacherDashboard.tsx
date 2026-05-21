import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { Link } from 'react-router-dom';
import { routes } from '@/lib/routes';
import { motion } from 'framer-motion';
import { NotificationsPopover } from '@/components/notifications/NotificationsPopover';
import { pageVariants, pageTransition } from '@/lib/motion';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { IncomeChart } from '@/components/teacher/dashboard/IncomeChart';
import { fetchIncomeSeries, type IncomeRange, type IncomeSeries } from '@/services/income';
import { DateBadge } from '@/components/ui/date-badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCourses, fetchNextSessions } from '@/services/courses';
import type { Course as CourseDB, CourseSession } from '@/types/database';
import { fetchRecentSignups, type SignupWithDetails } from '@/services/signups';
import { extractTimeFromSchedule } from '@/utils/timeExtraction';
import { formatRelativeTimePast } from '@/utils/dateFormatting';
import { useMultiTableSubscription } from '@/hooks/use-realtime-subscription';
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
  const [dashboardCourses, setDashboardCourses] = useState<DashboardCourse[] | null>(null);
  const [recentSignupsRaw, setRecentSignupsRaw] = useState<SignupWithDetails[] | null>(null);
  const [incomeSeries, setIncomeSeries] = useState<IncomeSeries | null>(null);
  const [incomeRange, setIncomeRange] = useState<IncomeRange>('month');
  const incomeRangeRef = useRef<IncomeRange>('month');
  incomeRangeRef.current = incomeRange;
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
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
      fetchIncomeSeries(currentSeller.id, incomeRangeRef.current),
    ]);

    processDashboardResults(nextSessionsResult, signupsResult);
    if (incomeResult.data) setIncomeSeries(incomeResult.data);
  }, [currentSeller?.id]);

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
    if (!currentSeller?.id) return;
    let isActive = true;
    fetchIncomeSeries(currentSeller.id, incomeRange).then((result) => {
      if (!isActive) return;
      if (result.data) setIncomeSeries(result.data);
      else if (result.error) logger.error('Failed to fetch income:', result.error);
    });
    return () => {
      isActive = false;
    };
  }, [currentSeller?.id, incomeRange]);

  return (
    <div className="flex-1 overflow-y-auto bg-background h-full">
      <MobileTeacherHeader title="Oversikt" />

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-12">
        <motion.div
          variants={pageVariants}
          initial="initial"
          animate="animate"
          transition={pageTransition}
        >
          <header className="mb-12 flex items-center justify-between">
            <h1 className="text-2xl font-medium tracking-tight text-foreground">Oversikt</h1>
            <NotificationsPopover />
          </header>

          {loadError ? (
            <ErrorState
              title="Kunne ikke laste oversikten"
              message={loadError}
              onRetry={() => window.location.reload()}
            />
          ) : (
            <div className="space-y-12">
              <IncomeChart
                series={incomeSeries}
                isLoading={incomeSeries === null}
                range={incomeRange}
                onRangeChange={setIncomeRange}
              />

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <UpcomingCoursesSection courses={dashboardCourses} isLoading={isLoading} />
                <RecentSignupsSection signups={recentSignupsRaw} isLoading={isLoading} />
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

// ─── Neste kurs ───────────────────────────────────────────────────────────

function UpcomingCoursesSection({
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
      <h2 className="mb-6 text-xl font-medium tracking-tight text-foreground">Neste kurs</h2>
      <div className="flex min-h-56 flex-1 flex-col rounded-xl border border-border bg-background p-3">
        {showSkeleton ? (
          <RowsSkeleton variant="course" />
        ) : items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              variant="compact"
              title="Ingen kommende kurs"
              description="Opprett et kurs for å fylle timeplanen."
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
      className="flex items-center gap-3 rounded-lg p-3 no-underline outline-none transition-colors duration-150 hover:bg-muted focus-visible:bg-muted"
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

function RecentSignupsSection({
  signups,
  isLoading,
}: {
  signups: SignupWithDetails[] | null;
  isLoading: boolean;
}) {
  const items = (signups ?? []).slice(0, ROW_LIMIT);
  const showSkeleton = isLoading && signups === null;

  return (
    <section className="flex flex-col">
      <h2 className="mb-6 text-xl font-medium tracking-tight text-foreground">
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
              <SignupRow key={signup.id} signup={signup} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function SignupRow({ signup }: { signup: SignupWithDetails }) {
  const name = signup.profile?.name || signup.participant_name || 'Ukjent deltaker';
  const courseTitle = signup.course?.title;
  const courseId = signup.course?.id;
  const when = signup.created_at ? formatRelativeTimePast(signup.created_at) : '';

  const body = (
    <>
      <UserAvatar name={name} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium text-foreground">{name}</p>
        <p className="truncate text-base text-foreground-muted">
          {courseTitle ?? 'Ny påmelding'}
        </p>
      </div>
      <span className="shrink-0 text-sm tabular-nums text-foreground-muted">{when}</span>
    </>
  );

  const rowClass =
    'flex items-center gap-3 rounded-lg p-3 no-underline outline-none transition-colors duration-150 hover:bg-muted focus-visible:bg-muted';

  return courseId ? (
    <Link to={routes.course(courseId)} className={rowClass}>
      {body}
    </Link>
  ) : (
    <div className={rowClass}>{body}</div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────

function RowsSkeleton({ variant }: { variant: 'course' | 'signup' }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: ROW_LIMIT }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton
            className={variant === 'course' ? 'size-10 rounded-lg' : 'size-10 rounded-full'}
          />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-1.5 h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default TeacherDashboard;

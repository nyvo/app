import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { Link, useNavigate } from 'react-router-dom';
import { routes } from '@/lib/routes';
import { motion } from 'framer-motion';
import { DashboardSkeleton } from '@/components/teacher/DashboardSkeleton';
import { pageVariants, pageTransition } from '@/lib/motion';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { SetupChecklist } from '@/components/teacher/SetupChecklist';
import { UpcomingClassesCard } from '@/components/teacher/dashboard/UpcomingClassesCard';
import { RecentActivityCard } from '@/components/teacher/dashboard/RecentActivityCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyStateToggle } from '@/components/ui/EmptyStateToggle';
import { getShowEmptyState } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { typedFrom } from '@/lib/supabase';
import { useSetupProgress } from '@/hooks/use-setup-progress';
import { fetchCourses, fetchNextSessions } from '@/services/courses';
import type { Course as CourseDB } from '@/types/database';
import type { CourseSession } from '@/types/database';
import { fetchRecentSignups, type SignupWithDetails } from '@/services/signups';
import { extractTimeFromSchedule } from '@/utils/timeExtraction';
import { useMultiTableSubscription } from '@/hooks/use-realtime-subscription';
import type {
  Course as DashboardCourse,
  CourseStyleType as DashboardCourseType,
} from '@/types/dashboard';

// Map session + course to dashboard Course format (has actual session date)
function mapSessionForDashboard(session: CourseSession, course: CourseDB, signupCount?: number): DashboardCourse {
  const styleType: DashboardCourseType = course.format;
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


const sectionTransition = {
  duration: 0.18,
  delay: 0.06,
  ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
};

const TeacherDashboard = () => {
  const showEmptyState = getShowEmptyState();
  const navigate = useNavigate();
  const { currentSeller, profile } = useAuth();
  const [dashboardCourses, setDashboardCourses] = useState<DashboardCourse[] | null>(null);
  const [recentSignupsRaw, setRecentSignupsRaw] = useState<SignupWithDetails[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [hasCourses, setHasCourses] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);



  const goToPaymentsSetup = useCallback(() => {
    navigate(routes.settingsPayouts);
  }, [navigate]);

  // Setup progress
  const { steps, completedCount, totalCount, isSetupComplete, motivationalSubtitle } = useSetupProgress({
    currentSeller,
    profile,
    hasCourses,
    onConnectPayments: goToPaymentsSetup,
  });

  // Mark setup as seen in DB once complete — no UI feedback; the SetupChecklist
  // disappearing IS the completion signal.
  useEffect(() => {
    if (isSetupComplete && profile?.id && !profile.setup_complete_seen_at) {
      typedFrom('profiles')
        .update({ setup_complete_seen_at: new Date().toISOString() })
        .eq('id', profile.id)
        .then();
    }
  }, [isSetupComplete, profile?.id, profile?.setup_complete_seen_at]);

  function processDashboardResults(
    coursesResult: Awaited<ReturnType<typeof fetchCourses>>,
    nextSessionsResult: Awaited<ReturnType<typeof fetchNextSessions>>,
    signupsResult: Awaited<ReturnType<typeof fetchRecentSignups>>,
  ) {
    const hasAnyCourses = (coursesResult.data && coursesResult.data.length > 0) ||
      (nextSessionsResult.data && nextSessionsResult.data.length > 0);
    setHasCourses(!!hasAnyCourses);

    if (nextSessionsResult.data && nextSessionsResult.data.length > 0) {
      setDashboardCourses(nextSessionsResult.data.map(({ session, course, signupCount }) =>
        mapSessionForDashboard(session, course, signupCount)
      ));
    } else {
      setDashboardCourses([]);
    }

    if (signupsResult.data) {
      setRecentSignupsRaw(signupsResult.data);
    } else {
      setRecentSignupsRaw([]);
    }
  }

  // Refetch function for real-time updates (memoized to prevent subscription loops)
  const refetchDashboardData = useCallback(async () => {
    if (!currentSeller?.id) return;

    const [coursesResult, nextSessionsResult, signupsResult] = await Promise.all([
      fetchCourses(currentSeller.id),
      fetchNextSessions(currentSeller.id, 3),
      fetchRecentSignups(currentSeller.id, 4),
    ]);

    processDashboardResults(coursesResult, nextSessionsResult, signupsResult);
  }, [currentSeller?.id]);

  useMultiTableSubscription(
    [
      { table: 'signups', filter: `seller_id=eq.${currentSeller?.id}` },
      { table: 'courses', filter: `seller_id=eq.${currentSeller?.id}` },
    ],
    refetchDashboardData,
    !!currentSeller?.id,
    currentSeller?.id
  );

  // Initial data fetch
  useEffect(() => {
    let isActive = true;

    async function loadDashboardData() {
      if (!currentSeller?.id) {
        setIsLoading(false);
        return;
      }

      // Only show loading skeleton on very first load
      if (!hasLoadedRef.current) {
        setIsLoading(true);
      }
      setLoadError(null);

      try {
        const [coursesResult, nextSessionsResult, signupsResult] = await Promise.all([
          fetchCourses(currentSeller.id),
          fetchNextSessions(currentSeller.id, 3),
          fetchRecentSignups(currentSeller.id, 4),
        ]);

        if (!isActive) return;

        if (coursesResult.error) {
          logger.error('Failed to fetch courses:', coursesResult.error);
          setLoadError('Kunne ikke laste kurs');
        }

        processDashboardResults(coursesResult, nextSessionsResult, signupsResult);
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

  return (
      <div className="flex-1 overflow-y-auto bg-background h-full">
          <MobileTeacherHeader title="Oversikt" />

          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-12">
            <motion.div
              variants={pageVariants}
              initial="initial"
              animate="animate"
              transition={pageTransition}
            >
              <header className="mb-8">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  Oversikt
                </h1>
              </header>


              {isLoading ? (
                <DashboardSkeleton />
              ) : loadError ? (
                <ErrorState
                  title="Kunne ikke laste oversikten"
                  message={loadError}
                  onRetry={() => window.location.reload()}
                />
              ) : !isSetupComplete ? (
                <motion.div
                  className="grid grid-cols-1 gap-6 lg:grid-cols-2"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={sectionTransition}
                >
                  <SetupChecklist
                    steps={steps}
                    completedCount={completedCount}
                    totalCount={totalCount}
                    motivationalSubtitle={motivationalSubtitle}
                  />
                  <UpcomingClassesCard courses={dashboardCourses} />
                </motion.div>
              ) : (showEmptyState || !hasCourses) ? (
                <motion.div
                  className="grid grid-cols-1 gap-6 lg:grid-cols-2"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={sectionTransition}
                >
                  <Card className="lg:col-span-2">
                    <CardContent>
                      <EmptyState
                        title="Opprett ditt første kurs"
                        description="Start med ett kurs. Derfra kan du ta imot påmeldinger, holde oversikt over deltakere og bygge opp timeplanen din."
                        action={
                          <Button asChild size="default">
                            <Link to={routes.coursesNew}>
                              Opprett kurs
                            </Link>
                          </Button>
                        }
                      />
                    </CardContent>
                  </Card>
                  <UpcomingClassesCard courses={dashboardCourses} />
                </motion.div>
              ) : (
                <motion.div
                  className="grid grid-cols-1 gap-6 lg:grid-cols-2"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={sectionTransition}
                >
                  <RecentActivityCard signups={recentSignupsRaw} />
                  <UpcomingClassesCard courses={dashboardCourses} />
                </motion.div>
              )}
            </motion.div>
          </div>
          <EmptyStateToggle />
        </div>
  );
};

export default TeacherDashboard;

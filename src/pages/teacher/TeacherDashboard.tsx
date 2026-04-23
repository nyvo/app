import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, AlertCircle, RefreshCw, CalendarPlus, Calendar, MessageSquare, Users, X, Check } from '@/lib/icons';
import { DashboardSkeleton } from '@/components/teacher/DashboardSkeleton';
import { pageVariants, pageTransition } from '@/lib/motion';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { SetupChecklist } from '@/components/teacher/SetupChecklist';
import { QuickOverviewCard } from '@/components/teacher/dashboard/QuickOverviewCard';
import { BusinessGlanceCard } from '@/components/teacher/dashboard/BusinessGlanceCard';
import { UpcomingClassesCard } from '@/components/teacher/dashboard/UpcomingClassesCard';
import { RecentActivityCard } from '@/components/teacher/dashboard/RecentActivityCard';
import { fetchMonthStats, fetchWeekStats, type MonthStats, type WeekStats } from '@/services/dashboardStats';
import { getTimeBasedGreeting } from '@/utils/timeGreeting';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyStateToggle } from '@/components/ui/EmptyStateToggle';
import { getShowEmptyState } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTeacherShell } from '@/components/teacher/TeacherShellContext';
import { typedFrom } from '@/lib/supabase';
import { useSetupProgress } from '@/hooks/use-setup-progress';
import { fetchCourses, fetchNextSessions } from '@/services/courses';
import type { Course as CourseDB } from '@/types/database';
import type { CourseSession } from '@/types/database';
import { fetchRecentSignups, type SignupWithDetails } from '@/services/signups';
import { fetchRecentConversations, type ConversationWithDetails } from '@/services/messages';
import { extractTimeFromSchedule } from '@/utils/timeExtraction';
import { useMultiTableSubscription } from '@/hooks/use-realtime-subscription';
import type {
  Course as DashboardCourse,
  CourseStyleType as DashboardCourseType,
} from '@/types/dashboard';

// Map session + course to dashboard Course format (has actual session date)
function mapSessionForDashboard(session: CourseSession, course: CourseDB, signupCount?: number): DashboardCourse {
  const styleType = course.course_type;
  const subtitle = course.location || (course.course_type === 'course-series' ? 'Kursrekke' : 'Enkeltkurs');

  return {
    id: course.id,
    title: course.title,
    subtitle,
    time: session.start_time?.slice(0, 5) || (extractTimeFromSchedule(course.time_schedule)?.time ?? ''),
    type: styleType as DashboardCourseType,
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
  const { currentOrganization, profile } = useAuth();
  const { setBreadcrumbs } = useTeacherShell();
  const [dashboardCourses, setDashboardCourses] = useState<DashboardCourse[] | null>(null);
  const [recentSignupsRaw, setRecentSignupsRaw] = useState<SignupWithDetails[] | null>(null);
  const [recentConversationsRaw, setRecentConversationsRaw] = useState<ConversationWithDetails[] | null>(null);
  const [monthStats, setMonthStats] = useState<MonthStats | null>(null);
  const [weekStats, setWeekStats] = useState<WeekStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [hasCourses, setHasCourses] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);



  const goToPaymentsSetup = useCallback(() => {
    navigate('/teacher/payments');
  }, [navigate]);

  // Setup progress
  const { steps, completedCount, totalCount, isSetupComplete, motivationalSubtitle } = useSetupProgress({
    currentOrganization,
    profile,
    hasCourses,
    onConnectPayments: goToPaymentsSetup,
  });

  // One-time "setup done" banner — shown once, then marked as seen in DB
  const [showSetupBanner, setShowSetupBanner] = useState(false);
  useEffect(() => {
    if (isSetupComplete && profile?.id && !profile.setup_complete_seen_at) {
      setShowSetupBanner(true);
      // Mark as seen in DB so it won't show on other devices
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
    messagesResult: Awaited<ReturnType<typeof fetchRecentConversations>>,
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

    if (messagesResult.data) {

      setRecentConversationsRaw(messagesResult.data);
    } else {
      setRecentConversationsRaw([]);
    }
  }

  // Refetch function for real-time updates (memoized to prevent subscription loops)
  const refetchDashboardData = useCallback(async () => {
    if (!currentOrganization?.id) return;

    const [coursesResult, nextSessionsResult, signupsResult, messagesResult, month, week] = await Promise.all([
      fetchCourses(currentOrganization.id),
      fetchNextSessions(currentOrganization.id, 3),
      fetchRecentSignups(currentOrganization.id, 4),
      fetchRecentConversations(currentOrganization.id, 4),
      fetchMonthStats(currentOrganization.id),
      fetchWeekStats(currentOrganization.id),
    ]);

    processDashboardResults(coursesResult, nextSessionsResult, signupsResult, messagesResult);
    setMonthStats(month);
    setWeekStats(week);
  }, [currentOrganization?.id]);

  useMultiTableSubscription(
    [
      { table: 'signups', filter: `organization_id=eq.${currentOrganization?.id}` },
      { table: 'courses', filter: `organization_id=eq.${currentOrganization?.id}` },
      { table: 'conversations', filter: `organization_id=eq.${currentOrganization?.id}` },
    ],
    refetchDashboardData,
    !!currentOrganization?.id,
    currentOrganization?.id
  );

  // Initial data fetch
  useEffect(() => {
    let isActive = true;

    async function loadDashboardData() {
      if (!currentOrganization?.id) {
        setIsLoading(false);
        return;
      }

      // Only show loading skeleton on very first load
      if (!hasLoadedRef.current) {
        setIsLoading(true);
      }
      setLoadError(null);

      try {
        const [coursesResult, nextSessionsResult, signupsResult, messagesResult, month, week] = await Promise.all([
          fetchCourses(currentOrganization.id),
          fetchNextSessions(currentOrganization.id, 3),
          fetchRecentSignups(currentOrganization.id, 4),
          fetchRecentConversations(currentOrganization.id, 4),
          fetchMonthStats(currentOrganization.id),
          fetchWeekStats(currentOrganization.id),
        ]);

        if (!isActive) return;

        if (coursesResult.error) {
          logger.error('Failed to fetch courses:', coursesResult.error);
          setLoadError('Kunne ikke laste kurs');
        }

        processDashboardResults(coursesResult, nextSessionsResult, signupsResult, messagesResult);
        setMonthStats(month);
        setWeekStats(week);
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
  }, [currentOrganization?.id]);

  // Personal name (first word) if set, otherwise fall back to org name
  const userName = profile?.name?.split(' ')[0] || currentOrganization?.name;

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Hjem', to: '/teacher' },
      { label: 'Oversikt' },
    ]);
    return () => setBreadcrumbs(null);
  }, [setBreadcrumbs]);

  return (
      <div className="flex-1 overflow-y-auto bg-background h-full">
          <MobileTeacherHeader title="Oversikt" />

          <div className="w-full px-6 pt-6 pb-6 lg:px-8 lg:pt-8 lg:pb-8">
            <motion.div
              variants={pageVariants}
              initial="initial"
              animate="animate"
              transition={pageTransition}
            >
              <header className="mb-8">
                <h1 className="text-3xl font-semibold text-foreground">
                  {getTimeBasedGreeting()}{userName ? `, ${userName}` : ''}
                </h1>
                {!isLoading && !loadError && isSetupComplete && hasCourses && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 md:hidden">
                    <Button asChild variant="outline-soft" size="sm" className="gap-1.5">
                      <Link to="/teacher/schedule">
                        <Calendar className="size-3.5" />
                        Timeplan
                      </Link>
                    </Button>
                    <Button asChild variant="outline-soft" size="sm" className="gap-1.5">
                      <Link to="/teacher/signups">
                        <Users className="size-3.5" />
                        Påmeldinger
                      </Link>
                    </Button>
                    <Button asChild variant="outline-soft" size="sm" className="gap-1.5">
                      <Link to="/teacher/messages">
                        <MessageSquare className="size-3.5" />
                        Meldinger
                      </Link>
                    </Button>
                  </div>
                )}
              </header>


              {showSetupBanner && !isLoading && (
                <Card className="mb-6 flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3" />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      Alt er klart — du kan nå ta imot påmeldinger og betalinger
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSetupBanner(false)}
                    className="size-8 shrink-0"
                    aria-label="Lukk"
                  >
                    <X className="size-3.5" />
                  </Button>
                </Card>
              )}

              {isLoading ? (
                <DashboardSkeleton />
              ) : loadError ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="mb-4 rounded-full bg-muted p-4">
                    <AlertCircle className="size-8 text-destructive" />
                  </div>
                  <h2 className="text-base font-semibold mb-1 text-foreground">Kunne ikke laste oversikten</h2>
                  <p className="text-sm max-w-xs mb-4 text-muted-foreground">{loadError}</p>
                  <Button
                    variant="outline-soft"
                    size="sm"
                    onClick={() => window.location.reload()}
                  >
                    <RefreshCw className="size-3.5" />
                    Prøv på nytt
                  </Button>
                </div>
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
                  <QuickOverviewCard stats={monthStats} />
                  <UpcomingClassesCard courses={dashboardCourses} />
                  <BusinessGlanceCard stats={weekStats} />
                </motion.div>
              ) : (showEmptyState || !hasCourses) ? (
                <motion.div
                  className="grid grid-cols-1 gap-6 lg:grid-cols-2"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={sectionTransition}
                >
                  <Card className="lg:col-span-2">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <div className="mb-6 w-fit rounded-lg border border-border bg-background p-3">
                        <Plus className="size-6 text-muted-foreground" />
                      </div>
                      <h2 className="text-xl font-semibold text-foreground text-center">
                        Opprett ditt første kurs
                      </h2>
                      <p className="text-sm mt-2 mb-6 max-w-md text-center text-muted-foreground">
                        Start med ett kurs. Derfra kan du ta imot påmeldinger, holde oversikt over deltakere og bygge opp timeplanen din.
                      </p>
                      <Button asChild size="default" className="gap-2">
                        <Link to="/teacher/new-course">
                          <CalendarPlus className="size-4" />
                          Opprett kurs
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                  <RecentActivityCard signups={recentSignupsRaw} conversations={recentConversationsRaw} />
                  <QuickOverviewCard stats={monthStats} />
                  <UpcomingClassesCard courses={dashboardCourses} />
                  <BusinessGlanceCard stats={weekStats} />
                </motion.div>
              ) : (
                <motion.div
                  className="grid grid-cols-1 gap-6 lg:grid-cols-2"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={sectionTransition}
                >
                  <RecentActivityCard signups={recentSignupsRaw} conversations={recentConversationsRaw} />
                  <QuickOverviewCard stats={monthStats} />
                  <UpcomingClassesCard courses={dashboardCourses} />
                  <BusinessGlanceCard stats={weekStats} />
                </motion.div>
              )}
            </motion.div>
          </div>
          <EmptyStateToggle />
        </div>
  );
};

export default TeacherDashboard;

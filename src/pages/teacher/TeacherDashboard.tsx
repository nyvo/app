import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Leaf, Menu, AlertCircle, RefreshCw, CalendarPlus } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { DashboardSkeleton } from '@/components/teacher/DashboardSkeleton';
import { pageVariants, pageTransition } from '@/lib/motion';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { UpcomingClassCard } from '@/components/teacher/UpcomingClassCard';
import { MessagesList } from '@/components/teacher/MessagesList';
import { CoursesList } from '@/components/teacher/CoursesList';
import { RegistrationsList } from '@/components/teacher/RegistrationsList';
import { getTimeBasedGreeting } from '@/utils/timeGreeting';
import { Button } from '@/components/ui/button';
import { EmptyStateToggle } from '@/components/ui/EmptyStateToggle';
import { getShowEmptyState } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCourses, fetchUpcomingSession, fetchWeekSessions } from '@/services/courses';
import type { Course as CourseDB } from '@/types/database';
import type { CourseSession } from '@/types/database';
import { fetchRecentSignups, type SignupWithDetails } from '@/services/signups';
import { fetchRecentConversations, type ConversationWithDetails } from '@/services/messages';
import { getInitials } from '@/utils/stringUtils';
import { formatRelativeTimePast } from '@/utils/dateFormatting';
import { extractTimeFromSchedule } from '@/utils/timeExtraction';
import { useDashboardSubscription } from '@/hooks/use-realtime-subscription';
import type {
  Course as DashboardCourse,
  CourseStyleType as DashboardCourseType,
  UpcomingClass,
  Registration,
  SignupStatus,
  Message as DashboardMessage,
} from '@/types/dashboard';

// Map database course to dashboard Course format (fallback when no sessions)
function mapCourseForDashboard(course: CourseDB): DashboardCourse {
  const styleType = course.course_type;

  // Create subtitle from location or course type
  const subtitle = course.location || (course.course_type === 'course-series' ? 'Kursrekke' : 'Enkeltkurs');

  return {
    id: course.id,
    title: course.title,
    subtitle,
    time: extractTimeFromSchedule(course.time_schedule)?.time ?? '',
    type: styleType as DashboardCourseType,
    date: course.start_date || undefined,
  };
}

// Map session + course to dashboard Course format (preferred - has actual session date)
function mapSessionForDashboard(session: CourseSession, course: CourseDB): DashboardCourse {
  const styleType = course.course_type;
  const subtitle = course.location || (course.course_type === 'course-series' ? 'Kursrekke' : 'Enkeltkurs');

  return {
    id: course.id,
    title: course.title,
    subtitle,
    time: session.start_time?.slice(0, 5) || (extractTimeFromSchedule(course.time_schedule)?.time ?? ''),
    type: styleType as DashboardCourseType,
    date: session.session_date || undefined,
  };
}

// Map conversation to Dashboard Message format
function mapConversationToMessage(conversation: ConversationWithDetails): DashboardMessage {
  const participantName = conversation.participant?.name || 'Ukjent';
  const lastMessage = conversation.last_message;
  const timestamp = formatRelativeTimePast(conversation.updated_at);

  return {
    id: conversation.id,
    sender: {
      name: participantName,
      avatar: conversation.participant?.avatar_url || '',
    },
    content: lastMessage?.content || 'Ingen meldinger',
    timestamp,
    isOnline: false, // We don't track online status yet
  };
}

// Detect if a signup requires teacher attention
function detectSignupException(signup: SignupWithDetails): boolean {
  if (signup.status !== 'confirmed') {
    return false;
  }

  // Payment failed - needs follow-up or cancellation
  if (signup.payment_status === 'failed') {
    return true;
  }

  // Confirmed but payment still pending - might need chase
  if (signup.payment_status === 'pending') {
    return true;
  }

  return false;
}

// Map signup to Registration format
function mapSignupToRegistration(signup: SignupWithDetails): Registration {
  const participantName = signup.participant_name || signup.profile?.name || 'Ukjent';
  const participantEmail = signup.participant_email || signup.profile?.email || '';
  const initials = getInitials(participantName);

  // Format course time from time_schedule
  const courseTime = signup.course?.time_schedule || '';

  // Detect if this signup needs attention
  const hasException = detectSignupException(signup);

  return {
    id: signup.id,
    participant: {
      name: participantName,
      email: participantEmail,
      avatar: signup.profile?.avatar_url || undefined,
      initials,
    },
    course: signup.course?.title || 'Ukjent kurs',
    courseTime,
    courseType: (signup.course?.course_type || 'vinyasa') as DashboardCourseType,
    registeredAt: formatRelativeTimePast(signup.created_at),
    createdAt: signup.created_at,
    status: signup.status as SignupStatus,
    hasException,
  };
}

// Calculate "starts in" text
function calculateStartsIn(sessionDate: string, startTime: string): string {
  const now = new Date();

  // Validate time string format
  const timeParts = startTime?.split(':');
  if (!timeParts || timeParts.length < 2) {
    return 'Tid mangler';
  }

  const hours = Number(timeParts[0]);
  const minutes = Number(timeParts[1]);

  // Validate parsed numbers
  if (isNaN(hours) || isNaN(minutes)) {
    return 'Ugyldig tid';
  }

  const sessionDateTime = new Date(sessionDate);

  // Validate date
  if (isNaN(sessionDateTime.getTime())) {
    return 'Ugyldig dato';
  }

  sessionDateTime.setHours(hours, minutes, 0, 0);

  const diffMs = sessionDateTime.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMs < 0) return 'Pågår nå';
  if (diffMins < 60) return `Starter om ${diffMins} min`;
  if (diffHours < 24) return `Starter om ${diffHours} ${diffHours === 1 ? 'time' : 'timer'}`;
  if (diffDays === 1) return 'Starter i morgen';
  return `Starter om ${diffDays} dager`;
}

// Format session date for display
function formatSessionDate(sessionDate: string): string {
  const date = new Date(sessionDate);

  // Validate date
  if (isNaN(date.getTime())) {
    return 'Ugyldig dato';
  }

  return date.toLocaleDateString('nb-NO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

const TeacherDashboard = () => {
  const showEmptyState = getShowEmptyState();
  const { currentOrganization, profile } = useAuth();
  const [dashboardCourses, setDashboardCourses] = useState<DashboardCourse[]>([]);
  const [upcomingClass, setUpcomingClass] = useState<UpcomingClass | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [messages, setMessages] = useState<DashboardMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasCourses, setHasCourses] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  // Shared processing: takes the 5 parallel fetch results and updates all dashboard state.
  // Callers handle loading/error state themselves; this function is pure data processing + setters.
  function processDashboardResults(
    coursesResult: Awaited<ReturnType<typeof fetchCourses>>,
    weekSessionsResult: Awaited<ReturnType<typeof fetchWeekSessions>>,
    upcomingResult: Awaited<ReturnType<typeof fetchUpcomingSession>>,
    signupsResult: Awaited<ReturnType<typeof fetchRecentSignups>>,
    messagesResult: Awaited<ReturnType<typeof fetchRecentConversations>>,
  ) {
    // Process courses - prefer week sessions (has actual dates) over raw courses
    if (weekSessionsResult.data && weekSessionsResult.data.length > 0) {
      setHasCourses(true);
      const sessionCourses = weekSessionsResult.data.map(({ session, course }) =>
        mapSessionForDashboard(session, course)
      );
      setDashboardCourses(sessionCourses);
    } else if (coursesResult.data && coursesResult.data.length > 0) {
      setHasCourses(true);
      const activeCourses = coursesResult.data
        .filter(c => c.status === 'active' || c.status === 'upcoming')
        .slice(0, 6)
        .map(mapCourseForDashboard);
      setDashboardCourses(activeCourses);
    } else {
      setHasCourses(false);
      setDashboardCourses([]);
    }

    // Process upcoming session
    if (upcomingResult.data) {
      const { session, course, attendeeCount } = upcomingResult.data;

      const duration = course.duration || 60;
      const timeParts = session.start_time?.split(':');
      const startHours = timeParts?.[0] ? Number(timeParts[0]) : 0;
      const startMins = timeParts?.[1] ? Number(timeParts[1]) : 0;
      const endDate = session.session_date ? new Date(session.session_date) : new Date();
      endDate.setHours(startHours, startMins + duration, 0, 0);
      const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
      const formatTime = (time: string | null) => time?.slice(0, 5) || '';

      setUpcomingClass({
        id: course.id,
        title: course.title,
        type: course.course_type as DashboardCourseType,
        startTime: formatTime(session.start_time),
        endTime: formatTime(session.end_time) || endTime,
        date: formatSessionDate(session.session_date),
        location: course.location || 'Ikke angitt',
        attendees: attendeeCount,
        capacity: course.max_participants || 0,
        startsIn: calculateStartsIn(session.session_date, session.start_time),
      });
    } else {
      setUpcomingClass(null);
    }

    // Process signups
    if (signupsResult.data) {
      setRegistrations(signupsResult.data.map(mapSignupToRegistration));
    } else {
      setRegistrations([]);
    }

    // Process messages
    if (messagesResult.data) {
      setMessages(messagesResult.data.map(mapConversationToMessage));
    } else {
      setMessages([]);
    }
  }

  // Refetch function for real-time updates (memoized to prevent subscription loops)
  const refetchDashboardData = useCallback(async () => {
    if (!currentOrganization?.id) return;

    try {
      // Fetch all data in parallel (silently, no loading state for real-time updates)
      const [coursesResult, weekSessionsResult, upcomingResult, signupsResult, messagesResult] = await Promise.all([
        fetchCourses(currentOrganization.id),
        fetchWeekSessions(currentOrganization.id, 6),
        fetchUpcomingSession(currentOrganization.id),
        fetchRecentSignups(currentOrganization.id, 4),
        fetchRecentConversations(currentOrganization.id, 4),
      ]);

      processDashboardResults(coursesResult, weekSessionsResult, upcomingResult, signupsResult, messagesResult);
    } catch (err) {
      logger.error('Dashboard refetch error:', err);
      // Don't show error for real-time updates, keep existing data
    }
  }, [currentOrganization?.id]);

  // Subscribe to real-time updates for dashboard data
  useDashboardSubscription(currentOrganization?.id, refetchDashboardData);

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
        // Fetch all data in parallel
        const [coursesResult, weekSessionsResult, upcomingResult, signupsResult, messagesResult] = await Promise.all([
          fetchCourses(currentOrganization.id),
          fetchWeekSessions(currentOrganization.id, 6),
          fetchUpcomingSession(currentOrganization.id),
          fetchRecentSignups(currentOrganization.id, 4),
          fetchRecentConversations(currentOrganization.id, 4),
        ]);

        if (!isActive) return;

        if (coursesResult.error) {
          logger.error('Failed to fetch courses:', coursesResult.error);
          setLoadError('Kunne ikke laste kurs');
        }

        processDashboardResults(coursesResult, weekSessionsResult, upcomingResult, signupsResult, messagesResult);
      } catch (err) {
        logger.error('Dashboard load error:', err);
        if (isActive) {
          setLoadError('Noe gikk galt ved lasting av data');
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

  // Get user's first name for greeting
  const userName = profile?.name?.split(' ')[0] || 'bruker';

  return (
    <SidebarProvider>
      <TeacherSidebar />

      <main className="flex-1 overflow-y-auto bg-surface h-screen">
          <div className="flex md:hidden items-center justify-between p-6 border-b border-border sticky top-0 bg-surface/80 backdrop-blur-xl z-30">
            <div className="flex items-center gap-3">
              <Leaf className="h-5 w-5 text-primary" />
              <span className="font-geist text-base font-medium text-text-primary">Ease</span>
            </div>
            <SidebarTrigger>
              <Menu className="h-6 w-6 text-muted-foreground" />
            </SidebarTrigger>
          </div>

          <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-12">
            <motion.div
              variants={pageVariants}
              initial="initial"
              animate="animate"
              transition={pageTransition}
            >
              <header className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
                <div className="space-y-1">
                  <p className="text-xxs font-medium uppercase tracking-wider text-text-tertiary mb-2">Oversikt</p>
                  <h1 className="font-geist text-2xl font-medium tracking-tight text-text-primary">
                    {getTimeBasedGreeting()}, {userName}
                  </h1>
                </div>
                {/* Only show button when we have courses (not in empty state) */}
                {!showEmptyState && hasCourses && (
                  <Button
                    asChild
                    size="compact"
                    className="hidden md:flex gap-2"
                  >
                    <Link to="/teacher/new-course">
                      <CalendarPlus className="h-3.5 w-3.5" />
                      Nytt kurs
                    </Link>
                  </Button>
                )}
              </header>

              {isLoading ? (
                <DashboardSkeleton />
              ) : loadError ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="mb-4 rounded-full bg-status-error-bg p-4 border border-status-error-border">
                    <AlertCircle className="h-8 w-8 text-status-error-text stroke-[1.5]" />
                  </div>
                  <h3 className="font-geist text-sm font-medium text-text-primary mb-1">Kunne ikke laste dashboard</h3>
                  <p className="text-xs text-muted-foreground max-w-xs mb-4">{loadError}</p>
                  <Button
                    variant="outline-soft"
                    size="compact"
                    onClick={() => window.location.reload()}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Prøv på nytt
                  </Button>
                </div>
              ) : (showEmptyState || !hasCourses) ? (
                // Empty state - no courses yet (or dev toggle active)
                <div className="grid auto-rows-min grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
                  {/* Primary Action Card - Minimal Style */}
                  <div className="group relative col-span-1 md:col-span-2 lg:col-span-2 h-[360px] overflow-hidden rounded-2xl bg-white border border-border ios-ease hover:border-zinc-400 hover:bg-zinc-50/50">
                    <div className="relative flex h-full flex-col justify-center z-10 p-9">
                      <div className="max-w-md">
                        <div className="mb-6 rounded-xl bg-surface border border-zinc-100 p-3 w-fit">
                          <Plus className="h-6 w-6 text-text-tertiary stroke-[1.5]" />
                        </div>
                        <h2 className="font-geist text-2xl md:text-3xl font-medium tracking-tight mb-2 text-text-primary leading-tight">
                          La oss sette opp ditt første kurs
                        </h2>
                        <p className="text-sm text-text-secondary mb-8">
                          Opprett et kurs for å motta påmeldinger og administrere timeplanen din.
                        </p>
                        <Button
                          asChild
                          size="default"
                          className="gap-2"
                        >
                          <Link to="/teacher/new-course">
                            <CalendarPlus className="h-4 w-4" />
                            Opprett kurs
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Messages Card */}
                  <MessagesList messages={messages} />

                  {/* Courses Card */}
                  <CoursesList courses={[]} />

                  {/* Registrations Card */}
                  <RegistrationsList registrations={[]} />
                </div>
              ) : (
                // Normal dashboard with data
                <div className="grid auto-rows-min grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
                  <UpcomingClassCard classData={upcomingClass} />
                  <MessagesList messages={messages} />
                  <CoursesList courses={dashboardCourses} />
                  <RegistrationsList registrations={registrations} />
                </div>
              )}
            </motion.div>
          </div>
          <EmptyStateToggle />
        </main>
    </SidebarProvider>
  );
};

export default TeacherDashboard;

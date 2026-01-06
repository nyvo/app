import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Leaf, Menu, Loader2, ArrowRight } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { pageVariants, pageTransition } from '@/lib/motion';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { UpcomingClassCard } from '@/components/teacher/UpcomingClassCard';
import { MessagesList } from '@/components/teacher/MessagesList';
import { CoursesList } from '@/components/teacher/CoursesList';
import { RegistrationsList } from '@/components/teacher/RegistrationsList';
import { getTimeBasedGreeting } from '@/utils/timeGreeting';
import { Button } from '@/components/ui/button';
import { useEmptyState } from '@/contexts/EmptyStateContext';
import EmptyStateToggle from '@/components/ui/EmptyStateToggle';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCourses, fetchUpcomingSession, type CourseWithStyle } from '@/services/courses';
import { fetchRecentSignups, type SignupWithDetails } from '@/services/signups';
import type {
  Course as DashboardCourse,
  CourseType as DashboardCourseType,
  UpcomingClass,
  Registration,
  SignupStatus,
} from '@/types/dashboard';

// Map database course to dashboard Course format
function mapCourseForDashboard(course: CourseWithStyle): DashboardCourse {
  // Map style to dashboard course type
  const styleType = course.style?.normalized_name || course.course_type;

  // Extract time from time_schedule (e.g., "Tirsdager, 18:00" -> "18:00")
  const extractTime = (schedule: string | null): string => {
    if (!schedule) return '';
    const timeMatch = schedule.match(/(\d{1,2}:\d{2})/);
    return timeMatch ? timeMatch[1] : '';
  };

  // Create subtitle from location or course type
  const subtitle = course.location || (course.course_type === 'course-series' ? 'Kursrekke' : 'Enkeltkurs');

  return {
    id: course.id,
    title: course.title,
    subtitle,
    time: extractTime(course.time_schedule),
    type: styleType as DashboardCourseType,
  };
}

// Format relative time for registrations
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Nå';
  if (diffMins < 60) return `${diffMins} min siden`;
  if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'time' : 'timer'} siden`;
  if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'dag' : 'dager'} siden`;
  return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
}

// Map signup to Registration format
function mapSignupToRegistration(signup: SignupWithDetails): Registration {
  const participantName = signup.participant_name || signup.profile?.name || 'Ukjent';
  const participantEmail = signup.participant_email || signup.profile?.email || '';
  const initials = participantName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Format course time from time_schedule
  const courseTime = signup.course?.time_schedule || '';

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
    registeredAt: formatRelativeTime(signup.created_at),
    status: signup.status as SignupStatus,
  };
}

// Calculate "starts in" text
function calculateStartsIn(sessionDate: string, startTime: string): string {
  const now = new Date();
  const [hours, minutes] = startTime.split(':').map(Number);
  const sessionDateTime = new Date(sessionDate);
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
  return date.toLocaleDateString('nb-NO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

const TeacherDashboard = () => {
  const { showEmptyState } = useEmptyState();
  const { currentOrganization, profile } = useAuth();
  const [dashboardCourses, setDashboardCourses] = useState<DashboardCourse[]>([]);
  const [upcomingClass, setUpcomingClass] = useState<UpcomingClass | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasCourses, setHasCourses] = useState(false);
  const hasLoadedRef = useRef(false);

  // Fetch all dashboard data
  useEffect(() => {
    async function loadDashboardData() {
      if (!currentOrganization?.id) {
        setIsLoading(false);
        return;
      }

      // Only show loading spinner on very first load
      if (!hasLoadedRef.current) {
        setIsLoading(true);
      }

      try {
        // Fetch all data in parallel
        const [coursesResult, upcomingResult, signupsResult] = await Promise.all([
          fetchCourses(currentOrganization.id),
          fetchUpcomingSession(currentOrganization.id),
          fetchRecentSignups(currentOrganization.id, 4),
        ]);

        // Process courses
        if (coursesResult.data && coursesResult.data.length > 0) {
          setHasCourses(true);
          const activeCourses = coursesResult.data
            .filter(c => c.status === 'active' || c.status === 'upcoming')
            .slice(0, 6)
            .map(mapCourseForDashboard);
          setDashboardCourses(activeCourses);
        } else {
          setHasCourses(false);
        }

        // Process upcoming session
        if (upcomingResult.data) {
          const { session, course, attendeeCount } = upcomingResult.data;

          // Calculate end time (session duration or default 60 min)
          const duration = course.duration || 60;
          const [startHours, startMins] = session.start_time.split(':').map(Number);
          const endDate = new Date();
          endDate.setHours(startHours, startMins + duration, 0, 0);
          const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;

          setUpcomingClass({
            id: course.id,
            title: course.title,
            type: (course.style?.normalized_name || course.course_type) as DashboardCourseType,
            startTime: session.start_time,
            endTime: session.end_time || endTime,
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
        }
      } finally {
        setIsLoading(false);
        hasLoadedRef.current = true;
      }
    }

    loadDashboardData();
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
              <span className="font-geist text-base font-semibold text-text-primary">Ease</span>
            </div>
            <SidebarTrigger>
              <Menu className="h-6 w-6 text-muted-foreground" />
            </SidebarTrigger>
          </div>

          <div className="mx-auto max-w-7xl p-6 lg:p-12">
            <motion.div
              variants={pageVariants}
              initial="initial"
              animate="animate"
              transition={pageTransition}
            >
              <header className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2">Oversikt</p>
                  <h1 className="font-geist text-2xl md:text-3xl font-medium tracking-tight text-text-primary">
                    {getTimeBasedGreeting()}, {userName}
                  </h1>
                </div>
                {/* Only show button when we have courses (not in empty state) */}
                {!showEmptyState && hasCourses && (
                  <Button
                    asChild
                    size="compact"
                    className="hidden md:flex group gap-2"
                  >
                    <Link to="/teacher/new-course">
                      <Plus className="h-3.5 w-3.5 transition-transform group-hover:rotate-90" />
                      Nytt kurs
                    </Link>
                  </Button>
                )}
              </header>

              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-text-tertiary" />
                </div>
              ) : (showEmptyState || !hasCourses) ? (
                // Empty state - no courses yet (or dev toggle active)
                <div className="grid auto-rows-min grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
                  {/* Primary Action Card - Dark Hero Style */}
                  <div className="group relative col-span-1 md:col-span-2 lg:col-span-2 h-[360px] overflow-hidden rounded-3xl bg-gray-900 text-white shadow-lg shadow-gray-900/20 ios-ease hover:shadow-xl hover:shadow-gray-900/30 hover:scale-[1.005] border border-gray-800">
                    {/* Gradient background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 z-0"></div>
                    {/* Grain texture */}
                    <div className="absolute inset-0 bg-grain opacity-[0.35] mix-blend-overlay pointer-events-none z-0"></div>
                    {/* Glow effect */}
                    <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/5 blur-3xl transition-all duration-1000 group-hover:scale-110 group-hover:bg-white/10 z-0"></div>

                    <div className="relative flex h-full flex-col justify-between z-10 p-9">
                      {/* Top badges */}
                      <div className="flex items-start justify-between">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span className="text-xs font-medium text-emerald-400">Konfigurering kreves</span>
                        </div>
                        <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-900 shadow-sm">
                          Kom i gang
                        </div>
                      </div>

                      {/* Main content */}
                      <div>
                        <h2 className="font-geist text-2xl md:text-3xl font-medium tracking-tight mb-3 text-white leading-tight">
                          La oss sette opp<br />ditt første kurs
                        </h2>
                        <p className="text-sm text-white/70 max-w-sm">
                          Opprett et kurs for å begynne å motta bookinger og administrere timeplanen din.
                        </p>
                      </div>

                      {/* Button */}
                      <div className="flex justify-end">
                        <Link
                          to="/teacher/new-course"
                          className="flex items-center gap-2 h-10 rounded-lg bg-white px-3 py-2 text-xs font-medium text-text-primary shadow-sm group-hover:bg-surface-elevated ios-ease"
                        >
                          Opprett kurs
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Messages Card */}
                  <MessagesList messages={[]} />

                  {/* Courses Card */}
                  <CoursesList courses={[]} />

                  {/* Registrations Card */}
                  <RegistrationsList registrations={[]} />
                </div>
              ) : (
                // Normal dashboard with data
                <div className="grid auto-rows-min grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
                  <UpcomingClassCard classData={upcomingClass} />
                  <MessagesList messages={[]} />
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

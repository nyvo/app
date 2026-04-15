import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, AlertCircle, RefreshCw, CalendarPlus, Calendar, MessageSquare, Users, X, Check, Shield } from 'lucide-react';
import { DashboardSkeleton } from '@/components/teacher/DashboardSkeleton';
import { pageVariants, pageTransition } from '@/lib/motion';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { SetupChecklist } from '@/components/teacher/SetupChecklist';
import { MessagesList } from '@/components/teacher/MessagesList';
import { CoursesList } from '@/components/teacher/CoursesList';
import { RegistrationsList } from '@/components/teacher/RegistrationsList';
import { DashboardPrimaryRow } from '@/components/teacher/DashboardPrimaryRow';
import { DashboardUpcomingList } from '@/components/teacher/DashboardUpcomingList';
import { DashboardTodayPanel } from '@/components/teacher/DashboardTodayPanel';
import { DashboardRegistrationsCard } from '@/components/teacher/DashboardRegistrationsCard';
import { DashboardMessagesCard } from '@/components/teacher/DashboardMessagesCard';
import { getTimeBasedGreeting } from '@/utils/timeGreeting';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { EmptyStateToggle } from '@/components/ui/EmptyStateToggle';
import { getShowEmptyState } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useTeacherShell } from '@/components/teacher/TeacherShellContext';
import { typedFrom } from '@/lib/supabase';
import { useSetupProgress } from '@/hooks/use-setup-progress';
import { createStripeConnectLink, checkStripeStatus } from '@/services/stripe-connect';
import { fetchCourses, fetchNextSessions, fetchNearestFullCourse, fetchTodaySessions, fetchLowEnrollmentCourses } from '@/services/courses';
import type { Course as CourseDB } from '@/types/database';
import type { CourseSession } from '@/types/database';
import { fetchRecentSignups, type SignupWithDetails } from '@/services/signups';
import { fetchRecentConversations, type ConversationWithDetails } from '@/services/messages';
import { getInitials } from '@/utils/stringUtils';
import { formatRelativeTimePast } from '@/utils/dateFormatting';
import { extractTimeFromSchedule } from '@/utils/timeExtraction';
import { useMultiTableSubscription } from '@/hooks/use-realtime-subscription';
import type {
  Course as DashboardCourse,
  CourseStyleType as DashboardCourseType,
  Registration,
  SignupStatus,
  Message as DashboardMessage,
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
    unreadCount: conversation.unread_count,
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
    registeredAt: formatRelativeTimePast(signup.created_at || ''),
    createdAt: signup.created_at || '',
    status: signup.status as SignupStatus,
    isVerified: !!signup.profile,
    hasException,
    paymentStatus: signup.payment_status || undefined,
  };
}


const STRIPE_CHECK_THROTTLE_MS = 30 * 60 * 1000; // 30 minutes

const sectionTransition = {
  duration: 0.18,
  delay: 0.06,
  ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
};

const TeacherDashboard = () => {
  const showEmptyState = getShowEmptyState();
  const { currentOrganization, profile, refreshOrganizations } = useAuth();
  const { setBreadcrumbs } = useTeacherShell();
  const [dashboardCourses, setDashboardCourses] = useState<DashboardCourse[]>([]);
  const [todayCourses, setTodayCourses] = useState<DashboardCourse[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [messages, setMessages] = useState<DashboardMessage[]>([]);
  const [, setCapacityCourse] = useState<{ id: string; title: string; attendees: number; capacity: number } | null>(null);
  const [, setLowEnrollmentCourses] = useState<Array<{ id: string; title: string; signups: number; capacity: number }>>([]);
  const [activeCourseCount, setActiveCourseCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [hasCourses, setHasCourses] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);



  // Refresh org data when arriving from Stripe callback
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get('stripe') === 'success') {
      refreshOrganizations();
      // Clean up the query param
      searchParams.delete('stripe');
      setSearchParams(searchParams, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Stripe Connect handler — show explainer dialog first, then redirect
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [showStripeExplainer, setShowStripeExplainer] = useState(false);

  const openStripeExplainer = useCallback(() => {
    setShowStripeExplainer(true);
  }, []);

  const handleConnectStripe = useCallback(async () => {
    if (!currentOrganization?.id) return;
    setConnectingStripe(true);
    const { data, error } = await createStripeConnectLink(currentOrganization.id);
    if (error || !data?.url) {
      logger.error('Failed to create Stripe Connect link:', error);
      toast.error(error?.message || 'Kunne ikke opprette Stripe-tilkobling');
      setConnectingStripe(false);
      return;
    }
    window.location.href = data.url;
  }, [currentOrganization?.id]);

  // Setup progress
  const { steps, completedCount, totalCount, isSetupComplete, motivationalSubtitle } = useSetupProgress({
    currentOrganization,
    profile,
    hasCourses,
    onConnectStripe: openStripeExplainer,
  });

  // One-time "setup done" banner — shown once, then marked as seen in DB
  const [showSetupBanner, setShowSetupBanner] = useState(false);
  useEffect(() => {
    if (isSetupComplete && profile?.id && !profile.setup_complete_seen_at) {
      setShowSetupBanner(true);
      // Mark as seen in DB so it won't show on other devices
      typedFrom('profiles')
        .update({ setup_complete_seen_at: new Date().toISOString() } as any)
        .eq('id', profile.id)
        .then();
    }
  }, [isSetupComplete, profile?.id, profile?.setup_complete_seen_at]);

  // Stripe auto-check (self-heal for missed callbacks)
  useEffect(() => {
    const org = currentOrganization;
    if (!org?.id || !org.stripe_account_id || org.stripe_onboarding_complete) return;

    const lastCheck = sessionStorage.getItem('lastStripeCheck');
    if (lastCheck && Date.now() - Number(lastCheck) < STRIPE_CHECK_THROTTLE_MS) return;

    let isActive = true;
    (async () => {
      const { data } = await checkStripeStatus(org.id);
      if (!isActive) return;
      sessionStorage.setItem('lastStripeCheck', Date.now().toString());
      if (data?.onboardingComplete) {
        await refreshOrganizations();
      }
    })();

    return () => { isActive = false; };
  }, [currentOrganization?.id, currentOrganization?.stripe_account_id, currentOrganization?.stripe_onboarding_complete, refreshOrganizations]);

  // Shared processing: takes parallel fetch results and updates all dashboard state.
  function processDashboardResults(
    coursesResult: Awaited<ReturnType<typeof fetchCourses>>,
    nextSessionsResult: Awaited<ReturnType<typeof fetchNextSessions>>,
    todaySessionsResult: Awaited<ReturnType<typeof fetchTodaySessions>>,
    capacityResult: Awaited<ReturnType<typeof fetchNearestFullCourse>>,
    signupsResult: Awaited<ReturnType<typeof fetchRecentSignups>>,
    messagesResult: Awaited<ReturnType<typeof fetchRecentConversations>>,
    lowEnrollmentResult: Awaited<ReturnType<typeof fetchLowEnrollmentCourses>>,
  ) {
    // Check if user has any courses at all
    const hasAnyCourses = (coursesResult.data && coursesResult.data.length > 0) ||
      (nextSessionsResult.data && nextSessionsResult.data.length > 0);
    setHasCourses(!!hasAnyCourses);

    // Count active courses (non-cancelled returned by fetchCourses)
    setActiveCourseCount(coursesResult.data?.length ?? 0);

    // Process next sessions
    if (nextSessionsResult.data && nextSessionsResult.data.length > 0) {
      setDashboardCourses(nextSessionsResult.data.map(({ session, course, signupCount }) =>
        mapSessionForDashboard(session, course, signupCount)
      ));
    } else {
      setDashboardCourses([]);
    }

    // Process today's sessions
    if (todaySessionsResult.data && todaySessionsResult.data.length > 0) {
      setTodayCourses(todaySessionsResult.data.map(({ session, course }) =>
        mapSessionForDashboard(session, course)
      ));
    } else {
      setTodayCourses([]);
    }

    // Process capacity warning (independent of upcoming sessions)
    if (capacityResult.data) {
      const { course, attendees, capacity } = capacityResult.data;
      setCapacityCourse({ id: course.id, title: course.title, attendees, capacity });
    } else {
      setCapacityCourse(null);
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

    // Process low enrollment warnings
    if (lowEnrollmentResult.data && lowEnrollmentResult.data.length > 0) {
      setLowEnrollmentCourses(lowEnrollmentResult.data.map(({ course, signups, capacity }) => ({
        id: course.id,
        title: course.title,
        signups,
        capacity,
      })));
    } else {
      setLowEnrollmentCourses([]);
    }
  }

  // Refetch function for real-time updates (memoized to prevent subscription loops)
  const refetchDashboardData = useCallback(async () => {
    if (!currentOrganization?.id) return;

    try {
      // Fetch all data in parallel (silently, no loading state for real-time updates)
      const [coursesResult, nextSessionsResult, todaySessionsResult, capacityResult, signupsResult, messagesResult, lowEnrollmentResult] = await Promise.all([
        fetchCourses(currentOrganization.id),
        fetchNextSessions(currentOrganization.id, 3),
        fetchTodaySessions(currentOrganization.id),
        fetchNearestFullCourse(currentOrganization.id),
        fetchRecentSignups(currentOrganization.id, 4),
        fetchRecentConversations(currentOrganization.id, 4),
        fetchLowEnrollmentCourses(currentOrganization.id),
      ]);

      processDashboardResults(coursesResult, nextSessionsResult, todaySessionsResult, capacityResult, signupsResult, messagesResult, lowEnrollmentResult);
    } catch (err) {
      logger.error('Dashboard refetch error:', err);
    }
  }, [currentOrganization?.id]);

  // Subscribe to real-time updates for dashboard data
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
        // Fetch all data in parallel
        const [coursesResult, nextSessionsResult, todaySessionsResult, capacityResult, signupsResult, messagesResult, lowEnrollmentResult] = await Promise.all([
          fetchCourses(currentOrganization.id),
          fetchNextSessions(currentOrganization.id, 3),
          fetchTodaySessions(currentOrganization.id),
          fetchNearestFullCourse(currentOrganization.id),
          fetchRecentSignups(currentOrganization.id, 4),
          fetchRecentConversations(currentOrganization.id, 4),
          fetchLowEnrollmentCourses(currentOrganization.id),
        ]);

        if (!isActive) return;

        if (coursesResult.error) {
          logger.error('Failed to fetch courses:', coursesResult.error);
          setLoadError('Kunne ikke laste kurs');
        }

        processDashboardResults(coursesResult, nextSessionsResult, todaySessionsResult, capacityResult, signupsResult, messagesResult, lowEnrollmentResult);
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
  const paymentFollowUpCount = registrations.filter((registration) => registration.hasException).length;

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
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                    {getTimeBasedGreeting()}{userName ? `, ${userName}` : ''}
                  </h1>
                  {!isLoading && !loadError && isSetupComplete && hasCourses && (
                    <Button asChild size="sm" className="hidden gap-1.5 md:inline-flex">
                      <Link to="/teacher/new-course">
                        <CalendarPlus className="h-3.5 w-3.5" />
                        Opprett kurs
                      </Link>
                    </Button>
                  )}
                </div>
                {!isLoading && !loadError && isSetupComplete && hasCourses && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 md:hidden">
                    <Button asChild size="sm" className="gap-1.5">
                      <Link to="/teacher/new-course">
                        <CalendarPlus className="h-3.5 w-3.5" />
                        Opprett kurs
                      </Link>
                    </Button>
                    <Button asChild variant="outline-soft" size="sm" className="gap-1.5">
                      <Link to="/teacher/schedule">
                        <Calendar className="h-3.5 w-3.5" />
                        Timeplan
                      </Link>
                    </Button>
                    <Button asChild variant="outline-soft" size="sm" className="gap-1.5">
                      <Link to="/teacher/signups">
                        <Users className="h-3.5 w-3.5" />
                        Påmeldinger
                      </Link>
                    </Button>
                    <Button asChild variant="outline-soft" size="sm" className="gap-1.5">
                      <Link to="/teacher/messages">
                        <MessageSquare className="h-3.5 w-3.5" />
                        Meldinger
                      </Link>
                    </Button>
                  </div>
                )}
              </header>


              {showSetupBanner && !isLoading && (
                <Card className="mb-6 flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3 w-3" />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      Alt er klart — du kan nå ta imot påmeldinger og betalinger
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSetupBanner(false)}
                    className="h-8 w-8 shrink-0"
                    aria-label="Lukk"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </Card>
              )}

              {isLoading ? (
                <DashboardSkeleton />
              ) : loadError ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="mb-4 rounded-full bg-muted p-4">
                    <AlertCircle className="h-8 w-8 text-red-700 stroke-[1.5]" />
                  </div>
                  <h3 className="text-base font-medium mb-1 text-foreground">Kunne ikke laste oversikten</h3>
                  <p className="text-sm max-w-xs mb-4 text-muted-foreground">{loadError}</p>
                  <Button
                    variant="outline-soft"
                    size="compact"
                    onClick={() => window.location.reload()}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Prøv på nytt
                  </Button>
                </div>
              ) : !isSetupComplete ? (
                <>
                  <div className="mb-8">
                    <SetupChecklist
                      steps={steps}
                      completedCount={completedCount}
                      totalCount={totalCount}
                      motivationalSubtitle={motivationalSubtitle}
                      loadingStepId={connectingStripe ? 'stripe' : undefined}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
                    <div className="space-y-6">
                      <section className="space-y-3">
                        <h2 className="text-base font-medium text-foreground">Dagens kurs</h2>
                        <CoursesList courses={dashboardCourses} hideHeader />
                      </section>
                    </div>
                    <div className="space-y-6">
                      <Card className="overflow-hidden">
                        <div className="border-b border-border px-6 py-4">
                          <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-base font-medium text-foreground">Siste påmeldinger</h2>
                            <Link to="/teacher/signups" className="text-xs font-medium tracking-wide text-muted-foreground smooth-transition hover:text-foreground">
                              Se alle
                            </Link>
                          </div>
                          <RegistrationsList registrations={registrations} hideHeader hideCard />
                        </div>
                        <div className="px-6 py-4">
                          <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-base font-medium text-foreground">Meldinger</h2>
                            <Link to="/teacher/messages" className="text-xs font-medium tracking-wide text-muted-foreground smooth-transition hover:text-foreground">
                              Se alle
                            </Link>
                          </div>
                          <MessagesList messages={messages} hideHeader hideCard />
                        </div>
                      </Card>
                    </div>
                  </div>
                </>
              ) : (showEmptyState || !hasCourses) ? (
                <>
                  <div className="mb-8">
                    <h3 className="text-base font-medium mb-3 text-foreground">Kom i gang</h3>
                    <Card className="group relative overflow-hidden">
                      <div className="relative z-10 flex flex-col justify-center p-6 sm:p-8">
                        <div className="max-w-xl">
                          <div className="mb-6 w-fit rounded-lg border border-border bg-background p-3">
                            <Plus className="h-6 w-6 text-muted-foreground stroke-[1.5]" />
                          </div>
                          <h2 className="text-xl font-semibold tracking-tight leading-tight text-foreground">
                            Opprett ditt første kurs
                          </h2>
                          <p className="text-sm mb-8 max-w-lg text-muted-foreground">
                            Start med ett kurs. Derfra kan du ta imot påmeldinger, holde oversikt over deltakere og bygge opp timeplanen din i ditt eget tempo.
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
                    </Card>
                  </div>
                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
                    <div className="space-y-6">
                      <section className="space-y-3">
                        <h2 className="text-base font-medium text-foreground">Dagens kurs</h2>
                        <CoursesList courses={[]} hideHeader />
                      </section>
                    </div>
                    <div className="space-y-6">
                      <Card className="overflow-hidden">
                        <div className="border-b border-border px-6 py-4">
                          <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-base font-medium text-foreground">Siste påmeldinger</h2>
                            <Link to="/teacher/signups" className="text-xs font-medium tracking-wide text-muted-foreground smooth-transition hover:text-foreground">
                              Se alle
                            </Link>
                          </div>
                          <RegistrationsList registrations={[]} hideHeader hideCard />
                        </div>
                        <div className="px-6 py-4">
                          <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-base font-medium text-foreground">Meldinger</h2>
                            <Link to="/teacher/messages" className="text-xs font-medium tracking-wide text-muted-foreground smooth-transition hover:text-foreground">
                              Se alle
                            </Link>
                          </div>
                          <MessagesList messages={messages} hideHeader hideCard />
                        </div>
                      </Card>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <DashboardPrimaryRow
                    outstandingPayments={paymentFollowUpCount}
                    activeCourses={activeCourseCount}
                  />
                  <motion.div
                    className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr] xl:items-start"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={sectionTransition}
                  >
                    <div className="space-y-6">
                      <DashboardUpcomingList courses={dashboardCourses} />
                      <DashboardMessagesCard messages={messages} />
                    </div>
                    <aside className="space-y-6">
                      <DashboardTodayPanel courses={todayCourses} />
                      <DashboardRegistrationsCard registrations={registrations} />
                    </aside>
                  </motion.div>
                </>
              )}
            </motion.div>
          </div>
          <EmptyStateToggle />

          {/* Stripe pre-redirect explainer */}
          <Dialog open={showStripeExplainer} onOpenChange={(open) => { if (!connectingStripe) setShowStripeExplainer(open) }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Slik fungerer betalinger</DialogTitle>
                <DialogDescription>
                  Vi bruker Stripe for å håndtere betalinger — samme løsning som brukes av over 1 million virksomheter i Europa.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-3 py-2">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-lg border border-border bg-muted p-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Trygt og sikkert</p>
                    <p className="text-xs font-medium tracking-wide mt-0.5 text-muted-foreground">
                      Pengene fra bookinger overføres direkte til din konto. Ease tar ingen del av betalingen.
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-xs font-medium tracking-wide mb-2 text-foreground">Du trenger</p>
                  <ul className="text-xs font-medium tracking-wide flex flex-col gap-1.5 text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
                      Bankkonto for utbetalinger
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
                      Organisasjonsnummer (valgfritt)
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button onClick={handleConnectStripe} loading={connectingStripe} loadingText="Kobler til">
                  Gå videre til oppsett
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowStripeExplainer(false)}
                  disabled={connectingStripe}
                  className="text-xs font-medium tracking-wide text-muted-foreground w-full"
                >
                  Jeg gjør dette senere
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
  );
};

export default TeacherDashboard;

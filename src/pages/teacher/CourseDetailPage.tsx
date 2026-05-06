import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { pageVariants, pageTransition } from '@/lib/motion';
import {
  ExternalLink,
  MoreHorizontal,
  EyeOff,
  Pencil,
  Wallet,
} from '@/lib/icons';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn, formatKroner } from '@/lib/utils';
import { formatLocalDateKey } from '@/utils/dateUtils';
import { updateCourseSession, publishCourse, unpublishCourse } from '@/services/courses';
import { teacherCancelSignup, markPaymentResolved } from '@/services/signups';
import { friendlyError } from '@/lib/error-messages';
import { formatDateNorwegian } from '@/utils/dateUtils';
import type { PaymentStatus } from '@/components/ui/payment-badge';
import type { SignupStatus } from '@/components/ui/status-badge';
import { ShareCoursePopover } from '@/components/ui/share-course-popover';
import { PublishCourseDialog } from '@/components/teacher/PublishCourseDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useSignupDrawer } from '@/contexts/SignupDrawerContext';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { useTeacherShell } from '@/components/teacher/TeacherShellContext';
import { useCourseDetail } from '@/hooks/use-course-detail';
import { CourseOverviewTab } from '@/components/teacher/CourseOverviewTab';
import { CourseParticipantsTab } from '@/components/teacher/CourseParticipantsTab';
import type { CourseDetailKpis } from '@/components/teacher/CourseDetailKpiStrip';
import type { ParticipantActionHandlers } from '@/components/teacher/ParticipantActionMenu';
import { AddParticipantDialog } from '@/components/teacher/AddParticipantDialog';
import { signupWithProfileToDisplay } from '@/utils/signupDisplay';
import { routes } from '@/lib/routes';

// ---------------------------------------------------------------------------
// Course detail — slimmed (2026-04-29).
//
// Was 1059 lines, 4 tabs (Oversikt / Deltakere / Priser / Innstillinger).
// Settings + Pricing now live at /edit and /priser respectively. Overview
// + Participants are stacked on this page — no tab routing, no internal
// state for forms that aren't here.
// ---------------------------------------------------------------------------

const CourseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentSeller, currentTeam } = useAuth();
  const { setBreadcrumbs } = useTeacherShell();
  const { open: openSignupDrawer } = useSignupDrawer();
  const kursplanRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);
  const [addParticipantDialogOpen, setAddParticipantDialogOpen] = useState(false);

  const [sessionEdits, setSessionEdits] = useState<Record<string, { date?: Date; time?: string }>>({});
  const [savingSessionId, setSavingSessionId] = useState<string | null>(null);

  const {
    course: courseData,
    sessions,
    participants,
    loading: isLoading,
    participantsLoading,
    error,
    setCourse: setCourseData,
    setSessions,
    refetchParticipants,
  } = useCourseDetail(id);

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Hjem', to: routes.dashboard },
      { label: 'Kurs', to: routes.courses },
      { label: courseData?.title || 'Kursdetaljer' },
    ]);
    return () => setBreadcrumbs(null);
  }, [courseData?.title, setBreadcrumbs]);

  const handleSaveSession = async (sessionId: string) => {
    const edits = sessionEdits[sessionId];
    if (!edits || savingSessionId) return;
    setSavingSessionId(sessionId);

    const updateData: { session_date?: string; start_time?: string } = {};
    if (edits.date) updateData.session_date = formatLocalDateKey(edits.date);
    if (edits.time) updateData.start_time = edits.time;

    const { data, error: sessionError } = await updateCourseSession(sessionId, updateData);
    setSavingSessionId(null);
    if (sessionError) {
      toast.error('Kunne ikke lagre endringen');
      return;
    }
    if (data) setSessions((prev) => prev.map((s) => (s.id === sessionId ? data : s)));
    setSessionEdits((prev) => {
      const next = { ...prev };
      delete next[sessionId];
      return next;
    });
  };

  const handlePublish = async () => {
    if (!id) return;
    if (!currentSeller?.dintero_onboarding_complete) {
      setShowPublishDialog(true);
      return;
    }
    setIsPublishing(true);
    const { error: pubError } = await publishCourse(id);
    if (pubError) {
      toast.error(friendlyError(pubError, 'Kunne ikke publisere kurset'));
      setIsPublishing(false);
      return;
    }
    if (courseData) setCourseData({ ...courseData, status: 'upcoming' });
    toast.success('Kurset er publisert');
    setIsPublishing(false);
  };

  const handleUnpublish = async () => {
    if (!id) return;
    setIsUnpublishing(true);
    const { error: unpubError } = await unpublishCourse(id);
    if (unpubError) {
      toast.error(friendlyError(unpubError, 'Kunne ikke avpublisere kurset'));
      setIsUnpublishing(false);
      return;
    }
    if (courseData) setCourseData({ ...courseData, status: 'draft' });
    toast.success('Kurset er lagret som utkast');
    setIsUnpublishing(false);
    setShowUnpublishConfirm(false);
  };

  const participantActionHandlers: ParticipantActionHandlers = useMemo(
    () => ({
      onCancelEnrollment: async (signupId: string, refund: boolean) => {
        const { error: cancelErr } = await teacherCancelSignup(signupId, { refund });
        if (!cancelErr) {
          toast.success('Deltaker avbestilt');
          refetchParticipants();
        } else {
          toast.error(friendlyError(cancelErr, 'Kunne ikke avbestille deltaker'));
        }
      },
      onMarkResolved: async (signupId: string) => {
        const { error: resolvedErr } = await markPaymentResolved(signupId);
        if (!resolvedErr) {
          toast.success('Markert som betalt');
          refetchParticipants();
        } else {
          toast.error('Kunne ikke oppdatere status');
        }
      },
    }),
    [refetchParticipants]
  );

  const displayParticipants = useMemo(
    () =>
      participants.map((signup) => {
        // Relative signup time — "2 timer siden", "i går", etc.
        let registeredAgo: string | undefined;
        if (signup.created_at) {
          const created = new Date(signup.created_at);
          const now = new Date();
          const diffMs = now.getTime() - created.getTime();
          const diffMin = Math.floor(diffMs / (1000 * 60));
          const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          if (diffMin < 60) registeredAgo = diffMin <= 1 ? 'akkurat nå' : `${diffMin} min siden`;
          else if (diffHrs < 24) registeredAgo = diffHrs === 1 ? '1 time siden' : `${diffHrs} timer siden`;
          else if (diffDays === 1) registeredAgo = 'i går';
          else if (diffDays < 7) registeredAgo = `${diffDays} dager siden`;
          else {
            const months = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
            registeredAgo = `${created.getDate()}. ${months[created.getMonth()]}`;
          }
        }
        return {
          id: signup.id,
          name: signup.participant_name || signup.profile?.name || 'Ukjent',
          email: signup.participant_email || signup.profile?.email || '',
          status: signup.status as SignupStatus,
          paymentStatus: signup.payment_status as PaymentStatus,
          amountPaid: signup.amount_paid ?? null,
          notes: signup.note || undefined,
          ticketKind: signup.ticket_kind_snapshot,
          ticketAudience: signup.ticket_audience_snapshot,
          registeredAgo,
        };
      }),
    [participants]
  );

  const kpis: CourseDetailKpis | null = useMemo(() => {
    if (!courseData) return null;
    const paidSignups = participants.filter((p) => p.payment_status === 'paid');
    const pendingSignups = participants.filter(
      (p) => p.payment_status === 'pending' || p.payment_status === 'failed'
    );
    const revenue = paidSignups.reduce((sum, p) => sum + (p.amount_paid || 0), 0);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    let active: CourseDetailKpis['active'] = null;
    let next: CourseDetailKpis['next'] = null;

    const upcoming = sessions
      .filter((s) => s.session_date >= todayStr)
      .sort(
        (a, b) =>
          a.session_date.localeCompare(b.session_date) ||
          (a.start_time || '').localeCompare(b.start_time || '')
      );

    for (const s of upcoming) {
      if (s.session_date !== todayStr || !s.start_time) continue;
      const [sh, sm] = s.start_time.slice(0, 5).split(':').map(Number);
      const startMin = sh * 60 + sm;
      const dur = courseData.durationMinutes || 60;
      const endMin = startMin + dur;
      if (nowMinutes >= startMin && nowMinutes <= endMin) {
        const endH = Math.floor(endMin / 60);
        const endM = endMin % 60;
        const sessionNum = sessions.findIndex((x) => x.id === s.id) + 1;
        active = {
          label: `${courseData.title}${sessions.length > 1 ? ` (${sessionNum}/${sessions.length})` : ''}`,
          sub: `slutter kl. ${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`,
        };
        break;
      }
    }

    const nextSession = upcoming.find((s) => {
      if (!active) return true;
      const [sh, sm] = (s.start_time || '00:00').slice(0, 5).split(':').map(Number);
      return s.session_date !== todayStr || sh * 60 + sm > nowMinutes;
    });
    if (nextSession && !active) {
      const months = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
      const d = new Date(nextSession.session_date);
      const time = nextSession.start_time ? nextSession.start_time.slice(0, 5) : '';
      const diffDays = Math.round((d.getTime() - now.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));
      const sub = diffDays === 0 ? 'i dag' : diffDays === 1 ? 'i morgen' : `om ${diffDays} dager`;
      next = {
        label: `${d.getDate()}. ${months[d.getMonth()]}${time ? ` · ${time}` : ''}`,
        sub,
      };
    }

    return {
      enrolled: courseData.enrolled,
      capacity: courseData.capacity > 0 ? courseData.capacity : null,
      revenue,
      paid: paidSignups.length,
      pending: pendingSignups.length,
      active,
      next,
    };
  }, [courseData, participants, sessions]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col min-h-full overflow-y-auto bg-background">
        <MobileTeacherHeader title="Kurs" />
        <div className="flex-1 px-6 lg:px-8 py-8">
          <div className="max-w-6xl mx-auto w-full">
            <div className="mb-8">
              <Skeleton className="h-8 w-64 mb-3" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <Skeleton className="h-48 rounded-lg" />
                <Skeleton className="h-64 rounded-lg" />
              </div>
              <div className="space-y-8">
                <Skeleton className="h-48 rounded-lg" />
                <Skeleton className="h-32 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !courseData) {
    return (
      <div className="flex-1 flex flex-col min-h-full bg-background">
        <MobileTeacherHeader title="Kurs" />
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <h1 className="text-3xl font-semibold mb-2 text-foreground">Kurs ikke funnet</h1>
            <p className="text-sm text-muted-foreground">{error || 'Kurset finnes ikke eller har blitt slettet.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const course = courseData;
  const isKursrekke = courseData.courseType === 'kursrekke';
  const isMultiDayEnkeltkurs = courseData.courseType === 'enkeltkurs' && sessions.length > 1;
  const isMultiDayCourse = (isKursrekke && sessions.length > 1) || isMultiDayEnkeltkurs;
  const sessionLabel = isKursrekke ? 'Uke' : 'Dag';
  const sessionLabelPlural = isKursrekke ? 'uker' : 'dager';
  const firstUpcomingIndex = sessions.findIndex((s) => s.status === 'upcoming');
  const formatTime = (time: string): string => {
    const parts = time.split(':');
    return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : time;
  };
  const computeEndTime = (
    startHHMM: string,
    durationMinutes: number | null | undefined
  ): string | undefined => {
    if (!startHHMM || !durationMinutes) return undefined;
    const [h, m] = startHHMM.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return undefined;
    const total = h * 60 + m + durationMinutes;
    const eh = Math.floor(total / 60) % 24;
    const em = total % 60;
    return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
  };

  const generatedCourseWeeks = isMultiDayCourse
    ? sessions.map((session, index) => ({
        id: session.id,
        weekNum: String(session.session_number).padStart(2, '0'),
        title: courseData.title,
        status: session.status || 'upcoming',
        isNext: index === firstUpcomingIndex,
        date: formatDateNorwegian(new Date(session.session_date)),
        time: formatTime(session.start_time),
        endTime: computeEndTime(formatTime(session.start_time), courseData.durationMinutes),
        originalDate: session.session_date,
        originalTime: formatTime(session.start_time),
      }))
    : [];

  const hasRealSessions = sessions.length > 0;
  const spotsLeft = course.capacity - course.enrolled;

  return (
    <>
      <main className="flex-1 flex min-h-full flex-col overflow-y-auto bg-background">
        <MobileTeacherHeader title="Kurs" />

        <motion.header
          variants={pageVariants}
          initial="initial"
          animate="animate"
          transition={pageTransition}
        >
          <div className="px-6 pb-0 pt-6 lg:px-8 lg:pt-8">
            <div className="mx-auto w-full max-w-6xl">
              {/* Alert Banners */}
              {courseData.status === 'draft' && !currentSeller?.dintero_onboarding_complete && (
                <Alert variant="warning" className="mb-6">
                  <div>
                    <AlertTitle variant="warning">Kurset er ikke publisert</AlertTitle>
                    <AlertDescription variant="warning">
                      Sett opp betalinger for å publisere kurset og begynne å ta imot påmeldinger.
                    </AlertDescription>
                  </div>
                </Alert>
              )}
              {courseData.status !== 'draft' && !currentSeller?.dintero_onboarding_complete && (
                <Alert variant="warning" className="mb-6">
                  <div>
                    <AlertTitle variant="warning">Sett opp utbetalinger for å motta betalinger</AlertTitle>
                    <AlertDescription variant="warning">
                      Kurset er aktivt, men du kan ikke motta kortbetalinger før oppsettet hos Dintero er fullført.
                    </AlertDescription>
                    <div className="mt-3">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => navigate(routes.settingsPayouts)}
                      >
                        Gjør ferdig oppsett
                      </Button>
                    </div>
                  </div>
                </Alert>
              )}

              {/* Page Header */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
                <div className="min-w-0">
                  <h1 className="flex flex-wrap items-center gap-3 text-3xl font-semibold text-foreground">
                    <span>{course.title}</span>
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium leading-[1.5]',
                        courseData.status === 'active' && 'bg-foreground text-background',
                        courseData.status === 'upcoming' && 'bg-muted text-foreground',
                        courseData.status === 'draft' && 'bg-muted text-muted-foreground',
                        courseData.status === 'completed' && 'bg-muted text-muted-foreground',
                        courseData.status === 'cancelled' && 'bg-muted text-muted-foreground line-through'
                      )}
                    >
                      {courseData.status === 'active' && 'Pågår'}
                      {courseData.status === 'upcoming' && 'Kommende'}
                      {courseData.status === 'draft' && 'Utkast'}
                      {courseData.status === 'completed' && 'Fullført'}
                      {courseData.status === 'cancelled' && 'Avlyst'}
                    </span>
                  </h1>
                  <p className="mt-2 text-sm text-muted-foreground tabular-nums">
                    {[
                      course.timeSchedule && course.durationMinutes
                        ? `${course.timeSchedule} (${course.durationMinutes} min)`
                        : course.timeSchedule || null,
                      course.location || null,
                      course.courseType === 'kursrekke' && courseData.totalWeeks
                        ? `${courseData.totalWeeks} uker`
                        : null,
                      course.price > 0 ? formatKroner(course.price) : null,
                    ]
                      .filter(Boolean)
                      .map((part, i, arr) => (
                        <span key={i}>
                          {part}
                          {i < arr.length - 1 && <span className="text-disabled-foreground mx-2">·</span>}
                        </span>
                      ))}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-start gap-3 md:items-end">
                  {courseData.status === 'draft' ? (
                    <>
                      <Button
                        size="sm"
                        onClick={handlePublish}
                        loading={isPublishing}
                        loadingText="Publiserer …"
                      >
                        Publiser kurs
                      </Button>
                      {currentSeller?.dintero_onboarding_complete && (
                        <Alert variant="info" size="sm" className="max-w-sm">
                          <div>
                            <AlertTitle variant="info">Kurset er et utkast</AlertTitle>
                            <AlertDescription variant="info">
                              Publiser kurset for å gjøre det synlig og ta imot påmeldinger.
                            </AlertDescription>
                          </div>
                        </Alert>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <ShareCoursePopover
                        courseUrl={
                          currentTeam?.slug && courseData.slug
                            ? `${window.location.origin}/${currentTeam.slug}/${courseData.slug}`
                            : ''
                        }
                        courseTitle={courseData.title}
                      />
                      <Button
                        variant="outline-soft"
                        size="sm"
                        onClick={() => {
                          if (currentTeam?.slug && courseData.slug) {
                            window.open(`/${currentTeam.slug}/${courseData.slug}`, '_blank');
                          }
                        }}
                        disabled={!currentTeam?.slug || !courseData.slug}
                      >
                        <ExternalLink className="size-3.5" />
                        Vis side
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline-soft" size="sm" className="px-2">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setShowUnpublishConfirm(true)}>
                            <EyeOff className="size-3.5 mr-2" />
                            Gjør til utkast
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
              </div>

              {/* Action row — replaces the segmented tabs. Each button
                  navigates to a dedicated page (no in-page tab routing). */}
              <div className="flex flex-wrap items-center gap-2 pb-6">
                <Button variant="outline-soft" size="sm" asChild>
                  <Link to={id ? routes.editCourse(id) : '#'}>
                    <Pencil className="size-3.5" />
                    Endre kurs
                  </Link>
                </Button>
                <Button variant="outline-soft" size="sm" asChild>
                  <Link to={id ? routes.coursePricing(id) : '#'}>
                    <Wallet className="size-3.5" />
                    Priser
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Page Content — Overview + Participants stacked, no tabs */}
        <div className="flex-1 px-6 pb-6 lg:px-8 lg:pb-8">
          <div className="mx-auto w-full max-w-6xl space-y-12">
            <CourseOverviewTab
              course={course}
              organizationSlug={currentTeam?.slug}
              spotsLeft={spotsLeft}
              isMultiDayCourse={isMultiDayCourse}
              sessionLabel={sessionLabel}
              sessionLabelPlural={sessionLabelPlural}
              generatedCourseWeeks={generatedCourseWeeks}
              hasRealSessions={hasRealSessions}
              sessionEditHandlers={{
                sessionEdits,
                savingSessionId,
                onSessionEditChange: (weekId, field, value) => {
                  setSessionEdits((prev) => ({
                    ...prev,
                    [weekId]: { ...prev[weekId], [field]: value },
                  }));
                },
                onSessionEditCancel: (weekId) => {
                  setSessionEdits((prev) => {
                    const next = { ...prev };
                    delete next[weekId];
                    return next;
                  });
                },
                onSaveSession: handleSaveSession,
              }}
              recentParticipants={displayParticipants.slice(0, 5)}
              totalParticipantCount={displayParticipants.length}
              kpis={kpis}
              kpisLoading={isLoading}
              onJumpToParticipants={() => {
                kursplanRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              kursplanRef={kursplanRef}
            />

            <section ref={kursplanRef} aria-labelledby="participants-heading">
              <h2
                id="participants-heading"
                className="text-2xl font-semibold text-foreground mb-6"
              >
                Deltakere
              </h2>
              <CourseParticipantsTab
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                participants={displayParticipants}
                participantsLoading={participantsLoading}
                onOpenAddDialog={() => setAddParticipantDialogOpen(true)}
                courseName={course.title}
                actionHandlers={participantActionHandlers}
                onRowClick={(participantId) => {
                  // The list shape (SignupWithProfile) lacks a course join,
                  // but we already know the course on this page — pass it
                  // through to project a SignupDisplay for the drawer.
                  const signup = participants.find((p) => p.id === participantId);
                  if (!signup || !id) return;
                  openSignupDrawer(
                    signupWithProfileToDisplay(signup, {
                      id,
                      title: course.title,
                      courseType: course.courseType === 'kursrekke' ? 'course-series' : 'event',
                      timeSchedule: course.timeSchedule,
                      startDate: course.startDate,
                      endDate: course.endDate,
                      maxParticipants: course.capacity,
                      totalWeeks: courseData.totalWeeks ?? null,
                    }),
                    { onMutate: refetchParticipants },
                  );
                }}
              />
            </section>
          </div>
        </div>
      </main>

      <AddParticipantDialog
        open={addParticipantDialogOpen}
        onOpenChange={setAddParticipantDialogOpen}
        courseId={id!}
        organizationId={currentSeller?.id || ''}
        onSuccess={refetchParticipants}
      />

      {currentSeller?.id && (
        <PublishCourseDialog
          open={showPublishDialog}
          onOpenChange={setShowPublishDialog}
          courseTitle={courseData.title}
        />
      )}

      <AlertDialog open={showUnpublishConfirm} onOpenChange={setShowUnpublishConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gjøre kurset til utkast?</AlertDialogTitle>
            <AlertDialogDescription>
              Kurset blir skjult fra den offentlige siden. Eksisterende påmeldinger påvirkes ikke.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleUnpublish}
              loading={isUnpublishing}
              loadingText="Lagrer …"
            >
              Gjør til utkast
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CourseDetailPage;

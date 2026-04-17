import { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { pageVariants, pageTransition, tabVariants, tabTransition } from '@/lib/motion';
import { ExternalLink, MoreHorizontal, EyeOff, Calendar } from '@/lib/icons';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import { Button } from '@/components/ui/button';
import { cn, formatKroner } from '@/lib/utils';
import { formatLocalDateKey } from '@/utils/dateUtils';
import { updateCourse, cancelCourse, publishCourse, unpublishCourse, fetchCourseSessions, updateCourseSession } from '@/services/courses';
import { teacherCancelSignup, sendPaymentLink, markPaymentResolved } from '@/services/signups';
import { friendlyError } from '@/lib/error-messages';
import type { ParticipantActionHandlers } from '@/components/teacher/ParticipantActionMenu';
import { uploadCourseImage, deleteCourseImage } from '@/services/storage';
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
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { useTeacherShell } from '@/components/teacher/TeacherShellContext';
import { createStripeConnectLink } from '@/services/stripe-connect';
import { useCourseDetail } from '@/hooks/use-course-detail';
import { CourseOverviewTab } from '@/components/teacher/CourseOverviewTab';
import { CourseParticipantsTab } from '@/components/teacher/CourseParticipantsTab';
import { CourseSettingsTab } from '@/components/teacher/CourseSettingsTab';
import { AddParticipantDialog } from '@/components/teacher/AddParticipantDialog';
import { MessageParticipantsDialog } from '@/components/teacher/MessageParticipantsDialog';
import type { AudienceLevel, EquipmentInfo, PracticalInfo } from '@/types/practicalInfo';
import type { Json } from '@/types/database';
import { ARRIVAL_MINUTES_MAX, CUSTOM_BULLET_MAX_LENGTH } from '@/utils/practicalInfoUtils';

type Tab = 'overview' | 'participants' | 'settings';

const CourseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentOrganization } = useAuth();
  const { setBreadcrumbs } = useTeacherShell();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [_startDate, _setStartDate] = useState<Date | undefined>(new Date());
  const [settingsTime, setSettingsTime] = useState('09:00');
  const [settingsDate, setSettingsDate] = useState<Date | undefined>(new Date());
  const [settingsDuration, setSettingsDuration] = useState<number | null>(60);
  const kursplanRef = useRef<HTMLDivElement>(null);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);

  // Data fetching, sessions, participants, and realtime subscription
  const {
    course: courseData,
    sessions,
    participants,
    loading: isLoading,
    participantsLoading,
    error,
    maxParticipants,
    setCourse: setCourseData,
    setSessions,
    setMaxParticipants,
    refetchParticipants,
  } = useCourseDetail(id);

  // Settings form state
  const [settingsTitle, setSettingsTitle] = useState('');
  const [settingsDescription, setSettingsDescription] = useState('');
  const [settingsImageUrl, setSettingsImageUrl] = useState<string | null>(null);
  const [settingsImageFile, setSettingsImageFile] = useState<File | null>(null);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Practical info state
  const [settingsAudienceLevel, setSettingsAudienceLevel] = useState<AudienceLevel | ''>('');
  const [settingsEquipment, setSettingsEquipment] = useState<EquipmentInfo | ''>('');
  const [settingsArrivalMinutes, setSettingsArrivalMinutes] = useState('');
  const [settingsCustomBullets, setSettingsCustomBullets] = useState<string[]>([]);

  const [isDeleting, setIsDeleting] = useState(false);

  const [sessionEdits, setSessionEdits] = useState<Record<string, { date?: Date; time?: string }>>({});
  const [savingSessionId, setSavingSessionId] = useState<string | null>(null);

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Hjem', to: '/teacher' },
      { label: 'Kurs', to: '/teacher/courses' },
      { label: courseData?.title || 'Kursdetaljer' },
    ]);

    return () => setBreadcrumbs(null);
  }, [courseData?.title, setBreadcrumbs]);

  // Dirty state tracking for settings tab
  const isSettingsDirty = useMemo(() => {
    if (!courseData) return false;

    if (settingsTitle !== courseData.title) return true;
    if (settingsDescription !== (courseData.description || '')) return true;
    if (settingsImageUrl !== courseData.imageUrl) return true;
    if (settingsImageFile !== null) return true;
    if (imageToDelete !== null) return true;
    if (maxParticipants !== courseData.capacity) return true;
    if (settingsDuration !== courseData.durationMinutes) return true;

    // Compare date
    const origDate = courseData.startDate ? new Date(courseData.startDate).toDateString() : '';
    const currDate = settingsDate ? settingsDate.toDateString() : '';
    if (currDate !== origDate) return true;

    // Compare time
    const origTimeMatch = courseData.timeSchedule.match(/(\d{1,2}:\d{2})/);
    const origTime = origTimeMatch ? origTimeMatch[1] : '';
    if (settingsTime !== origTime) return true;

    // Compare practical info
    const pi = courseData.practicalInfo;
    if (settingsAudienceLevel !== (pi?.audience_level || '')) return true;
    if (settingsEquipment !== (pi?.equipment || '')) return true;
    if (settingsArrivalMinutes !== (pi?.arrival_minutes_before?.toString() || '')) return true;
    const origBullets = pi?.custom_bullets || [];
    if (settingsCustomBullets.length !== origBullets.length) return true;
    if (settingsCustomBullets.some((b, i) => b !== origBullets[i])) return true;

    return false;
  }, [courseData, settingsTitle, settingsDescription, settingsImageUrl, settingsImageFile, imageToDelete, maxParticipants, settingsDuration, settingsDate, settingsTime, settingsAudienceLevel, settingsEquipment, settingsArrivalMinutes, settingsCustomBullets]);

  // Cancel preview dialog state
  const [showCancelPreview, setShowCancelPreview] = useState(false);

  // Add participant dialog state
  const [addParticipantDialogOpen, setAddParticipantDialogOpen] = useState(false);

  // Message participants dialog state
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);

  // Initialize settings form state when course data loads
  useEffect(() => {
    if (!courseData) return;

    setSettingsTitle(courseData.title);
    setSettingsDescription(courseData.description || '');
    setSettingsImageUrl(courseData.imageUrl);

    // Parse time from time_schedule (e.g., "Tirsdager, 18:00" -> "18:00")
    const timeMatch = courseData.timeSchedule.match(/(\d{1,2}:\d{2})/);
    if (timeMatch) {
      setSettingsTime(timeMatch[1]);
    }

    // Initialize duration
    setSettingsDuration(courseData.durationMinutes);

    // Initialize start date
    if (courseData.startDate) {
      setSettingsDate(new Date(courseData.startDate));
    }

    // Initialize practical info
    const pi = courseData.practicalInfo;
    setSettingsAudienceLevel(pi?.audience_level || '');
    setSettingsEquipment(pi?.equipment || '');
    setSettingsArrivalMinutes(pi?.arrival_minutes_before?.toString() || '');
    setSettingsCustomBullets(pi?.custom_bullets || []);
  // Only run when courseData identity changes (initial load / refetch)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseData]);

  // Handle save individual session
  const handleSaveSession = async (sessionId: string) => {
    const edits = sessionEdits[sessionId];
    if (!edits || savingSessionId) return;

    setSavingSessionId(sessionId);

    const updateData: { session_date?: string; start_time?: string } = {};

    if (edits.date) {
      updateData.session_date = formatLocalDateKey(edits.date);
    }
    if (edits.time) {
      updateData.start_time = edits.time;
    }

    const { data, error } = await updateCourseSession(sessionId, updateData);
    setSavingSessionId(null);

    if (error) {
      toast.error('Kunne ikke lagre endringen');
      return;
    }

    if (data) {
      setSessions(prev => prev.map(s => s.id === sessionId ? data : s));
    }

    setSessionEdits(prev => {
      const newEdits = { ...prev };
      delete newEdits[sessionId];
      return newEdits;
    });
  };

  // Handle save settings
  const handleSaveSettings = async () => {
    if (!id) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      let newImageUrl = settingsImageUrl;

      // Delete old image if marked for deletion
      if (imageToDelete && currentOrganization?.id) {
        await deleteCourseImage(id, imageToDelete, currentOrganization.id);
        setImageToDelete(null);
      }

      // Upload new image if provided
      if (settingsImageFile) {
        const { url, error: uploadError } = await uploadCourseImage(id, settingsImageFile);
        if (uploadError) {
          setSaveError(uploadError.message);
          return; // finally block handles setIsSaving(false)
        }
        newImageUrl = url;
        setSettingsImageFile(null);
      }

      // Build time_schedule from settingsDate and settingsTime
      let timeSchedule: string | undefined;
      if (settingsDate && settingsTime) {
        const dayName = new Intl.DateTimeFormat('nb-NO', { weekday: 'long' }).format(settingsDate);
        timeSchedule = `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}er, ${settingsTime}`;
      }

      // Build practical_info from settings state
      const practicalInfo: PracticalInfo = {};
      if (settingsAudienceLevel) practicalInfo.audience_level = settingsAudienceLevel;
      if (settingsEquipment) practicalInfo.equipment = settingsEquipment;
      const arrivalNum = parseInt(settingsArrivalMinutes);
      if (!isNaN(arrivalNum) && arrivalNum > 0 && arrivalNum <= ARRIVAL_MINUTES_MAX) {
        practicalInfo.arrival_minutes_before = arrivalNum;
      }
      const filteredBullets = settingsCustomBullets
        .filter(b => b.trim())
        .map(b => b.trim().slice(0, CUSTOM_BULLET_MAX_LENGTH));
      if (filteredBullets.length > 0) practicalInfo.custom_bullets = filteredBullets;
      const hasPracticalInfo = Object.keys(practicalInfo).length > 0;

      const updateData = {
        title: settingsTitle.trim(),
        description: settingsDescription.trim() || null,
        max_participants: maxParticipants,
        time_schedule: timeSchedule,
        image_url: newImageUrl,
        duration: settingsDuration,
        practical_info: hasPracticalInfo ? (practicalInfo as unknown as Json) : null,
      };

      const { error: updateError } = await updateCourse(id, updateData);

      if (updateError) {
        setSaveError(updateError.message || 'Kunne ikke lagre endringer. Prøv på nytt.');
        return;
      }

      // If time changed, update all course sessions with the new time
      if (settingsTime && sessions.length > 0) {
        const oldTime = sessions[0]?.start_time;
        if (oldTime && oldTime !== settingsTime) {
          // Update all sessions with the new time
          const updatePromises = sessions.map(session =>
            updateCourseSession(session.id, { start_time: settingsTime })
          );
          await Promise.all(updatePromises);

          // Refresh sessions to show updated times
          const updatedSessions = await fetchCourseSessions(id);
          if (updatedSessions.data) {
            setSessions(updatedSessions.data);
          }
        }
      }

      // Update local state to reflect changes
      setCourseData(prev => prev ? {
        ...prev,
        title: settingsTitle.trim(),
        description: settingsDescription.trim(),
        capacity: maxParticipants,
        timeSchedule: timeSchedule || prev.timeSchedule,
        imageUrl: newImageUrl,
        durationMinutes: settingsDuration || prev.durationMinutes,
        practicalInfo: hasPracticalInfo ? practicalInfo : null,
      } : null);
      setSettingsImageUrl(newImageUrl);

      toast.success('Endringer lagret');
    } catch {
      setSaveError('Noe gikk galt. Prøv på nytt.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle publish draft course
  const handlePublish = async () => {
    if (!id) return;
    if (!currentOrganization?.stripe_onboarding_complete) {
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
    if (courseData) {
      setCourseData({ ...courseData, status: 'upcoming' });
    }
    toast.success('Kurset er publisert');
    setIsPublishing(false);
  };

  // Handle unpublish course (sets back to draft)
  const handleUnpublish = async () => {
    if (!id) return;
    setIsUnpublishing(true);
    const { error: unpubError } = await unpublishCourse(id);
    if (unpubError) {
      toast.error(friendlyError(unpubError, 'Kunne ikke avpublisere kurset'));
      setIsUnpublishing(false);
      return;
    }
    if (courseData) {
      setCourseData({ ...courseData, status: 'draft' });
    }
    toast.success('Kurset er lagret som utkast');
    setIsUnpublishing(false);
    setShowUnpublishConfirm(false);
  };

  // Handle cancel course (with refunds and notifications)
  const handleDeleteCourse = async () => {
    if (!id) return;

    setIsDeleting(true);

    try {
      const { data: result, error: cancelError } = await cancelCourse(id, {
        notify_participants: true
      });

      if (cancelError) {
        setSaveError(cancelError.message || 'Kunne ikke avlyse kurset');
        setShowCancelPreview(false);
        return;
      }

      // Show success message with details
      const message = result
        ? `Kurset er avlyst. ${result.refunds_processed} refusjoner behandlet, ${result.notifications_sent} deltakere varslet.`
        : 'Kurset er avlyst.';

      setShowCancelPreview(false);
      toast.success('Kurs avlyst');
      // Navigate to courses list on success
      navigate('/teacher/courses', { state: { message } });
    } catch {
      setSaveError('Kunne ikke avlyse kurset. Prøv igjen.');
      setShowCancelPreview(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // Compute refund preview for cancel dialog (must be before early returns)
  const refundPreview = useMemo(() => {
    const paidSignups = participants.filter(p => p.payment_status === 'paid');
    const totalRefund = paidSignups.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
    return {
      participants: paidSignups,
      totalAmount: totalRefund,
      count: paidSignups.length
    };
  }, [participants]);

  // Action handlers for participant actions (cancel, payment link, mark resolved)
  const participantActionHandlers: ParticipantActionHandlers = useMemo(() => ({
    onSendPaymentLink: async (signupId: string) => {
      const { error } = await sendPaymentLink(signupId);
      if (!error) {
        toast.success('Betalingslenke sendt');
      } else {
        toast.error(friendlyError(error, 'Kunne ikke sende betalingslenke'));
      }
    },
    onCancelEnrollment: async (signupId: string, refund: boolean) => {
      const { error } = await teacherCancelSignup(signupId, { refund });
      if (!error) {
        toast.success('Deltaker avbestilt');
        refetchParticipants();
      } else {
        toast.error(friendlyError(error, 'Kunne ikke avbestille deltaker'));
      }
    },
    onMarkResolved: async (signupId: string) => {
      const { error } = await markPaymentResolved(signupId);
      if (!error) {
        toast.success('Markert som betalt');
        refetchParticipants();
      } else {
        toast.error('Kunne ikke oppdatere status');
      }
    },
  }), [refetchParticipants]);

  // Confirmed participants for messaging (name + email)
  const confirmedParticipants = useMemo(() =>
    participants
      .filter(p => p.status === 'confirmed')
      .map(p => ({
        name: p.participant_name || p.profile?.name || 'Ukjent',
        email: p.participant_email || p.profile?.email || '',
      }))
      .filter(p => p.email),
    [participants]
  );

  // Map participants from database to display format
  const displayParticipants = useMemo(() => participants.map(signup => ({
    id: signup.id,
    name: signup.participant_name || signup.profile?.name || 'Ukjent',
    email: signup.participant_email || signup.profile?.email || '',
    status: signup.status as SignupStatus,
    paymentStatus: signup.payment_status as PaymentStatus,
    amountPaid: signup.amount_paid ?? null,
    notes: signup.note || undefined,
    receiptUrl: signup.stripe_receipt_url || undefined,
  })), [participants]);


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
              <div className="mb-8">
                <ToggleGroup type="single" value="overview" onValueChange={() => {}} variant="pill" spacing={1} className="gap-1.5">
                  <ToggleGroupItem value="overview">Oversikt</ToggleGroupItem>
                  <ToggleGroupItem value="participants">Deltakere</ToggleGroupItem>
                  <ToggleGroupItem value="settings">Innstillinger</ToggleGroupItem>
                </ToggleGroup>
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

  // Error or not found state
  if (error || !courseData) {
    return (
      <div className="flex-1 flex flex-col min-h-full bg-background">
          <MobileTeacherHeader title="Kurs" />

          <div className="flex-1 flex items-center justify-center text-center">
            <div>
            <h1 className="text-3xl font-semibold tracking-tight mb-2 text-foreground">Kurs ikke funnet</h1>
            <p className="text-muted-foreground">{error || 'Kurset finnes ikke eller har blitt slettet.'}</p>
            </div>
          </div>
        </div>
    );
  }

  // Alias for easier access
  const course = courseData;

  // Determine if this is a multi-session course based on actual sessions from DB
  const isKursrekke = courseData.courseType === 'kursrekke';
  const isMultiDayEnkeltkurs = courseData.courseType === 'enkeltkurs' && sessions.length > 1;
  const isMultiDayCourse = (isKursrekke && sessions.length > 1) || isMultiDayEnkeltkurs;

  // Get session label
  const sessionLabel = isKursrekke ? 'Uke' : 'Dag';
  const sessionLabelPlural = isKursrekke ? 'uker' : 'dager';

  // Find the first upcoming session index (to mark as "next")
  const firstUpcomingIndex = sessions.findIndex(s => s.status === 'upcoming');

  // Format time to HH:MM (strip seconds if present)
  const formatTime = (time: string): string => {
    const parts = time.split(':');
    return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : time;
  };

  // Map sessions from database to display format
  const generatedCourseWeeks = isMultiDayCourse
    ? sessions.map((session, index) => ({
        id: session.id,
        weekNum: String(session.session_number).padStart(2, '0'),
        title: courseData.title,
        status: session.status || 'upcoming',
        isNext: index === firstUpcomingIndex, // First upcoming session is "next"
        date: formatDateNorwegian(new Date(session.session_date)),
        time: formatTime(session.start_time),
        // Store original data for editing
        originalDate: session.session_date,
        originalTime: formatTime(session.start_time),
      }))
    : [];

  // Check if we have real sessions from DB
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
            {courseData?.status === 'draft' && !currentOrganization?.stripe_onboarding_complete && (
              <Alert variant="warning" className="mb-6">
                <div>
                  <AlertTitle variant="warning">Kurset er ikke publisert</AlertTitle>
                  <AlertDescription variant="warning">
                    Sett opp betalinger for å publisere kurset og begynne å ta imot påmeldinger.
                  </AlertDescription>
                </div>
              </Alert>
            )}
            {courseData?.status !== 'draft' && !currentOrganization?.stripe_onboarding_complete && (
              <Alert variant="warning" className="mb-6">
                <div>
                  <AlertTitle variant="warning">Koble til Stripe for å motta betalinger</AlertTitle>
                  <AlertDescription variant="warning">
                    Kurset er aktivt, men du kan ikke motta kortbetalinger før Stripe-kontoen din er ferdig satt opp.
                  </AlertDescription>
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="xs"
                      loading={connectingStripe}
                      loadingText="Sender deg til Stripe …"
                      onClick={async () => {
                        if (!currentOrganization?.id) return;
                        setConnectingStripe(true);
                        const { data, error } = await createStripeConnectLink(currentOrganization.id);
                        if (error || !data?.url) {
                          toast.error(error?.message || 'Kunne ikke opprette Stripe-tilkobling');
                          setConnectingStripe(false);
                          return;
                        }
                        window.location.href = data.url;
                      }}
                    >
                      Gjør ferdig oppsett
                    </Button>
                  </div>
                </div>
              </Alert>
            )}

            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                  {course.title}
                </h1>
                <div className="text-sm mt-1 flex items-center gap-3 text-muted-foreground">
                  {courseData?.status === 'draft' && (
                    <StatusBadge status="draft" size="sm" />
                  )}
                  {courseData?.status === 'upcoming' && (
                    <StatusBadge status="upcoming" size="sm" />
                  )}
                  {courseData?.status === 'active' && (
                    <StatusBadge status="active" size="sm" />
                  )}
                  {courseData?.status === 'completed' && (
                    <StatusBadge status="completed" size="sm" />
                  )}
                  {course.createdAt && (
                    <span className="text-xs font-medium tracking-wide flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      Opprettet {formatDateNorwegian(new Date(course.createdAt), 'd. MMM')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-start gap-3 md:items-end">
                {courseData?.status === 'draft' ? (
                  <>
                    <Button
                      size="compact"
                      onClick={handlePublish}
                      loading={isPublishing}
                      loadingText="Publiserer …"
                    >
                      Publiser kurs
                    </Button>
                    {currentOrganization?.stripe_onboarding_complete && (
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
                      courseUrl={currentOrganization?.slug ? `${window.location.origin}/studio/${currentOrganization.slug}/${id}` : ''}
                      courseTitle={courseData?.title}
                    />
                    <Button
                      variant="outline-soft"
                      size="compact"
                      onClick={() => currentOrganization?.slug && window.open(`/studio/${currentOrganization.slug}/${id}`, '_blank')}
                      disabled={!currentOrganization?.slug}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Vis side
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline-soft" size="compact" className="px-2">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setShowUnpublishConfirm(true)}>
                          <EyeOff className="h-3.5 w-3.5 mr-2" />
                          Gjør til utkast
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            </div>
            <div className="pb-4">
              <ToggleGroup type="single" value={activeTab} onValueChange={(v) => { if (v) setActiveTab(v as Tab); }} variant="pill" spacing={1} className="gap-1.5">
                <ToggleGroupItem value="overview">Oversikt</ToggleGroupItem>
                <ToggleGroupItem value="participants">Deltakere ({course.enrolled})</ToggleGroupItem>
                <ToggleGroupItem value="settings">Innstillinger</ToggleGroupItem>
              </ToggleGroup>
            </div>
            </div>
          </div>
        </motion.header>

        {/* Page Content */}
        <div className="flex-1 px-6 pb-6 lg:px-8 lg:pb-8">
          <div className="mx-auto w-full max-w-6xl">
            <div role="tabpanel">
              <AnimatePresence mode="wait">

            {/* TAB 1: OVERSIKT (Overview) */}
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                variants={tabVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={tabTransition}
              >
                <CourseOverviewTab
                  course={course}
                  organizationSlug={currentOrganization?.slug}
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
                      setSessionEdits(prev => ({
                        ...prev,
                        [weekId]: { ...prev[weekId], [field]: value }
                      }));
                    },
                    onSessionEditCancel: (weekId) => {
                      setSessionEdits(prev => {
                        const newEdits = { ...prev };
                        delete newEdits[weekId];
                        return newEdits;
                      });
                    },
                    onSaveSession: handleSaveSession,
                  }}
                  onMessageParticipants={() => setMessageDialogOpen(true)}
                  recentParticipants={displayParticipants.slice(0, 5)}
                  totalParticipantCount={displayParticipants.length}
                  kursplanRef={kursplanRef}
                />
              </motion.div>
            )}

            {/* TAB 2: DELTAKERE (Participants) */}
            {activeTab === 'participants' && (
              <motion.div
                key="participants"
                variants={tabVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={tabTransition}
              >
                <CourseParticipantsTab
                  searchQuery={searchQuery}
                  onSearchQueryChange={setSearchQuery}
                  participants={displayParticipants}
                  participantsLoading={participantsLoading}
                  onOpenAddDialog={() => setAddParticipantDialogOpen(true)}
                  courseName={course.title}
                  actionHandlers={participantActionHandlers}
                />

              </motion.div>
            )}

            {/* TAB 3: INNSTILLINGER (Settings) */}
            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                variants={tabVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={tabTransition}
              >
                <CourseSettingsTab
                  settingsTitle={settingsTitle}
                  onTitleChange={setSettingsTitle}
                  settingsDescription={settingsDescription}
                  onDescriptionChange={setSettingsDescription}
                  settingsImageUrl={settingsImageUrl}
                  onImageFileChange={(file) => {
                    setSettingsImageFile(file);
                    if (!file && settingsImageUrl) {
                      setImageToDelete(settingsImageUrl);
                      setSettingsImageUrl(null);
                    }
                  }}
                  onImageRemove={() => {
                    if (settingsImageUrl) {
                      setImageToDelete(settingsImageUrl);
                      setSettingsImageUrl(null);
                    }
                  }}
                  isSaving={isSaving}
                  settingsDate={settingsDate}
                  onDateChange={setSettingsDate}
                  settingsTime={settingsTime}
                  onTimeChange={setSettingsTime}
                  settingsDuration={settingsDuration}
                  onDurationChange={setSettingsDuration}
                  maxParticipants={maxParticipants}
                  onMaxParticipantsChange={setMaxParticipants}
                  currentEnrolled={courseData?.enrolled || 0}
                  settingsAudienceLevel={settingsAudienceLevel}
                  onAudienceLevelChange={setSettingsAudienceLevel}
                  settingsEquipment={settingsEquipment}
                  onEquipmentChange={setSettingsEquipment}
                  settingsArrivalMinutes={settingsArrivalMinutes}
                  onArrivalMinutesChange={setSettingsArrivalMinutes}
                  settingsCustomBullets={settingsCustomBullets}
                  onCustomBulletsChange={setSettingsCustomBullets}
                  refundPreview={refundPreview}
                  onCancelCourse={() => setShowCancelPreview(true)}
                  isDirty={isSettingsDirty}
                  saveError={saveError}
                  onSave={handleSaveSettings}
                  onCancel={() => setActiveTab('overview')}
                />
              </motion.div>
            )}

              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      {/* Add Participant Dialog */}
      <AddParticipantDialog
        open={addParticipantDialogOpen}
        onOpenChange={setAddParticipantDialogOpen}
        courseId={id!}
        organizationId={currentOrganization?.id || ''}
        onSuccess={refetchParticipants}
      />

      {/* Message Participants Dialog */}
      <MessageParticipantsDialog
        open={messageDialogOpen}
        onOpenChange={setMessageDialogOpen}
        courseName={course.title}
        participants={confirmedParticipants}
        organizationName={currentOrganization?.name}
      />

      {/* Publish Course Dialog (Stripe not connected) */}
      {currentOrganization?.id && (
        <PublishCourseDialog
          open={showPublishDialog}
          onOpenChange={setShowPublishDialog}
          organizationId={currentOrganization.id}
          courseTitle={courseData?.title}
        />
      )}

      {/* Unpublish Confirmation Dialog */}
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
              variant="destructive-outline"
              onClick={handleUnpublish}
              loading={isUnpublishing}
              loadingText="Lagrer …"
            >
              Gjør til utkast
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Course Preview Dialog */}
      <AlertDialog open={showCancelPreview} onOpenChange={setShowCancelPreview}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Avlyse kurset?</AlertDialogTitle>
            <AlertDialogDescription>
              {refundPreview.count > 0
                ? `${refundPreview.count} deltaker${refundPreview.count !== 1 ? 'e' : ''} vil bli refundert og varslet på e-post.`
                : 'Kurset vil bli avlyst.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {refundPreview.count > 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <span className="text-xs font-medium block text-foreground">
                  Refunderes
                </span>
                <div className="max-h-[200px] overflow-y-auto">
                  {refundPreview.participants.map((p, i) => (
                    <div
                      key={p.id}
                      className={cn(
                        'flex items-center justify-between py-3',
                        i < refundPreview.participants.length - 1 && 'border-b border-border'
                      )}
                    >
                      <span className="text-sm text-foreground">{p.participant_name || p.participant_email}</span>
                      <span className="text-sm tabular-nums text-muted-foreground">{formatKroner(p.amount_paid)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
                <span className="text-xs font-medium tracking-wide text-muted-foreground">Total refusjon</span>
                <span className="text-sm font-medium tabular-nums text-foreground">{formatKroner(refundPreview.totalAmount)}</span>
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Avbryt</AlertDialogCancel>
            <Button
              variant="destructive-outline"
              onClick={(e) => {
                e.preventDefault();
                handleDeleteCourse();
              }}
              disabled={isDeleting}
              loading={isDeleting}
              loadingText={refundPreview.count > 0
                ? `Behandler ${refundPreview.count} refusjon${refundPreview.count > 1 ? 'er' : ''}`
                : 'Avlyser'}
            >
              Avlys kurs
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CourseDetailPage;

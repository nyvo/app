import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { FileText, Mail, MoreHorizontal } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog, ConfirmScopeItem } from '@/components/ui/confirm-dialog';
import { UserAvatar } from '@/components/ui/user-avatar';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { SignupStatusBadge } from '@/components/ui/signup-status-badge';
import { ShareCoursePopover } from '@/components/ui/share-course-popover';
import { CourseSettingsTab } from '@/components/teacher/CourseSettingsTab';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { PageState } from '@/components/page-state/page-state';
import { AddParticipantDrawer } from '@/components/teacher/AddParticipantDrawer';
import { PublishCourseDialog } from '@/components/teacher/PublishCourseDialog';
import {
  ParticipantActionMenu,
  type ActionableParticipant,
} from '@/components/teacher/ParticipantActionMenu';
import { pageVariants, pageTransition } from '@/lib/motion';
import { useCourseDetail } from '@/hooks/use-course-detail';
import {
  updateCourse,
  cancelCourse,
  fetchCourseSessions,
  updateCourseSession,
  syncCourseDropInTier,
  publishCourse,
  unpublishCourse,
} from '@/services/courses';
import {
  teacherCancelSignup,
  markPaymentResolved,
  type SignupWithProfile,
} from '@/services/signups';
import { uploadCourseImage, deleteCourseImage } from '@/services/storage';
import { useAuth } from '@/contexts/AuthContext';
import { friendlyError } from '@/lib/error-messages';
import { routes } from '@/lib/routes';
import { cn, formatKroner } from '@/lib/utils';
import type {
  ExceptionType,
  PaymentStatus,
  SignupStatus,
  TicketAudience,
} from '@/types/database';

const AUDIENCE_LABEL: Record<TicketAudience, string> = {
  standard: 'Standard',
  student: 'Student',
  senior: 'Honnør',
  staff: 'Personale',
};

/** Returns a ticket tag only when notable — drop-in, or a non-standard audience.
 *  "Standard" is the default and would just be noise on every row. */
function ticketTagFor(p: SignupWithProfile): string | null {
  if (p.ticket_kind_snapshot === 'drop_in') return 'Drop-in';
  if (p.ticket_audience_snapshot && p.ticket_audience_snapshot !== 'standard') {
    return AUDIENCE_LABEL[p.ticket_audience_snapshot];
  }
  return null;
}

function exceptionFor(payment: PaymentStatus, status: SignupStatus): ExceptionType | null {
  if (status === 'cancelled' || status === 'course_cancelled') return null;
  if (payment === 'failed') return 'payment_failed';
  if (payment === 'pending') return 'pending_payment';
  return null;
}

type TabKey = 'detaljer' | 'pameldte';

/**
 * Course not-found shell — wraps the canonical NotFoundState in the
 * teacher-layout scroll container + mobile header so chrome stays consistent
 * with the rest of the dashboard.
 */
function CourseNotFound({ description }: { description?: string }) {
  return (
    <div className="flex-1 overflow-y-auto bg-background h-full">
      <MobileTeacherHeader title="Kurs" />
      <PageState variant="course" description={description} />
    </div>
  );
}

/**
 * CoursePage — full course detail / configuration page.
 *
 * The drawer's "Åpne kursside →" escape target. Three underline tabs slice
 * the course into its three concerns: Detaljer (the editable form),
 * Priser (ticket tiers), and Påmeldte (the participants list). Page shell
 * follows the dashboard convention (max-w-7xl centered, lg:px-8 padding).
 */
const CoursePage = () => {
  const navigate = useNavigate();
  const { id: courseId } = useParams<{ id: string }>();
  const { currentSeller, currentTeam } = useAuth();

  const {
    course: courseData,
    sessions,
    participants,
    loading: isLoading,
    error,
    setCourse: setCourseData,
    setSessions,
    setMaxParticipants,
    maxParticipants,
    refetchParticipants,
  } = useCourseDetail(courseId);

  const [activeTab, setActiveTab] = useState<TabKey>('detaljer');

  // ── Form state (lifted from legacy CourseDrawer.EditMode) ──────────────
  const [settingsTitle, setSettingsTitle] = useState('');
  const [settingsDescription, setSettingsDescription] = useState('');
  const [settingsImageUrl, setSettingsImageUrl] = useState<string | null>(null);
  const [settingsImageFile, setSettingsImageFile] = useState<File | null>(null);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);
  const [settingsTime, setSettingsTime] = useState('09:00');
  const [settingsDate, setSettingsDate] = useState<Date | undefined>(undefined);
  const [settingsDuration, setSettingsDuration] = useState<number | null>(60);
  const [settingsAllowsDropIn, setSettingsAllowsDropIn] = useState(false);
  const [settingsDropInPrice, setSettingsDropInPrice] = useState(0);
  const [settingsAcceptsLateSignups, setSettingsAcceptsLateSignups] = useState(true);
  const [settingsPrice, setSettingsPrice] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showCancelPreview, setShowCancelPreview] = useState(false);
  const [cancelAcknowledged, setCancelAcknowledged] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  useEffect(() => {
    if (!courseData) return;
    setSettingsTitle(courseData.title);
    setSettingsDescription(courseData.description || '');
    setSettingsImageUrl(courseData.imageUrl);
    const timeMatch = courseData.timeSchedule.match(/(\d{1,2}:\d{2})/);
    if (timeMatch) setSettingsTime(timeMatch[1]);
    setSettingsDuration(courseData.durationMinutes);
    setSettingsAllowsDropIn(courseData.allowsDropIn);
    setSettingsDropInPrice(courseData.dropInPrice);
    setSettingsAcceptsLateSignups(courseData.acceptsLateSignups);
    setSettingsPrice(courseData.price);
    if (courseData.startDate) setSettingsDate(new Date(courseData.startDate));
  }, [courseData]);

  const isSettingsDirty = useMemo(() => {
    if (!courseData) return false;
    if (settingsTitle !== courseData.title) return true;
    if (settingsDescription !== (courseData.description || '')) return true;
    if (settingsImageUrl !== courseData.imageUrl) return true;
    if (settingsImageFile !== null) return true;
    if (imageToDelete !== null) return true;
    if (maxParticipants !== courseData.capacity) return true;
    if (settingsPrice !== courseData.price) return true;
    if (settingsDropInPrice !== courseData.dropInPrice) return true;
    if (settingsDuration !== courseData.durationMinutes) return true;
    const origDate = courseData.startDate ? new Date(courseData.startDate).toDateString() : '';
    const currDate = settingsDate ? settingsDate.toDateString() : '';
    if (currDate !== origDate) return true;
    const origTimeMatch = courseData.timeSchedule.match(/(\d{1,2}:\d{2})/);
    const origTime = origTimeMatch ? origTimeMatch[1] : '';
    if (settingsTime !== origTime) return true;
    // settingsAllowsDropIn intentionally excluded — drop-in toggle is
    // instant-commit, not part of the batched save flow.
    return false;
  }, [
    courseData, settingsTitle, settingsDescription, settingsImageUrl,
    settingsImageFile, imageToDelete, maxParticipants, settingsDuration,
    settingsDate, settingsTime, settingsPrice,
    settingsDropInPrice,
  ]);

  const refundPreview = useMemo(() => {
    const paidSignups = participants.filter((p) => p.payment_status === 'paid');
    const totalRefund = paidSignups.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
    return { participants: paidSignups, totalAmount: totalRefund, count: paidSignups.length };
  }, [participants]);

  // Sort confirmed rows first, cancelled (including course-cancelled) at the
  // bottom. Within each bucket, preserve the created_at ordering from the DB.
  const sortedParticipants = useMemo(() => {
    const isActive = (p: typeof participants[number]) => p.status === 'confirmed';
    return [...participants].sort((a, b) => {
      const aActive = isActive(a);
      const bActive = isActive(b);
      if (aActive === bActive) return 0;
      return aActive ? -1 : 1;
    });
  }, [participants]);

  const participantKpis = useMemo(() => {
    let confirmed = 0;
    let cancelled = 0;
    let revenue = 0;
    for (const p of participants) {
      if (p.status === 'confirmed') confirmed++;
      else if (p.status === 'cancelled' || p.status === 'course_cancelled') cancelled++;
      if (p.payment_status === 'paid' && p.amount_paid != null) revenue += p.amount_paid;
    }
    return { confirmed, cancelled, revenue };
  }, [participants]);

  const participantEmails = useMemo(
    () => Array.from(new Set(
      participants
        .filter((p) => p.status === 'confirmed')
        .map((p) => (p.participant_email || p.profile?.email || '').trim())
        .filter(Boolean),
    )),
    [participants],
  );

  const handleMessageAllParticipants = () => {
    if (participantEmails.length === 0) return;
    const subject = encodeURIComponent(courseData?.title ? `Melding om ${courseData.title}` : 'Melding fra studioet');
    const bcc = encodeURIComponent(participantEmails.join(','));
    window.location.href = `mailto:?bcc=${bcc}&subject=${subject}`;
  };

  const handleSave = async () => {
    if (!courseId || !courseData) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      let newImageUrl = settingsImageUrl;

      if (imageToDelete && currentSeller?.id) {
        await deleteCourseImage(courseId, imageToDelete, currentSeller.id);
        setImageToDelete(null);
      }
      if (settingsImageFile) {
        const { url, error: uploadError } = await uploadCourseImage(courseId, settingsImageFile);
        if (uploadError) {
          setSaveError(uploadError.message);
          setIsSaving(false);
          return;
        }
        newImageUrl = url;
        setSettingsImageFile(null);
      }

      let timeSchedule: string | undefined;
      if (settingsDate && settingsTime) {
        const dayName = new Intl.DateTimeFormat('nb-NO', { weekday: 'long' }).format(settingsDate);
        timeSchedule = `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}er, ${settingsTime}`;
      }

      const updateData = {
        title: settingsTitle.trim(),
        description: settingsDescription.trim() || null,
        max_participants: maxParticipants,
        price: settingsPrice,
        time_schedule: timeSchedule,
        image_url: newImageUrl,
        duration: settingsDuration,
      };

      const { error: updateError } = await updateCourse(courseId, updateData);
      if (updateError) {
        setSaveError(friendlyError(updateError, 'Kunne ikke lagre endringer. Prøv igjen.'));
        setIsSaving(false);
        return;
      }

      if (settingsAllowsDropIn) {
        const { error: dropInError } = await syncCourseDropInTier(courseId, true, settingsDropInPrice);
        if (dropInError) {
          setSaveError(friendlyError(dropInError, 'Kunne ikke lagre drop-in pris.'));
          setIsSaving(false);
          return;
        }
      }

      if (settingsTime && sessions.length > 0) {
        const oldTime = sessions[0]?.start_time;
        if (oldTime && oldTime !== settingsTime) {
          await Promise.all(sessions.map((s) => updateCourseSession(s.id, { start_time: settingsTime })));
          const updatedSessions = await fetchCourseSessions(courseId);
          if (updatedSessions.data) setSessions(updatedSessions.data);
        }
      }

      setCourseData((prev) =>
        prev
          ? {
              ...prev,
              title: settingsTitle.trim(),
              description: settingsDescription.trim(),
              capacity: maxParticipants,
              price: settingsPrice,
              timeSchedule: timeSchedule || prev.timeSchedule,
              imageUrl: newImageUrl,
              durationMinutes: settingsDuration || prev.durationMinutes,
              allowsDropIn: settingsAllowsDropIn,
              dropInPrice: settingsDropInPrice,
            }
          : null,
      );
      setSettingsImageUrl(newImageUrl);
      toast.success('Endringer lagret');
    } catch {
      setSaveError('Noe gikk galt. Prøv igjen.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEnrollment = async (signupId: string, refund: boolean) => {
    const { error: cancelError } = await teacherCancelSignup(signupId, { refund });
    if (cancelError) {
      toast.error(friendlyError(cancelError, 'Kunne ikke avbestille påmeldingen.'));
      return;
    }
    toast.success(refund ? 'Påmelding avbestilt og refusjon behandlet' : 'Påmelding avbestilt');
    refetchParticipants();
  };

  const handleMarkResolved = async (signupId: string) => {
    const { error: resolveError } = await markPaymentResolved(signupId);
    if (resolveError) {
      toast.error(friendlyError(resolveError, 'Kunne ikke merke som betalt.'));
      return;
    }
    toast.success('Påmelding merket som betalt');
    refetchParticipants();
  };

  // Drop-in toggle is instant-commit (not part of batched save). Optimistic
  // update fires immediately; revert + error toast on failure.
  const handleToggleDropIn = async (next: boolean) => {
    if (!courseId) return;
    const previous = settingsAllowsDropIn;
    setSettingsAllowsDropIn(next);
    setCourseData((prev) => (prev ? { ...prev, allowsDropIn: next } : prev));
    const { error } = await syncCourseDropInTier(courseId, next, settingsDropInPrice);
    if (error) {
      setSettingsAllowsDropIn(previous);
      setCourseData((prev) => (prev ? { ...prev, allowsDropIn: previous } : prev));
      toast.error(friendlyError(error, 'Kunne ikke oppdatere drop-in.'));
      return;
    }
    toast.success(next ? 'Drop-in slått på' : 'Drop-in slått av');
  };

  // Late-join toggle is instant-commit like drop-in. Persists straight to
  // courses.accepts_late_signups; the public RPC reads it at booking time.
  const handleToggleAcceptsLateSignups = async (next: boolean) => {
    if (!courseId) return;
    const previous = settingsAcceptsLateSignups;
    setSettingsAcceptsLateSignups(next);
    setCourseData((prev) => (prev ? { ...prev, acceptsLateSignups: next } : prev));
    const { error } = await updateCourse(courseId, { accepts_late_signups: next });
    if (error) {
      setSettingsAcceptsLateSignups(previous);
      setCourseData((prev) => (prev ? { ...prev, acceptsLateSignups: previous } : prev));
      toast.error(friendlyError(error, 'Kunne ikke oppdatere innstillingen.'));
      return;
    }
    toast.success(next ? 'Påmelding etter oppstart slått på' : 'Påmelding etter oppstart slått av');
  };

  const handleCancelCourse = async () => {
    if (!courseId) return;
    setIsDeleting(true);
    try {
      const { data: result, error: cancelError } = await cancelCourse(courseId, {
        notify_participants: true,
      });
      if (cancelError) {
        setSaveError(friendlyError(cancelError, 'Kunne ikke avlyse kurset.'));
        setShowCancelPreview(false);
        return;
      }
      const message = result
        ? `Kurset er avlyst. ${result.refunds_processed} ${result.refunds_processed === 1 ? 'refusjon' : 'refusjoner'} behandlet, ${result.notifications_sent} ${result.notifications_sent === 1 ? 'deltaker' : 'deltakere'} varslet.`
        : 'Kurset er avlyst.';
      setShowCancelPreview(false);
      toast.success('Kurs avlyst');
      navigate(routes.courses, { state: { message } });
    } catch (err) {
      setSaveError(friendlyError(err, 'Kunne ikke avlyse kurset. Prøv igjen.'));
      setShowCancelPreview(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // Publish flow — mirrors CourseDrawer. The DB trigger
  // enforce_course_publish_requires_dintero is the authoritative gate; this
  // client check just keeps teachers out of a guaranteed-to-fail request.
  const handlePublish = async () => {
    if (!courseId || !courseData) return;
    if (!currentSeller?.dintero_onboarding_complete) {
      setShowPublishDialog(true);
      return;
    }
    setIsPublishing(true);
    const { error: pubError } = await publishCourse(courseId);
    if (pubError) {
      toast.error(friendlyError(pubError, 'Kunne ikke publisere kurset'));
      setIsPublishing(false);
      return;
    }
    setCourseData((prev) => (prev ? { ...prev, status: 'upcoming' } : prev));
    toast.success('Kurset er publisert');
    setIsPublishing(false);
  };

  // Tier 1 — toast+undo. Status flip is reversible, signups unaffected.
  const handleUnpublish = async () => {
    if (!courseId || !courseData) return;
    const previousStatus = courseData.status;
    setCourseData((prev) => (prev ? { ...prev, status: 'draft' } : prev));
    const { error: unpubError } = await unpublishCourse(courseId);
    if (unpubError) {
      setCourseData((prev) => (prev ? { ...prev, status: previousStatus } : prev));
      toast.error(friendlyError(unpubError, 'Kunne ikke avpublisere kurset'));
      return;
    }
    toast.success('Kurset er lagret som utkast', {
      duration: 8000,
      action: {
        label: 'Angre',
        onClick: async () => {
          setCourseData((prev) => (prev ? { ...prev, status: previousStatus } : prev));
          const { error: revertError } = await publishCourse(courseId);
          if (revertError) {
            setCourseData((prev) => (prev ? { ...prev, status: 'draft' } : prev));
            toast.error(friendlyError(revertError, 'Kunne ikke gjenopprette publisering'));
          }
        },
      },
    });
  };

  const handleDiscard = () => {
    if (!courseData) return;
    setSettingsTitle(courseData.title);
    setSettingsDescription(courseData.description || '');
    setSettingsImageUrl(courseData.imageUrl);
    setSettingsImageFile(null);
    setImageToDelete(null);
    setMaxParticipants(courseData.capacity);
    setSettingsDuration(courseData.durationMinutes);
    setSettingsDropInPrice(courseData.dropInPrice);
    // Drop-in is instant-commit, so it's intentionally NOT reset by Forkast —
    // any drop-in change has already been persisted independently.
    if (courseData.startDate) setSettingsDate(new Date(courseData.startDate));
    const timeMatch = courseData.timeSchedule.match(/(\d{1,2}:\d{2})/);
    if (timeMatch) setSettingsTime(timeMatch[1]);
    setSaveError(null);
  };

  if (!courseId) {
    return <CourseNotFound />;
  }

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto bg-background h-full">
        <MobileTeacherHeader title="Kurs" />
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 lg:pt-12 space-y-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  if (error || !courseData) {
    return <CourseNotFound description={error || undefined} />;
  }

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'detaljer', label: 'Detaljer' },
    { key: 'pameldte', label: 'Påmeldte', count: participantKpis.confirmed },
  ];

  const courseUrl =
    currentTeam?.slug && courseData.slug
      ? `${window.location.origin}/${currentTeam.slug}/${courseData.slug}`
      : '';
  const canShare = courseData.status !== 'draft' && courseData.status !== 'cancelled' && courseUrl;

  return (
    <div className="flex-1 overflow-y-auto bg-background h-full">
      <MobileTeacherHeader title={courseData.title} />

      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        transition={pageTransition}
        className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-24 md:pb-12"
      >
        {/* Page header — title + inline status (baseline-aligned). */}
        <header className="pt-6 lg:pt-12 mb-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-baseline gap-3 flex-wrap">
              <h1 className="text-2xl font-medium tracking-tight text-foreground">
                {courseData.title}
              </h1>
              {courseData.status === 'cancelled' ? (
                <span className="inline-flex items-center px-2 h-6 rounded-md text-sm font-medium bg-muted text-foreground-muted line-through shrink-0">
                  Avlyst
                </span>
              ) : (
                <StatusBadge
                  status={courseData.status as 'draft' | 'active' | 'upcoming' | 'completed'}
                  className="shrink-0"
                />
              )}
            </div>
            {courseData.status !== 'cancelled' && (
              <div className="flex items-center gap-2">
                {courseData.status === 'draft' ? (
                  <Button
                    size="sm"
                    onClick={handlePublish}
                    loading={isPublishing}
                    loadingText="Publiserer"
                  >
                    Publiser kurs
                  </Button>
                ) : (
                  canShare && (
                    <ShareCoursePopover
                      courseUrl={courseUrl}
                      courseTitle={courseData.title}
                    />
                  )
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="secondary"
                      size="icon-sm"
                      aria-label="Flere handlinger"
                    >
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {courseData.status !== 'draft' && (
                      <DropdownMenuItem onClick={handleUnpublish}>
                        Gjør til utkast
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-danger"
                      onClick={() => setShowCancelPreview(true)}
                    >
                      Avlys kurs
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </header>

        {/* Underline tabs — canonical Studio pattern (preview.html lines 1617-1621).
            -mb-px on each tab so the 2px active border overlaps the parent's 1px
            border (otherwise the active underline sits stacked below the line).
            no-scrollbar keeps the line clean when tabs overflow on mobile. */}
        <div
          role="tablist"
          aria-label="Kursseksjoner"
          className="border-b border-border flex gap-6 mb-8 overflow-x-auto no-scrollbar"
        >
          {tabs.map((t) => {
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`course-tab-${t.key}`}
                id={`course-tab-trigger-${t.key}`}
                tabIndex={active ? 0 : -1}
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  'inline-flex items-center gap-1.5 py-2 -mb-px text-base border-b-2 bg-transparent transition-colors outline-none focus-visible:text-foreground',
                  active
                    ? 'font-medium text-foreground border-foreground'
                    : 'font-normal text-foreground-muted hover:text-foreground border-transparent',
                )}
              >
                {t.label}
                {typeof t.count === 'number' && t.count > 0 && (
                  <span className="inline-flex items-center px-[7px] py-px bg-muted text-foreground text-sm font-medium rounded-full tabular-nums">
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Detaljer panel — sectioned form using the canonical Studio 3-col
            grid pattern (TeacherProfilePage convention). Section heading on the
            left, fields in a card on the right spanning 2 cols. */}
        <div
          role="tabpanel"
          id="course-tab-detaljer"
          aria-labelledby="course-tab-trigger-detaljer"
          hidden={activeTab !== 'detaljer'}
        >
          {activeTab === 'detaljer' && (
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
              currentEnrolled={courseData.enrolled || 0}
              courseFormat={courseData.format === 'series' ? 'series' : 'single'}
              totalWeeks={courseData.totalWeeks || 0}
              price={settingsPrice}
              onPriceChange={setSettingsPrice}
              allowsDropIn={settingsAllowsDropIn}
              onAllowsDropInChange={handleToggleDropIn}
              dropInPrice={settingsDropInPrice}
              onDropInPriceChange={setSettingsDropInPrice}
              acceptsLateSignups={settingsAcceptsLateSignups}
              onAcceptsLateSignupsChange={handleToggleAcceptsLateSignups}
              isDirty={isSettingsDirty}
              saveError={saveError}
              onSave={handleSave}
              onCancel={handleDiscard}
            />
          )}
        </div>

        {/* Påmeldte panel */}
        <div
          role="tabpanel"
          id="course-tab-pameldte"
          aria-labelledby="course-tab-trigger-pameldte"
          hidden={activeTab !== 'pameldte'}
        >
          {activeTab === 'pameldte' && (
            <section className="space-y-4">
              {/* KPI strip — full-width, three small cards. Label on top
                  (text-sm muted), value below (text-2xl tabular-nums). No
                  delta chip; this isn't a hero metric row. */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-md border border-border bg-surface px-4 py-3">
                  <p className="text-sm font-medium text-foreground-muted">Påmeldte</p>
                  <p className="mt-1 text-2xl font-medium text-foreground tabular-nums leading-none">
                    {participantKpis.confirmed}
                    {courseData.capacity > 0 && (
                      <span> / {courseData.capacity}</span>
                    )}
                  </p>
                </div>
                <div className="rounded-md border border-border bg-surface px-4 py-3">
                  <p className="text-sm font-medium text-foreground-muted">Avlyste</p>
                  <p className="mt-1 text-2xl font-medium text-foreground tabular-nums leading-none">
                    {participantKpis.cancelled}
                  </p>
                </div>
                <div className="rounded-md border border-border bg-surface px-4 py-3">
                  <p className="text-sm font-medium text-foreground-muted">Innbetalt</p>
                  <p className="mt-1 text-2xl font-medium text-foreground tabular-nums leading-none">
                    {formatKroner(participantKpis.revenue)}
                  </p>
                </div>
              </div>

              {/* List frame — Stripe-style toolbar row inside the frame's
                  top-right (summary text left, primary action right), then
                  divided rows below. Frame always renders so the action is
                  reachable even before the first signup. */}
              <div className="rounded-lg border border-border overflow-hidden">
                {(() => {
                  // Course is full when capacity is set and confirmed signups
                  // reach it. Capacity 0/null = unlimited, button never disables.
                  const isFull =
                    courseData.capacity > 0 && participantKpis.confirmed >= courseData.capacity;
                  return (
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
                      <p className="text-base text-foreground-muted">
                        {participantKpis.confirmed === 0
                          ? 'Ingen deltakere ennå'
                          : `${participantKpis.confirmed} ${participantKpis.confirmed === 1 ? 'deltaker' : 'deltakere'}`}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleMessageAllParticipants}
                          disabled={participantEmails.length === 0}
                        >
                          <Mail data-icon="inline-start" />
                          Send melding
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setIsAddParticipantOpen(true)}
                          disabled={isFull}
                          title={isFull ? 'Kurset er fullt. Øk kapasiteten i fanen Detaljer for å legge til flere.' : undefined}
                        >
                          Legg til deltaker
                        </Button>
                      </div>
                    </div>
                  );
                })()}
                {sortedParticipants.length === 0 ? (
                  <div className="px-4 py-12 text-center text-base text-foreground-muted">
                    Deltakere som melder seg på, dukker opp her.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {sortedParticipants.map((p) => {
                    const name = p.participant_name || p.profile?.name || 'Ukjent';
                    const email = p.participant_email || p.profile?.email || '';
                    const status = p.status as SignupStatus;
                    const paymentStatus = p.payment_status as PaymentStatus;
                    const isCancelled = status === 'cancelled' || status === 'course_cancelled';
                    const ticketTag = ticketTagFor(p);
                    const isHappyPath = paymentStatus === 'paid' && status === 'confirmed';
                    // Expected price: actual amount paid when known, else the
                    // ticket type's list price (pending / failed haven't moved
                    // money yet). Mirrors Stripe / Polar — amount always present.
                    const expectedPrice =
                      p.amount_paid != null ? p.amount_paid : p.ticket_type?.price ?? null;
                    const actionable: ActionableParticipant = {
                      id: p.id,
                      participantName: name,
                      participantEmail: email,
                      className: courseData.title,
                      paymentStatus,
                      amountPaid: p.amount_paid,
                      status,
                      exceptionType: exceptionFor(paymentStatus, status),
                      // Only present for signups that went through the
                      // integrated payment flow. Manual adds have null here
                      // — refund actions are gated on this.
                      dinteroTransactionId: p.dintero_transaction_id,
                    };
                    const isNoteOpen = expandedNoteId === p.id;
                    return (
                      <div key={p.id} className="px-4">
                        <div
                          className={cn(
                            'grid items-center gap-4 py-3',
                            'grid-cols-[32px_minmax(0,1fr)_32px] md:grid-cols-[32px_minmax(0,1fr)_auto_32px]',
                            isCancelled && 'opacity-60',
                          )}
                        >
                          <UserAvatar name={name} email={email} size="sm" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p
                                className={cn(
                                  'text-base font-medium truncate',
                                  isCancelled ? 'text-foreground-muted' : 'text-foreground',
                                )}
                              >
                                {name}
                              </p>
                              {/* Ticket tag — a property of the person, sits
                                  inline with the name. Keeps the right strip
                                  reserved for payment state + price only. */}
                              {ticketTag && (
                                <Badge variant="outline" shape="pill" size="sm" className="shrink-0">
                                  {ticketTag}
                                </Badge>
                              )}
                              {p.note && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedNoteId(isNoteOpen ? null : p.id)}
                                  aria-expanded={isNoteOpen}
                                  className={cn(
                                    badgeVariants({ variant: 'neutral', shape: 'rect', size: 'sm' }),
                                    'shrink-0 cursor-pointer text-foreground transition-colors outline-none hover:bg-foreground/10 focus-visible:ring-2 focus-visible:ring-foreground/15',
                                  )}
                                >
                                  <FileText className="size-3" strokeWidth={2} aria-hidden="true" />
                                  {isNoteOpen ? 'Skjul notat' : 'Les notat'}
                                </button>
                              )}
                            </div>
                            <p className="text-sm text-foreground-muted truncate mt-0.5">{email}</p>
                          </div>
                          {/* Right info strip — reserved for payment state +
                              price. Ticket tag lives with the identity column
                              so the two pill types have distinct lanes. */}
                          <div className="hidden md:flex items-center justify-end gap-4">
                            {!isHappyPath && (
                              <SignupStatusBadge status={status} paymentStatus={paymentStatus} />
                            )}
                            {expectedPrice != null && (
                              <span
                                className={cn(
                                  'text-base font-medium tabular-nums leading-none w-[72px] text-right',
                                  paymentStatus === 'refunded'
                                    ? 'text-foreground-muted line-through decoration-foreground-muted/60'
                                    : 'text-foreground',
                                )}
                              >
                                {expectedPrice > 0 ? formatKroner(expectedPrice) : 'Gratis'}
                              </span>
                            )}
                          </div>
                          <div className="flex justify-end">
                            <ParticipantActionMenu
                              signup={actionable}
                              handlers={{
                                onCancelEnrollment: handleCancelEnrollment,
                                onMarkResolved: handleMarkResolved,
                              }}
                            />
                          </div>
                        </div>
                        {/* Inline note — aligns with the identity column
                            (32px avatar + 16px gap = 48px indent). */}
                        {isNoteOpen && p.note && (
                          <div className="pb-3 pl-12">
                            <div className="rounded-md bg-muted px-3 py-2">
                              <p className="text-base text-foreground whitespace-pre-wrap leading-relaxed">
                                {p.note}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                    })}
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </motion.div>

      {currentSeller?.id && (
        <AddParticipantDrawer
          open={isAddParticipantOpen}
          onOpenChange={setIsAddParticipantOpen}
          courseId={courseId}
          organizationId={currentSeller.id}
          onSuccess={refetchParticipants}
        />
      )}

      <PublishCourseDialog
        open={showPublishDialog}
        onOpenChange={setShowPublishDialog}
        courseTitle={courseData.title}
      />

      <ConfirmDialog
        open={showCancelPreview}
        onOpenChange={(open) => {
          setShowCancelPreview(open);
          if (!open) setCancelAcknowledged(false);
        }}
        ariaLabel="Avlyse kurset"
        headline="Avlys kurset?"
        scope={
          refundPreview.count > 0 ? (
            <>
              <ConfirmScopeItem
                name={courseData.title}
                meta={`${refundPreview.count} deltaker${refundPreview.count !== 1 ? 'e' : ''} refunderes`}
                trailing={formatKroner(refundPreview.totalAmount)}
              />
              <div className="max-h-[180px] overflow-y-auto border-t border-border/60">
                {refundPreview.participants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between border-t border-border/60 px-4 py-2.5 first:border-t-0 text-base text-foreground tabular-nums sm:px-5"
                  >
                    <span className="truncate">{p.participant_name || p.participant_email}</span>
                    <span className="shrink-0">{formatKroner(p.amount_paid)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <ConfirmScopeItem name={courseData.title} meta="Ingen betalte påmeldinger" />
          )
        }
        actionLabel="Avlys kurs"
        disabled={refundPreview.count > 0 && !cancelAcknowledged}
        onConfirm={(e) => {
          e.preventDefault();
          handleCancelCourse();
        }}
        loading={isDeleting}
        loadingText={
          refundPreview.count > 0
            ? `Behandler ${refundPreview.count} refusjon${refundPreview.count !== 1 ? 'er' : ''}`
            : 'Avlyser'
        }
      >
        {refundPreview.count > 0 ? (
          <label className="mt-1 flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-muted/40 p-4 text-base text-foreground sm:p-5">
            <Checkbox
              checked={cancelAcknowledged}
              onCheckedChange={(v) => setCancelAcknowledged(v === true)}
              className="mt-0.5"
            />
            <span className="leading-snug">
              Jeg forstår at {refundPreview.count} deltaker
              {refundPreview.count !== 1 ? 'e' : ''} får e-post og at{' '}
              {formatKroner(refundPreview.totalAmount)} refunderes.
            </span>
          </label>
        ) : null}
      </ConfirmDialog>
    </div>
  );
};

export default CoursePage;

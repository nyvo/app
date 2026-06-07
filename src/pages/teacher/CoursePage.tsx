import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronRight, FileText, MoreHorizontal, Send } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { UserAvatar } from '@/components/ui/user-avatar';
import { StatusBadge } from '@/components/ui/status-badge';
import { SignupStatusBadge } from '@/components/ui/signup-status-badge';
import { ShareCoursePopover } from '@/components/ui/share-course-popover';
import { CourseSettingsTab } from '@/components/teacher/CourseSettingsTab';
import { CourseOverviewTab } from '@/components/teacher/CourseOverviewTab';
import { SessionsModal } from '@/components/teacher/SessionsModal';
import { PageTabs, PageTab } from '@/components/ui/page-tabs';
import { SendCourseMessageDrawer } from '@/components/teacher/SendCourseMessageDrawer';
import { ParticipantDetailDrawer } from '@/components/teacher/ParticipantDetailDrawer';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { PageShell } from '@/components/teacher/PageShell';
import { PageState } from '@/components/page-state/page-state';
import { AddParticipantDrawer } from '@/components/teacher/AddParticipantDrawer';
import { PublishCourseDialog } from '@/components/teacher/PublishCourseDialog';
import { useCourseDetail } from '@/hooks/use-course-detail';
import {
  updateCourse,
  cancelCourse,
  fetchCourseSessions,
  updateCourseSession,
  syncCourseDropInTier,
  publishCourse,
  unpublishCourse,
  deleteCourse,
} from '@/services/courses';
import {
  teacherCancelSignup,
  markPaymentResolved,
} from '@/services/signups';
import { uploadCourseImage, deleteCourseImage } from '@/services/storage';
import { useAuth } from '@/contexts/AuthContext';
import { friendlyError } from '@/lib/error-messages';
import { routes } from '@/lib/routes';
import { cn, formatKroner } from '@/lib/utils';
import type {
  PaymentStatus,
  SignupStatus,
} from '@/types/database';

type TabKey = 'oversikt' | 'pameldte' | 'rediger';

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
 * the course into its three concerns: Oversikt (at-a-glance + ops), Rediger (editable form),
 * Priser (ticket tiers), and Påmeldte (the participants list). Page shell
 * follows the dashboard convention (max-w-6xl centered, lg:px-8 padding).
 */
const CoursePage = () => {
  const navigate = useNavigate();
  const { id: courseId } = useParams<{ id: string }>();
  const { currentSeller, currentTeam } = useAuth();

  const {
    course: courseData,
    sessions,
    participants,
    participantsLoading,
    loading: isLoading,
    error,
    setCourse: setCourseData,
    setSessions,
    setMaxParticipants,
    maxParticipants,
    refetchParticipants,
    refetch,
  } = useCourseDetail(courseId);

  const [activeTab, setActiveTab] = useState<TabKey>('oversikt');
  const [sessionsModalOpen, setSessionsModalOpen] = useState(false);
  const [messageDrawerOpen, setMessageDrawerOpen] = useState(false);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);

  // ── Form state (lifted from legacy CourseDrawer.EditMode) ──────────────
  const [settingsTitle, setSettingsTitle] = useState('');
  const [settingsDescription, setSettingsDescription] = useState('');
  const [settingsLocation, setSettingsLocation] = useState('');
  const [settingsLocationCoords, setSettingsLocationCoords] = useState<
    { lat: number | null; lon: number | null; placeId: string | null; address: string | null } | null
  >(null);
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);

  useEffect(() => {
    if (!courseData) return;
    setSettingsTitle(courseData.title);
    setSettingsDescription(courseData.description || '');
    setSettingsLocation(courseData.location || '');
    setSettingsLocationCoords(
      courseData.locationLat != null
        ? { lat: courseData.locationLat, lon: courseData.locationLon, placeId: courseData.locationPlaceId, address: courseData.locationAddress }
        : null,
    );
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
    if (settingsLocation !== (courseData.location || '')) return true;
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
    courseData, settingsTitle, settingsDescription, settingsLocation,
    settingsImageUrl, settingsImageFile, imageToDelete, maxParticipants,
    settingsDuration, settingsDate, settingsTime, settingsPrice,
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
    setMessageDrawerOpen(true);
  };

  // Publish readiness — mirrors required PublishChecklist items on the
  // Oversikt tab. Description and location are client-side UX gates; Dintero is also
  // enforced by the DB trigger (enforce_course_publish_requires_dintero).
  const publishReadiness = useMemo(() => {
    const hasImage = !!courseData?.imageUrl;
    const hasDescription = !!courseData?.description;
    const hasLocation = !!courseData?.location;
    const hasDintero = !!currentSeller?.dintero_onboarding_complete;
    return {
      hasImage,
      hasDescription,
      hasLocation,
      hasDintero,
      ready: hasDescription && hasLocation && hasDintero,
    };
  }, [courseData?.imageUrl, courseData?.description, courseData?.location, currentSeller?.dintero_onboarding_complete]);

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
        location: settingsLocation.trim() || null,
        location_address: settingsLocationCoords?.address ?? null,
        location_lat: settingsLocationCoords?.lat ?? null,
        location_lon: settingsLocationCoords?.lon ?? null,
        location_place_id: settingsLocationCoords?.placeId ?? null,
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
              location: settingsLocation.trim() || null,
              locationAddress: settingsLocationCoords?.address ?? null,
              locationLat: settingsLocationCoords?.lat ?? null,
              locationLon: settingsLocationCoords?.lon ?? null,
              locationPlaceId: settingsLocationCoords?.placeId ?? null,
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
    const previousAllows = settingsAllowsDropIn;
    const previousPrice = courseData?.dropInPrice ?? 0;
    // Sync allowsDropIn AND dropInPrice into courseData together. A bare
    // allowsDropIn update would trigger the courseData → settings useEffect
    // and reset settingsDropInPrice back to the (stale) courseData value.
    setSettingsAllowsDropIn(next);
    setCourseData((prev) =>
      prev ? { ...prev, allowsDropIn: next, dropInPrice: settingsDropInPrice } : prev,
    );
    const { error } = await syncCourseDropInTier(courseId, next, settingsDropInPrice);
    if (error) {
      setSettingsAllowsDropIn(previousAllows);
      setCourseData((prev) =>
        prev ? { ...prev, allowsDropIn: previousAllows, dropInPrice: previousPrice } : prev,
      );
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

  const handleDeleteCourse = async () => {
    if (!courseId) return;
    setIsDeletingCourse(true);
    const { error: deleteError } = await deleteCourse(courseId);
    setIsDeletingCourse(false);
    if (deleteError) {
      toast.error(friendlyError(deleteError, 'Kunne ikke slette kurset.'));
      return;
    }
    setShowDeleteConfirm(false);
    toast.success('Kurset er slettet');
    navigate(routes.courses);
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
    setSettingsLocation(courseData.location || '');
    setSettingsLocationCoords(
      courseData.locationLat != null
        ? { lat: courseData.locationLat, lon: courseData.locationLon, placeId: courseData.locationPlaceId, address: courseData.locationAddress }
        : null,
    );
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
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 pt-6 lg:pt-12 space-y-6">
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
    { key: 'oversikt', label: 'Oversikt' },
    { key: 'pameldte', label: 'Påmeldte', count: participantKpis.confirmed },
    { key: 'rediger', label: 'Rediger' },
  ];

  // Whether the course has ANY signup rows (confirmed OR cancelled). Cancelled
  // signups still carry payment records under retention, so a finished course
  // is only safe to hard-delete when there are none at all. Treat the
  // not-yet-loaded state as "has records" so we never offer delete prematurely.
  const hasSignupRecords = participantsLoading || participants.length > 0;

  const courseUrl =
    currentTeam?.slug && courseData.slug
      ? `${window.location.origin}/${currentTeam.slug}/${courseData.slug}`
      : '';
  // Share + unpublish only make sense while a course is published and live.
  // A finished (completed) or cancelled course is archival: no share, no
  // "Gjør til utkast". draft has its own Publish CTA below.
  const isLive = courseData.status === 'upcoming' || courseData.status === 'active';
  const canShare = isLive && !!courseUrl;

  return (
    <div className="flex-1 overflow-y-auto bg-background h-full">
      <MobileTeacherHeader title={courseData.title} />

      <PageShell
        title={courseData.title}
        badge={
          courseData.status === 'cancelled' ? (
            <span className="inline-flex items-center px-2 h-6 rounded-md text-sm font-medium bg-muted text-foreground-muted line-through">
              Avlyst
            </span>
          ) : (
            <StatusBadge status={courseData.status} />
          )
        }
        action={
          courseData.status === 'draft' ? (
            <Button
              onClick={handlePublish}
              loading={isPublishing}
              loadingText="Publiserer"
              disabled={!publishReadiness.ready}
              title={
                publishReadiness.ready
                  ? undefined
                  : 'Fyll ut sjekklisten først'
              }
            >
              <Send data-icon="inline-start" />
              Publiser kurs
            </Button>
          ) : canShare ? (
            <div className="flex items-center gap-2">
              <ShareCoursePopover
                courseUrl={courseUrl}
                courseTitle={courseData.title}
              />
              {/* State-change actions (unpublish) live in the kebab —
                  destructive actions stay in the Rediger tab's Faresone. Only
                  reachable for live courses (canShare gates on upcoming/active),
                  so a finished course can't be flipped back to a draft. */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="soft"
                    size="icon"
                    aria-label="Mer"
                    title="Mer"
                  >
                    <MoreHorizontal className="size-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onSelect={handleUnpublish}>
                    Gjør til utkast
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : null
        }
        tabs={
          <PageTabs ariaLabel="Kursseksjoner">
            {tabs.map((t) => (
              <PageTab
                key={t.key}
                active={activeTab === t.key}
                onClick={() => setActiveTab(t.key)}
                count={t.count}
                id={`course-tab-trigger-${t.key}`}
                ariaControls={`course-tab-${t.key}`}
              >
                {t.label}
              </PageTab>
            ))}
          </PageTabs>
        }
      >

        {/* Oversikt panel — at-a-glance state + ops surfaces (publish blocker,
            kursplan section, drop-in/sen-påmelding toggles). See
            CourseOverviewTab for the per-state rendering. */}
        <div
          role="tabpanel"
          id="course-tab-oversikt"
          aria-labelledby="course-tab-trigger-oversikt"
          hidden={activeTab !== 'oversikt'}
        >
          {activeTab === 'oversikt' && (
            <CourseOverviewTab
              course={courseData}
              enrolledCount={participantKpis.confirmed}
              revenue={participantKpis.revenue}
              dinteroOnboardingStatus={currentSeller?.dintero_onboarding_status ?? null}
              dinteroOnboardingComplete={currentSeller?.dintero_onboarding_complete ?? false}
              allowsDropIn={settingsAllowsDropIn}
              onAllowsDropInChange={handleToggleDropIn}
              dropInPrice={settingsDropInPrice}
              onDropInPriceChange={setSettingsDropInPrice}
              acceptsLateSignups={settingsAcceptsLateSignups}
              onAcceptsLateSignupsChange={handleToggleAcceptsLateSignups}
              onOpenKursplan={() => setSessionsModalOpen(true)}
              onSetupDinteroClick={() => navigate(routes.settingsPayouts)}
              onJumpToField={(field) => {
                if (field === 'dintero') {
                  navigate(routes.settingsPayouts);
                  return;
                }
                setActiveTab('rediger');
                // Scroll after the tab actually mounts. Section ids live on
                // CourseSettingsTab (Phase 5: course-edit-{image,description,
                // location}).
                requestAnimationFrame(() => {
                  const el = document.getElementById(`course-edit-${field}`);
                  if (!el) return;
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
              }}
              sessionCount={sessions.length}
            />
          )}
        </div>

        {/* Rediger panel — sectioned form using the canonical Studio 3-col
            grid pattern (TeacherProfilePage convention). Section heading on the
            left, fields in a card on the right spanning 2 cols. */}
        <div
          role="tabpanel"
          id="course-tab-rediger"
          aria-labelledby="course-tab-trigger-rediger"
          hidden={activeTab !== 'rediger'}
        >
          {activeTab === 'rediger' && (
            <CourseSettingsTab
              settingsTitle={settingsTitle}
              onTitleChange={setSettingsTitle}
              settingsDescription={settingsDescription}
              onDescriptionChange={setSettingsDescription}
              settingsLocation={settingsLocation}
              onLocationChange={setSettingsLocation}
              onLocationCoordsChange={setSettingsLocationCoords}
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
              isDirty={isSettingsDirty}
              saveError={saveError}
              onSave={handleSave}
              onCancel={handleDiscard}
              courseStatus={courseData.status}
              hasSignupRecords={hasSignupRecords}
              onRequestCancel={() => setShowCancelPreview(true)}
              onRequestDelete={() => setShowDeleteConfirm(true)}
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
            <section>
              {/* Minimal table + drawer pattern. Rows show only identity +
                  flags (note icon, status badge). Click a row to open the
                  participant drawer with full details + actions. */}
              {(() => {
                const isFull =
                  courseData.capacity > 0 && participantKpis.confirmed >= courseData.capacity;

                // Filter chips — derive counts from participants. 'attention'
                // groups everything that needs a teacher action (failed/pending
                // payments, waitlist). 'cancelled' is its own bucket.
                const visible = sortedParticipants;

                const PARTICIPANT_COLS =
                  'grid grid-cols-[minmax(0,1fr)_24px] items-center gap-4 ' +
                  'md:grid-cols-[minmax(0,1fr)_80px_160px_20px] md:gap-8';

                return (
                  <>
                    {/* Section toolbar — count on the left, actions on the
                        right. Borderless row sitting directly above the table;
                        the buttons carry their own weight, so the summary reads
                        as a heading rather than a boxed surface. */}
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                      <span className="text-lg font-medium text-foreground tabular-nums mr-auto">
                        {courseData.capacity > 0
                          ? `${participantKpis.confirmed} av ${courseData.capacity} plasser fylt`
                          : `${participantKpis.confirmed} påmeldt`}
                      </span>
                      <Button
                        variant="secondary"
                        onClick={handleMessageAllParticipants}
                        disabled={participantEmails.length === 0}
                      >
                        Send melding
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setIsAddParticipantOpen(true)}
                        disabled={isFull}
                        title={isFull ? 'Kurset er fullt. Øk antall plasser i fanen Rediger for å legge til flere.' : undefined}
                      >
                        Legg til deltaker
                      </Button>
                    </div>

                    <div className="rounded-lg border border-border overflow-hidden">
                      {visible.length === 0 ? (
                      <EmptyState
                        title={
                          sortedParticipants.length === 0
                            ? 'Ingen påmeldte ennå'
                            : 'Ingen treff'
                        }
                        description={
                          sortedParticipants.length === 0
                            ? 'Deltakere som melder seg på, dukker opp her.'
                            : 'Prøv et annet filter.'
                        }
                        className="py-12"
                      />
                    ) : (
                      <div>
                        {/* Column header — anchored at the leading edge so the
                            "Navn" label sits above the avatar+name unit. */}
                        <div className={cn(PARTICIPANT_COLS, 'hidden md:grid px-4 py-3 border-b border-border bg-surface text-sm text-foreground-muted')}>
                          <span>Navn</span>
                          <span>Notat</span>
                          <span>Status</span>
                          <span aria-hidden />
                        </div>

                        <div className="divide-y divide-border">
                          {visible.map((p) => {
                            const name = p.participant_name || p.profile?.name || 'Ukjent';
                            const email = p.participant_email || p.profile?.email || '';
                            const status = p.status as SignupStatus;
                            const paymentStatus = p.payment_status as PaymentStatus;
                            const isCancelled = status === 'cancelled' || status === 'course_cancelled';
                            const isHappyPath = paymentStatus === 'paid' && status === 'confirmed';
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => setSelectedParticipantId(p.id)}
                                className={cn(
                                  PARTICIPANT_COLS,
                                  'w-full text-left px-4 py-3 transition-colors cursor-pointer',
                                  'hover:bg-muted focus-visible:bg-muted outline-none',
                                  isCancelled && 'opacity-60',
                                )}
                              >
                                {/* Identity — avatar + name + email as one unit */}
                                <div className="flex items-center gap-3 min-w-0">
                                  <UserAvatar name={name} email={email} size="sm" />
                                  <div className="min-w-0">
                                    <p
                                      className={cn(
                                        'text-base font-medium truncate',
                                        isCancelled ? 'text-foreground-muted' : 'text-foreground',
                                      )}
                                    >
                                      {name}
                                    </p>
                                    <p className="text-sm text-foreground-muted truncate mt-0.5">{email}</p>
                                  </div>
                                </div>
                                {/* Notat — icon only when a note exists, aligned to start to sit under the header. */}
                                <div className="hidden md:flex items-center justify-start text-foreground">
                                  {p.note && <FileText className="size-4" aria-label="Har notat" />}
                                </div>
                                {/* Status — empty when healthy, badge otherwise */}
                                <div className="hidden md:flex min-w-0">
                                  {!isHappyPath && (
                                    <SignupStatusBadge status={status} paymentStatus={paymentStatus} />
                                  )}
                                </div>
                                {/* Chevron — indicates the row opens a drawer */}
                                <ChevronRight
                                  className="size-4 text-foreground-muted shrink-0"
                                  aria-hidden="true"
                                />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    </div>
                  </>
                );
              })()}
            </section>
          )}
        </div>
      </PageShell>

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

      <SessionsModal
        open={sessionsModalOpen}
        onOpenChange={setSessionsModalOpen}
        sessions={sessions}
        defaultDurationMinutes={courseData.durationMinutes}
        onSessionUpdated={refetch}
      />

      {courseId && (
        <SendCourseMessageDrawer
          open={messageDrawerOpen}
          onOpenChange={setMessageDrawerOpen}
          courseId={courseId}
          courseTitle={courseData.title}
          recipientCount={participantEmails.length}
        />
      )}

      <ParticipantDetailDrawer
        open={selectedParticipantId !== null}
        onOpenChange={(open) => !open && setSelectedParticipantId(null)}
        signup={participants.find((p) => p.id === selectedParticipantId) ?? null}
        courseTitle={courseData.title}
        onCancelEnrollment={handleCancelEnrollment}
        onMarkResolved={handleMarkResolved}
      />

      <ConfirmDialog
        open={showCancelPreview}
        onOpenChange={setShowCancelPreview}
        ariaLabel="Avlyse kurset"
        title="Avlys kurs"
        body={
          refundPreview.count > 0 ? (
            <>
              <strong>{courseData.title}</strong> avlyses — {refundPreview.count} deltaker
              {refundPreview.count !== 1 ? 'e' : ''} refunderes{' '}
              <strong>{formatKroner(refundPreview.totalAmount)}</strong> og varsles.
            </>
          ) : (
            <><strong>{courseData.title}</strong> avlyses uten refusjoner.</>
          )
        }
        scopeList={
          refundPreview.count > 0
            ? refundPreview.participants.map((p) => ({
                id: p.id,
                name: p.participant_name || p.participant_email,
                meta: p.participant_email,
                trailing: formatKroner(p.amount_paid),
              }))
            : undefined
        }
        actionLabel="Avlys kurs"
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
      />

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        ariaLabel="Slette kurset"
        title="Slett kurs"
        body={<><strong>{courseData.title}</strong> og all tilhørende data slettes permanent.</>}
        actionLabel="Slett kurs"
        loading={isDeletingCourse}
        loadingText="Sletter"
        onConfirm={handleDeleteCourse}
      />
    </div>
  );
};

export default CoursePage;

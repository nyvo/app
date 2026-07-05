import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronRight, FileText, MoreHorizontal } from '@/lib/icons';
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
import { UnsavedChangesDialog, useUnsavedChanges } from '@/components/ui/unsaved-changes';
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
  rescheduleCourseSession,
  createCourseSession,
  deleteCourseSession,
  syncCourseDropInTier,
  publishCourse,
  unpublishCourse,
  deleteCourse,
} from '@/services/courses';
import { type SessionDay, timeToMin } from '@/components/teacher/SessionDaysEditor';
import { teacherCancelSignup } from '@/services/signups';
import { uploadCourseImage, deleteCourseImage } from '@/services/storage';
import { useAuth } from '@/contexts/AuthContext';
import { friendlyError } from '@/lib/error-messages';
import { runWithRevert } from '@/lib/undo';
import { publishNeedsPaymentSetup } from '@/lib/payments';
import { routes } from '@/lib/routes';
import { cn, formatKroner } from '@/lib/utils';
import type {
  CourseSession,
  PaymentStatus,
  SignupStatus,
} from '@/types/database';

type TabKey = 'oversikt' | 'pameldte' | 'rediger';

/** Parse a YYYY-MM-DD string into a local Date without TZ shift. */
function parseLocalDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Format a local Date to YYYY-MM-DD without TZ shift. */
function formatLocalYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Build the per-day editor rows from session rows (single format). */
function buildSessionDays(sessions: CourseSession[]): SessionDay[] {
  return [...sessions]
    .sort((a, b) => a.session_date.localeCompare(b.session_date))
    .map((s) => ({
      id: s.id,
      date: parseLocalDate(s.session_date),
      startTime: s.start_time.slice(0, 5),
      endTime: s.end_time ? s.end_time.slice(0, 5) : '',
    }));
}

/** Minutes since midnight → HH:MM. */
function minToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Capitalized Norwegian weekday name for a date ("Mandag"). */
function weekdayLabel(date: Date): string {
  const name = new Intl.DateTimeFormat('nb-NO', { weekday: 'long' }).format(date);
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Course not-found shell — wraps the canonical NotFoundState in the
 * teacher-layout scroll container + mobile header so chrome stays consistent
 * with the rest of the dashboard.
 */
function CourseNotFound({ description }: { description?: string }) {
  return (
    <div className="flex-1 overflow-y-auto bg-canvas h-full">
      <MobileTeacherHeader />
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
  const { currentSeller } = useAuth();

  const {
    course: courseData,
    sessions,
    participants,
    participantsLoading,
    participantsError,
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
  // When set, the sessions modal opens straight into reschedule for this
  // session (the Timeplan pencil); null opens the full list ("Se alle timer").
  const [sessionEditId, setSessionEditId] = useState<string | null>(null);
  const [messageDrawerOpen, setMessageDrawerOpen] = useState(false);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);

  // ── Form state (lifted from legacy CourseDrawer.EditMode) ──────────────
  const [settingsTitle, setSettingsTitle] = useState('');
  const [settingsDescription, setSettingsDescription] = useState('');
  const [settingsLocation, setSettingsLocation] = useState('');
  const [settingsLocationAddress, setSettingsLocationAddress] = useState('');
  const [settingsLocationCoords, setSettingsLocationCoords] = useState<
    { lat: number | null; lon: number | null; placeId: string | null } | null
  >(null);
  const [settingsImageUrl, setSettingsImageUrl] = useState<string | null>(null);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [settingsTime, setSettingsTime] = useState('09:00');
  const [settingsDate, setSettingsDate] = useState<Date | undefined>(undefined);
  const [settingsDuration, setSettingsDuration] = useState<number | null>(60);
  const [settingsAllowsDropIn, setSettingsAllowsDropIn] = useState(false);
  const [settingsDropInPrice, setSettingsDropInPrice] = useState(0);
  // Per-day session state for single-format courses. Populated from loaded
  // sessions; each day carries the real session id so saves can target the
  // right DB row. An id prefixed with 'new-' means the row doesn't exist yet.
  const [sessionDays, setSessionDays] = useState<SessionDay[]>([]);
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
    setSettingsLocationAddress(courseData.locationAddress || '');
    setSettingsLocationCoords(
      courseData.locationLat != null
        ? { lat: courseData.locationLat, lon: courseData.locationLon, placeId: courseData.locationPlaceId }
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

  // Populate per-day session editor from loaded sessions (single format only).
  // Re-runs whenever sessions are (re)fetched so discard/refetch stays in sync.
  // handleSave raises the skip flag when it re-baselines `sessions` after a
  // partial failure — rebuilding here would wipe the user's remaining unsaved
  // day edits, which must survive so they can retry the save.
  const skipNextDaysSyncRef = useRef(false);
  useEffect(() => {
    if (!courseData || courseData.format !== 'single') return;
    if (sessions.length === 0) return;
    if (skipNextDaysSyncRef.current) {
      skipNextDaysSyncRef.current = false;
      return;
    }
    setSessionDays(buildSessionDays(sessions));
  }, [sessions, courseData?.format]);

  const isSettingsDirty = useMemo(() => {
    if (!courseData) return false;
    if (settingsTitle !== courseData.title) return true;
    if (settingsDescription !== (courseData.description || '')) return true;
    if (settingsLocation !== (courseData.location || '')) return true;
    if (settingsLocationAddress !== (courseData.locationAddress || '')) return true;
    if (maxParticipants !== courseData.capacity) return true;
    if (settingsPrice !== courseData.price) return true;
    if (settingsDropInPrice !== courseData.dropInPrice) return true;
    if (settingsDuration !== courseData.durationMinutes) return true;

    if (courseData.format === 'single') {
      // Dirty when session count changed or any day differs from loaded sessions
      const sorted = [...sessions].sort((a, b) => a.session_date.localeCompare(b.session_date));
      if (sessionDays.length !== sorted.length) return true;
      for (let i = 0; i < sessionDays.length; i++) {
        const day = sessionDays[i];
        const orig = sorted[i];
        if (!orig) return true;
        const dayYmd = day.date ? formatLocalYMD(day.date) : '';
        if (dayYmd !== orig.session_date) return true;
        if (day.startTime !== orig.start_time.slice(0, 5)) return true;
        const origEnd = orig.end_time ? orig.end_time.slice(0, 5) : '';
        if (day.endTime !== origEnd) return true;
      }
    } else {
      const origDate = courseData.startDate ? new Date(courseData.startDate).toDateString() : '';
      const currDate = settingsDate ? settingsDate.toDateString() : '';
      if (currDate !== origDate) return true;
      const origTimeMatch = courseData.timeSchedule.match(/(\d{1,2}:\d{2})/);
      const origTime = origTimeMatch ? origTimeMatch[1] : '';
      if (settingsTime !== origTime) return true;
    }
    // settingsAllowsDropIn intentionally excluded — drop-in toggle is
    // instant-commit, not part of the batched save flow.
    return false;
  }, [
    courseData, settingsTitle, settingsDescription, settingsLocation, settingsLocationAddress,
    maxParticipants, settingsDuration, settingsDate, settingsTime,
    settingsPrice, settingsDropInPrice, sessionDays, sessions,
  ]);

  const { blocker, bypass } = useUnsavedChanges(isSettingsDirty);

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

  const handleSave = async () => {
    if (!courseId || !courseData) return;
    setIsSaving(true);
    setSaveError(null);
    // Session baseline tracked through the single-format save loop below —
    // hoisted out of the try so the catch can re-baseline after a thrown
    // (network) failure too, not just a returned error.
    let committedSessions = sessions;
    try {
      // Rebuild the denormalized schedule label in the same shape createDraft
      // wrote it: singles from the earliest day ("Lørdag, 10:00–16:00"),
      // series as plural weekday + range ("Mandager, 18:00–19:00").
      let timeSchedule: string | undefined;
      if (courseData.format === 'single') {
        const first = [...sessionDays]
          .filter((d) => d.date && d.startTime)
          .sort((a, b) => formatLocalYMD(a.date!).localeCompare(formatLocalYMD(b.date!)))[0];
        if (first) {
          timeSchedule = first.endTime
            ? `${weekdayLabel(first.date!)}, ${first.startTime}–${first.endTime}`
            : `${weekdayLabel(first.date!)}, ${first.startTime}`;
        }
      } else if (settingsDate && settingsTime) {
        const end = settingsDuration
          ? minToTime(timeToMin(settingsTime) + settingsDuration)
          : '';
        timeSchedule = end
          ? `${weekdayLabel(settingsDate)}er, ${settingsTime}–${end}`
          : `${weekdayLabel(settingsDate)}er, ${settingsTime}`;
      }

      const updateData = {
        title: settingsTitle.trim(),
        description: settingsDescription.trim() || null,
        location: settingsLocation.trim() || null,
        location_address: settingsLocationAddress.trim() || null,
        location_lat: settingsLocationCoords?.lat ?? null,
        location_lon: settingsLocationCoords?.lon ?? null,
        location_place_id: settingsLocationCoords?.placeId ?? null,
        max_participants: maxParticipants,
        price: settingsPrice,
        time_schedule: timeSchedule,
        duration: settingsDuration,
      };

      const { error: updateError } = await updateCourse(courseId, updateData);
      if (updateError) {
        setSaveError(friendlyError(updateError, 'Kunne ikke lagre endringer. Prøv igjen.'));
        setIsSaving(false);
        return;
      }

      // Baseline the just-persisted course fields immediately — if a later
      // step fails, the dirty bar and Avbryt then only track what's actually
      // still unsaved instead of reverting to values the DB no longer holds.
      setCourseData((prev) =>
        prev
          ? {
              ...prev,
              title: settingsTitle.trim(),
              description: settingsDescription.trim(),
              location: settingsLocation.trim() || null,
              locationAddress: settingsLocationAddress.trim() || null,
              locationLat: settingsLocationCoords?.lat ?? null,
              locationLon: settingsLocationCoords?.lon ?? null,
              locationPlaceId: settingsLocationCoords?.placeId ?? null,
              capacity: maxParticipants,
              price: settingsPrice,
              timeSchedule: timeSchedule || prev.timeSchedule,
              durationMinutes: settingsDuration || prev.durationMinutes,
            }
          : null,
      );

      if (settingsAllowsDropIn) {
        const { error: dropInError } = await syncCourseDropInTier(courseId, true, settingsDropInPrice);
        if (dropInError) {
          setSaveError(friendlyError(dropInError, 'Kunne ikke lagre drop-in-pris.'));
          setIsSaving(false);
          return;
        }
      }
      setCourseData((prev) =>
        prev
          ? { ...prev, allowsDropIn: settingsAllowsDropIn, dropInPrice: settingsDropInPrice }
          : null,
      );

      if (courseData.format === 'single') {
        // Per-day session persistence for single/enkeltkurs courses.
        // Build a lookup of original sessions by id for change detection.
        // `committed` tracks the baseline as each write lands: a mid-loop
        // failure re-baselines `sessions` to exactly what the DB now holds,
        // so retrying the save skips the already-persisted days instead of
        // re-running them — which for published courses would re-notify
        // participants about a reschedule that already happened.
        const origById = new Map(sessions.map((s) => [s.id, s]));
        const isDraft = courseData.status === 'draft';

        const failSessionSave = (message: string) => {
          if (committedSessions !== sessions) {
            // Update the baseline without letting the populate effect rebuild
            // sessionDays — the user's remaining unsaved edits must survive.
            skipNextDaysSyncRef.current = true;
            setSessions(committedSessions);
          }
          setSaveError(message);
          setIsSaving(false);
        };

        // 1. Handle removed days (only for drafts — safety constraint).
        if (isDraft) {
          const keptIds = new Set(sessionDays.map((d) => d.id));
          const removedSessions = sessions.filter((s) => !keptIds.has(s.id));
          for (const s of removedSessions) {
            const { error: delError } = await deleteCourseSession(s.id);
            if (delError) {
              failSessionSave(friendlyError(delError, 'Kunne ikke slette dag. Prøv igjen.'));
              return;
            }
            committedSessions = committedSessions.filter((c) => c.id !== s.id);
          }
        }

        // 2. Update or create each day.
        for (let i = 0; i < sessionDays.length; i++) {
          const day = sessionDays[i];
          if (!day.date || !day.startTime) continue;
          const dateStr = formatLocalYMD(day.date);
          const startTime = day.startTime;
          const endTime = day.endTime || null;

          const orig = origById.get(day.id);
          if (!orig) {
            // New day (no existing session row) — only for drafts.
            if (!isDraft) continue;
            const { data: createdSession, error: createError } = await createCourseSession(courseId, {
              session_date: dateStr,
              start_time: startTime,
              end_time: endTime ?? '',
              session_number: i + 1,
            });
            if (createError || !createdSession) {
              failSessionSave(friendlyError(createError, 'Kunne ikke legge til dag. Prøv igjen.'));
              return;
            }
            committedSessions = [...committedSessions, createdSession];
            // Swap the editor row's 'new-' placeholder id for the real one,
            // so a retry after a later failure updates this row instead of
            // creating a duplicate day.
            const placeholderId = day.id;
            setSessionDays((prev) =>
              prev.map((d) => (d.id === placeholderId ? { ...d, id: createdSession.id } : d)),
            );
          } else {
            // Existing session — diff to see if anything changed.
            const origDateStr = orig.session_date;
            const origStart = orig.start_time.slice(0, 5);
            const origEnd = orig.end_time ? orig.end_time.slice(0, 5) : '';
            const hasChanged =
              dateStr !== origDateStr ||
              startTime !== origStart ||
              (endTime ?? '') !== origEnd;
            if (!hasChanged) continue;

            if (isDraft) {
              // Draft: plain update (no notifications).
              const { error: updError } = await updateCourseSession(day.id, {
                session_date: dateStr,
                start_time: startTime,
                end_time: endTime,
              });
              if (updError) {
                failSessionSave(friendlyError(updError, 'Kunne ikke oppdatere dag. Prøv igjen.'));
                return;
              }
            } else {
              // Published: reschedule via edge function to notify participants.
              const { error: reError } = await rescheduleCourseSession({
                sessionId: day.id,
                newDate: dateStr,
                newStartTime: startTime,
                newEndTime: endTime ?? undefined,
              });
              if (reError) {
                failSessionSave(friendlyError(reError, 'Kunne ikke oppdatere dag. Prøv igjen.'));
                return;
              }
            }
            // Mirror the persisted values into the tracked baseline (the
            // reschedule edge fn doesn't return the row).
            committedSessions = committedSessions.map((c) =>
              c.id === day.id
                ? { ...c, session_date: dateStr, start_time: startTime, end_time: endTime }
                : c,
            );
          }
        }

        // Refetch sessions so UI reflects the saved state.
        const updatedSessions = await fetchCourseSessions(courseId);
        if (updatedSessions.data) setSessions(updatedSessions.data);
      } else if (sessions.length > 0) {
        const sorted = [...sessions].sort((a, b) => a.session_number - b.session_number);
        if (courseData.status === 'draft' && settingsDate) {
          // Draft series: startdato/tid edits regenerate the weekly session
          // dates in place — plain updates, nobody to notify on a draft. The
          // sync_course_date_bounds DB trigger keeps courses.start_date/
          // end_date in step with the session rows.
          let changed = false;
          for (let i = 0; i < sorted.length; i++) {
            const d = new Date(settingsDate);
            d.setDate(settingsDate.getDate() + i * 7);
            const dateStr = formatLocalYMD(d);
            const s = sorted[i];
            const timeChanged = !!settingsTime && s.start_time.slice(0, 5) !== settingsTime;
            if (s.session_date === dateStr && !timeChanged) continue;
            const { error: sessError } = await updateCourseSession(s.id, {
              session_date: dateStr,
              ...(settingsTime ? { start_time: settingsTime } : {}),
            });
            if (sessError) {
              setSaveError(friendlyError(sessError, 'Kunne ikke oppdatere timeplanen. Prøv igjen.'));
              setIsSaving(false);
              return;
            }
            changed = true;
          }
          if (changed) {
            const updatedSessions = await fetchCourseSessions(courseId);
            if (updatedSessions.data) setSessions(updatedSessions.data);
          }
        } else if (settingsTime) {
          // Published series: bulk-apply start time to all sessions
          // (unchanged behavior — dates are locked once live).
          const oldTime = sorted[0]?.start_time;
          if (oldTime && oldTime !== settingsTime) {
            await Promise.all(sorted.map((s) => updateCourseSession(s.id, { start_time: settingsTime })));
            const updatedSessions = await fetchCourseSessions(courseId);
            if (updatedSessions.data) setSessions(updatedSessions.data);
          }
        }
      }

      // Keep local startDate in step with the saved schedule (the DB derives
      // courses.start_date from the session rows). Re-applies the same course
      // fields as the early baseline above — harmless, and it picks up the
      // saved startDate which is only known after the session writes.
      const savedStartDate =
        courseData.format === 'single'
          ? [...sessionDays]
              .filter((d) => d.date)
              .map((d) => formatLocalYMD(d.date!))
              .sort()[0] ?? null
          : courseData.status === 'draft' && settingsDate
            ? formatLocalYMD(settingsDate)
            : null;

      setCourseData((prev) =>
        prev
          ? {
              ...prev,
              startDate: savedStartDate ?? prev.startDate,
              title: settingsTitle.trim(),
              description: settingsDescription.trim(),
              location: settingsLocation.trim() || null,
              locationAddress: settingsLocationAddress.trim() || null,
              locationLat: settingsLocationCoords?.lat ?? null,
              locationLon: settingsLocationCoords?.lon ?? null,
              locationPlaceId: settingsLocationCoords?.placeId ?? null,
              capacity: maxParticipants,
              price: settingsPrice,
              timeSchedule: timeSchedule || prev.timeSchedule,
              durationMinutes: settingsDuration || prev.durationMinutes,
              allowsDropIn: settingsAllowsDropIn,
              dropInPrice: settingsDropInPrice,
            }
          : null,
      );
      toast.success('Endringer lagret');
    } catch {
      // A thrown mid-loop failure (network) needs the same re-baselining as
      // a returned error, so the retry skips the already-persisted days.
      if (committedSessions !== sessions) {
        skipNextDaysSyncRef.current = true;
        setSessions(committedSessions);
      }
      setSaveError('Noe gikk galt. Prøv igjen.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageSelected = async (file: File | null) => {
    if (!file || !courseId || !courseData) return;

    const previousUrl = courseData.imageUrl;
    setIsSavingImage(true);
    setSaveError(null);

    try {
      const { url, error: uploadError } = await uploadCourseImage(courseId, file);
      if (uploadError || !url) {
        throw uploadError ?? new Error('Kunne ikke laste opp bildet.');
      }

      const { error: updateError } = await updateCourse(courseId, { image_url: url });
      if (updateError) {
        if (currentSeller?.id) {
          void deleteCourseImage(courseId, url, currentSeller.id);
        }
        throw updateError;
      }

      setCourseData((prev) => (prev ? { ...prev, imageUrl: url } : prev));
      setSettingsImageUrl(url);

      if (previousUrl && previousUrl !== url && currentSeller?.id) {
        void deleteCourseImage(courseId, previousUrl, currentSeller.id);
      }

      toast.success('Bilde oppdatert');
    } catch (err) {
      toast.error(friendlyError(err, 'Kunne ikke oppdatere bildet.'));
    } finally {
      setIsSavingImage(false);
    }
  };

  const handleImageRemove = async () => {
    if (!courseId || !courseData?.imageUrl) return;

    const previousUrl = courseData.imageUrl;
    setIsSavingImage(true);
    setSaveError(null);

    try {
      const { error: updateError } = await updateCourse(courseId, { image_url: null });
      if (updateError) throw updateError;

      setCourseData((prev) => (prev ? { ...prev, imageUrl: null } : prev));
      setSettingsImageUrl(null);

      if (currentSeller?.id) {
        void deleteCourseImage(courseId, previousUrl, currentSeller.id);
      }

      toast.success('Bilde fjernet');
    } catch (err) {
      toast.error(friendlyError(err, 'Kunne ikke fjerne bildet.'));
    } finally {
      setIsSavingImage(false);
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
    bypass();
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
      bypass();
      navigate(routes.courses, { state: { message } });
    } catch (err) {
      setSaveError(friendlyError(err, 'Kunne ikke avlyse kurset. Prøv igjen.'));
      setShowCancelPreview(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // Publish flow — mirrors CourseDrawer. The DB trigger is the authoritative
  // gate; this client check just keeps teachers out of a guaranteed-to-fail
  // request. Only PAID courses need Stripe onboarding — 0 kr courses publish
  // freely on every tier.
  const courseHasPaidTier =
    (courseData?.price ?? 0) > 0 ||
    ((courseData?.allowsDropIn ?? false) && (courseData?.dropInPrice ?? 0) > 0);

  const handlePublish = async () => {
    if (!courseId || !courseData) return;
    if (publishNeedsPaymentSetup(currentSeller, courseHasPaidTier)) {
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
    await runWithRevert({
      message: 'Kurset er lagret som utkast',
      apply: () => setCourseData((prev) => (prev ? { ...prev, status: 'draft' } : prev)),
      revert: () => setCourseData((prev) => (prev ? { ...prev, status: previousStatus } : prev)),
      commit: () => unpublishCourse(courseId),
      undo: () => publishCourse(courseId),
      commitErrorMessage: (e) => friendlyError(e, 'Kunne ikke avpublisere kurset'),
      undoErrorMessage: (e) => friendlyError(e, 'Kunne ikke gjenopprette publisering'),
    });
  };

  const handleDiscard = () => {
    if (!courseData) return;
    setSettingsTitle(courseData.title);
    setSettingsDescription(courseData.description || '');
    setSettingsLocation(courseData.location || '');
    setSettingsLocationAddress(courseData.locationAddress || '');
    setSettingsLocationCoords(
      courseData.locationLat != null
        ? { lat: courseData.locationLat, lon: courseData.locationLon, placeId: courseData.locationPlaceId }
        : null,
    );
    setSettingsImageUrl(courseData.imageUrl);
    setMaxParticipants(courseData.capacity);
    setSettingsDuration(courseData.durationMinutes);
    setSettingsDropInPrice(courseData.dropInPrice);
    // Drop-in is instant-commit, so it's intentionally NOT reset by Forkast —
    // any drop-in change has already been persisted independently.
    if (courseData.startDate) setSettingsDate(new Date(courseData.startDate));
    const timeMatch = courseData.timeSchedule.match(/(\d{1,2}:\d{2})/);
    if (timeMatch) setSettingsTime(timeMatch[1]);
    // Reset per-day session editor from the loaded sessions (single format).
    if (courseData.format === 'single' && sessions.length > 0) {
      setSessionDays(buildSessionDays(sessions));
    }
    setSaveError(null);
  };

  if (!courseId) {
    return <CourseNotFound />;
  }

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto bg-canvas h-full">
        <MobileTeacherHeader />
        <PageShell
          title={<Skeleton className="h-7 w-64" />}
          badgePlacement="below"
          badge={<Skeleton className="h-4 w-32" />}
          tabs={<Skeleton className="h-10 w-full max-w-md" />}
        >
          <Skeleton className="h-72 w-full" />
        </PageShell>
      </div>
    );
  }

  if (error || !courseData) {
    return <CourseNotFound description={error || undefined} />;
  }

  // A draft has no signups yet — "Påmeldte" would be a guaranteed-empty tab, so
  // it's hidden until the course goes live (the tab returns once published).
  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'oversikt', label: 'Oversikt' },
    ...(courseData.status === 'draft'
      ? []
      : [{ key: 'pameldte' as const, label: 'Påmeldte', count: participantKpis.confirmed }]),
    { key: 'rediger', label: 'Rediger' },
  ];

  // Whether the course has ANY signup rows (confirmed OR cancelled). Cancelled
  // signups still carry payment records under retention, so a finished course
  // is only safe to hard-delete when there are none at all. Treat the
  // not-yet-loaded state AND a failed fetch as "has records" so we never offer
  // delete on incomplete information.
  const hasSignupRecords = participantsLoading || participantsError || participants.length > 0;

  const courseUrl =
    currentSeller?.slug && courseData.slug
      ? `${window.location.origin}/${currentSeller.slug}/${courseData.slug}`
      : '';
  // Share + unpublish only make sense while a course is published and live.
  // A finished (completed) or cancelled course is archival: no share, no
  // "Gjør til utkast". draft has its own Publish CTA below.
  const isLive = courseData.status === 'upcoming' || courseData.status === 'active';
  const canShare = isLive && !!courseUrl;

  // Header carries just the title + status badge — the date/time/place now
  // live in the Oversikt Timeplan + Sted cards, so they're no longer repeated
  // here.

  return (
    <div className="flex-1 overflow-y-auto bg-canvas h-full">
      <MobileTeacherHeader />

      <PageShell
        title={courseData.title}
        badgePlacement="below"
        badge={<StatusBadge status={courseData.status} />}
        action={
          // Drafts publish from the Oversikt readiness card — no header button.
          // Published (upcoming/active) courses get the kebab (Gjør til utkast)
          // on the title row; Share shows alongside when a public URL exists.
          courseData.status === 'draft' ? null : isLive ? (
            <div className="flex items-center gap-2">
              {canShare && (
                <ShareCoursePopover
                  courseUrl={courseUrl}
                  courseTitle={courseData.title}
                />
              )}
              {/* State-change actions (unpublish) live in the kebab —
                  destructive actions stay in the Rediger tab's Faresone. Gated
                  to live courses, so a finished course can't be flipped back. */}
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
              paymentSetupStatus={currentSeller?.stripe_account_status ?? null}
              paymentSetupComplete={currentSeller?.stripe_onboarding_complete ?? false}
              paymentSetupRequired={courseHasPaidTier}
              allowsDropIn={settingsAllowsDropIn}
              onAllowsDropInChange={handleToggleDropIn}
              dropInPrice={settingsDropInPrice}
              onDropInPriceChange={setSettingsDropInPrice}
              acceptsLateSignups={settingsAcceptsLateSignups}
              onAcceptsLateSignupsChange={handleToggleAcceptsLateSignups}
              onPublish={handlePublish}
              publishing={isPublishing}
              onOpenKursplan={() => {
                setSessionEditId(null);
                setSessionsModalOpen(true);
              }}
              onEditSession={(id) => {
                setSessionEditId(id);
                setSessionsModalOpen(true);
              }}
              onSetupPaymentsClick={() => navigate(routes.settingsPayouts)}
              sessions={sessions}
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
              settingsLocationAddress={settingsLocationAddress}
              settingsLocationCoords={settingsLocationCoords}
              onLocationChange={setSettingsLocation}
              onLocationAddressChange={setSettingsLocationAddress}
              onLocationCoordsChange={setSettingsLocationCoords}
              settingsImageUrl={settingsImageUrl}
              onImageFileChange={(file) => void handleImageSelected(file)}
              onImageRemove={() => void handleImageRemove()}
              isSaving={isSaving}
              isImageSaving={isSavingImage}
              settingsDate={settingsDate}
              onDateChange={setSettingsDate}
              settingsTime={settingsTime}
              onTimeChange={setSettingsTime}
              settingsDuration={settingsDuration}
              onDurationChange={setSettingsDuration}
              sessionDays={sessionDays}
              onSessionDaysChange={setSessionDays}
              isPublished={isLive}
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

                    <div className="rounded-lg border border-card bg-surface overflow-hidden">
                      {participantsError && visible.length === 0 ? (
                      // Failed fetch ≠ empty roster — never tell the teacher
                      // "ingen påmeldte" when we simply couldn't load them.
                      <EmptyState
                        title="Kunne ikke laste deltakerne"
                        description="Sjekk nettet og last siden på nytt."
                        className="py-12"
                      />
                    ) : visible.length === 0 ? (
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
        onOpenChange={(next) => {
          setSessionsModalOpen(next);
          if (!next) setSessionEditId(null);
        }}
        sessions={sessions}
        defaultDurationMinutes={courseData.durationMinutes}
        onSessionUpdated={refetch}
        initialEditSessionId={sessionEditId}
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
        onCancelEnrollment={handleCancelEnrollment}
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
        destructive
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

      <UnsavedChangesDialog blocker={blocker} />
    </div>
  );
};

export default CoursePage;

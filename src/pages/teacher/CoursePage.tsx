import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import { ErrorState } from '@/components/ui/error-state';
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
import { ParticipantDetailDrawer, isPartiallyRefunded } from '@/components/teacher/ParticipantDetailDrawer';
import { PageShell } from '@/components/teacher/PageShell';
import { PageState } from '@/components/page-state/page-state';
import { AddParticipantDrawer } from '@/components/teacher/AddParticipantDrawer';
import { PublishCourseDialog } from '@/components/teacher/PublishCourseDialog';
import { useCourseDetail } from '@/hooks/use-course-detail';
import { singleScheduleLabel, seriesScheduleLabel } from '@/utils/timeSchedule';
import {
  updateCourse,
  cancelCourse,
  saveCourseSchedule,
  notifySessionRescheduled,
  type DesiredSession,
  syncCourseDropInTier,
  publishCourse,
  unpublishCourse,
  deleteCourse,
} from '@/services/courses';
import { logger } from '@/lib/logger';
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

/**
 * Build the desired-session payload for `save_course_schedule` from the current
 * editor + form state. Pure + exported so the 🔴 data-loss guard is unit-tested
 * in isolation.
 *
 * Returns `null` to mean "leave sessions untouched" (the RPC skips the session
 * diff). The critical invariant: for a single-format course, an unpopulated
 * editor — empty, still loading, or a failed sessions fetch — MUST yield `null`,
 * never `[]`, because `[]` deletes every session row on a draft.
 */
export function computeDesiredSessions(args: {
  format: 'single' | 'series';
  status: string;
  sessionDays: SessionDay[];
  sessions: CourseSession[];
  sessionsLoading: boolean;
  sessionsError: boolean;
  settingsDate?: Date;
  settingsTime: string;
  settingsDuration: number | null;
}): DesiredSession[] | null {
  const {
    format, status, sessionDays, sessions,
    sessionsLoading, sessionsError, settingsDate, settingsTime, settingsDuration,
  } = args;

  const editorAuthoritative =
    format === 'single' && !sessionsLoading && !sessionsError && sessionDays.length > 0;

  if (editorAuthoritative) {
    return sessionDays
      .map((day): DesiredSession | null => {
        const isExisting = !day.id.startsWith('new-');
        if (!day.date || !day.startTime) {
          // Incomplete editor row: keep an existing session untouched;
          // an incomplete new row has nothing to create yet.
          return isExisting ? { id: day.id, keep: true } : null;
        }
        return {
          id: isExisting ? day.id : null,
          session_date: formatLocalYMD(day.date),
          start_time: day.startTime,
          end_time: day.endTime || null,
        };
      })
      .filter((d): d is DesiredSession => d !== null);
  }

  if (format !== 'single' && sessions.length > 0) {
    const sorted = [...sessions].sort((a, b) => a.session_number - b.session_number);
    if (status === 'draft' && settingsDate) {
      // Draft series: startdato/tid edits regenerate the weekly session dates.
      // The sync_course_date_bounds DB trigger keeps courses.start_date/end_date
      // in step with the session rows.
      return sorted.map((s, i) => {
        const d = new Date(settingsDate);
        d.setDate(settingsDate.getDate() + i * 7);
        const startTime = settingsTime || s.start_time.slice(0, 5);
        // Carry the end time (start + duration) onto every row, so a draft
        // series save persists the full slot instead of leaving end_time null.
        const endTime = settingsDuration
          ? minToTime(timeToMin(startTime) + settingsDuration)
          : s.end_time
            ? s.end_time.slice(0, 5)
            : null;
        return {
          id: s.id,
          session_date: formatLocalYMD(d),
          start_time: startTime,
          end_time: endTime,
        };
      });
    }
    if (settingsTime) {
      // Published series: bulk-apply start time (dates locked once live).
      return sorted.map((s) => ({
        id: s.id,
        session_date: s.session_date,
        start_time: settingsTime,
      }));
    }
  }

  return null;
}

/**
 * Course not-found state — TeacherLayout owns the scroll container and
 * mobile header now, so this renders just the canonical PageState (as a
 * div: SidebarInset already provides the page's <main> landmark).
 */
function CourseNotFound({ description }: { description?: string }) {
  return <PageState variant="course" description={description} as="div" />;
}

/**
 * CoursePage — full course detail / configuration page.
 *
 * The drawer's "Åpne kursside →" escape target. Three underline tabs slice
 * the course into its three concerns: Oversikt (at-a-glance + ops), Rediger
 * (editable form), and Påmeldte (the participants list). Page shell follows
 * the dashboard convention (max-w-6xl centered, lg:px-8 padding).
 */
const CoursePage = () => {
  const navigate = useNavigate();
  const { id: courseId } = useParams<{ id: string }>();
  const { currentSeller } = useAuth();

  const {
    course: courseData,
    sessions,
    sessionsLoading,
    sessionsError,
    participants,
    participantsLoading,
    participantsError,
    loading: isLoading,
    notFound,
    courseLoadError,
    setCourse: setCourseData,
    setMaxParticipants,
    maxParticipants,
    refetchParticipants,
    refetch,
  } = useCourseDetail(courseId);

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab: TabKey =
    tabParam === 'pameldte' || tabParam === 'rediger' ? tabParam : 'oversikt';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
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
  const [titleError, setTitleError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showCancelPreview, setShowCancelPreview] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingCourse, setIsDeletingCourse] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [isAddParticipantOpen, setIsAddParticipantOpen] = useState(false);

  // The course's start time, from the session rows — the source of truth.
  // time_schedule is a display label and is never parsed (the old regex here
  // meant a label copy-edit could silently corrupt the schedule form).
  const sessionsStartTime = useMemo(() => {
    if (sessions.length === 0) return null;
    const earliest = [...sessions].sort((a, b) => a.session_number - b.session_number)[0];
    return earliest?.start_time?.slice(0, 5) ?? null;
  }, [sessions]);

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
    if (sessionsStartTime) setSettingsTime(sessionsStartTime);
    setSettingsDuration(courseData.durationMinutes);
    setSettingsAllowsDropIn(courseData.allowsDropIn);
    setSettingsDropInPrice(courseData.dropInPrice);
    setSettingsAcceptsLateSignups(courseData.acceptsLateSignups);
    setSettingsPrice(courseData.price);
    if (courseData.startDate) setSettingsDate(parseLocalDate(courseData.startDate));
  }, [courseData, sessionsStartTime]);

  // Populate per-day session editor from loaded sessions (single format only).
  // Re-runs whenever sessions are (re)fetched so discard/refetch stays in
  // sync. Saves are transactional now (save_course_schedule RPC), so there is
  // no partial-failure re-baselining to guard against anymore: a failed save
  // changes nothing and this effect doesn't fire.
  useEffect(() => {
    if (!courseData || courseData.format !== 'single') return;
    if (sessions.length === 0) return;
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
      const origDate = courseData.startDate ? parseLocalDate(courseData.startDate).toDateString() : '';
      const currDate = settingsDate ? settingsDate.toDateString() : '';
      if (currDate !== origDate) return true;
      // Compare against the session rows' time; skip until they've loaded so
      // the default form value can't read as a phantom edit.
      if (sessionsStartTime && settingsTime !== sessionsStartTime) return true;
    }
    // settingsAllowsDropIn and settingsDropInPrice intentionally excluded —
    // drop-in is instant-commit (toggle + price both persist on their own),
    // not part of the batched save flow.
    return false;
  }, [
    courseData, settingsTitle, settingsDescription, settingsLocation, settingsLocationAddress,
    maxParticipants, settingsDuration, settingsDate, settingsTime,
    settingsPrice, sessionDays, sessions, sessionsStartTime,
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

  // Tab ↔ URL sync (?tab=), matching the app's existing convention. Writing on
  // change keeps the tab shareable/back-navigable; reading happens on mount.
  const handleTabChange = (next: TabKey) => {
    setActiveTab(next);
    const params = new URLSearchParams(searchParams);
    if (next === 'oversikt') params.delete('tab');
    else params.set('tab', next);
    setSearchParams(params, { replace: true });
  };

  // Unpublishing removes the Påmeldte tab (drafts have no signups view). If the
  // user was on it, fall back to Oversikt so they aren't stranded on a hidden panel.
  useEffect(() => {
    if (courseData?.status === 'draft' && activeTab === 'pameldte') {
      setActiveTab('oversikt');
      const params = new URLSearchParams(searchParams);
      params.delete('tab');
      setSearchParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseData?.status, activeTab]);

  const handleMessageAllParticipants = () => {
    if (participantEmails.length === 0) return;
    setMessageDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!courseId || !courseData) return;
    // A live course must never save an empty title — block before any write.
    if (!settingsTitle.trim()) {
      setTitleError('Kurset må ha en tittel.');
      return;
    }
    setTitleError(null);
    // Same rule as the builder: a location must come from the Google search so
    // buyers get coords/map, not bare text. Only enforced when it changed, so
    // untouched legacy pin-less locations don't block unrelated edits.
    const locationChanged = settingsLocation.trim() !== (courseData.location || '');
    if (locationChanged && settingsLocation.trim() && !settingsLocationCoords?.placeId) {
      setLocationError('Velg et sted fra listen.');
      return;
    }
    setLocationError(null);
    setIsSaving(true);
    setSaveError(null);
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
          timeSchedule = singleScheduleLabel(first.date!, first.startTime, first.endTime || null);
        }
      } else if (settingsDate && settingsTime) {
        const end = settingsDuration
          ? minToTime(timeToMin(settingsTime) + settingsDuration)
          : null;
        timeSchedule = seriesScheduleLabel(settingsDate, settingsTime, end);
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

      // Desired full session state for the RPC's server-side diff. The 🔴
      // data-loss guard (empty/loading/errored editor → null, never []) lives
      // in this pure helper so it can be unit-tested in isolation.
      const desiredSessions = computeDesiredSessions({
        format: courseData.format === 'series' ? 'series' : 'single',
        status: courseData.status,
        sessionDays,
        sessions,
        sessionsLoading,
        sessionsError,
        settingsDate,
        settingsTime,
        settingsDuration,
      });

      // Defense in depth: settingsDropInPrice updates per keystroke, so an
      // abandoned invalid edit (0/empty) on Oversikt could still be sitting in
      // state when Lagre fires from Rediger. Never send ≤0 while the toggle is
      // on — fall back to the committed price instead of zeroing the tier.
      const effectiveDropInPrice =
        settingsDropInPrice > 0 ? settingsDropInPrice : courseData.dropInPrice;

      // One transactional RPC: course fields + drop-in tier + session diff
      // all commit or none do. The old browser-side write loop (and its
      // committedSessions re-baselining apparatus) is gone — a failed save
      // changes nothing, so retry is trivially safe.
      const { data: result, error: saveErr } = await saveCourseSchedule({
        courseId,
        course: updateData,
        dropIn: settingsAllowsDropIn ? { price: effectiveDropInPrice } : null,
        sessions: desiredSessions,
      });
      if (saveErr || !result?.success) {
        setSaveError(friendlyError(saveErr, 'Kunne ikke lagre endringer. Prøv igjen.'));
        return;
      }

      // Participant notifications for published single-format reschedules —
      // best-effort AFTER the committed save. Series bulk time changes don't
      // notify (parity with the old flow). Re-notification on retry is
      // structurally impossible now: a second save diffs to nothing.
      if (courseData.format === 'single' && courseData.status !== 'draft') {
        let notifyFailed = false;
        for (const r of result.rescheduled) {
          const { error: notifyErr } = await notifySessionRescheduled({
            sessionId: r.session_id,
            oldDate: r.old_date,
            oldStartTime: r.old_start_time,
            newDate: r.new_date,
            newStartTime: r.new_start_time,
          });
          if (notifyErr) {
            notifyFailed = true;
            logger.error('Reschedule notification failed (change is saved):', notifyErr);
          }
        }
        if (notifyFailed) {
          toast.error('Lagret, men deltakerne ble ikke varslet om ny tid');
        }
      }

      // Instant dirty-bar clear: mirror the saved fields into the cache now,
      // then refetch for the authoritative state (session rows, trigger-
      // derived start/end dates). The refetch replaces the old flow's five
      // hand-patching blocks.
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
              allowsDropIn: settingsAllowsDropIn,
              dropInPrice: effectiveDropInPrice,
            }
          : null,
      );
      refetch();
      // The RPC silently drops brand-new days on a published course — tell the
      // teacher instead of letting the edit look like it applied.
      if (result.skipped_new_days > 0) {
        toast.success('Lagret, men nye dager kan ikke legges til på et publisert kurs.');
      } else {
        toast.success('Endringer lagret');
      }
    } catch {
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
      toast.error(friendlyError(err, 'Kunne ikke oppdatere bildet'));
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
      toast.error(friendlyError(err, 'Kunne ikke fjerne bildet'));
    } finally {
      setIsSavingImage(false);
    }
  };

  const handleCancelEnrollment = async (signupId: string, refund: boolean): Promise<boolean> => {
    // The drawer's "Refunder beløp" action reuses this path against a signup
    // that's already cancelled — nothing is being avbestilt there, so the
    // toast must only speak to the refund.
    const targetStatus = participants.find((p) => p.id === signupId)?.status;
    const alreadyCancelled = targetStatus === 'cancelled' || targetStatus === 'course_cancelled';
    const { error: cancelError } = await teacherCancelSignup(signupId, { refund });
    if (cancelError) {
      toast.error(friendlyError(cancelError, 'Kunne ikke avbestille påmeldingen'));
      return false;
    }
    if (alreadyCancelled && refund) {
      toast.success('Refusjon behandlet');
    } else {
      toast.success(refund ? 'Påmelding avbestilt og refusjon behandlet' : 'Påmelding avbestilt');
    }
    refetchParticipants();
    return true;
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
      toast.error(friendlyError(error, 'Kunne ikke oppdatere drop-in'));
      return;
    }
    toast.success(next ? 'Drop-in slått på' : 'Drop-in slått av');
  };

  // The Oversikt drop-in price input has no save bar — commit on blur so an
  // edited price can't sit as invisible dirty state and get silently dropped.
  // Same instant-commit path as the toggle; only fires when drop-in is on and
  // the value actually changed.
  const handleDropInPriceBlur = async () => {
    if (!courseId || !courseData) return;
    if (!settingsAllowsDropIn) return;
    if (!Number.isFinite(settingsDropInPrice) || settingsDropInPrice <= 0) {
      // Invalid edit (empty/0/NaN) while drop-in is on: snap the state back to
      // the committed price so it can't outlive the tab and leak into a
      // later "Lagre" from Rediger. The row's inline error explains the snap.
      setSettingsDropInPrice(courseData.dropInPrice);
      return;
    }
    if (settingsDropInPrice === courseData.dropInPrice) return;
    const previousPrice = courseData.dropInPrice;
    setCourseData((prev) => (prev ? { ...prev, dropInPrice: settingsDropInPrice } : prev));
    const { error } = await syncCourseDropInTier(courseId, true, settingsDropInPrice);
    if (error) {
      setSettingsDropInPrice(previousPrice);
      setCourseData((prev) => (prev ? { ...prev, dropInPrice: previousPrice } : prev));
      toast.error(friendlyError(error, 'Kunne ikke oppdatere drop-in-prisen'));
      return;
    }
    toast.success('Drop-in-pris oppdatert');
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
      toast.error(friendlyError(error, 'Kunne ikke oppdatere innstillingen'));
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
      toast.error(friendlyError(deleteError, 'Kunne ikke slette kurset'));
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
        // Cancellation failure is its own concern — surface it as a toast, not
        // in the DirtyFormBar's saveError (which sits next to unrelated
        // save/discard buttons).
        toast.error(friendlyError(cancelError, 'Kunne ikke avlyse kurset.'));
        setShowCancelPreview(false);
        return;
      }
      const message = result
        ? `Kurset er avlyst. ${result.refunds_processed} ${result.refunds_processed === 1 ? 'refusjon' : 'refusjoner'} behandlet, ${result.notifications_sent} ${result.notifications_sent === 1 ? 'deltaker' : 'deltakere'} varslet.`
        : 'Kurset er avlyst.';
      setShowCancelPreview(false);
      toast.success(message);
      bypass();
      navigate(routes.courses);
    } catch (err) {
      toast.error(friendlyError(err, 'Kunne ikke avlyse kurset. Prøv igjen.'));
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
    if (courseData.startDate) setSettingsDate(parseLocalDate(courseData.startDate));
    if (sessionsStartTime) setSettingsTime(sessionsStartTime);
    // Reset per-day session editor from the loaded sessions (single format).
    if (courseData.format === 'single' && sessions.length > 0) {
      setSessionDays(buildSessionDays(sessions));
    }
    setSaveError(null);
    setTitleError(null);
    setLocationError(null);
  };

  if (!courseId) {
    return <CourseNotFound />;
  }

  if (isLoading) {
    return (
      <PageShell
        title={<Skeleton className="h-7 w-64" />}
        badgePlacement="below"
        badge={<Skeleton className="h-4 w-32" />}
        tabs={<Skeleton className="h-10 w-full max-w-md" />}
      >
        <Skeleton className="h-72 w-full" />
      </PageShell>
    );
  }

  // Fetch failure (network/RLS) is a retryable server error — distinct from a
  // genuine not-found, which must not read as "the course was deleted".
  if (courseLoadError) {
    return <PageState variant="server-error" as="div" />;
  }

  if (notFound || !courseData) {
    return <CourseNotFound />;
  }

  // A draft has no signups yet — "Påmeldte" would be a guaranteed-empty tab, so
  // it's hidden until the course goes live (the tab returns once published).
  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'oversikt', label: 'Oversikt' },
    ...(courseData.status === 'draft'
      ? []
      : [{
          key: 'pameldte' as const,
          label: 'Påmeldte',
          // Omit the badge while loading or on error — never a fabricated 0.
          count: participantsError || participantsLoading ? undefined : participantKpis.confirmed,
        }]),
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
    <>
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
                onClick={() => handleTabChange(t.key)}
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
              statsUnavailable={participantsError}
              paymentSetupStatus={currentSeller?.stripe_account_status ?? null}
              paymentSetupComplete={currentSeller?.stripe_onboarding_complete ?? false}
              paymentSetupRequired={courseHasPaidTier}
              allowsDropIn={settingsAllowsDropIn}
              onAllowsDropInChange={handleToggleDropIn}
              dropInPrice={settingsDropInPrice}
              onDropInPriceChange={setSettingsDropInPrice}
              onDropInPriceBlur={() => void handleDropInPriceBlur()}
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
              sessionsLoading={sessionsLoading}
              sessionsError={sessionsError}
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
              onTitleChange={(next) => {
                setSettingsTitle(next);
                if (titleError && next.trim()) setTitleError(null);
              }}
              titleError={titleError}
              settingsDescription={settingsDescription}
              onDescriptionChange={setSettingsDescription}
              settingsLocation={settingsLocation}
              settingsLocationAddress={settingsLocationAddress}
              settingsLocationCoords={settingsLocationCoords}
              onLocationChange={setSettingsLocation}
              onLocationAddressChange={setSettingsLocationAddress}
              onLocationCoordsChange={(coords) => {
                setSettingsLocationCoords(coords);
                if (locationError && coords?.placeId) setLocationError(null);
              }}
              locationError={locationError}
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
              sessionsError={sessionsError}
              isPublished={courseData.status !== 'draft'}
              maxParticipants={maxParticipants}
              onMaxParticipantsChange={setMaxParticipants}
              currentEnrolled={courseData.enrolled || 0}
              courseFormat={courseData.format === 'series' ? 'series' : 'single'}
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
                        {participantsLoading || participantsError
                          ? // Don't fabricate a count before the roster loads (or when it failed).
                            courseData.capacity > 0
                            ? `– av ${courseData.capacity} plasser fylt`
                            : 'Påmeldte'
                          : courseData.capacity > 0
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
                      >
                        Legg til deltaker
                      </Button>
                      {/* A disabled button's title is unreachable — the hint
                          needs to be visible text to actually communicate. */}
                      {isFull && (
                        <span className="text-sm text-foreground-muted">
                          Kurset er fullt — øk antall plasser for å legge til flere
                        </span>
                      )}
                    </div>

                    <div>
                      {participantsLoading && sortedParticipants.length === 0 ? (
                      // Roster still loading — skeleton rows, never a false empty.
                      <div className="divide-y divide-border-subtle" role="status" aria-label="Laster deltakere">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="flex items-center gap-3 py-4">
                            <Skeleton className="size-8 rounded-full" />
                            <div className="min-w-0 flex-1 space-y-1.5">
                              <Skeleton className="h-4 w-36" />
                              <Skeleton className="h-3 w-48 max-w-full" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : participantsError && sortedParticipants.length === 0 ? (
                      // Failed fetch ≠ empty roster — offer a retry, never tell
                      // the teacher "ingen påmeldte" when we couldn't load them.
                      <ErrorState
                        title="Kunne ikke laste deltakerne"
                        message="Sjekk nettet og prøv igjen."
                        onRetry={refetchParticipants}
                        variant="inline"
                      />
                    ) : sortedParticipants.length === 0 ? (
                      <EmptyState
                        title="Ingen påmeldte ennå"
                        description="Deltakere som melder seg på, dukker opp her."
                      />
                    ) : (
                      <div role="table">
                        {/* Column header — anchored at the leading edge so the
                            "Navn" label sits above the avatar+name unit. */}
                        <div role="row" className={cn(PARTICIPANT_COLS, 'hidden md:grid py-3 border-b border-border-subtle text-sm text-foreground-muted')}>
                          <span role="columnheader">Navn</span>
                          <span role="columnheader">Notat</span>
                          <span role="columnheader">Status</span>
                          <span role="columnheader" aria-hidden />
                        </div>

                        <div className="divide-y divide-border-subtle">
                          {sortedParticipants.map((p) => {
                            const name = p.participant_name || p.profile?.name || 'Ukjent';
                            const email = p.participant_email || p.profile?.email || '';
                            const status = p.status as SignupStatus;
                            const paymentStatus = p.payment_status as PaymentStatus;
                            const isCancelled = status === 'cancelled' || status === 'course_cancelled';
                            const isHappyPath = paymentStatus === 'paid' && status === 'confirmed';
                            const refundIsPartial = paymentStatus === 'refunded' && isPartiallyRefunded(p);
                            const statusBadge = !isHappyPath && (
                              <SignupStatusBadge
                                status={status}
                                paymentStatus={paymentStatus}
                                refundIsPartial={refundIsPartial}
                              />
                            );
                            const noteFlag = p.note && (
                              <FileText className="size-4 shrink-0" aria-label="Har notat" />
                            );
                            return (
                              <button
                                key={p.id}
                                type="button"
                                role="row"
                                onClick={() => setSelectedParticipantId(p.id)}
                                className={cn(
                                  PARTICIPANT_COLS,
                                  'w-full text-left py-4 transition-colors cursor-pointer',
                                  'hover:bg-hover focus-visible:bg-hover outline-none',
                                  'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring-subtle',
                                  isCancelled && 'opacity-60',
                                )}
                              >
                                {/* Identity — avatar + name + email as one unit.
                                    Below md the Notat/Status columns are
                                    hidden, so their flags fold under the email
                                    line here instead of vanishing. */}
                                <div role="cell" className="flex items-center gap-3 min-w-0">
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
                                    {(statusBadge || noteFlag) && (
                                      <div className="mt-1.5 flex items-center gap-2 md:hidden">
                                        {statusBadge}
                                        {noteFlag}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {/* Notat — icon only when a note exists, aligned to start to sit under the header. */}
                                <div role="cell" className="hidden md:flex items-center justify-start text-foreground">
                                  {noteFlag}
                                </div>
                                {/* Status — empty when healthy, badge otherwise */}
                                <div role="cell" className="hidden md:flex min-w-0">
                                  {statusBadge}
                                </div>
                                {/* Chevron — indicates the row opens a drawer */}
                                <ChevronRight
                                  role="cell"
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
        onOpenChange={(open) => {
          setShowDeleteConfirm(open);
          if (!open) setDeleteConfirmText('');
        }}
        title="Slett kurs"
        body={<><strong>{courseData.title}</strong> og all tilhørende data slettes permanent.</>}
        actionLabel="Slett kurs"
        destructive
        // Extra typed gate once the course has real signups — mirrors the
        // account-deletion convention (Tier 3: typing IS the friction).
        typeToConfirm={participantKpis.confirmed > 0 ? 'SLETT' : undefined}
        typeToConfirmValue={deleteConfirmText}
        onTypeToConfirmChange={setDeleteConfirmText}
        loading={isDeletingCourse}
        loadingText="Sletter"
        onConfirm={handleDeleteCourse}
      />

      <UnsavedChangesDialog blocker={blocker} />
    </>
  );
};

export default CoursePage;

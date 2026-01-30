import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { tabVariants, tabTransition } from '@/lib/motion';
import { ChevronRight, ExternalLink, Info } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { SidebarProvider } from '@/components/ui/sidebar';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { Button } from '@/components/ui/button';
import { fetchCourseById, updateCourse, cancelCourse, fetchCourseSessions, updateCourseSession, type CourseWithStyle } from '@/services/courses';
import { fetchSignupsByCourseWithProfiles, type SignupWithProfile } from '@/services/signups';
import { fetchCourseWaitlist, promoteFromWaitlist, removeFromWaitlist, triggerWaitlistPromotion, type WaitlistSignup } from '@/services/waitlist';
import { uploadCourseImage, deleteCourseImage } from '@/services/storage';
import type { CourseSession } from '@/types/database';
import { isTimeSlotBooked } from '@/components/ui/time-picker';
import { fetchBookedTimesForDate } from '@/services/courses';
import { formatDateNorwegian } from '@/utils/dateUtils';
import type { PaymentStatus } from '@/components/ui/payment-badge';
import type { SignupStatus } from '@/components/ui/status-badge';
import { ShareCoursePopover } from '@/components/ui/share-course-popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useCourseParticipantsSubscription } from '@/hooks/use-realtime-subscription';
import { useIsMobile } from '@/hooks/use-mobile';
import { CourseOverviewTab } from '@/components/teacher/CourseOverviewTab';
import { CourseParticipantsTab } from '@/components/teacher/CourseParticipantsTab';
import { CourseSettingsTab } from '@/components/teacher/CourseSettingsTab';

type Tab = 'overview' | 'participants' | 'settings';

// Format date range for display (e.g., "17. jan – 7. feb 2025")
function formatDateRange(startDate?: string | null, endDate?: string | null): string | null {
  if (!startDate) return null;

  const start = new Date(startDate);

  // Validate start date
  if (isNaN(start.getTime())) return null;

  const end = endDate ? new Date(endDate) : null;

  // Validate end date if provided
  if (end && isNaN(end.getTime())) return null;

  // Validate end is not before start
  if (end && end.getTime() < start.getTime()) return null;

  const formatDay = (date: Date) => date.getDate();
  const formatMonth = (date: Date) => date.toLocaleDateString('nb-NO', { month: 'short' }).replace('.', '');
  const formatYear = (date: Date) => date.getFullYear();

  if (!end) {
    // Single date - show full format
    return `${formatDay(start)}. ${formatMonth(start)} ${formatYear(start)}`;
  }

  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  const sameDay = sameMonth && start.getDate() === end.getDate();

  // Same day - just show single date
  if (sameDay) {
    return `${formatDay(start)}. ${formatMonth(start)} ${formatYear(start)}`;
  }

  if (sameMonth) {
    // Same month: "17. – 28. jan 2025"
    return `${formatDay(start)}. – ${formatDay(end)}. ${formatMonth(end)} ${formatYear(end)}`;
  } else if (sameYear) {
    // Same year: "17. jan – 7. feb 2025"
    return `${formatDay(start)}. ${formatMonth(start)} – ${formatDay(end)}. ${formatMonth(end)} ${formatYear(end)}`;
  } else {
    // Different years: "17. des 2024 – 7. jan 2025"
    return `${formatDay(start)}. ${formatMonth(start)} ${formatYear(start)} – ${formatDay(end)}. ${formatMonth(end)} ${formatYear(end)}`;
  }
}

// Helper to map database course to component format
function mapCourseToComponentFormat(courseData: CourseWithStyle & { signups_count: number }) {
  const priceNumber = courseData.price || 0;
  const estimatedRevenue = priceNumber * courseData.signups_count;
  const descriptionParts = courseData.description?.split('\n\n') || [''];

  // Format duration
  const formatDuration = () => {
    if (courseData.total_weeks) return `${courseData.total_weeks} uker`;
    if (courseData.duration) return `${courseData.duration} min`;
    return '';
  };

  // Map course_type to courseType
  const courseTypeMap: Record<string, 'kursrekke' | 'enkeltkurs'> = {
    'course-series': 'kursrekke',
    'event': 'enkeltkurs',
    'online': 'enkeltkurs',
  };

  return {
    title: courseData.title,
    status: courseData.status,
    date: courseData.time_schedule || '',
    location: courseData.location || 'Ikke angitt',
    enrolled: courseData.signups_count,
    capacity: courseData.max_participants || 0,
    price: priceNumber,
    estimatedRevenue: estimatedRevenue,
    description: descriptionParts[0] || '',
    description2: descriptionParts[1] || '',
    level: (() => {
      switch (courseData.level) {
        case 'nybegynner': return 'Nybegynner';
        case 'viderekommen': return 'Viderekommen';
        case 'alle': return 'Middels';
        default: return 'Middels';
      }
    })(),
    duration: formatDuration(),
    durationMinutes: courseData.duration || 60,
    courseType: courseTypeMap[courseData.course_type] || 'enkeltkurs',
    totalWeeks: courseData.total_weeks || 0,
    currentWeek: courseData.current_week || 0,
    timeSchedule: courseData.time_schedule || '',
    imageUrl: courseData.image_url || null,
    startDate: courseData.start_date || null,
    endDate: courseData.end_date || null,
  };
}

const CourseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentOrganization } = useAuth();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SignupStatus | 'all'>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | 'all'>('all');
  const [_startDate, _setStartDate] = useState<Date | undefined>(new Date());
  const [expandedItem, setExpandedItem] = useState<string | undefined>(undefined);
  // Show fewer sessions on mobile to reduce scroll fatigue
  const [visibleWeeks, setVisibleWeeks] = useState(isMobile ? 1 : 3);
  const [settingsTime, setSettingsTime] = useState('09:00');
  const [settingsDate, setSettingsDate] = useState<Date | undefined>(new Date());
  const [settingsDuration, setSettingsDuration] = useState<number | null>(60);
  const prevSettingsDurationRef = useRef<number | null>(null);
  // Refs to read current values in effects without triggering re-runs
  const settingsTimeRef = useRef(settingsTime);
  const settingsDateRef = useRef(settingsDate);
  settingsTimeRef.current = settingsTime;
  settingsDateRef.current = settingsDate;
  const kursplanRef = useRef<HTMLDivElement>(null);

  // State for fetched course data
  const [courseData, setCourseData] = useState<ReturnType<typeof mapCourseToComponentFormat> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maxParticipants, setMaxParticipants] = useState(0);

  // Settings form state
  const [settingsTitle, setSettingsTitle] = useState('');
  const [settingsDescription, setSettingsDescription] = useState('');
  const [settingsImageUrl, setSettingsImageUrl] = useState<string | null>(null);
  const [settingsImageFile, setSettingsImageFile] = useState<File | null>(null);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Delete state
  const [isDeleting, setIsDeleting] = useState(false);

  // Quick image upload (from overview placeholder)
  const quickImageInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingQuickImage, setIsUploadingQuickImage] = useState(false);

  // Sessions state (for Kursplan)
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [_sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionEdits, setSessionEdits] = useState<Record<string, { date?: Date; time?: string }>>({});
  const [savingSessionId, setSavingSessionId] = useState<string | null>(null);

  // Participants state (for Deltakere tab)
  const [participants, setParticipants] = useState<SignupWithProfile[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);

  // Waitlist state
  const [waitlist, setWaitlist] = useState<WaitlistSignup[]>([]);
  const [waitlistLoading, setWaitlistLoading] = useState(false);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Waitlist promotion dialog (shown when capacity increases and there's a waitlist)
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [originalCapacity, setOriginalCapacity] = useState<number | null>(null);
  const [isPromotingWaitlist, setIsPromotingWaitlist] = useState(false);
  const [newSpotsCount, setNewSpotsCount] = useState(0); // How many new spots were added

  // Cancel preview dialog state
  const [showCancelPreview, setShowCancelPreview] = useState(false);

  // Fetch course data from Supabase
  useEffect(() => {
    async function loadCourse() {
      if (!id) {
        setError('Ugyldig kurs-ID');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await fetchCourseById(id);

        if (fetchError || !data) {
          setError('Kurset ble ikke funnet');
          return;
        }

        const mappedCourse = mapCourseToComponentFormat(data);
        setCourseData(mappedCourse);
        setMaxParticipants(mappedCourse.capacity);
        setOriginalCapacity(mappedCourse.capacity);

        // Initialize settings form state
        setSettingsTitle(mappedCourse.title);
        setSettingsDescription(mappedCourse.description || '');
        setSettingsImageUrl(mappedCourse.imageUrl);

        // Parse time from time_schedule (e.g., "Tirsdager, 18:00" -> "18:00")
        const timeMatch = mappedCourse.timeSchedule.match(/(\d{1,2}:\d{2})/);
        if (timeMatch) {
          setSettingsTime(timeMatch[1]);
        }

        // Initialize duration
        setSettingsDuration(mappedCourse.durationMinutes);

        // Initialize start date
        if (mappedCourse.startDate) {
          setSettingsDate(new Date(mappedCourse.startDate));
        }
      } catch {
        setError('En feil oppstod');
      } finally {
        setIsLoading(false);
      }
    }

    loadCourse();
  }, [id]);

  // Fetch sessions when course is loaded
  useEffect(() => {
    async function loadSessions() {
      if (!id || !courseData) return;

      // Fetch sessions for both course series AND multi-day events
      setSessionsLoading(true);
      try {
        const { data: sessionsData } = await fetchCourseSessions(id);
        if (sessionsData) {
          setSessions(sessionsData);
        }
      } catch {
        // Silent fail for sessions
      } finally {
        setSessionsLoading(false);
      }
    }

    loadSessions();
  }, [id, courseData]);

  // Fetch participants when course is loaded
  useEffect(() => {
    async function loadParticipants() {
      if (!id) return;

      setParticipantsLoading(true);
      try {
        const { data: participantsData, error } = await fetchSignupsByCourseWithProfiles(id);
        if (error) {
          return;
        }
        if (participantsData) {
          setParticipants(participantsData);
        }
      } catch {
        // Silent fail for participants
      } finally {
        setParticipantsLoading(false);
      }
    }

    loadParticipants();
  }, [id]);

  // Fetch waitlist when course is loaded
  useEffect(() => {
    async function loadWaitlist() {
      if (!id) return;

      setWaitlistLoading(true);
      try {
        const { data: waitlistData, error } = await fetchCourseWaitlist(id);
        if (error) {
          return;
        }
        if (waitlistData) {
          setWaitlist(waitlistData);
        }
      } catch {
        // Silent fail for waitlist
      } finally {
        setWaitlistLoading(false);
      }
    }

    loadWaitlist();
  }, [id]);

  // Real-time refetch for participants and waitlist
  const refetchParticipantsAndWaitlist = useCallback(async () => {
    if (!id) return;

    try {
      const [participantsResult, waitlistResult] = await Promise.all([
        fetchSignupsByCourseWithProfiles(id),
        fetchCourseWaitlist(id)
      ]);

      if (participantsResult.data) {
        setParticipants(participantsResult.data);
      }
      if (waitlistResult.data) {
        setWaitlist(waitlistResult.data);
      }
    } catch {
      // Silent fail for real-time updates
    }
  }, [id]);

  // Subscribe to real-time updates for this course's participants and waitlist
  useCourseParticipantsSubscription(id, refetchParticipantsAndWaitlist);

  // Validate time when duration changes in settings (clear if conflict)
  useEffect(() => {
    // Skip if duration hasn't actually changed
    if (prevSettingsDurationRef.current === settingsDuration) {
      return;
    }

    const previousDuration = prevSettingsDurationRef.current;
    prevSettingsDurationRef.current = settingsDuration;

    // Skip on initial mount (when previous was null)
    if (previousDuration === null) {
      return;
    }

    // Read current values from refs to avoid stale closures
    const currentTime = settingsTimeRef.current;
    const currentDate = settingsDateRef.current;

    // Skip validation if missing required data
    if (!currentTime || !currentDate || !currentOrganization?.id || settingsDuration === null) {
      return;
    }

    const validateTimeWithNewDuration = async () => {
      try {
        const dateStr = currentDate.toISOString().split('T')[0];
        const { data: bookedSlots } = await fetchBookedTimesForDate(
          currentOrganization.id,
          dateStr,
          id // Exclude current course from conflict check
        );

        const conflict = isTimeSlotBooked(currentTime, settingsDuration, bookedSlots || []);
        if (conflict) {
          setSettingsTime('');
          toast.info('Valgt tidspunkt er ikke lenger ledig med ny varighet. Velg et nytt tidspunkt.');
        }
      } catch (err) {
        logger.error('Error validating time slot:', err);
      }
    };

    validateTimeWithNewDuration();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsDuration, currentOrganization?.id, id]);

  // Handle promote from waitlist
  const handlePromote = async (signupId: string) => {
    // Check capacity before promoting
    if (courseData && courseData.capacity > 0 && courseData.enrolled >= courseData.capacity) {
      // Course is full - don't promote
      setSaveError('Kurset er fullt. Kan ikke flytte flere fra ventelisten.');
      setTimeout(() => setSaveError(null), 5000);
      return;
    }

    setPromotingId(signupId);
    try {
      const { error } = await promoteFromWaitlist(signupId);
      if (!error) {
        toast.success('Deltaker flyttet fra venteliste');
        // Refresh waitlist and participants
        const { data: updatedWaitlist } = await fetchCourseWaitlist(id!);
        if (updatedWaitlist) {
          setWaitlist(updatedWaitlist);
        }
        // Also refresh participants to update enrolled count
        const { data: participantsData } = await fetchSignupsByCourseWithProfiles(id!);
        if (participantsData) {
          setParticipants(participantsData);
          // Update enrolled count in courseData
          setCourseData(prev => prev ? { ...prev, enrolled: participantsData.length } : null);
        }
      } else {
        toast.error('Kunne ikke flytte deltaker fra venteliste');
      }
    } finally {
      setPromotingId(null);
    }
  };

  // Handle remove from waitlist
  const handleRemoveFromWaitlist = async (signupId: string) => {
    setRemovingId(signupId);
    try {
      const { error } = await removeFromWaitlist(signupId);
      if (!error) {
        toast.success('Fjernet fra venteliste');
        // Remove from local state
        setWaitlist(prev => prev.filter(w => w.id !== signupId));
      } else {
        toast.error('Kunne ikke fjerne fra venteliste');
      }
    } finally {
      setRemovingId(null);
    }
  };

  // Handle save individual session
  const handleSaveSession = async (sessionId: string) => {
    const edits = sessionEdits[sessionId];
    if (!edits) return;

    setSavingSessionId(sessionId);

    try {
      const updateData: { session_date?: string; start_time?: string } = {};

      if (edits.date) {
        updateData.session_date = edits.date.toISOString().split('T')[0];
      }
      if (edits.time) {
        updateData.start_time = edits.time;
      }

      const { data, error } = await updateCourseSession(sessionId, updateData);

      if (error) {
        return;
      }

      // Update local sessions state
      if (data) {
        setSessions(prev => prev.map(s => s.id === sessionId ? data : s));
      }

      // Clear edits for this session
      setSessionEdits(prev => {
        const newEdits = { ...prev };
        delete newEdits[sessionId];
        return newEdits;
      });

      // Close accordion
      setExpandedItem(undefined);
    } catch {
      // Silent fail for session save
    } finally {
      setSavingSessionId(null);
    }
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
          setIsSaving(false);
          return;
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

      const updateData = {
        title: settingsTitle.trim(),
        description: settingsDescription.trim() || null,
        max_participants: maxParticipants,
        time_schedule: timeSchedule,
        image_url: newImageUrl,
        duration: settingsDuration,
      };

      const { error: updateError } = await updateCourse(id, updateData);

      if (updateError) {
        setSaveError(updateError.message || 'Kunne ikke lagre endringer');
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
      } : null);
      setSettingsImageUrl(newImageUrl);

      // Check if capacity increased and there are people on waitlist
      const capacityIncreased = originalCapacity !== null && maxParticipants > originalCapacity;
      const hasWaitlist = waitlist.length > 0;

      if (capacityIncreased && hasWaitlist) {
        // Calculate how many new spots were added
        const addedSpots = maxParticipants - (originalCapacity || 0);
        setNewSpotsCount(addedSpots);
        // Show promotion dialog
        setShowPromotionDialog(true);
      } else {
        toast.success('Endringer lagret');
      }

      // Update original capacity to the new value
      setOriginalCapacity(maxParticipants);
    } catch {
      setSaveError('En feil oppstod');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle promoting waitlist after capacity increase
  const handlePromoteWaitlist = async () => {
    if (!id) return;

    setIsPromotingWaitlist(true);
    try {
      // Pass the number of new spots to promote up to that many people
      const { data, error } = await triggerWaitlistPromotion(id, newSpotsCount);

      if (error) {
        toast.error(error);
      } else if (data) {
        const count = data.promoted_count || 0;
        if (count > 0) {
          toast.success(`Endringer lagret – tilbud sendt til ${count} ${count === 1 ? 'person' : 'personer'}`);
        } else {
          toast.success('Endringer lagret');
        }
        // Refresh waitlist to show updated status
        const { data: waitlistData } = await fetchCourseWaitlist(id);
        if (waitlistData) {
          setWaitlist(waitlistData);
        }
      }
    } catch {
      toast.error('Kunne ikke sende tilbud til ventelisten');
    } finally {
      setIsPromotingWaitlist(false);
      setShowPromotionDialog(false);
    }
  };

  // Handle declining waitlist promotion
  const handleDeclinePromotion = () => {
    setShowPromotionDialog(false);
    toast.success('Endringer lagret');
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
      setSaveError('En feil oppstod ved avlysning');
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

  // Loading state
  if (isLoading) {
    return (
      <SidebarProvider>
        <TeacherSidebar />
        <main className="flex-1 flex items-center justify-center h-screen bg-surface">
          <Spinner size="xl" />
        </main>
      </SidebarProvider>
    );
  }

  // Error or not found state
  if (error || !courseData) {
    return (
      <SidebarProvider>
        <TeacherSidebar />
        <main className="flex-1 flex items-center justify-center h-screen bg-surface">
          <div className="text-center">
            <h1 className="font-geist text-2xl font-medium text-text-primary tracking-tight mb-2">Kurs ikke funnet</h1>
            <p className="text-muted-foreground">{error || `Kurset med ID "${id}" finnes ikke.`}</p>
          </div>
        </main>
      </SidebarProvider>
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
        status: session.status,
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

  const handleShowMore = () => {
    const increment = isMobile ? 2 : 3;
    const defaultVisible = isMobile ? 1 : 3;
    if (visibleWeeks >= generatedCourseWeeks.length) {
      setVisibleWeeks(defaultVisible);
    } else {
      setVisibleWeeks(prev => Math.min(prev + increment, generatedCourseWeeks.length));
    }
  };

  const handleEditTime = () => {
    if (isMultiDayCourse && generatedCourseWeeks.length > 0) {
      // Find the next upcoming week (marked with isNext)
      const nextWeek = generatedCourseWeeks.find(w => w.isNext);
      if (nextWeek) {
        // Make sure it's visible
        const weekIndex = generatedCourseWeeks.findIndex(w => w.id === nextWeek.id);
        if (weekIndex >= visibleWeeks) {
          setVisibleWeeks(weekIndex + 1);
        }
        // Open the accordion
        setExpandedItem(nextWeek.id);
        // Scroll to kursplan section smoothly
        setTimeout(() => {
          kursplanRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    } else {
      // Single course - go to settings tab
      setActiveTab('settings');
    }
  };

  // Handle quick image upload from overview placeholder
  const handleQuickImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    // Validate file type
    const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!acceptedTypes.includes(file.type)) {
      setSaveError('Ugyldig filtype. Bruk JPG, PNG eller WebP.');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setSaveError('Bildet er for stort. Maks 5MB.');
      return;
    }

    setIsUploadingQuickImage(true);
    setSaveError(null);

    try {
      const { url, error: uploadError } = await uploadCourseImage(id, file);
      if (uploadError) {
        setSaveError(uploadError.message);
        return;
      }

      // Update course with new image URL
      const { error: updateError } = await updateCourse(id, { image_url: url });
      if (updateError) {
        setSaveError(updateError.message || 'Kunne ikke lagre bildet');
        return;
      }

      // Update local state
      setCourseData(prev => prev ? { ...prev, imageUrl: url || null } : null);
      setSettingsImageUrl(url);
      toast.success('Bilde lastet opp');
    } catch {
      setSaveError('En feil oppstod under opplasting');
    } finally {
      setIsUploadingQuickImage(false);
      // Reset input so same file can be selected again
      if (quickImageInputRef.current) {
        quickImageInputRef.current.value = '';
      }
    }
  };

  const spotsLeft = course.capacity - course.enrolled;

  // Map participants from database to display format
  const displayParticipants = participants.map(signup => ({
    id: signup.id,
    name: signup.participant_name || signup.profile?.name || 'Ukjent',
    email: signup.participant_email || signup.profile?.email || '',
    status: signup.status as SignupStatus,
    paymentStatus: signup.payment_status as PaymentStatus,
    notes: signup.note || undefined,
    receiptUrl: signup.stripe_receipt_url || undefined
  }));

  // Filter participants based on search and filters
  const filteredParticipants = displayParticipants.filter((p) => {
    const matchesSearch = searchQuery === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || p.paymentStatus === paymentFilter;
    return matchesSearch && matchesStatus && matchesPayment;
  });

  const activeFiltersCount = (statusFilter !== 'all' ? 1 : 0) + (paymentFilter !== 'all' ? 1 : 0);

  const clearFilters = () => {
    setStatusFilter('all');
    setPaymentFilter('all');
  };

  return (
    <SidebarProvider>
      <TeacherSidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-surface">

        {/* Header Section */}
        <header className="bg-white border-b border-border pt-6 pb-0 px-6 lg:px-10 shrink-0 z-10">
          <div className="max-w-6xl mx-auto w-full">
            {/* Breadcrumbs & Actions */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <a href="/teacher/courses" className="hover:text-text-primary ios-ease">Kurs</a>
                  <ChevronRight className="h-3 w-3 text-text-tertiary" />
                  <span className="text-text-primary font-medium">{course.title}</span>
                </nav>
                <h1 className="font-geist text-2xl font-medium tracking-tight text-text-primary">
                  {course.title}
                </h1>
              </div>
              <div className="flex items-center gap-3">
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
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-8" role="tablist">
              <button
                role="tab"
                aria-selected={activeTab === 'overview'}
                onClick={() => setActiveTab('overview')}
                className={`pb-3 text-sm font-medium ios-ease ${
                  activeTab === 'overview'
                    ? 'text-text-primary border-b-2 border-text-primary'
                    : 'text-muted-foreground hover:text-text-primary'
                }`}
              >
                Oversikt
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'participants'}
                onClick={() => setActiveTab('participants')}
                className={`pb-3 text-sm font-medium ios-ease flex items-center gap-1.5 ${
                  activeTab === 'participants'
                    ? 'text-text-primary border-b-2 border-text-primary'
                    : 'text-muted-foreground hover:text-text-primary'
                }`}
              >
                Deltakere
                <span className="px-2 py-0.5 rounded-full bg-surface-elevated text-xs text-muted-foreground">
                  {course.enrolled}
                </span>
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'settings'}
                onClick={() => setActiveTab('settings')}
                className={`pb-3 text-sm font-medium ios-ease ${
                  activeTab === 'settings'
                    ? 'text-text-primary border-b-2 border-text-primary'
                    : 'text-muted-foreground hover:text-text-primary'
                }`}
              >
                Innstillinger
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10" role="tabpanel">
          <div className="max-w-6xl mx-auto w-full">
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
                  courseId={id!}
                  organizationSlug={currentOrganization?.slug}
                  spotsLeft={spotsLeft}
                  isMultiDayCourse={isMultiDayCourse}
                  sessionLabel={sessionLabel}
                  sessionLabelPlural={sessionLabelPlural}
                  generatedCourseWeeks={generatedCourseWeeks}
                  visibleWeeks={visibleWeeks}
                  expandedItem={expandedItem}
                  sessionEdits={sessionEdits}
                  savingSessionId={savingSessionId}
                  hasRealSessions={hasRealSessions}
                  isMobile={isMobile}
                  organizationId={currentOrganization?.id}
                  isUploadingQuickImage={isUploadingQuickImage}
                  quickImageInputRef={quickImageInputRef}
                  onShowMore={handleShowMore}
                  onExpandedItemChange={setExpandedItem}
                  onSessionEditChange={(weekId, field, value) => {
                    setSessionEdits(prev => ({
                      ...prev,
                      [weekId]: { ...prev[weekId], [field]: value }
                    }));
                  }}
                  onSessionEditCancel={(weekId) => {
                    setSessionEdits(prev => {
                      const newEdits = { ...prev };
                      delete newEdits[weekId];
                      return newEdits;
                    });
                    setExpandedItem(undefined);
                  }}
                  onSaveSession={handleSaveSession}
                  onQuickImageUpload={handleQuickImageUpload}
                  onEditTime={handleEditTime}
                  onCancelCourse={() => setShowCancelPreview(true)}
                  onNavigateToSettings={() => setActiveTab('settings')}
                  kursplanRef={kursplanRef}
                  formatDateRange={formatDateRange}
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
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  paymentFilter={paymentFilter}
                  onPaymentFilterChange={setPaymentFilter}
                  filteredParticipants={filteredParticipants}
                  displayParticipants={displayParticipants}
                  participantsLoading={participantsLoading}
                  activeFiltersCount={activeFiltersCount}
                  onClearFilters={clearFilters}
                  waitlist={waitlist}
                  waitlistLoading={waitlistLoading}
                  promotingId={promotingId}
                  removingId={removingId}
                  onPromote={handlePromote}
                  onRemoveFromWaitlist={handleRemoveFromWaitlist}
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
                className="max-w-6xl mx-auto"
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
                  organizationId={currentOrganization?.id}
                  excludeCourseId={id}
                  maxParticipants={maxParticipants}
                  onMaxParticipantsChange={setMaxParticipants}
                  currentEnrolled={courseData?.enrolled || 0}
                  refundPreview={refundPreview}
                  onCancelCourse={() => setShowCancelPreview(true)}
                  saveError={saveError}
                  onSave={handleSaveSettings}
                  onCancel={() => setActiveTab('overview')}
                />
              </motion.div>
            )}

            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Waitlist Promotion Dialog */}
      <AlertDialog open={showPromotionDialog} onOpenChange={setShowPromotionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send tilbud til ventelisten?</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const toPromote = Math.min(newSpotsCount, waitlist.length);
                if (toPromote === waitlist.length) {
                  return `Du har økt kapasiteten med ${newSpotsCount} ${newSpotsCount === 1 ? 'plass' : 'plasser'}. ${waitlist.length} ${waitlist.length === 1 ? 'person venter' : 'personer venter'} på ventelisten.`;
                } else {
                  return `Du har økt kapasiteten med ${newSpotsCount} ${newSpotsCount === 1 ? 'plass' : 'plasser'}. ${toPromote} av ${waitlist.length} på ventelisten kan få tilbud.`;
                }
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeclinePromotion} disabled={isPromotingWaitlist}>
              Ikke nå
            </AlertDialogCancel>
            <AlertDialogAction onClick={handlePromoteWaitlist} disabled={isPromotingWaitlist}>
              {isPromotingWaitlist ? (
                <>
                  <Spinner size="md" className="mr-2" />
                  Sender
                </>
              ) : (
                `Send tilbud (${Math.min(newSpotsCount, waitlist.length)})`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Course Preview Dialog */}
      <AlertDialog open={showCancelPreview} onOpenChange={setShowCancelPreview}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Avlys kurs</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                {refundPreview.count > 0 ? (
                  <>
                    <p>
                      {refundPreview.count} deltaker{refundPreview.count !== 1 ? 'e' : ''} vil
                      bli refundert totalt <strong>{refundPreview.totalAmount} kr</strong>
                    </p>

                    {/* Participant list */}
                    <div className="max-h-[200px] overflow-y-auto border border-border rounded-lg">
                      {refundPreview.participants.map((p) => (
                        <div key={p.id} className="flex justify-between px-3 py-2 border-b border-border last:border-b-0">
                          <span className="text-sm text-text-primary">{p.participant_name || p.participant_email}</span>
                          <span className="text-sm text-muted-foreground">{p.amount_paid} kr</span>
                        </div>
                      ))}
                    </div>

                    <p className="text-sm text-muted-foreground">
                      Alle deltakere vil bli varslet på e-post.
                    </p>
                  </>
                ) : (
                  <p>Ingen betalende deltakere å refundere. Kurset vil bli avlyst.</p>
                )}

                {/* Tip about editing instead */}
                <div className="flex items-start gap-2 p-3 bg-surface-elevated rounded-lg">
                  <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-text-secondary">Tips:</strong> Du kan også endre dato, tid eller andre detaljer i innstillinger uten å avlyse kurset.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteCourse();
              }}
              disabled={isDeleting}
              className="bg-status-error-text hover:bg-status-error-text/90"
            >
              {isDeleting ? (
                <>
                  <Spinner size="md" className="mr-2" />
                  {refundPreview.count > 0
                    ? `Behandler ${refundPreview.count} refusjon${refundPreview.count > 1 ? 'er' : ''}`
                    : 'Avlyser'}
                </>
              ) : (
                refundPreview.count > 0 ? 'Bekreft avlysning og refunder' : 'Bekreft avlysning'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
};

export default CourseDetailPage;

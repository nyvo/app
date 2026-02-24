import { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { tabVariants, tabTransition } from '@/lib/motion';
import { ExternalLink, CreditCard } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { FilterTabs, FilterTab } from '@/components/ui/filter-tabs';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { updateCourse, cancelCourse, fetchCourseSessions, updateCourseSession } from '@/services/courses';
import { uploadCourseImage, deleteCourseImage } from '@/services/storage';
import { formatDateNorwegian } from '@/utils/dateUtils';
import type { PaymentStatus } from '@/components/ui/payment-badge';
import type { SignupStatus } from '@/components/ui/status-badge';
import { ShareCoursePopover } from '@/components/ui/share-course-popover';
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
import { createStripeConnectLink } from '@/services/stripe-connect';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCourseDetail } from '@/hooks/use-course-detail';
import { CourseOverviewTab } from '@/components/teacher/CourseOverviewTab';
import { CourseParticipantsTab } from '@/components/teacher/CourseParticipantsTab';
import { CourseSettingsTab } from '@/components/teacher/CourseSettingsTab';
import { AddParticipantDialog } from '@/components/teacher/AddParticipantDialog';
import type { AudienceLevel, EquipmentInfo, PracticalInfo } from '@/types/practicalInfo';
import type { Json } from '@/types/database';
import { ARRIVAL_MINUTES_MAX, CUSTOM_BULLET_MAX_LENGTH } from '@/utils/practicalInfoUtils';

type Tab = 'overview' | 'participants' | 'settings';

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
  const kursplanRef = useRef<HTMLDivElement>(null);
  const [connectingStripe, setConnectingStripe] = useState(false);

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

  // Delete state
  const [isDeleting, setIsDeleting] = useState(false);

  // Quick image upload (from overview placeholder)
  const quickImageInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingQuickImage, setIsUploadingQuickImage] = useState(false);

  // Session editing state (kept in page since it's UI-only)
  const [sessionEdits, setSessionEdits] = useState<Record<string, { date?: Date; time?: string }>>({});
  const [savingSessionId, setSavingSessionId] = useState<string | null>(null);

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
        practicalInfo: hasPracticalInfo ? practicalInfo : null,
      } : null);
      setSettingsImageUrl(newImageUrl);

      toast.success('Endringer lagret');
    } catch {
      setSaveError('En feil oppstod');
    } finally {
      setIsSaving(false);
    }
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

  // Map participants from database to display format
  const displayParticipants = useMemo(() => participants.map(signup => ({
    id: signup.id,
    name: signup.participant_name || signup.profile?.name || 'Ukjent',
    email: signup.participant_email || signup.profile?.email || '',
    status: signup.status as SignupStatus,
    paymentStatus: signup.payment_status as PaymentStatus,
    notes: signup.note || undefined,
    receiptUrl: signup.stripe_receipt_url || undefined,
  })), [participants]);

  // Filter participants based on search and filters
  const filteredParticipants = useMemo(() => displayParticipants.filter((p) => {
    const matchesSearch = searchQuery === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || p.paymentStatus === paymentFilter;
    return matchesSearch && matchesStatus && matchesPayment;
  }), [displayParticipants, searchQuery, statusFilter, paymentFilter]);

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
            <p className="text-text-secondary">{error || `Kurset med ID "${id}" finnes ikke.`}</p>
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
                <Breadcrumb className="mb-1">
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link to="/teacher/courses">Kurs</Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{course.title}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
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

            {/* Stripe warning banner */}
            {!currentOrganization?.stripe_onboarding_complete && (
              <div className="mb-4 rounded-xl border border-zinc-200 bg-surface px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-text-tertiary shrink-0 stroke-[1.5]" />
                  <p className="text-sm text-text-secondary">
                    Kurset er ikke bookbart ennå — koble til Stripe for å motta betalinger.
                  </p>
                </div>
                <Button
                  variant="outline-soft"
                  size="xs"
                  className="shrink-0"
                  loading={connectingStripe}
                  loadingText="Koble til"
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
                  Koble til
                </Button>
              </div>
            )}

            {/* Tabs */}
            <FilterTabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
              <FilterTab value="overview">Oversikt</FilterTab>
              <FilterTab value="participants" className="flex items-center gap-1.5">
                Deltakere
                <span className="px-2.5 py-0.5 rounded-lg bg-zinc-100 text-xs font-medium text-text-primary">
                  {course.enrolled}
                </span>
              </FilterTab>
              <FilterTab value="settings">Innstillinger</FilterTab>
            </FilterTabs>
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
                  organizationSlug={currentOrganization?.slug}
                  spotsLeft={spotsLeft}
                  isMultiDayCourse={isMultiDayCourse}
                  sessionLabel={sessionLabel}
                  sessionLabelPlural={sessionLabelPlural}
                  generatedCourseWeeks={generatedCourseWeeks}
                  visibleWeeks={visibleWeeks}
                  expandedItem={expandedItem}
                  hasRealSessions={hasRealSessions}
                  isMobile={isMobile}
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
                      setExpandedItem(undefined);
                    },
                    onSaveSession: handleSaveSession,
                  }}
                  isUploadingQuickImage={isUploadingQuickImage}
                  quickImageInputRef={quickImageInputRef}
                  onShowMore={handleShowMore}
                  onExpandedItemChange={setExpandedItem}
                  onQuickImageUpload={handleQuickImageUpload}
                  onEditTime={handleEditTime}
                  onCancelCourse={() => setShowCancelPreview(true)}
                  onNavigateToSettings={() => setActiveTab('settings')}
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
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  paymentFilter={paymentFilter}
                  onPaymentFilterChange={setPaymentFilter}
                  filteredParticipants={filteredParticipants}
                  participantsLoading={participantsLoading}
                  activeFiltersCount={activeFiltersCount}
                  onClearFilters={clearFilters}
                  onOpenAddDialog={() => setAddParticipantDialogOpen(true)}

                />

                {/* Add Participant Dialog */}
                <AddParticipantDialog
                  open={addParticipantDialogOpen}
                  onOpenChange={setAddParticipantDialogOpen}
                  courseId={id!}
                  organizationId={currentOrganization?.id || ''}
                  onSuccess={refetchParticipants}
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
      </main>

      {/* Cancel Course Preview Dialog */}
      <AlertDialog open={showCancelPreview} onOpenChange={setShowCancelPreview}>
        <AlertDialogContent className="gap-0 p-0 overflow-hidden ring-1 ring-black/5 ios-ease">
          {/* Modal body */}
          <div className="p-7 space-y-6">
            <AlertDialogHeader>
              <AlertDialogTitle>Avlys kurs</AlertDialogTitle>
              <AlertDialogDescription>
                {refundPreview.count > 0
                  ? `${refundPreview.count} deltaker${refundPreview.count !== 1 ? 'e' : ''} vil bli refundert og varslet på e-post.`
                  : 'Kurset vil bli avlyst.'}
              </AlertDialogDescription>
            </AlertDialogHeader>

            {/* Participants list */}
            {refundPreview.count > 0 && (
              <div className="space-y-4">
                <div>
                  <span className="block text-xs font-medium text-text-tertiary mb-2">
                    Refunderes
                  </span>
                  <div className="rounded-2xl border border-zinc-200 bg-surface/50 overflow-hidden max-h-[200px] overflow-y-auto">
                    {refundPreview.participants.map((p, i) => (
                      <div
                        key={p.id}
                        className={cn(
                          'flex items-center justify-between px-6 py-4',
                          i < refundPreview.participants.length - 1 && 'border-b border-zinc-100'
                        )}
                      >
                        <span className="text-sm text-text-primary">{p.participant_name || p.participant_email}</span>
                        <span className="text-sm text-text-secondary tabular-nums">{p.amount_paid} kr</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Refund total */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-medium text-text-tertiary">Totalt refusjon</span>
                  <span className="text-lg font-medium text-text-primary tabular-nums">{refundPreview.totalAmount} kr</span>
                </div>
              </div>
            )}
          </div>

          {/* Frosted footer */}
          <AlertDialogFooter className="border-t border-zinc-200 bg-white/80 backdrop-blur-md p-6 flex-row justify-end gap-3 sm:space-x-0">
            <AlertDialogCancel disabled={isDeleting}>Avbryt</AlertDialogCancel>
            <Button
              variant="outline-soft"
              className="bg-status-error-bg border-status-error-border text-status-error-text hover:bg-status-error-bg/80"
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
    </SidebarProvider>
  );
};

export default CourseDetailPage;

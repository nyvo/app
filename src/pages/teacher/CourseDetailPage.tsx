import { useState, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { tabVariants, tabTransition } from '@/lib/motion';
import { ChevronRight, ExternalLink, Info } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { SidebarProvider } from '@/components/ui/sidebar';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { Button } from '@/components/ui/button';
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
import { useIsMobile } from '@/hooks/use-mobile';
import { useCourseDetail } from '@/hooks/use-course-detail';
import { CourseOverviewTab } from '@/components/teacher/CourseOverviewTab';
import { CourseParticipantsTab } from '@/components/teacher/CourseParticipantsTab';
import { CourseSettingsTab } from '@/components/teacher/CourseSettingsTab';
import { AddParticipantDialog } from '@/components/teacher/AddParticipantDialog';

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

  // Delete state
  const [isDeleting, setIsDeleting] = useState(false);

  // Quick image upload (from overview placeholder)
  const quickImageInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingQuickImage, setIsUploadingQuickImage] = useState(false);

  // Session editing state (kept in page since it's UI-only)
  const [sessionEdits, setSessionEdits] = useState<Record<string, { date?: Date; time?: string }>>({});
  const [savingSessionId, setSavingSessionId] = useState<string | null>(null);

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
  const displayParticipants = useMemo(() => participants.map(signup => ({
    id: signup.id,
    name: signup.participant_name || signup.profile?.name || 'Ukjent',
    email: signup.participant_email || signup.profile?.email || '',
    status: signup.status as SignupStatus,
    paymentStatus: signup.payment_status as PaymentStatus,
    notes: signup.note || undefined,
    receiptUrl: signup.stripe_receipt_url || undefined,
    attended: false, // Local state handled in CourseParticipantsTab if needed
  })), [participants]);

  // Attendance state (local UI state for now)
  const [attendedParticipants, setAttendedParticipants] = useState<Set<string>>(new Set());

  const handleToggleAttendance = (participantId: string) => {
    setAttendedParticipants(prev => {
      const next = new Set(prev);
      if (next.has(participantId)) {
        next.delete(participantId);
      } else {
        next.add(participantId);
      }
      return next;
    });
  };

  // Filter participants based on search and filters
  const filteredParticipants = useMemo(() => displayParticipants.map(p => ({
    ...p,
    attended: attendedParticipants.has(p.id)
  })).filter((p) => {
    const matchesSearch = searchQuery === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || p.paymentStatus === paymentFilter;
    return matchesSearch && matchesStatus && matchesPayment;
  }), [displayParticipants, searchQuery, statusFilter, paymentFilter, attendedParticipants]);

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
                  <a href="/teacher/courses" className="cursor-pointer hover:text-text-primary ios-ease">Kurs</a>
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
                className={`cursor-pointer pb-3 text-sm font-medium ios-ease ${
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
                className={`cursor-pointer pb-3 text-sm font-medium ios-ease flex items-center gap-1.5 ${
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
                className={`cursor-pointer pb-3 text-sm font-medium ios-ease ${
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
                  onToggleAttendance={handleToggleAttendance}
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
            <Button
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                handleDeleteCourse();
              }}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Spinner size="md" className="mr-2" />
                  {refundPreview.count > 0
                    ? `Behandler ${refundPreview.count} refusjon${refundPreview.count > 1 ? 'er' : ''}`
                    : 'Avlyser'}
                </>
              ) : (
                refundPreview.count > 0
                  ? `Avlys kurs og refunder ${refundPreview.totalAmount} kr`
                  : 'Avlys kurs'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
};

export default CourseDetailPage;

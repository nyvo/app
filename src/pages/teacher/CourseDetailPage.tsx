import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { nb } from 'date-fns/locale';
import { tabVariants, tabTransition, fadeVariants, fadeTransition } from '@/lib/motion';
import {
  ChevronRight,
  Calendar,
  MapPin,
  Users,
  ExternalLink,
  Filter,
  Plus,
  MoreHorizontal,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  BarChart2,
  Clock,
  Mail,
  Settings2,
  Minus,
  CalendarIcon,
  Check,
  Info,
  Loader2,
  ArrowUpCircle,
  Trash2,
  Send,
  Image
} from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchInput } from '@/components/ui/search-input';
import { fetchCourseById, updateCourse, cancelCourse, fetchCourseSessions, updateCourseSession, type CourseWithStyle } from '@/services/courses';
import { fetchSignupsByCourseWithProfiles, type SignupWithProfile } from '@/services/signups';
import { fetchCourseWaitlist, promoteFromWaitlist, removeFromWaitlist, type WaitlistSignup } from '@/services/waitlist';
import { uploadCourseImage, deleteCourseImage } from '@/services/storage';
import { ImageUpload } from '@/components/ui/image-upload';
import type { CourseSession } from '@/types/database';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { TIME_SLOTS_DEFAULT } from '@/utils/timeSlots';
import { formatDateNorwegian } from '@/utils/dateUtils';
import { ParticipantAvatar } from '@/components/ui/participant-avatar';
import { PaymentBadge, type PaymentStatus } from '@/components/ui/payment-badge';
import { StatusBadge, type SignupStatus } from '@/components/ui/status-badge';
import { NotePopover } from '@/components/ui/note-popover';
import { ShareCoursePopover } from '@/components/ui/share-course-popover';
import { useAuth } from '@/contexts/AuthContext';

type Tab = 'overview' | 'participants' | 'settings';

const timeSlots = TIME_SLOTS_DEFAULT;

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
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SignupStatus | 'all'>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | 'all'>('all');
  const [_startDate, _setStartDate] = useState<Date | undefined>(new Date());
  const [expandedItem, setExpandedItem] = useState<string | undefined>(undefined);
  const [openTimePopovers, setOpenTimePopovers] = useState<Record<string, boolean>>({});
  const [visibleWeeks, setVisibleWeeks] = useState(3);
  const [settingsTime, setSettingsTime] = useState('09:00');
  const [isSettingsTimeOpen, setIsSettingsTimeOpen] = useState(false);
  const [settingsDate, setSettingsDate] = useState<Date | undefined>(new Date());
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

        // Initialize settings form state
        setSettingsTitle(mappedCourse.title);
        setSettingsDescription(mappedCourse.description || '');
        setSettingsImageUrl(mappedCourse.imageUrl);

        // Parse time from time_schedule (e.g., "Tirsdager, 18:00" -> "18:00")
        const timeMatch = mappedCourse.timeSchedule.match(/(\d{1,2}:\d{2})/);
        if (timeMatch) {
          setSettingsTime(timeMatch[1]);
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
      if (imageToDelete) {
        await deleteCourseImage(imageToDelete);
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
        setShowDeleteConfirm(false);
        return;
      }

      // Show success message with details
      const message = result
        ? `Kurset er avlyst. ${result.refunds_processed} refusjoner behandlet, ${result.notifications_sent} deltakere varslet.`
        : 'Kurset er avlyst.';

      toast.success('Kurs avlyst');
      // Navigate to courses list on success
      navigate('/teacher/courses', { state: { message } });
    } catch {
      setSaveError('En feil oppstod ved avlysning');
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <SidebarProvider>
        <TeacherSidebar />
        <main className="flex-1 flex items-center justify-center h-screen bg-surface">
          <Loader2 className="h-8 w-8 animate-spin text-text-tertiary" />
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

  const handleTimeSelect = (weekId: string, time: string) => {
    // Update session edits
    setSessionEdits(prev => ({
      ...prev,
      [weekId]: { ...prev[weekId], time }
    }));
    setOpenTimePopovers(prev => ({ ...prev, [weekId]: false }));
  };

  const toggleTimePopover = (weekId: string, isOpen: boolean) => {
    setOpenTimePopovers(prev => ({ ...prev, [weekId]: isOpen }));
  };

  const handleShowMore = () => {
    if (visibleWeeks >= generatedCourseWeeks.length) {
      setVisibleWeeks(3);
    } else {
      setVisibleWeeks(prev => Math.min(prev + 3, generatedCourseWeeks.length));
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
      setCourseData(prev => prev ? { ...prev, imageUrl: url || undefined } : null);
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

        {/* Header Section - same bg as sidebar */}
        <header className="bg-sidebar border-b border-gray-100 px-6 py-5 shrink-0 z-10">
          <div className="max-w-7xl mx-auto w-full">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
              <a href="/teacher/courses" className="hover:text-text-primary transition-colors">Kurs</a>
              <ChevronRight className="h-3 w-3 text-text-tertiary" />
              <span className="font-medium text-text-primary">{course.title}</span>
            </nav>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-baseline gap-3">
                <h1 className="font-geist text-2xl font-medium text-text-primary tracking-tight">{course.title}</h1>
                {course.status === 'active' && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xxs font-medium bg-status-confirmed-bg text-status-confirmed-text border border-status-confirmed-border translate-y-[-2px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-success mr-1.5"></span>
                    Aktiv
                  </span>
                )}
                {course.status === 'upcoming' && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xxs font-medium bg-status-waitlist-bg text-status-waitlist-text border border-status-waitlist-border translate-y-[-2px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-warning mr-1.5"></span>
                    Kommende
                  </span>
                )}
                {course.status === 'completed' && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xxs font-medium bg-surface-elevated text-muted-foreground translate-y-[-2px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary mr-1.5"></span>
                    Fullført
                  </span>
                )}
                {course.status === 'draft' && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xxs font-medium bg-surface-elevated text-muted-foreground translate-y-[-2px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-text-tertiary mr-1.5"></span>
                    Utkast
                  </span>
                )}
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

            {/* Tabs Navigation */}
            <div className="flex gap-6 mt-8 -mb-5 overflow-x-auto">
              <button
                onClick={() => setActiveTab('overview')}
                className={`tab-btn group relative pb-3 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'overview' ? 'text-text-primary' : 'text-muted-foreground hover:text-text-primary'
                }`}
              >
                Oversikt
                <span className={`absolute bottom-0 left-0 h-[2px] w-full bg-text-primary rounded-t-full transition-transform ${
                  activeTab === 'overview' ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-50'
                }`}></span>
              </button>
              <button
                onClick={() => setActiveTab('participants')}
                className={`tab-btn group relative pb-3 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'participants' ? 'text-text-primary' : 'text-muted-foreground hover:text-text-primary'
                }`}
              >
                Deltakere
                <span className={`absolute bottom-0 left-0 h-[2px] w-full bg-text-primary rounded-t-full transition-transform ${
                  activeTab === 'participants' ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-50'
                }`}></span>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`tab-btn group relative pb-3 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'settings' ? 'text-text-primary' : 'text-muted-foreground hover:text-text-primary'
                }`}
              >
                Innstillinger
                <span className={`absolute bottom-0 left-0 h-[2px] w-full bg-text-primary rounded-t-full transition-transform ${
                  activeTab === 'settings' ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-50'
                }`}></span>
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto pb-10">
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
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 auto-rows-min"
              >

                {/* 1. Date Card */}
                <div className="bg-white rounded-xl p-5 shadow-sm flex flex-col justify-between h-32 hover:shadow-md ios-ease col-span-1">
                  <div className="flex items-start justify-between">
                    <div className="h-8 w-8 rounded-lg bg-surface flex items-center justify-center text-text-secondary">
                      <Calendar className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <span className="text-xxs font-medium text-text-tertiary uppercase tracking-wider">Periode</span>
                    {formatDateRange(course.startDate, course.endDate) ? (
                      <div className="mt-0.5">
                        <p className="text-sm font-semibold text-text-primary">{formatDateRange(course.startDate, course.endDate)}</p>
                        {course.date && <p className="text-xs text-muted-foreground mt-0.5">{course.date}</p>}
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-text-primary mt-0.5">{course.date || 'Ikke angitt'}</p>
                    )}
                  </div>
                </div>

                {/* 2. Location Card */}
                <div className="bg-white rounded-xl p-5 shadow-sm flex flex-col justify-between h-32 hover:shadow-md ios-ease col-span-1">
                  <div className="flex items-start justify-between">
                    <div className="h-8 w-8 rounded-lg bg-surface flex items-center justify-center text-text-secondary">
                      <MapPin className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <span className="text-xxs font-medium text-text-tertiary uppercase tracking-wider">Sted</span>
                    <p className="text-sm font-semibold text-text-primary mt-0.5">{course.location}</p>
                  </div>
                </div>

                {/* 3. Occupancy Card (Wide) */}
                <div className="bg-white rounded-xl p-5 shadow-sm flex flex-col justify-between h-32 hover:shadow-md ios-ease col-span-1 md:col-span-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-surface flex items-center justify-center text-text-secondary">
                        <Users className="h-4 w-4" />
                      </div>
                      <span className="text-xxs font-medium text-text-tertiary uppercase tracking-wider">Påmeldinger</span>
                    </div>
                    <span className="inline-flex items-center px-2 py-1 rounded bg-status-confirmed-bg text-status-confirmed-text text-xxs font-semibold tracking-wide">
                      {spotsLeft} {spotsLeft === 1 ? 'plass' : 'plasser'} igjen
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-end justify-between">
                      <span className="text-2xl font-semibold text-text-primary tracking-tight">{course.enrolled}</span>
                      <span className="text-xs text-muted-foreground font-medium">Kap: {course.capacity}</span>
                    </div>
                    <div className="h-2 w-full bg-surface-elevated rounded-full overflow-hidden">
                      <div
                        className="h-full bg-text-primary rounded-full"
                        style={{ width: `${(course.enrolled / course.capacity) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* 4. About the Class (Large 2x2) */}
                <div className="bg-white rounded-xl shadow-sm flex flex-col col-span-1 md:col-span-2 row-span-2 overflow-hidden">
                  {/* Course Image */}
                  {course.imageUrl ? (
                    <div className="w-full h-40 overflow-hidden">
                      <img
                        src={course.imageUrl}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <>
                      <input
                        ref={quickImageInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleQuickImageUpload}
                        className="hidden"
                      />
                      <div
                        className="w-full h-40 bg-surface-elevated/30 flex flex-col items-center justify-center border-b border-gray-100 cursor-pointer hover:bg-surface-elevated/50 transition-colors group"
                        onClick={() => !isUploadingQuickImage && quickImageInputRef.current?.click()}
                      >
                        {isUploadingQuickImage ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-xs font-medium">Laster opp...</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-muted-foreground group-hover:text-text-primary transition-colors">
                            <div className="p-2 rounded-full bg-white shadow-sm group-hover:shadow-md transition-shadow">
                              <Image className="h-4 w-4" />
                            </div>
                            <span className="text-xs font-medium">Legg til bilde</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  <div className="p-6 flex flex-col flex-1">
                    <div className="mb-4">
                      <h3 className="text-base font-semibold text-text-primary">Om timen</h3>
                    </div>
                    <div className="flex-1">
                      {course.description ? (
                        <>
                          <p className="text-sm text-text-secondary leading-relaxed mb-4">
                            {course.description}
                          </p>
                          {course.description2 && (
                            <p className="text-sm text-text-secondary leading-relaxed">
                              {course.description2}
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full min-h-[140px] text-center py-4">
                          <div className="mb-3 rounded-full bg-surface p-3 border border-surface-elevated">
                            <Info className="h-5 w-5 text-text-tertiary stroke-[1.5]" />
                          </div>
                          <h4 className="text-sm font-medium text-text-primary mb-1">Ingen beskrivelse</h4>
                          <p className="text-xs text-muted-foreground max-w-[240px] mb-4">
                            Legg til en beskrivelse for å fortelle deltakerne hva kurset handler om.
                          </p>
                          <Button 
                            variant="outline-soft" 
                            size="compact" 
                            onClick={() => setActiveTab('settings')}
                          >
                            Legg til beskrivelse
                          </Button>
                        </div>
                      )}
                    </div>

                  <div className="mt-6 pt-6 border-t border-gray-100 flex gap-3 flex-wrap">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-sidebar text-xs font-medium text-text-secondary">
                        <BarChart2 className="h-3.5 w-3.5 text-text-tertiary" />
                        Nivå: {course.level}
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-sidebar text-xs font-medium text-text-secondary">
                        <Clock className="h-3.5 w-3.5 text-text-tertiary" />
                        Varighet: {course.duration}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Admin Actions Card */}
                <div className="bg-white rounded-xl p-5 shadow-sm flex flex-col justify-between col-span-2 row-span-2">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wide">Administrasjon</h3>
                      <Settings2 className="h-4 w-4 text-text-tertiary" />
                    </div>
                    <div className="mb-5">
                      <span className="text-xxs text-muted-foreground font-medium">Pris</span>
                      <p className="text-xl font-semibold text-text-primary tracking-tight">{course.price} NOK</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button
                      variant="outline-soft"
                      size="compact"
                      className="w-full justify-center"
                      disabled={course.enrolled === 0}
                    >
                      <Mail className="h-3 w-3" />
                      Send melding til deltakere
                    </Button>
                    <Button variant="outline-soft" size="compact" className="w-full justify-center" onClick={handleEditTime}>
                      <Clock className="h-3 w-3" />
                      Endre time
                    </Button>
                  </div>
                </div>

                {/* Course Plan - Only show for multi-day courses */}
                {isMultiDayCourse && generatedCourseWeeks.length > 0 && (
                  <div ref={kursplanRef} className="col-span-full mt-2">
                    <div className="bg-white rounded-xl p-6 shadow-sm">
                      <div className="mb-6">
                        <h2 className="text-base font-semibold text-text-primary">Kursplan ({generatedCourseWeeks.length} {sessionLabelPlural})</h2>
                      </div>

                      <div className="relative">
                        {/* Timeline Line */}
                        <div className="absolute left-[27px] top-4 bottom-4 w-[1px] bg-border -z-10"></div>

                        <Accordion type="single" collapsible className="space-y-3" value={expandedItem} onValueChange={setExpandedItem}>
                          {generatedCourseWeeks.slice(0, visibleWeeks).map((week) => (
                          <AccordionItem
                            key={week.id}
                            value={week.id}
                            className={`group rounded-xl border transition-all hover:shadow-sm ${
                              week.isNext
                                ? 'border-gray-400 bg-surface-elevated shadow-sm ring-2 ring-gray-200'
                                : week.status === 'upcoming'
                                ? 'border-gray-100 bg-white/50 hover:bg-white hover:shadow-md'
                                : 'border-gray-100 bg-white hover:shadow-md'
                            }`}
                          >
                            <div className="flex items-center px-4 cursor-pointer" onClick={() => setExpandedItem(expandedItem === week.id ? undefined : week.id)}>
                              <div className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg mr-4 ${
                                week.isNext
                                  ? 'bg-gray-900 text-white shadow-sm'
                                  : 'bg-surface-elevated text-muted-foreground group-hover:bg-white transition-colors'
                              }`}>
                                <span className={`text-xxs font-medium uppercase ${week.isNext ? 'opacity-80' : ''}`}>{sessionLabel}</span>
                                <span className="font-geist text-lg font-semibold">{week.weekNum}</span>
                              </div>

                              <div className="flex-1 py-4">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <h3 className={`text-sm font-semibold ${week.status === 'completed' ? 'text-muted-foreground line-through decoration-text-tertiary' : 'text-text-primary'}`}>
                                    {week.title}
                                  </h3>
                                  {week.status === 'completed' && (
                                    <span className="rounded-md bg-surface-elevated px-1.5 py-0.5 text-xxs font-medium text-muted-foreground">Fullført</span>
                                  )}
                                  {week.isNext && (
                                    <span className="rounded-md bg-status-confirmed-bg px-1.5 py-0.5 text-xxs font-medium text-status-confirmed-text animate-pulse">Neste time</span>
                                  )}
                                </div>
                                <div className={`flex items-center gap-3 text-xs ${week.status === 'completed' ? 'text-text-tertiary' : 'text-muted-foreground'}`}>
                                  <span>{week.time}</span>
                                  <span className={`w-1 h-1 rounded-full ${week.status === 'completed' ? 'bg-ring' : 'bg-text-tertiary'}`}></span>
                                  <span>{week.date}</span>
                                </div>
                              </div>

                              <AccordionTrigger className="p-2 text-muted-foreground hover:bg-surface-elevated hover:text-text-primary rounded-lg transition-all hover:no-underline [&>svg]:h-4 [&>svg]:w-4">
                                <span className="sr-only">Rediger</span>
                              </AccordionTrigger>
                            </div>

                            <AccordionContent className="px-4 pb-4 pt-0">
                              <div className="pl-[72px] pt-2 space-y-4">
                                <div className="h-px w-full bg-surface-elevated mb-4"></div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-xs font-medium text-sidebar-foreground mb-1.5">
                                      Dato
                                    </label>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <button
                                          type="button"
                                          className="flex items-center justify-between w-full rounded-xl border-0 py-2.5 px-3 text-text-primary shadow-sm ring-1 ring-inset ring-border hover:ring-ring focus:ring-1 focus:ring-inset focus:ring-primary/20 focus:border-primary text-sm bg-white transition-all text-left"
                                        >
                                          <span>
                                            {sessionEdits[week.id]?.date
                                              ? formatDateNorwegian(sessionEdits[week.id].date!)
                                              : week.date}
                                          </span>
                                          <CalendarIcon className="h-4 w-4 text-text-tertiary" />
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent align="start" className="p-0" showOverlay>
                                        <CalendarComponent
                                          mode="single"
                                          selected={sessionEdits[week.id]?.date || (week.originalDate ? new Date(week.originalDate) : new Date())}
                                          onSelect={(date) => {
                                            if (date) {
                                              setSessionEdits(prev => ({
                                                ...prev,
                                                [week.id]: { ...prev[week.id], date }
                                              }));
                                            }
                                          }}
                                          locale={nb}
                                          className="rounded-md border"
                                        />
                                      </PopoverContent>
                                    </Popover>
                                  </div>

                                  <div>
                                    <label className="block text-xs font-medium text-sidebar-foreground mb-1.5">
                                      Tidspunkt
                                    </label>
                                    <Popover open={openTimePopovers[week.id]} onOpenChange={(isOpen) => toggleTimePopover(week.id, isOpen)}>
                                      <PopoverTrigger asChild>
                                        <button
                                          type="button"
                                          className="flex items-center justify-between w-full rounded-xl border-0 py-2.5 px-3 text-text-primary shadow-sm ring-1 ring-inset ring-border hover:ring-ring focus:ring-1 focus:ring-inset focus:ring-primary/20 focus:border-primary text-sm bg-white transition-all text-left"
                                        >
                                          <span className="text-text-primary">
                                            {sessionEdits[week.id]?.time || week.time.split(' - ')[0]}
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-text-tertiary" />
                                            <ChevronDown className={`h-4 w-4 text-text-tertiary transition-transform ${openTimePopovers[week.id] ? 'rotate-180' : ''}`} />
                                          </div>
                                        </button>
                                      </PopoverTrigger>
                                      <PopoverContent align="start" className="w-[200px] p-2 max-h-[280px] overflow-y-auto custom-scrollbar" showOverlay>
                                        <div className="flex flex-col gap-0.5">
                                          {timeSlots.map((time) => {
                                            const currentTime = sessionEdits[week.id]?.time || week.time;
                                            return (
                                            <button
                                              key={time}
                                              type="button"
                                              onClick={() => handleTimeSelect(week.id, time)}
                                              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                                                currentTime.startsWith(time)
                                                  ? 'bg-text-primary text-white'
                                                  : 'text-sidebar-foreground hover:bg-surface-elevated'
                                              }`}
                                            >
                                              <span>{time}</span>
                                              {currentTime.startsWith(time) && <Check className="h-4 w-4" />}
                                            </button>
                                            );
                                          })}
                                        </div>
                                      </PopoverContent>
                                    </Popover>
                                  </div>
                                </div>

                                <div className="flex items-start gap-2 p-3 rounded-lg bg-surface text-xs text-muted-foreground">
                                  <Info className="h-4 w-4 shrink-0 mt-0.5 text-text-tertiary" />
                                  <p>Endringer i tid eller sted vil automatisk bli sendt på e-post til alle påmeldte deltakere.</p>
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                  <button
                                    onClick={() => {
                                      // Clear edits for this session and close
                                      setSessionEdits(prev => {
                                        const newEdits = { ...prev };
                                        delete newEdits[week.id];
                                        return newEdits;
                                      });
                                      setExpandedItem(undefined);
                                    }}
                                    className="text-xs font-medium text-muted-foreground hover:text-text-primary px-3 py-2 rounded-lg hover:bg-surface-elevated transition-colors"
                                    disabled={savingSessionId === week.id}
                                  >
                                    Avbryt
                                  </button>
                                  <button
                                    onClick={() => handleSaveSession(week.id)}
                                    disabled={savingSessionId === week.id || !hasRealSessions || !sessionEdits[week.id]}
                                    className="rounded-lg bg-text-primary px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-sidebar-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                  >
                                    {savingSessionId === week.id ? (
                                      <>
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Lagrer...
                                      </>
                                    ) : (
                                      'Lagre endringer'
                                    )}
                                  </button>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>

                        {generatedCourseWeeks.length > 3 && (
                          <button
                            onClick={handleShowMore}
                            className="flex w-full items-center justify-center gap-2 rounded-full border border-dashed border-ring py-3 text-xs font-medium text-muted-foreground hover:bg-surface-elevated hover:text-text-primary transition-colors mt-3"
                          >
                            {visibleWeeks >= generatedCourseWeeks.length ? (
                              <>
                                <ChevronUp className="h-3.5 w-3.5" />
                                Vis mindre
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3.5 w-3.5" />
                                Vis {Math.min(3, generatedCourseWeeks.length - visibleWeeks)} {sessionLabelPlural} til
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
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
                className="flex flex-col gap-4"
              >

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                  <div className="relative w-full sm:w-80">
                    <SearchInput
                      value={searchQuery}
                      onChange={setSearchQuery}
                      placeholder="Søk etter deltaker..."
                      aria-label="Søk etter deltaker"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline-soft" size="compact" className="relative">
                          <Filter className="h-3.5 w-3.5" />
                          Filter
                          {activeFiltersCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-text-primary text-xxs font-medium text-white flex items-center justify-center shadow-sm">
                              {activeFiltersCount}
                            </span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-64 p-0 rounded-xl">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                          <span className="text-sm font-medium text-text-primary">Filter</span>
                          {activeFiltersCount > 0 && (
                            <button
                              onClick={clearFilters}
                              className="text-xs font-medium text-muted-foreground hover:text-text-primary transition-colors"
                            >
                              Nullstill
                            </button>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-5">
                          {/* Status Section */}
                          <div>
                            <p className="text-xxs font-semibold uppercase tracking-wide text-text-tertiary mb-2.5">
                              Status
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {([
                                { value: 'all', label: 'Alle' },
                                { value: 'confirmed', label: 'Påmeldt' },
                                { value: 'waitlist', label: 'Venteliste' },
                                { value: 'cancelled', label: 'Avbestilt' },
                              ] as const).map((option) => (
                                <button
                                  key={option.value}
                                  onClick={() => setStatusFilter(option.value)}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                    statusFilter === option.value
                                      ? 'bg-gray-900 text-white shadow-sm'
                                      : 'bg-surface-elevated text-text-secondary hover:bg-surface hover:text-text-primary'
                                  }`}
                                >
                                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                    statusFilter === option.value ? 'bg-white' : 'bg-text-tertiary'
                                  }`} />
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Payment Section */}
                          <div>
                            <p className="text-xxs font-semibold uppercase tracking-wide text-text-tertiary mb-2.5">
                              Betaling
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {([
                                { value: 'all', label: 'Alle' },
                                { value: 'paid', label: 'Betalt' },
                                { value: 'pending', label: 'Venter' },
                              ] as const).map((option) => (
                                <button
                                  key={option.value}
                                  onClick={() => setPaymentFilter(option.value)}
                                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                    paymentFilter === option.value
                                      ? 'bg-gray-900 text-white shadow-sm'
                                      : 'bg-surface-elevated text-text-secondary hover:bg-surface hover:text-text-primary'
                                  }`}
                                >
                                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                    paymentFilter === option.value ? 'bg-white' : 'bg-text-tertiary'
                                  }`} />
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Button size="compact">
                      <Plus className="h-4 w-4" />
                      Legg til deltaker
                    </Button>
                  </div>
                </div>

                {/* Table Container */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-gray-100 bg-surface/50">
                          <th className="py-3 px-6 text-xxs font-semibold text-muted-foreground uppercase tracking-wide">Navn</th>
                          <th className="py-3 px-6 text-xxs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                          <th className="py-3 px-6 text-xxs font-semibold text-muted-foreground uppercase tracking-wide">Betalt</th>
                          <th className="py-3 px-6 text-xxs font-semibold text-muted-foreground uppercase tracking-wide">Kvittering</th>
                          <th className="py-3 px-6 text-xxs font-semibold text-muted-foreground uppercase tracking-wide text-right">Notater</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {participantsLoading ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center">
                              <Loader2 className="h-6 w-6 animate-spin text-text-tertiary mx-auto mb-2" />
                              <p className="text-sm text-muted-foreground">Laster deltakere...</p>
                            </td>
                          </tr>
                        ) : filteredParticipants.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-12 text-center">
                              <p className="text-sm text-muted-foreground">Ingen deltakere funnet</p>
                              {activeFiltersCount > 0 && (
                                <button
                                  onClick={clearFilters}
                                  className="mt-2 text-xs text-primary hover:underline"
                                >
                                  Nullstill filter
                                </button>
                              )}
                            </td>
                          </tr>
                        ) : (
                          filteredParticipants.map((participant) => (
                            <tr key={participant.id} className="group hover:bg-secondary transition-colors">
                              {/* Navn */}
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-3">
                                  <ParticipantAvatar participant={participant} size="sm" showPhoto={false} />
                                  <div>
                                    <p className="text-sm font-medium text-text-primary">{participant.name}</p>
                                    <p className="text-xs text-muted-foreground">{participant.email}</p>
                                  </div>
                                </div>
                              </td>
                              {/* Status (attendance) */}
                              <td className="py-4 px-6">
                                <StatusBadge status={participant.status} />
                              </td>
                              {/* Betalt (payment) */}
                              <td className="py-4 px-6">
                                <PaymentBadge status={participant.paymentStatus} />
                              </td>
                              {/* Kvittering (receipt) */}
                              <td className="py-4 px-6">
                                {participant.receiptUrl ? (
                                  <a
                                    href={participant.receiptUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    Se kvittering
                                  </a>
                                ) : (
                                  <span className="text-text-tertiary text-xs">—</span>
                                )}
                              </td>
                              {/* Notater */}
                              <td className="py-4 px-6 text-right">
                                {participant.notes ? (
                                  <NotePopover note={participant.notes} />
                                ) : (
                                  <span className="text-text-tertiary">—</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-6 py-3 border-t border-gray-100 bg-surface/50 flex items-center justify-between">
                    <span className="text-xxs text-muted-foreground">Viser <span className="font-medium text-text-primary">{filteredParticipants.length}</span> av <span className="font-medium text-text-primary">{displayParticipants.length}</span> deltakere</span>
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 rounded-lg bg-white shadow-sm hover:shadow-md hover:text-text-primary text-text-tertiary disabled:opacity-50 transition-all" disabled>
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button className="p-1.5 rounded-lg bg-white shadow-sm hover:shadow-md text-text-primary transition-all">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Waitlist Section */}
                {(waitlist.length > 0 || waitlistLoading) && (
                  <div className="bg-white rounded-xl shadow-sm overflow-hidden mt-6">
                    <div className="px-6 py-4 border-b border-gray-100 bg-status-waitlist-bg/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-text-primary">Venteliste</h3>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xxs font-medium bg-status-waitlist-bg text-status-waitlist-text border border-status-waitlist-border">
                            {waitlist.length} {waitlist.length === 1 ? 'person' : 'personer'}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Deltakere som venter på ledig plass. Send tilbud for å gi dem mulighet til å betale.
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-gray-100 bg-surface/50">
                            <th className="py-3 px-6 text-xxs font-semibold text-muted-foreground uppercase tracking-wide w-12">#</th>
                            <th className="py-3 px-6 text-xxs font-semibold text-muted-foreground uppercase tracking-wide">Navn</th>
                            <th className="py-3 px-6 text-xxs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                            <th className="py-3 px-6 text-xxs font-semibold text-muted-foreground uppercase tracking-wide">Tid på liste</th>
                            <th className="py-3 px-6 text-xxs font-semibold text-muted-foreground uppercase tracking-wide text-right">Handlinger</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {waitlistLoading ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center">
                                <Loader2 className="h-5 w-5 animate-spin text-text-tertiary mx-auto mb-2" />
                                <p className="text-sm text-muted-foreground">Laster venteliste...</p>
                              </td>
                            </tr>
                          ) : (
                            waitlist.map((entry) => {
                              const timeOnList = (() => {
                                const created = new Date(entry.created_at);
                                const now = new Date();
                                const diffMs = now.getTime() - created.getTime();
                                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                                const diffDays = Math.floor(diffHours / 24);
                                if (diffDays > 0) return `${diffDays}d`;
                                if (diffHours > 0) return `${diffHours}t`;
                                return 'Nå';
                              })();

                              const offerExpiry = entry.offer_expires_at ? (() => {
                                const expires = new Date(entry.offer_expires_at);
                                const now = new Date();
                                const diffMs = expires.getTime() - now.getTime();
                                if (diffMs <= 0) return 'Utløpt';
                                const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                                const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                                if (diffHours > 0) return `${diffHours}t ${diffMins}m igjen`;
                                return `${diffMins}m igjen`;
                              })() : null;

                              return (
                                <tr key={entry.id} className="group hover:bg-secondary transition-colors">
                                  <td className="py-4 px-6">
                                    <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-surface-elevated text-xs font-semibold text-text-secondary">
                                      {entry.waitlist_position}
                                    </span>
                                  </td>
                                  <td className="py-4 px-6">
                                    <div className="flex items-center gap-3">
                                      <ParticipantAvatar participant={{ name: entry.participant_name || '', email: entry.participant_email || '' }} size="sm" showPhoto={false} />
                                      <div>
                                        <p className="text-sm font-medium text-text-primary">{entry.participant_name || 'Ukjent'}</p>
                                        <p className="text-xs text-muted-foreground">{entry.participant_email}</p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-4 px-6">
                                    {entry.offer_status === 'pending' ? (
                                      <div className="flex flex-col gap-0.5">
                                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xxs font-medium bg-blue-50 text-blue-700 border border-blue-200 w-fit">
                                          <Send className="h-3 w-3" />
                                          Tilbud sendt
                                        </span>
                                        {offerExpiry && (
                                          <span className="text-xxs text-muted-foreground">{offerExpiry}</span>
                                        )}
                                      </div>
                                    ) : entry.offer_status === 'expired' ? (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xxs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                        Utløpt
                                      </span>
                                    ) : entry.offer_status === 'skipped' ? (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xxs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                        Hoppet over
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xxs font-medium bg-status-waitlist-bg text-status-waitlist-text border border-status-waitlist-border">
                                        Venter
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-4 px-6">
                                    <span className="text-sm text-muted-foreground">{timeOnList}</span>
                                  </td>
                                  <td className="py-4 px-6 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      {(!entry.offer_status || entry.offer_status === 'expired' || entry.offer_status === 'skipped') && (
                                        <Button
                                          variant="outline-soft"
                                          size="compact"
                                          onClick={() => handlePromote(entry.id)}
                                          disabled={promotingId === entry.id}
                                        >
                                          {promotingId === entry.id ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                          ) : (
                                            <ArrowUpCircle className="h-3 w-3" />
                                          )}
                                          Send tilbud
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="compact"
                                        onClick={() => handleRemoveFromWaitlist(entry.id)}
                                        disabled={removingId === entry.id}
                                        className="text-muted-foreground hover:text-status-error-text"
                                      >
                                        {removingId === entry.id ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-3 w-3" />
                                        )}
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
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
                className="max-w-7xl mx-auto"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Tile 1: Main Info (Title, Desc) - Span 2 */}
                  <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 h-full flex flex-col">
                      <div className="mb-6">
                        <h3 className="text-base font-semibold text-text-primary mb-1">Generelt</h3>
                        <p className="text-xs text-muted-foreground">Grunnleggende informasjon om kurset.</p>
                      </div>
                      
                      <div className="space-y-4 flex-1">
                          <div>
                            <label className="block text-xs font-medium text-sidebar-foreground mb-1.5">Navn på kurs</label>
                            <Input
                              type="text"
                              value={settingsTitle}
                              onChange={(e) => setSettingsTitle(e.target.value)}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-sidebar-foreground mb-1.5">Beskrivelse</label>
                            <textarea
                              rows={6}
                              className="w-full p-3 rounded-lg border-0 ring-1 ring-inset ring-border text-sm focus:outline-none focus:ring-1 focus:ring-primary/20 bg-input-bg hover:ring-ring resize-none"
                              value={settingsDescription}
                              onChange={(e) => setSettingsDescription(e.target.value)}
                            />
                          </div>
                      </div>
                  </div>

                  {/* Tile 2: Media (Image) - Span 1, Row Span 2? */}
                  <div className="lg:col-span-1 lg:row-span-2 bg-white rounded-xl shadow-sm p-6 flex flex-col h-full">
                      <div className="mb-6">
                        <h3 className="text-base font-semibold text-text-primary mb-1">Kursbilde</h3>
                        <p className="text-xs text-muted-foreground">Et bilde som representerer kurset.</p>
                      </div>
                      <div className="flex-1 min-h-[200px] flex flex-col">
                          <div className="flex-1 relative rounded-lg overflow-hidden bg-input-bg">
                            <ImageUpload
                                value={settingsImageUrl}
                                onChange={(file) => {
                                  setSettingsImageFile(file);
                                  if (!file && settingsImageUrl) {
                                    setImageToDelete(settingsImageUrl);
                                    setSettingsImageUrl(null);
                                  }
                                }}
                                onRemove={() => {
                                  if (settingsImageUrl) {
                                    setImageToDelete(settingsImageUrl);
                                    setSettingsImageUrl(null);
                                  }
                                }}
                                disabled={isSaving}
                                className="h-full w-full absolute inset-0"
                            />
                          </div>
                          <p className="mt-3 text-xs text-muted-foreground text-center">
                            Last opp et bilde i bredformat (16:9).
                          </p>
                      </div>
                  </div>

                  {/* Tile 3: Schedule - Span 1 */}
                  <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col">
                      <div className="mb-6">
                        <h3 className="text-base font-semibold text-text-primary mb-1">Tidspunkt</h3>
                        <p className="text-xs text-muted-foreground">Når kurset holdes.</p>
                      </div>
                      <div className="space-y-4 flex-1">
                          <div>
                            <label className="block text-xs font-medium text-sidebar-foreground mb-1.5">Dato</label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="flex items-center justify-between w-full h-11 rounded-xl border-0 px-4 text-text-primary shadow-sm ring-1 ring-inset ring-border hover:ring-ring focus:ring-1 focus:ring-inset focus:ring-primary/20 text-sm bg-input-bg transition-all text-left"
                                >
                                  <span>{settingsDate ? formatDateNorwegian(settingsDate) : 'Velg dato'}</span>
                                  <CalendarIcon className="h-4 w-4 text-text-tertiary" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent align="start" className="p-0" showOverlay>
                                <CalendarComponent
                                  mode="single"
                                  selected={settingsDate}
                                  onSelect={setSettingsDate}
                                  locale={nb}
                                  className="rounded-md border"
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-sidebar-foreground mb-1.5">Tidspunkt</label>
                            <Popover open={isSettingsTimeOpen} onOpenChange={setIsSettingsTimeOpen}>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="flex items-center justify-between w-full h-11 rounded-xl border-0 px-4 text-text-primary shadow-sm ring-1 ring-inset ring-border hover:ring-ring focus:ring-1 focus:ring-inset focus:ring-primary/20 text-sm bg-input-bg transition-all text-left"
                                >
                                  <span>{settingsTime || 'Velg tid'}</span>
                                  <Clock className="h-4 w-4 text-text-tertiary" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent align="start" className="w-[200px] p-2 max-h-[280px] overflow-y-auto custom-scrollbar" showOverlay>
                                <div className="flex flex-col gap-0.5">
                                  {timeSlots.map((time) => (
                                    <button
                                      key={time}
                                      type="button"
                                      onClick={() => {
                                        setSettingsTime(time);
                                        setIsSettingsTimeOpen(false);
                                      }}
                                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                                        settingsTime === time
                                          ? 'bg-text-primary text-white'
                                          : 'text-sidebar-foreground hover:bg-surface-elevated'
                                      }`}
                                    >
                                      <span>{time}</span>
                                      {settingsTime === time && <Check className="h-4 w-4" />}
                                    </button>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                      </div>
                  </div>

                  {/* Tile 4: Capacity - Span 1 */}
                  <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col">
                      <div className="mb-6">
                        <h3 className="text-base font-semibold text-text-primary mb-1">Kapasitet</h3>
                        <p className="text-xs text-muted-foreground">Begrens antall deltakere.</p>
                      </div>
                      <div className="flex-1 flex items-center justify-center">
                        <div className="flex items-center gap-4">
                            <button
                              onClick={() => setMaxParticipants(Math.max(1, maxParticipants - 1))}
                              className="h-10 w-10 rounded-lg bg-surface-elevated flex items-center justify-center hover:bg-surface text-text-secondary cursor-pointer transition-colors"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <div className="text-center">
                                <span className="block text-3xl font-bold text-text-primary tracking-tight">{maxParticipants}</span>
                                <span className="text-xxs text-muted-foreground uppercase tracking-wider font-medium">Plasser</span>
                            </div>
                            <button
                              onClick={() => setMaxParticipants(maxParticipants + 1)}
                              className="h-10 w-10 rounded-lg bg-surface-elevated flex items-center justify-center hover:bg-surface text-text-secondary cursor-pointer transition-colors"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                        </div>
                      </div>
                  </div>

                  {/* Tile 5: Danger Zone - Span 3 */}
                  <div className="lg:col-span-3 rounded-xl border border-status-error-border bg-status-error-bg/30 p-6 overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Left side: Text content */}
                      <AnimatePresence mode="wait">
                        {!showDeleteConfirm ? (
                          <motion.div
                            key="initial-text"
                            variants={fadeVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            transition={fadeTransition}
                          >
                            <h3 className="text-sm font-semibold text-status-error-text">Avlys eller slett kurs</h3>
                            <p className="text-xs text-status-error-text/80 mt-1">Dette vil varsle alle påmeldte deltakere og refundere betalinger.</p>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="confirm-text"
                            variants={fadeVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            transition={fadeTransition}
                          >
                            <h3 className="text-sm font-semibold text-status-error-text">Er du sikker?</h3>
                            <p className="text-xs text-status-error-text/80 mt-1">
                              Dette vil permanent slette kurset. Handlingen kan ikke angres.
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Right side: Buttons */}
                      <AnimatePresence mode="wait">
                        {!showDeleteConfirm ? (
                          <motion.div
                            key="initial-btn"
                            variants={fadeVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            transition={fadeTransition}
                            className="flex items-center gap-3 shrink-0"
                          >
                            <Button
                              variant="outline-soft"
                              size="compact"
                              className="border-status-error-border text-status-error-text hover:bg-status-error-bg whitespace-nowrap"
                              onClick={() => setShowDeleteConfirm(true)}
                            >
                              Slett kurs
                            </Button>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="confirm-btn"
                            variants={fadeVariants}
                            initial="initial"
                            animate="animate"
                            exit="exit"
                            transition={fadeTransition}
                            className="flex items-center gap-3 shrink-0"
                          >
                            <Button
                              variant="ghost"
                              size="compact"
                              onClick={() => setShowDeleteConfirm(false)}
                              disabled={isDeleting}
                            >
                              Avbryt
                            </Button>
                            <Button
                              variant="outline-soft"
                              size="compact"
                              className="border-status-error-border text-status-error-text hover:bg-status-error-bg whitespace-nowrap"
                              onClick={handleDeleteCourse}
                              disabled={isDeleting}
                            >
                              {isDeleting ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  Avlyser...
                                </>
                              ) : (
                                'Ja, avlys kurs'
                              )}
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  
                  {/* Actions Bar */}
                  <div className="lg:col-span-3 flex justify-end gap-3 pt-2">
                      {saveError && (
                        <div className="flex items-center gap-2 text-sm text-status-error-text bg-status-error-bg/30 border border-status-error-border rounded-lg px-4 py-2 mr-auto">
                          <Info className="h-4 w-4 shrink-0" />
                          {saveError}
                        </div>
                      )}

                    <Button
                      variant="ghost"
                      size="compact"
                      onClick={() => setActiveTab('overview')}
                      disabled={isSaving}
                    >
                      Avbryt
                    </Button>
                    <Button
                      size="compact"
                      onClick={handleSaveSettings}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Lagrer...
                        </>
                      ) : (
                        'Lagre endringer'
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            </AnimatePresence>
          </div>
        </div>
      </main>
    </SidebarProvider>
  );
};

export default CourseDetailPage;

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, CalendarPlus, Users, CalendarDays } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { pageVariants, pageTransition } from '@/lib/motion';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/user-avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { EmptyStateToggle } from '@/components/ui/EmptyStateToggle';
import { getShowEmptyState } from '@/lib/utils';
import {
  getOsloTime,
  getWeekNumber,
  getMondayOfWeek,
  generateWeekDays,
} from '@/utils/dateUtils';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCourses, fetchCourseSessions } from '@/services/courses';
import type { Course } from '@/types/database';
import { supabase } from '@/lib/supabase';
import type { CourseSession } from '@/types/database';
import { useIsMobile } from '@/hooks/use-mobile';
import { getInitials } from '@/utils/stringUtils';

// Types
interface ScheduleEvent {
  id: string;
  courseId: string; // For navigation to course detail
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  instructor: string;
  instructorAvatar?: string;
  instructorInitials?: string;
  status?: 'completed' | 'upcoming' | 'active';
  signups: number;
  maxCapacity: number | null;
}

const timeSlots = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];

// Calculate end time from start time and duration
const calculateEndTime = (startTime: string, durationMinutes: number): string => {
  const [hours, mins] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMins = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
};

// Format time to HH:MM (remove seconds if present)
const formatTime = (time: string): string => {
  // Handle both HH:MM and HH:MM:SS formats
  const parts = time.split(':');
  return `${parts[0]}:${parts[1]}`;
};

// Helper to calculate position and height
// Grid shows 06:00-22:00, so clamp events to visible area
const getEventStyle = (startTime: string, endTime: string) => {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  // Clamp to visible grid (06:00 - 23:00)
  const clampedStartHour = Math.max(startHour, 6);
  const clampedStartMin = startHour < 6 ? 0 : startMin;
  const clampedEndHour = Math.min(endHour, 23);
  const clampedEndMin = endHour >= 23 ? 0 : endMin;

  const startOffset = (clampedStartHour - 6) * 100 + (clampedStartMin / 60) * 100;
  const endOffset = (clampedEndHour - 6) * 100 + (clampedEndMin / 60) * 100;
  const duration = Math.max(endOffset - startOffset, 20); // Minimum height of 20px

  return {
    top: `${Math.max(startOffset, 0)}px`,
    height: `${duration}px`,
  };
};

// Returns inline styles for event accent border
// Event Card Component
// Uses database color for left accent border, neutral design system colors for everything else
const EventCard = ({ event }: { event: ScheduleEvent }) => {
  const positionStyle = getEventStyle(event.startTime, event.endTime);
  const isCompleted = event.status === 'completed';
  const isActive = event.status === 'active';

  return (
    <Link
      to={`/teacher/courses/${event.courseId}`}
      className={`absolute left-1 right-1 rounded-xl p-2 smooth-transition cursor-pointer group overflow-hidden block ${isCompleted ? 'bg-zinc-200 border border-zinc-200' : 'bg-surface-emphasis text-surface-emphasis-foreground hover:bg-surface-emphasis/90'} ${isActive ? 'ring-2 ring-surface-emphasis ring-offset-1' : ''}`}
      style={positionStyle}
    >
      <div className="flex justify-between items-start">
        <span className={`text-xs font-medium ${isCompleted ? 'text-text-tertiary' : 'text-surface-emphasis-foreground/70'}`}>
          {formatTime(event.startTime)} - {formatTime(event.endTime)}
        </span>
        {isCompleted && <span className="text-xs font-medium text-text-secondary">Fullført</span>}
        {isActive && (
          <span className="inline-flex items-center rounded-full bg-white/20 px-1.5 py-0.5 text-xxs font-medium text-surface-emphasis-foreground">
            Pågår
          </span>
        )}
        {!isCompleted && !isActive && (
          <Users className="h-3 w-3 text-surface-emphasis-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
      <p className={`text-sm font-medium mt-1 truncate ${isCompleted ? 'text-text-secondary' : 'text-surface-emphasis-foreground'}`}>{event.title}</p>
      <p className={`text-xs mt-0.5 ${isCompleted ? 'text-text-tertiary' : 'text-surface-emphasis-foreground/70'}`}>{event.location}</p>
      {!isCompleted && (
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <UserAvatar
              name={event.instructor}
              src={event.instructorAvatar}
              size="xxs"
              ringClassName="ring-1 ring-white/30"
            />
            <span className="text-xs text-surface-emphasis-foreground/70">{event.instructor}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3 text-surface-emphasis-foreground/50" />
            <span className="text-xs text-surface-emphasis-foreground/70">
              {event.signups}{event.maxCapacity ? `/${event.maxCapacity}` : ''}
            </span>
          </div>
        </div>
      )}
    </Link>
  );
};

// Day Column Component
const DayColumn = ({ isToday, isWeekend, events: dayEvents }: { dayIndex: number; isToday: boolean; isWeekend: boolean; events: ScheduleEvent[] }) => {
  return (
    <div className={`relative border-r border-surface-elevated ${isToday ? 'bg-surface/30' : ''} ${isWeekend ? 'bg-surface' : ''}`}>
      {/* Background grid lines */}
      <div className="absolute inset-0 flex flex-col pointer-events-none">
        {timeSlots.map((_, i) => (
          <div key={i} className="h-[100px] border-b border-surface-elevated" />
        ))}
      </div>

      {/* Events */}
      {dayEvents.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
};

// Mobile Event Card - optimized for touch with larger targets
const MobileEventCard = ({ event }: { event: ScheduleEvent }) => {
  const isCompleted = event.status === 'completed';
  const isActive = event.status === 'active';

  return (
    <Link
      to={`/teacher/courses/${event.courseId}`}
      className={`block rounded-xl p-4 smooth-transition cursor-pointer ${isCompleted ? 'bg-zinc-200 border border-zinc-200' : 'bg-white border border-zinc-200 hover:bg-zinc-50/50'} ${isActive ? 'ring-2 ring-primary ring-offset-1' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium ${isCompleted ? 'text-text-tertiary' : 'text-text-secondary'}`}>
              {formatTime(event.startTime)} - {formatTime(event.endTime)}
            </span>
            {isActive && (
              <span className="inline-flex items-center rounded-full bg-status-confirmed-bg px-2 py-0.5 text-xs font-medium text-status-confirmed-text border border-status-confirmed-border">
                Pågår
              </span>
            )}
          </div>
          <p className={`text-sm font-medium truncate ${isCompleted ? 'text-text-secondary' : 'text-text-primary'}`}>{event.title}</p>
          <p className={`text-xs mt-0.5 ${isCompleted ? 'text-text-tertiary' : 'text-text-secondary'}`}>{event.location}</p>
        </div>
        {isCompleted ? (
          <span className="text-xs font-medium text-text-secondary shrink-0">Fullført</span>
        ) : (
          <div className="flex items-center gap-1 text-xs text-text-secondary shrink-0">
            <Users className="h-4 w-4" />
            <span>{event.signups}{event.maxCapacity ? `/${event.maxCapacity}` : ''}</span>
          </div>
        )}
      </div>
    </Link>
  );
};

// Mobile Day View Component
const MobileDayView = ({
  weekDays,
  selectedDayIndex,
  onDaySelect,
  events,
  isLoading,
  error,
  onRetry,
  showEmptyState,
  hasEventsThisWeek,
  courses,
}: {
  weekDays: { name: string; date: number; isToday: boolean; isWeekend: boolean }[];
  selectedDayIndex: number;
  onDaySelect: (index: number) => void;
  events: Record<number, ScheduleEvent[]>;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  showEmptyState: boolean;
  hasEventsThisWeek: boolean;
  courses: Course[];
}) => {
  const dayEvents = events[selectedDayIndex] || [];
  const selectedDay = weekDays[selectedDayIndex];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Day Selector - Horizontal scroll */}
      <div className="border-b border-zinc-200 bg-white px-4 py-3 shrink-0">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {weekDays.map((day, index) => (
            <button
              key={day.name}
              onClick={() => onDaySelect(index)}
              className={`flex flex-col items-center justify-center min-w-[52px] h-16 rounded-xl smooth-transition cursor-pointer ${
                selectedDayIndex === index
                  ? 'bg-primary text-primary-foreground'
                  : day.isToday
                  ? 'bg-surface-elevated text-text-primary border border-border'
                  : 'bg-surface hover:bg-zinc-50 text-text-secondary'
              }`}
            >
              <span className="text-xs font-medium">
                {day.name.slice(0, 3)}
              </span>
              <span className="text-lg font-medium mt-0.5">{day.date}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto bg-surface">
        {isLoading ? (
          <PageLoader message="Laster timeplan" />
        ) : error ? (
          <div className="flex items-center justify-center h-64 p-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-status-error-bg border border-status-error-border">
                <CalendarDays className="h-7 w-7 text-status-error-text" />
              </div>
              <h3 className="text-sm font-medium text-text-primary mb-1">Noe gikk galt</h3>
              <p className="text-sm text-text-secondary mb-4">{error}</p>
              <Button onClick={onRetry} size="compact">Prøv på nytt</Button>
            </div>
          </div>
        ) : (showEmptyState || !hasEventsThisWeek) ? (
          <div className="flex items-center justify-center h-64 p-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-white border border-border">
                <CalendarDays className="h-7 w-7 text-text-tertiary" />
              </div>
              <h3 className="text-sm font-medium text-text-primary mb-1">Ingen timer denne uken</h3>
              <p className="text-sm text-text-secondary mb-4">
                {courses.length === 0
                  ? 'Opprett et kurs for å komme i gang.'
                  : 'Ingen planlagte timer denne uken.'}
              </p>
              <Button asChild size="compact" className="gap-2">
                <Link to="/teacher/new-course">
                  <CalendarPlus className="h-3.5 w-3.5" />
                  Opprett kurs
                </Link>
              </Button>
            </div>
          </div>
        ) : dayEvents.length === 0 ? (
          <div className="flex items-center justify-center h-64 p-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-white border border-border">
                <CalendarDays className="h-7 w-7 text-text-tertiary" />
              </div>
              <h3 className="text-sm font-medium text-text-primary mb-1">
                Ingen timer {selectedDay?.isToday ? 'i dag' : 'denne dagen'}
              </h3>
              <p className="text-sm text-text-secondary">
                Velg en annen dag for å se timer.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {dayEvents
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map((event) => (
                <MobileEventCard key={event.id} event={event} />
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Session with course data for transformation
interface SessionWithCourse extends CourseSession {
  course: Course;
}

export const SchedulePage = () => {
  const showEmptyState = getShowEmptyState();
  const { currentOrganization, profile } = useAuth();
  const isMobile = useIsMobile();

  // Data fetching state
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<SessionWithCourse[]>([]);
  const [signupsCounts, setSignupsCounts] = useState<Record<string, number>>({}); // courseId -> count
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mobile day selector state
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  // Initialize with current Oslo time
  const [currentTime, setCurrentTime] = useState(getOsloTime);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = last week, +1 = next week

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getOsloTime());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Calculate the Monday of the displayed week
  const displayedMonday = useMemo(() => {
    const today = getOsloTime();
    const monday = getMondayOfWeek(today);
    monday.setDate(monday.getDate() + (weekOffset * 7));
    return monday;
  }, [weekOffset]);

  // Calculate Sunday of the displayed week (for filtering)
  const displayedSunday = useMemo(() => {
    const sunday = new Date(displayedMonday);
    sunday.setDate(displayedMonday.getDate() + 6);
    return sunday;
  }, [displayedMonday]);

  // Fetch courses and sessions from database
  const loadScheduleData = useCallback(async () => {
    if (!currentOrganization) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch all courses for the organization
      const { data: coursesData, error: coursesError } = await fetchCourses(currentOrganization.id);

      if (coursesError) {
        throw coursesError;
      }

      const fetchedCourses = coursesData || [];
      setCourses(fetchedCourses);

      // Fetch sessions for all courses in parallel
      const sessionResults = await Promise.all(
        fetchedCourses.map(course => fetchCourseSessions(course.id).then(result => ({ course, result })))
      );

      const allSessions: SessionWithCourse[] = [];
      for (const { course, result } of sessionResults) {
        if (result.error || !result.data) continue;
        const sessionsWithCourse = result.data.map(session => ({
          ...session,
          course
        }));
        allSessions.push(...sessionsWithCourse);
      }

      setSessions(allSessions);

      // Fetch signups counts for all courses
      const courseIds = fetchedCourses.map(c => c.id);
      if (courseIds.length > 0) {
        const { data: signupsData } = await supabase
          .from('signups')
          .select('course_id')
          .in('course_id', courseIds)
          .eq('status', 'confirmed');

        // Count signups per course
        const counts: Record<string, number> = {};
        if (signupsData) {
          for (const signup of signupsData as unknown as { course_id: string }[]) {
            counts[signup.course_id] = (counts[signup.course_id] || 0) + 1;
          }
        }
        setSignupsCounts(counts);
      }
    } catch {
      setError('Kunne ikke laste timeplanen. Prøv på nytt.');
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization]);

  // Load data on mount and when organization changes
  useEffect(() => {
    loadScheduleData();
  }, [loadScheduleData]);

  // Filter sessions to current week and transform to events
  const currentEvents = useMemo(() => {
    // Format dates for comparison (YYYY-MM-DD)
    const mondayStr = displayedMonday.toISOString().split('T')[0];
    const sundayStr = displayedSunday.toISOString().split('T')[0];

    // Group sessions by day index (0 = Monday, 6 = Sunday)
    const eventsByDay: Record<number, ScheduleEvent[]> = {};

    for (const session of sessions) {
      const sessionDate = session.session_date;

      // Check if session is within the displayed week
      if (sessionDate < mondayStr || sessionDate > sundayStr) {
        continue;
      }

      // Calculate day index (0 = Monday)
      // Parse date parts directly to avoid timezone issues
      const [year, month, day] = sessionDate.split('-').map(Number);
      const sessionDateObj = new Date(year, month - 1, day); // month is 0-indexed
      const dayOfWeek = sessionDateObj.getDay();
      // Convert Sunday (0) to 6, Monday (1) to 0, etc.
      const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

      // Calculate end time from duration
      const duration = session.course.duration || 60;
      const endTime = session.end_time || (session.start_time ? calculateEndTime(session.start_time, duration) : null);
      if (!endTime) continue;

      // Determine session status by comparing Oslo wall-clock values
      const now = getOsloTime();
      const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const sessionStartStr = `${sessionDate}T${formatTime(session.start_time)}`;
      const sessionEndStr = `${sessionDate}T${formatTime(endTime)}`;

      let status: 'completed' | 'upcoming' | 'active' | undefined;
      if (nowStr > sessionEndStr) {
        status = 'completed';
      } else if (nowStr >= sessionStartStr && nowStr <= sessionEndStr) {
        status = 'active';
      } else {
        status = 'upcoming';
      }

      // Transform to ScheduleEvent
      const event: ScheduleEvent = {
        id: session.id,
        courseId: session.course.id,
        title: session.course.title,
        startTime: session.start_time,
        endTime: endTime,
        location: session.course.location || 'Ikke angitt',
        instructor: profile?.name || 'Instruktør',
        instructorInitials: getInitials(profile?.name),
        status: status,
        signups: signupsCounts[session.course.id] || 0,
        maxCapacity: session.course.max_participants,
      };

      if (!eventsByDay[dayIndex]) {
        eventsByDay[dayIndex] = [];
      }
      eventsByDay[dayIndex].push(event);
    }

    return eventsByDay;
  }, [sessions, displayedMonday, displayedSunday, profile, signupsCounts]);

  // Generate week days for the displayed week
  const weekDays = useMemo(() => {
    const today = getOsloTime();
    return generateWeekDays(displayedMonday, today);
  }, [displayedMonday]);

  // Auto-select today's index on mobile when viewing current week
  useEffect(() => {
    if (isMobile && weekOffset === 0) {
      const todayIndex = weekDays.findIndex(day => day.isToday);
      if (todayIndex !== -1) {
        setSelectedDayIndex(todayIndex);
      }
    }
  }, [isMobile, weekOffset, weekDays]);

  // Get the week number for display
  const displayedWeekNumber = useMemo(() => {
    return getWeekNumber(displayedMonday);
  }, [displayedMonday]);

  // Calculate position of current time indicator (in pixels from top)
  const currentTimePosition = useMemo(() => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    // Grid starts at 06:00, each hour is 100px
    const offsetFromStart = (hours - 6) * 100 + (minutes / 60) * 100;
    return offsetFromStart;
  }, [currentTime]);

  // Format current time for display (HH:MM)
  const currentTimeString = useMemo(() => {
    const hours = currentTime.getHours().toString().padStart(2, '0');
    const minutes = currentTime.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }, [currentTime]);

  // Check if the current time indicator should be visible (between 06:00 and 23:00)
  const showTimeIndicator = useMemo(() => {
    const hours = currentTime.getHours();
    return weekOffset === 0 && hours >= 6 && hours < 23;
  }, [currentTime, weekOffset]);

  // Check if there are any events in the current week
  const hasEventsThisWeek = useMemo(() => {
    return Object.values(currentEvents).some(dayEvents => dayEvents.length > 0);
  }, [currentEvents]);

  // Navigation handlers (limit to ±52 weeks / 1 year)
  const goToPreviousWeek = () => setWeekOffset(prev => Math.max(prev - 1, -52));
  const goToNextWeek = () => setWeekOffset(prev => Math.min(prev + 1, 52));
  const goToCurrentWeek = () => setWeekOffset(0);

  // True empty: no courses at all (or forced empty state)
  const isFullyEmpty = showEmptyState || (!isLoading && courses.length === 0 && !error);

  return (
      <main className="flex-1 flex flex-col overflow-hidden bg-surface h-screen">
          <MobileTeacherHeader title="Timeplan" />

          {/* Schedule Toolbar */}
          <motion.header
            variants={pageVariants}
            initial="initial"
            animate="animate"
            transition={pageTransition}
            className="flex flex-col gap-4 border-b border-zinc-200 bg-surface px-4 sm:px-6 lg:px-8 py-6 lg:py-8 shrink-0 z-20"
          >
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="flex items-center gap-3">
                <h1 className="font-geist text-2xl font-medium text-text-primary tracking-tight">Timeplan</h1>
                {!isFullyEmpty && (
                  <>
                    <div className="h-4 w-px bg-border"></div>
                    <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={goToPreviousWeek}
                      className="rounded-lg hover:bg-surface-elevated hover:text-text-primary transition-colors"
                      aria-label="Forrige uke"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-text-primary min-w-[80px] text-center">Uke {displayedWeekNumber}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={goToNextWeek}
                      className="rounded-lg hover:bg-surface-elevated hover:text-text-primary transition-colors"
                      aria-label="Neste uke"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    </div>
                    {weekOffset !== 0 && (
                    <Button
                      onClick={goToCurrentWeek}
                      variant="outline"
                      size="sm"
                      className="hidden md:flex ml-2 h-7 text-text-secondary"
                    >
                      Gå til i dag
                    </Button>
                    )}
                  </>
                )}
              </div>

              {!isFullyEmpty && (
                <div className="flex items-center gap-3">
                  <Button
                    asChild
                    size="compact"
                    className="gap-2"
                  >
                    <Link to="/teacher/new-course" aria-label="Nytt kurs">
                      <CalendarPlus className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Nytt kurs</span>
                    </Link>
                  </Button>
                </div>
              )}
            </div>

            {/* Filters - placeholder removed per progressive disclosure principle */}
          </motion.header>

          {/* Full empty state — no courses at all */}
          {isFullyEmpty ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                icon={CalendarDays}
                title="Ingen kurs ennå"
                description="Opprett et kurs for å komme i gang."
                action={
                  <Button asChild size="compact" className="gap-2">
                    <Link to="/teacher/new-course">
                      <CalendarPlus className="h-3.5 w-3.5" />
                      Opprett nytt kurs
                    </Link>
                  </Button>
                }
              />
            </div>
          ) : isMobile ? (
          /* Mobile View */
            <MobileDayView
              weekDays={weekDays}
              selectedDayIndex={selectedDayIndex}
              onDaySelect={setSelectedDayIndex}
              events={currentEvents}
              isLoading={isLoading}
              error={error}
              onRetry={loadScheduleData}
              showEmptyState={false}
              hasEventsThisWeek={hasEventsThisWeek}
              courses={courses}
            />
          ) : (
          /* Desktop View */
          <div className="flex-1 bg-white relative flex flex-col overflow-auto">

            {/* Loading State */}
            {isLoading && (
              <PageLoader variant="overlay" message="Laster timeplan" />
            )}

            {/* Error State */}
            {error && !isLoading && (
              <div className="flex-1 flex flex-col items-center pt-[20vh]">
                <div className="w-10 h-10 rounded-xl border border-zinc-200 bg-white flex items-center justify-center mb-4">
                  <CalendarDays className="w-4 h-4 text-text-secondary" />
                </div>
                <h3 className="font-geist text-sm font-medium text-text-primary">
                  Noe gikk galt
                </h3>
                <p className="mt-1 text-sm text-text-secondary max-w-xs text-center">
                  {error}
                </p>
                <Button onClick={loadScheduleData} size="compact" className="gap-2 mt-6">
                  Prøv på nytt
                </Button>
              </div>
            )}

            {/* Empty week state — has courses but no events this week */}
            {!isLoading && !error && !hasEventsThisWeek && (
              <div className="flex-1 flex flex-col items-center pt-[20vh]">
                <div className="w-10 h-10 rounded-xl border border-zinc-200 bg-white flex items-center justify-center mb-4">
                  <CalendarDays className="w-4 h-4 text-text-secondary" />
                </div>
                <h3 className="font-geist text-sm font-medium text-text-primary">
                  Ingen timer denne uken
                </h3>
                <p className="mt-1 text-sm text-text-secondary max-w-xs text-center">
                  Ingen planlagte timer denne uken. Naviger til en annen uke for å se timeplanen.
                </p>
              </div>
            )}

            {/* Calendar Grid — only when there are events */}
            {!isLoading && !error && !showEmptyState && hasEventsThisWeek && (
              <>
                {/* Sticky Header (Days) */}
                <div className="sticky top-0 z-20 grid grid-cols-[60px_repeat(7,minmax(140px,1fr))] border-b border-zinc-200 bg-white min-w-[1040px]">
                  {/* Corner */}
                  <div className="border-r border-border p-3 bg-surface"></div>

                  {/* Days Headers */}
                  {weekDays.map((day) => (
                    <div
                      key={day.name}
                      className={`group flex flex-col items-center justify-center gap-0.5 border-r border-surface-elevated py-3 ${day.isToday ? 'bg-surface/50' : ''} ${day.isWeekend ? 'bg-surface' : ''}`}
                    >
                      <span className={`text-xxs font-medium ${day.isToday ? 'text-text-primary' : 'text-text-secondary'}`}>
                        {day.name}
                      </span>
                      <span
                        className={`h-7 w-7 rounded-full flex items-center justify-center text-sm font-medium ${
                          day.isToday
                            ? 'bg-primary text-primary-foreground'
                            : day.isWeekend
                            ? 'text-text-tertiary group-hover:bg-zinc-50'
                            : 'text-text-secondary group-hover:bg-zinc-50'
                        }`}
                      >
                        {day.date}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Grid Content */}
                <div className="relative grid grid-cols-[60px_repeat(7,minmax(140px,1fr))] min-w-[1040px] flex-1">

                  {/* Current Time Indicator */}
                  {showTimeIndicator && (
                    <div
                      className="absolute left-0 right-0 z-10 flex items-center pointer-events-none"
                      style={{ top: `${currentTimePosition}px` }}
                    >
                      <div className="w-[60px] text-right pr-2 text-xxs font-medium text-primary">{currentTimeString}</div>
                      <div className="h-px flex-1 bg-primary opacity-50"></div>
                      <div className="absolute left-[60px] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"></div>
                    </div>
                  )}

                  {/* Time Column */}
                  <div className="flex flex-col border-r border-zinc-200 bg-surface text-xxs font-medium text-text-secondary">
                    {timeSlots.map((time) => (
                      <div key={time} className="h-[100px] border-b border-zinc-200/50 px-2 py-1">
                        {time}
                      </div>
                    ))}
                  </div>

                  {/* Day Columns */}
                  {weekDays.map((day, index) => (
                    <DayColumn
                      key={day.name}
                      dayIndex={index}
                      isToday={day.isToday}
                      isWeekend={day.isWeekend}
                      events={currentEvents[index] || []}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
          )}
      <EmptyStateToggle />
    </main>
  );
};

export default SchedulePage;

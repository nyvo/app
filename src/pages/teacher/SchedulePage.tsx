import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Filter, Users, CheckCircle2, CalendarDays, Loader2 } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { pageVariants, pageTransition } from '@/lib/motion';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { Button } from '@/components/ui/button';
import { useEmptyState } from '@/contexts/EmptyStateContext';
import EmptyStateToggle from '@/components/ui/EmptyStateToggle';
import {
  getOsloTime,
  getWeekNumber,
  getMondayOfWeek,
  generateWeekDays,
} from '@/utils/dateUtils';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCourses, fetchCourseSessions, type CourseWithStyle } from '@/services/courses';
import { supabase } from '@/lib/supabase';
import type { CourseSession } from '@/types/database';

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
  styleColor?: string | null; // Color from database (course_styles.color)
  status?: 'completed' | 'upcoming' | 'active';
  signups: number;
  maxCapacity: number | null;
}

const timeSlots = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];

// Default gray color for events without a style color
const DEFAULT_EVENT_COLOR = '#6B7280'; // gray-500 from design system

// Calculate end time from start time and duration
const calculateEndTime = (startTime: string, durationMinutes: number): string => {
  const [hours, mins] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60);
  const endMins = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
};

// Get initials from name
const getInitials = (name: string | null | undefined): string => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

// Format time to HH:MM (remove seconds if present)
const formatTime = (time: string): string => {
  // Handle both HH:MM and HH:MM:SS formats
  const parts = time.split(':');
  return `${parts[0]}:${parts[1]}`;
};

// Helper to calculate position and height
// Grid shows 07:00-23:00, so clamp events to visible area
const getEventStyle = (startTime: string, endTime: string) => {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  // Clamp to visible grid (07:00 - 24:00)
  const clampedStartHour = Math.max(startHour, 7);
  const clampedStartMin = startHour < 7 ? 0 : startMin;
  const clampedEndHour = Math.min(endHour, 24);
  const clampedEndMin = endHour >= 24 ? 0 : endMin;

  const startOffset = (clampedStartHour - 7) * 100 + (clampedStartMin / 60) * 100;
  const endOffset = (clampedEndHour - 7) * 100 + (clampedEndMin / 60) * 100;
  const duration = Math.max(endOffset - startOffset, 20); // Minimum height of 20px

  return {
    top: `${Math.max(startOffset, 0)}px`,
    height: `${duration}px`,
  };
};

// Generate color styles from a base color (uses database color or default gray)
// Returns inline styles for dynamic coloring based on course_styles.color
const getEventColorStyles = (baseColor: string | null | undefined) => {
  const color = baseColor || DEFAULT_EVENT_COLOR;
  return {
    // Inline styles for dynamic colors
    accentBorderColor: color,
    // We use neutral Tailwind classes for consistent look, accent color only on left border
  };
};

// Event Card Component
// Uses database color for left accent border, neutral design system colors for everything else
const EventCard = ({ event }: { event: ScheduleEvent }) => {
  const positionStyle = getEventStyle(event.startTime, event.endTime);
  const { accentBorderColor } = getEventColorStyles(event.styleColor);
  const isCompleted = event.status === 'completed';
  const isActive = event.status === 'active';

  return (
    <Link
      to={`/teacher/courses/${event.courseId}`}
      className={`absolute left-1 right-1 rounded-lg bg-white shadow-sm border-l-4 p-2 hover:shadow-md transition-all cursor-pointer group overflow-hidden block ${isCompleted ? 'opacity-60 grayscale hover:grayscale-0 hover:opacity-100' : ''} ${isActive ? 'ring-2 ring-primary ring-offset-1' : ''}`}
      style={{
        ...positionStyle,
        borderLeftColor: accentBorderColor,
      }}
    >
      <div className="flex justify-between items-start">
        <span className="text-xxs font-bold text-text-secondary">
          {formatTime(event.startTime)} - {formatTime(event.endTime)}
        </span>
        {isCompleted && <CheckCircle2 className="h-3 w-3 text-text-tertiary" />}
        {isActive && (
          <span className="inline-flex items-center rounded-full bg-success px-1.5 py-0.5 text-[8px] font-medium text-white">
            Start
          </span>
        )}
        {!isCompleted && !isActive && (
          <Users className="h-3 w-3 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
      <p className="text-xs font-semibold text-text-primary mt-1 truncate">{event.title}</p>
      <p className="text-xxs text-muted-foreground mt-0.5">{event.location}</p>
      {!isCompleted && (
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {event.instructorAvatar ? (
              <img src={event.instructorAvatar} className="h-4 w-4 rounded-full ring-1 ring-border" alt="" />
            ) : (
              <div className="flex h-4 w-4 items-center justify-center rounded-full bg-text-secondary text-[6px] font-medium text-white ring-1 ring-border">
                {event.instructorInitials}
              </div>
            )}
            <span className="text-xxs text-muted-foreground">{event.instructor}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3 text-text-tertiary" />
            <span className="text-xxs text-muted-foreground">
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

// Session with course data for transformation
interface SessionWithCourse extends CourseSession {
  course: CourseWithStyle;
}

export const SchedulePage = () => {
  const { showEmptyState } = useEmptyState();
  const { currentOrganization, profile } = useAuth();

  // Data fetching state
  const [courses, setCourses] = useState<CourseWithStyle[]>([]);
  const [sessions, setSessions] = useState<SessionWithCourse[]>([]);
  const [signupsCounts, setSignupsCounts] = useState<Record<string, number>>({}); // courseId -> count
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      // Fetch sessions for each course
      const allSessions: SessionWithCourse[] = [];

      for (const course of fetchedCourses) {
        const { data: sessionsData, error: sessionsError } = await fetchCourseSessions(course.id);

        if (sessionsError) {
          continue;
        }

        if (sessionsData) {
          // Attach course data to each session
          const sessionsWithCourse = sessionsData.map(session => ({
            ...session,
            course
          }));
          allSessions.push(...sessionsWithCourse);
        }
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const signup of signupsData as any[]) {
            counts[signup.course_id] = (counts[signup.course_id] || 0) + 1;
          }
        }
        setSignupsCounts(counts);
      }
    } catch {
      setError('Kunne ikke laste timeplan. Prøv igjen senere.');
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
      const endTime = session.end_time || calculateEndTime(session.start_time, duration);

      // Determine session status
      const now = getOsloTime();
      const sessionDateTime = new Date(`${sessionDate}T${session.start_time}`);
      const sessionEndDateTime = new Date(`${sessionDate}T${endTime}`);

      let status: 'completed' | 'upcoming' | 'active' | undefined;
      if (now > sessionEndDateTime) {
        status = 'completed';
      } else if (now >= sessionDateTime && now <= sessionEndDateTime) {
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
        styleColor: session.course.style?.color, // Use database color, fallback handled in getEventColorStyles
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

  // Get the week number for display
  const displayedWeekNumber = useMemo(() => {
    return getWeekNumber(displayedMonday);
  }, [displayedMonday]);

  // Calculate position of current time indicator (in pixels from top)
  const currentTimePosition = useMemo(() => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    // Grid starts at 07:00, each hour is 100px
    const offsetFromStart = (hours - 7) * 100 + (minutes / 60) * 100;
    return offsetFromStart;
  }, [currentTime]);

  // Format current time for display (HH:MM)
  const currentTimeString = useMemo(() => {
    const hours = currentTime.getHours().toString().padStart(2, '0');
    const minutes = currentTime.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }, [currentTime]);

  // Check if the current time indicator should be visible (between 07:00 and 24:00)
  const showTimeIndicator = useMemo(() => {
    const hours = currentTime.getHours();
    return weekOffset === 0 && hours >= 7 && hours < 24;
  }, [currentTime, weekOffset]);

  // Check if there are any events in the current week
  const hasEventsThisWeek = useMemo(() => {
    return Object.values(currentEvents).some(dayEvents => dayEvents.length > 0);
  }, [currentEvents]);

  // Get unique styles from active courses for the legend
  const activeStyles = useMemo(() => {
    const stylesMap = new Map<string, { name: string; color: string }>();

    for (const course of courses) {
      if (course.style?.name && course.style?.color) {
        // Use style name as key to avoid duplicates
        if (!stylesMap.has(course.style.name)) {
          stylesMap.set(course.style.name, {
            name: course.style.name,
            color: course.style.color
          });
        }
      }
    }

    return Array.from(stylesMap.values());
  }, [courses]);

  // Navigation handlers (limit to ±52 weeks / 1 year)
  const goToPreviousWeek = () => setWeekOffset(prev => Math.max(prev - 1, -52));
  const goToNextWeek = () => setWeekOffset(prev => Math.min(prev + 1, 52));
  const goToCurrentWeek = () => setWeekOffset(0);

  return (
    <SidebarProvider>
      <TeacherSidebar />
      <main className="flex-1 flex flex-col overflow-hidden bg-surface h-screen">
          {/* Schedule Toolbar */}
          <motion.header
            variants={pageVariants}
            initial="initial"
            animate="animate"
            transition={pageTransition}
            className="flex flex-col gap-4 border-b border-gray-100 bg-surface px-6 py-5 shrink-0 z-20"
          >
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="flex items-center gap-3">
                <h1 className="font-geist text-2xl font-medium text-text-primary tracking-tight">Timeplan</h1>
                <div className="h-4 w-px bg-border"></div>
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
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
              </div>

              <div className="flex items-center gap-3">
                <Button
                  asChild
                  size="compact"
                  className="gap-2"
                >
                  <Link to="/teacher/new-course">
                    <Plus className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Nytt kurs</span>
                  </Link>
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <button className="flex items-center gap-2 h-10 rounded-lg bg-white px-3 py-2 text-xs font-medium text-text-secondary shadow-sm hover:shadow-md hover:text-text-primary ios-ease cursor-pointer">
                <Filter className="h-3.5 w-3.5" />
                Instruktør: Alle
              </button>
              <button className="flex items-center gap-2 h-10 rounded-lg border border-dashed border-ring bg-transparent px-3 py-2 text-xs font-medium text-text-secondary hover:border-text-tertiary hover:text-text-primary ios-ease cursor-pointer">
                Rom
              </button>
              <button className="flex items-center gap-2 h-10 rounded-lg border border-dashed border-ring bg-transparent px-3 py-2 text-xs font-medium text-text-secondary hover:border-text-tertiary hover:text-text-primary ios-ease cursor-pointer">
                Kurstype
              </button>
              {/* Dynamic style legend - only shows styles from active courses */}
              {activeStyles.length > 0 && (
                <div className="ml-auto hidden md:flex items-center gap-4">
                  {activeStyles.map((style) => (
                    <div key={style.name} className="flex items-center gap-1.5">
                      <div
                        className="h-2.5 w-2.5 rounded-sm border"
                        style={{
                          backgroundColor: `${style.color}20`,
                          borderColor: `${style.color}40`
                        }}
                      />
                      <span className="text-xs text-muted-foreground">{style.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.header>

          {/* Schedule Grid Container */}
          <div className={`flex-1 bg-white relative flex flex-col ${!isLoading && !error && (showEmptyState || !hasEventsThisWeek) ? 'overflow-hidden' : 'overflow-auto'}`}>

            {/* Loading State Overlay */}
            {isLoading && (
              <div className="sticky top-0 left-0 right-0 bottom-0 z-30 flex items-center justify-center bg-white min-h-full">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">Laster timeplan...</p>
                </div>
              </div>
            )}

            {/* Error State Overlay */}
            {error && !isLoading && (
              <div className="sticky top-0 left-0 right-0 bottom-0 z-30 flex items-center justify-center bg-white min-h-full">
                <div className="text-center max-w-sm mx-auto p-8">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20">
                    <CalendarDays className="h-8 w-8 text-destructive" />
                  </div>
                  <h3 className="font-geist text-lg font-semibold text-text-primary mb-2">
                    Noe gikk galt
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    {error}
                  </p>
                  <Button onClick={loadScheduleData} size="compact" className="gap-2">
                    Prøv igjen
                  </Button>
                </div>
              </div>
            )}

            {/* Empty State Overlay - darkens table underneath, container overflow hidden prevents scroll */}
            {!isLoading && !error && (showEmptyState || !hasEventsThisWeek) && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-gray-900/5">
                <div className="text-center max-w-sm mx-auto p-8 bg-white rounded-2xl shadow-md">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-elevated">
                    <CalendarDays className="h-8 w-8 text-text-tertiary" />
                  </div>
                  <h3 className="font-geist text-lg font-semibold text-text-primary mb-2">
                    Ingen timer denne uken
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    {courses.length === 0
                      ? 'Du har ingen kurs ennå. Opprett et nytt kurs for å komme i gang.'
                      : 'Det er ingen planlagte timer denne uken. Naviger til en annen uke eller opprett et nytt kurs.'}
                  </p>
                  <Button asChild size="compact" className="gap-2">
                    <Link to="/teacher/new-course">
                      <Plus className="h-3.5 w-3.5" />
                      Opprett nytt kurs
                    </Link>
                  </Button>
                </div>
              </div>
            )}

            {/* Sticky Header (Days) */}
            <div className="sticky top-0 z-20 grid grid-cols-[60px_repeat(7,minmax(140px,1fr))] border-b border-gray-100 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)] min-w-[1040px]">
              {/* Corner */}
              <div className="border-r border-border p-3 bg-surface"></div>

              {/* Days Headers */}
              {weekDays.map((day) => (
                <div
                  key={day.name}
                  className={`group flex flex-col items-center justify-center gap-0.5 border-r border-surface-elevated py-3 ${day.isToday ? 'bg-surface/50' : ''} ${day.isWeekend ? 'bg-surface' : ''}`}
                >
                  <span className={`text-xxs font-medium uppercase tracking-wide ${day.isToday ? 'font-bold text-text-primary' : 'text-text-tertiary group-hover:text-muted-foreground'}`}>
                    {day.name}
                  </span>
                  <span
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-sm font-medium ${
                      day.isToday
                        ? 'bg-text-primary text-white font-bold shadow-md shadow-text-primary/20'
                        : day.isWeekend
                        ? 'text-text-tertiary group-hover:bg-surface-elevated'
                        : 'text-text-secondary group-hover:bg-surface-elevated'
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
                  <div className="w-[60px] text-right pr-2 text-xxs font-bold text-red-500">{currentTimeString}</div>
                  <div className="h-px flex-1 bg-red-500 opacity-50"></div>
                  <div className="absolute left-[60px] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500"></div>
                </div>
              )}

              {/* Time Column */}
              <div className="flex flex-col border-r border-gray-100 bg-surface text-xxs font-medium text-text-tertiary">
                {timeSlots.map((time) => (
                  <div key={time} className="h-[100px] border-b border-gray-100/50 px-2 py-1">
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
          </div>
        </main>
      <EmptyStateToggle />
    </SidebarProvider>
  );
};

export default SchedulePage;

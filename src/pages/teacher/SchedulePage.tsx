import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, CalendarDays } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { Button } from '@/components/ui/button';
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
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DayColumn,
  MobileDayView,
  ScheduleHeader,
  TIME_SLOTS,
  calculateEndTime,
  formatTime,
} from '@/components/teacher/schedule';
import type { ScheduleEvent, SessionWithCourse } from '@/components/teacher/schedule';

export const SchedulePage = () => {
  const showEmptyState = getShowEmptyState();
  const { currentOrganization } = useAuth();
  const isMobile = useIsMobile();

  // Data fetching state
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<SessionWithCourse[]>([]);
  const [signupsCounts, setSignupsCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(getOsloTime);
  const [weekOffset, setWeekOffset] = useState(0);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getOsloTime());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Calculate displayed week bounds (return new Date to avoid memo mutation)
  const displayedMonday = useMemo(() => {
    const today = getOsloTime();
    const monday = getMondayOfWeek(today);
    const offset = new Date(monday);
    offset.setDate(monday.getDate() + weekOffset * 7);
    return offset;
  }, [weekOffset]);

  const displayedSunday = useMemo(() => {
    const sunday = new Date(displayedMonday);
    sunday.setDate(displayedMonday.getDate() + 6);
    return sunday;
  }, [displayedMonday]);

  // Fetch courses and sessions
  const loadScheduleData = useCallback(async () => {
    if (!currentOrganization) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data: coursesData, error: coursesError } = await fetchCourses(currentOrganization.id);
      if (coursesError) throw coursesError;

      const fetchedCourses = coursesData || [];
      setCourses(fetchedCourses);

      const sessionResults = await Promise.all(
        fetchedCourses.map(course =>
          fetchCourseSessions(course.id).then(result => ({ course, result }))
        )
      );

      const allSessions: SessionWithCourse[] = [];
      for (const { course, result } of sessionResults) {
        if (result.error || !result.data) continue;
        allSessions.push(...result.data.map(session => ({ ...session, course })));
      }
      setSessions(allSessions);

      const courseIds = fetchedCourses.map(c => c.id);
      if (courseIds.length > 0) {
        const { data: signupsData } = await supabase
          .from('signups')
          .select('course_id')
          .in('course_id', courseIds)
          .eq('status', 'confirmed');

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

  useEffect(() => {
    loadScheduleData();
  }, [loadScheduleData]);

  // Filter sessions to displayed week and transform to events
  const currentEvents = useMemo(() => {
    const mondayStr = displayedMonday.toISOString().split('T')[0];
    const sundayStr = displayedSunday.toISOString().split('T')[0];
    const eventsByDay: Record<number, ScheduleEvent[]> = {};

    // Hoist time computation outside loop
    const now = getOsloTime();
    const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    for (const session of sessions) {
      const sessionDate = session.session_date;
      if (sessionDate < mondayStr || sessionDate > sundayStr) continue;

      const [year, month, day] = sessionDate.split('-').map(Number);
      const sessionDateObj = new Date(year, month - 1, day);
      const dayOfWeek = sessionDateObj.getDay();
      const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

      const duration = session.course.duration || 60;
      const endTime = session.end_time || (session.start_time ? calculateEndTime(session.start_time, duration) : null);
      if (!endTime) continue;

      const sessionStartStr = `${sessionDate}T${formatTime(session.start_time)}`;
      const sessionEndStr = `${sessionDate}T${formatTime(endTime)}`;

      let status: 'completed' | 'upcoming' | 'active';
      if (nowStr > sessionEndStr) {
        status = 'completed';
      } else if (nowStr >= sessionStartStr && nowStr <= sessionEndStr) {
        status = 'active';
      } else {
        status = 'upcoming';
      }

      const event: ScheduleEvent = {
        id: session.id,
        courseId: session.course.id,
        title: session.course.title,
        startTime: session.start_time,
        endTime,
        location: session.course.location || 'Ikke angitt',
        status,
        signups: signupsCounts[session.course.id] || 0,
        maxCapacity: session.course.max_participants,
      };

      if (!eventsByDay[dayIndex]) eventsByDay[dayIndex] = [];
      eventsByDay[dayIndex].push(event);
    }

    return eventsByDay;
  }, [sessions, displayedMonday, displayedSunday, signupsCounts]);

  const weekDays = useMemo(() => {
    return generateWeekDays(displayedMonday, currentTime);
  }, [displayedMonday, currentTime]);

  // Auto-select today on mobile
  useEffect(() => {
    if (isMobile && weekOffset === 0) {
      const todayIndex = weekDays.findIndex(day => day.isToday);
      if (todayIndex !== -1) setSelectedDayIndex(todayIndex);
    }
  }, [isMobile, weekOffset, weekDays]);

  const displayedWeekNumber = useMemo(() => getWeekNumber(displayedMonday), [displayedMonday]);

  // Current time indicator
  const currentTimePosition = useMemo(() => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    return (hours - 6) * 100 + (minutes / 60) * 100;
  }, [currentTime]);

  const currentTimeString = useMemo(() => {
    return `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;
  }, [currentTime]);

  const showTimeIndicator = useMemo(() => {
    const hours = currentTime.getHours();
    return weekOffset === 0 && hours >= 6 && hours < 23;
  }, [currentTime, weekOffset]);

  const hasEventsThisWeek = useMemo(() => {
    return Object.values(currentEvents).some(dayEvents => dayEvents.length > 0);
  }, [currentEvents]);

  // Navigation
  const goToPreviousWeek = () => setWeekOffset(prev => Math.max(prev - 1, -52));
  const goToNextWeek = () => setWeekOffset(prev => Math.min(prev + 1, 52));
  const goToCurrentWeek = () => setWeekOffset(0);

  const isFullyEmpty = showEmptyState || (!isLoading && courses.length === 0 && !error);

  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-surface h-screen">
      <MobileTeacherHeader title="Timeplan" />

      <ScheduleHeader
        weekNumber={displayedWeekNumber}
        displayedMonday={displayedMonday}
        displayedSunday={displayedSunday}
        weekOffset={weekOffset}
        onPreviousWeek={goToPreviousWeek}
        onNextWeek={goToNextWeek}
        onGoToToday={goToCurrentWeek}
        hasCourses={!isFullyEmpty}
      />

      {/* Full empty: no courses at all */}
      {isFullyEmpty ? (
        <div className="flex flex-col items-center pt-[20vh]">
          <div className="w-10 h-10 rounded-xl border border-zinc-200 bg-white flex items-center justify-center mb-4">
            <CalendarDays className="w-4 h-4 text-text-secondary" />
          </div>
          <h2 className="font-geist text-sm font-medium text-text-primary">
            Ingen kurs ennå
          </h2>
          <p className="mt-1 text-sm text-text-secondary max-w-xs text-center">
            Opprett et kurs for å komme i gang.
          </p>
          <Button asChild size="default" className="gap-2 mt-6">
            <Link to="/teacher/new-course">
              <CalendarPlus className="h-4 w-4" />
              Opprett nytt kurs
            </Link>
          </Button>
        </div>
      ) : isMobile ? (
        <MobileDayView
          weekDays={weekDays}
          selectedDayIndex={selectedDayIndex}
          onDaySelect={setSelectedDayIndex}
          events={currentEvents}
          isLoading={isLoading}
          error={error}
          onRetry={loadScheduleData}
          hasEventsThisWeek={hasEventsThisWeek}
          hasCourses={courses.length > 0}
        />
      ) : (
        /* Desktop week view */
        <div className="flex-1 bg-white relative flex flex-col overflow-auto">
          {isLoading && (
            <PageLoader variant="overlay" message="Laster timeplan" />
          )}

          {error && !isLoading ? (
            <DesktopError error={error} onRetry={loadScheduleData} />
          ) : !isLoading && (
            <>
              {/* Sticky day headers */}
              <div className="sticky top-0 z-20 grid grid-cols-[60px_repeat(7,minmax(140px,1fr))] border-b border-zinc-200 bg-white min-w-[1040px]">
                <div className="border-r border-border p-3 bg-surface" />
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

              {/* Grid content */}
              <div className="relative grid grid-cols-[60px_repeat(7,minmax(140px,1fr))] min-w-[1040px] flex-1">
                {/* Empty week overlay */}
                {!hasEventsThisWeek && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="pointer-events-auto text-center">
                      <p className="text-sm text-text-secondary">Ingen timer denne uken</p>
                    </div>
                  </div>
                )}

                {/* Current time indicator */}
                {showTimeIndicator && (
                  <div
                    className="absolute left-0 right-0 z-10 flex items-center pointer-events-none"
                    style={{ top: `${currentTimePosition}px` }}
                    aria-hidden="true"
                  >
                    <div className="w-[60px] text-right pr-2 text-xxs font-medium text-primary">
                      {currentTimeString}
                    </div>
                    <div className="h-px flex-1 bg-primary opacity-50" />
                    <div className="absolute left-[60px] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" />
                  </div>
                )}

                {/* Time column */}
                <div className="flex flex-col border-r border-zinc-200 bg-surface text-xxs font-medium text-text-secondary">
                  {TIME_SLOTS.map((time) => (
                    <div key={time} className="h-[100px] border-b border-zinc-200/50 px-2 py-1">
                      {time}
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {weekDays.map((day, index) => (
                  <DayColumn
                    key={day.name}
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

function DesktopError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
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
      <Button onClick={onRetry} size="compact" className="gap-2 mt-6">
        Prøv på nytt
      </Button>
    </div>
  );
}

export default SchedulePage;

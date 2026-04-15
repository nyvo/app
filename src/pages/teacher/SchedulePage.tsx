import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarPlus, CalendarDays } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { PageLoader } from '@/components/ui/page-loader';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { useTeacherShell } from '@/components/teacher/TeacherShellContext';
import { Button } from '@/components/ui/button';
import { EmptyStateToggle } from '@/components/ui/EmptyStateToggle';
import { getShowEmptyState } from '@/lib/utils';
import {
  getOsloTime,
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
  EventSidebar,
  TIME_SLOTS,
  calculateEndTime,
  formatTime,
} from '@/components/teacher/schedule';
import type { ScheduleEvent, SessionWithCourse } from '@/components/teacher/schedule';

export const SchedulePage = () => {
  const showEmptyState = getShowEmptyState();
  const { currentOrganization } = useAuth();
  const { setAction } = useTeacherShell();
  const isMobile = useIsMobile();

  // Data state
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<SessionWithCourse[]>([]);
  const [signupsCounts, setSignupsCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(getOsloTime);
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [selectedEventDate, setSelectedEventDate] = useState<string | undefined>();

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getOsloTime());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Week bounds
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

  // Fetch data
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

  // Build events by day, tracking session dates
  const { currentEvents, sessionDates } = useMemo(() => {
    const mondayStr = displayedMonday.toISOString().split('T')[0];
    const sundayStr = displayedSunday.toISOString().split('T')[0];
    const eventsByDay: Record<number, ScheduleEvent[]> = {};
    const dates: Record<string, string> = {};

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
        courseType: session.course.course_type as 'course-series' | 'event' | 'online',
      };

      dates[session.id] = sessionDate;

      if (!eventsByDay[dayIndex]) eventsByDay[dayIndex] = [];
      eventsByDay[dayIndex].push(event);
    }

    return { currentEvents: eventsByDay, sessionDates: dates };
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


  const hasEventsThisWeek = useMemo(() => {
    return Object.values(currentEvents).some(dayEvents => dayEvents.length > 0);
  }, [currentEvents]);

  // Navigation
  const goToPreviousWeek = () => setWeekOffset(prev => Math.max(prev - 1, -52));
  const goToNextWeek = () => setWeekOffset(prev => Math.min(prev + 1, 52));


  const calendarScrollRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleSelectEvent = useCallback((event: ScheduleEvent) => {
    const isDeselecting = selectedEvent?.id === event.id;
    setSelectedEvent(isDeselecting ? null : event);
    setSelectedEventDate(isDeselecting ? undefined : sessionDates[event.id]);
  }, [sessionDates, selectedEvent]);


  const isFullyEmpty = showEmptyState || (!isLoading && courses.length === 0 && !error);

  useEffect(() => {
    setAction(null);
    return () => setAction(null);
  }, [setAction]);

  // Clear selection on view/week change
  useEffect(() => {
    setSelectedEvent(null);
  }, [viewMode, weekOffset]);

  const showSidebar = !!selectedEvent && !isMobile;

  useEffect(() => {
    if (!showSidebar || !sidebarRef.current) return;

    const rect = sidebarRef.current.getBoundingClientRect();
    const isAboveViewport = rect.top < 96;
    const isBelowViewport = rect.top > window.innerHeight - 120;

    if (isAboveViewport || isBelowViewport) {
      sidebarRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [showSidebar, selectedEvent]);

  return (
    <main className="flex-1 flex min-h-full flex-col overflow-hidden bg-background">
      <MobileTeacherHeader title="Timeplan" />

      {isFullyEmpty ? (
        <EmptyState
          icon={CalendarDays}
          title="Ingen kurs ennå"
          description="Opprett et kurs for å komme i gang."
          className="pt-[20vh] py-0"
          action={
            <Button asChild size="default" className="gap-2">
              <Link to="/teacher/new-course">
                <CalendarPlus className="h-4 w-4" />
                Opprett kurs
              </Link>
            </Button>
          }
        />
      ) : isMobile ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <ScheduleHeader
            displayedMonday={displayedMonday}
            weekOffset={weekOffset}
            viewMode="day"
            onViewModeChange={() => {}}
            onPreviousWeek={goToPreviousWeek}
            onNextWeek={goToNextWeek}

            hasCourses={!isFullyEmpty}
          />
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
        </div>
      ) : (
        /* Desktop */
        <div className="flex min-h-0 flex-1 gap-3 overflow-hidden px-6 py-6 lg:px-8 lg:py-8">
          {/* Calendar section */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border">
            <ScheduleHeader
              displayedMonday={displayedMonday}
              weekOffset={weekOffset}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onPreviousWeek={goToPreviousWeek}
              onNextWeek={goToNextWeek}
  
              hasCourses={!isFullyEmpty}
            />

            <div ref={calendarScrollRef} className="relative flex min-h-0 flex-1 flex-col overflow-auto bg-background rounded-b-xl">
              {isLoading && (
                <PageLoader variant="overlay" message="Laster timeplan" />
              )}

              {error && !isLoading ? (
                <ErrorState
                  message={error}
                  onRetry={loadScheduleData}
                  className="flex-1 pt-[20vh] h-auto"
                />
              ) : !isLoading && viewMode === 'week' && (
                <>
                  {/* Sticky day headers */}
                  <div className="sticky top-0 z-20 grid min-w-[1040px] grid-cols-[60px_repeat(7,minmax(140px,1fr))] border-b border-border bg-background rounded-t-xl">
                    <div />
                    {weekDays.map((day) => (
                      <div
                        key={day.name}
                        className="flex items-center justify-center gap-1.5 py-3"
                      >
                        <span className={`text-xs font-medium tracking-wide ${day.isToday ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {day.name}
                        </span>
                        <span
                          className={`text-xs font-medium flex size-7 items-center justify-center rounded-full ${
                            day.isToday
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {day.date}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="relative grid min-w-[1040px] flex-1 grid-cols-[60px_repeat(7,minmax(140px,1fr))]">
                    {!hasEventsThisWeek && (
                      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                        <div className="pointer-events-auto">
                          <EmptyState
                            icon={CalendarDays}
                            title="Ingen timer denne uken"
                            description="Ingen planlagte timer denne uken."
                            variant="compact"
                          />
                        </div>
                      </div>
                    )}


                    <div className="flex flex-col bg-background">
                      {TIME_SLOTS.map((time) => (
                        <div key={time} className="h-[100px] border-b border-border/60 px-2 py-1">
                          <span className="text-xs font-medium tracking-wide text-muted-foreground/60">{time.replace(':00', '')}</span>
                        </div>
                      ))}
                    </div>

                    {weekDays.map((day, index) => (
                      <DayColumn
                        key={day.name}
                        isToday={day.isToday}
                        events={currentEvents[index] || []}
                        selectedEventId={selectedEvent?.id}
                        onSelectEvent={handleSelectEvent}
                      />
                    ))}
                  </div>
                </>
              )}

              {!isLoading && viewMode === 'day' && (
                <div className="p-6">
                  {(() => {
                    const todayIndex = weekDays.findIndex(d => d.isToday);
                    const dayIndex = todayIndex !== -1 ? todayIndex : 0;
                    const dayEvents = (currentEvents[dayIndex] || []).sort((a, b) => a.startTime.localeCompare(b.startTime));

                    if (dayEvents.length === 0) {
                      return (
                        <EmptyState
                          icon={CalendarDays}
                          title="Ingen timer i dag"
                          description="Ingen planlagte timer i dag."
                          variant="compact"
                          className="py-16"
                        />
                      );
                    }

                    return (
                      <div className="max-w-xl space-y-2">
                        {dayEvents.map(event => (
                          <button
                            key={event.id}
                            type="button"
                            onClick={() => handleSelectEvent(event)}
                            className={`w-full text-left rounded-lg border border-border p-4 smooth-transition outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                              selectedEvent?.id === event.id
                                ? 'bg-primary/5 ring-1 ring-primary/20'
                                : 'hover:bg-surface-muted/40'
                            }`}
                          >
                            <p className="text-sm font-medium text-foreground">{event.title}</p>
                            <p className="text-xs font-medium tracking-wide text-muted-foreground mt-0.5">
                              {formatTime(event.startTime)} – {formatTime(event.endTime)}
                              {event.location !== 'Ikke angitt' && ` · ${event.location}`}
                            </p>
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Detail sidebar — separate container */}
          <AnimatePresence>
            {showSidebar && (
              <motion.div
                ref={sidebarRef}
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 320, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                className="shrink-0 overflow-hidden"
              >
                <div className="w-80 min-w-80 rounded-xl border border-border bg-background">
                  <EventSidebar
                    event={selectedEvent}
                    sessionDate={selectedEventDate}
                    onClose={() => setSelectedEvent(null)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <EmptyStateToggle />
    </main>
  );
};

export default SchedulePage;

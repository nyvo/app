import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarPlus, CalendarDays, ChevronLeft, ChevronRight } from '@/lib/icons';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { PageLoader } from '@/components/ui/page-loader';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { useTeacherShell } from '@/components/teacher/TeacherShellContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyStateToggle } from '@/components/ui/EmptyStateToggle';
import { cn, getShowEmptyState } from '@/lib/utils';
import {
  getOsloTime,
  getMondayOfWeek,
  generateWeekDays,
} from '@/utils/dateUtils';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCourses, fetchCourseSessions } from '@/services/courses';
import type { Course, CourseType } from '@/types/database';
import { supabase } from '@/lib/supabase';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DayColumn,
  MobileDayView,
  EventSidebar,
  ScheduleKpiStrip,
  TIME_SLOTS,
  calculateEndTime,
  formatTime,
  type ScheduleKpis,
} from '@/components/teacher/schedule';
import type { ScheduleEvent, SessionWithCourse } from '@/components/teacher/schedule';

const MONTH_ABBR = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'] as const;

function formatWeekRangeLabel(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const startDay = monday.getDate();
  const endDay = sunday.getDate();
  const startMonth = MONTH_ABBR[monday.getMonth()];
  const endMonth = MONTH_ABBR[sunday.getMonth()];
  return startMonth === endMonth
    ? `${startDay}. – ${endDay}. ${startMonth}`
    : `${startDay}. ${startMonth} – ${endDay}. ${endMonth}`;
}

export const SchedulePage = () => {
  const showEmptyState = getShowEmptyState();
  const { currentOrganization } = useAuth();
  const { setAction } = useTeacherShell();
  const isMobile = useIsMobile();

  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<SessionWithCourse[]>([]);
  const [signupsCounts, setSignupsCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(getOsloTime);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [selectedEventDate, setSelectedEventDate] = useState<string | undefined>();
  const [courseFilter, setCourseFilter] = useState<string>('all');

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
        courseType: session.course.course_type as CourseType,
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


  // Course list — populates the toolbar's course-filter dropdown.
  const courseOptions = useMemo(() => {
    return courses.map(c => ({ id: c.id, title: c.title }));
  }, [courses]);

  // Apply the course filter to the rendered week.
  const filteredEvents = useMemo(() => {
    if (courseFilter === 'all') return currentEvents;
    const out: Record<number, ScheduleEvent[]> = {};
    for (const [k, v] of Object.entries(currentEvents)) {
      out[Number(k)] = v.filter(e => e.courseId === courseFilter);
    }
    return out;
  }, [currentEvents, courseFilter]);

  const hasFilteredEventsThisWeek = useMemo(() => {
    return Object.values(filteredEvents).some(dayEvents => dayEvents.length > 0);
  }, [filteredEvents]);

  // KPIs computed from the visible week's events + a few derived facts.
  const kpis: ScheduleKpis | null = useMemo(() => {
    if (isLoading) return null;

    const now = currentTime;
    const todayIndex = ((now.getDay() + 6) % 7); // Monday=0..Sunday=6 in our weekDays order
    const tomorrowIndex = (todayIndex + 1) % 7;

    const allEvents: ScheduleEvent[] = Object.values(filteredEvents).flat();
    const weekCount = allEvents.length;
    const todayCount = (filteredEvents[todayIndex] || []).length;
    const tomorrowCount = (filteredEvents[tomorrowIndex] || []).length;
    const activeEvent = allEvents.find(e => e.status === 'active') ?? null;

    // Next event today (or earliest upcoming this week if none today).
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const todaysUpcoming = (filteredEvents[todayIndex] || [])
      .filter(e => e.status === 'upcoming')
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    let nextWhen = '';
    let nextEvent: ScheduleEvent | null = null;
    if (todaysUpcoming.length > 0) {
      const ev = todaysUpcoming[0];
      const [h, m] = ev.startTime.split(':').map(Number);
      const evMins = h * 60 + m;
      const diff = evMins - nowMinutes;
      if (diff <= 60 && diff > 0) {
        nextWhen = `om ${diff} min`;
      } else {
        nextWhen = `I dag · ${ev.startTime.slice(0, 5)}`;
      }
      nextEvent = ev;
    } else {
      // Search forward through remaining days of the week
      for (let i = 1; i <= 6; i++) {
        const dayIdx = (todayIndex + i) % 7;
        const upcoming = (filteredEvents[dayIdx] || [])
          .filter(e => e.status === 'upcoming')
          .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
        if (upcoming) {
          const dayName = weekDays[dayIdx]?.name ?? '';
          nextWhen = `${dayName} · ${upcoming.startTime.slice(0, 5)}`;
          nextEvent = upcoming;
          break;
        }
      }
    }

    // Free spots: sum across upcoming sessions that have a max set.
    let freeSpots = 0;
    for (const ev of allEvents) {
      if (ev.status === 'completed') continue;
      if (ev.maxCapacity == null) continue;
      freeSpots += Math.max(0, ev.maxCapacity - ev.signups);
    }

    return {
      weekCount,
      todayCount,
      tomorrowCount,
      activeEvent,
      nextEvent: nextEvent ? { event: nextEvent, whenLabel: nextWhen } : null,
      freeSpots,
    };
  }, [filteredEvents, currentTime, isLoading, weekDays]);

  // Today's hour+minute for the now-line on today's column.
  const nowHours = currentTime.getHours();
  const nowMinutes = currentTime.getMinutes();

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

  useEffect(() => {
    setSelectedEvent(null);
  }, [weekOffset]);

  const showSidebar = !!selectedEvent && !isMobile;

  useEffect(() => {
    if (!showSidebar || !sidebarRef.current) return;

    const firstChild = sidebarRef.current.querySelector(':first-child');
    if (!firstChild) return;

    const rect = firstChild.getBoundingClientRect();
    const isInView = rect.top >= 0 && rect.top <= window.innerHeight;

    if (!isInView) {
      firstChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
                <CalendarPlus className="size-4" />
                Opprett kurs
              </Link>
            </Button>
          }
        />
      ) : isMobile ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <motion.header
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="shrink-0 px-4 pt-4 pb-3 border-b border-border"
          >
            <h1 className="text-xl font-semibold text-foreground">
              {weekOffset === 0 ? 'Denne uken' : formatWeekRangeLabel(displayedMonday)}
            </h1>
            <div className="mt-2 flex items-center gap-2">
              <Button variant="ghost" size="icon-sm" onClick={goToPreviousWeek} aria-label="Forrige uke">
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>I dag</Button>
              <Button variant="ghost" size="icon-sm" onClick={goToNextWeek} aria-label="Neste uke">
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </motion.header>
          <MobileDayView
            weekDays={weekDays}
            selectedDayIndex={selectedDayIndex}
            onDaySelect={setSelectedDayIndex}
            events={filteredEvents}
            isLoading={isLoading}
            error={error}
            onRetry={loadScheduleData}
            hasEventsThisWeek={hasFilteredEventsThisWeek}
            hasCourses={courses.length > 0}
          />
        </div>
      ) : (
        /* Desktop */
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* Page header + KPI strip + toolbar */}
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="shrink-0 px-6 lg:px-8 pt-6 lg:pt-8 pb-3"
            >
              <div className="mb-6">
                <h1 className="text-3xl font-semibold text-foreground">Timeplan</h1>
                <p className="text-sm mt-1 text-muted-foreground">Uka di — pågående timer, ledige plasser, neste time.</p>
              </div>

              <ScheduleKpiStrip kpis={kpis} loading={isLoading} />

              {/* Toolbar OUTSIDE the calendar frame */}
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3">
                <Select value={courseFilter} onValueChange={setCourseFilter}>
                  <SelectTrigger className="w-44" aria-label="Filtrer kurs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle kurs</SelectItem>
                    {courseOptions.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex w-full items-center gap-2 md:ml-auto md:w-auto flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>
                    I dag
                  </Button>
                  <div className="inline-flex items-center gap-1 h-9 px-1.5 rounded-md border border-border bg-background">
                    <Button variant="ghost" size="icon-sm" onClick={goToPreviousWeek} aria-label="Forrige uke">
                      <ChevronLeft className="size-4" />
                    </Button>
                    <span className="text-sm font-medium tabular-nums px-2 text-foreground min-w-[110px] text-center">
                      {weekOffset === 0 ? 'Denne uken' : formatWeekRangeLabel(displayedMonday)}
                    </span>
                    <Button variant="ghost" size="icon-sm" onClick={goToNextWeek} aria-label="Neste uke">
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Calendar frame */}
            <div className="flex-1 min-h-0 px-6 lg:px-8 pb-6 lg:pb-8 overflow-hidden">
              <div className="h-full rounded-lg border border-border bg-card overflow-hidden flex flex-col">
                <div ref={calendarScrollRef} className="relative flex-1 overflow-auto">
                  {isLoading && (
                    <PageLoader variant="overlay" message="Laster timeplan" />
                  )}

                  {error && !isLoading ? (
                    <ErrorState
                      message={error}
                      onRetry={loadScheduleData}
                      className="flex-1 pt-[20vh] h-auto"
                    />
                  ) : !isLoading && (
                    <>
                      {/* Sticky day headers — sentence case, today flips to filled circle */}
                      <div className="sticky top-0 z-20 grid min-w-[1040px] grid-cols-[60px_repeat(7,minmax(140px,1fr))] border-b border-border bg-card">
                        <div />
                        {weekDays.map((day) => (
                          <div key={day.name} className="flex items-center justify-center gap-2 py-2.5">
                            <span className={cn('text-xs font-medium', day.isToday ? 'text-foreground' : 'text-muted-foreground')}>
                              {day.name.slice(0, 3)}
                            </span>
                            <span className={cn(
                              'text-sm font-semibold tabular-nums inline-flex items-center justify-center size-6 rounded-full',
                              day.isToday ? 'bg-foreground text-background' : 'text-foreground',
                            )}>
                              {day.date}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="relative grid min-w-[1040px] grid-cols-[60px_repeat(7,minmax(140px,1fr))]">
                        {!hasFilteredEventsThisWeek && (
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

                        {/* Time axis — 60px per hour to match the new grid rhythm */}
                        <div className="flex flex-col">
                          {TIME_SLOTS.map((time) => (
                            <div key={time} className="h-[60px] border-b border-border-subtle px-2 py-1">
                              <span className="text-[11px] tabular-nums text-tertiary-foreground">{time.replace(':00', '')}</span>
                            </div>
                          ))}
                        </div>

                        {weekDays.map((day, index) => (
                          <DayColumn
                            key={day.name}
                            isToday={day.isToday}
                            events={filteredEvents[index] || []}
                            selectedEventId={selectedEvent?.id}
                            onSelectEvent={handleSelectEvent}
                            nowHours={nowHours}
                            nowMinutes={nowMinutes}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Detail sidebar */}
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
                <div className="w-80 min-w-80 border-l border-border">
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

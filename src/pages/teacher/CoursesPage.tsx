import { useState, useMemo, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CalendarPlus,
  Calendar,
  ChevronDown,
} from 'lucide-react';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { pageVariants, pageTransition } from '@/lib/motion';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { CoursesEmptyState } from '@/components/teacher/CoursesEmptyState';
import { CourseListView, CourseListSkeleton } from '@/components/teacher/CourseListView';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { SearchInput } from '@/components/ui/search-input';
import { useTeacherShell } from '@/components/teacher/TeacherShellContext';
import { cn } from '@/lib/utils';
import { EmptyStateToggle } from '@/components/ui/EmptyStateToggle';
import { useAuth } from '@/contexts/AuthContext';
import { getShowEmptyState } from '@/lib/utils';
import { fetchCourses } from '@/services/courses';
import type { SessionScheduleRow } from '@/services/courses';
import type { Course } from '@/types/database';
import { typedFrom } from '@/lib/supabase';

/**
 * Maps a Course to a SessionScheduleRow shape for display in the table.
 */
function mapCourseToRow(course: Course, signupsCount: number, nextSessionDate?: string): SessionScheduleRow {
  // Extract start time from time_schedule (e.g. "Mandager 18:00-19:15" → "18:00")
  const timeMatch = course.time_schedule?.match(/(\d{2}:\d{2})/);
  const startTime = timeMatch ? timeMatch[1] : '';

  // Calculate end time from start + duration
  let endTime = '';
  if (startTime && course.duration) {
    const [h, m] = startTime.split(':').map(Number);
    const totalMin = h * 60 + m + course.duration;
    endTime = `${Math.floor(totalMin / 60).toString().padStart(2, '0')}:${(totalMin % 60).toString().padStart(2, '0')}`;
  }
  // Try second time from time_schedule (e.g. "18:00-19:15")
  if (!endTime) {
    const endMatch = course.time_schedule?.match(/\d{2}:\d{2}-(\d{2}:\d{2})/);
    if (endMatch) endTime = endMatch[1];
  }

  return {
    sessionId: course.id,
    courseId: course.id,
    courseTitle: course.title,
    courseType: course.course_type as 'course-series' | 'event' | 'online',
    sessionDate: nextSessionDate || course.start_date || (course.created_at || '').slice(0, 10),
    startTime,
    endTime,
    location: course.location || '',
    price: course.price,
    signupsCount,
    maxParticipants: course.max_participants,
    courseStatus: course.status,
    courseStartDate: course.start_date,
    courseEndDate: course.end_date,
    totalWeeks: course.total_weeks,
  };
}

const CoursesPage = () => {
  const showEmptyState = getShowEmptyState();
  const { currentOrganization } = useAuth();
  const { setAction } = useTeacherShell();
  const [searchQuery, setSearchQuery] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [signupsCounts, setSignupsCounts] = useState<Record<string, number>>({});
  const [nextSessionDates, setNextSessionDates] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);

  // Fetch courses from Supabase
  const loadData = useCallback(async () => {
    if (!currentOrganization?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const coursesResult = await fetchCourses(currentOrganization.id);

      if (coursesResult.error) {
        setError('Kunne ikke hente kurs. Sjekk nettilkoblingen og prøv på nytt.');
        return;
      }

      const coursesData = coursesResult.data || [];
      setCourses(coursesData);

      // Fetch signups count for all courses
      const courseIds = coursesData.map(c => c.id);

      if (courseIds.length > 0) {
        const { data: signupsData, error: signupsError } = await typedFrom('signups')
          .select('course_id')
          .in('course_id', courseIds)
          .eq('status', 'confirmed');

        if (signupsError) {
          logger.error('Failed to fetch signups counts:', signupsError);
        }

        const counts: Record<string, number> = {};
        (signupsData as { course_id: string }[] | null)?.forEach(s => {
          counts[s.course_id] = (counts[s.course_id] || 0) + 1;
        });
        setSignupsCounts(counts);

        // Fetch next upcoming session date per course (for DateBadge)
        const today = new Date().toISOString().split('T')[0];
        const { data: sessionsData } = await typedFrom('course_sessions')
          .select('course_id, session_date')
          .in('course_id', courseIds)
          .gte('session_date', today)
          .order('session_date', { ascending: true });

        const nextDates: Record<string, string> = {};
        (sessionsData as { course_id: string; session_date: string }[] | null)?.forEach(s => {
          if (!nextDates[s.course_id]) {
            nextDates[s.course_id] = s.session_date;
          }
        });
        setNextSessionDates(nextDates);
      }
    } catch {
      setError('Kunne ikke laste inn kurs. Prøv på nytt.');
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization?.id]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Classify courses by dates, not status
  const { currentRows, pastRows } = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const current: SessionScheduleRow[] = [];
    const past: SessionScheduleRow[] = [];

    for (const c of courses) {
      const row = mapCourseToRow(c, signupsCounts[c.id] || 0, nextSessionDates[c.id]);

      if (c.status === 'cancelled') {
        past.push(row);
      } else {
        const cutoff = c.end_date || c.start_date;
        if (cutoff && cutoff < today) {
          past.push(row);
        } else {
          current.push(row);
        }
      }
    }

    return { currentRows: current, pastRows: past };
  }, [courses, signupsCounts, nextSessionDates]);

  // Search filtering
  const filterBySearch = useCallback((rows: SessionScheduleRow[]) => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase().trim();
    return rows.filter(r =>
      r.courseTitle.toLowerCase().includes(q) ||
      r.location.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const filteredCurrentRows = useMemo(() => filterBySearch(currentRows), [currentRows, filterBySearch]);
  const filteredPastRows = useMemo(() => filterBySearch(pastRows), [pastRows, filterBySearch]);

  // Auto-expand past section when search finds results there
  useEffect(() => {
    if (searchQuery.trim() && filteredPastRows.length > 0) {
      setShowPast(true);
    } else if (!searchQuery.trim()) {
      setShowPast(false);
    }
  }, [searchQuery, filteredPastRows.length]);

  const showCoursesEmptyState = showEmptyState || (!isLoading && courses.length === 0 && !error);

  useEffect(() => {
    setAction(null);
    return () => setAction(null);
  }, [setAction]);

  return (
      <div className="flex-1 flex flex-col min-h-full overflow-y-auto bg-background">

        <MobileTeacherHeader title="Mine kurs" />

        {/* Header */}
        <motion.header
          variants={pageVariants}
          initial="initial"
          animate="animate"
          transition={pageTransition}
          className="shrink-0 px-6 lg:px-8 pt-6 lg:pt-8 pb-0"
        >
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <h1 className="type-heading-1 text-foreground">Mine kurs</h1>
              {!showCoursesEmptyState && (
                <p className="type-body mt-1 text-muted-foreground">Oversikt over kursene dine.</p>
              )}
            </div>
            {!showCoursesEmptyState && (
              <Button asChild size="sm" className="gap-1.5">
                <Link to="/teacher/new-course">
                  <CalendarPlus className="h-3.5 w-3.5" />
                  Opprett kurs
                </Link>
              </Button>
            )}
          </div>

          {/* Search */}
          {!showCoursesEmptyState && (
            <div className="pb-4">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Søk etter kurs"
                aria-label="Søk etter kurs"
                className="max-w-xs"
              />
            </div>
          )}
        </motion.header>

        {/* Content */}
        <div className="flex-1 px-6 lg:px-8 pb-6 lg:pb-8">
          {isLoading ? (
            <div role="status" aria-live="polite" aria-label="Laster kurs">
              <span className="sr-only">Henter kurs</span>
              <CourseListSkeleton />
            </div>
          ) : error ? (
            <ErrorState
              title="Kunne ikke laste kurs"
              message={error}
              onRetry={loadData}
              variant="card"
            />
          ) : showCoursesEmptyState ? (
            <CoursesEmptyState />
          ) : (
            <div className="space-y-10">
              {/* Current courses */}
              {filteredCurrentRows.length === 0 && searchQuery ? (
                filteredPastRows.length === 0 && (
                  <Card className="p-6">
                    <EmptyState
                      icon={Calendar}
                      title="Ingen kurs funnet"
                      description="Prøv et annet søkeord eller fjern søket for å se alle kurs."
                      className="py-8"
                    />
                  </Card>
                )
              ) : filteredCurrentRows.length === 0 ? (
                <Card className="p-6">
                  <EmptyState
                    icon={Calendar}
                    title="Ingen aktive kurs"
                    description="Opprett et kurs for å komme i gang."
                    action={
                      <Button asChild size="sm">
                        <Link to="/teacher/new-course">Opprett kurs</Link>
                      </Button>
                    }
                    className="py-8"
                  />
                </Card>
              ) : (
                <CourseListView courses={filteredCurrentRows} />
              )}

              {/* Past / cancelled section */}
              {pastRows.length > 0 && (
                <Collapsible open={showPast} onOpenChange={setShowPast}>
                  <div className="flex items-center justify-between">
                    <h2 className="type-title text-foreground">Tidligere kurs</h2>
                    <CollapsibleTrigger asChild>
                      <Button size="sm" className="gap-1.5">
                        {showPast ? 'Skjul' : `Vis ${pastRows.length}`}
                        <ChevronDown className={cn(
                          'h-3.5 w-3.5 smooth-transition',
                          showPast && 'rotate-180'
                        )} />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <div className="pt-3 opacity-80">
                      <CourseListView courses={filteredPastRows} flat />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          )}
        </div>
        <EmptyStateToggle />
      </div>
  );
};

export default CoursesPage;

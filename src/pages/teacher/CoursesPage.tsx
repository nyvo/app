import { useState, useMemo, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CalendarPlus,
  Calendar,
} from 'lucide-react';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { pageVariants, pageTransition } from '@/lib/motion';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { CoursesEmptyState } from '@/components/teacher/CoursesEmptyState';
import { CourseListView, CourseListSkeleton } from '@/components/teacher/CourseListView';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { useTeacherShell } from '@/components/teacher/TeacherShellContext';
import { FilterTabs, FilterTab } from '@/components/ui/filter-tabs';
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
    timeSchedule: course.time_schedule || null,
    imageUrl: course.image_url || null,
  };
}

const CoursesPage = () => {
  const showEmptyState = getShowEmptyState();
  const { currentOrganization } = useAuth();
  const { setAction } = useTeacherShell();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'upcoming' | 'draft' | 'past'>('all');
  const [courses, setCourses] = useState<Course[]>([]);
  const [signupsCounts, setSignupsCounts] = useState<Record<string, number>>({});
  const [nextSessionDates, setNextSessionDates] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Map all courses to rows
  const allRows = useMemo(() => {
    return courses.map(c => ({
      row: mapCourseToRow(c, signupsCounts[c.id] || 0, nextSessionDates[c.id]),
      course: c,
    }));
  }, [courses, signupsCounts, nextSessionDates]);

  // Filter counts for pills
  const filterCounts = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const counts = { all: 0, active: 0, upcoming: 0, draft: 0, past: 0 };
    for (const { course } of allRows) {
      counts.all++;
      if (course.status === 'active') counts.active++;
      else if (course.status === 'upcoming') counts.upcoming++;
      else if (course.status === 'draft') counts.draft++;
      const cutoff = course.end_date || course.start_date;
      if (course.status === 'cancelled' || course.status === 'completed' || (cutoff && cutoff < today)) {
        counts.past++;
      }
    }
    return counts;
  }, [allRows]);

  // Apply status + search filters, sort by next session date
  const filteredRows = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const q = searchQuery.toLowerCase().trim();

    return allRows
      .filter(({ row, course }) => {
        // Status filter
        if (statusFilter === 'active' && course.status !== 'active') return false;
        if (statusFilter === 'upcoming' && course.status !== 'upcoming') return false;
        if (statusFilter === 'draft' && course.status !== 'draft') return false;
        if (statusFilter === 'past') {
          const cutoff = course.end_date || course.start_date;
          const isPast = course.status === 'cancelled' || course.status === 'completed' || (cutoff && cutoff < today);
          if (!isPast) return false;
        }
        if (statusFilter === 'all') {
          // Default: hide past/cancelled
          const cutoff = course.end_date || course.start_date;
          const isPast = course.status === 'cancelled' || course.status === 'completed' || (cutoff && cutoff < today);
          if (isPast) return false;
        }

        // Search filter
        if (q && !row.courseTitle.toLowerCase().includes(q) && !row.location.toLowerCase().includes(q)) return false;

        return true;
      })
      .map(({ row }) => row)
      .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
  }, [allRows, statusFilter, searchQuery]);

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

          {/* Search + Filters */}
          {!showCoursesEmptyState && (
            <div className="flex flex-col gap-3 pb-4">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Søk etter kurs"
                aria-label="Søk etter kurs"
                className="max-w-xs"
              />
              <FilterTabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)} variant="pill">
                {([
                  { value: 'all', label: 'Alle' },
                  { value: 'active', label: 'Aktive' },
                  { value: 'upcoming', label: 'Kommende' },
                  { value: 'draft', label: 'Utkast' },
                  { value: 'past', label: 'Tidligere' },
                ] as const).map(({ value, label }) => {
                  const count = filterCounts[value];
                  if (value !== 'all' && count === 0) return null;
                  return (
                    <FilterTab key={value} value={value}>
                      {label}{value !== 'all' && count > 0 ? ` (${count})` : ''}
                    </FilterTab>
                  );
                })}
              </FilterTabs>
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
          ) : filteredRows.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title={searchQuery ? 'Ingen kurs funnet' : 'Ingen kurs her'}
              description={searchQuery ? 'Prøv et annet søkeord eller fjern søket.' : 'Prøv et annet filter.'}
              className="py-16"
            />
          ) : (
            <CourseListView courses={filteredRows} />
          )}
        </div>
        <EmptyStateToggle />
      </div>
  );
};

export default CoursesPage;

import { useState, useMemo, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CalendarPlus,
  Calendar,
  Archive,
} from 'lucide-react';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import { SidebarProvider } from '@/components/ui/sidebar';
import { pageVariants, pageTransition } from '@/lib/motion';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader';
import { CoursesEmptyState } from '@/components/teacher/CoursesEmptyState';
import { CourseListView, CourseListSkeleton } from '@/components/teacher/CourseListView';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
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
function mapCourseToRow(course: Course, signupsCount: number): SessionScheduleRow {
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
    sessionDate: course.start_date || (course.created_at || '').slice(0, 10),
    startTime,
    endTime,
    location: course.location || '',
    price: course.price,
    signupsCount,
    maxParticipants: course.max_participants,
    courseStatus: course.status,
    courseStartDate: course.start_date,
    totalWeeks: course.total_weeks,
  };
}

const CoursesPage = () => {
  const showEmptyState = getShowEmptyState();
  const { currentOrganization } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [signupsCounts, setSignupsCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewFilter, setViewFilter] = useState<'active' | 'archive'>('active');

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

  // Active courses (not completed)
  const activeCourses = useMemo(
    () => courses.filter(c => c.status !== 'completed'),
    [courses]
  );

  // Completed courses for archive
  const completedCourses = useMemo(
    () => courses.filter(c => c.status === 'completed'),
    [courses]
  );

  // Map to table rows
  const activeRows = useMemo(
    () => activeCourses.map(c => mapCourseToRow(c, signupsCounts[c.id] || 0)),
    [activeCourses, signupsCounts]
  );

  const archiveRows = useMemo(
    () => completedCourses.map(c => mapCourseToRow(c, signupsCounts[c.id] || 0)),
    [completedCourses, signupsCounts]
  );

  // Filter by search
  const filteredActiveRows = useMemo(() => {
    if (!searchQuery.trim()) return activeRows;
    const query = searchQuery.toLowerCase().trim();
    return activeRows.filter(r =>
      r.courseTitle.toLowerCase().includes(query) ||
      r.location.toLowerCase().includes(query)
    );
  }, [activeRows, searchQuery]);

  const filteredArchiveRows = useMemo(() => {
    if (!searchQuery.trim()) return archiveRows;
    const query = searchQuery.toLowerCase().trim();
    return archiveRows.filter(r =>
      r.courseTitle.toLowerCase().includes(query) ||
      r.location.toLowerCase().includes(query)
    );
  }, [archiveRows, searchQuery]);

  const showCoursesEmptyState = showEmptyState || (!isLoading && courses.length === 0 && !error);

  return (
    <SidebarProvider>
      <TeacherSidebar />
      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto bg-surface">

        <MobileTeacherHeader title="Mine kurs" />

        {/* Header */}
        <motion.header
          variants={pageVariants}
          initial="initial"
          animate="animate"
          transition={pageTransition}
          className="shrink-0 px-6 lg:px-8 pt-6 lg:pt-8 pb-0"
        >
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-geist text-2xl font-medium text-text-primary tracking-tight">Mine kurs</h1>
              {!showCoursesEmptyState && (
                <p className="text-sm text-text-secondary mt-1">Oversikt over kursene dine.</p>
              )}
            </div>
            {!showCoursesEmptyState && (
              <Button asChild size="compact" className="gap-2">
                <Link to="/teacher/new-course">
                  <CalendarPlus className="h-3.5 w-3.5" />
                  <span>Opprett nytt</span>
                </Link>
              </Button>
            )}
          </div>

          {/* Filters row */}
          {!showCoursesEmptyState && (
            <div className="flex flex-col md:flex-row gap-3 md:items-center pb-4">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Søk etter kurs"
                aria-label="Søk etter kurs"
                className="flex-1 max-w-xs"
              />
              <div className="md:ml-auto">
                <button
                  onClick={() => setViewFilter(viewFilter === 'archive' ? 'active' : 'archive')}
                  className={cn(
                    'flex items-center gap-2 h-10 rounded-lg border px-3 py-2 text-xs font-medium ios-ease whitespace-nowrap cursor-pointer',
                    viewFilter === 'archive'
                      ? 'bg-zinc-900 text-white border-zinc-900 hover:bg-zinc-800'
                      : 'bg-white text-text-secondary border-border hover:bg-surface-elevated hover:text-text-primary'
                  )}
                >
                  <Archive className="h-3.5 w-3.5" />
                  Arkiv
                </button>
              </div>
            </div>
          )}
        </motion.header>

        {/* Content */}
        <div className="flex-1 px-6 lg:px-8 pb-6 lg:pb-8">
            {isLoading ? (
              <div
                className="pb-8"
                role="status"
                aria-live="polite"
                aria-label="Laster kurs"
              >
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
            ) : viewFilter === 'active' ? (
              <div className="h-full overflow-y-auto custom-scrollbar pb-8">
                {searchQuery && filteredActiveRows.length === 0 ? (
                  <EmptyState
                    icon={Calendar}
                    title="Ingen kurs funnet"
                    description="Prøv et annet søkeord eller fjern søket for å se alle kurs."
                  />
                ) : filteredActiveRows.length === 0 ? (
                  <EmptyState
                    icon={Calendar}
                    title="Ingen aktive kurs"
                    description="Opprett et kurs for å komme i gang."
                    action={
                      <Button asChild size="sm">
                        <Link to="/teacher/new-course">Opprett kurs</Link>
                      </Button>
                    }
                  />
                ) : (
                  <CourseListView courses={filteredActiveRows} />
                )}
              </div>
            ) : (
              <div className="h-full overflow-y-auto custom-scrollbar pb-8">
                {filteredArchiveRows.length === 0 ? (
                  <EmptyState
                    icon={Calendar}
                    title={searchQuery ? 'Ingen fullførte kurs funnet' : 'Ingen fullførte kurs'}
                    description={searchQuery
                      ? 'Prøv et annet søkeord eller fjern søket.'
                      : 'Fullførte kurs vil vises her.'}
                  />
                ) : (
                  <CourseListView courses={filteredArchiveRows} />
                )}
              </div>
            )}
        </div>
        <EmptyStateToggle />
      </main>
    </SidebarProvider>
  );
};

export default CoursesPage;

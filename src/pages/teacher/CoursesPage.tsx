import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  Leaf,
  Menu,
  Calendar,
  Archive,
} from 'lucide-react';
import { ErrorState } from '@/components/ui/error-state';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { pageVariants, pageTransition } from '@/lib/motion';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { CoursesEmptyState } from '@/components/teacher/CoursesEmptyState';
import { CourseSection, CourseSectionSkeleton, ArchiveLink } from '@/components/teacher/CourseSection';
import { CoursePreviewCard } from '@/components/teacher/CoursePreviewCard';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { useEmptyState } from '@/contexts/EmptyStateContext';
import { EmptyStateToggle } from '@/components/ui/EmptyStateToggle';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCourses, type CourseWithStyle } from '@/services/courses';
import { typedFrom } from '@/lib/supabase';
import type { DetailedCourse } from '@/data/mockData';

// Helper to map database course to DetailedCourse format
function mapCourseToDetailedCourse(course: CourseWithStyle, signupsCount: number): DetailedCourse {
  // Map course_type to courseType
  const courseTypeMap: Record<string, 'kursrekke' | 'enkeltkurs'> = {
    'course-series': 'kursrekke',
    'event': 'enkeltkurs',
    'online': 'enkeltkurs',
  };

  // Map style normalized_name to type, or use course_type as fallback
  const styleType = course.style?.normalized_name || course.course_type;

  // Format duration
  const formatDuration = () => {
    if (course.total_weeks) return `${course.total_weeks} uker`;
    if (course.duration) return `${course.duration} min`;
    return '';
  };

  // Format price
  const formatPrice = () => {
    if (!course.price) return 'Gratis';
    return `${course.price.toLocaleString('nb-NO')} NOK`;
  };

  // Calculate progress for active courses
  const progress = course.total_weeks && course.current_week
    ? Math.round((course.current_week / course.total_weeks) * 100)
    : undefined;

  return {
    id: course.id,
    title: course.title,
    type: styleType as DetailedCourse['type'],
    courseType: courseTypeMap[course.course_type] || 'enkeltkurs',
    status: course.status,
    location: course.location || 'Ikke angitt',
    timeSchedule: course.time_schedule || '',
    duration: formatDuration(),
    participants: signupsCount,
    maxParticipants: course.max_participants || 0,
    price: formatPrice(),
    progress,
    currentWeek: course.current_week || undefined,
    totalWeeks: course.total_weeks || undefined,
    startDate: course.start_date || undefined,
    endDate: course.end_date || undefined,
    description: course.description || undefined,
    level: course.level ? course.level.charAt(0).toUpperCase() + course.level.slice(1) : undefined,
    imageUrl: course.image_url,
  };
}

/**
 * Sorting logic for courses based on time relevance.
 *
 * Primary sort: Status priority (active > upcoming > rest)
 * Secondary sort: Start date (soonest first)
 * Tertiary sort: Series progression or alphabetical
 *
 * Note: Urgency is shown visually but doesn't affect sort order.
 * This keeps the list predictable while still highlighting issues.
 */
function sortCourses(courses: DetailedCourse[], type: 'kursrekke' | 'enkeltkurs'): DetailedCourse[] {
  return [...courses].sort((a, b) => {
    // Status priority: active courses first, then upcoming
    const statusOrder: Record<string, number> = {
      active: 0,
      upcoming: 1,
      draft: 2,
      completed: 3,
      cancelled: 4,
    };
    const statusDiff = (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5);
    if (statusDiff !== 0) return statusDiff;

    // Then by start date (soonest first)
    if (a.startDate && b.startDate) {
      const dateA = new Date(a.startDate);
      const dateB = new Date(b.startDate);
      const dateDiff = dateA.getTime() - dateB.getTime();
      if (dateDiff !== 0) return dateDiff;
    }

    // For active series: earlier in progression is higher priority
    if (type === 'kursrekke' && a.status === 'active' && b.status === 'active') {
      const progressA = a.currentWeek && a.totalWeeks ? a.currentWeek / a.totalWeeks : 1;
      const progressB = b.currentWeek && b.totalWeeks ? b.currentWeek / b.totalWeeks : 1;
      if (progressA !== progressB) return progressA - progressB;
    }

    // Alphabetical as tiebreaker
    return a.title.localeCompare(b.title, 'nb-NO');
  });
}

const CoursesPage = () => {
  const { showEmptyState } = useEmptyState();
  const { currentOrganization } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [courses, setCourses] = useState<DetailedCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchive, setShowArchive] = useState(false);

  // Fetch courses from Supabase
  const loadCourses = useCallback(async () => {
    if (!currentOrganization?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: coursesData, error: fetchError } = await fetchCourses(currentOrganization.id);

      if (fetchError) {
        setError('Kunne ikke hente kurs. Sjekk nettilkoblingen.');
        return;
      }

      if (!coursesData || coursesData.length === 0) {
        setCourses([]);
        return;
      }

      // Fetch signups count for each course
      const courseIds = coursesData.map(c => c.id);
      const { data: signupsData, error: signupsError } = await typedFrom('signups')
        .select('course_id')
        .in('course_id', courseIds)
        .eq('status', 'confirmed');

      if (signupsError) {
        console.error('Failed to fetch signups counts:', signupsError);
      }

      // Count signups per course
      const signupsCounts: Record<string, number> = {};
      (signupsData as { course_id: string }[] | null)?.forEach(s => {
        signupsCounts[s.course_id] = (signupsCounts[s.course_id] || 0) + 1;
      });

      // Map to DetailedCourse format
      const mappedCourses = coursesData.map(course =>
        mapCourseToDetailedCourse(course, signupsCounts[course.id] || 0)
      );

      setCourses(mappedCourses);
    } catch {
      setError('Kunne ikke laste inn kurs.');
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization?.id]);

  // Initial load
  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  // Filter and group courses
  const { kursrekker, arrangementer, completedCourses, searchResults } = useMemo(() => {
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const filtered = courses.filter(course =>
        course.title.toLowerCase().includes(query) ||
        course.location.toLowerCase().includes(query)
      );

      // Return flat search results (no grouping)
      return {
        kursrekker: [],
        arrangementer: [],
        completedCourses: [],
        searchResults: filtered,
      };
    }

    // Smart default: show active and upcoming courses, archive completed
    const activeCourses = courses.filter(c => c.status !== 'completed');
    const completed = courses.filter(c => c.status === 'completed');

    // Group by course type
    const series = activeCourses.filter(c => c.courseType === 'kursrekke');
    const events = activeCourses.filter(c => c.courseType === 'enkeltkurs');

    return {
      kursrekker: sortCourses(series, 'kursrekke'),
      arrangementer: sortCourses(events, 'enkeltkurs'),
      completedCourses: completed,
      searchResults: [],
    };
  }, [courses, searchQuery]);

  // Show empty state if no courses after loading (or dev toggle active)
  const showCoursesEmptyState = showEmptyState || (!isLoading && courses.length === 0 && !error);

  return (
    <SidebarProvider>
      <TeacherSidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-surface">

        {/* Mobile Header */}
        <div className="flex md:hidden items-center justify-between p-6 border-b border-border bg-surface/80 backdrop-blur-xl z-30 shrink-0">
            <div className="flex items-center gap-3">
                 <Leaf className="h-5 w-5 text-primary" />
                 <span className="font-geist text-base font-medium text-text-primary">Ease</span>
            </div>
            <SidebarTrigger>
                <Menu className="h-6 w-6 text-muted-foreground" />
            </SidebarTrigger>
        </div>

        {/* Header Area & Controls */}
        <motion.div
          variants={pageVariants}
          initial="initial"
          animate="animate"
          transition={pageTransition}
          className="flex flex-col gap-6 px-8 py-8 bg-surface shrink-0"
        >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="font-geist text-2xl font-medium text-text-primary tracking-tight">Mine Kurs</h1>
                    {!showCoursesEmptyState && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {(() => {
                            const activeCount = courses.filter(c => c.status === 'active').length;
                            const upcomingCount = courses.filter(c => c.status === 'upcoming').length;
                            const parts = [];
                            if (activeCount > 0) parts.push(`${activeCount} aktive`);
                            if (upcomingCount > 0) parts.push(`${upcomingCount} kommende`);
                            return parts.length > 0 ? parts.join(', ') : 'Ingen aktive kurs';
                          })()}
                      </p>
                    )}
                </div>
                {!showCoursesEmptyState && (
                  <div className="flex items-center gap-3">
                    <Button asChild size="compact" className="gap-2">
                      <Link to="/teacher/new-course">
                        <Plus className="h-3.5 w-3.5" />
                        <span>Opprett nytt</span>
                      </Link>
                    </Button>
                  </div>
                )}
            </div>

            {/* Search */}
            {!showCoursesEmptyState && (
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Søk etter kurs"
                aria-label="Søk etter kurs"
                className="max-w-md"
              />
            )}
        </motion.div>

        {/* Course List / Empty State */}
        <div className="flex-1 overflow-hidden px-8 pb-8">
            {isLoading ? (
              <div
                className="h-full overflow-y-auto custom-scrollbar pb-8 space-y-8"
                role="status"
                aria-live="polite"
                aria-label="Laster kurs"
              >
                <span className="sr-only">Henter kurs</span>
                <CourseSectionSkeleton count={3} />
                <CourseSectionSkeleton count={2} />
              </div>
            ) : error ? (
              <ErrorState
                title="Kunne ikke laste kurs"
                message={error}
                onRetry={loadCourses}
                variant="card"
              />
            ) : showCoursesEmptyState ? (
              <CoursesEmptyState />
            ) : searchQuery ? (
              // Search results - flat list
              <div className="h-full overflow-y-auto custom-scrollbar pb-8">
                {searchResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center rounded-3xl bg-white border border-gray-200">
                    <div className="mb-4 rounded-full bg-surface p-4 border border-surface-elevated">
                       <Calendar className="h-8 w-8 text-text-tertiary stroke-[1.5]" />
                    </div>
                    <h3 className="font-geist text-sm font-medium text-text-primary">Ingen kurs funnet</h3>
                    <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                       Prøv et annet søkeord eller fjern søket for å se alle kurs.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground mb-4">
                      {searchResults.length} resultat{searchResults.length !== 1 ? 'er' : ''} for «{searchQuery}»
                    </p>
                    {searchResults.map((course) => (
                      <CoursePreviewCard
                        key={course.id}
                        course={course}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Grouped view
              <div className="h-full overflow-y-auto custom-scrollbar pb-8 space-y-8">
                {/* Kursrekker (Series) */}
                <CourseSection
                  title="Kursrekker"
                  subtitle="Faste ukentlige kurs"
                  courses={kursrekker}
                  maxVisible={5}
                />

                {/* Arrangementer (Events) */}
                <CourseSection
                  title="Arrangementer"
                  subtitle="Workshops og enkeltarrangementer"
                  courses={arrangementer}
                  maxVisible={5}
                />

                {/* Archive section */}
                {completedCourses.length > 0 && !showArchive && (
                  <ArchiveLink
                    count={completedCourses.length}
                    onClick={() => setShowArchive(true)}
                  />
                )}

                {/* Expanded archive */}
                {showArchive && completedCourses.length > 0 && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h2 className="text-sm font-medium text-text-primary uppercase tracking-wide flex items-center gap-2">
                          <Archive className="h-4 w-4" />
                          Arkiv
                        </h2>
                        <span className="px-2 py-0.5 rounded-full bg-surface-elevated text-xs font-medium text-muted-foreground">
                          {completedCourses.length}
                        </span>
                      </div>
                      <button
                        onClick={() => setShowArchive(false)}
                        className="text-xs text-muted-foreground hover:text-text-primary transition-colors"
                      >
                        Skjul arkiv
                      </button>
                    </div>
                    <div className="space-y-2">
                      {completedCourses.map((course) => (
                        <CoursePreviewCard
                          key={course.id}
                          course={course}
                          showUrgency={false}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Empty state when both sections are empty but archive exists */}
                {kursrekker.length === 0 && arrangementer.length === 0 && completedCourses.length > 0 && !showArchive && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-sm text-muted-foreground">
                      Ingen aktive eller kommende kurs. Se arkivet for fullførte kurs.
                    </p>
                  </div>
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

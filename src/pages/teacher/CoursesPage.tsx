import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  MoreHorizontal,
  MapPin,
  Users,
  Leaf,
  Menu,
  Calendar,
  Loader2
} from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { pageVariants, pageTransition } from '@/lib/motion';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { CoursesEmptyState } from '@/components/teacher/CoursesEmptyState';
import { StatusBadge } from '@/components/ui/status-badge';
import type { CourseStatus } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { useEmptyState } from '@/contexts/EmptyStateContext';
import EmptyStateToggle from '@/components/ui/EmptyStateToggle';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCourses, type CourseWithStyle } from '@/services/courses';
import { supabase } from '@/lib/supabase';
import type { DetailedCourse } from '@/data/mockData';

const courseTypeLabels: Record<string, string> = {
  kursrekke: 'Kursrekke',
  enkeltkurs: 'Enkeltkurs',
};

const CourseRow = ({ course }: { course: DetailedCourse }) => {
  return (
    <div className="group flex items-center p-4 border-b border-surface-elevated hover:bg-secondary transition-colors cursor-pointer">
      {/* Course & Location - flex-[2] */}
      <Link to={`/teacher/courses/${course.id}`} className="flex items-center gap-4 flex-[2] min-w-0 pr-4">
        <div className="min-w-0">
          <h3 className="text-sm font-medium truncate text-text-primary group-hover:text-primary transition-colors">
            {course.title}
          </h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{course.location}</span>
          </div>
        </div>
      </Link>

      {/* Course Type Column - flex-1 */}
      <div className="hidden md:block flex-1 min-w-0 pr-4">
        <span className="text-xs font-medium text-text-secondary">
          {courseTypeLabels[course.courseType]}
        </span>
      </div>

      {/* Status Column - flex-1 */}
      <div className="hidden md:flex flex-1 min-w-0 pr-4">
        <StatusBadge
          status={course.status as CourseStatus}
          customLabel={course.status === 'upcoming' ? course.startDate : undefined}
          size="sm"
        />
      </div>

      {/* Date/Time Column - flex-1 */}
      <div className="hidden md:block flex-1 min-w-0 pr-4">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-text-primary">{course.timeSchedule.split(' ')[0]}</span>
          <span className="text-xxs text-muted-foreground">{course.timeSchedule.split(' ').slice(1).join(' ')}</span>
        </div>
      </div>

      {/* Participants Column - flex-1 */}
      <div className="hidden lg:flex flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
          <span className="text-xs font-medium text-sidebar-foreground">
            {course.participants} <span className="text-text-tertiary">/ {course.maxParticipants}</span>
          </span>
        </div>
      </div>

      {/* Price Column - w-24 fixed */}
      <div className="hidden lg:block w-24 text-right pr-4">
        <span className="text-xs font-medium text-text-secondary">{course.price}</span>
      </div>

      {/* Actions Column - w-12 fixed */}
      <div className="w-12 flex justify-end">
        <button className="text-text-tertiary hover:text-text-primary p-1.5 rounded-full hover:bg-surface-elevated transition-colors cursor-pointer" aria-label="Flere handlinger">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

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
    description: course.description || undefined,
    level: course.level ? course.level.charAt(0).toUpperCase() + course.level.slice(1) : undefined,
  };
}

const CoursesPage = () => {
  const { showEmptyState } = useEmptyState();
  const { currentOrganization } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'upcoming' | 'completed'>('all');
  const [courses, setCourses] = useState<DetailedCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch courses from Supabase
  useEffect(() => {
    async function loadCourses() {
      if (!currentOrganization?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { data: coursesData, error: fetchError } = await fetchCourses(currentOrganization.id);

        if (fetchError) {
          setError('Kunne ikke hente kurs');
          return;
        }

        if (!coursesData || coursesData.length === 0) {
          setCourses([]);
          return;
        }

        // Fetch signups count for each course
        const courseIds = coursesData.map(c => c.id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: signupsData } = await (supabase
          .from('signups') as any)
          .select('course_id')
          .in('course_id', courseIds)
          .eq('status', 'confirmed');

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
        setError('En feil oppstod');
      } finally {
        setIsLoading(false);
      }
    }

    loadCourses();
  }, [currentOrganization?.id]);

  const filteredCourses = useMemo(() => {
    let result = courses;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(course =>
        course.title.toLowerCase().includes(query) ||
        course.location.toLowerCase().includes(query)
      );
    }

    // Filter by status tabs
    if (activeFilter !== 'all') {
      result = result.filter(course => course.status === activeFilter);
    }

    return result;
  }, [courses, searchQuery, activeFilter]);

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
                 <span className="font-geist text-base font-semibold text-text-primary">Ease</span>
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
                    <p className="text-sm text-muted-foreground mt-1">Administrer dine aktive kursrekker, workshops og arrangementer.</p>
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

            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row md:items-center gap-3">
                {/* Search */}
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Søk etter kurs..."
                  aria-label="Søk etter kurs"
                  className="flex-1 max-w-md"
                />

                {/* Filters */}
                <div className="flex gap-2 overflow-x-auto py-1 no-scrollbar">
                    <button
                      onClick={() => setActiveFilter('all')}
                      className={`shrink-0 h-10 rounded-lg px-3 py-2 text-xs font-medium border ios-ease cursor-pointer ${activeFilter === 'all' ? 'bg-white text-text-primary shadow-sm border-border' : 'bg-transparent text-text-secondary border-transparent hover:bg-surface-elevated hover:text-text-primary'}`}
                    >
                        Alle
                    </button>
                    <button
                      onClick={() => setActiveFilter('active')}
                      className={`shrink-0 h-10 rounded-lg px-3 py-2 text-xs font-medium border ios-ease cursor-pointer ${activeFilter === 'active' ? 'bg-white text-text-primary shadow-sm border-border' : 'bg-transparent text-text-secondary border-transparent hover:bg-surface-elevated hover:text-text-primary'}`}
                    >
                        Aktive
                    </button>
                    <button
                      onClick={() => setActiveFilter('upcoming')}
                      className={`shrink-0 h-10 rounded-lg px-3 py-2 text-xs font-medium border ios-ease cursor-pointer ${activeFilter === 'upcoming' ? 'bg-white text-text-primary shadow-sm border-border' : 'bg-transparent text-text-secondary border-transparent hover:bg-surface-elevated hover:text-text-primary'}`}
                    >
                        Kommende
                    </button>
                    <button
                      onClick={() => setActiveFilter('completed')}
                      className={`shrink-0 h-10 rounded-lg px-3 py-2 text-xs font-medium border ios-ease cursor-pointer ${activeFilter === 'completed' ? 'bg-white text-text-primary shadow-sm border-border' : 'bg-transparent text-text-secondary border-transparent hover:bg-surface-elevated hover:text-text-primary'}`}
                    >
                        Fullførte
                    </button>
                </div>
            </div>
        </motion.div>

        {/* Course List / Empty State */}
        <div className="flex-1 overflow-hidden px-8 pb-8">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-text-tertiary" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-64 text-center border border-border rounded-2xl bg-white">
                <p className="text-sm text-destructive">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-2 text-sm text-text-secondary hover:text-text-primary underline"
                >
                  Prøv igjen
                </button>
              </div>
            ) : showCoursesEmptyState ? (
              <CoursesEmptyState />
            ) : filteredCourses.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-64 text-center border border-border rounded-2xl bg-white">
                  <div className="mb-4 rounded-full bg-surface p-4 border border-surface-elevated">
                     <Calendar className="h-8 w-8 text-text-tertiary stroke-[1.5]" />
                  </div>
                  <h3 className="font-geist text-sm font-medium text-text-primary">Ingen kurs funnet</h3>
                  <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                     Det ser ut til at du ikke har noen kurs her ennå. Opprett et nytt kurs for å komme i gang.
                  </p>
               </div>
            ) : (
              <div className="h-full rounded-2xl border border-border bg-white shadow-sm overflow-hidden flex flex-col">
                  <div className="overflow-auto flex-1 custom-scrollbar">
                    {/* Table Header */}
                    <div className="flex items-center px-4 py-3 border-b border-border bg-surface/50 sticky top-0">
                        <div className="flex-[2] pr-4 text-xxs font-semibold uppercase tracking-wide text-muted-foreground">Kurs & Sted</div>
                        <div className="hidden md:block flex-1 pr-4 text-xxs font-semibold uppercase tracking-wide text-muted-foreground">Kurstype</div>
                        <div className="hidden md:block flex-1 pr-4 text-xxs font-semibold uppercase tracking-wide text-muted-foreground">Status</div>
                        <div className="hidden md:block flex-1 pr-4 text-xxs font-semibold uppercase tracking-wide text-muted-foreground">Tidspunkt</div>
                        <div className="hidden lg:block flex-1 pr-4 text-xxs font-semibold uppercase tracking-wide text-muted-foreground">Deltakere</div>
                        <div className="hidden lg:block w-24 pr-4 text-right text-xxs font-semibold uppercase tracking-wide text-muted-foreground">Pris</div>
                        <div className="w-12"></div>
                    </div>

                    {/* Table Body */}
                    <div className="divide-y divide-surface-elevated">
                      {filteredCourses.map((course) => (
                          <CourseRow key={course.id} course={course} />
                      ))}
                    </div>
                  </div>
              </div>
            )}
        </div>
        <EmptyStateToggle />
      </main>
    </SidebarProvider>
  );
};

export default CoursesPage;

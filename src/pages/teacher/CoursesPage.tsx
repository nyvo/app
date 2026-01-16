import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Plus,
  MoreHorizontal,
  MapPin,
  Users,
  Leaf,
  Menu,
  Calendar,
  Loader2,
  ExternalLink,
  Copy,
  Share2
} from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { pageVariants, pageTransition } from '@/lib/motion';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { CoursesEmptyState } from '@/components/teacher/CoursesEmptyState';
import { StatusBadge } from '@/components/ui/status-badge';
import type { CourseStatus } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
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

// Format date range for display (e.g., "17. jan – 7. feb 2025")
function formatDateRange(startDate?: string, endDate?: string): string | null {
  if (!startDate) return null;

  const start = new Date(startDate);

  // Validate start date
  if (isNaN(start.getTime())) return null;

  const end = endDate ? new Date(endDate) : null;

  // Validate end date if provided
  if (end && isNaN(end.getTime())) return null;

  // Validate end is not before start
  if (end && end.getTime() < start.getTime()) return null;

  const formatDay = (date: Date) => date.getDate();
  const formatMonth = (date: Date) => date.toLocaleDateString('nb-NO', { month: 'short' }).replace('.', '');
  const formatYear = (date: Date) => date.getFullYear();

  if (!end) {
    // Single date - show full format
    return `${formatDay(start)}. ${formatMonth(start)} ${formatYear(start)}`;
  }

  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  const sameDay = sameMonth && start.getDate() === end.getDate();

  // Same day - just show single date
  if (sameDay) {
    return `${formatDay(start)}. ${formatMonth(start)} ${formatYear(start)}`;
  }

  if (sameMonth) {
    // Same month: "17. – 28. jan 2025"
    return `${formatDay(start)}. – ${formatDay(end)}. ${formatMonth(end)} ${formatYear(end)}`;
  } else if (sameYear) {
    // Same year: "17. jan – 7. feb 2025"
    return `${formatDay(start)}. ${formatMonth(start)} – ${formatDay(end)}. ${formatMonth(end)} ${formatYear(end)}`;
  } else {
    // Different years: "17. des 2024 – 7. jan 2025"
    return `${formatDay(start)}. ${formatMonth(start)} ${formatYear(start)} – ${formatDay(end)}. ${formatMonth(end)} ${formatYear(end)}`;
  }
}

const CourseCard = ({ course, organizationSlug }: { course: DetailedCourse; organizationSlug?: string }) => {
  const navigate = useNavigate();

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/studio/${organizationSlug}/${course.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Lenke kopiert');
  };

  const handleOpenPublicPage = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`/studio/${organizationSlug}/${course.id}`, '_blank');
  };

  const progressPercentage = course.maxParticipants > 0 
    ? Math.min((course.participants / course.maxParticipants) * 100, 100) 
    : 0;

  return (
    <div 
      className="group relative flex flex-col bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer h-full"
      onClick={() => navigate(`/teacher/courses/${course.id}`)}
    >
      {/* Visual Header */}
      <div className="h-32 w-full bg-surface-elevated relative overflow-hidden">
        {course.imageUrl ? (
          <img 
            src={course.imageUrl} 
            alt={course.title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center">
            <span className="text-primary/30 text-sm font-medium">
              {course.courseType === 'kursrekke' ? 'Kursrekke' : 'Enkeltkurs'}
            </span>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <StatusBadge 
            status={course.status as CourseStatus} 
            size="sm" 
            className="shadow-sm backdrop-blur-md bg-white/90"
          />
        </div>
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center rounded-md bg-white/90 backdrop-blur-md px-2 py-1 text-xs font-medium text-text-secondary shadow-sm ring-1 ring-inset ring-gray-200/50">
            {courseTypeLabels[course.courseType]}
          </span>
        </div>
      </div>

      {/* Content Body */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        <div>
          <h3 className="font-semibold text-text-primary line-clamp-1 group-hover:text-primary transition-colors text-base">
            {course.title}
          </h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{course.location}</span>
          </div>
        </div>

        <div className="flex items-start gap-2 text-xs text-text-secondary">
          <Calendar className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-0.5">
            <span className="line-clamp-1">{course.timeSchedule}</span>
            {formatDateRange(course.startDate, course.endDate) && (
              <span className="text-muted-foreground">{formatDateRange(course.startDate, course.endDate)}</span>
            )}
          </div>
        </div>

        <div className="mt-auto pt-2 space-y-2">
          {/* Participants Progress */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3 w-3" />
                Deltakere
              </span>
              <span className="font-medium text-text-primary">
                {course.participants} <span className="text-muted-foreground">/ {course.maxParticipants}</span>
              </span>
            </div>
            <div className="h-1.5 w-full bg-surface-elevated rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-500" 
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between p-4 pt-0 border-t border-transparent group-hover:border-surface-elevated transition-colors mt-1">
        <span className="text-sm font-medium text-text-primary pt-3">{course.price}</span>
        
        <div className="pt-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-surface-elevated text-text-tertiary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate(`/teacher/courses/${course.id}`)}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Se kurs
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/teacher/courses/${course.id}#deltakere`)}>
                <Users className="h-4 w-4 mr-2" />
                Se deltakere
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyLink}>
                <Copy className="h-4 w-4 mr-2" />
                Kopier lenke
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleOpenPublicPage}>
                <Share2 className="h-4 w-4 mr-2" />
                Åpne offentlig side
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
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
    startDate: course.start_date || undefined,
    endDate: course.end_date || undefined,
    description: course.description || undefined,
    level: course.level ? course.level.charAt(0).toUpperCase() + course.level.slice(1) : undefined,
    imageUrl: course.image_url,
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
              <div className="flex flex-col items-center justify-center h-64 text-center rounded-2xl bg-white shadow-sm">
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
               <div className="flex flex-col items-center justify-center h-64 text-center rounded-2xl bg-white shadow-sm">
                  <div className="mb-4 rounded-full bg-surface p-4 border border-surface-elevated">
                     <Calendar className="h-8 w-8 text-text-tertiary stroke-[1.5]" />
                  </div>
                  <h3 className="font-geist text-sm font-medium text-text-primary">Ingen kurs funnet</h3>
                  <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                     Det ser ut til at du ikke har noen kurs her ennå. Opprett et nytt kurs for å komme i gang.
                  </p>
               </div>
            ) : (
              <div className="h-full overflow-y-auto custom-scrollbar pb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredCourses.map((course) => (
                      <CourseCard key={course.id} course={course} organizationSlug={currentOrganization?.slug} />
                  ))}
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
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  MoreHorizontal,
  MapPin,
  Users,
  Leaf,
  Menu,
  Calendar
} from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { CoursesEmptyState } from '@/components/teacher/CoursesEmptyState';
import { StatusBadge } from '@/components/ui/status-badge';
import type { CourseStatus } from '@/components/ui/status-badge';
import { useEmptyState } from '@/context/EmptyStateContext';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import EmptyStateToggle from '@/components/ui/EmptyStateToggle';
import { mockDetailedCourses, emptyDetailedCourses, type DetailedCourse } from '@/data/mockData';

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
          <span className="text-[11px] text-muted-foreground">{course.timeSchedule.split(' ').slice(1).join(' ')}</span>
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
        <button className="text-text-tertiary hover:text-text-primary p-1.5 rounded-full hover:bg-surface-elevated transition-colors" aria-label="Flere handlinger">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

const CoursesPage = () => {
  const { showEmptyState } = useEmptyState();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'upcoming' | 'completed'>('all');
  
  const courses = showEmptyState ? emptyDetailedCourses : mockDetailedCourses;

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
        <div className="flex flex-col gap-6 px-8 py-8 bg-surface shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="font-geist text-2xl font-medium text-text-primary tracking-tight">Mine Kurs</h1>
                    <p className="text-sm text-muted-foreground mt-1">Administrer dine aktive kursrekker, workshops og arrangementer.</p>
                </div>
                {!showEmptyState && (
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
                      className={`shrink-0 h-10 rounded-lg px-3 py-2 text-xs font-medium border ios-ease ${activeFilter === 'all' ? 'bg-white text-text-primary shadow-sm border-border' : 'bg-transparent text-text-secondary border-transparent hover:bg-surface-elevated hover:text-text-primary'}`}
                    >
                        Alle
                    </button>
                    <button
                      onClick={() => setActiveFilter('active')}
                      className={`shrink-0 h-10 rounded-lg px-3 py-2 text-xs font-medium border ios-ease ${activeFilter === 'active' ? 'bg-white text-text-primary shadow-sm border-border' : 'bg-transparent text-text-secondary border-transparent hover:bg-surface-elevated hover:text-text-primary'}`}
                    >
                        Aktive
                    </button>
                    <button
                      onClick={() => setActiveFilter('upcoming')}
                      className={`shrink-0 h-10 rounded-lg px-3 py-2 text-xs font-medium border ios-ease ${activeFilter === 'upcoming' ? 'bg-white text-text-primary shadow-sm border-border' : 'bg-transparent text-text-secondary border-transparent hover:bg-surface-elevated hover:text-text-primary'}`}
                    >
                        Kommende
                    </button>
                    <button
                      onClick={() => setActiveFilter('completed')}
                      className={`shrink-0 h-10 rounded-lg px-3 py-2 text-xs font-medium border ios-ease ${activeFilter === 'completed' ? 'bg-white text-text-primary shadow-sm border-border' : 'bg-transparent text-text-secondary border-transparent hover:bg-surface-elevated hover:text-text-primary'}`}
                    >
                        Fullførte
                    </button>
                </div>
            </div>
        </div>

        {/* Course List / Empty State */}
        <div className="flex-1 overflow-hidden px-8 pb-8">
            {showEmptyState ? (
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

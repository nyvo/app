import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  MapPin, 
  Calendar, 
  Users, 
  Edit2, 
  Flower2, 
  Menu, 
  Eye, 
  EyeOff 
} from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { useEmptyState } from '@/context/EmptyStateContext';
import { Button } from '@/components/ui/button';
import { mockDetailedCourses, emptyDetailedCourses, type DetailedCourse } from '@/data/mockData';

// Helper to get status styles
const getStatusBadge = (status: DetailedCourse['status'], startsIn?: string) => {
  switch (status) {
    case 'active':
      return (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E6F4EA] px-2 py-1 text-[10px] font-medium text-[#137435]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#137435]"></span>
          Pågår
        </div>
      );
    case 'upcoming':
      return (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF7ED] px-2 py-1 text-[10px] font-medium text-[#C2410C]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#C2410C]"></span>
          {startsIn || 'Kommende'}
        </div>
      );
    case 'draft':
      return (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E7E5E4] px-2 py-1 text-[10px] font-medium text-[#57534E]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#78716C]"></span>
          Utkast
        </div>
      );
    default:
      return null;
  }
};

const CourseRow = ({ course }: { course: DetailedCourse }) => {
  const isDraft = course.status === 'draft';
  
  return (
    <div className={`group flex items-center justify-between p-4 border-b border-[#F5F5F4] hover:bg-[#FAFAFA] transition-colors cursor-pointer ${isDraft ? 'opacity-80' : ''}`}>
      <Link to="/teacher/courses/detail" className="flex items-center gap-4 flex-1 min-w-0">
        {/* Removed left icon as requested */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
             <h3 className={`text-sm font-medium truncate ${isDraft ? 'text-[#78716C]' : 'text-[#292524]'} group-hover:text-[#354F41] transition-colors`}>
              {course.title}
            </h3>
            {isDraft && (
              <span className="text-[10px] font-medium text-[#78716C] bg-[#F5F5F4] px-1.5 py-0.5 rounded">Utkast</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-[#78716C]">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{course.location}</span>
          </div>
        </div>
      </Link>

      {/* Status Column - Hidden on smallest screens */}
      <div className="hidden md:flex w-32 justify-start px-4">
         {course.isWorkshop ? (
             <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F5F5F4] px-2 py-1 text-[10px] font-medium text-[#57534E]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#78716C]"></span>
              Workshop
          </div>
         ) : (
            getStatusBadge(course.status, course.startDate)
         )}
      </div>

      {/* Date/Time Column - Hidden on mobile */}
      <div className="hidden md:block w-40 px-4">
          <div className="flex flex-col">
             <span className="text-xs font-medium text-[#292524]">{course.timeSchedule.split(' ')[0]}</span>
             <span className="text-[11px] text-[#78716C]">{course.timeSchedule.split(' ').slice(1).join(' ')}</span>
          </div>
      </div>

      {/* Participants Column - Hidden on mobile */}
      <div className="hidden lg:block w-32 px-4">
          <div className="flex items-center gap-1.5">
             <Users className="h-3.5 w-3.5 text-[#A8A29E]" />
             <span className="text-xs font-medium text-[#44403C]">
               {course.participants} <span className="text-[#A8A29E]">/ {course.maxParticipants}</span>
             </span>
          </div>
      </div>

       {/* Price Column - Hidden on mobile */}
       <div className="hidden lg:block w-24 px-4 text-right">
          <span className="text-xs font-medium text-[#57534E]">{course.price}</span>
      </div>

      {/* Actions Column */}
      <div className="w-24 flex justify-end pl-4">
        {isDraft ? (
           <Link to="/teacher/courses/detail" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#292524] hover:text-[#354F41] transition-colors">
              <Edit2 className="h-3 w-3" />
              <span className="hidden sm:inline">Fullfør</span>
           </Link>
        ) : (
          <button className="text-[#A8A29E] hover:text-[#292524] p-1.5 rounded-full hover:bg-[#F5F5F4] transition-colors">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

const CoursesPage = () => {
  const { showEmptyState, toggleEmptyState } = useEmptyState();
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
    // Note: The mock data has specific statuses, we'll map them as best as we can
    if (activeFilter !== 'all') {
      if (activeFilter === 'active') {
        result = result.filter(course => course.status === 'active');
      } else if (activeFilter === 'upcoming') {
        result = result.filter(course => course.status === 'upcoming' || course.status === 'draft');
      } else if (activeFilter === 'completed') {
        result = result.filter(course => course.status === 'completed');
      }
    }

    return result;
  }, [courses, searchQuery, activeFilter]);

  return (
    <SidebarProvider>
      <TeacherSidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#FDFBF7]">

        {/* Mobile Header */}
        <div className="flex md:hidden items-center justify-between p-6 border-b border-[#E7E5E4] bg-[#FDFBF7]/80 backdrop-blur-xl z-30 shrink-0">
            <div className="flex items-center gap-3">
                 <Flower2 className="h-5 w-5 text-[#354F41]" />
                 <span className="font-geist text-base font-semibold text-[#292524]">ZenStudio</span>
            </div>
            <SidebarTrigger>
                <Menu className="h-6 w-6 text-[#78716C]" />
            </SidebarTrigger>
        </div>

        {/* Header Area & Controls */}
        <div className="px-8 py-8 bg-[#FDFBF7] shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="font-geist text-3xl font-medium text-[#292524] tracking-tight">Mine Kurs</h1>
                    <p className="text-sm text-[#78716C] mt-1">Administrer dine aktive kursrekker, workshops og arrangementer.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={toggleEmptyState}
                    className="flex items-center gap-2 rounded-full border border-[#E7E5E4] bg-white px-4 py-2 text-xs font-medium text-[#78716C] hover:bg-[#F5F5F4] hover:scale-[1.02] active:scale-[0.98] ios-ease"
                    aria-label="Toggle empty state"
                  >
                    {showEmptyState ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    {showEmptyState ? 'Vis data' : 'Vis tomt'}
                  </button>
                  <Button
                    asChild
                    className="gap-2"
                  >
                    <Link to="/teacher/new-course">
                      <Plus className="h-4 w-4" />
                      <span>Opprett nytt</span>
                    </Link>
                  </Button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1 max-w-md group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A8A29E] group-focus-within:text-[#292524] transition-colors" />
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Søk etter kurs..." 
                      className="h-10 w-full rounded-full border border-[#E7E5E4] bg-white pl-10 pr-4 text-sm text-[#292524] placeholder:text-[#A8A29E] focus:border-[#A8A29E] focus:outline-none focus:ring-1 focus:ring-[#A8A29E] transition-all shadow-sm hover:border-[#D6D3D1]" 
                    />
                </div>

                {/* Filters */}
                <div className="flex gap-2 overflow-x-auto p-1 no-scrollbar">
                    <button 
                      onClick={() => setActiveFilter('all')}
                      className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium border transition-colors ${activeFilter === 'all' ? 'bg-white text-[#292524] shadow-sm border-[#E7E5E4]' : 'bg-transparent text-[#78716C] border-transparent hover:bg-[#F5F5F4]'}`}
                    >
                        Alle
                    </button>
                    <button 
                      onClick={() => setActiveFilter('active')}
                      className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium border transition-colors ${activeFilter === 'active' ? 'bg-white text-[#292524] shadow-sm border-[#E7E5E4]' : 'bg-transparent text-[#78716C] border-transparent hover:bg-[#F5F5F4]'}`}
                    >
                        Aktive
                    </button>
                    <button 
                      onClick={() => setActiveFilter('upcoming')}
                      className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium border transition-colors ${activeFilter === 'upcoming' ? 'bg-white text-[#292524] shadow-sm border-[#E7E5E4]' : 'bg-transparent text-[#78716C] border-transparent hover:bg-[#F5F5F4]'}`}
                    >
                        Kommende
                    </button>
                    <button 
                      onClick={() => setActiveFilter('completed')}
                      className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium border transition-colors ${activeFilter === 'completed' ? 'bg-white text-[#292524] shadow-sm border-[#E7E5E4]' : 'bg-transparent text-[#78716C] border-transparent hover:bg-[#F5F5F4]'}`}
                    >
                        Fullførte
                    </button>
                </div>
            </div>
        </div>

        {/* Course List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-8">
            {filteredCourses.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-64 text-center border border-dashed border-[#E7E5E4] rounded-3xl bg-[#FDFBF7]/50">
                  <div className="h-12 w-12 rounded-full bg-[#F5F5F4] flex items-center justify-center mb-3">
                     <Calendar className="h-6 w-6 text-[#A8A29E]" />
                        </div>
                  <h3 className="text-base font-medium text-[#292524]">Ingen kurs funnet</h3>
                  <p className="text-sm text-[#78716C] mt-1 max-w-xs">
                     Det ser ut til at du ikke har noen kurs her ennå. Opprett et nytt kurs for å komme i gang.
                  </p>
                    </div>
            ) : (
              <div className="rounded-xl border border-[#E7E5E4] bg-white shadow-sm overflow-hidden">
                  {/* Table Header */}
                  <div className="flex items-center p-4 border-b border-[#E7E5E4] bg-[#FDFBF7]/50">
                      <div className="flex-1 px-2 text-xs font-medium uppercase tracking-wider text-[#78716C]">Kurs & Sted</div>
                      <div className="hidden md:block w-32 px-4 text-xs font-medium uppercase tracking-wider text-[#78716C]">Status</div>
                      <div className="hidden md:block w-40 px-4 text-xs font-medium uppercase tracking-wider text-[#78716C]">Tidspunkt</div>
                      <div className="hidden lg:block w-32 px-4 text-xs font-medium uppercase tracking-wider text-[#78716C]">Deltakere</div>
                      <div className="hidden lg:block w-24 px-4 text-right text-xs font-medium uppercase tracking-wider text-[#78716C]">Pris</div>
                      <div className="w-24 px-4"></div>
                  </div>
                  
                  {/* Table Body */}
                  <div className="divide-y divide-[#F5F5F4]">
                    {filteredCourses.map((course) => (
                        <CourseRow key={course.id} course={course} />
                    ))}
                  </div>
              </div>
            )}
        </div>
      </main>
    </SidebarProvider>
  );
};

export default CoursesPage;

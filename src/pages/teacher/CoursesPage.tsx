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
  CalendarClock, 
  Eye, 
  EyeOff 
} from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { useEmptyState } from '@/context/EmptyStateContext';
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

const CourseCard = ({ course }: { course: DetailedCourse }) => {
  const isDraft = course.status === 'draft';
  
  return (
    <div className={`group relative flex flex-col rounded-3xl border ${isDraft ? 'border-dashed border-[#D6D3D1] bg-[#FAFAF9] opacity-80 hover:opacity-100' : 'border-[#E7E5E4] bg-white'} p-7 shadow-sm transition-all hover:shadow-md hover:border-[#D6D3D1] cursor-pointer`}>
      <div className="flex justify-between items-start mb-5">
        {course.isWorkshop ? (
           <div className="inline-flex items-center gap-1.5 rounded-full bg-[#F5F5F4] px-2.5 py-1 text-[11px] font-medium text-[#57534E]">
              <CalendarClock className="h-3.5 w-3.5" />
              Workshop
          </div>
        ) : (
          getStatusBadge(course.status, course.startDate)
        )}
        <button className="text-[#A8A29E] hover:text-[#292524] p-1.5 rounded-full hover:bg-[#F5F5F4] transition-colors">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      <Link to="/teacher/courses/detail" className="block group-hover:opacity-100 transition-opacity">
        <h3 className={`text-xl font-semibold ${isDraft ? 'text-[#78716C] font-medium' : 'text-[#292524]'} mb-2 group-hover:text-[#354F41] transition-colors tracking-tight`}>
          {course.title}
        </h3>
      </Link>
      <div className="flex items-center gap-2 text-sm text-[#78716C] mb-6">
        <MapPin className="h-4 w-4" />
        <span>{course.location}</span>
      </div>

      <div className={`space-y-3.5 mb-7 ${isDraft ? 'opacity-60' : ''}`}>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2.5 text-[#44403C]">
            <Calendar className="h-4 w-4 text-[#A8A29E]" />
            <span className="font-medium">{course.timeSchedule}</span>
          </div>
          <span className="text-[#78716C]">{course.duration}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2.5 text-[#44403C]">
            <Users className="h-4 w-4 text-[#A8A29E]" />
            <span className="font-medium">{course.participants} / {course.maxParticipants} deltakere</span>
          </div>
          <span className="text-[#78716C]">{course.price}</span>
        </div>
      </div>

      <div className={`mt-auto pt-6 border-t ${isDraft ? 'border-[#E7E5E4]/50' : 'border-[#F5F5F4]'}`}>
        {isDraft ? (
           <div className="flex items-center justify-center">
              <span className="text-xs font-medium text-[#292524] flex items-center gap-2">
                  <Edit2 className="h-3 w-3" />
                  Fullfør oppsett
              </span>
          </div>
        ) : course.progress !== undefined ? (
          <>
             <div className="flex items-center justify-between mb-2.5">
                <span className="text-[10px] font-medium text-[#78716C] uppercase tracking-wide">
                  {course.isWorkshop ? 'Fyllingsgrad' : 'Progresjon'}
                </span>
                <span className="text-[10px] font-medium text-[#292524]">
                  {course.isWorkshop ? `${course.progress}%` : `Uke ${course.currentWeek} av ${course.totalWeeks}`}
                </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[#F5F5F4] overflow-hidden">
                <div 
                  className={`h-full rounded-full ${course.isWorkshop ? 'bg-[#354F41]' : 'bg-[#292524]'}`} 
                  style={{ width: `${course.progress}%` }}
                ></div>
            </div>
          </>
        ) : (
           <div className="flex items-center gap-3">
              <div className="flex -space-x-2 overflow-hidden">
                  {[1, 2, 3].map((i) => (
                     <img key={i} className="inline-block h-7 w-7 rounded-full ring-2 ring-white object-cover" src={`https://i.pravatar.cc/150?u=${i}`} alt="" />
                  ))}
              </div>
              <span className="text-xs font-medium text-[#78716C]">+{course.participants - 3 > 0 ? course.participants - 3 : 0} påmeldte</span>
          </div>
        )}
      </div>
    </div>
  );
};

const CoursesPage = () => {
  const { showEmptyState, toggleEmptyState } = useEmptyState();
  const courses = showEmptyState ? emptyDetailedCourses : mockDetailedCourses;

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
        <div className="px-8 py-8 border-b border-[#E7E5E4] bg-[#FDFBF7] shrink-0">
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
                  <button className="flex items-center gap-2 rounded-full bg-[#292524] px-5 py-2.5 text-sm font-medium text-[#F5F5F4] shadow-lg shadow-[#292524]/10 hover:bg-[#44403C] hover:scale-[1.02] active:scale-[0.98] ios-ease transition-all">
                    <Plus className="h-4 w-4" />
                    <span>Opprett nytt</span>
                </button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A8A29E]" />
                    <input 
                      type="text" 
                      placeholder="Søk etter kurs..." 
                      className="h-10 w-full rounded-full border border-[#E7E5E4] bg-white pl-10 pr-4 text-sm text-[#292524] placeholder:text-[#A8A29E] focus:border-[#A8A29E] focus:outline-none focus:ring-1 focus:ring-[#A8A29E] transition-all shadow-sm" 
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar p-1">
                    <button className="shrink-0 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#292524] shadow-sm ring-1 ring-[#E7E5E4]">
                        Alle
                    </button>
                    <button className="shrink-0 rounded-full bg-transparent px-4 py-2 text-sm font-medium text-[#78716C] hover:bg-[#F5F5F4] transition-colors">
                        Aktive
                    </button>
                    <button className="shrink-0 rounded-full bg-transparent px-4 py-2 text-sm font-medium text-[#78716C] hover:bg-[#F5F5F4] transition-colors">
                        Kommende
                    </button>
                    <button className="shrink-0 rounded-full bg-transparent px-4 py-2 text-sm font-medium text-[#78716C] hover:bg-[#F5F5F4] transition-colors">
                        Fullførte
                    </button>
                </div>
            </div>
        </div>

        {/* Scrollable Course Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
            {courses.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="h-12 w-12 rounded-full bg-[#F5F5F4] flex items-center justify-center mb-3">
                     <Calendar className="h-6 w-6 text-[#A8A29E]" />
                        </div>
                  <h3 className="text-base font-medium text-[#292524]">Ingen kurs funnet</h3>
                  <p className="text-sm text-[#78716C] mt-1 max-w-xs">
                     Det ser ut til at du ikke har noen kurs her ennå. Opprett et nytt kurs for å komme i gang.
                  </p>
                    </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-12">
                  {courses.map((course) => (
                      <CourseCard key={course.id} course={course} />
                  ))}
                    </div>
            )}
        </div>
      </main>
    </SidebarProvider>
  );
};

export default CoursesPage;

import { Link } from 'react-router-dom';
import { Plus, Flower2, Menu, Eye, EyeOff } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { UpcomingClassCard } from '@/components/teacher/UpcomingClassCard';
import { MessagesList } from '@/components/teacher/MessagesList';
import { CoursesList } from '@/components/teacher/CoursesList';
import { RegistrationsList } from '@/components/teacher/RegistrationsList';
import { getTimeBasedGreeting } from '@/utils/timeGreeting';
import { useEmptyState } from '@/context/EmptyStateContext';
import { 
  mockUpcomingClass, 
  mockDashboardMessages, 
  mockDashboardCourses, 
  mockRegistrations,
  emptyDashboardMessages,
  emptyDashboardCourses,
  emptyRegistrations
} from '@/data/mockData';

const TeacherDashboard = () => {
  const { showEmptyState, toggleEmptyState } = useEmptyState();

  return (
    <SidebarProvider>
      <TeacherSidebar />

      <main className="flex-1 overflow-y-auto bg-[#FDFBF7] h-screen">
          <div className="flex md:hidden items-center justify-between p-6 border-b border-[#E7E5E4] sticky top-0 bg-[#FDFBF7]/80 backdrop-blur-xl z-30">
            <div className="flex items-center gap-3">
              <Flower2 className="h-5 w-5 text-[#354F41]" />
              <span className="font-geist text-base font-semibold text-[#292524]">ZenStudio</span>
            </div>
            <SidebarTrigger>
              <Menu className="h-6 w-6 text-[#78716C]" />
            </SidebarTrigger>
          </div>

          <div className="mx-auto max-w-7xl p-6 lg:p-12">
            <header className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#A8A29E] mb-2">Oversikt</p>
                <h1 className="font-geist text-3xl md:text-4xl font-medium tracking-tight text-[#292524]">
                  {getTimeBasedGreeting()}, Kristoffer
                </h1>
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
                <Link
                  to="/teacher/new-course"
                  className="group flex items-center gap-2 rounded-full bg-[#292524] px-5 py-2.5 text-sm font-medium text-[#F5F5F4] shadow-lg shadow-[#292524]/10 hover:bg-[#44403C] hover:shadow-[#292524]/20 hover:scale-[1.02] active:scale-[0.98] ios-ease ring-offset-2 focus:ring-1 focus:ring-[#354F41]/20"
                >
                  <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
                  Nytt kurs
                </Link>
              </div>
            </header>

            <div className="grid auto-rows-min grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
              <UpcomingClassCard classData={showEmptyState ? null : mockUpcomingClass} />
              {/* Removed StatsCards as requested */}
              <MessagesList messages={showEmptyState ? emptyDashboardMessages : mockDashboardMessages} />
              <CoursesList courses={showEmptyState ? emptyDashboardCourses : mockDashboardCourses} />
              <RegistrationsList registrations={showEmptyState ? emptyRegistrations : mockRegistrations} />
            </div>
          </div>
        </main>
    </SidebarProvider>
  );
};

export default TeacherDashboard;

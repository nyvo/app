import { Link } from 'react-router-dom';
import { Plus, Leaf, Menu } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { UpcomingClassCard } from '@/components/teacher/UpcomingClassCard';
import { MessagesList } from '@/components/teacher/MessagesList';
import { CoursesList } from '@/components/teacher/CoursesList';
import { RegistrationsList } from '@/components/teacher/RegistrationsList';
import { DashboardEmptyState } from '@/components/teacher/DashboardEmptyState';
import { getTimeBasedGreeting } from '@/utils/timeGreeting';
import { useEmptyState } from '@/context/EmptyStateContext';
import { Button } from '@/components/ui/button';
import EmptyStateToggle from '@/components/ui/EmptyStateToggle';
import {
  mockUpcomingClass,
  mockDashboardMessages,
  mockDashboardCourses,
  mockRegistrations,
} from '@/data/mockData';

const TeacherDashboard = () => {
  const { showEmptyState } = useEmptyState();

  return (
    <SidebarProvider>
      <TeacherSidebar />

      <main className="flex-1 overflow-y-auto bg-surface h-screen">
          <div className="flex md:hidden items-center justify-between p-6 border-b border-border sticky top-0 bg-surface/80 backdrop-blur-xl z-30">
            <div className="flex items-center gap-3">
              <Leaf className="h-5 w-5 text-primary" />
              <span className="font-geist text-base font-semibold text-text-primary">Ease</span>
            </div>
            <SidebarTrigger>
              <Menu className="h-6 w-6 text-muted-foreground" />
            </SidebarTrigger>
          </div>

          <div className="mx-auto max-w-7xl p-6 lg:p-12">
            <header className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div className="space-y-1">
                {!showEmptyState && (
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2">Oversikt</p>
                )}
                <h1 className="font-geist text-2xl md:text-3xl font-medium tracking-tight text-text-primary">
                  {getTimeBasedGreeting()}, Kristoffer
                </h1>
                {showEmptyState && (
                  <p className="text-sm text-muted-foreground">
                    Her er oversikten over studioet ditt i dag.
                  </p>
                )}
              </div>
              <Button
                asChild
                size="compact"
                className="hidden md:flex group gap-2"
              >
                <Link to="/teacher/new-course">
                  <Plus className="h-3.5 w-3.5 transition-transform group-hover:rotate-90" />
                  Nytt kurs
                </Link>
              </Button>
            </header>

            {showEmptyState ? (
              <DashboardEmptyState />
            ) : (
              <div className="grid auto-rows-min grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4">
                <UpcomingClassCard classData={mockUpcomingClass} />
                <MessagesList messages={mockDashboardMessages} />
                <CoursesList courses={mockDashboardCourses} />
                <RegistrationsList registrations={mockRegistrations} />
              </div>
            )}
          </div>
          <EmptyStateToggle />
        </main>
    </SidebarProvider>
  );
};

export default TeacherDashboard;

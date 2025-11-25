import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Flower2, Menu, Eye, EyeOff } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { UpcomingClassCard } from '@/components/teacher/UpcomingClassCard';
import { StatsCards } from '@/components/teacher/StatsCards';
import { MessagesList } from '@/components/teacher/MessagesList';
import { CoursesList } from '@/components/teacher/CoursesList';
import { RegistrationsList } from '@/components/teacher/RegistrationsList';
import { getTimeBasedGreeting } from '@/utils/timeGreeting';
import type { UpcomingClass, Message, Course, TeacherStats, Registration } from '@/types/dashboard';

const mockUpcomingClass: UpcomingClass = {
  id: '1',
  title: 'Vinyasa Flow: Morgenflyt',
  type: 'course-series',
  startTime: '08:00',
  endTime: '09:15',
  date: 'Ons, 24. Okt',
  location: 'Studio A',
  attendees: 18,
  capacity: 20,
  startsIn: 'Starter om 30 min',
};

const mockStats: TeacherStats = {
  activeStudents: 142,
  attendanceRate: 85,
  attendanceData: [40, 60, 50, 80, 90, 30],
};

const mockMessages: Message[] = [
  {
    id: '1',
    sender: { name: 'Sarah Jensen', avatar: 'https://i.pravatar.cc/150?u=4' },
    content: 'Gleder meg til timen! 🙏',
    timestamp: '2m',
    isOnline: true,
  },
  {
    id: '2',
    sender: { name: 'Marc Olsen', avatar: 'https://i.pravatar.cc/150?u=5' },
    content: 'Kan jeg ta med en gjest?',
    timestamp: '1t',
  },
  {
    id: '3',
    sender: { name: 'Lara Croft', avatar: 'https://i.pravatar.cc/150?u=8' },
    content: 'Må dessverre avbestille.',
    timestamp: '3t',
  },
];

const mockCourses: Course[] = [
  {
    id: '1',
    title: 'Privattime',
    subtitle: 'med Michael T. • Studio B',
    time: '14:00',
    type: 'private',
  },
  {
    id: '2',
    title: 'Kveldsstretch',
    subtitle: 'Online • Zoom',
    time: '17:30',
    type: 'online',
  },
  {
    id: '3',
    title: 'Yin Yoga',
    subtitle: 'Rolig flyt • Studio A',
    time: '19:00',
    type: 'yin',
  },
  {
    id: '4',
    title: 'Meditasjon',
    subtitle: 'Mindfulness • Studio C',
    time: '20:15',
    type: 'meditation',
  },
];

const mockRegistrations: Registration[] = [
  {
    id: '1',
    participant: { name: 'Emma Larsen', email: 'emma.larsen@gmail.com', avatar: 'https://i.pravatar.cc/150?u=10' },
    course: 'Vinyasa Flow',
    courseTime: 'Ons 23. Okt, 16:00',
    courseType: 'vinyasa',
    registeredAt: '5m',
    status: 'confirmed',
  },
  {
    id: '2',
    participant: { name: 'Jonas Berg', email: 'jonas.berg@outlook.com', avatar: 'https://i.pravatar.cc/150?u=11' },
    course: 'Yin Yoga',
    courseTime: 'Tor 24. Okt, 18:00',
    courseType: 'yin',
    registeredAt: '23m',
    status: 'waitlist',
  },
  {
    id: '3',
    participant: { name: 'Maja Holm', email: 'maja.holm@gmail.com', avatar: 'https://i.pravatar.cc/150?u=12' },
    course: 'Privattime',
    courseTime: 'Fre 25. Okt, 09:00',
    courseType: 'private',
    registeredAt: '1t',
    status: 'confirmed',
  },
  {
    id: '4',
    participant: { name: 'Anders Nilsen', email: 'anders.n@hotmail.com', initials: 'AN' },
    course: 'Meditasjon',
    courseTime: 'Lør 26. Okt, 10:00',
    courseType: 'meditation',
    registeredAt: '2t',
    status: 'cancelled',
  },
];

const emptyStats: TeacherStats = {
  activeStudents: 0,
  attendanceRate: 0,
  attendanceData: [0, 0, 0, 0, 0, 0],
};

const emptyMessages: Message[] = [];
const emptyCourses: Course[] = [];
const emptyRegistrations: Registration[] = [];

const TeacherDashboard = () => {
  const [showEmptyState, setShowEmptyState] = useState(false);

  const handleToggleEmptyState = () => {
    setShowEmptyState(!showEmptyState);
  };
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
                  onClick={handleToggleEmptyState}
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
              <StatsCards stats={showEmptyState ? emptyStats : mockStats} />
              <MessagesList messages={showEmptyState ? emptyMessages : mockMessages} />
              <CoursesList courses={showEmptyState ? emptyCourses : mockCourses} />
              <RegistrationsList registrations={showEmptyState ? emptyRegistrations : mockRegistrations} />
            </div>
          </div>
        </main>
    </SidebarProvider>
  );
};

export default TeacherDashboard;

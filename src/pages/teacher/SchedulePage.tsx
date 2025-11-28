import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Filter, Users, CheckCircle2 } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { Button } from '@/components/ui/button';

// Types
interface ScheduleEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  instructor: string;
  instructorAvatar?: string;
  instructorInitials?: string;
  type: 'vinyasa' | 'yin' | 'core' | 'private' | 'online' | 'restore' | 'flow';
  status?: 'completed' | 'upcoming' | 'active';
  attendees?: number;
}

// Helper to get Oslo time
const getOsloTime = () => {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Oslo' }));
};

// Helper to get week number
const getWeekNumber = (date: Date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

// Helper to get the Monday of a given week
const getMondayOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

// Day name abbreviations in Norwegian
const dayNames = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];

// Generate week days based on a start date (Monday)
const generateWeekDays = (monday: Date, today: Date) => {
  return dayNames.map((name, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      name,
      date: date.getDate(),
      fullDate: new Date(date),
      isToday: date.toDateString() === today.toDateString(),
      isWeekend: index >= 5,
    };
  });
};

const timeSlots = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];

const events: Record<number, ScheduleEvent[]> = {
  0: [ // Monday
    {
      id: '1',
      title: 'Morning Flow',
      startTime: '08:00',
      endTime: '09:15',
      location: 'Studio A',
      instructor: 'Kristoffer',
      instructorInitials: 'KN',
      type: 'vinyasa',
    },
    {
      id: '2',
      title: 'Pilates Core',
      startTime: '17:30',
      endTime: '18:30',
      location: 'Studio B',
      instructor: 'Marcus',
      instructorAvatar: 'https://i.pravatar.cc/150?u=2',
      type: 'yin',
    },
  ],
  1: [ // Tuesday
    {
      id: '3',
      title: 'Lunsj Yoga',
      startTime: '12:00',
      endTime: '13:00',
      location: 'Studio A',
      instructor: 'Sarah',
      instructorAvatar: 'https://i.pravatar.cc/150?u=3',
      type: 'core',
    },
  ],
  2: [ // Wednesday (Today)
    {
      id: '4',
      title: 'Morgenpust',
      startTime: '07:30',
      endTime: '08:30',
      location: 'Online',
      instructor: 'Kristoffer',
      instructorInitials: 'KN',
      type: 'online',
      status: 'completed',
    },
    {
      id: '5',
      title: 'Ashtanga Intro',
      startTime: '16:00',
      endTime: '17:15',
      location: 'Studio C',
      instructor: 'Kristoffer',
      instructorInitials: 'KN',
      type: 'vinyasa',
      status: 'active',
    },
  ],
  3: [ // Thursday
    {
      id: '6',
      title: 'Privattime',
      startTime: '09:00',
      endTime: '10:00',
      location: 'Studio B',
      instructor: 'Meg',
      instructorInitials: 'KN',
      type: 'private',
    },
  ],
  4: [ // Friday
    {
      id: '7',
      title: 'Weekend Flow',
      startTime: '15:00',
      endTime: '16:30',
      location: 'Studio A',
      instructor: 'Kristoffer',
      instructorInitials: 'KN',
      type: 'flow',
      attendees: 15,
    },
  ],
  6: [ // Sunday
    {
      id: '8',
      title: 'Sunday Restore',
      startTime: '10:00',
      endTime: '11:30',
      location: 'Studio A',
      instructor: 'Kristoffer',
      instructorInitials: 'KN',
      type: 'restore',
    },
  ],
};

// Helper to calculate position and height
const getEventStyle = (startTime: string, endTime: string) => {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);

  const startOffset = (startHour - 7) * 100 + (startMin / 60) * 100;
  const duration = (endHour - startHour) * 100 + ((endMin - startMin) / 60) * 100;

  return {
    top: `${startOffset}px`,
    height: `${duration}px`,
  };
};

// Event type colors
const getEventColors = (type: ScheduleEvent['type']) => {
  const colors = {
    vinyasa: {
      bg: 'bg-[#ECFDF5]',
      border: 'border-[#D1FAE5]',
      accent: 'border-l-[#10B981]',
      time: 'text-[#059669]',
      title: 'text-[#064E3B]',
      subtitle: 'text-[#065F46]',
      ring: 'ring-[#10B981]/20',
    },
    yin: {
      bg: 'bg-[#F0F9FF]',
      border: 'border-[#BAE6FD]',
      accent: 'border-l-[#38BDF8]',
      time: 'text-[#0284C7]',
      title: 'text-[#0C4A6E]',
      subtitle: 'text-[#0369A1]',
      ring: 'ring-[#38BDF8]/20',
    },
    core: {
      bg: 'bg-[#FFFBEB]',
      border: 'border-[#FDE68A]',
      accent: 'border-l-[#F59E0B]',
      time: 'text-[#B45309]',
      title: 'text-[#78350F]',
      subtitle: 'text-[#92400E]',
      ring: 'ring-[#F59E0B]/20',
    },
    private: {
      bg: 'bg-[#EEF2FF]',
      border: 'border-[#C7D2FE]',
      accent: 'border-l-[#6366F1]',
      time: 'text-[#4338CA]',
      title: 'text-[#312E81]',
      subtitle: 'text-[#3730A3]',
      ring: 'ring-[#6366F1]/20',
    },
    online: {
      bg: 'bg-[#F3F4F6]',
      border: 'border-[#E5E7EB]',
      accent: 'border-l-[#6B7280]',
      time: 'text-[#374151]',
      title: 'text-[#1F2937]',
      subtitle: 'text-[#4B5563]',
      ring: 'ring-[#6B7280]/20',
    },
    restore: {
      bg: 'bg-[#F0FDFA]',
      border: 'border-[#CCFBF1]',
      accent: 'border-l-[#14B8A6]',
      time: 'text-[#0F766E]',
      title: 'text-[#115E59]',
      subtitle: 'text-[#134E4A]',
      ring: 'ring-[#14B8A6]/20',
    },
    flow: {
      bg: 'bg-[#FDF2F8]',
      border: 'border-[#FBCFE8]',
      accent: 'border-l-[#EC4899]',
      time: 'text-[#BE185D]',
      title: 'text-[#831843]',
      subtitle: 'text-[#9D174D]',
      ring: 'ring-[#EC4899]/20',
    },
  };
  return colors[type] || colors.vinyasa;
};

// Event Card Component
const EventCard = ({ event }: { event: ScheduleEvent }) => {
  const style = getEventStyle(event.startTime, event.endTime);
  const colors = getEventColors(event.type);
  const isCompleted = event.status === 'completed';
  const isActive = event.status === 'active';

  return (
    <div
      className={`absolute left-1 right-1 rounded-lg ${colors.bg} border ${colors.border} border-l-4 ${colors.accent} p-2 hover:shadow-md transition-all cursor-pointer group overflow-hidden ${isCompleted ? 'opacity-60 grayscale hover:grayscale-0 hover:opacity-100' : ''} ${isActive ? 'ring-2 ring-[#354F41] ring-offset-1' : ''}`}
      style={style}
    >
      <div className="flex justify-between items-start">
        <span className={`text-[10px] font-bold ${colors.time}`}>
          {event.startTime} - {event.endTime}
        </span>
        {isCompleted && <CheckCircle2 className={`h-3 w-3 ${colors.time}`} />}
        {isActive && (
          <span className="inline-flex items-center rounded-full bg-[#059669] px-1.5 py-0.5 text-[8px] font-medium text-white">
            Start
          </span>
        )}
        {!isCompleted && !isActive && (
          <Users className={`h-3 w-3 ${colors.time} opacity-0 group-hover:opacity-100 transition-opacity`} />
        )}
      </div>
      <p className={`text-xs font-semibold ${colors.title} mt-1 truncate`}>{event.title}</p>
      <p className={`text-[10px] ${colors.subtitle} mt-0.5`}>{event.location}</p>
      {!isCompleted && (
        <div className="mt-2 flex items-center gap-1.5">
          {event.attendees ? (
            <>
              <div className="flex -space-x-1">
                <img src="https://i.pravatar.cc/150?u=1" className="h-4 w-4 rounded-full ring-1 ring-white" alt="" />
                <img src="https://i.pravatar.cc/150?u=2" className="h-4 w-4 rounded-full ring-1 ring-white" alt="" />
              </div>
              <span className={`text-[10px] ${colors.subtitle}`}>+{event.attendees}</span>
            </>
          ) : (
            <>
              {event.instructorAvatar ? (
                <img src={event.instructorAvatar} className={`h-4 w-4 rounded-full ring-1 ${colors.ring}`} alt="" />
              ) : (
                <div className={`flex h-4 w-4 items-center justify-center rounded-full bg-[#354F41] text-[6px] font-medium text-white ring-1 ${colors.ring}`}>
                  {event.instructorInitials}
                </div>
              )}
              <span className={`text-[10px] ${colors.subtitle}`}>{event.instructor}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Day Column Component
const DayColumn = ({ dayIndex, isToday, isWeekend }: { dayIndex: number; isToday: boolean; isWeekend: boolean }) => {
  const dayEvents = events[dayIndex] || [];

  return (
    <div className={`relative border-r border-[#F5F5F4] ${isToday ? 'bg-[#FDFBF7]/30' : ''} ${isWeekend ? 'bg-[#FAFAFA]' : ''}`}>
      {/* Background grid lines */}
      <div className="absolute inset-0 flex flex-col pointer-events-none">
        {timeSlots.map((_, i) => (
          <div key={i} className="h-[100px] border-b border-[#F5F5F4]" />
        ))}
      </div>

      {/* Events */}
      {dayEvents.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
};

export const SchedulePage = () => {
  // Initialize with current Oslo time
  const [currentTime, setCurrentTime] = useState(getOsloTime);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = last week, +1 = next week

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(getOsloTime());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Calculate the Monday of the displayed week
  const displayedMonday = useMemo(() => {
    const today = getOsloTime();
    const monday = getMondayOfWeek(today);
    monday.setDate(monday.getDate() + (weekOffset * 7));
    return monday;
  }, [weekOffset]);

  // Generate week days for the displayed week
  const weekDays = useMemo(() => {
    const today = getOsloTime();
    return generateWeekDays(displayedMonday, today);
  }, [displayedMonday]);

  // Get the week number for display
  const displayedWeekNumber = useMemo(() => {
    return getWeekNumber(displayedMonday);
  }, [displayedMonday]);

  // Calculate position of current time indicator (in pixels from top)
  const currentTimePosition = useMemo(() => {
    const hours = currentTime.getHours();
    const minutes = currentTime.getMinutes();
    // Grid starts at 07:00, each hour is 100px
    const offsetFromStart = (hours - 7) * 100 + (minutes / 60) * 100;
    return offsetFromStart;
  }, [currentTime]);

  // Format current time for display (HH:MM)
  const currentTimeString = useMemo(() => {
    const hours = currentTime.getHours().toString().padStart(2, '0');
    const minutes = currentTime.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }, [currentTime]);

  // Check if the current time indicator should be visible (between 07:00 and 24:00)
  const showTimeIndicator = useMemo(() => {
    const hours = currentTime.getHours();
    return weekOffset === 0 && hours >= 7 && hours < 24;
  }, [currentTime, weekOffset]);

  // Navigation handlers
  const goToPreviousWeek = () => setWeekOffset(prev => prev - 1);
  const goToNextWeek = () => setWeekOffset(prev => prev + 1);
  const goToCurrentWeek = () => setWeekOffset(0);

  return (
    <SidebarProvider>
      <TeacherSidebar />
      <main className="flex-1 flex flex-col overflow-hidden bg-[#FDFBF7] h-screen">
          {/* Schedule Toolbar */}
          <header className="flex flex-col gap-4 border-b border-[#E7E5E4] bg-[#FDFBF7] px-6 py-5 shrink-0 z-20">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div className="flex items-center gap-3">
                <h1 className="font-geist text-xl font-medium text-[#292524]">Timeplan</h1>
                <div className="h-4 w-px bg-[#E7E5E4]"></div>
                <div className="flex items-center gap-2 text-sm font-medium text-[#78716C]">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPreviousWeek}
                  className="rounded-lg hover:bg-[#F5F5F4] hover:text-[#292524] transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-[#292524] min-w-[80px] text-center">Uke {displayedWeekNumber}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNextWeek}
                  className="rounded-lg hover:bg-[#F5F5F4] hover:text-[#292524] transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                </div>
                <Button
                  onClick={goToCurrentWeek}
                  variant="outline"
                  size="sm"
                  className={`hidden md:flex ml-2 h-7 ${
                    weekOffset === 0
                      ? 'text-[#A8A29E] cursor-default hover:border-[#E7E5E4] hover:text-[#A8A29E] hover:shadow-none'
                      : 'text-[#57534E]'
                  }`}
                  disabled={weekOffset === 0}
                >
                  I dag
                </Button>
              </div>

              <div className="flex items-center gap-3">
                {/* View Toggle */}
                <div className="hidden md:flex items-center rounded-lg border border-[#E7E5E4] bg-white p-0.5 shadow-sm">
                  <button className="rounded-md px-3 py-1 text-xs font-medium text-[#292524] hover:bg-[#F5F5F4]">Dag</button>
                  <button className="rounded-md bg-[#F5F5F4] px-3 py-1 text-xs font-medium text-[#292524] shadow-sm ring-1 ring-black/5">Uke</button>
                  <button className="rounded-md px-3 py-1 text-xs font-medium text-[#292524] hover:bg-[#F5F5F4]">Måned</button>
                </div>

                <div className="h-4 w-px bg-[#E7E5E4] hidden md:block"></div>

                <Button
                  asChild
                  className="gap-2"
                >
                  <Link to="/teacher/new-course">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Nytt kurs</span>
                  </Link>
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <button className="flex items-center gap-2 rounded-lg border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs font-medium text-[#292524] shadow-sm hover:border-[#D6D3D1]">
                <Filter className="h-3.5 w-3.5 text-[#78716C]" />
                Instruktør: Alle
              </button>
              <button className="flex items-center gap-2 rounded-lg border border-dashed border-[#D6D3D1] bg-transparent px-3 py-1.5 text-xs font-medium text-[#78716C] hover:border-[#A8A29E] hover:text-[#57534E]">
                Rom
              </button>
              <button className="flex items-center gap-2 rounded-lg border border-dashed border-[#D6D3D1] bg-transparent px-3 py-1.5 text-xs font-medium text-[#78716C] hover:border-[#A8A29E] hover:text-[#57534E]">
                Kurstype
              </button>
              <div className="ml-auto hidden md:flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-sm bg-[#D1FAE5] border border-[#A7F3D0]"></div>
                  <span className="text-xs text-[#78716C]">Vinyasa</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-sm bg-[#E0F2FE] border border-[#BAE6FD]"></div>
                  <span className="text-xs text-[#78716C]">Yin</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-sm bg-[#FEF3C7] border border-[#FDE68A]"></div>
                  <span className="text-xs text-[#78716C]">Core</span>
                </div>
              </div>
            </div>
          </header>

          {/* Schedule Grid Container */}
          <div className="flex-1 overflow-auto bg-white relative flex flex-col">

            {/* Sticky Header (Days) */}
            <div className="sticky top-0 z-20 grid grid-cols-[60px_repeat(7,minmax(140px,1fr))] border-b border-[#E7E5E4] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)] min-w-[1040px]">
              {/* Corner */}
              <div className="border-r border-[#E7E5E4] p-3 bg-[#FDFBF7]"></div>

              {/* Days Headers */}
              {weekDays.map((day) => (
                <div
                  key={day.name}
                  className={`group flex flex-col items-center justify-center gap-0.5 border-r border-[#F5F5F4] py-3 ${day.isToday ? 'bg-[#FDFBF7]/50' : ''} ${day.isWeekend ? 'bg-[#FAFAFA]' : ''}`}
                >
                  <span className={`text-[11px] font-medium uppercase tracking-wide ${day.isToday ? 'font-bold text-[#354F41]' : 'text-[#A8A29E] group-hover:text-[#78716C]'}`}>
                    {day.name}
                  </span>
                  <span
                    className={`h-7 w-7 rounded-full flex items-center justify-center text-sm font-medium ${
                      day.isToday
                        ? 'bg-[#354F41] text-[#F5F5F4] font-bold shadow-md shadow-[#354F41]/20'
                        : day.isWeekend
                        ? 'text-[#A8A29E] group-hover:bg-[#F5F5F4]'
                        : 'text-[#57534E] group-hover:bg-[#F5F5F4]'
                    }`}
                  >
                    {day.date}
                  </span>
                </div>
              ))}
            </div>

            {/* Grid Content */}
            <div className="relative grid grid-cols-[60px_repeat(7,minmax(140px,1fr))] min-w-[1040px] flex-1">

              {/* Current Time Indicator */}
              {showTimeIndicator && (
                <div
                  className="absolute left-0 right-0 z-10 flex items-center pointer-events-none"
                  style={{ top: `${currentTimePosition}px` }}
                >
                  <div className="w-[60px] text-right pr-2 text-[10px] font-bold text-red-500">{currentTimeString}</div>
                  <div className="h-px flex-1 bg-red-500 opacity-50"></div>
                  <div className="absolute left-[60px] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500"></div>
                </div>
              )}

              {/* Time Column */}
              <div className="flex flex-col border-r border-[#E7E5E4] bg-[#FDFBF7] text-[11px] font-medium text-[#A8A29E]">
                {timeSlots.map((time) => (
                  <div key={time} className="h-[100px] border-b border-[#E7E5E4]/50 px-2 py-1">
                    {time}
                  </div>
                ))}
              </div>

              {/* Day Columns */}
              {weekDays.map((day, index) => (
                <DayColumn
                  key={day.name}
                  dayIndex={index}
                  isToday={day.isToday}
                  isWeekend={day.isWeekend}
                />
              ))}
            </div>
          </div>
        </main>
    </SidebarProvider>
  );
};

export default SchedulePage;

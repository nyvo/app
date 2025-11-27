import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import {
  Flower2,
  Menu,
  Layers,
  CalendarDays,
  Check,
  Clock,
  MapPin,
  UserCheck,
  ArrowRight,
  CalendarIcon,
  ChevronDown,
} from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

type CourseType = 'series' | 'single';

interface ParticipantField {
  id: string;
  label: string;
  required: boolean;
  locked: boolean;
}

const requiredFields: ParticipantField[] = [
  { id: 'firstName', label: 'Fornavn', required: true, locked: true },
  { id: 'lastName', label: 'Etternavn', required: true, locked: true },
  { id: 'phone', label: 'Telefonnummer', required: true, locked: true },
  { id: 'email', label: 'E-postadresse', required: true, locked: true },
];

// Generate time slots from 06:00 to 23:00 (every 15 minutes)
const generateTimeSlots = () => {
  const slots: string[] = [];
  for (let hour = 6; hour <= 23; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < 23) {
      slots.push(`${hour.toString().padStart(2, '0')}:15`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
      slots.push(`${hour.toString().padStart(2, '0')}:45`);
    }
  }
  return slots;
};

const timeSlots = generateTimeSlots();

const NewCoursePage = () => {
  const navigate = useNavigate();
  const [courseType, setCourseType] = useState<CourseType>('series');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState('');
  const [isTimeOpen, setIsTimeOpen] = useState(false);
  const [duration, setDuration] = useState('60');
  const [weeks, setWeeks] = useState('8');
  const [location, setLocation] = useState('Sal A - Hovedstudio');
  const [price, setPrice] = useState('');

  const handleCancel = () => {
    navigate('/teacher/schedule');
  };

  const handlePublish = () => {
    console.log({
      courseType,
      startDate,
      startTime,
      duration,
      weeks,
      location,
      price,
    });
    navigate('/teacher/schedule');
  };

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

        {/* Header Area */}
        <div className="px-8 py-6 border-b border-[#E7E5E4] bg-[#FDFBF7]">
          <div className="mx-auto max-w-3xl w-full">
            <Breadcrumb className="mb-2">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/teacher/schedule">Timeplan</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Nytt kurs</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="font-geist text-3xl font-medium text-[#292524] tracking-tight">
              Opprett nytt kurs
            </h1>
            <p className="text-sm text-[#78716C] mt-1">
              Sett opp et nytt kurs eller workshop i timeplanen.
            </p>
          </div>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          <div className="mx-auto max-w-3xl w-full space-y-8 pb-12">
            {/* Step 1: Course Type Selection */}
            <section>
              <h2 className="text-sm font-medium text-[#44403C] mb-4 uppercase tracking-wide">
                1. Velg type
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Option A: Kursrekke */}
                <button
                  type="button"
                  onClick={() => setCourseType('series')}
                  className={`relative flex flex-col gap-3 p-5 rounded-2xl text-left cursor-pointer group transition-all ${
                    courseType === 'series'
                      ? 'bg-white border-2 border-[#292524] shadow-sm'
                      : 'border border-[#E7E5E4] bg-transparent hover:bg-white hover:border-[#D6D3D1] opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                        courseType === 'series'
                          ? 'bg-[#F5F5F4] text-[#292524]'
                          : 'bg-white border border-[#E7E5E4] text-[#78716C]'
                      }`}
                    >
                      <Layers className="h-5 w-5" />
                    </div>
                    <div
                      className={`h-5 w-5 rounded-full flex items-center justify-center ${
                        courseType === 'series'
                          ? 'bg-[#292524] text-white'
                          : 'border border-[#E7E5E4] bg-white'
                      }`}
                    >
                      {courseType === 'series' && <Check className="h-3 w-3" />}
                    </div>
                  </div>
                  <div>
                    <h3
                      className={`text-base font-semibold ${
                        courseType === 'series' ? 'text-[#292524]' : 'text-[#44403C]'
                      }`}
                    >
                      Kursrekke
                    </h3>
                    <p className="text-xs text-[#78716C] mt-1 leading-relaxed">
                      For kurs som går over flere uker med faste deltakere.
                    </p>
                  </div>
                </button>

                {/* Option B: Enkeltkurs */}
                <button
                  type="button"
                  onClick={() => setCourseType('single')}
                  className={`relative flex flex-col gap-3 p-5 rounded-2xl text-left cursor-pointer group transition-all ${
                    courseType === 'single'
                      ? 'bg-white border-2 border-[#292524] shadow-sm'
                      : 'border border-[#E7E5E4] bg-transparent hover:bg-white hover:border-[#D6D3D1] opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                        courseType === 'single'
                          ? 'bg-[#F5F5F4] text-[#292524]'
                          : 'bg-white border border-[#E7E5E4] text-[#78716C]'
                      }`}
                    >
                      <CalendarDays className="h-5 w-5" />
                    </div>
                    <div
                      className={`h-5 w-5 rounded-full flex items-center justify-center ${
                        courseType === 'single'
                          ? 'bg-[#292524] text-white'
                          : 'border border-[#E7E5E4] bg-white'
                      }`}
                    >
                      {courseType === 'single' && <Check className="h-3 w-3" />}
                    </div>
                  </div>
                  <div>
                    <h3
                      className={`text-base font-semibold ${
                        courseType === 'single' ? 'text-[#292524]' : 'text-[#44403C]'
                      }`}
                    >
                      Enkeltkurs
                    </h3>
                    <p className="text-xs text-[#78716C] mt-1 leading-relaxed">
                      Drop-in timer, workshops eller engangsarrangementer.
                    </p>
                  </div>
                </button>
              </div>
            </section>

            {/* Step 2: Course Details */}
            <section className="space-y-6">
              <h2 className="text-sm font-medium text-[#44403C] uppercase tracking-wide pt-4 border-t border-[#E7E5E4]">
                2. Detaljer
              </h2>

              {/* Grid for Logistics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Start Date - Calendar Picker */}
                <div className="group">
                  <label className="block text-xs font-medium text-[#44403C] mb-1.5">
                    {courseType === 'single' ? 'Dato' : 'Startdato'}
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center justify-between w-full rounded-xl border-0 py-2.5 px-3 text-[#292524] shadow-sm ring-1 ring-inset ring-[#E7E5E4] hover:ring-[#D6D3D1] focus:ring-1 focus:ring-inset focus:ring-[#354F41]/20 focus:border-[#354F41] text-sm bg-white transition-all text-left"
                      >
                        <span className={startDate ? 'text-[#292524]' : 'text-[#A8A29E]'}>
                          {startDate ? format(startDate, 'PPP', { locale: nb }) : 'Velg dato'}
                        </span>
                        <CalendarIcon className="h-4 w-4 text-[#A8A29E]" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="p-0" showOverlay>
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        locale={nb}
                        className="rounded-2xl"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Start Time - Custom Dropdown */}
                <div>
                  <label className="block text-xs font-medium text-[#44403C] mb-1.5">
                    Tidspunkt
                  </label>
                  <Popover open={isTimeOpen} onOpenChange={setIsTimeOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="flex items-center justify-between w-full rounded-xl border-0 py-2.5 px-3 text-[#292524] shadow-sm ring-1 ring-inset ring-[#E7E5E4] hover:ring-[#D6D3D1] focus:ring-1 focus:ring-inset focus:ring-[#354F41]/20 focus:border-[#354F41] text-sm bg-white transition-all text-left"
                      >
                        <span className={startTime ? 'text-[#292524]' : 'text-[#A8A29E]'}>
                          {startTime || 'Velg tid'}
                        </span>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-[#A8A29E]" />
                          <ChevronDown className={`h-4 w-4 text-[#A8A29E] transition-transform ${isTimeOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-[200px] p-2 max-h-[280px] overflow-y-auto custom-scrollbar" showOverlay>
                      <div className="flex flex-col gap-0.5">
                        {timeSlots.map((time) => (
                          <button
                            key={time}
                            type="button"
                            onClick={() => {
                              setStartTime(time);
                              setIsTimeOpen(false);
                            }}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                              startTime === time
                                ? 'bg-[#292524] text-white'
                                : 'text-[#44403C] hover:bg-[#F5F5F4]'
                            }`}
                          >
                            <span>{time}</span>
                            {startTime === time && <Check className="h-4 w-4" />}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Duration - Text Input */}
                <div>
                  <label className="block text-xs font-medium text-[#44403C] mb-1.5">
                    Varighet (minutter)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="60"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="block w-full rounded-xl border-0 py-2.5 pl-3 pr-12 text-[#292524] shadow-sm ring-1 ring-inset ring-[#E7E5E4] placeholder:text-[#A8A29E] focus:ring-1 focus:ring-inset focus:ring-[#354F41]/20 focus:border-[#354F41] text-sm bg-white transition-shadow"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-[#78716C] text-xs font-medium">min</span>
                    </div>
                  </div>
                </div>

                {/* Number of Weeks - Text Input (only for series) */}
                <div className={courseType === 'single' ? 'opacity-50' : ''}>
                  <label className={`block text-xs font-medium mb-1.5 ${courseType === 'single' ? 'text-[#A8A29E]' : 'text-[#44403C]'}`}>
                    Antall uker
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="8"
                      value={courseType === 'single' ? '1' : weeks}
                      onChange={(e) => setWeeks(e.target.value)}
                      disabled={courseType === 'single'}
                        className={`block w-full rounded-xl border-0 py-2.5 pl-3 pr-14 shadow-sm ring-1 ring-inset text-sm transition-shadow ${
                        courseType === 'single'
                          ? 'bg-[#F5F5F4] text-[#A8A29E] ring-[#E7E5E4] cursor-not-allowed'
                          : 'bg-white text-[#292524] ring-[#E7E5E4] placeholder:text-[#A8A29E] focus:ring-1 focus:ring-inset focus:ring-[#354F41]/20 focus:border-[#354F41]'
                      }`}
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className={`text-xs font-medium ${courseType === 'single' ? 'text-[#A8A29E]' : 'text-[#78716C]'}`}>{courseType === 'single' ? 'uke' : 'uker'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid for Location & Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Location */}
                <div className="sm:col-span-2 md:col-span-1">
                  <label className="block text-xs font-medium text-[#44403C] mb-1.5">
                    Sted / Lokale
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="F.eks. Sal A - Hovedstudio"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="block w-full rounded-xl border-0 py-2.5 pl-9 pr-3 text-[#292524] shadow-sm ring-1 ring-inset ring-[#E7E5E4] placeholder:text-[#A8A29E] focus:ring-1 focus:ring-inset focus:ring-[#354F41]/20 focus:border-[#354F41] text-sm bg-white transition-shadow"
                    />
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3 text-[#A8A29E]">
                      <MapPin className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div className="sm:col-span-2 md:col-span-1">
                  <label className="block text-xs font-medium text-[#44403C] mb-1.5">
                    Totalpris
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="block w-full rounded-xl border-0 py-2.5 pl-3 pr-12 text-[#292524] shadow-sm ring-1 ring-inset ring-[#E7E5E4] placeholder:text-[#A8A29E] focus:ring-1 focus:ring-inset focus:ring-[#354F41]/20 focus:border-[#354F41] text-sm bg-white transition-shadow"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-[#78716C] text-xs font-medium">NOK</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Step 3: Participant Info - Hidden for now */}
            {/* <section>
              <div className="flex items-center justify-between pt-4 border-t border-[#E7E5E4] mb-4">
                <h2 className="text-sm font-medium text-[#44403C] uppercase tracking-wide">
                  3. Deltakerinformasjon
                </h2>
              </div>

              <div className="rounded-2xl border border-[#E7E5E4] bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3 mb-5">
                  <div className="p-2 bg-[#F7F5F2] rounded-lg text-[#78716C]">
                    <UserCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-[#292524]">Påkrevde felt</h3>
                    <p className="text-xs text-[#78716C] leading-relaxed">
                      Følgende informasjon må fylles ut av deltakeren ved påmelding.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8">
                  {requiredFields.map((field, index) => (
                    <div
                      key={field.id}
                      className={`flex items-center justify-between py-2 ${
                        index < requiredFields.length - 2
                          ? 'border-b border-[#F5F5F4] sm:border-0'
                          : ''
                      }`}
                    >
                      <span className="text-sm text-[#44403C]">{field.label}</span>
                      <div className="flex items-center gap-2 opacity-60 cursor-not-allowed">
                        <span className="text-[10px] font-medium text-[#78716C] uppercase">
                          Påkrevd
                        </span>
                        <div className="relative inline-flex h-5 w-9 items-center rounded-full bg-[#292524]">
                          <span className="translate-x-4 inline-block h-3.5 w-3.5 transform rounded-full bg-white transition" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section> */}
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="p-6 border-t border-[#E7E5E4] bg-[#FDFBF7] z-10">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <button
              type="button"
              onClick={handleCancel}
              className="text-sm font-medium text-[#78716C] hover:text-[#292524] px-6 py-2.5 rounded-full hover:bg-[#F5F5F4] transition-colors"
            >
              Avbryt
            </button>
            <button
              type="button"
              onClick={handlePublish}
              className="flex items-center gap-2 rounded-full bg-[#292524] px-6 py-2.5 text-sm font-medium text-[#F5F5F4] shadow-lg shadow-[#292524]/10 hover:bg-[#44403C] hover:scale-[1.02] active:scale-[0.98] ios-ease transition-all"
            >
              <span>Publiser kurs</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </main>
    </SidebarProvider>
  );
};

export default NewCoursePage;

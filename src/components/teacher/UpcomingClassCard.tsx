import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, ArrowRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UpcomingClass } from '@/types/dashboard';

interface UpcomingClassCardProps {
  classData: UpcomingClass | null;
}

export const UpcomingClassCard = ({ classData }: UpcomingClassCardProps) => {
  if (!classData) {
    return (
      <div className="group relative col-span-1 md:col-span-2 lg:col-span-2 h-[360px] overflow-hidden rounded-3xl bg-white border border-gray-200 ios-ease hover:border-ring">
        {/* Subtle background shapes */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-surface-elevated blur-3xl"></div>
        <div className="absolute -left-10 -bottom-10 h-48 w-48 rounded-full bg-surface-elevated blur-3xl"></div>

        <div className="relative flex h-full flex-col justify-center p-6 sm:p-9 z-10">
          {/* Main content */}
          <div className="max-w-md">
            <div className="mb-6">
              <h2 className="font-geist text-xl sm:text-2xl font-medium tracking-tight text-text-primary mb-2">
                Klar til å planlegge ditt første kurs?
              </h2>
              <p className="text-sm text-text-secondary">
                Opprett en yogaøkt og bygg din kursplan.
              </p>
            </div>

            <div>
              <Button asChild size="compact" className="group">
                <Link to="/teacher/new-course">
                  <Plus className="h-3.5 w-3.5 transition-transform group-hover:rotate-90" />
                  Opprett første kurs
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      to={`/teacher/courses/${classData.id}`}
      className="group relative col-span-1 md:col-span-2 lg:col-span-2 h-[360px] overflow-hidden rounded-3xl bg-gray-900 text-white border border-gray-800 ios-ease hover:border-gray-700 cursor-pointer block"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 z-0"></div>
      <div className="absolute inset-0 bg-grain opacity-[0.35] mix-blend-overlay pointer-events-none z-0"></div>

      <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/5 blur-3xl transition-all duration-1000 group-hover:bg-white/10 z-0"></div>

      <div className="relative flex h-full flex-col justify-between z-10 p-6 sm:p-9">
        <div className="flex items-start justify-between gap-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse"></span>
            <span className="text-xs font-medium text-white">{classData.startsIn}</span>
          </div>
        </div>

        <div>
          <h2 className="font-geist text-2xl sm:text-3xl md:text-4xl font-medium tracking-tight mb-4 sm:mb-5 text-white leading-tight">
            {classData.title.includes(':') ? (
              <>{classData.title.split(':')[0]}:<br />{classData.title.split(':').slice(1).join(':')}</>
            ) : (
              classData.title
            )}
          </h2>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:gap-5 text-xs sm:text-sm font-medium text-white/90">
            <span className="flex items-center gap-1.5 sm:gap-2">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-70" />
              {classData.date}
            </span>
            <span className="flex items-center gap-1.5 sm:gap-2">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-70" />
              {classData.startTime} - {classData.endTime}
            </span>
            <span className="flex items-center gap-1.5 sm:gap-2">
              <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-70" />
              {classData.location}
            </span>
          </div>
        </div>

        <div className="mt-4 sm:mt-6 flex items-end justify-between gap-4">
          <div className="flex flex-col gap-0.5 sm:gap-1">
            <span className="text-xs sm:text-sm text-white/60">Påmeldte</span>
            <span className="text-base sm:text-lg font-medium text-white tracking-tight">
              {classData.capacity > 0 ? `${classData.attendees}/${classData.capacity}` : `${classData.attendees} påmeldt`}
            </span>
          </div>
          <span className="flex items-center gap-2 h-9 sm:h-10 rounded-lg bg-white px-2.5 sm:px-3 py-2 text-xxs sm:text-xs font-medium text-text-primary group-hover:bg-surface-elevated ios-ease shrink-0">
            Gå til kurs
            <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
};

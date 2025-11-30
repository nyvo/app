import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, ArrowRight, MoreHorizontal, Plus } from 'lucide-react';
import type { UpcomingClass } from '@/types/dashboard';

interface UpcomingClassCardProps {
  classData: UpcomingClass | null;
}

export const UpcomingClassCard = ({ classData }: UpcomingClassCardProps) => {
  if (!classData) {
    return (
      <div className="group relative col-span-1 md:col-span-2 lg:col-span-2 h-[360px] overflow-hidden rounded-3xl bg-white shadow-sm border border-border">
        {/* Subtle background shapes */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-surface-elevated blur-3xl"></div>
        <div className="absolute -left-10 -bottom-10 h-48 w-48 rounded-full bg-surface-elevated blur-3xl"></div>

        <div className="relative flex h-full flex-col justify-center p-9 z-10">
          {/* Main content */}
          <div className="max-w-md">
            <div className="mb-6">
              <h2 className="font-geist text-2xl font-medium tracking-tight text-text-primary mb-2">
                Klar til å planlegge ditt første kurs?
              </h2>
              <p className="text-sm text-muted-foreground">
                Opprett en yogaøkt og bygg din kursplan.
              </p>
            </div>

            <div>
              <button className="group inline-flex items-center gap-2 h-10 rounded-lg bg-text-primary px-3 py-2 text-xs font-medium text-white shadow-sm hover:bg-sidebar-foreground active:scale-[0.98] ios-ease">
                <Plus className="h-3.5 w-3.5 transition-transform group-hover:rotate-90" />
                Opprett første kurs
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative col-span-1 md:col-span-2 lg:col-span-2 h-[360px] overflow-hidden rounded-3xl bg-primary-darker text-secondary shadow-lg shadow-primary/10 ios-ease hover:shadow-xl hover:shadow-primary/20 hover:scale-[1.005] cursor-pointer border border-primary">
      <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-darker z-0"></div>
      <div className="absolute inset-0 bg-grain opacity-[0.35] mix-blend-overlay pointer-events-none z-0"></div>

      <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-secondary/10 blur-3xl transition-all duration-1000 group-hover:scale-110 group-hover:bg-secondary/15 z-0"></div>

      <div className="relative flex h-full flex-col justify-between z-10 p-9">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-primary-darker shadow-sm">
              Neste kurs
            </div>
            <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-md border border-white/10 text-secondary">
              Kursrekke
            </div>
          </div>
          <button
            className="rounded-full bg-white/10 p-2 text-secondary backdrop-blur-md hover:bg-white/20 transition-colors border border-white/5"
            aria-label="More options"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>

        <div>
          <p className="text-emerald-100/90 text-sm font-medium mb-2 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            {classData.startsIn}
          </p>
          <h2 className="font-geist text-3xl md:text-4xl font-medium tracking-tight mb-5 text-surface leading-tight">
            {classData.title.split(':')[0]}:<br />{classData.title.split(':')[1]}
          </h2>

          <div className="flex flex-wrap items-center gap-5 text-sm font-medium text-surface/90">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4 opacity-70" />
              {classData.date}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 opacity-70" />
              {classData.startTime} - {classData.endTime}
            </span>
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4 opacity-70" />
              {classData.location}
            </span>
          </div>
        </div>

        <div className="mt-6 flex items-end justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-surface/70">Påmeldte</span>
            <span className="text-lg font-semibold text-surface tracking-tight">
              {classData.attendees}/{classData.capacity}
            </span>
          </div>
          <Link
            to="/teacher/courses/detail"
            className="flex items-center gap-2 h-10 rounded-lg bg-surface px-3 py-2 text-xs font-medium text-primary-darker shadow-sm hover:bg-white ios-ease"
          >
            Gå til kurs
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

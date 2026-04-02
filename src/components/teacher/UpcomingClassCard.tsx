import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, ArrowRight, CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { UpcomingClass } from '@/types/dashboard';

interface UpcomingClassCardProps {
  classData: UpcomingClass | null;
}

export const UpcomingClassCard = ({ classData }: UpcomingClassCardProps) => {
  if (!classData) {
    return (
      <div className="col-span-1 md:col-span-2 lg:col-span-2">
        <h2 className="text-sm font-medium text-foreground mb-3">Neste kurs</h2>
      <div className="group relative h-[280px] sm:h-[360px] overflow-hidden rounded-lg bg-background border border-border">
        <div className="relative flex h-full flex-col justify-center p-6 sm:p-9 z-10">
          {/* Main content */}
          <div className="max-w-md">
            <div className="mb-6">
              <div className="mb-6 rounded-lg bg-background border border-border p-3 w-fit">
                <Calendar className="size-6 text-muted-foreground stroke-[1.5]" />
              </div>
              <h2 className="font-geist text-2xl font-medium tracking-tight text-foreground mb-2">
                Ingen kommende kurs
              </h2>
              <p className="text-sm text-muted-foreground">
                Opprett et kurs for å se det her.
              </p>
            </div>

            <div>
              <Button asChild size="compact" className="group">
                <Link to="/teacher/new-course">
                  <CalendarPlus className="h-3.5 w-3.5" />
                  Opprett første kurs
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
      </div>
    );
  }

  return (
    <div className="col-span-1 md:col-span-2 lg:col-span-2">
      <h2 className="text-sm font-medium text-foreground mb-3">Neste kurs</h2>
    <Link
      to={`/teacher/courses/${classData.id}`}
      className="group relative h-[280px] sm:h-[360px] overflow-hidden rounded-lg bg-primary text-primary-foreground border border-primary/80 smooth-transition hover:bg-primary/80 cursor-pointer block"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary z-0"></div>


      <div className="relative flex h-full flex-col justify-between z-10 p-6 sm:p-9">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="outline" className="gap-2 bg-primary/20 border-primary/70 px-3 py-1.5 text-primary-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success"></span>
            {classData.startsIn}
          </Badge>
        </div>

        <div>
          <h2 className="font-geist text-2xl sm:text-3xl font-medium tracking-tight mb-4 sm:mb-5 text-primary-foreground leading-tight">
            {classData.title.includes(':') ? (
              <>{classData.title.split(':')[0]}:<br />{classData.title.split(':').slice(1).join(':')}</>
            ) : (
              classData.title
            )}
          </h2>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:gap-5 text-xs sm:text-sm font-medium text-primary-foreground/80">
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
            <span className="text-xs sm:text-sm text-muted-foreground">Påmeldte</span>
            <span className="text-base sm:text-lg font-medium text-primary-foreground tracking-tight">
              {classData.capacity > 0 ? `${classData.attendees}/${classData.capacity}` : `${classData.attendees} påmeldt`}
            </span>
          </div>
          <Button asChild variant="outline-soft" size="compact" className="bg-background text-foreground border-input hover:bg-muted">
            <span>
              Gå til kurs
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Button>
        </div>
      </div>
    </Link>
    </div>
  );
};

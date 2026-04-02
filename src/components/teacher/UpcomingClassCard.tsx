import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, ArrowRight, CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { UpcomingClass } from '@/types/dashboard';

interface UpcomingClassCardProps {
  classData: UpcomingClass | null;
}

export const UpcomingClassCard = ({ classData }: UpcomingClassCardProps) => {
  if (!classData) {
    return (
      <div className="flex flex-col">
        <h2 className="type-title mb-3 text-foreground">Neste kurs</h2>
        <Card className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-md">
              <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-border bg-surface-muted">
                <Calendar className="size-5 text-muted-foreground stroke-[1.5]" />
              </div>
              <h3 className="type-heading-2 mb-2 text-foreground">
                Ingen kommende kurs
              </h3>
              <p className="type-body text-muted-foreground">
                Opprett et kurs for å se hva som skjer videre i timeplanen din.
              </p>
            </div>
            <Button asChild size="default" className="gap-2 self-start sm:self-auto">
              <Link to="/teacher/new-course">
                <CalendarPlus className="h-4 w-4" />
                Opprett første kurs
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <h2 className="type-title mb-3 text-foreground">Neste kurs</h2>
      <Card className="overflow-hidden border-primary/20 bg-primary text-primary-foreground">
        <div className="flex flex-col gap-6 p-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-4 flex items-center gap-3">
              <Badge variant="outline" className="gap-2 border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1.5 text-primary-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-success"></span>
                {classData.startsIn}
              </Badge>
            </div>

            <h3 className="type-heading-2 mb-3 text-primary-foreground">
              {classData.title}
            </h3>

            <div className="type-label flex flex-wrap items-center gap-x-4 gap-y-2 text-primary-foreground/80">
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

          <div className="flex flex-col gap-4 md:min-w-[200px] md:items-end">
            <div className="rounded-lg border border-primary-foreground/15 bg-primary-foreground/8 px-4 py-3">
              <p className="type-meta text-primary-foreground/70">Påmeldte</p>
              <p className="type-title mt-1 text-primary-foreground">
                {classData.capacity > 0 ? `${classData.attendees}/${classData.capacity}` : `${classData.attendees} påmeldt`}
              </p>
            </div>

            <Button asChild variant="outline-soft" size="compact" className="border-primary-foreground/15 bg-background text-foreground hover:bg-surface-muted">
              <span>
                Gå til kurs
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

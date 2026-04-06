import { Link } from 'react-router-dom';
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatWeekRange } from '@/utils/dateUtils';

interface ScheduleHeaderProps {
  weekNumber: number;
  displayedMonday: Date;
  displayedSunday: Date;
  weekOffset: number;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onGoToToday: () => void;
  hasCourses: boolean;
}

export function ScheduleHeader({
  weekNumber,
  displayedMonday,
  displayedSunday,
  weekOffset,
  onPreviousWeek,
  onNextWeek,
  onGoToToday,
  hasCourses,
}: ScheduleHeaderProps) {
  const dateRange = formatWeekRange(displayedMonday, displayedSunday);

  return (
    <header className="z-20 flex shrink-0 items-center justify-between gap-4 bg-background px-6 pt-6 pb-4 lg:px-8 lg:pt-8">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onPreviousWeek}
            className="rounded-md"
            aria-label="Forrige uke"
            disabled={!hasCourses}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex min-w-[148px] flex-col items-center">
            <span className="type-title text-foreground">
              Uke {weekNumber}
            </span>
            <span className="type-meta text-muted-foreground">
              {dateRange}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onNextWeek}
            className="rounded-md"
            aria-label="Neste uke"
            disabled={!hasCourses}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button
          onClick={onGoToToday}
          variant="outline-soft"
          size="sm"
          disabled={weekOffset === 0 || !hasCourses}
          className="hidden md:flex"
        >
          Denne uken
        </Button>
      </div>

      {hasCourses && (
        <Button asChild size="sm" className="gap-1.5">
          <Link to="/teacher/new-course">
            <CalendarPlus className="h-3.5 w-3.5" />
            Opprett kurs
          </Link>
        </Button>
      )}
    </header>
  );
}

import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CalendarPlus } from 'lucide-react';
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
    <header className="z-20 flex shrink-0 flex-col gap-4 border-b border-border bg-background px-4 py-4 sm:px-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
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

        <div className="flex items-center gap-2">
          <Button
            onClick={onGoToToday}
            variant="outline-soft"
            size="compact"
            disabled={weekOffset === 0 || !hasCourses}
            className="hidden md:flex"
          >
            Denne uken
          </Button>

          {hasCourses && (
            <Button asChild size="compact" className="gap-2">
              <Link to="/teacher/new-course" aria-label="Nytt kurs">
                <CalendarPlus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Nytt kurs</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

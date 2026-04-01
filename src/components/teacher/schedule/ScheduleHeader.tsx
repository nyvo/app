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
    <header className="flex flex-col gap-4 border-b border-border bg-white px-4 sm:px-6 lg:px-8 pt-6 lg:pt-8 pb-4 shrink-0 z-20">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <h1 className="font-geist text-2xl font-medium text-text-primary tracking-tight">
            Timeplan
          </h1>
          {hasCourses && (
            <>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onPreviousWeek}
                  className="rounded-lg h-7 w-7"
                  aria-label="Forrige uke"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex flex-col items-center min-w-[140px]">
                  <span className="text-sm font-medium text-text-primary">
                    Uke {weekNumber}
                  </span>
                  <span className="text-xs text-text-tertiary">
                    {dateRange}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onNextWeek}
                  className="rounded-lg h-7 w-7"
                  aria-label="Neste uke"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button
                onClick={onGoToToday}
                variant="outline-soft"
                size="compact"
                disabled={weekOffset === 0}
                className="hidden md:flex"
              >
                Denne uken
              </Button>
            </>
          )}
        </div>

        {hasCourses && (
          <Button asChild size="compact" className="gap-2">
            <Link to="/teacher/new-course" aria-label="Nytt kurs">
              <CalendarPlus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Nytt kurs</span>
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}

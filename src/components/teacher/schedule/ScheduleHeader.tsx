import { Link } from 'react-router-dom';
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FilterTabs, FilterTab } from '@/components/ui/filter-tabs';
import { MONTH_ABBR } from './types';

interface ScheduleHeaderProps {
  displayedMonday: Date;
  weekOffset: number;
  viewMode: 'day' | 'week';
  onViewModeChange: (mode: 'day' | 'week') => void;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  hasCourses: boolean;
}

export function ScheduleHeader({
  displayedMonday,
  weekOffset,
  viewMode,
  onViewModeChange,
  onPreviousWeek,
  onNextWeek,
  hasCourses,
}: ScheduleHeaderProps) {
  const MONTH_FULL = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'] as const;
  const monthName = MONTH_FULL[displayedMonday.getMonth()];
  const year = displayedMonday.getFullYear();
  const title = `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} ${year}`;

  return (
    <header className="z-20 shrink-0 bg-background px-4 pt-4 pb-0">
      {/* Line 1: Month/year + navigation + view toggle + create */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <h1 className="type-heading-2 text-foreground">{title}</h1>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onPreviousWeek}
              aria-label="Forrige"
              disabled={!hasCourses}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="type-label px-2 text-foreground">
              {weekOffset === 0 ? 'Denne uken' : (() => {
                const sunday = new Date(displayedMonday);
                sunday.setDate(displayedMonday.getDate() + 6);
                const startDay = displayedMonday.getDate();
                const endDay = sunday.getDate();
                const startMonth = MONTH_ABBR[displayedMonday.getMonth()];
                const endMonth = MONTH_ABBR[sunday.getMonth()];
                return startMonth === endMonth
                  ? `${startDay}. – ${endDay}. ${startMonth}`
                  : `${startDay}. ${startMonth} – ${endDay}. ${endMonth}`;
              })()}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onNextWeek}
              aria-label="Neste"
              disabled={!hasCourses}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            <FilterTabs
              value={viewMode}
              onValueChange={(v) => onViewModeChange(v as 'day' | 'week')}
              variant="contained"
            >
              <FilterTab value="day">Dag</FilterTab>
              <FilterTab value="week">Uke</FilterTab>
            </FilterTabs>
          </div>

          {hasCourses && (
            <Button asChild size="sm" className="gap-1.5 hidden md:flex">
              <Link to="/teacher/new-course">
                <CalendarPlus className="h-3.5 w-3.5" />
                Opprett kurs
              </Link>
            </Button>
          )}
        </div>
      </div>

    </header>
  );
}

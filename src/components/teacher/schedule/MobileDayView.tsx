import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, CalendarPlus } from '@/lib/icons';
import { PageLoader } from '@/components/ui/page-loader';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { MobileEventCard } from './MobileEventCard';
import type { ScheduleEvent } from './types';
import type { WeekDay } from '@/utils/dateUtils';
interface MobileDayViewProps {
  weekDays: WeekDay[];
  selectedDayIndex: number;
  onDaySelect: (index: number) => void;
  events: Record<number, ScheduleEvent[]>;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  hasEventsThisWeek: boolean;
  hasCourses: boolean;
}

export function MobileDayView({
  weekDays,
  selectedDayIndex,
  onDaySelect,
  events,
  isLoading,
  error,
  onRetry,
  hasEventsThisWeek,
  hasCourses,
}: MobileDayViewProps) {
  const dayEvents = events[selectedDayIndex] || [];
  const selectedDay = weekDays[selectedDayIndex];
  const selectedDayRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll the day selector so the selected day is visible
  useEffect(() => {
    selectedDayRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [selectedDayIndex]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Day selector */}
      <div className="shrink-0 border-b border-border bg-background px-4 py-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {weekDays.map((day, index) => (
            <button
              key={day.name}
              ref={selectedDayIndex === index ? selectedDayRef : undefined}
              onClick={() => onDaySelect(index)}
              aria-pressed={selectedDayIndex === index}
              aria-current={day.isToday ? 'date' : undefined}
              className={`flex h-16 min-w-[56px] cursor-pointer flex-col items-center justify-center rounded-md smooth-transition outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                selectedDayIndex === index
                  ? 'bg-primary text-primary-foreground'
                  : day.isToday
                  ? 'bg-muted text-foreground border border-border'
                  : 'bg-background hover:bg-muted text-muted-foreground'
              }`}
            >
              <span className="text-xs font-medium tracking-wide">{day.name.slice(0, 3)}</span>
              <span className="text-base font-mono font-medium tabular-nums mt-0.5">{day.date}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto bg-background">
        {isLoading ? (
          <PageLoader message="Laster timeplan" />
        ) : error ? (
          <ErrorState variant="inline" message={error} onRetry={onRetry} />
        ) : !hasEventsThisWeek ? (
          <EmptyState
            variant="compact"
            icon={CalendarDays}
            title="Ingen timer denne uken"
            description={!hasCourses
              ? 'Opprett et kurs for å komme i gang.'
              : 'Ingen planlagte timer denne uken.'}
            action={
              <Button asChild size="compact" className="gap-2">
                <Link to="/teacher/new-course">
                  <CalendarPlus className="size-3.5" />
                  Opprett kurs
                </Link>
              </Button>
            }
          />
        ) : dayEvents.length === 0 ? (
          <EmptyState
            variant="compact"
            icon={CalendarDays}
            title={`Ingen timer ${selectedDay?.isToday ? 'i dag' : 'denne dagen'}`}
            description="Velg en annen dag for å se timer."
          />
        ) : (
          <div className="space-y-3 p-4">
            {[...dayEvents]
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map((event) => (
                <MobileEventCard key={event.id} event={event} />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

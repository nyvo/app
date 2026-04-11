import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, CalendarPlus } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { Button } from '@/components/ui/button';
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
              className={`flex h-16 min-w-[56px] cursor-pointer flex-col items-center justify-center rounded-md smooth-transition ${
                selectedDayIndex === index
                  ? 'bg-primary text-primary-foreground'
                  : day.isToday
                  ? 'bg-surface-muted text-foreground border border-border'
                  : 'bg-background hover:bg-surface-muted text-muted-foreground'
              }`}
            >
              <span className="type-meta">{day.name.slice(0, 3)}</span>
              <span className="type-title mt-0.5">{day.date}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto bg-background">
        {isLoading ? (
          <PageLoader message="Laster timeplan" />
        ) : error ? (
          <div className="flex items-center justify-center h-64 p-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-status-error-bg border border-status-error-border">
                <CalendarDays className="h-7 w-7 text-status-error-text" />
              </div>
              <h3 className="type-title mb-1 text-foreground">Noe gikk galt</h3>
              <p className="type-body mb-4 text-muted-foreground">{error}</p>
              <Button onClick={onRetry} size="compact">Prøv på nytt</Button>
            </div>
          </div>
        ) : !hasEventsThisWeek ? (
          <div className="flex items-center justify-center h-64 p-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-background border border-border">
                <CalendarDays className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="type-title mb-1 text-foreground">Ingen timer denne uken</h3>
              <p className="type-body mb-4 text-muted-foreground">
                {!hasCourses
                  ? 'Opprett et kurs for å komme i gang.'
                  : 'Ingen planlagte timer denne uken.'}
              </p>
              <Button asChild size="compact" className="gap-2">
                <Link to="/teacher/new-course">
                  <CalendarPlus className="h-3.5 w-3.5" />
                  Opprett kurs
                </Link>
              </Button>
            </div>
          </div>
        ) : dayEvents.length === 0 ? (
          <div className="flex items-center justify-center h-64 p-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-background border border-border">
                <CalendarDays className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="type-title mb-1 text-foreground">
                Ingen timer {selectedDay?.isToday ? 'i dag' : 'denne dagen'}
              </h3>
              <p className="type-body text-muted-foreground">
                Velg en annen dag for å se timer.
              </p>
            </div>
          </div>
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

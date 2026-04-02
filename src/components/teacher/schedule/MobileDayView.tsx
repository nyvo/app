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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Day selector */}
      <div className="border-b border-border bg-background px-4 py-3 shrink-0">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {weekDays.map((day, index) => (
            <button
              key={day.name}
              onClick={() => onDaySelect(index)}
              aria-pressed={selectedDayIndex === index}
              aria-current={day.isToday ? 'date' : undefined}
              className={`flex flex-col items-center justify-center min-w-[52px] h-16 rounded-lg smooth-transition cursor-pointer ${
                selectedDayIndex === index
                  ? 'bg-primary text-primary-foreground'
                  : day.isToday
                  ? 'bg-muted text-foreground border border-border'
                  : 'bg-background hover:bg-muted text-muted-foreground'
              }`}
            >
              <span className="text-xs font-medium">{day.name.slice(0, 3)}</span>
              <span className="text-lg font-medium mt-0.5">{day.date}</span>
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
              <h3 className="text-sm font-medium text-foreground mb-1">Noe gikk galt</h3>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={onRetry} size="compact">Prøv på nytt</Button>
            </div>
          </div>
        ) : !hasEventsThisWeek ? (
          <div className="flex items-center justify-center h-64 p-6">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-background border border-border">
                <CalendarDays className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">Ingen timer denne uken</h3>
              <p className="text-sm text-muted-foreground mb-4">
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
              <h3 className="text-sm font-medium text-foreground mb-1">
                Ingen timer {selectedDay?.isToday ? 'i dag' : 'denne dagen'}
              </h3>
              <p className="text-sm text-muted-foreground">
                Velg en annen dag for å se timer.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
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

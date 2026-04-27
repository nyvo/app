import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { EventCard } from './EventCard';
import { TIME_SLOTS } from './types';
import type { ScheduleEvent } from './types';
import { layoutOverlappingEvents, PX_PER_HOUR } from './utils';

interface DayColumnProps {
  isToday: boolean;
  events: ScheduleEvent[];
  selectedEventId?: string | null;
  onSelectEvent?: (event: ScheduleEvent) => void;
  /** Local hour+minute "now" — used to draw the now-line on today's column. */
  nowHours?: number;
  nowMinutes?: number;
}

export function DayColumn({
  isToday,
  events,
  selectedEventId,
  onSelectEvent,
  nowHours = 0,
  nowMinutes = 0,
}: DayColumnProps) {
  const layout = useMemo(() => layoutOverlappingEvents(events), [events]);

  // Now-line position: only render when the current time falls inside the
  // 06:00–22:00 visible window AND we're on today's column.
  const showNow = isToday && nowHours >= 6 && nowHours < 23;
  const nowOffset = showNow ? (nowHours - 6) * PX_PER_HOUR + (nowMinutes / 60) * PX_PER_HOUR : 0;
  const nowLabel = showNow
    ? `${String(nowHours).padStart(2, '0')}:${String(nowMinutes).padStart(2, '0')}`
    : '';

  return (
    <div className={cn('relative bg-card', isToday && 'bg-muted/30')}>
      {/* Hour gridlines */}
      <div className="absolute inset-0 flex flex-col pointer-events-none">
        {TIME_SLOTS.map((time) => (
          <div key={time} className="h-[60px] border-b border-border-subtle" />
        ))}
      </div>

      {/* Events */}
      {events.map((event) => {
        const placement = layout.get(event.id) ?? { columnIndex: 0, columnCount: 1 };
        return (
          <EventCard
            key={event.id}
            event={event}
            isSelected={selectedEventId === event.id}
            onSelect={onSelectEvent}
            columnIndex={placement.columnIndex}
            columnCount={placement.columnCount}
          />
        );
      })}

      {/* Now-line — sits above the events */}
      {showNow && (
        <div
          className="pointer-events-none absolute left-0 right-0 z-10"
          style={{ top: `${nowOffset}px` }}
        >
          <div className="relative">
            <div className="h-px bg-foreground" />
            <span className="absolute left-0 top-0 -translate-y-1/2 size-1.5 rounded-full bg-foreground" aria-hidden />
            <span className="absolute left-2 -top-2 -translate-y-full text-[10px] font-semibold tabular-nums text-foreground bg-card px-1 rounded">
              {nowLabel}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

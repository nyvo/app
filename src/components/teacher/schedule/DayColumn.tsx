import { useMemo } from 'react';
import { EventCard } from './EventCard';
import { TIME_SLOTS } from './types';
import type { ScheduleEvent } from './types';
import { layoutOverlappingEvents } from './utils';

interface DayColumnProps {
  isToday: boolean;
  events: ScheduleEvent[];
  selectedEventId?: string | null;
  onSelectEvent?: (event: ScheduleEvent) => void;
}

export function DayColumn({ isToday: _isToday, events, selectedEventId, onSelectEvent }: DayColumnProps) {
  const layout = useMemo(() => layoutOverlappingEvents(events), [events]);

  return (
    <div className="relative bg-white dark:bg-background">
      {/* Background grid lines */}
      <div className="absolute inset-0 flex flex-col pointer-events-none">
        {TIME_SLOTS.map((time) => (
          <div key={time} className="h-[100px] border-b border-border-subtle" />
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
    </div>
  );
}

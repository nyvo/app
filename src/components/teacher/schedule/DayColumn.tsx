import { EventCard } from './EventCard';
import { TIME_SLOTS } from './types';
import type { ScheduleEvent } from './types';

interface DayColumnProps {
  isToday: boolean;
  events: ScheduleEvent[];
  selectedEventId?: string | null;
  onSelectEvent?: (event: ScheduleEvent) => void;
}

export function DayColumn({ isToday: _isToday, events, selectedEventId, onSelectEvent }: DayColumnProps) {
  return (
    <div className="relative bg-white dark:bg-background">
      {/* Background grid lines */}
      <div className="absolute inset-0 flex flex-col pointer-events-none">
        {TIME_SLOTS.map((time) => (
          <div key={time} className="h-[100px] border-b border-border/60" />
        ))}
      </div>

      {/* Events */}
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          isSelected={selectedEventId === event.id}
          onSelect={onSelectEvent}
        />
      ))}
    </div>
  );
}

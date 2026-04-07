import { EventCard } from './EventCard';
import { TIME_SLOTS } from './types';
import type { ScheduleEvent } from './types';

interface DayColumnProps {
  isToday: boolean;
  events: ScheduleEvent[];
}

export function DayColumn({ isToday, events }: DayColumnProps) {
  return (
    <div className={`relative border-r border-border bg-background ${isToday ? 'bg-surface-muted/30' : ''}`}>
      {/* Background grid lines */}
      <div className="absolute inset-0 flex flex-col pointer-events-none">
        {TIME_SLOTS.map((time) => (
          <div key={time} className="h-[100px] border-b border-border/70" />
        ))}
      </div>

      {/* Events */}
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}

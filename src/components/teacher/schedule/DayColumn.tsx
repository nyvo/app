import { EventCard } from './EventCard';
import { TIME_SLOTS } from './types';
import type { ScheduleEvent } from './types';

interface DayColumnProps {
  isToday: boolean;
  isWeekend: boolean;
  events: ScheduleEvent[];
}

export function DayColumn({ isToday, isWeekend, events }: DayColumnProps) {
  return (
    <div className={`relative border-r border-surface-elevated ${isToday ? 'bg-surface-muted/40' : ''} ${isWeekend ? 'bg-background' : ''}`}>
      {/* Background grid lines */}
      <div className="absolute inset-0 flex flex-col pointer-events-none">
        {TIME_SLOTS.map((time) => (
          <div key={time} className="h-[100px] border-b border-surface-elevated" />
        ))}
      </div>

      {/* Events */}
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}

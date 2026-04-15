import { Repeat, Calendar } from '@/lib/icons';
import { Badge } from '@/components/ui/badge';
import type { ScheduleEvent } from './types';
import { formatTime, getEventStyle } from './utils';

interface EventCardProps {
  event: ScheduleEvent;
  isSelected?: boolean;
  onSelect?: (event: ScheduleEvent) => void;
}

export function EventCard({ event, isSelected, onSelect }: EventCardProps) {
  const positionStyle = getEventStyle(event.startTime, event.endTime);
  const isCompleted = event.status === 'completed';
  const isActive = event.status === 'active';

  const heightPx = parseFloat(positionStyle.height);
  const isCompact = heightPx < 60;

  const TypeIcon = event.courseType === 'event' ? Calendar : Repeat;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(event)}
      aria-label={`${event.title}, ${formatTime(event.startTime)}–${formatTime(event.endTime)}`}
      className={`group absolute left-1.5 right-1.5 overflow-hidden rounded-lg border p-1 text-left smooth-transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
        isSelected
          ? 'border-primary/30 ring-1 ring-primary/20'
          : isCompleted
          ? 'border-border/50'
          : 'border-border hover:border-border'
      }`}
      style={positionStyle}
    >
      <div className="bg-muted rounded-md h-full p-2 flex flex-col">
        {isCompact ? (
          <div className="flex items-center gap-1.5">
            <TypeIcon className="size-3 shrink-0 text-muted-foreground" />
            <p className="text-xs font-medium tracking-wide truncate text-foreground">
              {event.title}
            </p>
            <span className="text-xs font-medium tracking-wide shrink-0 text-muted-foreground">
              {formatTime(event.startTime)}
            </span>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <TypeIcon className="size-3.5 shrink-0 text-muted-foreground" />
                <p className={`text-xs font-medium truncate ${isCompleted ? 'text-muted-foreground' : 'text-foreground'}`}>
                  {event.title}
                </p>
              </div>
              {isActive && (
                <Badge variant="secondary" className="shrink-0 border-0 bg-green-100 px-1.5 py-0.5 text-xxs text-green-800 ring-1 ring-inset ring-green-300">
                  Pågår
                </Badge>
              )}
            </div>
            <div className="mt-auto pt-1.5">
              <p className="text-xs font-medium tracking-wide text-muted-foreground/60">Tidspunkt</p>
              <p className="text-xs font-medium tracking-wide text-muted-foreground">
                {formatTime(event.startTime)} – {formatTime(event.endTime)}
              </p>
            </div>
          </>
        )}
      </div>
    </button>
  );
}

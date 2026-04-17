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

  const isSeries = event.courseType !== 'event';

  const accentColor = isCompleted
    ? { stripe: 'bg-muted-foreground/30', bg: 'bg-muted/40', border: 'border-border' }
    : isSeries
      ? { stripe: 'bg-chart-3', bg: 'bg-chart-3/8', border: 'border-chart-3/25' }
      : { stripe: 'bg-success', bg: 'bg-success/8', border: 'border-success/25' };

  return (
    <button
      type="button"
      onClick={() => onSelect?.(event)}
      aria-label={`${event.title}, ${formatTime(event.startTime)}–${formatTime(event.endTime)}`}
      className={`group absolute left-1.5 right-1.5 overflow-hidden rounded-lg p-0 text-left smooth-transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
        isSelected
          ? 'ring-1 ring-primary/20'
          : ''
      }`}
      style={positionStyle}
    >
      <div className={`flex h-full rounded-md border ${accentColor.bg} ${accentColor.border}`}>
        <div className={`w-1 shrink-0 rounded-l-md ${accentColor.stripe}`} />
        <div className="flex-1 p-2 flex flex-col min-w-0">
          {isCompact ? (
            <div className="flex items-center gap-1.5">
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
                <p className="text-xs font-medium truncate text-foreground">
                  {event.title}
                </p>
                {isActive && (
                  <Badge variant="secondary" className="shrink-0 border-0 bg-green-100 px-1.5 py-0.5 text-xxs text-green-800 ring-1 ring-inset ring-green-300">
                    Pågår
                  </Badge>
                )}
              </div>
              <div className="mt-auto pt-1.5">
                <p className="text-xs font-medium tracking-wide text-muted-foreground">Tidspunkt</p>
                <p className="text-xs font-medium tracking-wide text-foreground">
                  {formatTime(event.startTime)} – {formatTime(event.endTime)}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </button>
  );
}

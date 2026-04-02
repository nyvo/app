import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ScheduleEvent } from './types';
import { formatTime, getEventStyle } from './utils';

interface EventCardProps {
  event: ScheduleEvent;
}

export function EventCard({ event }: EventCardProps) {
  const positionStyle = getEventStyle(event.startTime, event.endTime);
  const isCompleted = event.status === 'completed';
  const isActive = event.status === 'active';

  // Calculate card height to determine density
  const heightPx = parseFloat(positionStyle.height);
  const isCompact = heightPx < 60;

  return (
    <Link
      to={`/teacher/courses/${event.courseId}`}
      aria-label={`${event.title}, ${formatTime(event.startTime)}–${formatTime(event.endTime)}`}
      className={`group absolute left-1 right-1 block overflow-hidden rounded-lg border border-border p-2 smooth-transition cursor-pointer ${
        isCompleted
          ? 'bg-surface-muted'
          : isActive
          ? 'bg-background ring-2 ring-primary/20 ring-offset-1'
          : 'bg-background hover:bg-surface-muted/50'
      }`}
      style={positionStyle}
    >
      {isCompact ? (
        /* Single-line for very short sessions (<36 min) */
        <div className="flex items-center gap-1.5">
          <p className={`type-meta truncate ${isCompleted ? 'text-muted-foreground' : 'text-foreground'}`}>
            {event.title}
          </p>
          <span className={`type-meta shrink-0 ${isCompleted ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
            {formatTime(event.startTime)}
          </span>
        </div>
      ) : (
        <>
          {/* Title first — the most important for scanning */}
          <div className="flex items-start justify-between gap-1.5">
            <p className={`type-meta truncate ${isCompleted ? 'text-muted-foreground' : 'text-foreground'}`}>
              {event.title}
            </p>
            {isActive && (
              <Badge variant="secondary" className="shrink-0 border-0 bg-status-confirmed-bg px-1.5 py-0.5 text-xxs text-status-confirmed-text ring-1 ring-inset ring-status-confirmed-border">
                Pågår
              </Badge>
            )}
          </div>

          {/* Time + signups on one line — secondary info */}
          <div className="mt-1 flex items-center justify-between text-muted-foreground">
            <span className="type-meta">
              {formatTime(event.startTime)}–{formatTime(event.endTime)}
            </span>
            {!isCompleted && (
              <span className="type-meta flex items-center gap-1">
                <Users className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                {event.signups}{event.maxCapacity ? `/${event.maxCapacity}` : ''}
              </span>
            )}
            {isCompleted && (
              <span className="type-meta">Fullført</span>
            )}
          </div>
        </>
      )}
    </Link>
  );
}

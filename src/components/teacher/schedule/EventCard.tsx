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
      className={`absolute left-1 right-1 rounded-lg p-2 smooth-transition cursor-pointer group overflow-hidden block border border-border ${
        isCompleted
          ? 'bg-muted'
          : isActive
          ? 'bg-background ring-2 ring-primary/20 ring-offset-1'
          : 'bg-background hover:bg-muted/50'
      }`}
      style={positionStyle}
    >
      {isCompact ? (
        /* Single-line for very short sessions (<36 min) */
        <div className="flex items-center gap-1.5">
          <p className={`text-xs font-medium truncate ${isCompleted ? 'text-muted-foreground' : 'text-foreground'}`}>
            {event.title}
          </p>
          <span className={`text-xs shrink-0 ${isCompleted ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
            {formatTime(event.startTime)}
          </span>
        </div>
      ) : (
        <>
          {/* Title first — the most important for scanning */}
          <div className="flex items-start justify-between gap-1">
            <p className={`text-xs font-medium truncate ${isCompleted ? 'text-muted-foreground' : 'text-foreground'}`}>
              {event.title}
            </p>
            {isActive && (
              <Badge variant="secondary" className="bg-status-confirmed-bg text-status-confirmed-text ring-1 ring-inset ring-status-confirmed-border border-0 text-xxs px-1.5 py-0.5 shrink-0">
                Pågår
              </Badge>
            )}
          </div>

          {/* Time + signups on one line — secondary info */}
          <div className={`flex items-center justify-between mt-1 ${isCompleted ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
            <span className="text-xs">
              {formatTime(event.startTime)}–{formatTime(event.endTime)}
            </span>
            {!isCompleted && (
              <span className="flex items-center gap-1 text-xs">
                <Users className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                {event.signups}{event.maxCapacity ? `/${event.maxCapacity}` : ''}
              </span>
            )}
            {isCompleted && (
              <span className="text-xxs font-medium">Fullført</span>
            )}
          </div>
        </>
      )}
    </Link>
  );
}

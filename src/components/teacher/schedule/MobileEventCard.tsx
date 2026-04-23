import { Link } from 'react-router-dom';
import { Users } from '@/lib/icons';
import { Badge } from '@/components/ui/badge';
import type { ScheduleEvent } from './types';
import { formatTime } from './utils';

interface MobileEventCardProps {
  event: ScheduleEvent;
}

export function MobileEventCard({ event }: MobileEventCardProps) {
  const isCompleted = event.status === 'completed';
  const isActive = event.status === 'active';

  return (
    <Link
      to={`/teacher/courses/${event.courseId}`}
      aria-label={`${event.title}, ${formatTime(event.startTime)}–${formatTime(event.endTime)}`}
      className={`block rounded-lg border border-border p-4 smooth-transition cursor-pointer ${
        isCompleted ? 'bg-muted' : 'bg-background hover:bg-muted/50'
      }`}
    >
      {/* Title row — most scannable */}
      <div className="flex items-start justify-between gap-3">
        <p className={`text-sm font-medium truncate ${isCompleted ? 'text-muted-foreground' : 'text-foreground'}`}>
          {event.title}
        </p>
        {isActive && (
          <Badge variant="success" shape="rect" size="sm" className="shrink-0">
            Pågår
          </Badge>
        )}
        {isCompleted && (
          <span className="text-xs font-medium tracking-wide shrink-0 text-muted-foreground">Fullført</span>
        )}
      </div>

      {/* Time + signups — secondary row */}
      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs tabular-nums text-tertiary-foreground">
          {formatTime(event.startTime)}–{formatTime(event.endTime)}
        </span>
        {!isCompleted && (
          <span className="text-xs tabular-nums text-tertiary-foreground flex items-center gap-1">
            <Users className="size-3.5 text-tertiary-foreground" aria-hidden="true" />
            {event.signups}{event.maxCapacity ? `/${event.maxCapacity}` : ''}
          </span>
        )}
      </div>
    </Link>
  );
}

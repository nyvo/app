import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
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
        isCompleted
          ? 'bg-muted'
          : isActive
          ? 'bg-background ring-2 ring-primary/20 ring-offset-1'
          : 'bg-background hover:bg-muted/50'
      }`}
    >
      {/* Title row — most scannable */}
      <div className="flex items-start justify-between gap-3">
        <p className={`text-sm font-medium truncate ${isCompleted ? 'text-muted-foreground' : 'text-foreground'}`}>
          {event.title}
        </p>
        {isActive && (
          <Badge variant="secondary" className="shrink-0 border-0 bg-green-100 text-green-800 ring-1 ring-inset ring-green-300">
            Pågår
          </Badge>
        )}
        {isCompleted && (
          <span className="text-xs font-medium tracking-wide shrink-0 text-muted-foreground">Fullført</span>
        )}
      </div>

      {/* Time + signups — secondary row */}
      <div className="mt-1 flex items-center justify-between text-muted-foreground">
        <span className="text-xs font-medium tracking-wide">
          {formatTime(event.startTime)}–{formatTime(event.endTime)}
        </span>
        {!isCompleted && (
          <span className="text-xs font-medium tracking-wide flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            {event.signups}{event.maxCapacity ? `/${event.maxCapacity}` : ''}
          </span>
        )}
      </div>
    </Link>
  );
}

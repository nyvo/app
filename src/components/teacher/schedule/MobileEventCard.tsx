import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
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
      className={`block rounded-xl p-4 smooth-transition cursor-pointer border border-zinc-200 ${
        isCompleted
          ? 'bg-zinc-50'
          : isActive
          ? 'bg-white ring-2 ring-zinc-900/20 ring-offset-1'
          : 'bg-white hover:bg-zinc-50/50'
      }`}
    >
      {/* Title row — most scannable */}
      <div className="flex items-start justify-between gap-3">
        <p className={`text-sm font-medium truncate ${isCompleted ? 'text-text-tertiary' : 'text-text-primary'}`}>
          {event.title}
        </p>
        {isActive && (
          <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 shrink-0">
            Pågår
          </span>
        )}
        {isCompleted && (
          <span className="text-xs font-medium text-text-tertiary shrink-0">Fullført</span>
        )}
      </div>

      {/* Time + signups — secondary row */}
      <div className={`flex items-center justify-between mt-1 ${isCompleted ? 'text-text-tertiary' : 'text-text-secondary'}`}>
        <span className="text-xs">
          {formatTime(event.startTime)}–{formatTime(event.endTime)}
        </span>
        {!isCompleted && (
          <span className="flex items-center gap-1 text-xs">
            <Users className="h-3.5 w-3.5 text-text-tertiary" aria-hidden="true" />
            {event.signups}{event.maxCapacity ? `/${event.maxCapacity}` : ''}
          </span>
        )}
      </div>
    </Link>
  );
}

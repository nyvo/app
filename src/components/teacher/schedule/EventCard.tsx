import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
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
      className={`absolute left-1 right-1 rounded-lg p-2 smooth-transition cursor-pointer group overflow-hidden block border border-zinc-200 ${
        isCompleted
          ? 'bg-zinc-50'
          : isActive
          ? 'bg-white ring-2 ring-zinc-900/20 ring-offset-1'
          : 'bg-white hover:bg-zinc-50/50'
      }`}
      style={positionStyle}
    >
      {isCompact ? (
        /* Single-line for very short sessions (<36 min) */
        <div className="flex items-center gap-1.5">
          <p className={`text-xs font-medium truncate ${isCompleted ? 'text-text-tertiary' : 'text-text-primary'}`}>
            {event.title}
          </p>
          <span className={`text-xs shrink-0 ${isCompleted ? 'text-text-tertiary' : 'text-text-tertiary'}`}>
            {formatTime(event.startTime)}
          </span>
        </div>
      ) : (
        <>
          {/* Title first — the most important for scanning */}
          <div className="flex items-start justify-between gap-1">
            <p className={`text-xs font-medium truncate ${isCompleted ? 'text-text-tertiary' : 'text-text-primary'}`}>
              {event.title}
            </p>
            {isActive && (
              <span className="inline-flex items-center rounded-full bg-green-50 px-1.5 py-0.5 text-xxs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 shrink-0">
                Pågår
              </span>
            )}
          </div>

          {/* Time + signups on one line — secondary info */}
          <div className={`flex items-center justify-between mt-1 ${isCompleted ? 'text-text-tertiary' : 'text-text-secondary'}`}>
            <span className="text-xs">
              {formatTime(event.startTime)}–{formatTime(event.endTime)}
            </span>
            {!isCompleted && (
              <span className="flex items-center gap-1 text-xs">
                <Users className="h-3 w-3 text-text-tertiary" aria-hidden="true" />
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

import { Link } from 'react-router-dom';
import { X, MapPin, Users, Clock, ArrowUpRight } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ScheduleEvent } from './types';
import { formatTime } from './utils';

interface EventSidebarProps {
  event: ScheduleEvent;
  sessionDate?: string;
  onClose: () => void;
}

function formatFullDate(dateStr?: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayName = date.toLocaleDateString('nb-NO', { weekday: 'long' });
  const monthName = date.toLocaleDateString('nb-NO', { month: 'long' });
  return `${dayName.charAt(0).toUpperCase()}${dayName.slice(1)} ${day}. ${monthName} ${year}`;
}

export function EventSidebar({ event, sessionDate, onClose }: EventSidebarProps) {
  const statusLabel = event.status === 'active'
    ? 'Pågår nå'
    : event.status === 'completed'
    ? 'Fullført'
    : 'Kommende';

  const enrollmentLabel = event.maxCapacity
    ? `${event.signups}/${event.maxCapacity} påmeldte`
    : `${event.signups} påmeldte`;

  return (
    <aside className="h-full overflow-y-auto">
      <div className="p-6">
        <div className="flex items-start justify-between gap-2 mb-5">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground truncate">{event.title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatFullDate(sessionDate)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Lukk"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Status — monochrome pill. Active pulled to bg-foreground for the
            "this is happening now" signal; rest stay calm. */}
        <div className="mb-6">
          <span className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium leading-[1.5]',
            event.status === 'active' && 'bg-foreground text-background',
            event.status === 'completed' && 'bg-muted text-muted-foreground',
            event.status === 'upcoming' && 'bg-muted text-foreground',
          )}>
            {statusLabel}
          </span>
        </div>

        {/* Details — single tier, icon + label + value on one line. No
            tracked-uppercase eyebrows. */}
        <div className="space-y-3">
          <div className="flex items-center gap-2.5 text-sm">
            <Clock className="size-4 text-muted-foreground shrink-0" strokeWidth={1.75} />
            <span className="text-foreground tabular-nums">
              {formatTime(event.startTime)} – {formatTime(event.endTime)}
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-sm">
            <MapPin className="size-4 text-muted-foreground shrink-0" strokeWidth={1.75} />
            <span className="text-foreground">{event.location}</span>
          </div>

          <div className="flex items-center gap-2.5 text-sm">
            <Users className="size-4 text-muted-foreground shrink-0" strokeWidth={1.75} />
            <span className="text-foreground tabular-nums">{enrollmentLabel}</span>
          </div>
        </div>

        {/* Link to course */}
        <div className="mt-6 pt-5 border-t border-border">
          <Link
            to={`/teacher/courses/${event.courseId}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:underline decoration-disabled-foreground underline-offset-2"
          >
            Se kursdetaljer
            <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
          </Link>
        </div>
      </div>
    </aside>
  );
}

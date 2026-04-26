import { Link } from 'react-router-dom';
import { X, MapPin, Users, Clock, ArrowUpRight } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

  const statusVariant = event.status === 'active'
    ? 'success' as const
    : event.status === 'completed'
    ? 'neutral' as const
    : 'info' as const;

  const enrollmentLabel = event.maxCapacity
    ? `${event.signups}/${event.maxCapacity} påmeldte`
    : `${event.signups} påmeldte`;

  return (
    <aside className="h-full overflow-y-auto">
      <div className="p-6">
        <div className="flex items-start justify-between gap-2 mb-6">
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

        {/* Status */}
        <div className="mb-6">
          <Badge variant={statusVariant} shape="rect" size="sm">
            {statusLabel}
          </Badge>
        </div>

        {/* Details */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <Clock className="size-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground">Tidspunkt</p>
              <p className="text-sm tabular-nums text-foreground">
                {formatTime(event.startTime)} – {formatTime(event.endTime)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <MapPin className="size-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground">Sted</p>
              <p className="text-sm text-foreground">{event.location}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Users className="size-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground">Deltakere</p>
              <p className="text-sm tabular-nums text-foreground">{enrollmentLabel}</p>
            </div>
          </div>
        </div>

        {/* Link to course */}
        <div className="mt-6 pt-6 border-t border-border">
          <Link
            to={`/teacher/courses/${event.courseId}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground smooth-transition"
          >
            Se kursdetaljer
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </aside>
  );
}

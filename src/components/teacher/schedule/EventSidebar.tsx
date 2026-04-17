import { Link } from 'react-router-dom';
import { X, MapPin, Users, Clock, ArrowUpRight } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { StatusIndicator } from '@/components/ui/status-indicator';
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
            <h2 className="text-base font-medium text-foreground truncate">{event.title}</h2>
            <p className="text-xs font-medium tracking-wide text-muted-foreground mt-0.5">
              {formatFullDate(sessionDate)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Lukk"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Status */}
        <div className="mb-6">
          <StatusIndicator
            variant={statusVariant}
            mode="badge"
            size="sm"
            label={statusLabel}
          />
        </div>

        {/* Details */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs font-medium text-foreground">Tidspunkt</p>
              <p className="text-xs font-medium tracking-wide text-muted-foreground">
                {formatTime(event.startTime)} – {formatTime(event.endTime)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs font-medium text-foreground">Sted</p>
              <p className="text-xs font-medium tracking-wide text-muted-foreground">{event.location}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs font-medium text-foreground">Deltakere</p>
              <p className="text-xs font-medium tracking-wide text-muted-foreground">{enrollmentLabel}</p>
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
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </aside>
  );
}

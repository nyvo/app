import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { CourseSession } from '@/types/database';

interface CourseSessionsProps {
  sessions: CourseSession[];
}

const WEEKDAYS_LONG = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'] as const;
const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'] as const;

function formatTime(time: string | null): string {
  if (!time) return '';
  return time.slice(0, 5);
}

/**
 * Date tiles for a series. Sentence-case typography — no tracked uppercase.
 * Past sessions render on a muted surface; cancelled sessions show "Avlyst"
 * inline and keep their slot so the calendar rhythm survives.
 *
 * No standalone heading — the consumer wraps this in an Accordion.
 */
export function CourseSessions({ sessions }: CourseSessionsProps) {
  const todayMs = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t.getTime();
  }, []);

  const visible = useMemo(
    () => sessions.slice().sort((a, b) => a.session_date.localeCompare(b.session_date)),
    [sessions],
  );

  if (visible.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
      {visible.map(s => {
        const d = new Date(s.session_date);
        const valid = !isNaN(d.getTime());
        const day = valid ? WEEKDAYS_LONG[d.getDay()] : '';
        const dayNum = valid ? d.getDate() : '';
        const month = valid ? MONTHS_SHORT[d.getMonth()] : '';
        const isPast = valid && new Date(s.session_date).setHours(0, 0, 0, 0) < todayMs;
        const isCancelled = s.status === 'cancelled';
        const dim = isPast || isCancelled;

        return (
          <div
            key={s.id}
            className={cn(
              'relative rounded-lg border border-border bg-surface px-3.5 py-3',
              dim && 'bg-muted border-transparent',
            )}
          >
            <span
              className={cn(
                'text-sm font-medium',
                dim ? 'text-foreground-muted' : 'text-foreground-muted',
              )}
            >
              {day}
            </span>
            <div
              className={cn(
                'mt-0.5 flex items-baseline gap-1',
                dim && 'text-foreground-muted',
              )}
            >
              <span
                className={cn(
                  'text-2xl font-semibold tabular-nums tracking-tight leading-none',
                  dim ? 'text-foreground-muted' : 'text-foreground',
                )}
              >
                {dayNum}
              </span>
              <span className="text-sm text-foreground-muted">{month}</span>
            </div>
            {isCancelled ? (
              <div className="mt-1.5 text-sm font-medium text-danger">Avlyst</div>
            ) : isPast ? (
              <div className="mt-1.5 text-sm font-medium text-foreground-muted">Ferdig</div>
            ) : s.start_time ? (
              <div className="mt-1.5 text-sm tabular-nums text-foreground-muted">
                kl. {formatTime(s.start_time)}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

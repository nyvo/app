import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { CourseSession } from '@/types/database';

interface CourseSessionsProps {
  sessions: CourseSession[];
}

const WEEKDAYS_SHORT = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'] as const;
const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'] as const;

function formatTime(time: string | null): string {
  if (!time) return '';
  return time.slice(0, 5);
}

/**
 * Visual rhythm of date tiles instead of a collapsed accordion.
 * Past sessions render dimmer with a strikethrough date; cancelled sessions
 * are visibly disabled but kept in place so the rhythm remains.
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
    <section className="space-y-5">
      <h2 className="text-xs font-medium tracking-[0.14em] uppercase text-muted-foreground">
        Datoer
        <span className="ml-2 text-disabled-foreground tabular-nums normal-case tracking-normal">
          {visible.length}
        </span>
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
        {visible.map(s => {
          const d = new Date(s.session_date);
          const valid = !isNaN(d.getTime());
          const day = valid ? WEEKDAYS_SHORT[d.getDay()] : '';
          const dayNum = valid ? d.getDate() : '';
          const month = valid ? MONTHS_SHORT[d.getMonth()] : '';
          const isPast = valid && new Date(s.session_date).setHours(0, 0, 0, 0) < todayMs;
          const isCancelled = s.status === 'cancelled';
          const dim = isPast || isCancelled;

          return (
            <div
              key={s.id}
              className={cn(
                'relative rounded-lg border border-border bg-card p-3.5',
                'transition-colors duration-200',
                dim && 'bg-muted/40 border-border/50',
              )}
            >
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    'text-[11px] font-medium tracking-[0.14em] uppercase',
                    dim ? 'text-muted-foreground' : 'text-muted-foreground',
                  )}
                >
                  {day}
                </span>
                {isCancelled && (
                  <span className="text-[10px] tracking-wide uppercase text-muted-foreground">Avlyst</span>
                )}
                {isPast && !isCancelled && (
                  <span className="text-[10px] tracking-wide uppercase text-disabled-foreground">Ferdig</span>
                )}
              </div>
              <div
                className={cn(
                  'mt-1 flex items-baseline gap-1.5',
                  dim && 'text-muted-foreground',
                )}
              >
                <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground leading-none">
                  {dayNum}
                </span>
                <span className="text-xs tracking-wide uppercase text-muted-foreground">{month}</span>
              </div>
              {s.start_time && (
                <div className="mt-2 text-xs tabular-nums text-muted-foreground">
                  kl. {formatTime(s.start_time)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

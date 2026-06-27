import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from '@/lib/icons';
import { cn } from '@/lib/utils';
import type { PublicCourseWithDetails } from '@/services/publicCourses';

interface StudioMonthGridProps {
  courses: PublicCourseWithDetails[];
  onSelectDay?: (dateKey: string) => void;
}

const WEEKDAY_HEADERS = ['man', 'tir', 'ons', 'tor', 'fre', 'lør', 'søn'] as const;
const MONTHS = [
  'januar', 'februar', 'mars', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'desember',
] as const;

function toKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 0 = Mon, 6 = Sun (Norwegian week starts on Monday).
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/**
 * Traditional month-grid calendar — 6 rows × 7 columns. Days with classes
 * carry a small success dot below the date number. Days outside the current
 * month are dimmed so they read as context, not as targets.
 */
export function StudioMonthGrid({ courses, onSelectDay }: StudioMonthGridProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayKey = toKey(today);

  // Cursor month controls which 6-week window is rendered. Defaults to today's month.
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedKey, setSelectedKey] = useState(todayKey);

  // Bucket every upcoming session by date so we know which cells get the dot.
  const buckets = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of courses) {
      const dates = c.upcoming_session_dates.length > 0
        ? c.upcoming_session_dates
        : c.next_session?.session_date
          ? [c.next_session.session_date]
          : c.start_date
            ? [c.start_date]
            : [];
      for (const raw of dates) {
        const key = raw.slice(0, 10);
        map.set(key, (map.get(key) ?? 0) + 1);
      }
    }
    return map;
  }, [courses]);

  // Build the 42-cell window: starts on the Monday on/before the 1st of the month.
  const cells = useMemo(() => {
    const start = new Date(cursor);
    start.setDate(1 - mondayIndex(cursor));
    const out: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      out.push(d);
    }
    return out;
  }, [cursor]);

  const monthLabel = `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;

  const goMonth = (delta: number) => {
    setCursor(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const handleSelect = (key: string) => {
    setSelectedKey(key);
    onSelectDay?.(key);
  };

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h2 className="text-xl font-medium text-foreground tabular-nums">
          {monthLabel}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goMonth(-1)}
            className="flex size-8 items-center justify-center rounded-full border border-border bg-background text-foreground hover:bg-muted transition-colors"
            aria-label="Forrige måned"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => goMonth(1)}
            className="flex size-8 items-center justify-center rounded-full border border-border bg-background text-foreground hover:bg-muted transition-colors"
            aria-label="Neste måned"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-1 text-sm font-medium text-foreground-muted">
        {WEEKDAY_HEADERS.map(d => (
          <div key={d} className="py-2 text-center capitalize">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map(cell => {
          const key = toKey(cell);
          const inMonth = cell.getMonth() === cursor.getMonth();
          const isToday = key === todayKey;
          const isSelected = key === selectedKey;
          const count = buckets.get(key) ?? 0;
          const hasClasses = count > 0;

          return (
            <button
              key={key}
              type="button"
              onClick={() => handleSelect(key)}
              aria-pressed={isSelected}
              aria-label={`${cell.getDate()}. ${MONTHS[cell.getMonth()]}${hasClasses ? `, ${count} klasser` : ''}`}
              className={cn(
                'group relative flex aspect-square flex-col items-center justify-center rounded-md text-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/15',
                isSelected
                  ? 'bg-foreground text-background'
                  : isToday
                    ? 'bg-muted text-foreground ring-1 ring-border'
                    : inMonth
                      ? 'text-foreground hover:bg-muted'
                      : 'text-foreground-disabled hover:bg-muted/40',
              )}
            >
              <span className="tabular-nums leading-none">{cell.getDate()}</span>
              {hasClasses && (
                <span
                  className={cn(
                    'absolute bottom-1.5 size-1 rounded-full',
                    isSelected ? 'bg-background' : 'bg-success',
                  )}
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

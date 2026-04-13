import { cn } from '@/lib/utils';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];

interface DateBadgeProps {
  /** Date string in YYYY-MM-DD format, or a Date object */
  dateStr?: string;
  date?: Date;
  className?: string;
}

/**
 * Calendar-page style date display.
 * Colored month strip on top, day number below.
 */
export function DateBadge({ dateStr, date: dateProp, className }: DateBadgeProps) {
  let date: Date;
  if (dateProp) {
    date = dateProp;
  } else if (dateStr) {
    const parts = dateStr.split('-');
    date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  } else {
    return <div className={cn("h-11 w-11 rounded-lg bg-muted", className)} />;
  }

  if (isNaN(date.getTime())) {
    return <div className={cn("h-11 w-11 rounded-lg bg-muted", className)} />;
  }

  const month = MONTHS[date.getMonth()];
  const day = date.getDate();

  return (
    <div
      className={cn(
        "flex h-11 w-11 shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-background",
        className
      )}
    >
      <div className="flex h-3.5 items-center justify-center bg-[var(--color-primary-muted)]">
        <span className="type-meta text-[9px] uppercase leading-none tracking-[0.06em] text-[var(--color-primary-muted-foreground)]">{month}</span>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <span className="text-base font-semibold leading-none text-foreground">{day}</span>
      </div>
    </div>
  );
}

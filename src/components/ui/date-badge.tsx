import { cn } from '@/lib/utils';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];

interface DateBadgeProps {
  /** Date string in YYYY-MM-DD format, or a Date object */
  dateStr?: string;
  date?: Date;
  className?: string;
}

/**
 * Compact calendar-page date display.
 * Month abbreviation on top, day number below.
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
        "flex h-11 w-11 shrink-0 flex-col items-center justify-center overflow-hidden rounded-lg border border-border bg-background",
        className
      )}
    >
      <span className="text-[10px] font-medium uppercase leading-none text-muted-foreground">{month}</span>
      <span className="text-base font-medium leading-tight text-foreground">{day}</span>
    </div>
  );
}

import { cn } from '@/lib/utils';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];

type DateBadgeSize = 'sm' | 'default';

interface DateBadgeProps {
  /** Date string in YYYY-MM-DD format, or a Date object */
  dateStr?: string;
  date?: Date;
  /** `default` = 48px (size-12), `sm` = 40px (size-10) — matches UserAvatar lg. */
  size?: DateBadgeSize;
  className?: string;
}

const SIZE_CLASSES: Record<DateBadgeSize, {
  container: string;
  strip: string;
  monthText: string;
  dayText: string;
}> = {
  default: {
    container: 'size-12',
    strip: 'h-3.5',
    monthText: 'text-xs',
    dayText: 'text-base',
  },
  sm: {
    container: 'size-10',
    strip: 'h-3.5',
    monthText: 'text-xs',
    dayText: 'text-sm',
  },
};

/**
 * Calendar-page style date display.
 * Colored month strip on top, day number below.
 */
export function DateBadge({
  dateStr,
  date: dateProp,
  size = 'default',
  className,
}: DateBadgeProps) {
  const sizes = SIZE_CLASSES[size];

  let date: Date;
  if (dateProp) {
    date = dateProp;
  } else if (dateStr) {
    const parts = dateStr.split('-');
    date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  } else {
    return <div className={cn(sizes.container, 'rounded-lg bg-muted', className)} />;
  }

  if (isNaN(date.getTime())) {
    return <div className={cn(sizes.container, 'rounded-lg bg-muted', className)} />;
  }

  const month = MONTHS[date.getMonth()];
  const day = date.getDate();
  const fullDateLabel = date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long' });

  return (
    <div
      role="img"
      aria-label={fullDateLabel}
      className={cn(
        'flex shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-background',
        sizes.container,
        className,
      )}
    >
      <div aria-hidden="true" className={cn('flex items-center justify-center bg-muted', sizes.strip)}>
        <span className={cn('font-medium leading-none text-foreground', sizes.monthText)}>
          {month}
        </span>
      </div>
      <div aria-hidden="true" className="flex flex-1 items-center justify-center">
        <span className={cn('font-medium leading-none text-foreground', sizes.dayText)}>
          {day}
        </span>
      </div>
    </div>
  );
}

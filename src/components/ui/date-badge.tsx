const MONTHS = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];

interface DateBadgeProps {
  /** Date string in YYYY-MM-DD format, or a Date object */
  dateStr?: string;
  date?: Date;
}

/**
 * Compact calendar-page date display.
 * Month abbreviation on top, day number below.
 */
export function DateBadge({ dateStr, date: dateProp }: DateBadgeProps) {
  let date: Date;
  if (dateProp) {
    date = dateProp;
  } else if (dateStr) {
    const parts = dateStr.split('-');
    date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  } else {
    return <div className="w-11 h-11 rounded-lg bg-surface-elevated" />;
  }

  if (isNaN(date.getTime())) {
    return <div className="w-11 h-11 rounded-lg bg-surface-elevated" />;
  }

  const month = MONTHS[date.getMonth()];
  const day = date.getDate();

  return (
    <div className="w-11 h-11 rounded-lg border border-border bg-white flex flex-col items-center justify-center shrink-0 overflow-hidden">
      <span className="text-[10px] font-medium uppercase leading-none text-text-tertiary">{month}</span>
      <span className="text-base font-medium leading-tight text-text-primary">{day}</span>
    </div>
  );
}

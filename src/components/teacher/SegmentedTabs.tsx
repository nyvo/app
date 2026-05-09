import { cn } from '@/lib/utils';

export interface SegmentedTab<T extends string> {
  key: T;
  label: string;
  /** Optional inline count rendered tabular-nums next to the label. */
  count?: number;
}

interface SegmentedTabsProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  tabs: SegmentedTab<T>[];
  ariaLabel?: string;
  className?: string;
}

/**
 * Inline segmented control — muted track, active pill flips to bg-background
 * + soft shadow. Shared across /teacher/courses, /signups, /schedule, and
 * the course detail tab bar so the dashboard reads as one system.
 */
export function SegmentedTabs<T extends string>({
  value,
  onChange,
  tabs,
  ariaLabel,
  className,
}: SegmentedTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('inline-flex rounded-lg bg-muted p-0.5 gap-0.5 w-fit', className)}
    >
      {tabs.map(t => {
        const active = value === t.key;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              'outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
              active
                ? 'bg-background text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
                : 'text-foreground-muted hover:text-foreground',
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={cn(
                'tabular-nums text-xs',
                active ? 'text-foreground' : 'text-foreground-muted',
              )}>
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

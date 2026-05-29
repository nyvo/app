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
  /** Stretch the control to fill its container; each tab gets equal width. */
  stretch?: boolean;
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
  stretch = false,
}: SegmentedTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'h-9 items-center rounded-full bg-muted p-1 gap-1',
        stretch ? 'flex w-full' : 'inline-flex w-fit',
        className,
      )}
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
              'inline-flex h-7 items-center justify-center gap-2 rounded-full px-3 text-sm font-medium transition-colors',
              'outline-none focus-visible:ring-2 focus-visible:ring-foreground/15',
              stretch && 'flex-1',
              active
                ? 'bg-surface text-foreground shadow-xs'
                : 'text-foreground-muted hover:text-foreground',
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={cn(
                'tabular-nums text-sm',
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

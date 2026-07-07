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
  /** Control height. 'md' (default) = 36px track; 'lg' = 44px track for
   *  generous, form-first surfaces (e.g. the course builder). */
  size?: 'md' | 'lg';
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
  size = 'lg',
}: SegmentedTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'items-center rounded-full bg-muted p-1 gap-1',
        size === 'lg' ? 'h-11' : 'h-9',
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
              'inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium transition-colors',
              size === 'lg' ? 'h-9 px-4' : 'h-7 px-3',
              'outline-none focus-visible:ring-2 focus-visible:ring-ring-subtle',
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

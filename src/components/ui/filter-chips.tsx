import { cn } from '@/lib/utils';

export interface FilterChip<T extends string> {
  key: T;
  label: string;
  /** Optional inline count rendered tabular-nums next to the label. */
  count?: number;
}

interface FilterChipsProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  chips: FilterChip<T>[];
  ariaLabel?: string;
  className?: string;
}

/**
 * Discrete filter chips — multi-selection-style row of pill buttons.
 * Unlike SegmentedTabs (one continuous track), each chip is a standalone
 * pill with its own border. Used for category filters on public listings
 * and any place a list filter needs more than 3 options.
 *
 * Active = inverted (bg-foreground text-background). Inactive = bordered
 * surface with hover. Optional count tail (tabular-nums).
 */
export function FilterChips<T extends string>({
  value,
  onChange,
  chips,
  ariaLabel,
  className,
}: FilterChipsProps<T>) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn('flex flex-wrap gap-2', className)}>
      {chips.map((c) => {
        const active = value === c.key;
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onChange(c.key)}
            aria-pressed={active}
            className={cn(
              'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-base font-medium',
              'transition-colors duration-150 outline-none',
              'focus-visible:border-foreground focus-visible:ring-2 focus-visible:ring-ring-subtle',
              active
                ? 'bg-foreground text-background border-foreground'
                : 'bg-background text-foreground border-border hover:bg-muted',
            )}
          >
            {c.label}
            {c.count !== undefined && (
              <span
                className={cn(
                  'tabular-nums text-sm',
                  active ? 'text-background' : 'text-foreground-muted',
                )}
              >
                {c.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

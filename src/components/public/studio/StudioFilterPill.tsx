import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface FilterOption<T extends string> {
  value: T;
  label: string;
}

interface StudioFilterPillProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: FilterOption<T>[];
  /** The "no filter" value — the pill reads as inactive while selected. */
  allValue: T;
  ariaLabel: string;
}

/**
 * Quiet text-and-chevron filter trigger for the schedule's filter row. Kept
 * deliberately light — borderless, same weight as the tabs it sits beside —
 * so it reads as a sibling control, not an overpowering button. The selected
 * value is the signal; an applied filter darkens from muted to foreground.
 */
export function StudioFilterPill<T extends string>({
  value,
  onChange,
  options,
  allValue,
  ariaLabel,
}: StudioFilterPillProps<T>) {
  const active = value !== allValue;

  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn(
          'h-8 gap-1 rounded-md border-transparent bg-transparent px-2 text-sm font-medium',
          'hover:bg-muted [&_svg]:size-3.5',
          active ? 'text-foreground' : 'text-foreground-muted hover:text-foreground',
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="rounded-xl">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

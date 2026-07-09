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
 * Muted-pill filter trigger for the agenda's one control row (mockup Q1):
 * borderless rounded-full grey fill, the selected value is the label. An
 * applied filter darkens from muted to foreground — the fill stays quiet.
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
          'h-8 gap-1 rounded-full border-transparent bg-muted px-3.5 text-sm font-medium',
          'hover:bg-border-subtle/60 [&_svg]:size-3.5',
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

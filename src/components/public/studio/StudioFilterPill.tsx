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
  ariaLabel: string;
}

/**
 * Muted-pill filter trigger for the agenda's one control row (mockup Q1):
 * borderless rounded-full grey fill, the selected value is the label.
 * Label and chevron stay full-strength foreground at all times — the
 * muted-grey resting state read as unreadable on the grey fill.
 */
export function StudioFilterPill<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: StudioFilterPillProps<T>) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn(
          'h-8 gap-1 rounded-full border-transparent bg-muted px-3 text-sm font-medium text-foreground',
          'hover:bg-pressed [&_svg]:size-3.5 [&_svg]:text-foreground',
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

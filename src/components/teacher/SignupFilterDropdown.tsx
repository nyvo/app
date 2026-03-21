import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Filter, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CombinedFilter = 'all' | 'pending_payment' | 'payment_failed' | 'cancelled' | 'refunded';

export const COMBINED_FILTER_OPTIONS: Array<{ value: CombinedFilter; label: string }> = [
  { value: 'all', label: 'Alle' },
  { value: 'pending_payment', label: 'Venter betaling' },
  { value: 'payment_failed', label: 'Betaling feilet' },
  { value: 'cancelled', label: 'Avbestilt' },
  { value: 'refunded', label: 'Refundert' },
];

interface SignupFilterDropdownProps {
  value: CombinedFilter;
  onChange: (value: CombinedFilter) => void;
  counts: Record<CombinedFilter, number>;
}

export function SignupFilterDropdown({ value, onChange, counts }: SignupFilterDropdownProps) {
  const currentLabel = COMBINED_FILTER_OPTIONS.find(o => o.value === value)?.label || 'Alle';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cn(
          'flex items-center gap-2 h-10 rounded-lg border px-3 py-2 text-xs font-medium ios-ease whitespace-nowrap cursor-pointer',
          value !== 'all'
            ? 'bg-white text-text-primary border-border'
            : 'bg-white text-text-secondary border-border hover:bg-surface-elevated hover:text-text-primary'
        )}>
          <Filter className="h-3.5 w-3.5" />
          Filter: {currentLabel}
          <ChevronDown className="ml-1 h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {COMBINED_FILTER_OPTIONS.map(option => {
          const isEmpty = option.value !== 'all' && counts[option.value] === 0;
          return (
            <DropdownMenuItem
              key={option.value}
              disabled={isEmpty}
              onSelect={() => onChange(option.value)}
            >
              {option.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

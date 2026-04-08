import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Filter, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

import { Users, AlertTriangle, RotateCcw, Archive, type LucideIcon } from 'lucide-react';

// New payment-focused filters (used by SignupsPage)
export type PaymentFilter = 'all' | 'pending' | 'refunded' | 'archived';

export const PAYMENT_FILTER_OPTIONS: Array<{ value: PaymentFilter; label: string; icon: LucideIcon }> = [
  { value: 'all', label: 'Alle', icon: Users },
  { value: 'pending', label: 'Betalingsproblemer', icon: AlertTriangle },
  { value: 'refunded', label: 'Refundert', icon: RotateCcw },
  { value: 'archived', label: 'Arkiv', icon: Archive },
];

// Combined filter (used by CourseParticipantsTab)
export type CombinedFilter = 'all' | 'payment_issues' | 'cancelled' | 'refunded' | 'ended';

export const COMBINED_FILTER_OPTIONS: Array<{ value: CombinedFilter; label: string }> = [
  { value: 'all', label: 'Alle' },
  { value: 'payment_issues', label: 'Betalingsproblemer' },
  { value: 'cancelled', label: 'Avbestilt' },
  { value: 'refunded', label: 'Refundert' },
  { value: 'ended', label: 'Avsluttede kurs' },
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
        <Button
          variant="outline-soft"
          size="default"
          className={cn(
            'gap-2 whitespace-nowrap',
            value !== 'all'
              ? 'text-foreground'
              : 'text-muted-foreground'
          )}
        >
          <Filter className="h-3.5 w-3.5" />
          Filter: {currentLabel}
          <ChevronDown className="ml-1 h-3.5 w-3.5" />
        </Button>
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

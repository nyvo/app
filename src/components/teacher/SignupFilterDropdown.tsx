import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, CreditCard, Undo2, Archive, type LucideIcon } from '@/lib/icons';

export type PaymentFilter = 'all' | 'pending' | 'refunded' | 'archived';

export const PAYMENT_FILTER_OPTIONS: Array<{ value: PaymentFilter; label: string; icon: LucideIcon }> = [
  { value: 'all', label: 'Alle', icon: Users },
  { value: 'pending', label: 'Betaling', icon: CreditCard },
  { value: 'refunded', label: 'Refundert', icon: Undo2 },
  { value: 'archived', label: 'Arkiv', icon: Archive },
];

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
  return (
    <Select value={value} onValueChange={(v) => onChange(v as CombinedFilter)}>
      <SelectTrigger size="sm" className="w-full md:w-auto" aria-label="Filtrer deltakere">
        <span className="text-muted-foreground">Filter:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {COMBINED_FILTER_OPTIONS.map(option => {
          const count = counts[option.value];
          const isEmpty = option.value !== 'all' && count === 0;
          return (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={isEmpty}
            >
              {option.label}{option.value !== 'all' && count > 0 ? ` (${count})` : ''}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  'aria-label'?: string;
  className?: string;
}

export const SearchInput = ({
  value,
  onChange,
  placeholder = 'Søk...',
  'aria-label': ariaLabel,
  className,
}: SearchInputProps) => {
  return (
    <div className={cn('relative group', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary group-focus-within:text-text-primary transition-colors pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder}
        className="h-10 w-full rounded-xl border border-border bg-white pl-10 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:border-text-tertiary focus:outline-none focus:ring-1 focus:ring-text-tertiary ios-ease shadow-sm hover:border-ring"
      />
    </div>
  );
};

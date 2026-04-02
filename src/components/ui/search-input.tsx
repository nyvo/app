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
  placeholder = 'Søk',
  'aria-label': ariaLabel,
  className,
}: SearchInputProps) => {
  return (
    <div className={cn('relative group', className)}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder}
        className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm text-foreground transition-[background-color,border-color,color,opacity] duration-150 ease-out placeholder:text-muted-foreground hover:border-ring focus:border-ring focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:hover:border-input"
      />
    </div>
  );
};

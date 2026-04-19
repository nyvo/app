import { Search } from '@/lib/icons';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';

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
    <InputGroup className={className}>
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder}
      />
    </InputGroup>
  );
};

import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, MapPin, DoorOpen } from '@/lib/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, foldNorwegian } from '@/lib/utils';
import type { TeacherLocation } from '@/types/database';

interface LocationOption {
  value: string;
  label: string;
  group?: string;
}

interface LocationComboboxProps {
  value: string;
  onChange: (value: string) => void;
  locations: TeacherLocation[];
  placeholder?: string;
  className?: string;
  'aria-invalid'?: 'true' | 'false';
  'aria-label'?: string;
}

const SEPARATOR = ' \u2013 ';

function buildOptions(locations: TeacherLocation[]): LocationOption[] {
  const options: LocationOption[] = [];
  for (const loc of locations) {
    options.push({ value: loc.name, label: loc.name });
    for (const room of loc.rooms) {
      options.push({
        value: `${loc.name}${SEPARATOR}${room}`,
        label: room,
        group: loc.name,
      });
    }
  }
  return options;
}

export function LocationCombobox({
  value,
  onChange,
  locations,
  placeholder = 'Velg sted',
  className,
  ...ariaProps
}: LocationComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const allOptions = useMemo(() => buildOptions(locations), [locations]);

  const filtered = useMemo(() => {
    if (!search) return allOptions;
    const q = foldNorwegian(search);
    return allOptions.filter(
      (o) => foldNorwegian(o.value).includes(q) || foldNorwegian(o.label).includes(q)
    );
  }, [allOptions, search]);

  // Group options by space
  const grouped = useMemo(() => {
    const groups: Record<string, LocationOption[]> = {};
    const standalone: LocationOption[] = [];
    for (const opt of filtered) {
      if (opt.group) {
        if (!groups[opt.group]) groups[opt.group] = [];
        groups[opt.group].push(opt);
      } else {
        standalone.push(opt);
      }
    }
    return { standalone, groups };
  }, [filtered]);

  const hasOptions = locations.length > 0;
  const showCustom = search.trim() && !allOptions.some((o) => foldNorwegian(o.value) === foldNorwegian(search.trim()));

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setSearch('');
  };

  // If no saved locations, render a plain-style trigger that opens the popover with just a text input
  if (!hasOptions) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'flex h-9 w-full items-center rounded-md border border-border bg-surface px-3 text-sm font-medium transition-[color,border-color,box-shadow] duration-150 ease-out placeholder:font-normal placeholder:text-foreground-muted focus-visible:outline-none focus-visible:border-foreground focus-visible:ring-2 focus-visible:ring-foreground/15 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...ariaProps}
      />
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-md border border-border bg-surface px-3 text-sm font-medium transition-[color,border-color,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:border-foreground focus-visible:ring-2 focus-visible:ring-foreground/15 disabled:cursor-not-allowed disabled:opacity-50',
            !value && 'font-normal text-foreground-muted',
            className
          )}
          {...ariaProps}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 text-foreground-muted" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="p-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søk eller skriv nytt sted…"
            className="flex h-8 w-full rounded-md border-0 bg-transparent px-2 text-sm font-medium placeholder:font-normal placeholder:text-foreground-muted focus:outline-none"
            autoFocus
          />
        </div>
        <div className="max-h-60 overflow-y-auto border-t border-border-subtle p-1">
          {/* Standalone spaces */}
          {grouped.standalone.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelect(opt.value)}
              className={cn(
                'relative flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium outline-none hover:bg-accent',
                value === opt.value && 'bg-accent'
              )}
            >
              <MapPin className="size-3.5 shrink-0 text-foreground-muted" />
              <span className="flex-1 truncate">{opt.label}</span>
              {value === opt.value && <Check className="size-3.5 shrink-0" />}
            </button>
          ))}

          {/* Grouped spaces with rooms */}
          {Object.entries(grouped.groups).map(([groupName, rooms]) => (
            <div key={groupName} className="mt-1">
              {/* Space header — selectable as a location itself */}
              {!grouped.standalone.some((s) => s.value === groupName) && (
                <button
                  key={groupName}
                  type="button"
                  onClick={() => handleSelect(groupName)}
                  className={cn(
                    'relative flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium outline-none hover:bg-accent',
                    value === groupName && 'bg-accent'
                  )}
                >
                  <MapPin className="size-3.5 shrink-0 text-foreground-muted" />
                  <span className="flex-1 truncate">{groupName}</span>
                  {value === groupName && <Check className="size-3.5 shrink-0" />}
                </button>
              )}
              {/* Rooms indented under space */}
              <div className="ml-4 border-l border-border pl-3">
                {rooms.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      'relative flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm outline-none hover:bg-accent',
                      value === opt.value ? 'bg-accent font-medium' : 'text-foreground-muted'
                    )}
                  >
                    <DoorOpen className="size-3.5 shrink-0" />
                    <span className="flex-1 truncate">{opt.label}</span>
                    {value === opt.value && <Check className="size-3.5 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Custom entry */}
          {showCustom && (
            <button
              type="button"
              onClick={() => handleSelect(search.trim())}
              className="relative flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-foreground-muted outline-none hover:bg-accent hover:text-foreground"
            >
              Bruk &laquo;{search.trim()}&raquo;
            </button>
          )}

          {filtered.length === 0 && !showCustom && (
            <p className="px-3 py-2 text-sm text-foreground-muted">Ingen treff</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

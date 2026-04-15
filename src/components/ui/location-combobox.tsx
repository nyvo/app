import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, MapPin, DoorOpen } from '@/lib/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
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
    const q = search.toLowerCase();
    return allOptions.filter(
      (o) => o.value.toLowerCase().includes(q) || o.label.toLowerCase().includes(q)
    );
  }, [allOptions, search]);

  // Group options by venue
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
  const showCustom = search.trim() && !allOptions.some((o) => o.value.toLowerCase() === search.trim().toLowerCase());

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
          'flex h-9 w-full items-center rounded-lg border border-input bg-card px-4 py-2 text-[14px] font-medium ring-offset-background placeholder:font-normal placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
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
            'flex h-9 w-full items-center justify-between rounded-lg border border-input bg-card px-4 py-2 text-[14px] font-medium ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            !value && 'font-normal text-muted-foreground',
            className
          )}
          {...ariaProps}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="p-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sok eller skriv nytt sted..."
            className="flex h-8 w-full rounded-md border-0 bg-transparent px-2 text-[13px] font-medium placeholder:font-normal placeholder:text-muted-foreground focus:outline-none"
            autoFocus
          />
        </div>
        <div className="max-h-60 overflow-y-auto border-t border-border/50 p-1">
          {/* Standalone venues */}
          {grouped.standalone.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelect(opt.value)}
              className={cn(
                'relative flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] font-medium outline-none hover:bg-accent',
                value === opt.value && 'bg-accent'
              )}
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{opt.label}</span>
              {value === opt.value && <Check className="h-3.5 w-3.5 shrink-0" />}
            </button>
          ))}

          {/* Grouped venues with rooms */}
          {Object.entries(grouped.groups).map(([groupName, rooms]) => (
            <div key={groupName} className="mt-1">
              {/* Venue header — selectable as a location itself */}
              {!grouped.standalone.some((s) => s.value === groupName) && (
                <button
                  key={groupName}
                  type="button"
                  onClick={() => handleSelect(groupName)}
                  className={cn(
                    'relative flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] font-medium outline-none hover:bg-accent',
                    value === groupName && 'bg-accent'
                  )}
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{groupName}</span>
                  {value === groupName && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              )}
              {/* Rooms indented under venue */}
              <div className="ml-5 border-l border-border pl-3">
                {rooms.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={cn(
                      'relative flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] outline-none hover:bg-accent',
                      value === opt.value ? 'bg-accent font-medium' : 'text-muted-foreground'
                    )}
                  >
                    <DoorOpen className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1 truncate">{opt.label}</span>
                    {value === opt.value && <Check className="h-3.5 w-3.5 shrink-0" />}
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
              className="relative flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] font-medium text-muted-foreground outline-none hover:bg-accent hover:text-foreground"
            >
              Bruk &laquo;{search.trim()}&raquo;
            </button>
          )}

          {filtered.length === 0 && !showCustom && (
            <p className="px-3 py-2 text-[13px] text-muted-foreground">Ingen treff</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

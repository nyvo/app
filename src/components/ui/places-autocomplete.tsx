import { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin } from '@/lib/icons';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { searchPlaces, getPlaceDetails, type PlaceDetails, type PlaceSuggestion } from '@/services/places';

interface PlacesAutocompleteProps {
  /** The text shown in the field (controlled by the parent). */
  value: string;
  /** Free typing — parent should treat this as "no place selected yet". */
  onChange: (value: string) => void;
  /** A real place was picked; address + coords are now known. */
  onSelect: (place: PlaceDetails) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
  /** Forwarded for keys we don't handle (e.g. the form's Enter-to-save). */
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  /** Optional leading icon, forwarded to the inner input. */
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const newToken = () => crypto.randomUUID();

export function PlacesAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  disabled,
  id,
  onKeyDown,
  icon,
  ...aria
}: PlacesAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // One session token spans the autocomplete keystrokes + the details lookup,
  // then is regenerated after a selection so each pick is billed as one session.
  const sessionToken = useRef(newToken());
  // Search only for text the user actually typed. Programmatic value changes —
  // the initial load with a saved place, the fill after a select, a team switch
  // — must not pop the dropdown open. We record the last typed string and bail
  // when the (debounced) value doesn't match it.
  const lastTyped = useRef<string | null>(null);
  // "Latest request wins" — ignore responses from superseded keystrokes.
  const reqId = useRef(0);

  const debounced = useDebounce(value, 250);

  useEffect(() => {
    if (debounced !== lastTyped.current) return;
    const q = debounced.trim();
    if (q.length < 3) {
      setResults([]);
      setLoading(false);
      setOpen(false);
      return;
    }
    const id = ++reqId.current;
    setLoading(true);
    searchPlaces(q, sessionToken.current).then(({ data }) => {
      if (id !== reqId.current) return;
      setResults(data);
      setActiveIndex(-1);
      setLoading(false);
      setOpen(data.length > 0);
    });
  }, [debounced]);

  const handleSelect = async (placeId: string) => {
    setOpen(false);
    const { data } = await getPlaceDetails(placeId, sessionToken.current);
    sessionToken.current = newToken();
    setResults([]);
    // Forget the typed query so the programmatic name fill below can't re-match
    // and re-open the dropdown.
    lastTyped.current = null;
    if (data) {
      onSelect(data);
    }
  };

  return (
    <div className="relative">
      <Input
        id={id}
        icon={icon}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-invalid={aria['aria-invalid'] || undefined}
        aria-describedby={aria['aria-describedby']}
        onChange={(e) => {
          lastTyped.current = e.target.value;
          onChange(e.target.value);
        }}
        onFocus={() => {
          if (results.length > 0) setOpen(true);
        }}
        onBlur={() => {
          // Delay so a click on a result registers before the list closes.
          window.setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && results.length > 0) {
            e.preventDefault();
            setOpen(true);
            setActiveIndex((i) => Math.min(i + 1, results.length - 1));
          } else if (e.key === 'ArrowUp' && results.length > 0) {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Enter' && open && activeIndex >= 0) {
            e.preventDefault();
            void handleSelect(results[activeIndex].placeId);
          } else if (e.key === 'Escape' && open) {
            e.preventDefault();
            setOpen(false);
          } else {
            onKeyDown?.(e);
          }
        }}
      />
      {loading && (
        <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-foreground-muted" />
      )}
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-surface shadow-md">
          <ul className="max-h-60 overflow-y-auto p-1">
            {results.map((r, i) => (
              <li key={r.placeId}>
                <button
                  type="button"
                  // Prevent the input's blur from firing before the click.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void handleSelect(r.placeId)}
                  className={cn(
                    'flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-accent',
                    i === activeIndex && 'bg-accent',
                  )}
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-foreground-muted" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-foreground">{r.primary}</span>
                    {r.secondary && (
                      <span className="block truncate text-foreground-muted">{r.secondary}</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

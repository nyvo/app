import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { MapPin } from '@/lib/input-icons';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
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
  /**
   * Places availability signal: true after a search/details lookup fails,
   * false once one succeeds again. Lets forms relax the pick-from-list
   * requirement while the service is down, so the "skriv inn adressen
   * manuelt" fallback is actually accepted.
   */
  onSearchError?: (failed: boolean) => void;
  /** Optional leading icon, forwarded to the inner input. */
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const newToken = () => crypto.randomUUID();

// Norwegian mobile networks put the edge function's cold start + TLS handshake
// at several hundred ms — paid once. Fire a sub-3-char no-op search on first
// focus so that cost lands before the user has typed anything searchable.
let warmedUp = false;

export function PlacesAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  disabled,
  id,
  onKeyDown,
  icon,
  onSearchError,
  ...aria
}: PlacesAutocompleteProps) {
  const shouldReduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  // Set when a search or details lookup fails (Places/edge outage) — surfaces
  // a fallback message instead of reading as "no results" or doing nothing.
  const [searchError, setSearchError] = useState(false);

  // Combobox wiring (WAI-ARIA combobox-with-listbox pattern): the listbox +
  // its options need stable, unique ids so the input's aria-activedescendant
  // can point at whichever option is currently active.
  const listboxId = useId();
  const getOptionId = (placeId: string) => `${listboxId}-option-${placeId}`;

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
  // Per-session response cache so backspacing/retyping re-renders instantly
  // instead of re-querying. Cleared with the session token after a selection.
  const cache = useRef(new Map<string, PlaceSuggestion[]>());
  // Ref so the search effect can report availability without re-firing when
  // the parent passes a new callback identity each render.
  const onSearchErrorRef = useRef(onSearchError);
  useEffect(() => {
    onSearchErrorRef.current = onSearchError;
  });

  const debounced = useDebounce(value, 150);

  useEffect(() => {
    if (debounced !== lastTyped.current) return;
    const q = debounced.trim();
    if (q.length < 3) {
      setResults([]);
      setLoading(false);
      setOpen(false);
      setSearchError(false);
      return;
    }
    const cached = cache.current.get(q);
    if (cached) {
      setResults(cached);
      setActiveIndex(cached.length > 0 ? 0 : -1);
      setLoading(false);
      setOpen(cached.length > 0);
      setSearchError(false);
      return;
    }
    const id = ++reqId.current;
    setLoading(true);
    searchPlaces(q, sessionToken.current).then(({ data, error }) => {
      if (id !== reqId.current) return;
      setLoading(false);
      if (error) {
        setResults([]);
        setActiveIndex(-1);
        setSearchError(true);
        setOpen(true);
        onSearchErrorRef.current?.(true);
        return;
      }
      cache.current.set(q, data);
      setResults(data);
      // Pre-highlight the top hit so a bare Enter picks it — the fastest path
      // to a resolved place, and one less way to end up with free text.
      setActiveIndex(data.length > 0 ? 0 : -1);
      setSearchError(false);
      setOpen(data.length > 0);
      onSearchErrorRef.current?.(false);
    });
  }, [debounced]);

  const handleSelect = async (placeId: string) => {
    setOpen(false);
    const { data, error } = await getPlaceDetails(placeId, sessionToken.current);
    sessionToken.current = newToken();
    cache.current.clear();
    setResults([]);
    // Forget the typed query so the programmatic name fill below can't re-match
    // and re-open the dropdown.
    lastTyped.current = null;
    if (data) {
      setSearchError(false);
      onSearchErrorRef.current?.(false);
      onSelect(data);
    } else if (error) {
      // Keep the typed text (we never call onChange here) and surface the
      // fallback message instead of silently doing nothing.
      setSearchError(true);
      setOpen(true);
      onSearchErrorRef.current?.(true);
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
        aria-controls={listboxId}
        aria-activedescendant={
          open && activeIndex >= 0 ? getOptionId(results[activeIndex].placeId) : undefined
        }
        aria-invalid={aria['aria-invalid'] || undefined}
        aria-describedby={aria['aria-describedby']}
        onChange={(e) => {
          lastTyped.current = e.target.value;
          onChange(e.target.value);
        }}
        onFocus={() => {
          if (!warmedUp) {
            warmedUp = true;
            void searchPlaces('', sessionToken.current);
          }
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
        <Spinner size="sm" className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
      )}
      {open && searchError && (
        <div
          role="status"
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-surface"
        >
          <p className="px-3 py-2 text-sm text-foreground-muted">
            Stedsøket er utilgjengelig. Skriv inn adressen manuelt.
          </p>
        </div>
      )}
      <AnimatePresence initial={false}>
        {open && !searchError && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={shouldReduceMotion
              ? { duration: 0 }
              : { duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
            className="absolute z-50 mt-1 w-full origin-top overflow-hidden rounded-lg border border-border bg-surface"
          >
            <ul id={listboxId} role="listbox" className="max-h-60 overflow-y-auto p-1">
              {results.map((r, i) => (
                <li key={r.placeId} role="presentation">
                  <button
                    type="button"
                    id={getOptionId(r.placeId)}
                    role="option"
                    aria-selected={i === activeIndex}
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

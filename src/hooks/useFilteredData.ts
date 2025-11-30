import { useMemo, useState, useCallback } from 'react';

type SortDirection = 'asc' | 'desc';

interface UseFilteredDataOptions<T, TFilter> {
  data: T[];
  searchFields?: (keyof T)[];
  filterFn?: (item: T, filters: TFilter) => boolean;
  sortFn?: (a: T, b: T, sortField: keyof T | null, direction: SortDirection) => number;
  initialFilters?: TFilter;
}

interface UseFilteredDataReturn<T, TFilter> {
  filteredData: T[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filters: TFilter;
  setFilters: React.Dispatch<React.SetStateAction<TFilter>>;
  updateFilter: <K extends keyof TFilter>(key: K, value: TFilter[K]) => void;
  sortField: keyof T | null;
  sortDirection: SortDirection;
  handleSort: (field: keyof T) => void;
  resetFilters: () => void;
}

export function useFilteredData<T, TFilter extends Record<string, unknown> = Record<string, unknown>>({
  data,
  searchFields = [],
  filterFn,
  sortFn,
  initialFilters = {} as TFilter,
}: UseFilteredDataOptions<T, TFilter>): UseFilteredDataReturn<T, TFilter> {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<TFilter>(initialFilters);
  const [sortField, setSortField] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = useCallback((field: keyof T) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  const updateFilter = useCallback(<K extends keyof TFilter>(key: K, value: TFilter[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setFilters(initialFilters);
    setSortField(null);
    setSortDirection('asc');
  }, [initialFilters]);

  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply search filter
    if (searchQuery.trim() && searchFields.length > 0) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(item =>
        searchFields.some(field => {
          const value = item[field];
          if (typeof value === 'string') {
            return value.toLowerCase().includes(query);
          }
          if (typeof value === 'object' && value !== null) {
            // Handle nested objects like participant.name
            return Object.values(value).some(
              v => typeof v === 'string' && v.toLowerCase().includes(query)
            );
          }
          return false;
        })
      );
    }

    // Apply custom filters
    if (filterFn) {
      result = result.filter(item => filterFn(item, filters));
    }

    // Apply sorting
    if (sortField && sortFn) {
      result.sort((a, b) => sortFn(a, b, sortField, sortDirection));
    }

    return result;
  }, [data, searchQuery, searchFields, filters, filterFn, sortField, sortDirection, sortFn]);

  return {
    filteredData,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    updateFilter,
    sortField,
    sortDirection,
    handleSort,
    resetFilters,
  };
}

import { useMemo, useState } from 'react';

type SearchableValue = string | number | null | undefined | Record<string, unknown>;

interface UseSearchOptions<T> {
  data: T[];
  searchFields: (keyof T | string)[];
  caseSensitive?: boolean;
}

/**
 * A simple search hook for filtering data based on search query
 * Supports nested fields using dot notation (e.g., 'participant.name')
 */
export function useSearch<T>({
  data,
  searchFields,
  caseSensitive = false,
}: UseSearchOptions<T>) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return data;
    }

    const query = caseSensitive ? searchQuery.trim() : searchQuery.toLowerCase().trim();

    return data.filter(item => {
      return searchFields.some(field => {
        const value = getNestedValue(item, field as string);
        if (value == null) return false;

        const stringValue = String(value);
        const compareValue = caseSensitive ? stringValue : stringValue.toLowerCase();
        return compareValue.includes(query);
      });
    });
  }, [data, searchQuery, searchFields, caseSensitive]);

  return {
    searchQuery,
    setSearchQuery,
    filteredData,
    hasResults: filteredData.length > 0,
    resultCount: filteredData.length,
  };
}

/**
 * Get a nested value from an object using dot notation
 * e.g., getNestedValue({ participant: { name: 'John' } }, 'participant.name') => 'John'
 */
function getNestedValue(obj: unknown, path: string): SearchableValue {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current == null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current as SearchableValue;
}

import { useEffect, useState } from 'react'

/**
 * Returns `value` after it has stopped changing for `delayMs`. Standard
 * trailing-edge debounce — useful for throttling search-as-you-type requests.
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])

  return debounced
}

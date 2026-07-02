import { useEffect } from 'react'

/**
 * Sets `document.title` to `"<title> – Openspot"` (or bare `"Openspot"` when
 * no title is given) and restores the previous title on unmount. Dependency-free
 * — no react-helmet. Applied to the public pages only; a null/undefined title
 * (e.g. while data loads) keeps the default so the tab never flashes an empty
 * segment.
 */
export function useDocumentTitle(title?: string | null): void {
  useEffect(() => {
    const previous = document.title
    document.title = title ? `${title} – Openspot` : 'Openspot'
    return () => {
      document.title = previous
    }
  }, [title])
}

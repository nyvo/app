import { useEffect } from 'react'

/** Canonical host for public URLs — must match index.html's static canonical. */
export const CANONICAL_ORIGIN = 'https://www.upnext.no'

/**
 * Points the page's `<link rel="canonical">` at the given path and restores
 * the previous href on unmount. Without this, index.html's static canonical
 * (the homepage) applies to every route — so each storefront/course page
 * tells crawlers the homepage is its canonical version. Dependency-free,
 * same pattern as useDocumentTitle. A null path (data still loading) keeps
 * the current canonical untouched.
 */
export function useCanonical(path: string | null): void {
  useEffect(() => {
    if (!path) return
    const link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!link) return
    const previous = link.getAttribute('href')
    link.setAttribute('href', `${CANONICAL_ORIGIN}${path}`)
    return () => {
      if (previous) link.setAttribute('href', previous)
    }
  }, [path])
}

/**
 * Injects a `<script type="application/ld+json">` into <head> and removes it
 * on unmount — critical in this SPA so a stale course's markup never lingers
 * into the next route. Keyed on the serialized payload, so the tag is only
 * rewritten when the data actually changes. Null data (loading/error states)
 * renders nothing. Googlebot reads client-injected JSON-LD on its render
 * pass; non-JS crawlers only ever see index.html's static block.
 */
export function useJsonLd(id: string, data: object | null): void {
  const json = data ? JSON.stringify(data) : null
  useEffect(() => {
    if (!json) return
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = id
    script.textContent = json
    document.head.appendChild(script)
    return () => {
      script.remove()
    }
  }, [id, json])
}

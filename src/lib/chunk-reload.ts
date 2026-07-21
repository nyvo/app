// Every deploy renames all content-hashed route chunks, and Vercel stops
// serving the old files — so a tab opened before the deploy 404s the first
// time it navigates to a not-yet-visited lazy route. Vite dispatches
// `vite:preloadError` for exactly this (both the chunk itself and its
// preloaded deps failing). The client isn't broken, it's stale: reload once
// to pick up the fresh index.html, and the navigation succeeds.
//
// The sessionStorage guard stops a genuinely broken deploy (chunks 404 even
// when fresh) from reload-looping — within the guard window the error
// propagates to the ErrorBoundary crash screen as before.

const STORAGE_KEY = 'chunk-reload-at'
const GUARD_WINDOW_MS = 30_000

/**
 * Install the reload-once-on-stale-chunk handler. Call once at app start.
 * `reload` is injectable for tests; returns an uninstaller (tests only —
 * the app installs it for the lifetime of the page).
 */
export function installChunkReloadHandler(
  reload: () => void = () => window.location.reload(),
): () => void {
  const onPreloadError = () => {
    let lastReloadAt = 0
    try {
      lastReloadAt = Number(sessionStorage.getItem(STORAGE_KEY)) || 0
    } catch {
      // sessionStorage unavailable — proceed as if never reloaded.
    }
    if (Date.now() - lastReloadAt < GUARD_WINDOW_MS) return
    try {
      sessionStorage.setItem(STORAGE_KEY, String(Date.now()))
    } catch {
      // Can't record the guard; a loop would need a broken deploy AND broken
      // storage at once. Still reload — staleness is the overwhelmingly
      // likely cause.
    }
    reload()
  }
  window.addEventListener('vite:preloadError', onPreloadError)
  return () => window.removeEventListener('vite:preloadError', onPreloadError)
}

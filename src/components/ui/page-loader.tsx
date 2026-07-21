import { Spinner } from './spinner'

/**
 * Route-level loading fallback (Suspense chunks, auth init, role resolution).
 * At these points the destination layout is unknown, so a content-shaped
 * skeleton is guaranteed to mismatch what mounts next — grey blocks that
 * rearrange instead of fill in. A single centered spinner promises nothing,
 * and because every route-level phase renders the same one, sequential
 * fallbacks (chunk → auth → role) read as one continuous wait instead of
 * swapping layouts. Always wrap in <DelayedFallback> so fast loads show
 * nothing at all; in-page data loading keeps its content-shaped skeletons
 * (CLAUDE.md § Loading skeletons track layout).
 */
export function PageLoader() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center">
      {/* Spinner carries role="status" + aria-label="Laster" itself. */}
      <Spinner size="lg" className="text-foreground-muted" />
    </div>
  )
}

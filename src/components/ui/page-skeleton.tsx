import { Skeleton } from './skeleton'

/**
 * Generic page-shaped skeleton used as the Suspense fallback while a lazy
 * route chunk loads. Studio § 13.5 — match the page layout. Since the
 * destination route isn't known at Suspense time, this is the most neutral
 * shape we can render: centered max-w-6xl shell, heading row, three content
 * blocks. It approximates both the teacher dashboard and the public surface
 * closely enough that the swap to real content doesn't feel like a jump.
 */
export function PageSkeleton() {
  return (
    <div
      className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 space-y-8"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Laster…</span>
      <div className="space-y-3">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  )
}

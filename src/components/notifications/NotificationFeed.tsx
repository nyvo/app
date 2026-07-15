import { useEffect, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import { NotificationRow } from './NotificationRow'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorState } from '@/components/ui/error-state'
import { DelayedFallback } from '@/components/ui/delayed-fallback'
import type { Notification } from '@/types/database'

interface NotificationFeedProps {
  notifications: Notification[]
  isLoading: boolean
  /** Fetch error message — only rendered when there's nothing to fall back
   *  on; a failed background refetch keeps showing the last-known list. */
  error: string | null
  onRetry: () => void
  /** Panel-open timestamp; rows seen before it render dimmed. */
  openedAt: string | null
  onActivate: (id: number) => void
  onArchive: (notification: Notification) => void
}

/**
 * Scrolling feed inside the popover. One flat, label-free list: unresolved
 * action_required items sort to the top, then everything else in chronological
 * order. The panel is all-neutral — position (top of the list) carries the
 * priority, so no "Krever handling" header is needed.
 *
 * Time-based grouping ("I dag / I går / Tidligere") is intentionally
 * absent — each row carries its own relative timestamp, so a time
 * grouping label would just repeat that information at lower precision.
 */
export function NotificationFeed({
  notifications,
  isLoading,
  error,
  onRetry,
  openedAt,
  onActivate,
  onArchive,
}: NotificationFeedProps) {
  // Ids present the first time the feed has data — those rows render
  // instantly (no entrance) when the panel opens. Anything added afterwards
  // (realtime) is new and gets NotificationRow's fade-in.
  const seenIdsRef = useRef<Set<number>>(new Set())
  const hasCapturedInitialRef = useRef(false)

  useEffect(() => {
    if (!hasCapturedInitialRef.current) {
      if (isLoading) return
      seenIdsRef.current = new Set(notifications.map((n) => n.id))
      hasCapturedInitialRef.current = true
      return
    }
    notifications.forEach((n) => seenIdsRef.current.add(n.id))
  }, [isLoading, notifications])

  if (isLoading) {
    return (
      <DelayedFallback>
        <div role="status" aria-live="polite">
          <span className="sr-only">Laster…</span>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[32px_1fr_auto] items-start gap-3 px-4 py-2.5 border-t border-border-subtle first:border-t-0"
              aria-hidden="true"
            >
              <Skeleton className="size-8 rounded-full" />
              <div className="min-w-0 space-y-1.5">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3.5 w-56 max-w-full" />
              </div>
              <Skeleton className="h-3 w-10" />
            </div>
          ))}
        </div>
      </DelayedFallback>
    )
  }

  // Error with nothing to fall back on — a background refetch failure with
  // an existing list keeps showing that list instead of masking it here.
  if (error && notifications.length === 0) {
    return (
      <ErrorState
        variant="inline"
        title="Kunne ikke laste varsler"
        message="Prøv igjen om litt."
        onRetry={onRetry}
      />
    )
  }

  if (notifications.length === 0) {
    return (
      <EmptyState variant="compact" title="Ingen nye varsler" />
    )
  }

  // Unresolved action-required items first, then chronological. Stable sort
  // preserves the incoming created_at-desc order within each group.
  const isUnresolvedAction = (n: Notification) =>
    n.action_required && n.resolved_at === null
  const ordered = [...notifications].sort(
    (a, b) => Number(isUnresolvedAction(b)) - Number(isUnresolvedAction(a)),
  )

  return (
    <div className="overflow-y-auto pb-[env(safe-area-inset-bottom)]">
      <AnimatePresence initial={false}>
        {ordered.map((n) => (
          <NotificationRow
            key={n.id}
            notification={n}
            openedAt={openedAt}
            onActivate={onActivate}
            onArchive={onArchive}
            isNew={hasCapturedInitialRef.current && !seenIdsRef.current.has(n.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

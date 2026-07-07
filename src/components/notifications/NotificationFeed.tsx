import { AnimatePresence } from 'framer-motion'
import { NotificationRow } from './NotificationRow'
import { Skeleton } from '@/components/ui/skeleton'
import type { Notification } from '@/types/database'

interface NotificationFeedProps {
  notifications: Notification[]
  isLoading: boolean
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
  openedAt,
  onActivate,
  onArchive,
}: NotificationFeedProps) {
  if (isLoading) {
    return (
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
    )
  }

  if (notifications.length === 0) {
    return <EmptyState />
  }

  // Unresolved action-required items first, then chronological. Stable sort
  // preserves the incoming created_at-desc order within each group.
  const isUnresolvedAction = (n: Notification) =>
    n.action_required && n.resolved_at === null
  const ordered = [...notifications].sort(
    (a, b) => Number(isUnresolvedAction(b)) - Number(isUnresolvedAction(a)),
  )

  return (
    <div className="overflow-y-auto">
      <AnimatePresence initial={false}>
        {ordered.map((n) => (
          <NotificationRow
            key={n.id}
            notification={n}
            openedAt={openedAt}
            onActivate={onActivate}
            onArchive={onArchive}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <p className="text-sm text-foreground">Ingen varsler</p>
    </div>
  )
}

import { NotificationRow } from './NotificationRow'
import { Skeleton } from '@/components/ui/skeleton'
import type { Notification } from '@/types/database'

interface NotificationFeedProps {
  notifications: Notification[]
  isLoading: boolean
  onActivate: (id: number) => void
}

/**
 * Scrolling feed inside the popover. Splits into two parallel sections:
 *
 *   Krever handling — unresolved action_required items, pinned to top.
 *   Aktivitet      — everything else, chronological.
 *
 * Group labels appear only when their section has content — an empty
 * "Krever handling" or empty "Aktivitet" would be visual noise.
 *
 * Time-based grouping ("I dag / I går / Tidligere") is intentionally
 * absent — each row carries its own relative timestamp, so a time
 * grouping label would just repeat that information at lower precision.
 */
export function NotificationFeed({
  notifications,
  isLoading,
  onActivate,
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

  const actionRequired = notifications.filter(
    (n) => n.action_required && n.resolved_at === null,
  )
  const activity = notifications.filter(
    (n) => !(n.action_required && n.resolved_at === null),
  )

  return (
    <div className="overflow-y-auto">
      {actionRequired.length > 0 && (
        <Section label="Krever handling">
          {actionRequired.map((n) => (
            <NotificationRow key={n.id} notification={n} onActivate={onActivate} />
          ))}
        </Section>
      )}

      {activity.length > 0 && (
        <Section label="Aktivitet">
          {activity.map((n) => (
            <NotificationRow key={n.id} notification={n} onActivate={onActivate} />
          ))}
        </Section>
      )}
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-4 pt-3 pb-1 text-[11px] font-medium text-foreground-muted">
        {label}
      </div>
      {children}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <p className="text-sm text-foreground">Ingen nye varsler</p>
    </div>
  )
}

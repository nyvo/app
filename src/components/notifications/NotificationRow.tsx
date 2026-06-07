import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { X } from '@/lib/icons'
import { formatRelativeTime } from '@/lib/format-relative-time'
import {
  getNotificationIcon,
  getNotificationStatus,
  type NotificationStatus,
} from './notification-icons'
import type { Notification } from '@/types/database'

// Plate tint per status. `neutral` (and any read/resolved row) falls back to
// the plain muted plate below.
const STATUS_PLATE: Record<Exclude<NotificationStatus, 'neutral'>, string> = {
  success: 'bg-success-subtle text-success',
  warning: 'bg-warning-subtle text-warning',
  danger: 'bg-danger-subtle text-danger',
}

interface NotificationRowProps {
  notification: Notification
  onActivate: (id: number) => void
  onArchive: (notification: Notification) => void
}

/**
 * One row in the notifications feed.
 *
 * Anatomy: 32px status-tinted icon plate · title (foreground) · sub (muted) ·
 * relative time (muted, tabular-nums). Single typographic weight per row
 * — hierarchy is carried by color, never by font weight.
 *
 * Read state dims title/icon to muted and sub to disabled, and drains the
 * plate tint back to neutral grey. No left-edge dot — dimming alone
 * communicates the state. Click activates: navigate to action_url and mark
 * read (handled by parent through onActivate).
 *
 * A dismiss (✕) button soft-archives the row — removes it from the feed while
 * retaining it in the DB (not a delete; the 2025/26 inbox standard), with a
 * 6s undo toast. It sits over the timestamp, which fades out on reveal. On
 * pointer devices it reveals on hover/focus; on touch (no hover) it stays
 * visible, since there's no hover to trigger it. Two sibling buttons inside a
 * `group` wrapper rather than one button (a button cannot nest a button).
 */
export function NotificationRow({
  notification,
  onActivate,
  onArchive,
}: NotificationRowProps) {
  const navigate = useNavigate()
  const Icon = getNotificationIcon(notification.type)
  const status = getNotificationStatus(notification.type)
  const isRead = notification.read_at !== null
  const isResolvedAction =
    notification.action_required && notification.resolved_at !== null
  const dimmed = isRead || isResolvedAction

  const handleClick = () => {
    onActivate(notification.id)
    if (notification.action_url) navigate(notification.action_url)
  }

  return (
    <div className="group relative border-t border-border-subtle first:border-t-0">
      <button
        type="button"
        onClick={handleClick}
        className="grid w-full grid-cols-[32px_1fr_auto] items-start gap-3 px-4 py-2.5 text-left transition-colors duration-150 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
      >
        <div
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full',
            dimmed
              ? 'bg-muted text-foreground-muted'
              : status === 'neutral'
                ? 'bg-muted text-foreground'
                : STATUS_PLATE[status],
          )}
          aria-hidden="true"
        >
          <Icon className="size-4" />
        </div>

        <div className="min-w-0">
          <div
            className={cn(
              'text-sm leading-5',
              dimmed ? 'text-foreground-muted' : 'text-foreground',
            )}
          >
            {notification.title}
          </div>
          {notification.body && (
            <div
              className={cn(
                'text-sm leading-5',
                dimmed ? 'text-foreground-disabled' : 'text-foreground-muted',
              )}
            >
              {notification.body}
            </div>
          )}
        </div>

        <div
          className={cn(
            'shrink-0 whitespace-nowrap text-xs tabular-nums transition-opacity duration-150 group-hover:opacity-0 group-focus-within:opacity-0 [@media(hover:none)]:opacity-0',
            dimmed ? 'text-foreground-disabled' : 'text-foreground-muted',
          )}
        >
          {formatRelativeTime(notification.created_at)}
        </div>
      </button>

      <button
        type="button"
        onClick={() => onArchive(notification)}
        aria-label="Fjern varsel"
        className="absolute right-2 top-2 inline-flex size-6 items-center justify-center rounded-full text-foreground-muted opacity-0 transition-opacity duration-150 hover:bg-foreground/10 hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none group-hover:opacity-100 [@media(hover:none)]:opacity-100"
      >
        <X className="size-3.5" />
      </button>
    </div>
  )
}

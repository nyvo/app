import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/format-relative-time'
import { getNotificationIcon } from './notification-icons'
import type { Notification } from '@/types/database'

interface NotificationRowProps {
  notification: Notification
  onActivate: (id: number) => void
}

/**
 * One row in the notifications feed.
 *
 * Anatomy: 32px neutral icon plate · title (foreground) · sub (muted) ·
 * relative time (muted, tabular-nums). Single typographic weight per row
 * — hierarchy is carried by color, never by font weight.
 *
 * Read state dims title/icon to muted and sub to disabled. No left-edge
 * dot — dimming alone communicates the state. Click activates: navigate
 * to action_url and mark read (handled by parent through onActivate).
 */
export function NotificationRow({ notification, onActivate }: NotificationRowProps) {
  const navigate = useNavigate()
  const Icon = getNotificationIcon(notification.type)
  const isRead = notification.read_at !== null
  const isResolvedAction =
    notification.action_required && notification.resolved_at !== null

  const handleClick = () => {
    onActivate(notification.id)
    if (notification.action_url) navigate(notification.action_url)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'grid w-full grid-cols-[32px_1fr_auto] items-start gap-3 px-4 py-2.5 text-left transition-colors duration-150 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none',
        'border-t border-border-subtle first:border-t-0',
      )}
    >
      <div
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full bg-muted',
          isRead || isResolvedAction
            ? 'text-foreground-muted'
            : 'text-foreground',
        )}
        aria-hidden="true"
      >
        <Icon className="size-4" />
      </div>

      <div className="min-w-0">
        <div
          className={cn(
            'text-sm leading-5',
            isRead || isResolvedAction
              ? 'text-foreground-muted'
              : 'text-foreground',
          )}
        >
          {notification.title}
        </div>
        {notification.body && (
          <div
            className={cn(
              'text-sm leading-5',
              isRead || isResolvedAction
                ? 'text-foreground-disabled'
                : 'text-foreground-muted',
            )}
          >
            {notification.body}
          </div>
        )}
      </div>

      <div
        className={cn(
          'shrink-0 whitespace-nowrap text-xs tabular-nums',
          isRead || isResolvedAction
            ? 'text-foreground-disabled'
            : 'text-foreground-muted',
        )}
      >
        {formatRelativeTime(notification.created_at)}
      </div>
    </button>
  )
}

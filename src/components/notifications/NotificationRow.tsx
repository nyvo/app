import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { X } from '@/lib/icons'
import { formatRelativeTime } from '@/lib/format-relative-time'
import { EASE_OUT } from '@/lib/motion'
import { formatNotificationBody } from './format-body'
import { getNotificationIcon } from './notification-icons'
import type { Notification } from '@/types/database'

interface NotificationRowProps {
  notification: Notification
  /** Panel-open timestamp; a row seen before it counts as already-seen. */
  openedAt: string | null
  onActivate: (id: number) => void
  onArchive: (notification: Notification) => void
  /**
   * True only for rows that arrived after the feed's initial mount (e.g. a
   * realtime push while the panel is open) — gates the entrance animation so
   * opening the panel doesn't animate the whole existing list.
   */
  isNew?: boolean
}

/**
 * One row in the notifications feed.
 *
 * Anatomy: 32px rounded-square glyph plate, then title / sub / relative time
 * (tabular-nums). The panel is all-neutral — no per-status hue. Hierarchy is
 * carried by weight + color in three tiers (2026-07 audit decision): the dark
 * plate (foreground fill, light glyph) is reserved for unresolved
 * action_required rows so a stack of routine signups can't become a wall of
 * black squares; fresh informational rows use a muted plate but keep the
 * font-medium foreground title (title weight alone carries "unread"); dimmed
 * rows drop title, body and timestamp to muted text (never disabled —
 * everything stays readable).
 *
 * A row dims once it's been read, its action resolved, or it was seen in a
 * previous session (seen_at predates `openedAt`) — so already-seen items render
 * greyed on the next open, while items that arrived since last open stay
 * full-contrast this session. No left-edge dot — dimming alone communicates
 * the state. Click activates: navigate to action_url and mark read (handled by
 * parent through onActivate).
 *
 * A dismiss (✕) button soft-archives the row — removes it from the feed while
 * retaining it in the DB (not a delete; the 2025/26 inbox standard), with a
 * 6s undo toast. It sits over the timestamp, which fades out on reveal. On
 * pointer devices it reveals on hover/focus; on touch (no hover) it stays
 * visible, since there's no hover to trigger it. Two sibling buttons inside a
 * `group` wrapper rather than one button (a button cannot nest a button).
 *
 * On archive the row animates out (translate-x + fade + height collapse,
 * ~200ms ease-out via AnimatePresence in the feed) so the rows below glide up
 * rather than jump. Reduced-motion drops the movement to a plain fade.
 *
 * Rows present when the feed first mounts render instantly — no entrance.
 * Only rows that arrive later (realtime, `isNew`) fade in, so opening the
 * panel never animates the whole list.
 */
export function NotificationRow({
  notification,
  openedAt,
  onActivate,
  onArchive,
  isNew,
}: NotificationRowProps) {
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion()
  // Freeze at mount — `isNew` is only meaningful for the render that first
  // introduces this row; a later re-render (e.g. a sibling arriving) must not
  // flip this row's entrance mid-flight.
  const [enteredAsNew] = useState(!!isNew)
  const Icon = getNotificationIcon(notification.type)
  const isRead = notification.read_at !== null
  const isResolvedAction =
    notification.action_required && notification.resolved_at !== null
  // Seen in a *previous* session — seen_at predates this panel open. Items seen
  // during this session (seen_at stamped on open) stay fresh until the next open.
  const seenBeforeOpen =
    notification.seen_at !== null &&
    openedAt !== null &&
    notification.seen_at < openedAt
  const dimmed = isRead || isResolvedAction || seenBeforeOpen

  const handleClick = () => {
    onActivate(notification.id)
    if (notification.action_url) navigate(notification.action_url)
  }

  // Strong ease-out (Emil's UI curve); exit only — remaining rows glide up as
  // the collapsing height pulls them into place.
  const exit = shouldReduceMotion
    ? { opacity: 0, transition: { duration: 0.15, ease: EASE_OUT } }
    : {
        opacity: 0,
        x: 12,
        height: 0,
        transition: { duration: 0.2, ease: EASE_OUT },
      }

  // Opacity-only entrance for realtime-arrived rows (see `enteredAsNew`).
  const enter = enteredAsNew
    ? {
        opacity: 1,
        transition: {
          duration: 0.15,
          ease: EASE_OUT,
        },
      }
    : undefined

  return (
    <motion.div
      layout
      initial={enteredAsNew ? { opacity: 0 } : undefined}
      animate={enter}
      exit={exit}
      className="group relative overflow-hidden border-t border-border-subtle first:border-t-0"
    >
      <button
        type="button"
        onClick={handleClick}
        className="grid w-full grid-cols-[32px_1fr_auto] items-start gap-3 px-4 py-2.5 text-left transition-colors duration-150 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
      >
        <div
          className={cn(
            'motion-color flex size-8 shrink-0 items-center justify-center rounded-lg',
            !dimmed && notification.action_required
              ? 'bg-foreground text-background'
              : 'bg-muted text-foreground-muted',
          )}
          aria-hidden="true"
        >
          <Icon className="size-4" />
        </div>

        <div className="min-w-0">
          <div
            className={cn(
              'text-sm font-medium leading-5',
              dimmed ? 'text-foreground-muted' : 'text-foreground',
            )}
          >
            {notification.title}
          </div>
          {notification.body && (
            <div className="text-sm leading-5 text-foreground-muted">
              {formatNotificationBody(notification.body)}
            </div>
          )}
        </div>

        <div className="shrink-0 whitespace-nowrap text-xs tabular-nums text-foreground-muted transition-opacity duration-150 group-hover:opacity-0 group-focus-within:opacity-0 [@media(hover:none)]:opacity-0">
          {formatRelativeTime(notification.created_at)}
        </div>
      </button>

      <button
        type="button"
        onClick={() => onArchive(notification)}
        aria-label="Fjern varsel"
        // after:-inset-2.5 lifts the 24px visual button to a ~44px touch target
        className="absolute right-2 top-2 inline-flex size-6 items-center justify-center rounded-full text-foreground-muted opacity-0 transition-opacity duration-150 after:absolute after:-inset-2.5 hover:bg-pressed hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none group-hover:opacity-100 [@media(hover:none)]:opacity-100"
      >
        <X className="size-3.5" />
      </button>
    </motion.div>
  )
}

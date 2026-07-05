import { useEffect, useRef, useState } from 'react'
import type { Notification } from '@/types/database'

interface NotificationLiveRegionProps {
  notifications: Notification[]
  /**
   * When false (panel is open), suppress announcements — the screen reader
   * user is actively reading the feed and re-announcing duplicates is noise.
   */
  enabled: boolean
}

/**
 * Polite ARIA live region for newly-arrived notifications.
 *
 * Each new INSERT through realtime causes the corresponding row to be
 * prepended to the feed. We watch the highest-id seen so far; when it
 * changes upward, the newcomer's title (+ optional body) is announced
 * to assistive tech.
 *
 * Why `polite` (and never `assertive`): the announcement is informative,
 * not an emergency. Per the WAI-ARIA practices and Sara Soueidan's
 * guidance on accessible notifications, assertive interrupts other
 * announcements and is reserved for things like form errors and outages.
 */
export function NotificationLiveRegion({
  notifications,
  enabled,
}: NotificationLiveRegionProps) {
  const seenMaxIdRef = useRef<number | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (notifications.length === 0) {
      seenMaxIdRef.current = null
      return
    }

    const maxId = Math.max(...notifications.map((n) => n.id))

    // First render — seed the high-water mark without announcing.
    if (seenMaxIdRef.current === null) {
      seenMaxIdRef.current = maxId
      return
    }

    if (maxId > seenMaxIdRef.current) {
      if (enabled) {
        const newest = notifications.find((n) => n.id === maxId)
        if (newest) {
          // Compose: "Nytt varsel: <title>. <body>"
          const announcement = newest.body
            ? `Nytt varsel: ${newest.title}. ${newest.body}`
            : `Nytt varsel: ${newest.title}`
          // Reset before assigning so identical consecutive messages still
          // re-trigger announcement on some readers.
          setMessage('')
          // Microtask so the empty value commits first.
          queueMicrotask(() => setMessage(announcement))
        }
      }
      seenMaxIdRef.current = maxId
    }
  }, [notifications, enabled])

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  )
}

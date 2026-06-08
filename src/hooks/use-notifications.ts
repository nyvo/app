import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription'
import { logger } from '@/lib/logger'
import { runWithUndo } from '@/lib/undo'
import type { Notification } from '@/types/database'

const PAGE_SIZE = 30

interface UseNotificationsReturn {
  notifications: Notification[]
  isLoading: boolean
  error: string | null

  unseenCount: number
  unreadCount: number

  markSeenAll: () => Promise<void>
  markRead: (id: number) => Promise<void>
  markAllRead: () => Promise<void>
  markResolved: (id: number) => Promise<void>
  archive: (notification: Notification) => void
  refetch: () => Promise<void>
}

/**
 * In-app notifications feed for the dashboard bell.
 *
 * Fetches the most recent PAGE_SIZE rows for the current user, subscribes
 * to inserts/updates via Supabase realtime, and exposes the mutations the
 * popover needs.
 *
 * Bell precedence: action (unresolved action-required) > unread (any unseen
 * dot) > idle. Implemented as a single function so the bell button and any
 * other surface use the same rule.
 */
export function useNotifications(): UseNotificationsReturn {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInitial = useCallback(async () => {
    if (!userId) {
      setNotifications([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)

    if (fetchError) {
      logger.error('[notifications] initial fetch failed', fetchError)
      setError(fetchError.message)
      setIsLoading(false)
      return
    }

    setNotifications((data ?? []) as Notification[])
    setIsLoading(false)
  }, [userId])

  useEffect(() => {
    void fetchInitial()
  }, [fetchInitial])

  // Realtime — INSERT prepends, UPDATE patches in place. The Supabase
  // postgres_changes filter on recipient_id is enforced server-side (RLS
  // also gates it), so we only receive rows for the current user.
  useRealtimeSubscription<Notification>(
    {
      table: 'notifications',
      event: '*',
      filter: userId ? `recipient_id=eq.${userId}` : undefined,
    },
    (payload) => {
      if (payload.eventType === 'INSERT' && payload.new) {
        const next = payload.new as Notification
        setNotifications((prev) => {
          if (prev.some((n) => n.id === next.id)) return prev
          return [next, ...prev].slice(0, PAGE_SIZE)
        })
      } else if (payload.eventType === 'UPDATE' && payload.new) {
        const updated = payload.new as Notification
        setNotifications((prev) => {
          // Archived (e.g. dismissed on another device) → drop from the feed.
          if (updated.archived_at !== null) {
            return prev.filter((n) => n.id !== updated.id)
          }
          return prev.map((n) => (n.id === updated.id ? updated : n))
        })
      } else if (payload.eventType === 'DELETE' && payload.old) {
        const deleted = payload.old as Partial<Notification>
        if (deleted.id == null) return
        setNotifications((prev) => prev.filter((n) => n.id !== deleted.id))
      }
    },
    !!userId,
  )

  // ---------- Derived counts ----------

  const unseenCount = useMemo(
    () => notifications.filter((n) => n.seen_at === null).length,
    [notifications],
  )
  const unreadCount = useMemo(
    () => notifications.filter((n) => n.read_at === null).length,
    [notifications],
  )

  // ---------- Mutations ----------
  //
  // All mutations optimistically patch local state, then write to the DB.
  // The realtime UPDATE echo will re-patch the same row (idempotent — the
  // optimistic + echoed state is identical).

  const markSeenAll = useCallback(async () => {
    if (!userId) return
    if (unseenCount === 0) return

    const now = new Date().toISOString()
    setNotifications((prev) =>
      prev.map((n) => (n.seen_at === null ? { ...n, seen_at: now } : n)),
    )

    const { error: updateError } = await supabase
      .from('notifications')
      .update({ seen_at: now })
      .eq('recipient_id', userId)
      .is('seen_at', null)

    if (updateError) {
      logger.error('[notifications] markSeenAll failed', updateError)
    }
  }, [userId, unseenCount])

  const markRead = useCallback(
    async (id: number) => {
      if (!userId) return
      const target = notifications.find((n) => n.id === id)
      if (!target || target.read_at !== null) return

      const now = new Date().toISOString()
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: now } : n)),
      )

      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('id', id)
        .eq('recipient_id', userId)

      if (updateError) {
        logger.error('[notifications] markRead failed', updateError)
      }
    },
    [userId, notifications],
  )

  const markAllRead = useCallback(async () => {
    if (!userId) return
    if (unreadCount === 0) return

    const now = new Date().toISOString()
    setNotifications((prev) =>
      prev.map((n) => (n.read_at === null ? { ...n, read_at: now } : n)),
    )

    const { error: updateError } = await supabase
      .from('notifications')
      .update({ read_at: now })
      .eq('recipient_id', userId)
      .is('read_at', null)

    if (updateError) {
      logger.error('[notifications] markAllRead failed', updateError)
    }
  }, [userId, unreadCount])

  const markResolved = useCallback(
    async (id: number) => {
      if (!userId) return
      const target = notifications.find((n) => n.id === id)
      if (!target || !target.action_required || target.resolved_at !== null) return

      const now = new Date().toISOString()
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, resolved_at: now } : n)),
      )

      const { error: updateError } = await supabase
        .from('notifications')
        .update({ resolved_at: now })
        .eq('id', id)
        .eq('recipient_id', userId)

      if (updateError) {
        logger.error('[notifications] markResolved failed', updateError)
      }
    },
    [userId, notifications],
  )

  // Per-item dismiss with a 6s undo window (Gmail delay-commit via runWithUndo).
  // The row hides instantly; the archive only commits to the DB when the toast
  // expires, so "Angre" cancels it before any write. Soft archive — when it
  // does commit, the row is hidden from the feed but retained for history/audit
  // (not a delete). Restore re-inserts in created_at-desc order.
  const archive = useCallback(
    (notification: Notification) => {
      if (!userId) return

      runWithUndo({
        message: 'Varsel fjernet',
        hide: () =>
          setNotifications((prev) =>
            prev.filter((n) => n.id !== notification.id),
          ),
        restore: () =>
          setNotifications((prev) => {
            if (prev.some((n) => n.id === notification.id)) return prev
            return [...prev, notification]
              .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
              .slice(0, PAGE_SIZE)
          }),
        commit: async () =>
          await supabase
            .from('notifications')
            .update({ archived_at: new Date().toISOString() })
            .eq('id', notification.id)
            .eq('recipient_id', userId),
        errorOf: (result) => result.error,
      })
    },
    [userId],
  )

  return {
    notifications,
    isLoading,
    error,

    unseenCount,
    unreadCount,

    markSeenAll,
    markRead,
    markAllRead,
    markResolved,
    archive,
    refetch: fetchInitial,
  }
}

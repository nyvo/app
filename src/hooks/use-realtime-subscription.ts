import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

interface SubscriptionConfig {
  table: string
  schema?: string
  event?: PostgresChangeEvent
  filter?: string
}

/**
 * Hook for subscribing to Supabase real-time changes on a single table.
 *
 * @param config - Subscription configuration
 * @param callback - Function called when changes occur
 * @param enabled - Whether the subscription is active
 *
 * @example
 * // Subscribe to new signups for an organization
 * useRealtimeSubscription(
 *   { table: 'signups', filter: `organization_id=eq.${orgId}` },
 *   (payload) => { refetchSignups() },
 *   !!orgId
 * )
 */
export function useRealtimeSubscription<T extends Record<string, unknown>>(
  config: SubscriptionConfig,
  callback: (payload: RealtimePostgresChangesPayload<T>) => void,
  enabled: boolean = true
) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const callbackRef = useRef(callback)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryCountRef = useRef(0)

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    if (!enabled) {
      // Cleanup existing subscription if disabled
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
      retryCountRef.current = 0
      return
    }

    const { table, schema = 'public', event = '*', filter } = config
    const MAX_RETRIES = 5

    function subscribe() {
      // Clean up previous channel before creating a new one
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }

      const channelName = `${table}-${filter || 'all'}-${Date.now()}`

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subscriptionConfig: any = {
        event,
        schema,
        table,
      }

      if (filter) {
        subscriptionConfig.filter = filter
      }

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          subscriptionConfig,
          (payload: RealtimePostgresChangesPayload<T>) => {
            callbackRef.current(payload)
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            logger.debug(`[Realtime] Subscribed to ${table}${filter ? ` (${filter})` : ''}`)
            retryCountRef.current = 0
          } else if (status === 'CHANNEL_ERROR') {
            logger.error(`[Realtime] Error subscribing to ${table}`)
            if (retryCountRef.current < MAX_RETRIES) {
              const delay = Math.min(1000 * 2 ** retryCountRef.current, 30000)
              retryCountRef.current++
              logger.debug(`[Realtime] Retrying ${table} in ${delay}ms (attempt ${retryCountRef.current}/${MAX_RETRIES})`)
              retryTimeoutRef.current = setTimeout(subscribe, delay)
            } else {
              logger.error(`[Realtime] Max retries reached for ${table}, giving up`)
            }
          }
        })

      channelRef.current = channel
    }

    subscribe()

    // Cleanup on unmount or config change
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      retryCountRef.current = 0
    }
  }, [config.table, config.schema, config.event, config.filter, enabled])
}

/**
 * Hook for subscribing to multiple tables at once.
 * Useful for dashboard-style views that need to react to various data changes.
 *
 * @param configs - Array of subscription configurations
 * @param callback - Single callback for all changes
 * @param enabled - Whether subscriptions are active
 *
 * @example
 * // Subscribe to signups and courses for dashboard
 * useMultiTableSubscription(
 *   [
 *     { table: 'signups', filter: `organization_id=eq.${orgId}` },
 *     { table: 'courses', filter: `organization_id=eq.${orgId}` },
 *   ],
 *   () => { refetchDashboard() },
 *   !!orgId
 * )
 */
/**
 * Hook for subscribing to multiple tables at once.
 * Accepts an explicit `key` string to control when subscriptions are re-created,
 * avoiding the fragile JSON.stringify(configs) pattern.
 */
export function useMultiTableSubscription(
  configs: SubscriptionConfig[],
  callback: () => void,
  enabled: boolean = true,
  key?: string
) {
  const channelsRef = useRef<RealtimeChannel[]>([])
  const callbackRef = useRef(callback)

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    if (!enabled || configs.length === 0) {
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel)
      })
      channelsRef.current = []
      return
    }

    const channels = configs.map((config, index) => {
      const { table, schema = 'public', event = '*', filter } = config
      const channelName = `multi-${table}-${index}-${Date.now()}`

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subscriptionConfig: any = { event, schema, table }
      if (filter) subscriptionConfig.filter = filter

      return supabase
        .channel(channelName)
        .on('postgres_changes', subscriptionConfig, () => {
          callbackRef.current()
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            logger.debug(`[Realtime] Multi-sub: ${table}${filter ? ` (${filter})` : ''}`)
          }
        })
    })

    channelsRef.current = channels

    return () => {
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel)
      })
      channelsRef.current = []
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled])
}

/**
 * Hook specifically for dashboard real-time updates.
 * Subscribes to signups, courses, and messages for a given organization.
 *
 * @param organizationId - The organization to watch
 * @param onUpdate - Callback when any data changes
 *
 * @example
 * useDashboardSubscription(currentOrganization?.id, () => {
 *   refetchAll()
 * })
 */
export function useDashboardSubscription(
  organizationId: string | undefined,
  onUpdate: () => void
) {
  useMultiTableSubscription(
    [
      { table: 'signups', filter: `organization_id=eq.${organizationId}` },
      { table: 'courses', filter: `organization_id=eq.${organizationId}` },
      { table: 'conversations', filter: `organization_id=eq.${organizationId}` },
    ],
    onUpdate,
    !!organizationId,
    organizationId // primitive key instead of JSON.stringify
  )
}

/**
 * Hook for student signup real-time updates.
 * Subscribes to all signups for a specific user (by user_id or email).
 * Useful for updating student dashboard when their booking status changes.
 *
 * @param userId - The user ID to watch
 * @param onUpdate - Callback when any signup changes
 *
 * @example
 * useStudentSignupsSubscription(user?.id, () => {
 *   refetchSignups()
 * })
 */
export function useStudentSignupsSubscription(
  userId: string | undefined,
  onUpdate: () => void
) {
  useRealtimeSubscription(
    { table: 'signups', filter: `user_id=eq.${userId}` },
    onUpdate,
    !!userId
  )
}

/**
 * Hook for course participants real-time updates.
 * Useful for teachers viewing their course detail page.
 *
 * @param courseId - The course to watch
 * @param onUpdate - Callback when signups change
 */
export function useCourseParticipantsSubscription(
  courseId: string | undefined,
  onUpdate: () => void
) {
  // Single table - use useRealtimeSubscription directly instead of multi-table
  useRealtimeSubscription(
    { table: 'signups', filter: `course_id=eq.${courseId}` },
    onUpdate,
    !!courseId
  )
}

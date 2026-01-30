import { useEffect, useRef, useCallback } from 'react'
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
      return
    }

    const { table, schema = 'public', event = '*', filter } = config

    // Create unique channel name
    const channelName = `${table}-${filter || 'all'}-${Date.now()}`

    // Build the subscription config
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscriptionConfig: any = {
      event,
      schema,
      table,
    }

    if (filter) {
      subscriptionConfig.filter = filter
    }

    // Create channel and subscribe
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
        } else if (status === 'CHANNEL_ERROR') {
          logger.error(`[Realtime] Error subscribing to ${table}`)
        }
      })

    channelRef.current = channel

    // Cleanup on unmount or config change
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
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
export function useMultiTableSubscription(
  configs: SubscriptionConfig[],
  callback: () => void,
  enabled: boolean = true
) {
  const channelsRef = useRef<RealtimeChannel[]>([])
  const callbackRef = useRef(callback)

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Memoize configs to prevent unnecessary re-subscriptions
  const configsKey = JSON.stringify(configs)

  useEffect(() => {
    if (!enabled || configs.length === 0) {
      // Cleanup existing subscriptions if disabled
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel)
      })
      channelsRef.current = []
      return
    }

    // Create channels for each config
    const channels = configs.map((config, index) => {
      const { table, schema = 'public', event = '*', filter } = config
      const channelName = `multi-${table}-${index}-${Date.now()}`

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const subscriptionConfig: any = {
        event,
        schema,
        table,
      }

      if (filter) {
        subscriptionConfig.filter = filter
      }

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

    // Cleanup on unmount or config change
    return () => {
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel)
      })
      channelsRef.current = []
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configsKey, enabled])
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
  const stableCallback = useCallback(onUpdate, [onUpdate])

  useMultiTableSubscription(
    [
      { table: 'signups', filter: `organization_id=eq.${organizationId}` },
      { table: 'courses', filter: `organization_id=eq.${organizationId}` },
      { table: 'conversations', filter: `organization_id=eq.${organizationId}` },
    ],
    stableCallback,
    !!organizationId
  )
}

/**
 * Hook for waitlist position real-time updates.
 * Useful for students watching their waitlist position.
 *
 * @param courseId - The course to watch
 * @param onUpdate - Callback when waitlist changes
 *
 * @example
 * useWaitlistSubscription(courseId, () => {
 *   refetchWaitlistPosition()
 * })
 */
export function useWaitlistSubscription(
  courseId: string | undefined,
  onUpdate: () => void
) {
  const stableCallback = useCallback(onUpdate, [onUpdate])

  useRealtimeSubscription(
    { table: 'waitlist', filter: `course_id=eq.${courseId}` },
    stableCallback,
    !!courseId
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
  const stableCallback = useCallback(onUpdate, [onUpdate])

  // Subscribe to signups for this user
  useRealtimeSubscription(
    { table: 'signups', filter: `user_id=eq.${userId}` },
    stableCallback,
    !!userId
  )
}

/**
 * Hook for course participants real-time updates.
 * Useful for teachers viewing their course detail page.
 *
 * @param courseId - The course to watch
 * @param onUpdate - Callback when signups or waitlist changes
 */
export function useCourseParticipantsSubscription(
  courseId: string | undefined,
  onUpdate: () => void
) {
  const stableCallback = useCallback(onUpdate, [onUpdate])

  useMultiTableSubscription(
    [
      { table: 'signups', filter: `course_id=eq.${courseId}` },
      { table: 'waitlist', filter: `course_id=eq.${courseId}` },
    ],
    stableCallback,
    !!courseId
  )
}

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { RealtimePostgresChangesFilter } from '@supabase/realtime-js'

type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

// Monotonic suffix for channel names. `Date.now()` alone collides when an
// effect re-runs inside the same millisecond (StrictMode's double-invoke, an
// HMR remount): supabase.channel() then returns the still-registered previous
// channel — whose async removeChannel() hasn't completed — and calling .on()
// on an already-subscribed channel throws. A process-wide counter guarantees
// every channel name is unique, so a fresh channel is always created.
let channelSeq = 0
const nextChannelSeq = () => (channelSeq = (channelSeq + 1) % Number.MAX_SAFE_INTEGER)

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
 * // Subscribe to new signups for a seller
 * useRealtimeSubscription(
 *   { table: 'signups', filter: `seller_id=eq.${sellerId}` },
 *   (payload) => { refetchSignups() },
 *   !!sellerId
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

      const channelName = `${table}-${filter || 'all'}-${Date.now()}-${nextChannelSeq()}`

      const subscriptionConfig: RealtimePostgresChangesFilter<'*'> = {
        event: event as '*',
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
 *     { table: 'signups', filter: `seller_id=eq.${sellerId}` },
 *     { table: 'courses', filter: `seller_id=eq.${sellerId}` },
 *   ],
 *   () => { refetchDashboard() },
 *   !!sellerId
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
  const retryTimeoutsRef = useRef<Array<ReturnType<typeof setTimeout> | null>>([])
  const retryCountsRef = useRef<number[]>([])

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    function teardown() {
      channelsRef.current.forEach(channel => {
        if (channel) supabase.removeChannel(channel)
      })
      channelsRef.current = []
      retryTimeoutsRef.current.forEach(timeout => {
        if (timeout) clearTimeout(timeout)
      })
      retryTimeoutsRef.current = []
      retryCountsRef.current = []
    }

    if (!enabled || configs.length === 0) {
      teardown()
      return
    }

    const MAX_RETRIES = 5

    function subscribeAt(index: number) {
      const { table, schema = 'public', event = '*', filter } = configs[index]
      const channelName = `multi-${table}-${index}-${Date.now()}-${nextChannelSeq()}`

      const subscriptionConfig: RealtimePostgresChangesFilter<'*'> = {
        event: event as '*',
        schema,
        table,
      }
      if (filter) subscriptionConfig.filter = filter

      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', subscriptionConfig, () => {
          callbackRef.current()
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            logger.debug(`[Realtime] Multi-sub: ${table}${filter ? ` (${filter})` : ''}`)
            retryCountsRef.current[index] = 0
          } else if (status === 'CHANNEL_ERROR') {
            logger.error(`[Realtime] Multi-sub error: ${table}`)
            const retryCount = retryCountsRef.current[index] ?? 0
            if (retryCount < MAX_RETRIES) {
              const delay = Math.min(1000 * 2 ** retryCount, 30000)
              retryCountsRef.current[index] = retryCount + 1
              logger.debug(`[Realtime] Multi-sub: retrying ${table} in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`)
              retryTimeoutsRef.current[index] = setTimeout(() => {
                const stale = channelsRef.current[index]
                if (stale) supabase.removeChannel(stale)
                channelsRef.current[index] = subscribeAt(index)
              }, delay)
            } else {
              logger.error(`[Realtime] Multi-sub: max retries reached for ${table}, giving up`)
            }
          }
        })

      return channel
    }

    channelsRef.current = configs.map((_, index) => subscribeAt(index))

    return () => {
      teardown()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled])
}


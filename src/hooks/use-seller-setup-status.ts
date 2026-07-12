import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { routes } from '@/lib/routes'
import { logger } from '@/lib/logger'
import { useMultiTableSubscription } from '@/hooks/use-realtime-subscription'
import { useSetupProgress } from '@/hooks/use-setup-progress'

// One-stop hook for any surface that needs to know "is this seller done
// setting up?" — the sidebar onboarding card, the /get-started page, etc.
// Owns its own course-count fetch so callers don't have to thread state
// from the dashboard.
export function useSellerSetupStatus() {
  const { currentSeller, profile } = useAuth()
  const navigate = useNavigate()
  const [hasPublishedCourse, setHasPublishedCourse] = useState(false)
  const [hasPaidCourse, setHasPaidCourse] = useState(false)
  const [draftCourseId, setDraftCourseId] = useState<string | null>(null)
  // True until the first courses fetch resolves. Without this, the
  // hook derives state from `hasPublishedCourse=false` on the first paint —
  // even when the seller actually has a published course — so consumers flash
  // the incomplete checklist before the fetch flips them to "done". Only ever
  // flips to false (realtime refreshes never set it back true), so a live
  // refresh doesn't blink the UI back to a skeleton.
  const [isLoading, setIsLoading] = useState(true)
  // True when the courses fetch itself failed — distinct from "no courses
  // yet". Consumers must not derive an incomplete checklist from a failed
  // fetch (a false negative), so they gate on this instead.
  const [loadFailed, setLoadFailed] = useState(false)

  const refresh = useCallback(async () => {
    if (!currentSeller?.id) {
      setHasPublishedCourse(false)
      setHasPaidCourse(false)
      setDraftCourseId(null)
      setLoadFailed(false)
      setIsLoading(false)
      return
    }
    // One courses fetch drives three signals: "published" = any course past
    // draft (a draft isn't bookable, and completed/cancelled still count as
    // "has launched" so the checklist never resurfaces), "paid" = any course
    // (drafts included) with a price — that's what makes the Stripe step
    // required — plus the newest draft's id so the course step can resume it
    // instead of starting over.
    const { data: courses, error: coursesError } = await supabase.from('courses')
      .select('id, status, price')
      .eq('seller_id', currentSeller.id)
      .order('created_at', { ascending: false })
    if (coursesError) {
      logger.error('[setup-status] fetch failed', coursesError)
      // Don't touch the signals — a failed fetch must never commit a false
      // "nothing done yet" over the last-known (or default) state.
      setLoadFailed(true)
      setIsLoading(false)
      return
    }
    const rows = (courses ?? []) as Array<{ id: string; status: string | null; price: number | null }>
    setHasPublishedCourse(rows.some((c) => c.status !== 'draft'))
    setHasPaidCourse(rows.some((c) => (c.price ?? 0) > 0))
    setDraftCourseId(rows.find((c) => c.status === 'draft')?.id ?? null)
    setLoadFailed(false)
    setIsLoading(false)
  }, [currentSeller?.id])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useMultiTableSubscription(
    [{ table: 'courses', filter: `seller_id=eq.${currentSeller?.id}` }],
    refresh,
    !!currentSeller?.id,
    currentSeller?.id,
  )

  const onConnectPayments = useCallback(() => {
    navigate(routes.settingsPayouts)
  }, [navigate])

  const progress = useSetupProgress({
    currentSeller,
    hasPublishedCourse,
    hasPaidCourse,
    draftCourseId,
    onConnectPayments,
  })

  // Stamp setup_complete_seen_at once everything is done. Idempotent —
  // guarded by the column being null. Multiple consumers (sidebar + page)
  // will both fire this, both writes are harmless.
  useEffect(() => {
    if (!progress.isSetupComplete) return
    if (!profile?.id || profile.setup_complete_seen_at) return
    void supabase.from('profiles')
      .update({ setup_complete_seen_at: new Date().toISOString() })
      .eq('id', profile.id)
  }, [progress.isSetupComplete, profile?.id, profile?.setup_complete_seen_at])

  return { ...progress, isLoading, loadFailed, refresh }
}

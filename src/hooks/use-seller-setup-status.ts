import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { routes } from '@/lib/routes'
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
  const [hasLocation, setHasLocation] = useState(false)
  const [draftCourseId, setDraftCourseId] = useState<string | null>(null)
  // True until the first courses/locations fetch resolves. Without this, the
  // hook derives state from `hasPublishedCourse=false` on the first paint —
  // even when the seller actually has a published course — so consumers flash
  // the incomplete checklist before the fetch flips them to "done". Only ever
  // flips to false (realtime refreshes never set it back true), so a live
  // refresh doesn't blink the UI back to a skeleton.
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!currentSeller?.id) {
      setHasPublishedCourse(false)
      setHasPaidCourse(false)
      setHasLocation(false)
      setDraftCourseId(null)
      setIsLoading(false)
      return
    }
    // One courses fetch drives three signals: "published" = any course past
    // draft (a draft isn't bookable, and completed/cancelled still count as
    // "has launched" so the checklist never resurfaces), "paid" = any course
    // (drafts included) with a price — that's what makes the Stripe step
    // required — plus the newest draft's id so the course step can resume it
    // instead of starting over.
    const [{ data: courses }, { count: locationCount }] = await Promise.all([
      supabase.from('courses')
        .select('id, status, price')
        .eq('seller_id', currentSeller.id)
        .order('created_at', { ascending: false }),
      supabase.from('teacher_locations')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', currentSeller.id),
    ])
    const rows = (courses ?? []) as Array<{ id: string; status: string | null; price: number | null }>
    setHasPublishedCourse(rows.some((c) => c.status !== 'draft'))
    setHasPaidCourse(rows.some((c) => (c.price ?? 0) > 0))
    setDraftCourseId(rows.find((c) => c.status === 'draft')?.id ?? null)
    setHasLocation((locationCount ?? 0) > 0)
    setIsLoading(false)
  }, [currentSeller?.id])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useMultiTableSubscription(
    [
      { table: 'courses', filter: `seller_id=eq.${currentSeller?.id}` },
      { table: 'teacher_locations', filter: `seller_id=eq.${currentSeller?.id}` },
    ],
    refresh,
    !!currentSeller?.id,
    currentSeller?.id,
  )

  const onConnectPayments = useCallback(() => {
    navigate(routes.settingsPayouts)
  }, [navigate])

  const progress = useSetupProgress({
    currentSeller,
    hasLocation,
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

  return { ...progress, isLoading }
}

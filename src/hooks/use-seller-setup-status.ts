import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { typedFrom } from '@/lib/supabase'
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
  const [hasCourses, setHasCourses] = useState(false)

  const refresh = useCallback(async () => {
    if (!currentSeller?.id) {
      setHasCourses(false)
      return
    }
    const { count } = await typedFrom('courses')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', currentSeller.id)
    setHasCourses((count ?? 0) > 0)
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
    profile,
    hasCourses,
    onConnectPayments,
  })

  // Stamp setup_complete_seen_at once everything is done. Idempotent —
  // guarded by the column being null. Multiple consumers (sidebar + page)
  // will both fire this, both writes are harmless.
  useEffect(() => {
    if (!progress.isSetupComplete) return
    if (!profile?.id || profile.setup_complete_seen_at) return
    void typedFrom('profiles')
      .update({ setup_complete_seen_at: new Date().toISOString() })
      .eq('id', profile.id)
  }, [progress.isSetupComplete, profile?.id, profile?.setup_complete_seen_at])

  return progress
}

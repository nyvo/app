import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { useAuth } from '@/contexts/AuthContext'
import { fetchMySpaces, type MySpace } from '@/services/spaces'

interface UseMySpacesResult {
  spaces: MySpace[]
  /** Org IDs where the user is owner or admin — needed for create + join flows. */
  ownerAdminOrganizationIds: string[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Slim page-level hook for /teacher/studio.
 *
 * Returns the spaces the user belongs to (via any of their orgs) plus the
 * subset of those org IDs where the user can act as owner/admin (used to
 * gate create-space + join-with-code submission).
 */
export function useMySpaces(): UseMySpacesResult {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [spaces, setSpaces] = useState<MySpace[]>([])
  const [ownerAdminOrganizationIds, setOwnerAdminOrganizationIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const seq = useRef(0)

  const load = useCallback(async () => {
    if (!userId) {
      setSpaces([])
      setOwnerAdminOrganizationIds([])
      setLoading(false)
      setError(null)
      return
    }

    const mySeq = ++seq.current
    setLoading(true)
    setError(null)

    try {
      // Fetch the user's org memberships with role — keep this query small.
      const { data: memberRows, error: memErr } = await supabase
        .from('org_members')
        .select('organization_id, role')
        .eq('user_id', userId)

      if (memErr) throw memErr
      if (mySeq !== seq.current) return

      const memberships = (memberRows ?? []) as Array<{
        organization_id: string
        role: 'owner' | 'admin' | 'teacher'
      }>
      const allOrgIds = memberships.map((m) => m.organization_id)
      const ownerAdminIds = memberships
        .filter((m) => m.role === 'owner' || m.role === 'admin')
        .map((m) => m.organization_id)

      const { data: spacesData, error: spacesErr } = await fetchMySpaces(allOrgIds)
      if (mySeq !== seq.current) return
      if (spacesErr) throw spacesErr

      setOwnerAdminOrganizationIds(ownerAdminIds)
      setSpaces(spacesData)
    } catch (err) {
      if (mySeq !== seq.current) return
      logger.error('useMySpaces load failed:', err)
      setError(err instanceof Error ? err.message : 'Kunne ikke laste studios')
      setSpaces([])
    } finally {
      if (mySeq === seq.current) setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  return {
    spaces,
    ownerAdminOrganizationIds,
    loading,
    error,
    refetch: load,
  }
}

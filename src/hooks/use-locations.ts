import { useState, useEffect, useCallback } from 'react'
import { fetchLocations } from '@/services/locations'
import type { TeacherLocation } from '@/types/database'

export function useLocations(organizationId: string | undefined) {
  const [locations, setLocations] = useState<TeacherLocation[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const load = useCallback(async () => {
    if (!organizationId) {
      setLocations([])
      return
    }
    setIsLoading(true)
    const { data } = await fetchLocations(organizationId)
    setLocations(data)
    setIsLoading(false)
  }, [organizationId])

  useEffect(() => {
    load()
  }, [load])

  return { locations, isLoading, refetch: load }
}

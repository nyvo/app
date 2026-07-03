import { useState, useEffect, useCallback } from 'react'
import { fetchLocations } from '@/services/locations'
import type { TeacherLocation } from '@/types/database'

export function useLocations(sellerId: string | undefined) {
  const [locations, setLocations] = useState<TeacherLocation[]>([])
  // Start loading when there's a seller to fetch for, so the first committed
  // render is already in the loading state (no content flash before the effect).
  const [isLoading, setIsLoading] = useState(!!sellerId)
  const [error, setError] = useState<Error | null>(null)

  const load = useCallback(async () => {
    if (!sellerId) {
      setLocations([])
      setError(null)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    const { data, error } = await fetchLocations(sellerId)
    if (error) {
      setError(error)
      setIsLoading(false)
      return
    }
    setLocations(data)
    setIsLoading(false)
  }, [sellerId])

  useEffect(() => {
    load()
  }, [load])

  return { locations, isLoading, error, refetch: load }
}

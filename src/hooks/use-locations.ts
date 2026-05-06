import { useState, useEffect, useCallback } from 'react'
import { fetchLocations } from '@/services/locations'
import type { TeacherLocation } from '@/types/database'

export function useLocations(sellerId: string | undefined) {
  const [locations, setLocations] = useState<TeacherLocation[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const load = useCallback(async () => {
    if (!sellerId) {
      setLocations([])
      return
    }
    setIsLoading(true)
    const { data } = await fetchLocations(sellerId)
    setLocations(data)
    setIsLoading(false)
  }, [sellerId])

  useEffect(() => {
    load()
  }, [load])

  return { locations, isLoading, refetch: load }
}

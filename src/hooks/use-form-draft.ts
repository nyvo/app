import { useState, useEffect, useCallback, useRef } from 'react'
import { logger } from '@/lib/logger'

/**
 * Hook for auto-saving form drafts to localStorage.
 * Provides draft persistence with debounced saves and recovery on page load.
 *
 * @param key - Unique storage key for this form
 * @param debounceMs - Delay before saving (default 1000ms)
 *
 * @example
 * const { draft, saveDraft, clearDraft, hasDraft } = useFormDraft('new-course-form')
 *
 * // Load saved draft on mount
 * useEffect(() => {
 *   if (draft) {
 *     setTitle(draft.title || '')
 *     setPrice(draft.price || '')
 *   }
 * }, [])
 *
 * // Save draft whenever form changes
 * useEffect(() => {
 *   saveDraft({ title, price })
 * }, [title, price, saveDraft])
 *
 * // Clear draft on successful submit
 * const handleSubmit = async () => {
 *   await createCourse(...)
 *   clearDraft()
 * }
 */
export function useFormDraft<T extends object>(
  key: string,
  debounceMs = 1000
) {
  const storageKey = `form-draft:${key}`
  const [draft, setDraft] = useState<T | null>(null)
  const [hasDraft, setHasDraft] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInitialLoadRef = useRef(true)

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as T
        setDraft(parsed)
        setHasDraft(true)
      }
    } catch (err) {
      logger.warn('[FormDraft] Failed to load draft:', err)
      // Clear corrupted data
      localStorage.removeItem(storageKey)
    }
    isInitialLoadRef.current = false
  }, [storageKey])

  // Save draft to localStorage (debounced)
  const saveDraft = useCallback((data: T) => {
    // Clear any pending save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Debounce the save
    timeoutRef.current = setTimeout(() => {
      try {
        // Don't save empty drafts
        const hasContent = Object.values(data).some(v =>
          v !== '' && v !== null && v !== undefined
        )

        if (hasContent) {
          localStorage.setItem(storageKey, JSON.stringify(data))
          setHasDraft(true)
        }
      } catch (err) {
        logger.warn('[FormDraft] Failed to save draft:', err)
      }
    }, debounceMs)
  }, [storageKey, debounceMs])

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey)
      setDraft(null)
      setHasDraft(false)
    } catch (err) {
      logger.warn('[FormDraft] Failed to clear draft:', err)
    }
  }, [storageKey])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    /** The loaded draft data (null if no draft exists) */
    draft,
    /** Whether a draft exists in storage */
    hasDraft,
    /** Save draft data (debounced) */
    saveDraft,
    /** Clear the draft from storage */
    clearDraft,
    /** Whether initial load is complete */
    isLoaded: !isInitialLoadRef.current,
  }
}

/**
 * Serialize a Date to ISO string for storage
 */
export function serializeDate(date: Date | undefined): string | undefined {
  return date?.toISOString()
}

/**
 * Deserialize an ISO string back to Date
 */
export function deserializeDate(isoString: string | undefined): Date | undefined {
  if (!isoString) return undefined
  const date = new Date(isoString)
  return isNaN(date.getTime()) ? undefined : date
}

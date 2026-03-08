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

  // Initialize synchronously from localStorage so auto-save guards
  // work correctly on the very first render (prevents overwriting the draft).
  const [draft, setDraft] = useState<T | null>(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) return JSON.parse(stored) as T
    } catch (err) {
      logger.warn('[FormDraft] Failed to load draft:', err)
      localStorage.removeItem(storageKey)
    }
    return null
  })
  const [hasDraft, setHasDraft] = useState(() => draft !== null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestDataRef = useRef<T | null>(null)
  const storageKeyRef = useRef(storageKey)

  // Keep storageKeyRef in sync
  storageKeyRef.current = storageKey

  // Save draft to localStorage (debounced)
  const saveDraft = useCallback((data: T) => {
    // Track latest data for flush on unmount
    latestDataRef.current = data

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
      latestDataRef.current = null
    }, debounceMs)
  }, [storageKey, debounceMs])

  // Save draft immediately, bypassing debounce.
  // Use before navigation or redirects where the debounced save would be lost.
  const saveDraftImmediate = useCallback((data: T) => {
    // Cancel any pending debounced save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    latestDataRef.current = null

    try {
      const hasContent = Object.values(data).some(v =>
        v !== '' && v !== null && v !== undefined
      )
      if (hasContent) {
        localStorage.setItem(storageKey, JSON.stringify(data))
        setHasDraft(true)
      }
    } catch (err) {
      logger.warn('[FormDraft] Failed to save draft immediately:', err)
    }
  }, [storageKey])

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    // Cancel any pending debounced save so it doesn't re-write after clear
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    // Prevent the unmount flush from re-writing the draft
    latestDataRef.current = null

    try {
      localStorage.removeItem(storageKey)
      setDraft(null)
      setHasDraft(false)
    } catch (err) {
      logger.warn('[FormDraft] Failed to clear draft:', err)
    }
  }, [storageKey])

  // Flush pending save on unmount instead of discarding it
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      // Write any pending data synchronously before unmount
      const pendingData = latestDataRef.current
      if (pendingData) {
        try {
          const hasContent = Object.values(pendingData).some(v =>
            v !== '' && v !== null && v !== undefined
          )
          if (hasContent) {
            localStorage.setItem(storageKeyRef.current, JSON.stringify(pendingData))
          }
        } catch (err) {
          logger.warn('[FormDraft] Failed to flush draft on unmount:', err)
        }
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
    /** Save draft data immediately (bypasses debounce — use before redirects) */
    saveDraftImmediate,
    /** Clear the draft from storage */
    clearDraft,
  }
}

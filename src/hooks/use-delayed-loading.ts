import { useState, useEffect, useRef } from 'react'

/**
 * Hook that delays showing loading state to avoid flickering for fast loads.
 *
 * This implements the UX best practice of only showing loading indicators
 * when an operation takes longer than a threshold (default 200ms).
 * For fast operations, no loading state is shown at all, avoiding
 * a jarring flash of loading UI.
 *
 * Once the loading state is shown, it stays visible for a minimum duration
 * to avoid an even more jarring "flash" of the skeleton.
 *
 * @param isLoading - The actual loading state
 * @param delay - Delay before showing loading (default 200ms)
 * @param minDuration - Minimum time to show loading once visible (default 400ms)
 * @returns The delayed loading state
 *
 * @example
 * const [isLoading, setIsLoading] = useState(true)
 * const showSkeleton = useDelayedLoading(isLoading)
 *
 * // Use showSkeleton instead of isLoading for UI:
 * {showSkeleton ? <Skeleton /> : <Content />}
 */
export function useDelayedLoading(
  isLoading: boolean,
  delay = 200,
  minDuration = 400
): boolean {
  const [showLoading, setShowLoading] = useState(false)
  const showLoadingRef = useRef(false)
  const loadingStartTime = useRef<number | null>(null)
  const delayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const minDurationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Clear any pending timeouts
    if (delayTimeoutRef.current) {
      clearTimeout(delayTimeoutRef.current)
    }

    if (isLoading) {
      // Start delayed show
      delayTimeoutRef.current = setTimeout(() => {
        setShowLoading(true)
        showLoadingRef.current = true
        loadingStartTime.current = Date.now()
      }, delay)
    } else {
      // Loading finished
      if (showLoadingRef.current && loadingStartTime.current) {
        // Calculate how long loading has been shown
        const elapsed = Date.now() - loadingStartTime.current
        const remaining = minDuration - elapsed

        if (remaining > 0) {
          // Keep showing for minimum duration
          minDurationTimeoutRef.current = setTimeout(() => {
            setShowLoading(false)
            showLoadingRef.current = false
            loadingStartTime.current = null
          }, remaining)
        } else {
          // Already shown long enough
          setShowLoading(false)
          showLoadingRef.current = false
          loadingStartTime.current = null
        }
      } else {
        // Never shown (fast load), just reset
        setShowLoading(false)
        showLoadingRef.current = false
        loadingStartTime.current = null
      }
    }

    return () => {
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current)
      }
      if (minDurationTimeoutRef.current) {
        clearTimeout(minDurationTimeoutRef.current)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, delay, minDuration])

  return showLoading
}

/**
 * Simpler version that only delays showing loading, but hides immediately
 * when loading completes. Use this when you want to avoid the initial flash
 * but don't need minimum display duration.
 *
 * @param isLoading - The actual loading state
 * @param delay - Delay before showing loading (default 200ms)
 * @returns The delayed loading state
 */
export function useDelayedLoadingSimple(
  isLoading: boolean,
  delay = 200
): boolean {
  const [showLoading, setShowLoading] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (isLoading) {
      timeoutRef.current = setTimeout(() => {
        setShowLoading(true)
      }, delay)
    } else {
      setShowLoading(false)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [isLoading, delay])

  return showLoading
}

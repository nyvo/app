import { useEffect, useState } from 'react'

interface DelayedFallbackProps {
  children: React.ReactNode
  delayMs?: number
}

/**
 * Holds back a loading fallback until the wait exceeds `delayMs`. Below the
 * threshold the slot is empty — Studio § 10: a skeleton that flashes for
 * <200ms reads as a glitch, worse than no indicator. Default is 200ms.
 */
export function DelayedFallback({ children, delayMs = 200 }: DelayedFallbackProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const id = window.setTimeout(() => setShow(true), delayMs)
    return () => window.clearTimeout(id)
  }, [delayMs])

  return show ? <>{children}</> : null
}

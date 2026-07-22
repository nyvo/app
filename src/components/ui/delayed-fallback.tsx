import { useEffect, useState } from 'react'

interface DelayedFallbackProps {
  children: React.ReactNode
  delayMs?: number
}

// When any DelayedFallback content was last on screen. A slow route load
// passes through several phases (chunk → auth init → role resolution), each
// mounting its own DelayedFallback; without a shared handoff every phase
// re-runs its delay and the indicator flashes off/on between phases. A fresh
// mount within HANDOFF_MS of the previous unmount is a continuation of the
// same wait, not a new one.
let lastVisibleAt = -Infinity
const HANDOFF_MS = 300

/**
 * Holds back a loading fallback until the wait exceeds `delayMs`. Below the
 * threshold the slot is empty — Studio § 10: a skeleton that flashes for
 * <200ms reads as a glitch, worse than no indicator. Default is 200ms.
 * Consecutive fallbacks hand off without re-running the delay, so multi-phase
 * loads show one continuous indicator instead of a flashing one.
 */
export function DelayedFallback({ children, delayMs = 200 }: DelayedFallbackProps) {
  const [show, setShow] = useState(() => performance.now() - lastVisibleAt < HANDOFF_MS)

  useEffect(() => {
    if (show) return
    const id = window.setTimeout(() => setShow(true), delayMs)
    return () => window.clearTimeout(id)
  }, [delayMs, show])

  useEffect(() => {
    if (!show) return
    return () => {
      lastVisibleAt = performance.now()
    }
  }, [show])

  return show ? <>{children}</> : null
}

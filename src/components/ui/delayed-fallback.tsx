import { useLayoutEffect, useState } from 'react'

interface DelayedFallbackProps {
  children: React.ReactNode
  delayMs?: number
}

// When DelayedFallback content last left the screen. A slow load can render
// consecutive fallbacks (e.g. the full-screen route loader handing over to an
// in-layout chunk loader); the handoff below lets the successor skip its
// delay so the indicator never blinks off/on between phases.
let lastVisibleAt = -Infinity
const HANDOFF_MS = 300

/**
 * Holds back a loading fallback until the wait exceeds `delayMs`. Below the
 * threshold the slot is empty — Studio § 10: a skeleton that flashes for
 * <200ms reads as a glitch, worse than no indicator. Default is 200ms.
 *
 * Consecutive fallbacks hand off: a successor mounting within HANDOFF_MS of
 * the predecessor leaving shows immediately instead of re-running its delay.
 * Both sides deliberately use layout effects — within a single React commit
 * the outgoing fallback's cleanup (mutation phase) runs BEFORE the incoming
 * fallback's layout effect, and both run before paint, so the handoff is
 * deterministic and gapless. Deciding in the useState initializer instead
 * would read `lastVisibleAt` during render — before the predecessor recorded
 * it — and re-run the delay every phase (the off/on spinner flash).
 */
export function DelayedFallback({ children, delayMs = 200 }: DelayedFallbackProps) {
  const [show, setShow] = useState(false)

  useLayoutEffect(() => {
    if (performance.now() - lastVisibleAt < HANDOFF_MS) {
      setShow(true)
      return
    }
    const id = window.setTimeout(() => setShow(true), delayMs)
    return () => window.clearTimeout(id)
  }, [delayMs])

  useLayoutEffect(() => {
    if (!show) return
    return () => {
      lastVisibleAt = performance.now()
    }
  }, [show])

  return show ? <>{children}</> : null
}

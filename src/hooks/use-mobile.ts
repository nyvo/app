import * as React from "react"

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

// Helper to get initial value synchronously (avoids flash on page load)
const getInitialMobile = () => {
  if (typeof window === 'undefined') return false
  return window.innerWidth < MOBILE_BREAKPOINT
}

const getInitialTablet = () => {
  if (typeof window === 'undefined') return false
  const width = window.innerWidth
  return width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(getInitialMobile)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    // Sync state in case it changed between render and effect
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}

// Returns true for tablet range: 768px - 1023px
export function useIsTablet() {
  const [isTablet, setIsTablet] = React.useState(getInitialTablet)

  React.useEffect(() => {
    const checkTablet = () => {
      const width = window.innerWidth
      setIsTablet(width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT)
    }

    // Use resize event for more reliable detection across the range
    window.addEventListener("resize", checkTablet)
    // Sync state in case it changed between render and effect
    checkTablet()
    return () => window.removeEventListener("resize", checkTablet)
  }, [])

  return isTablet
}

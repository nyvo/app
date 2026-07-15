import * as React from "react"

const MOBILE_BREAKPOINT = 768

/**
 * Reports whether the viewport is narrower than `breakpoint`. Components with
 * their own responsive layout can supply a threshold without changing the
 * phone-only behavior of dialogs, sheets, and notifications.
 */
export function useIsMobile(breakpoint = MOBILE_BREAKPOINT) {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < breakpoint)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < breakpoint)
    return () => mql.removeEventListener("change", onChange)
  }, [breakpoint])

  return !!isMobile
}

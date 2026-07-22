import { useLayoutEffect, useRef } from "react"
import { Loader2 } from "@/lib/icons"
import { cn } from "@/lib/utils"

type SpinnerSize = "xs" | "sm" | "md" | "lg" | "xl"

const spinnerSizeClasses: Record<SpinnerSize, string> = {
  xs: "size-3.5",
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
  xl: "size-8",
}

interface SpinnerProps {
  className?: string
  size?: SpinnerSize
}

function Spinner({ className, size = "sm" }: SpinnerProps) {
  const ref = useRef<SVGSVGElement>(null)

  // Phase-lock the rotation to a shared clock: sequential loading fallbacks
  // each mount a fresh Spinner, and restarting from 0° on every remount reads
  // as a stutter. The negative delay puts a new spinner at the angle it would
  // have had spinning since page load, so handoffs are seamless (and
  // simultaneous spinners rotate in sync). Set once per mount in a layout
  // effect (pre-paint): reading the clock during render would recompute the
  // delay on every re-render and visibly jump the angle.
  useLayoutEffect(() => {
    ref.current?.style.setProperty(
      "animation-delay",
      `-${Math.round(performance.now() % 600)}ms`,
    )
  }, [])

  return (
    <Loader2
      ref={ref}
      role="status"
      aria-label="Laster"
      className={cn(spinnerSizeClasses[size], "animate-[spin_0.6s_linear_infinite]", className)}
    />
  )
}

export { Spinner }

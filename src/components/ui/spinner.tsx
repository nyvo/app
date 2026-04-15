import { cn } from "@/lib/utils"
import { HugeiconsIcon } from "@hugeicons/react"
import { Loading03Icon } from "@hugeicons/core-free-icons"

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
  return (
    <HugeiconsIcon
      icon={Loading03Icon}
      strokeWidth={2}
      role="status"
      aria-label="Loading"
      className={cn(spinnerSizeClasses[size], "animate-spin", className)}
    />
  )
}

export { Spinner }

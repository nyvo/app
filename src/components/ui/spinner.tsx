import { Loader2Icon } from "lucide-react"

import { cn } from "@/lib/utils"

type SpinnerSize = "xs" | "sm" | "md" | "lg" | "xl"

const spinnerSizeClasses: Record<SpinnerSize, string> = {
  xs: "size-3.5",
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
  xl: "size-8",
}

interface SpinnerProps extends Omit<React.ComponentProps<typeof Loader2Icon>, "size"> {
  size?: SpinnerSize
}

function Spinner({ className, size = "sm", ...props }: SpinnerProps) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn(spinnerSizeClasses[size], "animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }

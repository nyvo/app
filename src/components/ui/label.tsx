import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Form field label — the one canonical label style. `text-sm font-medium`,
 * never semibold (hierarchy comes from the tier system, not weight).
 * Set `data-error` to turn it danger-red alongside a FieldError.
 */
function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "block text-sm font-medium text-foreground data-[error=true]:text-danger",
        className
      )}
      {...props}
    />
  )
}

export { Label }

import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base styles matching design system
        "h-11 w-full rounded-xl border border-border bg-input-bg px-4 text-sm text-text-primary",
        "placeholder:text-text-tertiary",
        "focus:border-ring focus:outline-none focus:ring-4 focus:ring-border/30 focus:bg-white",
        "hover:border-ring ios-ease",
        // File input styles
        "file:text-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        // Selection styles
        "selection:bg-primary selection:text-primary-foreground",
        // Disabled state
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // Error state
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }

import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base styles matching design system - V2.3: rounded-lg for sharp, precise interactive elements
        "h-11 w-full rounded-lg border border-zinc-300 bg-input-bg px-4 text-sm text-text-primary",
        "placeholder:text-text-tertiary",
        // V2.2 Elevated Contrast: crisp 2px offset ring with soft stone color
        "focus:outline-none focus:bg-white focus:border-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        "hover:border-ring ios-ease",
        // Autofill styles - override browser's blue/yellow background
        "autofill:bg-white",
        // File input styles
        "file:text-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
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

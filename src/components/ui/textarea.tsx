import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // Base styles matching Input component
        "w-full rounded-lg border border-zinc-300 bg-input-bg px-4 py-2.5 text-sm text-text-primary",
        "placeholder:text-text-tertiary",
        // Focus styles - identical to Input
        "focus:outline-none focus:bg-white focus:border-zinc-400",
        "focus-visible:ring-2 focus-visible:ring-zinc-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        "hover:border-ring ios-ease",
        // Disabled state
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // Error state
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
        // Textarea defaults
        "resize-none min-h-[80px]",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }

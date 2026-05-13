import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-base transition-[color,border-color,box-shadow] duration-150 ease-out outline-none placeholder:text-foreground-muted focus-visible:border-foreground focus-visible:ring-2 focus-visible:ring-foreground/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50 aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }

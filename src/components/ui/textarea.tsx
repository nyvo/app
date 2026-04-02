import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
      <textarea
        className={cn(
        "flex min-h-[88px] w-full rounded-md border border-input bg-background px-4 py-3 text-[14px] font-medium ring-offset-background transition-[background-color,border-color,color,opacity] duration-150 ease-out placeholder:font-normal placeholder:text-muted-foreground hover:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-input",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }

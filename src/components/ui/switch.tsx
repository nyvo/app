"use client"

import * as React from "react"
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitives.Root> & {
  size?: "default" | "sm"
}) {
  return (
    <SwitchPrimitives.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent smooth-transition",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-[state=checked]:bg-primary data-[state=unchecked]:bg-surface-elevated",
        size === "sm" ? "h-4 w-7" : "h-6 w-11",
        className
      )}
      {...props}
    >
      <SwitchPrimitives.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-white ring-0 smooth-transition data-[state=unchecked]:translate-x-0",
          size === "sm"
            ? "h-3 w-3 data-[state=checked]:translate-x-3"
            : "h-5 w-5 data-[state=checked]:translate-x-5"
        )}
      />
    </SwitchPrimitives.Root>
  )
}

export { Switch }

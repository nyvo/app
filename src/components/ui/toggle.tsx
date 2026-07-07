import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Toggle as TogglePrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

const toggleVariants = cva(
  "group/toggle inline-flex items-center justify-center gap-1 rounded-md text-sm font-medium whitespace-nowrap transition-colors duration-150 ease-out outline-none hover:bg-muted hover:text-foreground focus-visible:border-foreground focus-visible:ring-2 focus-visible:ring-ring-subtle disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger/20 aria-pressed:bg-muted [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border border-border bg-transparent hover:bg-muted",
        pill: "rounded-md text-sm px-3 py-1.5 bg-transparent border border-transparent text-foreground-muted transition-colors duration-150 ease-out hover:text-foreground hover:bg-surface hover:border-border aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:border-transparent aria-pressed:hover:bg-primary/90 aria-pressed:hover:border-transparent data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-transparent",
        segmented:
          "h-8 min-w-0 rounded-md px-3 text-xs font-medium bg-transparent text-foreground-muted transition-colors duration-150 ease-out hover:text-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:shadow-xs aria-pressed:hover:bg-primary/90 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-xs data-[state=on]:hover:bg-primary/90",
      },
      size: {
        default:
          "h-9 min-w-9 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        sm: "h-8 min-w-8 px-2.5 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5",
        lg: "h-10 min-w-10 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }

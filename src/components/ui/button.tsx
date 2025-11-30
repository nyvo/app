import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all ios-ease active:scale-[0.98] shadow-sm disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-text-primary text-white hover:bg-sidebar-foreground",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90",
        outline:
          "border border-border bg-white text-text-primary hover:bg-text-primary hover:text-white hover:border-text-primary",
        "outline-soft":
          "border border-border bg-white text-text-secondary hover:bg-surface-elevated hover:text-text-primary",
        secondary:
          "bg-surface-elevated text-text-primary hover:bg-border",
        ghost:
          "hover:bg-surface-elevated hover:text-text-primary shadow-none hover:shadow-none",
        link: "text-text-primary underline-offset-4 hover:underline shadow-none hover:shadow-none active:scale-100",
      },
      size: {
        default: "h-10 px-5 py-2.5 text-sm rounded-xl",
        sm: "h-9 px-4 py-2 text-xs rounded-xl",
        compact: "h-10 px-3 py-2 text-xs rounded-lg [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 px-6 py-3 text-sm rounded-xl",
        pill: "h-10 px-6 py-2.5 text-sm rounded-full",
        icon: "h-9 w-9 px-0 shadow-none hover:shadow-none rounded-full",
        "icon-sm": "h-8 w-8 px-0 shadow-none hover:shadow-none rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

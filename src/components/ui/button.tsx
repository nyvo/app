import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Spinner } from "./spinner"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all ios-ease active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-soft",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90",
        outline:
          "border border-border bg-white text-text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary",
        "outline-soft":
          "border border-border bg-white text-text-secondary hover:bg-surface-elevated hover:text-text-primary",
        secondary:
          "bg-surface-elevated text-text-primary hover:bg-border",
        ghost:
          "hover:bg-surface-elevated hover:text-text-primary",
        link: "text-text-primary underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        default: "h-10 px-5 py-2.5 text-sm rounded-lg",
        sm: "h-9 px-4 py-2 text-xs rounded-lg",
        compact: "h-10 px-3 py-2 text-xs rounded-lg [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 px-6 py-3 text-sm rounded-lg",
        pill: "h-10 px-6 py-2.5 text-sm rounded-full",
        icon: "h-11 w-11 px-0 rounded-full",
        "icon-sm": "h-9 w-9 px-0 rounded-full",
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
  loading = false,
  loadingText,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    loading?: boolean
    loadingText?: string
  }) {
  const Comp = asChild ? Slot : "button"

  // Determine spinner size based on button size
  const spinnerSize = size === 'compact' || size === 'sm' || size === 'icon-sm' ? 'sm' : 'md'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Spinner size={spinnerSize} className="shrink-0" />
          {loadingText ? <span>{loadingText}</span> : children}
        </>
      ) : (
        children
      )}
    </Comp>
  )
}

export { Button, buttonVariants }

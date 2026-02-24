import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Spinner } from "./spinner"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white cursor-pointer",
  {
    variants: {
      variant: {
        default: "relative bg-gradient-to-b from-zinc-800 to-zinc-950 text-white border border-zinc-700/70 ring-1 ring-black/5 hover:from-zinc-700 hover:to-zinc-900 hover:border-zinc-600/80 after:absolute after:inset-0 after:rounded-[inherit] after:ring-1 after:ring-white/10 after:pointer-events-none [&_svg]:opacity-70",
        destructive:
          "bg-destructive text-white border border-destructive/80 hover:bg-destructive/90",
        outline:
          "border border-zinc-200 bg-white text-text-primary hover:bg-zinc-50 hover:border-zinc-300",
        "outline-soft":
          "border border-zinc-200 bg-white text-text-secondary hover:bg-zinc-50 hover:text-text-primary",
        secondary:
          "bg-surface-elevated text-text-primary border border-zinc-200 hover:bg-zinc-200/80",
        ghost:
          "hover:bg-surface-elevated hover:text-text-primary",
        link: "text-text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2.5 text-sm rounded-xl",
        xs: "h-8 px-3 py-1.5 text-xs rounded-lg [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-9 px-4 py-2 text-xs rounded-xl",
        compact: "h-10 px-3 py-2 text-xs rounded-xl [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 px-6 py-3 text-sm rounded-xl",
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
  const spinnerSize = size === 'compact' || size === 'sm' || size === 'xs' || size === 'icon-sm' ? 'sm' : 'md'

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

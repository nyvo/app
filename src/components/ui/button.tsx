import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Spinner } from "./spinner"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-[14px] font-medium ring-offset-background transition-[background-color,border-color,color,opacity,transform] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transform-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/92 active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/92 active:scale-[0.98]",
        "destructive-outline":
          "border border-destructive/30 bg-background text-destructive hover:border-destructive/50 hover:bg-destructive/5 active:scale-[0.98]",
        outline:
          "border border-input bg-background hover:border-ring hover:bg-surface-muted hover:text-foreground active:scale-[0.98]",
        "outline-soft":
          "border border-input bg-background text-muted-foreground hover:border-ring hover:bg-surface-muted hover:text-foreground active:scale-[0.98]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/90 active:scale-[0.98]",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4",
        xs: "h-9 px-3 text-[12px] rounded-md [&_svg]:size-3.5",
        sm: "h-9 rounded-md px-3 text-[14px]",
        compact: "h-9 px-3 text-[14px] rounded-md [&_svg]:size-3.5",
        lg: "h-11 rounded-md px-8",
        icon: "h-11 w-11",
        "icon-sm": "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  loadingText?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, loadingText, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const spinnerSize = size === 'compact' || size === 'sm' || size === 'xs' || size === 'icon-sm' ? 'sm' : 'md'

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
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
)
Button.displayName = "Button"

export { Button, buttonVariants }

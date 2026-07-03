import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Badge — a single primitive for all pill/badge rendering in the app.
 *
 * Variant dimensions:
 *   variant : semantic colour + weight
 *     • semantic — success / warning / destructive / info / neutral
 *     • emphasis — default / secondary / outline / ghost / link / inverted
 *   shape   : visual container rounding — "pill" (round, for card meta) or "rect" (slightly rounded, for status rows/tables)
 *   size    : xs / sm / md
 *
 * The 3 typed wrappers (StatusBadge, PaymentBadge, SignupStatusBadge) pick variant + label
 * from a status enum and render <Badge/>. Do NOT render `<Badge variant="success">…</Badge>` ad-hoc
 * for a payment status — use PaymentBadge so copy + silence rules stay centralized.
 */
const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap border font-medium transition-colors duration-150 ease-out focus-visible:border-foreground focus-visible:ring-2 focus-visible:ring-foreground/15 aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger/20 [&>svg]:pointer-events-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border-transparent [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground border-transparent [a]:hover:bg-secondary/80",
        outline:
          "bg-transparent border-border text-foreground [a]:hover:bg-muted",
        ghost:
          "bg-transparent border-transparent hover:bg-muted",
        destructive:
          "bg-danger-subtle text-danger border-transparent focus-visible:ring-danger/20 [a]:hover:bg-danger/20",
        success:
          "bg-success-subtle text-success border-transparent",
        warning:
          "bg-warning-subtle text-warning border-transparent",
        info:
          "bg-info-subtle text-info border-transparent",
        neutral:
          // text-foreground, not -muted: neutral-11 on neutral-3 measures 4.27:1 — below AA for badge-size text
          "bg-muted text-foreground border-transparent",
        inverted:
          "bg-foreground text-background border-transparent",
        link:
          "bg-transparent border-transparent text-primary underline-offset-4 hover:underline",
      },
      shape: {
        // Card meta / counts / decorative chips — fully rounded pill
        pill: "rounded-full",
        // Status in tables / rows — slightly rounded rectangle
        rect: "rounded-md",
      },
      size: {
        xs: "h-4 px-1.5 text-[10px] leading-none [&>svg]:size-2.5",
        sm: "h-6 px-2.5 text-[13px] [&>svg]:size-3.5",
        md: "h-7 px-3 text-sm [&>svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
      shape: "pill",
      size: "sm",
    },
  }
)

function Badge({
  className,
  variant,
  shape,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      data-shape={shape}
      className={cn(badgeVariants({ variant, shape, size }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }

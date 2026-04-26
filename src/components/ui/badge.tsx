import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Badge — a single primitive for all pill/badge rendering in the app.
 *
 * Variant dimensions:
 *   variant : semantic colour + weight
 *     • semantic         — success / warning / destructive / info / neutral
 *     • wellness pastels — sage / rose / lavender / sand / sky (sentence case, calm)
 *     • emphasis         — default / secondary / outline / ghost / link / accent
 *   shape   : visual container rounding — "pill" (round, for card meta) or "rect" (slightly rounded, for status rows/tables)
 *   size    : xs / sm / md
 *
 * Pastels are pre-tinted via the --sage / --rose / --lavender / --sand / --sky
 * tokens in `index.css`. Don't pair them with `uppercase` or `tracking-[0.12em]` —
 * the whole point is the calmer treatment.
 *
 * The 3 typed wrappers (StatusBadge, PaymentBadge, SignupStatusBadge) pick variant + label
 * from a status enum and render <Badge/>. Do NOT render `<Badge variant="success">…</Badge>` ad-hoc
 * for a payment status — use PaymentBadge so copy + silence rules stay centralized.
 */
const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap border font-medium tracking-wide transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none",
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
          "bg-destructive/10 text-destructive border-transparent focus-visible:ring-destructive/20 [a]:hover:bg-destructive/20",
        success:
          "bg-success/10 text-success border-transparent",
        warning:
          "bg-warning/10 text-warning border-transparent",
        info:
          "bg-info/10 text-info border-transparent",
        neutral:
          "bg-muted text-muted-foreground border-transparent",
        accent:
          "bg-chart-2/10 text-chart-2 border-transparent",
        sage:
          "bg-sage text-sage-foreground border-transparent tracking-normal",
        rose:
          "bg-rose text-rose-foreground border-transparent tracking-normal",
        lavender:
          "bg-lavender text-lavender-foreground border-transparent tracking-normal",
        sand:
          "bg-sand text-sand-foreground border-transparent tracking-normal",
        sky:
          "bg-sky text-sky-foreground border-transparent tracking-normal",
        link:
          "bg-transparent border-transparent text-primary tracking-normal underline-offset-4 hover:underline",
      },
      shape: {
        // Card meta / counts / decorative chips — fully rounded pill
        pill: "rounded-4xl",
        // Status in tables / rows — slightly rounded rectangle
        rect: "rounded-md",
      },
      size: {
        xs: "h-4 px-1.5 text-xxs [&>svg]:size-2.5",
        sm: "h-5 px-2 text-xs [&>svg]:size-3",
        md: "h-6 px-2.5 text-xs [&>svg]:size-3.5",
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

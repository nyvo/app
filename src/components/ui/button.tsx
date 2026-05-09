import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"
import { Spinner } from "./spinner"

/**
 * Button — the canonical interactive trigger primitive.
 *
 * Variant dimensions:
 *   variant : colour + emphasis (default/secondary/outline/outline-soft/ghost/danger/link)
 *   shape   : `default` rect (rounded-md) | `pill` (rounded-full). Use `pill`
 *             on hero CTAs in landing/marketing contexts ONLY; dashboard + forms
 *             stay rect so buttons share geometry with adjacent inputs. Never
 *             mix pill and rect in the same form/toolbar/action group.
 *   size    : xs / sm / default / lg / cta / icon / icon-xs / icon-sm / icon-lg.
 *             Use `cta` for prominent full-width CTAs in auth / modal primary /
 *             hero (h-11). Use `sm` for in-table / in-card actions.
 *
 * Decision tree:
 * - `default`     → primary action per section (max 1–2 per screen)
 * - `secondary`   → alternative action (e.g. "Avbryt" paired with a default)
 * - `outline`     → secondary action with more chrome (toolbars)
 * - `outline-soft`→ tertiary / cancel in dialogs — softer than `outline`
 * - `ghost`       → icon buttons, nav items, close buttons, hover-revealed
 * - `destructive` → destructive action, including AlertDialog confirmations.
 *                   Solid red on hard destructive flows — do NOT pair with a
 *                   second destructive button in the same action row.
 * - `link`        → inline text link styled as button
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-danger aria-invalid:ring-3 aria-invalid:ring-danger/20 dark:aria-invalid:border-danger/50 dark:aria-invalid:ring-danger/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border bg-background shadow-xs hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        "outline-soft":
          "border-border bg-background text-foreground-muted hover:border-ring hover:bg-muted hover:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-danger text-danger-foreground hover:bg-danger/90 focus-visible:border-danger/40 focus-visible:ring-danger/20",
        link: "text-primary underline-offset-4 hover:underline",
        // Inline text action — button semantics, link-like appearance. No chrome.
        // Renders at h-auto p-0 (compound variant), matches surrounding text size via `size`.
        plain:
          "bg-transparent border-transparent text-foreground-muted hover:bg-transparent hover:text-foreground",
      },
      shape: {
        // Rect — card meta / dashboard / forms.
        default: "",
        // Pill — hero CTAs on landing / marketing surfaces. Use sparingly.
        pill: "rounded-full",
      },
      size: {
        default:
          "h-9 gap-1.5 px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),8px)] px-2 text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 rounded-[min(var(--radius-md),10px)] px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5",
        lg: "h-10 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        cta: "h-11 gap-2 px-6 has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        icon: "size-9",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),8px)] in-data-[slot=button-group]:rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-8 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-md",
        "icon-lg": "size-10",
      },
    },
    compoundVariants: [
      // Pills need more horizontal padding — the rounded sides eat visual space.
      { shape: "pill", size: "xs", className: "px-3" },
      { shape: "pill", size: "sm", className: "px-4" },
      { shape: "pill", size: "default", className: "px-4" },
      { shape: "pill", size: "lg", className: "px-5" },
      { shape: "pill", size: "cta", className: "px-7" },
      // Plain variant strips chrome (height + padding) at every size.
      // Size still controls font-size; `plain` is always "text inline, no button shell".
      { variant: "plain", size: "xs", className: "h-auto p-0" },
      { variant: "plain", size: "sm", className: "h-auto p-0" },
      { variant: "plain", size: "default", className: "h-auto p-0" },
      { variant: "plain", size: "lg", className: "h-auto p-0" },
      { variant: "plain", size: "cta", className: "h-auto p-0" },
    ],
    defaultVariants: {
      variant: "default",
      shape: "default",
      size: "default",
    },
  }
)

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    loading?: boolean
    loadingText?: string
  }

function Button({
  className,
  variant = "default",
  size = "default",
  shape = "default",
  asChild = false,
  loading = false,
  loadingText,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button"
  const spinnerSize =
    size === "sm" || size === "xs" || size === "icon-sm" || size === "icon-xs"
      ? "sm"
      : "md"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      data-shape={shape}
      className={cn(buttonVariants({ variant, size, shape, className }))}
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
export type { ButtonProps }

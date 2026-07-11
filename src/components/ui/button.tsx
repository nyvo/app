import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"
import { Spinner } from "./spinner"

/**
 * Button — all buttons are pills (`rounded-full`, 2026-07 white-bg language):
 * text buttons and icon-only buttons (`size="icon"` / `icon-lg`) alike.
 * Form fields stay `rounded-xl` — the pill is the action affordance, the
 * soft rectangle is the field affordance.
 *
 * Variant axis (color + emphasis):
 *   default    — primary action per section (max 1–2 per screen). No hover
 *                shift: neutral-12 is already near-black, hover-darken reads
 *                as noise.
 *   secondary  — paired alternative (e.g. "Avbryt" next to a default).
 *   outline    — special-case emphasis: a bordered action for surfaces where a
 *                filled button would clash (e.g. on a colored/photographic or
 *                already-filled panel). Use sparingly; default to secondary.
 *   ghost      — low-emphasis row actions, sidebar nav, inline icon actions in
 *                dense lists. Transparent at rest, lifts to bg-muted on hover.
 *   soft       — dedicated icon controls (close × in dialog/sheet/drawer
 *                headers, kebab menu triggers, share, etc.). Persistent
 *                muted-fill circle at rest, deepens to bg-active on hover.
 *                Use with `size="icon"` for the standard circle affordance.
 *   destructive — destructive action; do not pair two destructive buttons.
 *   link       — inline text link styled as button.
 *   plain      — inline text action with button semantics. No chrome.
 *
 * Size axis (height / horizontal padding / text-size):
 *   default  40px   px-4     text-sm    Normal app buttons. 2026-07-11: the
 *                                       whole control system moved 44 → 40
 *                                       (Input, Select, DatePicker, InputGroup,
 *                                       SegmentedTabs lg moved with it — keep
 *                                       them in lockstep, buttons share rows
 *                                       with fields)
 *   lg       40px   px-5     text-sm    Legacy alias of default (wider padding,
 *                                       same height since the 40px shift);
 *                                       prefer `default` in new code
 *   cta      40px   px-6     text-sm    Public/mobile primary CTAs (wider
 *                                       padding only — 14px text everywhere
 *                                       since 2026-07-11; 16px text-base was
 *                                       the pre-hierarchy exception)
 *   sm       32px   px-3     text-sm    RESERVED — only for contexts that are
 *                                       naturally small-scale and don't have
 *                                       room for the 40px button (e.g. compact
 *                                       in-card row affordances). Don't sprinkle
 *                                       it into normal chrome: a lone 32px
 *                                       button on an otherwise-40px surface
 *                                       reads as a mistake, not hierarchy
 *                                       (2026-07-11 decision, tried + reverted).
 *                                       Never on touch-first public surfaces.
 *   icon     40×40 circle            Icon-only controls
 *   icon-lg  40×40 circle            Legacy alias of `icon` since the 40px shift
 *   icon-sm  32×32 circle            Same reservation as `sm`
 *
 * Touch surfaces (mobile booking, public pages, `BookingBar` at
 * src/components/public/course-details/BookingBar.tsx): minimum
 * `default` (40px); CTAs use `cta`.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,transform] duration-150 ease-out outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger/20 dark:aria-invalid:border-danger/50 dark:aria-invalid:ring-danger/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 cursor-pointer",
  {
    variants: {
      variant: {
        // Primary — monochrome near-black (neutral-12 via --foreground); azure
        // is reserved as a sprinkle accent (links, selected states). No hover
        // shift by design; focus ring stays visible via the ring-offset.
        default: "bg-foreground text-background",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-border dark:bg-surface-on-dark dark:hover:bg-surface-on-dark",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-active aria-expanded:bg-active aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted",
        soft:
          "bg-muted text-foreground hover:bg-active aria-expanded:bg-active",
        destructive:
          "bg-danger text-danger-foreground hover:bg-danger/90 focus-visible:ring-danger",
        link: "text-primary underline-offset-4 hover:underline",
        plain:
          "bg-transparent border-transparent text-foreground-muted hover:bg-transparent hover:text-foreground",
      },
      size: {
        default: "h-10 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        lg: "h-10 gap-1.5 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        cta: "h-10 gap-2 px-6 has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        sm: "h-8 gap-1 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        icon: "size-10",
        "icon-lg": "size-10",
        "icon-sm": "size-8",
      },
    },
    compoundVariants: [
      // Icon-only buttons stay circular regardless of variant — the base
      // is already rounded-full; this compound variant just makes that
      // explicit for icon sizes so it can't drift.
      { size: "icon", className: "rounded-full" },
      { size: "icon-lg", className: "rounded-full" },
      { size: "icon-sm", className: "rounded-full" },
      // Plain variant strips chrome (height + padding) at every size.
      // Size still controls font-size; `plain` is "text inline, no button shell".
      { variant: "plain", size: "default", className: "h-auto p-0" },
      { variant: "plain", size: "lg", className: "h-auto p-0" },
      { variant: "plain", size: "cta", className: "h-auto p-0" },
      { variant: "plain", size: "sm", className: "h-auto p-0" },
    ],
    defaultVariants: {
      variant: "default",
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
  asChild = false,
  loading = false,
  loadingText,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button"
  const spinnerSize = "md"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
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
export type { ButtonProps }

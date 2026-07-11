import * as React from "react"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid w-full gap-3", className)}
      {...props}
    />
  )
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "group/radio-group-item peer relative flex aspect-square size-4 shrink-0 rounded-full border border-border-strong bg-surface transition-[color,background-color,border-color,box-shadow] duration-150 ease-out outline-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-foreground focus-visible:ring-2 focus-visible:ring-ring-subtle disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger/20 aria-invalid:aria-checked:border-foreground data-checked:border-foreground data-checked:bg-foreground data-checked:text-background",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="flex size-4 items-center justify-center"
      >
        <span className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
}

function RadioGroupCardItem({
  className,
  icon: Icon,
  title,
  description,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item> & {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
}) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-card-item"
      className={cn(
        "group/radio-card relative flex w-full items-start gap-3 rounded-lg border border-border bg-surface p-4 text-left outline-none transition-colors",
        "not-data-checked:hover:bg-hover focus-visible:border-foreground focus-visible:ring-2 focus-visible:ring-ring-subtle",
        // Selection = fill change (design-language §5: never a colored border alone).
        // NEUTRAL fill by user decision 2026-07-08 — no azure tint on teacher-side
        // radio rows; --selection-light stays reserved for the buyer booking tier.
        "data-checked:border-foreground data-checked:bg-muted",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      {Icon && (
        <Icon
          className="mt-0.5 size-4 shrink-0 text-foreground-muted transition-colors group-data-checked/radio-card:text-foreground"
          aria-hidden="true"
        />
      )}
      <div className="flex-1 min-w-0">
        {/* Not a heading — a reusable primitive must not inject heading levels
            into the consumer's document outline. */}
        <span className="block text-sm font-medium text-foreground">{title}</span>
        {description && (
          <p className="mt-0.5 text-sm text-foreground-muted">{description}</p>
        )}
      </div>
      <div className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border-2 border-border text-transparent transition-colors group-data-checked/radio-card:border-foreground group-data-checked/radio-card:bg-foreground group-data-checked/radio-card:text-background">
        <RadioGroupPrimitive.Indicator>
          <svg className="size-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 6l2.5 2.5 4.5-5" />
          </svg>
        </RadioGroupPrimitive.Indicator>
      </div>
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem, RadioGroupCardItem }

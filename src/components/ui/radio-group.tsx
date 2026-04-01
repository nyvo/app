"use client"

import * as React from "react"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid gap-2", className)}
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
        "h-4 w-4 shrink-0 rounded-full border-2 border-zinc-300 bg-white",
        "data-[state=checked]:border-primary",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <div className="h-2 w-2 rounded-full bg-primary" />
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
        "relative flex items-start gap-3.5 p-4 rounded-xl text-left cursor-pointer group smooth-transition bg-white bg-clip-padding",
        "border border-zinc-200 hover:bg-zinc-50/50",
        "data-[state=checked]:border-zinc-900 data-[state=checked]:ring-1 data-[state=checked]:ring-zinc-900",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      {Icon && (
        <Icon className="h-4 w-4 mt-0.5 shrink-0 text-text-tertiary group-data-[state=checked]:text-text-primary smooth-transition" aria-hidden="true" />
      )}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-text-primary smooth-transition">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <div className="h-4 w-4 mt-0.5 shrink-0 rounded-full flex items-center justify-center smooth-transition border-2 border-zinc-300 text-transparent group-data-[state=checked]:bg-zinc-900 group-data-[state=checked]:border-zinc-900 group-data-[state=checked]:text-white">
        <RadioGroupPrimitive.Indicator>
          <Check className="h-2.5 w-2.5 text-white" aria-hidden="true" />
        </RadioGroupPrimitive.Indicator>
      </div>
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem, RadioGroupCardItem }

"use client"

import * as React from "react"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { Circle } from "lucide-react"

import { cn } from "@/lib/utils"

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Root
      className={cn("grid gap-2", className)}
      {...props}
      ref={ref}
    />
  )
})
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => {
  return (
    <RadioGroupPrimitive.Item
      ref={ref}
      className={cn(
        "aspect-square h-4 w-4 rounded-full border border-primary text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <Circle className="h-2.5 w-2.5 fill-current text-current" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
})
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName

function RadioGroupCardItem({
  className,
  icon: Icon,
  title,
  description,
  ...props
}: React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> & {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
}) {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        "relative flex items-start gap-3.5 p-4 rounded-lg text-left cursor-pointer group bg-background",
        "border border-input hover:bg-accent/50",
        "data-[state=checked]:border-primary data-[state=checked]:ring-1 data-[state=checked]:ring-primary",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      {Icon && (
        <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground group-data-[state=checked]:text-foreground transition-colors" aria-hidden="true" />
      )}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-foreground">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <div className="h-4 w-4 mt-0.5 shrink-0 rounded-full flex items-center justify-center border-2 border-input text-transparent group-data-[state=checked]:bg-primary group-data-[state=checked]:border-primary group-data-[state=checked]:text-primary-foreground transition-colors">
        <RadioGroupPrimitive.Indicator>
          <Circle className="h-2.5 w-2.5 fill-current text-current" />
        </RadioGroupPrimitive.Indicator>
      </div>
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem, RadioGroupCardItem }

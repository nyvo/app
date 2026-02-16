import * as React from 'react'
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group'
import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root
    className={cn('grid gap-2', className)}
    {...props}
    ref={ref}
  />
))
RadioGroup.displayName = RadioGroupPrimitive.Root.displayName

const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      'h-4 w-4 shrink-0 rounded-full border-2 border-zinc-300 bg-white',
      'data-[state=checked]:border-primary',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
      'disabled:pointer-events-none disabled:opacity-50',
      className
    )}
    {...props}
  >
    <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
      <div className="h-2 w-2 rounded-full bg-primary" />
    </RadioGroupPrimitive.Indicator>
  </RadioGroupPrimitive.Item>
))
RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName

interface RadioGroupCardItemProps
  extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item> {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
}

const RadioGroupCardItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  RadioGroupCardItemProps
>(({ className, icon: Icon, title, description, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex flex-col gap-3 p-5 rounded-2xl text-left cursor-pointer group smooth-transition bg-white bg-clip-padding',
      'border border-zinc-200 hover:bg-zinc-50/50',
      'data-[state=checked]:border-zinc-900 data-[state=checked]:ring-1 data-[state=checked]:ring-zinc-900 data-[state=checked]:bg-zinc-50/80',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
      'disabled:pointer-events-none disabled:opacity-50',
      className
    )}
    {...props}
  >
    <div className="flex justify-between items-start">
      {Icon && (
        <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-zinc-100 text-text-secondary border border-zinc-200 group-data-[state=checked]:bg-zinc-200 group-data-[state=checked]:text-text-primary group-data-[state=checked]:border-zinc-300 smooth-transition">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      )}
      <div className="h-5 w-5 rounded-full flex items-center justify-center smooth-transition bg-transparent border-2 border-zinc-300 text-transparent group-data-[state=checked]:bg-zinc-900 group-data-[state=checked]:border-zinc-900 group-data-[state=checked]:text-white">
        <RadioGroupPrimitive.Indicator>
          <Check className="h-3 w-3 text-white" aria-hidden="true" />
        </RadioGroupPrimitive.Indicator>
      </div>
    </div>
    <div>
      <h3 className="text-base font-medium text-text-secondary group-data-[state=checked]:text-text-primary smooth-transition">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-text-secondary mt-1 leading-relaxed">
          {description}
        </p>
      )}
    </div>
  </RadioGroupPrimitive.Item>
))
RadioGroupCardItem.displayName = 'RadioGroupCardItem'

export { RadioGroup, RadioGroupItem, RadioGroupCardItem }

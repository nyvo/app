'use client'

import * as React from 'react'
import { nb } from 'date-fns/locale'
import { format } from 'date-fns'

import { ChevronDown } from 'lucide-react'

import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DatePickerProps extends Omit<React.ComponentPropsWithoutRef<'button'>, 'value' | 'onChange'> {
  value?: Date
  onChange?: (date: Date | undefined) => void
  onBlur?: () => void
  placeholder?: string
  error?: boolean
  /** Earliest selectable date. Days before this are greyed out. */
  fromDate?: Date
  timeZone?: string
}

const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(({
  value,
  onChange,
  onBlur,
  placeholder = 'Velg dato',
  className,
  disabled,
  error,
  id,
  fromDate,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  ...buttonProps
}, ref) => {
  const [open, setOpen] = React.useState(false)

  const formatDateNorwegian = (date: Date) => {
    return format(date, 'd. MMMM yyyy', { locale: nb })
  }

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen && onBlur) {
        onBlur()
      }
    }}>
      <PopoverTrigger asChild>
        <button
          ref={ref}
          id={id}
          type="button"
          disabled={disabled}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-lg border border-input bg-surface px-4 py-2 text-[14px] font-medium text-foreground ring-offset-background transition-[background-color,border-color,color,opacity] duration-150 ease-out hover:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-input',
            !value && 'text-muted-foreground',
            error && 'border-destructive',
            className
          )}
          {...buttonProps}
        >
          <span className={cn(!value && 'text-muted-foreground')}>
            {value ? formatDateNorwegian(value) : placeholder}
          </span>
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground shrink-0', error && 'text-destructive')} />
        </button>
      </PopoverTrigger>
      <PopoverContent className='w-auto overflow-hidden p-0' align='start' showOverlay>
        <Calendar
          mode='single'
          selected={value}
          onSelect={date => {
            onChange?.(date)
            setOpen(false)
          }}
          locale={nb}
          timeZone={timeZone}
          disabled={fromDate ? { before: fromDate } : undefined}
          classNames={{
            root: "w-full max-w-[350px]",
            months: "relative flex flex-col gap-4",
            month: "flex flex-col gap-5",
            weekdays: "flex justify-between",
            weekday: "text-muted-foreground w-11 text-center text-xs font-normal",
            week: "flex justify-between w-full mt-1",
            day: "h-11 w-11 p-0 text-center",
          }}
        />
      </PopoverContent>
    </Popover>
  )
})

DatePicker.displayName = 'DatePicker'

export { DatePicker }

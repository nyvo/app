'use client'

import * as React from 'react'
import { nb } from 'date-fns/locale'
import { format } from 'date-fns'

import { ChevronDown } from '@/lib/icons'

import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

type IconType = React.ComponentType<{ className?: string; strokeWidth?: number }>

interface DatePickerProps extends Omit<React.ComponentPropsWithoutRef<'button'>, 'value' | 'onChange'> {
  value?: Date
  onChange?: (date: Date | undefined) => void
  onBlur?: () => void
  placeholder?: string
  error?: boolean
  /** Earliest selectable date. Days before this are greyed out. */
  fromDate?: Date
  timeZone?: string
  /** Optional leading icon rendered before the value span. */
  icon?: IconType
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
  icon: Icon,
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
          aria-invalid={error || undefined}
          className={cn(
            'flex h-11 w-full items-center justify-between gap-2.5 rounded-xl border border-border bg-surface px-4 text-base text-foreground outline-none transition-[color,border-color,box-shadow] duration-150 ease-out focus-visible:border-foreground focus-visible:ring-2 focus-visible:ring-foreground/15 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50 aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger/20',
            !value && 'text-foreground-muted',
            className
          )}
          {...buttonProps}
        >
          {Icon && (
            <Icon className="size-5 shrink-0 text-foreground-subtle" strokeWidth={1.75} />
          )}
          <span className={cn('flex-1 text-left', !value && 'text-foreground-muted')}>
            {value ? formatDateNorwegian(value) : placeholder}
          </span>
          <ChevronDown className={cn('size-4 shrink-0 text-foreground-muted', error && 'text-danger')} />
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
          weekStartsOn={1}
          timeZone={timeZone}
          disabled={fromDate ? { before: fromDate } : undefined}
        />
      </PopoverContent>
    </Popover>
  )
})

DatePicker.displayName = 'DatePicker'

export { DatePicker }

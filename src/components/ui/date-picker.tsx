'use client'

import { useState } from 'react'
import { nb } from 'date-fns/locale'
import { format } from 'date-fns'

import { ChevronDown } from 'lucide-react'

import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  onBlur?: () => void
  placeholder?: string
  className?: string
  disabled?: boolean
  error?: boolean
  id?: string
}

const DatePicker = ({
  value,
  onChange,
  onBlur,
  placeholder = 'Velg dato',
  className,
  disabled,
  error,
  id
}: DatePickerProps) => {
  const [open, setOpen] = useState(false)

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
          id={id}
          type="button"
          disabled={disabled}
          className={cn(
            // Base styles matching Input component
            'h-11 w-full rounded-xl border border-border bg-input-bg px-4 text-sm text-text-primary',
            'flex items-center justify-between',
            // Hover state matching Input
            'hover:border-ring ios-ease',
            // Focus state matching Input
            'focus:border-ring focus:outline-none focus:ring-4 focus:ring-border/30 focus:bg-white',
            // Placeholder style when no value
            !value && 'text-text-tertiary',
            // Disabled state
            'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
            // Error state
            error && 'border-destructive',
            className
          )}
        >
          <span className={cn(!value && 'text-text-tertiary')}>
            {value ? formatDateNorwegian(value) : placeholder}
          </span>
          <ChevronDown className={cn('h-4 w-4 text-text-tertiary shrink-0', error && 'text-destructive')} />
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
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }

'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Clock, ChevronDown } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { fetchBookedTimesForDate, type BookedTimeSlot } from '@/services/courses'

interface TimePickerProps {
  value?: string                      // "HH:MM" format
  onChange?: (time: string) => void
  onBlur?: () => void
  date?: Date                         // Date to check conflicts
  organizationId?: string             // For fetching bookings
  excludeCourseId?: string            // Course ID to exclude from booked check (for editing existing courses)
  duration?: number                   // Course duration for overlap calc (default: 60)
  interval?: 15 | 30 | 60             // Minute intervals (default: 15)
  minTime?: string                    // Earliest selectable time "06:00"
  maxTime?: string                    // Latest selectable time "22:00"
  placeholder?: string
  disabled?: boolean
  error?: boolean
  className?: string
  id?: string
  'aria-label'?: string
}

// Time period definitions
type Period = 'morning' | 'midday' | 'afternoon' | 'evening'

const periods: Record<Period, { label: string; startHour: number; endHour: number }> = {
  morning: { label: 'Morgen', startHour: 6, endHour: 9 },
  midday: { label: 'Formiddag', startHour: 9, endHour: 12 },
  afternoon: { label: 'Ettermiddag', startHour: 12, endHour: 17 },
  evening: { label: 'Kveld', startHour: 17, endHour: 23 }
}

// Get period for a given hour
function getPeriod(hour: number): Period {
  if (hour < 9) return 'morning'
  if (hour < 12) return 'midday'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

// Helper to convert time string to minutes since midnight
function timeToMinutes(time: string): number {
  if (!time || !time.includes(':')) return 0
  const [h, m] = time.split(':').map(x => parseInt(x, 10))
  if (isNaN(h) || isNaN(m)) return 0
  return h * 60 + m
}

// Generate all time slots
function generateTimeSlots(minTime: string, maxTime: string, interval: number): string[] {
  const slots: string[] = []
  const startMins = timeToMinutes(minTime)
  const endMins = timeToMinutes(maxTime)

  for (let mins = startMins; mins <= endMins; mins += interval) {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)
  }
  return slots
}

// Check if a time slot conflicts with booked slots
function isTimeSlotBooked(
  slotTime: string,
  slotDuration: number,
  bookedSlots: BookedTimeSlot[]
): BookedTimeSlot | null {
  const slotStart = timeToMinutes(slotTime)
  const slotEnd = slotStart + slotDuration

  for (const booked of bookedSlots) {
    const bookedStart = timeToMinutes(booked.startTime)
    const bookedEnd = timeToMinutes(booked.endTime)

    // Two slots overlap if: start1 < end2 AND start2 < end1
    if (slotStart < bookedEnd && bookedStart < slotEnd) {
      return booked
    }
  }
  return null
}

// Slot state interface
interface SlotState {
  time: string
  hour: number
  isBooked: boolean
  bookedBy?: string
  isSelected: boolean
  period: Period
}

const TimePicker = ({
  value,
  onChange,
  onBlur,
  date,
  organizationId,
  excludeCourseId,
  duration = 60,
  interval = 15,
  minTime = '06:00',
  maxTime = '22:00',
  placeholder = 'Velg tid',
  disabled,
  error,
  className,
  id,
  'aria-label': ariaLabel
}: TimePickerProps) => {
  const [open, setOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState<number>(-1)
  const [bookedSlots, setBookedSlots] = useState<BookedTimeSlot[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showBottomShadow, setShowBottomShadow] = useState(true)
  const [announcement, setAnnouncement] = useState('')

  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const slotRefs = useRef<Map<number, HTMLButtonElement>>(new Map())

  // Generate all time slots
  const timeSlots = useMemo(
    () => generateTimeSlots(minTime, maxTime, interval),
    [minTime, maxTime, interval]
  )

  // Compute slot states
  const slotStates = useMemo<SlotState[]>(() =>
    timeSlots.map(time => {
      const hour = parseInt(time.split(':')[0], 10)
      const booked = isTimeSlotBooked(time, duration, bookedSlots)
      return {
        time,
        hour,
        isBooked: !!booked,
        bookedBy: booked?.courseTitle,
        isSelected: time === value,
        period: getPeriod(hour)
      }
    }),
    [timeSlots, bookedSlots, value, duration]
  )

  // Find indices
  const selectedIndex = slotStates.findIndex(s => s.isSelected)
  const firstAvailableIndex = slotStates.findIndex(s => !s.isBooked)
  const allBooked = slotStates.length > 0 && slotStates.every(s => s.isBooked)

  // Group slots by period for rendering
  const slotsByPeriod = useMemo(() => {
    const groups: { period: Period; label: string; slots: (SlotState & { index: number })[] }[] = []
    let currentPeriod: Period | null = null

    slotStates.forEach((slot, index) => {
      if (slot.period !== currentPeriod) {
        currentPeriod = slot.period
        groups.push({
          period: slot.period,
          label: periods[slot.period].label,
          slots: []
        })
      }
      groups[groups.length - 1].slots.push({ ...slot, index })
    })

    return groups
  }, [slotStates])

  // Fetch booked times when date or organization changes
  useEffect(() => {
    if (!date || !organizationId) {
      setBookedSlots([])
      return
    }

    const fetchBooked = async () => {
      setIsLoading(true)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`

      const { data } = await fetchBookedTimesForDate(organizationId, dateStr, excludeCourseId)
      setBookedSlots(data || [])
      setIsLoading(false)
    }

    fetchBooked()
  }, [date, organizationId, excludeCourseId])

  // Scroll to index helper
  const scrollToIndex = useCallback((index: number) => {
    const element = slotRefs.current.get(index)
    if (element && listRef.current) {
      const listRect = listRef.current.getBoundingClientRect()
      const elementRect = element.getBoundingClientRect()

      // Check if element is outside visible area
      if (elementRect.top < listRect.top || elementRect.bottom > listRect.bottom) {
        element.scrollIntoView({ block: 'center', behavior: 'auto' })
      }
    }
  }, [])

  // On open: scroll to selected or first available
  useEffect(() => {
    if (open && listRef.current) {
      const targetIndex = selectedIndex >= 0 ? selectedIndex : firstAvailableIndex
      if (targetIndex >= 0) {
        // Small delay to ensure DOM is ready
        requestAnimationFrame(() => {
          scrollToIndex(targetIndex)
          setFocusedIndex(targetIndex)
        })
      }
    }
  }, [open, selectedIndex, firstAvailableIndex, scrollToIndex])

  // Reset focus when closing
  useEffect(() => {
    if (!open) {
      setFocusedIndex(-1)
    }
  }, [open])

  // Handle popover open/close with blur callback
  const handleOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen && onBlur) {
      onBlur()
    }
  }, [onBlur])

  // Handle slot selection
  const handleSelect = useCallback((time: string) => {
    onChange?.(time)
    setAnnouncement(`Valgt tid: ${time}`)
    setOpen(false)
  }, [onChange])

  // Handle scroll for shadow indicator
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    setShowBottomShadow(scrollTop + clientHeight < scrollHeight - 10)
  }, [])

  // Find next/previous available slot
  const findNextAvailable = useCallback((fromIndex: number, direction: 1 | -1): number => {
    let idx = fromIndex + direction
    while (idx >= 0 && idx < slotStates.length) {
      if (!slotStates[idx].isBooked) return idx
      idx += direction
    }
    return fromIndex // Stay at current if no available found
  }, [slotStates])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        const nextIndex = findNextAvailable(focusedIndex, 1)
        setFocusedIndex(nextIndex)
        scrollToIndex(nextIndex)
        break

      case 'ArrowUp':
        e.preventDefault()
        const prevIndex = findNextAvailable(focusedIndex, -1)
        setFocusedIndex(prevIndex)
        scrollToIndex(prevIndex)
        break

      case 'Home':
        e.preventDefault()
        if (firstAvailableIndex >= 0) {
          setFocusedIndex(firstAvailableIndex)
          scrollToIndex(firstAvailableIndex)
        }
        break

      case 'End':
        e.preventDefault()
        // Find last available
        for (let i = slotStates.length - 1; i >= 0; i--) {
          if (!slotStates[i].isBooked) {
            setFocusedIndex(i)
            scrollToIndex(i)
            break
          }
        }
        break

      case 'Enter':
      case ' ':
        e.preventDefault()
        if (focusedIndex >= 0 && !slotStates[focusedIndex].isBooked) {
          handleSelect(slotStates[focusedIndex].time)
        }
        break

      case 'Escape':
        e.preventDefault()
        setOpen(false)
        triggerRef.current?.focus()
        break
    }
  }, [open, focusedIndex, findNextAvailable, scrollToIndex, firstAvailableIndex, slotStates, handleSelect])

  // Unique ID for ARIA
  const listboxId = id ? `${id}-listbox` : 'time-picker-listbox'

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          id={id}
          type="button"
          disabled={disabled}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-label={ariaLabel || 'Velg starttid'}
          className={cn(
            'h-11 w-full rounded-xl border border-border bg-input-bg px-4 text-sm text-text-primary',
            'flex items-center justify-between',
            'hover:border-ring ios-ease',
            'focus:border-ring focus:outline-none focus:ring-4 focus:ring-border/30 focus:bg-white',
            !value && 'text-text-tertiary',
            'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive',
            className
          )}
        >
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-text-tertiary" />
            <span className={cn(!value && 'text-text-tertiary')}>
              {value || placeholder}
            </span>
          </span>
          <ChevronDown className={cn('h-4 w-4 text-text-tertiary shrink-0', error && 'text-destructive')} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[220px] p-0 overflow-hidden"
        align="start"
        showOverlay
        onKeyDown={handleKeyDown}
      >
        {/* Screen reader announcement */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {announcement}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-sm text-text-tertiary">Laster</span>
          </div>
        ) : allBooked ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
              <Clock className="h-5 w-5 text-text-tertiary" />
            </div>
            <p className="text-sm font-medium text-text-primary">Ingen ledige tider</p>
            <p className="text-xs text-text-secondary mt-1">
              Alle tider er opptatt denne dagen
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Jump to next available link */}
            {firstAvailableIndex > 8 && (
              <button
                type="button"
                onClick={() => {
                  scrollToIndex(firstAvailableIndex)
                  setFocusedIndex(firstAvailableIndex)
                }}
                className="w-full px-3 py-2.5 text-xs text-text-secondary hover:text-text-primary border-b border-border flex items-center justify-center gap-1.5 bg-surface-elevated group"
              >
                <span>Hopp til neste ledige</span>
                <span className="font-medium text-text-primary bg-white border border-border rounded-md px-2 py-0.5 group-hover:border-ring group-hover:bg-gray-50 transition-colors">
                  {slotStates[firstAvailableIndex]?.time}
                </span>
                <ChevronDown className="h-3 w-3 text-text-tertiary group-hover:text-text-primary transition-colors" />
              </button>
            )}

            <div
              ref={listRef}
              role="listbox"
              id={listboxId}
              aria-label="Tilgjengelige tider"
              aria-activedescendant={focusedIndex >= 0 ? `time-option-${focusedIndex}` : undefined}
              className="max-h-[320px] overflow-y-auto"
              onScroll={handleScroll}
            >
              {slotsByPeriod.map((group) => (
                <div key={group.period}>
                  {/* Period header */}
                  <div className="sticky top-0 bg-surface-elevated px-3 py-1.5 text-xs font-medium text-text-tertiary border-b border-border z-10">
                    {group.label}
                  </div>

                  {/* Time slots grid */}
                  <div className="p-2 grid grid-cols-2 gap-1.5">
                    {group.slots.map(({ time, isBooked, bookedBy, isSelected, index }) => {
                      const isFocused = focusedIndex === index
                      // Build descriptive aria-label for screen readers
                      const slotLabel = isBooked
                        ? `${time}, opptatt${bookedBy ? ` av ${bookedBy}` : ''}`
                        : isSelected
                          ? `${time}, valgt`
                          : `${time}, ledig`

                      return (
                        <button
                          key={time}
                          ref={(el) => {
                            if (el) slotRefs.current.set(index, el)
                            else slotRefs.current.delete(index)
                          }}
                          type="button"
                          role="option"
                          id={`time-option-${index}`}
                          aria-selected={isSelected}
                          aria-disabled={isBooked}
                          aria-label={slotLabel}
                          tabIndex={isFocused ? 0 : -1}
                          disabled={isBooked}
                          onClick={() => !isBooked && handleSelect(time)}
                          onMouseEnter={() => setFocusedIndex(index)}
                          title={bookedBy ? `Opptatt: ${bookedBy}` : undefined}
                          className={cn(
                            'px-3 py-2 text-sm font-medium rounded-lg transition-all ios-ease outline-none',
                            // Selected state
                            isSelected && 'bg-text-primary text-white',
                            // Available state
                            !isSelected && !isBooked && 'bg-white border border-border text-text-primary hover:bg-surface-elevated hover:border-ring',
                            // Focused state (keyboard nav)
                            isFocused && !isSelected && !isBooked && 'ring-2 ring-ring',
                            // Disabled/booked state
                            isBooked && 'bg-muted/50 text-text-tertiary cursor-not-allowed line-through decoration-text-tertiary/50'
                          )}
                        >
                          {time}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Scroll shadow indicator */}
            {showBottomShadow && (
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

export { TimePicker, isTimeSlotBooked }

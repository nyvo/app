'use client'

import { useState, useRef, useCallback, useEffect, useId } from 'react'
import { cn } from '@/lib/utils'

interface TimePicker24hProps {
  value: string                          // "HH:MM" format
  onChange: (time: string) => void
  onBlur?: () => void
  disabled?: boolean
  error?: boolean
  className?: string
  id?: string
  'aria-label'?: string
}

/**
 * 24-hour segmented time picker with two numeric fields (HH : MM).
 * Auto-advances focus from hours to minutes after a complete entry.
 * Strictly 24-hour: hours 00-23, minutes 00-59.
 *
 * Uses local state to buffer keystrokes and only emits to the parent
 * when a segment is finalized (complete entry or blur).
 */
function TimePicker24h({
  value,
  onChange,
  onBlur,
  disabled,
  error,
  className,
  id,
  'aria-label': ariaLabel,
}: TimePicker24hProps) {
  const generatedId = useId()
  const inputId = id || generatedId

  const hourRef = useRef<HTMLInputElement>(null)
  const minuteRef = useRef<HTMLInputElement>(null)

  // Track whether a segment is being actively edited.
  // While editing, we ignore external value syncs so the useEffect
  // doesn't clobber what the user is mid-typing.
  const editingRef = useRef<'hour' | 'minute' | null>(null)

  // Parse initial value into local state
  const parseValue = (v: string) => {
    if (!v) return { h: '', m: '' }
    const parts = v.split(':')
    return { h: parts[0] || '', m: parts[1] || '' }
  }

  const [hourText, setHourText] = useState(() => parseValue(value).h)
  const [minuteText, setMinuteText] = useState(() => parseValue(value).m)

  // Sync from parent only when not actively editing
  useEffect(() => {
    if (editingRef.current) return
    const { h, m } = parseValue(value)
    setHourText(h)
    setMinuteText(m)
  }, [value])

  // Build and emit the full "HH:MM" string to the parent
  const emit = useCallback((h: string, m: string) => {
    const hh = h ? h.padStart(2, '0') : ''
    const mm = m ? m.padStart(2, '0') : ''
    if (hh && mm) {
      onChange(`${hh}:${mm}`)
    } else if (hh) {
      onChange(`${hh}:00`)
    } else if (mm) {
      onChange(`00:${mm}`)
    } else {
      onChange('')
    }
  }, [onChange])

  const clamp = useCallback((val: string, max: number): string => {
    const num = parseInt(val, 10)
    if (isNaN(num)) return '00'
    return Math.min(Math.max(0, num), max).toString().padStart(2, '0')
  }, [])

  // Finalize a segment: pad, clamp, emit, and clear editing lock
  const finalizeHour = useCallback((h: string, m: string) => {
    const clamped = h ? clamp(h, 23) : ''
    setHourText(clamped)
    emit(clamped, m)
    editingRef.current = null
  }, [clamp, emit])

  const finalizeMinute = useCallback((h: string, m: string) => {
    const clamped = m ? clamp(m, 59) : ''
    setMinuteText(clamped)
    emit(h, clamped)
    editingRef.current = null
  }, [clamp, emit])

  // Focus a ref and select its contents on the next tick
  const focusAndSelect = useCallback((ref: React.RefObject<HTMLInputElement | null>) => {
    // Use requestAnimationFrame so React has committed the state update
    // and the input value is current before we select
    requestAnimationFrame(() => {
      ref.current?.focus()
      ref.current?.select()
    })
  }, [])

  // --- Hour ---
  const handleHourChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    editingRef.current = 'hour'
    const raw = e.target.value.replace(/\D/g, '').slice(0, 2)

    if (raw === '') {
      setHourText('')
      return
    }

    const num = parseInt(raw, 10)

    // Single digit 3-9 can only be 03-09. Finalize and advance.
    if (raw.length === 1 && num >= 3) {
      const padded = `0${raw}`
      setHourText(padded)
      emit(padded, minuteText)
      editingRef.current = null
      focusAndSelect(minuteRef)
      return
    }

    // Two digits entered: clamp, finalize, advance to minutes
    if (raw.length === 2) {
      const clamped = clamp(raw, 23)
      setHourText(clamped)
      emit(clamped, minuteText)
      editingRef.current = null
      focusAndSelect(minuteRef)
      return
    }

    // Single digit 0-2: buffer it, wait for the second keystroke
    setHourText(raw)
  }, [minuteText, emit, clamp, focusAndSelect])

  const handleHourFocus = useCallback(() => {
    editingRef.current = 'hour'
  }, [])

  const handleHourBlur = useCallback(() => {
    finalizeHour(hourText, minuteText)
    onBlur?.()
  }, [hourText, minuteText, finalizeHour, onBlur])

  const handleHourKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      const cur = parseInt(hourText, 10) || 0
      const next = e.key === 'ArrowUp' ? (cur + 1) % 24 : (cur - 1 + 24) % 24
      const padded = next.toString().padStart(2, '0')
      setHourText(padded)
      emit(padded, minuteText)
    }
    if (e.key === 'ArrowRight' && e.currentTarget.selectionStart === e.currentTarget.value.length) {
      e.preventDefault()
      focusAndSelect(minuteRef)
    }
    if (e.key === ':') {
      e.preventDefault()
      finalizeHour(hourText, minuteText)
      focusAndSelect(minuteRef)
    }
  }, [hourText, minuteText, emit, finalizeHour, focusAndSelect])

  // --- Minute ---
  const handleMinuteChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    editingRef.current = 'minute'
    const raw = e.target.value.replace(/\D/g, '').slice(0, 2)

    if (raw === '') {
      setMinuteText('')
      return
    }

    const num = parseInt(raw, 10)

    // Single digit 6-9 can only be 06-09. Finalize.
    if (raw.length === 1 && num >= 6) {
      const padded = `0${raw}`
      setMinuteText(padded)
      emit(hourText, padded)
      editingRef.current = null
      minuteRef.current?.blur()
      return
    }

    // Two digits: clamp and finalize
    if (raw.length === 2) {
      const clamped = clamp(raw, 59)
      setMinuteText(clamped)
      emit(hourText, clamped)
      editingRef.current = null
      minuteRef.current?.blur()
      return
    }

    // Single digit 0-5: buffer
    setMinuteText(raw)
  }, [hourText, emit, clamp])

  const handleMinuteFocus = useCallback(() => {
    editingRef.current = 'minute'
  }, [])

  const handleMinuteBlur = useCallback(() => {
    finalizeMinute(hourText, minuteText)
    onBlur?.()
  }, [hourText, minuteText, finalizeMinute, onBlur])

  const handleMinuteKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      const cur = parseInt(minuteText, 10) || 0
      const next = e.key === 'ArrowUp' ? (cur + 1) % 60 : (cur - 1 + 60) % 60
      const padded = next.toString().padStart(2, '0')
      setMinuteText(padded)
      emit(hourText, padded)
    }
    if (e.key === 'ArrowLeft' && e.currentTarget.selectionStart === 0) {
      e.preventDefault()
      focusAndSelect(hourRef)
    }
    if (e.key === 'Backspace' && minuteText === '') {
      e.preventDefault()
      focusAndSelect(hourRef)
    }
  }, [minuteText, hourText, emit, focusAndSelect])

  // Container click: focus the appropriate segment
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (disabled) return
    if ((e.target as HTMLElement).tagName === 'INPUT') return
    if (!hourText) {
      hourRef.current?.focus()
    } else {
      minuteRef.current?.focus()
    }
  }, [disabled, hourText])

  const hasValue = hourText || minuteText

  return (
    <div
      role="group"
      aria-label={ariaLabel || 'Velg tid'}
      className={cn(
        'inline-flex items-center h-11 rounded-lg border bg-input-bg px-4 ios-ease cursor-text',
        'hover:border-ring',
        // V2.2 Elevated Contrast: crisp 2px offset ring with soft stone color
        'focus-within:bg-white focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-400/50 focus-within:ring-offset-2 focus-within:ring-offset-white',
        disabled && 'pointer-events-none cursor-not-allowed opacity-50',
        error ? 'border-destructive' : 'border-zinc-300',
        className
      )}
      onClick={handleContainerClick}
    >
      <input
        ref={hourRef}
        id={inputId}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="TT"
        value={hourText}
        onChange={handleHourChange}
        onFocus={handleHourFocus}
        onBlur={handleHourBlur}
        onKeyDown={handleHourKeyDown}
        disabled={disabled}
        aria-label="Timer"
        className={cn(
          'w-7 text-center text-sm font-medium bg-transparent outline-none',
          'text-text-primary placeholder:text-text-tertiary',
          '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
        )}
      />

      <span
        className={cn(
          'text-sm font-medium select-none mx-0.5',
          hasValue ? 'text-text-primary' : 'text-text-tertiary'
        )}
        aria-hidden="true"
      >
        :
      </span>

      <input
        ref={minuteRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="MM"
        value={minuteText}
        onChange={handleMinuteChange}
        onFocus={handleMinuteFocus}
        onBlur={handleMinuteBlur}
        onKeyDown={handleMinuteKeyDown}
        disabled={disabled}
        aria-label="Minutter"
        className={cn(
          'w-7 text-center text-sm font-medium bg-transparent outline-none',
          'text-text-primary placeholder:text-text-tertiary',
          '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
        )}
      />
    </div>
  )
}

export { TimePicker24h }
export type { TimePicker24hProps }

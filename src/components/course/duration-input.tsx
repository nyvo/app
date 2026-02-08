'use client'

import { useState, useRef, useCallback, useEffect, useId } from 'react'
import { cn } from '@/lib/utils'

interface DurationInputProps {
  value: number | null               // Duration in minutes
  onChange: (value: number | null) => void
  onBlur?: () => void
  min?: number                       // Minimum total minutes (default: 15)
  max?: number                       // Maximum total minutes (default: 480 = 8h)
  disabled?: boolean
  error?: boolean
  className?: string
  id?: string
  'aria-label'?: string
}

/**
 * Masked duration input with separate Timer (hours) and Minutter (minutes) fields.
 * Displays Norwegian labels. Hours 0-8, Minutes 0-59.
 * Auto-advances from hours to minutes after input.
 *
 * Uses local state to buffer keystrokes and only emits to the parent
 * when a segment is finalized (complete entry or blur).
 */
function DurationInput({
  value,
  onChange,
  onBlur,
  min = 15,
  max = 480,
  disabled,
  error,
  className,
  id,
  'aria-label': ariaLabel,
}: DurationInputProps) {
  const generatedId = useId()
  const inputId = id || generatedId

  const hourRef = useRef<HTMLInputElement>(null)
  const minuteRef = useRef<HTMLInputElement>(null)

  // Track whether a segment is being actively edited.
  // While editing, we ignore external value syncs so the useEffect
  // doesn't clobber what the user is mid-typing.
  const editingRef = useRef<'hour' | 'minute' | null>(null)

  const maxHours = Math.floor(max / 60)

  // Derive initial display from parent value
  const deriveFromValue = (v: number | null) => {
    if (v === null) return { h: '', m: '' }
    const hours = Math.floor(v / 60)
    const mins = v % 60
    return { h: hours.toString(), m: mins.toString().padStart(2, '0') }
  }

  const [hourText, setHourText] = useState(() => deriveFromValue(value).h)
  const [minuteText, setMinuteText] = useState(() => deriveFromValue(value).m)

  // Sync from parent only when not actively editing
  useEffect(() => {
    if (editingRef.current) return
    const { h, m } = deriveFromValue(value)
    setHourText(h)
    setMinuteText(m)
  }, [value])

  // Emit combined value as total minutes
  const emit = useCallback((h: string, m: string) => {
    const hNum = h ? parseInt(h, 10) : null
    const mNum = m ? parseInt(m, 10) : null
    if (hNum === null && mNum === null) {
      onChange(null)
      return
    }
    const totalMinutes = ((hNum || 0) * 60) + (mNum || 0)
    onChange(totalMinutes)
  }, [onChange])

  // Clamp to min/max and return [hours, minutes]
  const clampTotal = useCallback((h: string, m: string): [string, string] => {
    const hNum = h ? parseInt(h, 10) : 0
    const mNum = m ? parseInt(m, 10) : 0
    let total = (hNum * 60) + mNum
    if (total < min) total = min
    if (total > max) total = max
    return [Math.floor(total / 60).toString(), (total % 60).toString().padStart(2, '0')]
  }, [min, max])

  // Focus a ref and select its contents on the next tick
  const focusAndSelect = useCallback((ref: React.RefObject<HTMLInputElement | null>) => {
    requestAnimationFrame(() => {
      ref.current?.focus()
      ref.current?.select()
    })
  }, [])

  // Finalize minute: clamp total, update state, emit, clear editing lock
  const finalizeMinute = useCallback((h: string, m: string) => {
    // Only clamp if we have some value
    if (h || m) {
      const [ch, cm] = clampTotal(h, m)
      setHourText(ch)
      setMinuteText(cm)
      emit(ch, cm)
    } else {
      emit('', '')
    }
    editingRef.current = null
  }, [clampTotal, emit])

  // --- Hour handlers ---
  const handleHourChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    editingRef.current = 'hour'
    const raw = e.target.value.replace(/\D/g, '')

    if (raw === '') {
      setHourText('')
      return
    }

    const num = parseInt(raw.slice(0, 1), 10)
    if (isNaN(num)) return

    // Clamp to max hours, set and emit
    const clamped = Math.min(num, maxHours).toString()
    setHourText(clamped)
    emit(clamped, minuteText)
    editingRef.current = null

    // Auto-advance to minutes
    focusAndSelect(minuteRef)
  }, [maxHours, minuteText, emit, focusAndSelect])

  const handleHourFocus = useCallback(() => {
    editingRef.current = 'hour'
  }, [])

  const handleHourBlur = useCallback(() => {
    // If we have some value, clamp total
    if (hourText || minuteText) {
      const [ch, cm] = clampTotal(hourText, minuteText)
      setHourText(ch)
      setMinuteText(cm)
      emit(ch, cm)
    }
    editingRef.current = null
    onBlur?.()
  }, [hourText, minuteText, clampTotal, emit, onBlur])

  const handleHourKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      const current = hourText ? parseInt(hourText, 10) : 0
      const next = e.key === 'ArrowUp'
        ? Math.min(current + 1, maxHours)
        : Math.max(current - 1, 0)
      const nextStr = next.toString()
      setHourText(nextStr)
      emit(nextStr, minuteText)
    }
    if (e.key === 'ArrowRight') {
      const input = e.currentTarget
      if (input.selectionStart === input.value.length) {
        e.preventDefault()
        focusAndSelect(minuteRef)
      }
    }
  }, [hourText, minuteText, maxHours, emit, focusAndSelect])

  // --- Minute handlers ---
  const handleMinuteChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    editingRef.current = 'minute'
    const raw = e.target.value.replace(/\D/g, '').slice(0, 2)

    if (raw === '') {
      setMinuteText('')
      return
    }

    const num = parseInt(raw, 10)

    // Single digit >= 6: can only be 06-09, finalize
    if (raw.length === 1 && num >= 6) {
      const padded = `0${raw}`
      setMinuteText(padded)
      emit(hourText, padded)
      editingRef.current = null
      minuteRef.current?.blur()
      return
    }

    // Two digits: clamp to 59, finalize
    if (raw.length === 2) {
      const clamped = Math.min(num, 59).toString().padStart(2, '0')
      setMinuteText(clamped)
      emit(hourText, clamped)
      editingRef.current = null
      minuteRef.current?.blur()
      return
    }

    // Single digit 0-5: buffer, wait for second keystroke
    setMinuteText(raw)
  }, [hourText, emit])

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
      const current = minuteText ? parseInt(minuteText, 10) : 0
      const next = e.key === 'ArrowUp'
        ? Math.min(current + 5, 59)
        : Math.max(current - 5, 0)
      const padded = next.toString().padStart(2, '0')
      setMinuteText(padded)
      emit(hourText, padded)
    }
    if (e.key === 'ArrowLeft') {
      const input = e.currentTarget
      if (input.selectionStart === 0) {
        e.preventDefault()
        focusAndSelect(hourRef)
      }
    }
    if (e.key === 'Backspace' && minuteText === '') {
      e.preventDefault()
      focusAndSelect(hourRef)
    }
  }, [minuteText, hourText, emit, focusAndSelect])

  // Click on the wrapper focuses the first empty segment
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (disabled) return
    if ((e.target as HTMLElement).tagName === 'INPUT') return
    if (hourText === '') {
      hourRef.current?.focus()
    } else {
      minuteRef.current?.focus()
    }
  }, [disabled, hourText])

  return (
    <div
      role="group"
      aria-label={ariaLabel || 'Varighet'}
      className={cn(
        'inline-flex items-center h-11 rounded-lg border bg-input-bg ios-ease cursor-text',
        'hover:border-ring',
        // V2.2 Elevated Contrast: crisp 2px offset ring with soft stone color
        'focus-within:bg-white focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-400/50 focus-within:ring-offset-2 focus-within:ring-offset-white',
        disabled && 'pointer-events-none cursor-not-allowed opacity-50',
        error ? 'border-destructive' : 'border-zinc-300',
        className
      )}
      onClick={handleContainerClick}
    >
      {/* Hours segment */}
      <div className="flex items-center gap-1.5 pl-4 pr-3 border-r border-border/50">
        <input
          ref={hourRef}
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          value={hourText}
          onChange={handleHourChange}
          onFocus={handleHourFocus}
          onBlur={handleHourBlur}
          onKeyDown={handleHourKeyDown}
          disabled={disabled}
          aria-label="Timer"
          className={cn(
            'w-4 text-center text-sm font-medium bg-transparent outline-none',
            'text-text-primary placeholder:text-text-tertiary',
            '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
          )}
        />
        <span className="text-xs text-text-tertiary select-none pointer-events-none whitespace-nowrap">
          timer
        </span>
      </div>

      {/* Minutes segment */}
      <div className="flex items-center gap-1.5 pl-3 pr-4">
        <input
          ref={minuteRef}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="00"
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
        <span className="text-xs text-text-tertiary select-none pointer-events-none whitespace-nowrap">
          min
        </span>
      </div>
    </div>
  )
}

export { DurationInput }
export type { DurationInputProps }

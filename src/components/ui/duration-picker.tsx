'use client'

import { useState, useEffect, useCallback, useId } from 'react'
import { Clock, ChevronDown, AlertCircle } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

// Default preset durations in minutes
const DEFAULT_PRESETS = [30, 45, 60, 75, 90, 120]

interface DurationPickerProps {
  value: number | null
  onChange: (value: number | null) => void
  presets?: number[]
  min?: number
  max?: number
  step?: number
  label?: string
  required?: boolean
  error?: string        // External error message
  showErrors?: boolean  // Control when to show errors (touched/submitted)
  disabled?: boolean
  className?: string
  id?: string
  'aria-label'?: string
}

// Format duration for display
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) {
    return `${hours} time${hours > 1 ? 'r' : ''}`
  }
  return `${hours} t ${mins} min`
}

// Check if value matches a preset
function isPresetValue(value: number | null, presets: number[]): boolean {
  return value !== null && presets.includes(value)
}

const DurationPicker = ({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
  min = 15,
  max = 240,
  step = 5,
  label,
  required,
  error: externalError,
  showErrors = true,
  disabled,
  className,
  id,
  'aria-label': ariaLabel
}: DurationPickerProps) => {
  const generatedId = useId()
  const inputId = id || generatedId
  const errorId = `${inputId}-error`
  const listboxId = `${inputId}-listbox`

  const [open, setOpen] = useState(false)
  const [isCustomMode, setIsCustomMode] = useState(false)
  const [customInputValue, setCustomInputValue] = useState('')
  const [touched, setTouched] = useState(false)

  // Determine if we're in custom mode based on value
  useEffect(() => {
    if (value === null) {
      // No value set - could be either mode
      return
    }
    if (!isPresetValue(value, presets)) {
      setIsCustomMode(true)
      setCustomInputValue(String(value))
    }
  }, [value, presets])

  // Validate custom input
  const validateCustomValue = useCallback((val: string): string | null => {
    if (!val.trim()) {
      return required ? 'Oppgi varighet' : null
    }
    const num = parseInt(val, 10)
    if (isNaN(num)) {
      return 'Oppgi varighet'
    }
    if (num < min) {
      return `Minst ${min} min`
    }
    if (num > max) {
      return `Maks ${max} min`
    }
    if (step > 1 && num % step !== 0) {
      return `Bruk intervaller på ${step} min`
    }
    return null
  }, [min, max, step, required])

  // Internal validation error (for custom mode)
  const internalError = isCustomMode ? validateCustomValue(customInputValue) : null

  // Combined error message
  const errorMessage = externalError || internalError
  const shouldShowError = showErrors && touched && errorMessage

  // Handle preset selection
  const handlePresetSelect = useCallback((preset: number) => {
    setIsCustomMode(false)
    setCustomInputValue('')
    onChange(preset)
    setOpen(false)
  }, [onChange])

  // Handle custom option selection
  const handleCustomSelect = useCallback(() => {
    setIsCustomMode(true)
    // If current value is valid, prefill the input
    if (value !== null) {
      setCustomInputValue(String(value))
    }
    setOpen(false)
    // Focus will be handled by the input appearing
  }, [value])

  // Handle custom input change
  const handleCustomInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setCustomInputValue(val)

    // Validate and update parent value
    const num = parseInt(val, 10)
    if (!isNaN(num) && num >= min && num <= max) {
      onChange(num)
    } else if (val === '') {
      onChange(null)
    }
  }, [onChange, min, max])

  // Handle custom input blur
  const handleCustomInputBlur = useCallback(() => {
    setTouched(true)

    // Round to step if needed
    const num = parseInt(customInputValue, 10)
    if (!isNaN(num) && step > 1) {
      const rounded = Math.round(num / step) * step
      const clamped = Math.max(min, Math.min(max, rounded))
      setCustomInputValue(String(clamped))
      onChange(clamped)
    }
  }, [customInputValue, step, min, max, onChange])

  // Handle popover close
  const handleOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setTouched(true)
    }
  }, [])

  // Display value for trigger button
  const displayValue = value !== null ? formatDuration(value) : null

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground"
        >
          {label}
          {required && <span className="text-destructive">*</span>}
        </label>
      )}

      {isCustomMode ? (
        // Custom input mode
        <div className="relative">
          <input
            id={inputId}
            type="number"
            inputMode="numeric"
            placeholder="Minutter"
            value={customInputValue}
            onChange={handleCustomInputChange}
            onBlur={handleCustomInputBlur}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            aria-required={required}
            aria-invalid={shouldShowError ? 'true' : undefined}
            aria-describedby={shouldShowError ? errorId : undefined}
            className={cn(
              'h-11 w-full rounded-xl border bg-input-bg pl-4 pr-16 text-sm text-text-primary',
              'placeholder:text-text-tertiary',
              'focus:border-ring focus:outline-none focus:ring-4 focus:ring-border/30 focus:bg-white',
              'hover:border-ring ios-ease',
              'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
              '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
              shouldShowError ? 'border-destructive' : 'border-border'
            )}
          />
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
            <span className={cn(
              'text-xs',
              shouldShowError ? 'text-destructive' : 'text-muted-foreground'
            )}>
              min
            </span>
          </div>
          {/* Button to switch back to preset mode */}
          <button
            type="button"
            onClick={() => {
              setIsCustomMode(false)
              if (value !== null && isPresetValue(value, presets)) {
                // Keep the value
              } else {
                // Clear if not a preset
                setCustomInputValue('')
              }
            }}
            className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-text-tertiary hover:text-text-secondary transition-colors"
            aria-label="Velg fra liste"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      ) : (
        // Dropdown mode
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <button
              id={inputId}
              type="button"
              disabled={disabled}
              role="combobox"
              aria-haspopup="listbox"
              aria-expanded={open}
              aria-controls={listboxId}
              aria-label={ariaLabel || label || 'Velg varighet'}
              aria-required={required}
              aria-invalid={shouldShowError ? 'true' : undefined}
              aria-describedby={shouldShowError ? errorId : undefined}
              className={cn(
                'h-11 w-full rounded-xl border bg-input-bg px-4 text-sm text-text-primary',
                'flex items-center justify-between',
                'hover:border-ring ios-ease',
                'focus:border-ring focus:outline-none focus:ring-4 focus:ring-border/30 focus:bg-white',
                'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
                !displayValue && 'text-text-tertiary',
                shouldShowError ? 'border-destructive' : 'border-border'
              )}
            >
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-text-tertiary" />
                <span className={cn(!displayValue && 'text-text-tertiary')}>
                  {displayValue || 'Velg varighet'}
                </span>
              </span>
              <ChevronDown className={cn(
                'h-4 w-4 shrink-0',
                shouldShowError ? 'text-destructive' : 'text-text-tertiary'
              )} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] p-1"
            align="start"
          >
            <div
              role="listbox"
              id={listboxId}
              aria-label="Tilgjengelige varigheter"
              className="flex flex-col"
            >
              {presets.map((preset) => {
                const isSelected = value === preset
                return (
                  <button
                    key={preset}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handlePresetSelect(preset)}
                    className={cn(
                      'flex items-center justify-between px-3 py-2.5 text-sm rounded-lg ios-ease',
                      'hover:bg-surface-elevated',
                      isSelected && 'bg-surface-elevated font-medium text-text-primary',
                      !isSelected && 'text-text-secondary'
                    )}
                  >
                    <span>{formatDuration(preset)}</span>
                    {isSelected && (
                      <span className="h-2 w-2 rounded-full bg-text-primary" />
                    )}
                  </button>
                )
              })}

              {/* Divider */}
              <div className="my-1 h-px bg-border" />

              {/* Custom option */}
              <button
                type="button"
                role="option"
                aria-selected={isCustomMode}
                onClick={handleCustomSelect}
                className={cn(
                  'flex items-center px-3 py-2.5 text-sm rounded-lg ios-ease',
                  'hover:bg-surface-elevated text-text-secondary'
                )}
              >
                Egendefinert…
              </button>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Error message */}
      {shouldShowError && (
        <p
          id={errorId}
          className="flex items-center gap-1 text-xs text-destructive"
          role="alert"
        >
          <AlertCircle className="h-3 w-3" aria-hidden="true" />
          {errorMessage}
        </p>
      )}
    </div>
  )
}

export { DurationPicker, formatDuration }
export type { DurationPickerProps }

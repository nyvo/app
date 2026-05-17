import { useState } from 'react'
import { Eye, EyeOff, Check } from '@/lib/icons'
import { Input } from '@/components/ui/input'
import { FieldError } from '@/components/ui/field-error'

interface AuthFormFieldProps {
  id: string
  label: string
  type?: 'text' | 'email' | 'password'
  value: string
  error?: React.ReactNode
  touched?: boolean
  placeholder?: string
  /** Helper text shown below input when there is no error */
  hint?: string
  /** Text shown when hintMet is true (defaults to hint value) */
  hintMetText?: string
  /** Whether the hint requirement has been satisfied */
  hintMet?: boolean
  onChange: (value: string) => void
  onBlur: () => void
  /** Slot rendered inline with the label (e.g., forgot-password link) */
  labelExtra?: React.ReactNode
}

/**
 * Standardised auth form field. Handles label, input, error display,
 * aria-invalid propagation, and show/hide toggle for password fields.
 *
 * Uses shadcn preset tokens: semantic label styles, Input with
 * border-border, aria-invalid for error styling.
 */
export function AuthFormField({
  id,
  label,
  type = 'text',
  value,
  error,
  touched,
  placeholder,
  hint,
  hintMetText,
  hintMet,
  onChange,
  onBlur,
  labelExtra,
}: AuthFormFieldProps) {
  const [showPassword, setShowPassword] = useState(false)
  const hasError = !!(touched && error)
  const isPassword = type === 'password'
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          data-error={hasError || undefined}
          className="text-sm font-medium block text-foreground data-[error=true]:text-danger"
        >
          {label}
        </label>
        {labelExtra}
      </div>

      <div className={isPassword ? 'relative' : undefined}>
        <Input
          type={inputType}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? `${id}-error` : hint ? `${id}-hint` : undefined}
          placeholder={placeholder}
          className={isPassword ? 'pr-10' : undefined}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors"
            aria-label={showPassword ? 'Skjul passord' : 'Vis passord'}
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        )}
      </div>

      {hasError ? (
        <FieldError id={`${id}-error`} className="mt-0">{error}</FieldError>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-foreground-muted flex items-center gap-1 transition-colors duration-200">
          {hintMet && <Check className="size-3.5" />}
          {hintMet ? (hintMetText ?? hint) : hint}
        </p>
      ) : null}
    </div>
  )
}

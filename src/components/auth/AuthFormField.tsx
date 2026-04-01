import { useState } from 'react'
import { Eye, EyeOff, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'

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
 * Follows DESIGN_SYSTEM.md: label text-xs font-medium text-text-secondary,
 * Input with border-zinc-300, aria-invalid for error styling.
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
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="block text-xs font-medium text-text-secondary"
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
          placeholder={placeholder}
          className={isPassword ? 'pr-10' : undefined}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
            tabIndex={-1}
            aria-label={showPassword ? 'Skjul passord' : 'Vis passord'}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {hasError ? (
        <p role="alert" className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className={`text-xs flex items-center gap-1 transition-colors duration-200 ${hintMet ? 'text-text-tertiary' : 'text-text-secondary'}`}>
          {hintMet && <Check className="w-3 h-3" />}
          {hintMet ? (hintMetText ?? hint) : hint}
        </p>
      ) : null}
    </div>
  )
}

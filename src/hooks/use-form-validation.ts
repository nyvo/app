import { useState, useCallback } from 'react'

export interface FieldRule<T> {
  validate: (value: string, formData: T) => string | undefined
}

export interface UseFormValidationConfig<T extends Record<string, unknown>> {
  initialValues: T
  rules: Partial<Record<keyof T, FieldRule<T>>>
}

export function useFormValidation<T extends Record<string, unknown>>(
  config: UseFormValidationConfig<T>
) {
  const { initialValues, rules } = config

  const [formData, setFormData] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Partial<Record<keyof T | 'general', string>>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const validateField = useCallback(
    (field: keyof T) => {
      const rule = rules[field]
      if (!rule) return

      setErrors((prev) => {
        const newErrors = { ...prev }
        const errorMessage = rule.validate(
          String(formData[field] ?? ''),
          formData
        )
        if (errorMessage) {
          newErrors[field] = errorMessage
        } else {
          delete newErrors[field]
        }
        return newErrors
      })
    },
    [formData, rules]
  )

  const handleChange = useCallback(
    (field: keyof T, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
      setErrors((prev) => {
        if (prev[field]) {
          const next = { ...prev }
          delete next[field]
          return next
        }
        return prev
      })
    },
    []
  )

  const handleBlur = useCallback(
    (field: keyof T) => {
      setTouched((prev) => ({ ...prev, [String(field)]: true }))
      validateField(field)
    },
    [validateField]
  )

  const validateForm = useCallback(() => {
    const newErrors: Partial<Record<keyof T | 'general', string>> = {}
    const allTouched: Record<string, boolean> = {}

    for (const field of Object.keys(rules) as Array<keyof T>) {
      allTouched[String(field)] = true
      const rule = rules[field]
      if (rule) {
        const errorMessage = rule.validate(
          String(formData[field] ?? ''),
          formData
        )
        if (errorMessage) {
          newErrors[field] = errorMessage
        }
      }
    }

    setErrors(newErrors)
    setTouched(allTouched)
    return Object.keys(newErrors).length === 0
  }, [formData, rules])

  const resetForm = useCallback(() => {
    setFormData(initialValues)
    setErrors({})
    setTouched({})
  }, [initialValues])

  return {
    formData,
    errors,
    touched,
    setFormData,
    setErrors,
    handleChange,
    handleBlur,
    validateField,
    validateForm,
    resetForm,
  }
}

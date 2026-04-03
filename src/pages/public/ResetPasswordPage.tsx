import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { supabase } from '@/lib/supabase'
import { useFormValidation } from '@/hooks/use-form-validation'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { AuthFormField } from '@/components/auth/AuthFormField'
import { AUTH_ROUTES } from '@/lib/auth-routes'
import { AUTH_VALIDATION, AUTH_ERRORS, AUTH_PLACEHOLDERS } from '@/lib/auth-messages'

const ROUTES = AUTH_ROUTES.teacher

const ResetPasswordPage = () => {
  const { formData, errors, touched, setErrors, handleChange, handleBlur, validateField, validateForm } =
    useFormValidation({
      initialValues: { password: '', confirmPassword: '' },
      rules: {
        password: {
          validate: (value) => {
            if (!value.trim()) return AUTH_VALIDATION.passwordNewRequired
            if (value.length < 8) return AUTH_VALIDATION.passwordMinLength
            return undefined
          },
        },
        confirmPassword: {
          validate: (value, fd) => {
            if (!value.trim()) return AUTH_VALIDATION.passwordConfirmRequired
            if (fd.password !== value) return AUTH_VALIDATION.passwordMismatch
            return undefined
          },
        },
      },
    })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null)

  // Check if user has valid reset session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error || !session) {
        setIsValidSession(false)
        return
      }
      setIsValidSession(true)
    }
    checkSession()
  }, [])

  // Re-validate confirmPassword when password changes
  const handlePasswordChange = (value: string) => {
    handleChange('password', value)
    if (touched.confirmPassword) {
      setTimeout(() => validateField('confirmPassword'), 0)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)
    setErrors({})

    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.password,
      })

      if (error) {
        setErrors({ general: AUTH_ERRORS.passwordNotUpdated })
        setIsSubmitting(false)
        return
      }

      setResetSuccess(true)
      setIsSubmitting(false)
    } catch {
      setErrors({ general: AUTH_ERRORS.generic })
      setIsSubmitting(false)
    }
  }

  // Loading state
  if (isValidSession === null) {
    return (
      <div className="min-h-screen w-full bg-background text-foreground antialiased flex items-center justify-center">
        <Spinner size="xl" />
      </div>
    )
  }

  // Invalid/expired session
  if (isValidSession === false) {
    return (
      <AuthLayout context="teacher" title="" customContent>
        <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-surface-subtle">
          <AlertCircle className="size-8 text-status-error-text" />
        </div>

        <div className="text-center mb-8 space-y-2 w-full">
          <h1 className="type-heading-1 text-foreground">
            Ugyldig lenke
          </h1>
          <p className="type-body text-muted-foreground">
            Lenken er utløpt eller fungerer ikke.
          </p>
        </div>

        <div className="w-full space-y-3">
          <Button asChild className="w-full h-11">
            <Link to={ROUTES.forgotPassword}>Be om ny lenke</Link>
          </Button>
          <Button asChild variant="outline-soft" className="w-full h-11">
            <Link to={ROUTES.login}>Til innlogging</Link>
          </Button>
        </div>
      </AuthLayout>
    )
  }

  // Success state
  if (resetSuccess) {
    return (
      <AuthLayout context="teacher" title="" customContent>
        <div className="mb-6 flex size-16 items-center justify-center rounded-full bg-surface-subtle">
          <CheckCircle2 className="size-8 text-status-confirmed-text" />
        </div>

        <div className="text-center mb-8 space-y-2 w-full">
          <h1 className="type-heading-1 text-foreground">
            Passordet er oppdatert
          </h1>
          <p className="type-body text-muted-foreground">
            Du kan nå logge inn med det nye passordet.
          </p>
        </div>

        <div className="w-full">
          <Button asChild className="w-full h-11">
            <Link to={ROUTES.login}>Gå til innlogging</Link>
          </Button>
        </div>
      </AuthLayout>
    )
  }

  // Form state
  return (
    <AuthLayout
      context="teacher"
      title="Tilbakestill passord"
      subtitle="Velg et nytt passord."
      footer={
        <p className="type-meta text-muted-foreground">
          Trenger du hjelp?
        </p>
      }
    >
      <form className="w-full space-y-5" onSubmit={handleSubmit}>
        <AuthFormField
          id="password"
          label="Nytt passord"
          type="password"
          value={formData.password}
          error={errors.password}
          touched={touched.password}
          placeholder={AUTH_PLACEHOLDERS.passwordMin}
          onChange={handlePasswordChange}
          onBlur={() => handleBlur('password')}
        />

        <AuthFormField
          id="confirmPassword"
          label="Gjenta passord"
          type="password"
          value={formData.confirmPassword}
          error={errors.confirmPassword}
          touched={touched.confirmPassword}
          placeholder={AUTH_PLACEHOLDERS.confirmPassword}
          onChange={(v) => handleChange('confirmPassword', v)}
          onBlur={() => handleBlur('confirmPassword')}
        />

        <div className="rounded-lg bg-surface-muted p-3">
          <p className="type-meta mb-1 text-muted-foreground">Krav</p>
          <ul className="type-meta ml-3 space-y-0.5 text-muted-foreground">
            <li className="list-disc">Minst 8 tegn</li>
          </ul>
        </div>

        {errors.general && (
          <Alert variant="destructive" size="sm">
            <p className="type-meta text-destructive">{errors.general}</p>
          </Alert>
        )}

        <Button
          type="submit"
          loading={isSubmitting}
          loadingText="Oppdaterer"
          className="w-full h-11 mt-2"
        >
          Oppdater passord
        </Button>
      </form>
    </AuthLayout>
  )
}

export default ResetPasswordPage

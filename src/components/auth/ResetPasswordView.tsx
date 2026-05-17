import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { supabase } from '@/lib/supabase'
import { useFormValidation } from '@/hooks/use-form-validation'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { AuthFormField } from '@/components/auth/AuthFormField'
import { AUTH_ROUTES } from '@/lib/auth-routes'
import { AUTH_VALIDATION, AUTH_ERRORS, AUTH_PLACEHOLDERS, AUTH_HINTS } from '@/lib/auth-messages'

export const ResetPasswordView = () => {
  const routes = AUTH_ROUTES

  // NIST 2024+: single password field, no confirm. Show-toggle on
  // AuthFormField replaces the confirm-field rationale (§ 21.2 / 21.6).
  const { formData, errors, touched, setErrors, handleChange, handleBlur, validateForm } =
    useFormValidation({
      initialValues: { password: '' },
      rules: {
        password: {
          validate: (value) => {
            if (!value.trim()) return AUTH_VALIDATION.passwordNewRequired
            if (value.length < 12) return AUTH_VALIDATION.passwordMinLength
            return undefined
          },
        },
      },
    })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null)

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

  if (isValidSession === null) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Laster"
        className="min-h-screen w-full bg-background text-foreground antialiased flex items-center justify-center"
      >
        <Spinner size="xl" />
      </div>
    )
  }

  if (isValidSession === false) {
    return (
      <AuthLayout title="" customContent>
        <div className="text-center space-y-2 w-full">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground max-w-md">
            Ugyldig lenke
          </h1>
          <p className="text-sm text-foreground-muted max-w-md">
            Lenken er utløpt eller fungerer ikke.
          </p>
        </div>

        <div className="mt-7 w-full">
          <Button asChild size="cta" className="w-full">
            <Link to={routes.forgotPassword}>Be om ny lenke</Link>
          </Button>
        </div>

        <Link
          to={routes.login}
          className="mt-3 text-sm text-foreground-muted underline decoration-foreground-muted/40 underline-offset-2 hover:decoration-foreground-muted"
        >
          eller gå til innlogging →
        </Link>
      </AuthLayout>
    )
  }

  if (resetSuccess) {
    return (
      <AuthLayout title="" customContent>
        <div className="text-center mb-8 space-y-2 w-full">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Passordet er oppdatert
          </h1>
          <p className="text-sm text-foreground-muted">
            Du kan nå logge inn med det nye passordet.
          </p>
        </div>

        <div className="w-full">
          <Button asChild size="cta" className="w-full">
            <Link to={routes.login}>Gå til innlogging</Link>
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Tilbakestill passord"
      subtitle="Velg et nytt passord."
      footer={
        <p className="text-xs text-foreground-muted">
          Trenger du hjelp? Send en e-post til{' '}
          <a
            href="mailto:hei@openspot.no"
            className="text-foreground underline decoration-foreground-disabled underline-offset-2 hover:decoration-foreground"
          >
            hei@openspot.no
          </a>
          .
        </p>
      }
    >
      <form className="w-full space-y-6" onSubmit={handleSubmit}>
        <AuthFormField
          id="password"
          label="Nytt passord"
          type="password"
          value={formData.password}
          error={errors.password}
          touched={touched.password}
          placeholder={AUTH_PLACEHOLDERS.passwordMin}
          hint={AUTH_HINTS.passwordMinLength}
          hintMet={formData.password.length >= 12}
          onChange={(v) => handleChange('password', v)}
          onBlur={() => handleBlur('password')}
        />

        {errors.general && (
          <Alert variant="error" size="sm">
            {errors.general}
          </Alert>
        )}

        <Button
          type="submit"
          loading={isSubmitting}
          loadingText="Oppdaterer"
          size="cta" className="w-full mt-2"
        >
          Oppdater passord
        </Button>
      </form>
    </AuthLayout>
  )
}

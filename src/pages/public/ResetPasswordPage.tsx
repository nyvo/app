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
      <div className="min-h-screen w-full bg-surface text-text-primary font-geist antialiased flex items-center justify-center">
        <Spinner size="xl" />
      </div>
    )
  }

  // Invalid/expired session
  if (isValidSession === false) {
    return (
      <AuthLayout context="teacher" title="" customContent>
        <div className="w-16 h-16 rounded-full bg-status-error-bg flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-status-error-text" />
        </div>

        <div className="text-center mb-8 space-y-2 w-full">
          <h1 className="text-2xl font-medium tracking-tight text-text-primary">
            Ugyldig lenke
          </h1>
          <p className="text-text-secondary text-sm">
            Lenken er utløpt eller fungerer ikke.
          </p>
        </div>

        <div className="w-full space-y-3">
          <Button asChild className="w-full h-11">
            <Link to={ROUTES.forgotPassword}>Be om ny lenke</Link>
          </Button>
          <Button asChild variant="outline" className="w-full h-11">
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
        <div className="w-16 h-16 rounded-full bg-status-confirmed-bg flex items-center justify-center mb-6">
          <CheckCircle2 className="w-8 h-8 text-status-confirmed-text" />
        </div>

        <div className="text-center mb-8 space-y-2 w-full">
          <h1 className="text-2xl font-medium tracking-tight text-text-primary">
            Passordet er oppdatert
          </h1>
          <p className="text-text-secondary text-sm">
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
      backTo={ROUTES.login}
      footer={
        <p className="text-xs text-text-secondary">
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

        <div className="p-3 rounded-lg bg-surface-elevated">
          <p className="text-xs text-text-secondary font-medium mb-1">Krav</p>
          <ul className="text-xs text-text-secondary space-y-0.5 ml-3">
            <li className="list-disc">Minst 8 tegn</li>
          </ul>
        </div>

        {errors.general && (
          <Alert variant="destructive" size="sm">
            <p className="text-xs text-destructive">{errors.general}</p>
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

import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { useAuth } from '@/contexts/AuthContext'
import { useFormValidation } from '@/hooks/use-form-validation'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { AuthFormField } from '@/components/auth/AuthFormField'
import { AUTH_ROUTES } from '@/lib/auth-routes'
import { AUTH_VALIDATION, AUTH_ERRORS, AUTH_PLACEHOLDERS } from '@/lib/auth-messages'
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton'
import { Separator } from '@/components/ui/separator'
import { isValidEmail } from '@/lib/utils'

const ROUTES = AUTH_ROUTES.teacher

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, user, isLoading: authLoading } = useAuth()

  const prefillEmail = (location.state as { email?: string } | null)?.email ?? ''

  const { formData, errors, touched, setFormData, setErrors, handleChange, handleBlur, validateForm } =
    useFormValidation({
      initialValues: { email: prefillEmail, password: '' },
      rules: {
        email: {
          validate: (value) => {
            if (!value.trim()) return AUTH_VALIDATION.emailRequired
            if (!isValidEmail(value)) return AUTH_VALIDATION.emailInvalid
            return undefined
          },
        },
        password: {
          validate: (value) => {
            if (!value.trim()) return AUTH_VALIDATION.passwordRequired
            return undefined
          },
        },
      },
    })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (user && !authLoading) {
      navigate(ROUTES.dashboard)
    }
  }, [user, authLoading, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)
    setErrors({})

    try {
      const { error } = await signIn(formData.email, formData.password)

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setErrors({ general: AUTH_ERRORS.invalidCredentials })
        } else if (error.message.includes('Email not confirmed')) {
          navigate(ROUTES.confirmEmail, { state: { email: formData.email } })
          return
        } else if (error.message.includes('rate') || (error as { status?: number }).status === 429) {
          setErrors({ general: AUTH_ERRORS.rateLimited })
        } else {
          setErrors({ general: AUTH_ERRORS.generic })
        }
        setFormData(prev => ({ ...prev, password: '' }))
        setIsSubmitting(false)
        return
      }

      navigate(ROUTES.dashboard)
    } catch {
      setErrors({ general: AUTH_ERRORS.generic })
      setFormData(prev => ({ ...prev, password: '' }))
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      context="teacher"
      title="Velkommen tilbake"
      subtitle="Logg inn for å fortsette til oversikten."
      footer={
        <p className="text-xs font-medium tracking-wide text-muted-foreground">
          Har du ikke konto?{' '}
          <Link to={ROUTES.signup} className="text-sm font-medium text-foreground hover:underline">
            Opprett konto
          </Link>
        </p>
      }
    >
      <div className="w-full space-y-5">
        <GoogleAuthButton redirectTo={`${window.location.origin}/teacher`} />

        <div className="flex items-center gap-3" aria-hidden="true">
          <Separator className="flex-1" />
          <span className="text-xs font-medium tracking-wide text-muted-foreground">eller</span>
          <Separator className="flex-1" />
        </div>
      </div>

      <form className="w-full space-y-5" onSubmit={handleSubmit}>
        <AuthFormField
          id="email"
          label="E-post"
          type="email"
          value={formData.email}
          error={errors.email}
          touched={touched.email}
          placeholder={AUTH_PLACEHOLDERS.email}
          onChange={(v) => handleChange('email', v)}
          onBlur={() => handleBlur('email')}
        />

        <AuthFormField
          id="password"
          label="Passord"
          type="password"
          value={formData.password}
          error={errors.password}
          touched={touched.password}
          placeholder={AUTH_PLACEHOLDERS.password}
          onChange={(v) => handleChange('password', v)}
          onBlur={() => handleBlur('password')}
          labelExtra={
            <Link
              to={ROUTES.forgotPassword}
              className="text-xs font-medium tracking-wide text-muted-foreground transition-colors hover:text-foreground"
            >
              Glemt passord?
            </Link>
          }
        />

        {errors.general && (
          <Alert variant="destructive" size="sm">
            <p className="text-xs font-medium tracking-wide text-destructive">{errors.general}</p>
            {errors.general === AUTH_ERRORS.invalidCredentials && (
              <Link
                to={ROUTES.forgotPassword}
                className="text-xs font-medium tracking-wide mt-1.5 inline-block text-destructive underline hover:text-destructive/80"
              >
                Tilbakestill passord
              </Link>
            )}
          </Alert>
        )}

        <Button
          type="submit"
          loading={isSubmitting}
          loadingText="Logger inn"
          className="w-full h-11 mt-2"
        >
          Logg inn
        </Button>
      </form>
    </AuthLayout>
  )
}

export default LoginPage

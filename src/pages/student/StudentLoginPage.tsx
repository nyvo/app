import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { useAuth } from '@/contexts/AuthContext'
import { useFormValidation } from '@/hooks/use-form-validation'
import { linkGuestBookings } from '@/services/studentSignups'
import { logger } from '@/lib/logger'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { AuthFormField } from '@/components/auth/AuthFormField'
import { AUTH_ROUTES } from '@/lib/auth-routes'
import { AUTH_VALIDATION, AUTH_ERRORS, AUTH_PLACEHOLDERS } from '@/lib/auth-messages'
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton'

const ROUTES = AUTH_ROUTES.student

const StudentLoginPage = () => {
  const navigate = useNavigate()
  const { signIn, user, userType } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { formData, errors, touched, setErrors, setFormData, handleChange, handleBlur, validateForm } =
    useFormValidation({
      initialValues: { email: '', password: '' },
      rules: {
        email: {
          validate: (value) => {
            if (!value.trim()) return AUTH_VALIDATION.emailRequired
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return AUTH_VALIDATION.emailInvalid
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

  // Redirect already-authenticated users to their dashboard
  useEffect(() => {
    if (user && userType === 'student') {
      navigate(ROUTES.dashboard, { replace: true })
    } else if (user && userType === 'teacher') {
      navigate(AUTH_ROUTES.teacher.dashboard, { replace: true })
    }
  }, [user, userType, navigate])

  // Link guest bookings after user logs in
  useEffect(() => {
    async function linkBookings() {
      if (!user?.id) return

      try {
        await linkGuestBookings()
      } catch (err) {
        logger.warn('Failed to link guest bookings:', err)
      }
    }

    linkBookings()
  }, [user?.id])

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

      // Success — navigation handled by useEffect when userType is set
    } catch {
      setErrors({ general: AUTH_ERRORS.generic })
      setFormData(prev => ({ ...prev, password: '' }))
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      context="student"
      title="Velkommen tilbake"
      subtitle="Logg inn for å se kursene dine."
      backTo="/"
      footer={
        <p className="text-xs text-text-secondary">
          Har du ikke konto?{' '}
          <Link to={ROUTES.signup} className="text-text-primary font-medium hover:underline">
            Opprett konto
          </Link>
        </p>
      }
    >
      <div className="w-full space-y-5">
        <GoogleAuthButton redirectTo={`${window.location.origin}/student/dashboard`} />

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-zinc-200" />
          <span className="text-xs text-text-tertiary">eller</span>
          <div className="flex-1 h-px bg-zinc-200" />
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
              className="text-xs text-text-secondary hover:text-text-primary transition-colors"
            >
              Glemt passord?
            </Link>
          }
        />

        {errors.general && (
          <Alert variant="destructive" size="sm">
            <p className="text-xs text-destructive">{errors.general}</p>
            {errors.general === AUTH_ERRORS.invalidCredentials && (
              <Link
                to={ROUTES.forgotPassword}
                className="text-xs text-destructive underline hover:text-destructive/80 mt-1.5 inline-block"
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

export default StudentLoginPage

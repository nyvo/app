import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { useAuth } from '@/contexts/AuthContext'
import { useFormValidation } from '@/hooks/use-form-validation'
import { linkGuestBookings } from '@/services/studentSignups'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { AuthFormField } from '@/components/auth/AuthFormField'
import { AUTH_ROUTES } from '@/lib/auth-routes'
import { AUTH_VALIDATION, AUTH_ERRORS, AUTH_PLACEHOLDERS, AUTH_HINTS } from '@/lib/auth-messages'
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton'

const ROUTES = AUTH_ROUTES.student

const StudentRegisterPage = () => {
  const navigate = useNavigate()
  const { signUp, user, userType } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { formData, errors, touched, setErrors, handleChange, handleBlur, validateForm } =
    useFormValidation({
      initialValues: { fullName: '', email: '', password: '' },
      rules: {
        fullName: {
          validate: (value) => {
            if (!value.trim()) return AUTH_VALIDATION.nameRequired
            return undefined
          },
        },
        email: {
          validate: (value) => {
            if (!value.trim()) return AUTH_VALIDATION.emailRequired
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return AUTH_VALIDATION.emailInvalid
            return undefined
          },
        },
        password: {
          validate: (value) => {
            if (!value.trim()) return AUTH_VALIDATION.passwordNewRequired
            if (value.length < 8) return AUTH_VALIDATION.passwordMinLength
            return undefined
          },
        },
      },
    })

  // Redirect already-authenticated users
  useEffect(() => {
    if (user && userType) {
      if (userType === 'student') {
        navigate(ROUTES.dashboard, { replace: true })
      } else if (userType === 'teacher') {
        navigate(AUTH_ROUTES.teacher.dashboard, { replace: true })
      }
    }
  }, [user, userType, navigate])

  // Link guest bookings after user is created
  useEffect(() => {
    async function linkBookings() {
      if (!user?.id) return

      try {
        await linkGuestBookings()
      } catch {
        // Silent fail — guest booking linking is not critical
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
      const { error } = await signUp(formData.email, formData.password, formData.fullName)

      if (error) {
        if (error.message.includes('already registered')) {
          setErrors({
            email: (
              <>
                {AUTH_ERRORS.emailAlreadyRegistered}.{' '}
                <Link to={ROUTES.login} state={{ email: formData.email }} className="underline hover:text-text-primary">
                  Logg inn her
                </Link>
              </>
            ),
          })
        } else {
          setErrors({ general: AUTH_ERRORS.accountNotCreated })
        }
        setIsSubmitting(false)
        return
      }

      // Email confirmation is disabled — session is created immediately.
      // Navigation happens via useEffect when userType is set.
    } catch {
      setErrors({ general: AUTH_ERRORS.generic })
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      context="student"
      title="Opprett konto"
      subtitle="Opprett en konto for å melde deg på kurs og holde oversikt over påmeldingene dine."
      footer={
        <p className="text-xs text-text-secondary">
          Har du allerede en konto?{' '}
          <Link to={ROUTES.login} className="text-text-primary font-medium hover:underline">
            Logg inn
          </Link>
        </p>
      }
    >
      <div className="w-full space-y-5">
        <GoogleAuthButton redirectTo={`${window.location.origin}/student/dashboard`} />

        <div className="flex items-center gap-3" aria-hidden="true">
          <div className="flex-1 h-px bg-zinc-200" />
          <span className="text-xs text-text-tertiary">eller</span>
          <div className="flex-1 h-px bg-zinc-200" />
        </div>
      </div>

      <form className="w-full space-y-5" onSubmit={handleSubmit}>
        <AuthFormField
          id="fullName"
          label="Navn"
          type="text"
          value={formData.fullName}
          error={errors.fullName}
          touched={touched.fullName}
          placeholder={AUTH_PLACEHOLDERS.fullName}
          onChange={(v) => handleChange('fullName', v)}
          onBlur={() => handleBlur('fullName')}
        />

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
          hint={AUTH_HINTS.passwordMinLength}
          hintMet={formData.password.length >= 8}
          onChange={(v) => handleChange('password', v)}
          onBlur={() => handleBlur('password')}
        />

        {errors.general && (
          <Alert variant="destructive" size="sm">
            <p className="text-xs text-destructive">{errors.general}</p>
          </Alert>
        )}

        <Button
          type="submit"
          loading={isSubmitting}
          loadingText="Oppretter konto"
          className="w-full h-11 mt-2"
        >
          Opprett konto
        </Button>

        <p className="text-center text-xs text-text-secondary pt-2">
          Ved å opprette konto godtar du{' '}
          <Link to="/terms" className="underline hover:text-text-primary">
            vilkår
          </Link>
          .
        </p>
      </form>
    </AuthLayout>
  )
}

export default StudentRegisterPage

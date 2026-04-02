import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { useAuth } from '@/contexts/AuthContext'
import { useFormValidation } from '@/hooks/use-form-validation'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { AuthFormField } from '@/components/auth/AuthFormField'
import { AUTH_ROUTES } from '@/lib/auth-routes'
import { AUTH_VALIDATION, AUTH_ERRORS, AUTH_PLACEHOLDERS, AUTH_HINTS } from '@/lib/auth-messages'
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton'
import { Separator } from '@/components/ui/separator'

const ROUTES = AUTH_ROUTES.teacher

const SignupPage = () => {
  const navigate = useNavigate()
  const { signUp, user, isLoading: authLoading, currentOrganization } = useAuth()

  const [isSubmitting, setIsSubmitting] = useState(false)

  const { formData, errors, touched, setErrors, handleChange, handleBlur, validateForm } =
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
            if (!value.trim()) return AUTH_VALIDATION.passwordNewRequired
            if (value.length < 8) return AUTH_VALIDATION.passwordMinLength
            return undefined
          },
        },
      },
    })

  // Redirect if already logged in with org
  useEffect(() => {
    if (user && !authLoading && currentOrganization) {
      navigate(ROUTES.dashboard, { replace: true })
    }
  }, [user, authLoading, currentOrganization, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsSubmitting(true)
    setErrors({})

    try {
      const { error: signUpError } = await signUp(formData.email, formData.password)

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setErrors({
            email: (
              <>
                {AUTH_ERRORS.emailAlreadyRegistered}.{' '}
                <Link to={ROUTES.login} state={{ email: formData.email }} className="underline hover:text-foreground">
                  Logg inn her
                </Link>
              </>
            ),
          })
        } else {
          setErrors({ general: 'Kunne ikke opprette konto. Prøv igjen.' })
        }
        setIsSubmitting(false)
        return
      }

      // Account created — navigate to dashboard.
      // The welcome flow will handle org creation + profile setup.
      navigate(ROUTES.dashboard, { replace: true })
    } catch {
      setErrors({ general: AUTH_ERRORS.generic })
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      context="teacher"
      title="Opprett din konto"
      subtitle="Administrer kurs, motta påmeldinger, og ta betalt — helt gratis."
      footer={
        <p className="text-xs text-muted-foreground">
          Har du allerede en konto?{' '}
          <Link to={ROUTES.login} className="text-foreground font-medium hover:underline">
            Logg inn
          </Link>
        </p>
      }
    >
      <div className="w-full space-y-5">
        <GoogleAuthButton redirectTo={`${window.location.origin}/teacher`} />

        <div className="flex items-center gap-3" aria-hidden="true">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">eller</span>
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

        <p className="text-center text-xs text-muted-foreground pt-2">
          Ved å opprette konto godtar du{' '}
          <Link to="/terms" className="underline hover:text-foreground">
            vilkår
          </Link>
          .
        </p>
      </form>
    </AuthLayout>
  )
}

export default SignupPage

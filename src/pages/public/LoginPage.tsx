import { Link, useNavigate, useLocation, type Location } from 'react-router-dom'
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
import { isValidEmail } from '@/lib/utils'
import { toast } from 'sonner'

const ROUTES = AUTH_ROUTES

/**
 * Login surface — universal (no role split, per § 21.1).
 *
 * Magic link is the primary auth path (Notion / Figma research, § 21.4).
 * Identifier-first: user types email, then chooses "Send link" (default) or
 * reveals the password fallback for accounts that opted into a password.
 */
const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, sendMagicLink, user, isLoading: authLoading } = useAuth()

  const locationState = location.state as { email?: string; from?: Location } | null
  const prefillEmail = locationState?.email ?? ''
  const redirectAfterLogin = locationState?.from?.pathname ?? ROUTES.dashboard

  // Step state for identifier-first reveal:
  //   'identify' = email only, magic-link primary, password reveal link
  //   'password' = email + password (fallback path)
  //   'sent'     = confirmation that magic link was sent
  const [step, setStep] = useState<'identify' | 'password' | 'sent'>('identify')

  const { formData, errors, touched, setFormData, setErrors, handleChange, handleBlur, validateField, validateForm } =
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
            if (step !== 'password') return undefined
            if (!value.trim()) return AUTH_VALIDATION.passwordRequired
            return undefined
          },
        },
      },
    })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (user && !authLoading) {
      navigate(redirectAfterLogin, { replace: true })
    }
  }, [user, authLoading, navigate, redirectAfterLogin])

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()

    // Only validate email at this step
    setErrors({})
    const emailError = !formData.email.trim()
      ? AUTH_VALIDATION.emailRequired
      : !isValidEmail(formData.email)
        ? AUTH_VALIDATION.emailInvalid
        : undefined
    if (emailError) {
      setErrors({ email: emailError })
      return
    }

    setIsSubmitting(true)
    try {
      const redirectOrigin = `${window.location.origin}${ROUTES.callback}`
      const { error } = await sendMagicLink(formData.email, redirectOrigin)

      if (error) {
        if (error.message.includes('rate') || (error as { status?: number }).status === 429) {
          setErrors({ general: AUTH_ERRORS.rateLimited })
        } else {
          setErrors({ general: AUTH_ERRORS.generic })
        }
        setIsSubmitting(false)
        return
      }

      setStep('sent')
      setIsSubmitting(false)
    } catch {
      setErrors({ general: AUTH_ERRORS.generic })
      setIsSubmitting(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
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

      navigate(redirectAfterLogin, { replace: true })
    } catch {
      setErrors({ general: AUTH_ERRORS.generic })
      setFormData(prev => ({ ...prev, password: '' }))
      setIsSubmitting(false)
    }
  }

  // After magic link sent — neutral confirmation per § 21.4
  if (step === 'sent') {
    return (
      <AuthLayout
        title=""
        customContent
        footer={
          <p className="text-xs text-foreground-muted">
            <button
              type="button"
              onClick={() => setStep('identify')}
              className="text-sm font-medium text-foreground hover:underline"
            >
              Bruk en annen e-post
            </button>
          </p>
        }
      >
        <div className="mb-8 w-full space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Sjekk e-posten din
          </h1>
          <p className="text-sm text-foreground-muted">
            Vi sendte en lenke til{' '}
            <span className="text-foreground">{formData.email}</span>.
            Klikk den i samme nettleser for å logge inn.
          </p>
        </div>

        <div className="w-full space-y-3">
          <Alert variant="neutral" size="sm">
            {AUTH_HINTS.checkSpam}
          </Alert>

          <Button
            onClick={async () => {
              const redirectOrigin = `${window.location.origin}${ROUTES.dashboard}`
              const { error } = await sendMagicLink(formData.email, redirectOrigin)
              if (error) {
                toast.error(AUTH_ERRORS.generic)
              } else {
                toast.success('Lenke sendt på nytt')
              }
            }}
            variant="outline-soft"
            size="cta"
            className="w-full"
          >
            Send på nytt
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Logg inn"
      subtitle="Bruk Google, eller send deg selv en lenke på e-post."
      footer={
        <p className="text-xs text-foreground-muted">
          Har du ikke konto?{' '}
          <Link to={ROUTES.signup} className="text-sm font-medium text-foreground hover:underline">
            Opprett konto
          </Link>
        </p>
      }
    >
      <div className="w-full">
        <GoogleAuthButton redirectTo={`${window.location.origin}${redirectAfterLogin}`} />
      </div>

      <div className="my-6 flex items-center gap-3" aria-hidden="true">
        <Separator className="flex-1" />
        <span className="text-xs text-foreground-muted">eller</span>
        <Separator className="flex-1" />
      </div>

      {step === 'identify' ? (
        <form className="w-full space-y-6" onSubmit={handleMagicLink}>
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

          {errors.general && (
            <Alert variant="destructive" size="sm">
              {errors.general}
            </Alert>
          )}

          <Button
            type="submit"
            loading={isSubmitting}
            loadingText="Sender lenke"
            size="cta"
            className="w-full"
          >
            Send innloggingslenke
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setStep('password')}
              className="text-sm text-foreground-muted hover:text-foreground transition-colors"
            >
              Logg inn med passord i stedet
            </button>
          </div>
        </form>
      ) : (
        <form className="w-full space-y-6" onSubmit={handlePasswordSubmit}>
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
            onBlur={() => {
              handleBlur('password')
              validateField('password')
            }}
            labelExtra={
              <Link
                to={ROUTES.forgotPassword}
                className="text-xs text-foreground-muted transition-colors hover:text-foreground"
              >
                Glemt passord?
              </Link>
            }
          />

          {errors.general && (
            <Alert variant="destructive" size="sm">
              {errors.general}
            </Alert>
          )}

          <Button
            type="submit"
            loading={isSubmitting}
            loadingText="Logger inn"
            size="cta"
            className="w-full"
          >
            Logg inn
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setStep('identify')
                setErrors({})
                setFormData(prev => ({ ...prev, password: '' }))
              }}
              className="inline-flex items-center text-sm text-foreground-muted hover:text-foreground transition-colors"
            >
              Tilbake til e-postlenke
            </button>
          </div>
        </form>
      )}
    </AuthLayout>
  )
}

export default LoginPage

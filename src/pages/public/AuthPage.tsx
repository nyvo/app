import { Link, useNavigate, useLocation, useSearchParams, type Location } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Eye, EyeOff, Check, ChevronLeft } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { FieldError } from '@/components/ui/field-error'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { useFormValidation } from '@/hooks/use-form-validation'
import { AuthLayout } from '@/components/auth/AuthLayout'
import {
  AUTH_ROUTES,
  parseAuthIntent,
  resolvePostAuthDestination,
  sanitizeNextPath,
} from '@/lib/auth-routes'
import { AUTH_VALIDATION, AUTH_ERRORS } from '@/lib/auth-messages'
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton'
import { supabase } from '@/lib/supabase'
import { isValidEmail } from '@/lib/utils'

const ROUTES = AUTH_ROUTES

/** Live password-requirement row — neutral filled disc when met, empty ring when not. */
function Rule({ met, children }: { met: boolean; children: React.ReactNode }) {
  return (
    <li
      className={`flex items-center gap-2.5 text-sm transition-colors ${
        met ? 'text-foreground' : 'text-foreground-muted'
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
          met ? 'border-foreground bg-foreground' : 'border-border bg-transparent'
        }`}
      >
        {met && <Check className="size-2.5 text-background" strokeWidth={3} />}
      </span>
      {children}
    </li>
  )
}

/**
 * Combined auth surface — EMAIL-FIRST (§ auth rework).
 *
 * Step 1 identifies the email; a SECURITY DEFINER RPC (check_email_auth_status)
 * then routes to exactly the right step 2:
 *   • unknown email        → "Lag et passord" (sign up, rules enforced)
 *   • exists + has password → "Skriv inn passordet" (sign in)
 *   • exists, no password   → login code (Google / magic-link legacy — one code
 *                             screen, no false "you used Google")
 *
 * The code screen is shared but context-framed: signup confirmation reads as
 * "Bekreft e-posten din", code-login as "Logg inn med kode".
 */
const AuthPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const {
    sendMagicLink,
    signInWithPassword,
    signUpWithPassword,
    checkEmailAuthStatus,
    user,
    profile,
    isLoading: authLoading,
  } = useAuth()

  const locationState = location.state as { email?: string; from?: Location } | null
  const prefillEmail = locationState?.email ?? ''
  const intent = parseAuthIntent(searchParams.get('intent'))
  const fromLocation = locationState?.from
  const redirectAfterLogin =
    sanitizeNextPath(searchParams.get('next')) ??
    (fromLocation ? `${fromLocation.pathname}${fromLocation.search ?? ''}` : null) ??
    ROUTES.dashboard
  const callbackUrl = `${window.location.origin}${ROUTES.callback}?next=${encodeURIComponent(redirectAfterLogin)}${intent ? `&intent=${intent}` : ''}`

  // 3 surfaces: identify (email) → password (sign in / sign up) → code.
  const [step, setStep] = useState<'identify' | 'password' | 'code'>('identify')
  const [accountMode, setAccountMode] = useState<'signup' | 'signin'>('signin')

  const { formData, errors, touched, setErrors, handleChange, handleBlur, validateForm } =
    useFormValidation({
      initialValues: { email: prefillEmail },
      rules: {
        email: {
          validate: (value) => {
            if (!value.trim()) return AUTH_VALIDATION.emailRequired
            if (!isValidEmail(value.trim())) return AUTH_VALIDATION.emailInvalid
            return undefined
          },
        },
      },
    })

  const [password, setPasswordValue] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const rules = {
    length: password.length >= 8,
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  }
  const passwordValid = rules.length && rules.number && rules.special

  // Code-entry state. `reason` picks the OTP type + framing; `hasPasswordFallback`
  // shows "Bruk passord i stedet" only when the user actually has a password.
  const [code, setCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)
  const [codeCtx, setCodeCtx] = useState<{
    reason: 'confirm' | 'login'
    hasPasswordFallback: boolean
  }>({ reason: 'login', hasPasswordFallback: false })

  const email = formData.email.trim().toLowerCase()

  useEffect(() => {
    if (user && !authLoading && profile) {
      navigate(resolvePostAuthDestination(profile, redirectAfterLogin, intent), { replace: true })
    }
  }, [user, profile, authLoading, navigate, redirectAfterLogin, intent])

  // Auto-verify once all 6 digits are entered.
  useEffect(() => {
    if (code.length !== 6) return
    let cancelled = false
    setIsVerifying(true)
    setVerifyError(null)
    ;(async () => {
      const otpType = codeCtx.reason === 'confirm' ? 'signup' : 'email'
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: otpType })
      if (cancelled) return
      if (error) {
        setVerifyError(AUTH_ERRORS.invalidOrExpiredCode)
        setCode('')
        setIsVerifying(false)
        return
      }
      setIsVerifying(false)
      // success → AuthContext.onAuthStateChange fires → navigate effect runs
    })()
    return () => {
      cancelled = true
    }
  }, [code, email, codeCtx])

  const rateOrGeneric = (error: Error) =>
    error.message.includes('rate') || (error as { status?: number }).status === 429
      ? AUTH_ERRORS.rateLimited
      : AUTH_ERRORS.generic

  const goToCode = (ctx: { reason: 'confirm' | 'login'; hasPasswordFallback: boolean }) => {
    setCode('')
    setVerifyError(null)
    setCodeCtx(ctx)
    setStep('code')
  }

  // Step 1 — identify the email, then route to the right step 2.
  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    if (!validateForm()) return
    setIsSubmitting(true)
    try {
      const { exists, hasPassword, error } = await checkEmailAuthStatus(email)
      if (error) {
        toast.error(AUTH_ERRORS.generic)
        setIsSubmitting(false)
        return
      }
      setPasswordValue('')
      setPasswordError(null)
      if (!exists) {
        setAccountMode('signup')
        setStep('password')
        setIsSubmitting(false)
        return
      }
      if (hasPassword) {
        setAccountMode('signin')
        setStep('password')
        setIsSubmitting(false)
        return
      }
      // exists, no password (Google / magic-link legacy) → login code.
      const { error: otpErr } = await sendMagicLink(email, callbackUrl, { shouldCreateUser: false })
      if (otpErr) {
        toast.error(rateOrGeneric(otpErr))
        setIsSubmitting(false)
        return
      }
      goToCode({ reason: 'login', hasPasswordFallback: false })
      setIsSubmitting(false)
    } catch {
      toast.error(AUTH_ERRORS.generic)
      setIsSubmitting(false)
    }
  }

  // Step 2 — submit the password (create or sign in).
  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setPasswordError(null)
    if (!password) {
      setPasswordError('Skriv inn passord')
      return
    }
    setIsSubmitting(true)
    try {
      if (accountMode === 'signup') {
        if (!passwordValid) {
          setPasswordError('Passordet oppfyller ikke kravene under')
          setIsSubmitting(false)
          return
        }
        const { error, needsConfirmation } = await signUpWithPassword(email, password, callbackUrl)
        if (error) {
          toast.error(rateOrGeneric(error))
          setIsSubmitting(false)
          return
        }
        if (needsConfirmation) {
          goToCode({ reason: 'confirm', hasPasswordFallback: false })
          setIsSubmitting(false)
        }
        // else session created → keep loading until the navigate effect fires
        return
      }
      const { error } = await signInWithPassword(email, password)
      if (error) {
        setPasswordError('Passordet stemmer ikke.')
        setIsSubmitting(false)
        return
      }
      // success → keep loading until the navigate effect fires
    } catch {
      toast.error(AUTH_ERRORS.generic)
      setIsSubmitting(false)
    }
  }

  // "Send meg en kode i stedet" from the sign-in step (user has a password).
  const handleUseCode = async () => {
    setErrors({})
    setPasswordError(null)
    setIsSubmitting(true)
    try {
      const { error } = await sendMagicLink(email, callbackUrl, { shouldCreateUser: false })
      if (error) {
        toast.error(rateOrGeneric(error))
        setIsSubmitting(false)
        return
      }
      goToCode({ reason: 'login', hasPasswordFallback: true })
      setIsSubmitting(false)
    } catch {
      toast.error(AUTH_ERRORS.generic)
      setIsSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (isResending) return
    setIsResending(true)
    const { error } =
      codeCtx.reason === 'confirm'
        ? await supabase.auth.resend({ type: 'signup', email })
        : await sendMagicLink(email, callbackUrl, { shouldCreateUser: false })
    setIsResending(false)
    if (error) {
      setVerifyError(rateOrGeneric(error))
      return
    }
    setCode('')
    setVerifyError(null)
  }

  const backToIdentify = () => {
    setStep('identify')
    setPasswordValue('')
    setPasswordError(null)
    setErrors({})
  }

  // ── Code-entry screen ──────────────────────────────────────────────────────
  if (step === 'code') {
    const isConfirm = codeCtx.reason === 'confirm'
    return (
      <AuthLayout title="" customContent>
        <div className="mb-8 space-y-2 text-center">
          <h1 className="text-2xl font-medium text-foreground">
            {isConfirm ? 'Bekreft e-posten din' : 'Logg inn med kode'}
          </h1>
          <p className="text-base text-foreground-muted">
            Vi sendte en kode til {email}.
          </p>
        </div>

        <InputOTP
          maxLength={6}
          value={code}
          onChange={setCode}
          disabled={isVerifying}
          autoFocus
          aria-invalid={!!verifyError || undefined}
        >
          <InputOTPGroup className="gap-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <InputOTPSlot
                key={i}
                index={i}
                className="size-12 rounded-xl"
                aria-invalid={!!verifyError || undefined}
              />
            ))}
          </InputOTPGroup>
        </InputOTP>

        {verifyError && (
          <FieldError className="mt-4 text-center">{verifyError}</FieldError>
        )}

        <p className="mt-6 text-center text-sm text-foreground-muted">
          Fikk du ingen kode?{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="font-medium text-foreground hover:underline disabled:cursor-not-allowed disabled:text-foreground-muted"
          >
            Send på nytt
          </button>
        </p>

        <button
          type="button"
          onClick={() => {
            setCode('')
            setVerifyError(null)
            if (codeCtx.hasPasswordFallback) setStep('password')
            else backToIdentify()
          }}
          className="mt-8 text-sm font-medium text-primary hover:underline"
        >
          {codeCtx.hasPasswordFallback ? 'Bruk passord i stedet' : 'Bruk en annen e-post'}
        </button>
      </AuthLayout>
    )
  }

  // ── Password screen (step 2) ───────────────────────────────────────────────
  if (step === 'password') {
    const isSignup = accountMode === 'signup'
    return (
      <AuthLayout title="" customContent>
        <button
          type="button"
          onClick={backToIdentify}
          aria-label="Tilbake"
          className="mb-4 -ml-2 self-start rounded-full p-2 text-foreground-muted transition-colors hover:bg-hover hover:text-foreground"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-medium text-foreground">
            {isSignup ? 'Lag et passord' : 'Skriv inn passordet'}
          </h1>
        </div>

        <form className="w-full space-y-5" onSubmit={handlePassword}>
          <div>
            <label htmlFor="password" className="sr-only">
              Passord
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={isSignup ? 'Lag et passord' : 'Passord'}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPasswordValue(e.target.value)}
                className="pr-10"
                autoFocus
                aria-invalid={!!passwordError || undefined}
                aria-describedby={passwordError ? 'password-error' : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-foreground-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/15"
                aria-label={showPassword ? 'Skjul passord' : 'Vis passord'}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>

            {isSignup && (
              <ul className="mt-3 space-y-2">
                <Rule met={rules.length}>Minst 8 tegn</Rule>
                <Rule met={rules.number}>Minst ett tall</Rule>
                <Rule met={rules.special}>Minst ett spesialtegn</Rule>
              </ul>
            )}

            {passwordError && (
              <FieldError id="password-error" className="mt-2">
                {passwordError}
              </FieldError>
            )}
          </div>

          <Button type="submit" loading={isSubmitting} size="lg" className="w-full rounded-xl">
            {isSignup ? 'Opprett konto' : 'Logg inn'}
          </Button>
        </form>

        {!isSignup && (
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={handleUseCode}
              disabled={isSubmitting}
              className="text-sm font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send meg en kode i stedet
            </button>
          </div>
        )}
      </AuthLayout>
    )
  }

  // ── Identify screen (step 1) ───────────────────────────────────────────────
  return (
    <AuthLayout title="" customContent>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-medium text-foreground">Logg inn eller opprett konto</h1>
      </div>

      <GoogleAuthButton redirectTo={callbackUrl} variant="secondary" className="rounded-xl" />

      <div className="my-4 flex w-full justify-center">
        <span className="text-sm text-foreground-muted">eller</span>
      </div>

      <form className="w-full space-y-5" onSubmit={handleIdentify}>
        <div className="grid gap-2">
          <label htmlFor="email" className="sr-only">
            E-post
          </label>
          <Input
            id="email"
            type="email"
            placeholder="E-post"
            autoComplete="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            onBlur={() => handleBlur('email')}
            aria-invalid={(touched.email && !!errors.email) || undefined}
            aria-describedby={touched.email && errors.email ? 'email-error' : undefined}
          />
          {touched.email && errors.email && (
            <FieldError id="email-error" className="mt-0">
              {errors.email}
            </FieldError>
          )}
        </div>

        <Button type="submit" loading={isSubmitting} size="lg" className="w-full rounded-xl">
          Fortsett
        </Button>
      </form>

      <p className="mt-14 max-w-xs text-center text-sm text-foreground-muted">
        Ved å fortsette godtar du{' '}
        <Link to="/terms" className="font-medium text-foreground-muted hover:text-foreground">
          vilkårene
        </Link>{' '}
        og{' '}
        <Link to="/personvern" className="font-medium text-foreground-muted hover:text-foreground">
          personvernerklæringen
        </Link>
        .
      </p>
    </AuthLayout>
  )
}

export default AuthPage

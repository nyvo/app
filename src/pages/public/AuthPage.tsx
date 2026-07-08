import { Link, Navigate, useLocation, useSearchParams, type Location } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { Eye, EyeOff, ChevronLeft } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { FieldError } from '@/components/ui/field-error'
import { Spinner } from '@/components/ui/spinner'
import { DelayedFallback } from '@/components/ui/delayed-fallback'
import { PageSkeleton } from '@/components/ui/page-skeleton'
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
import { PasswordRules, isPasswordValid } from '@/components/auth/PasswordRules'
import { supabase } from '@/lib/supabase'
import { isValidEmail } from '@/lib/utils'
import { useDocumentTitle } from '@/hooks/use-document-title'

const ROUTES = AUTH_ROUTES

// Shown when a request fails to reach the server (offline / retryable fetch)
// rather than because the credential or code was wrong.
const NETWORK_ERROR = 'Får ikke kontakt. Sjekk nettet og prøv igjen.'
// Shown when a hang timer fires but a session already exists — the login
// succeeded and only the follow-up profile load is slow. Reassure, don't fail.
const SLOW_LOGIN_MESSAGE = 'Dette tar lengre tid enn vanlig. Vent litt.'

// A request never reached the server (offline / retryable fetch), as opposed
// to a definitive "wrong password / bad code" answer. Mirrors the classifier
// in AuthContext but scoped to the two surfaces this page owns.
const isNetworkAuthError = (error: { name?: string; status?: number; code?: string }): boolean =>
  error.name === 'AuthRetryableFetchError' ||
  ((error.status === 0 || error.status === undefined) && !error.code)

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
  useDocumentTitle('Logg inn')
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

  const passwordValid = isPasswordValid(password)

  // Code-entry state. `reason` picks the OTP type + framing; `hasPasswordFallback`
  // shows "Bruk passord i stedet" only when the user actually has a password.
  const [code, setCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)
  // Set once the user has resent a confirmation code — a signup-race signal
  // that they likely already have an account, surfacing a quiet way back.
  const [hasResent, setHasResent] = useState(false)
  // Seconds until "Send på nytt" re-enables — mirrors Supabase's 60 s
  // per-address OTP rate limit so resending can't run into a 429.
  const [resendCooldown, setResendCooldown] = useState(0)
  const [codeCtx, setCodeCtx] = useState<{
    reason: 'confirm' | 'login'
    hasPasswordFallback: boolean
  }>({ reason: 'login', hasPasswordFallback: false })

  const email = formData.email.trim().toLowerCase()

  // Track the live session without re-arming the verify effect on auth change —
  // the hang timers below read it to tell "login succeeded, load is slow" from
  // "login failed". Synced in an effect (not during render) so the timers see
  // the latest value; they fire 12s out, long after this settles.
  const userRef = useRef(user)
  useEffect(() => {
    userRef.current = user
  }, [user])

  // Auto-verify once all 6 digits are entered.
  useEffect(() => {
    if (code.length !== 6) return
    let cancelled = false
    let hangTimer: ReturnType<typeof setTimeout> | undefined
    setIsVerifying(true)
    setVerifyError(null)
    ;(async () => {
      const otpType = codeCtx.reason === 'confirm' ? 'signup' : 'email'
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: otpType })
      if (cancelled) return
      if (error) {
        // A network failure isn't a bad code — say so, and keep the digits so
        // the user can just retry once they're back online.
        if (isNetworkAuthError(error)) {
          setVerifyError(NETWORK_ERROR)
          setIsVerifying(false)
          return
        }
        setVerifyError(AUTH_ERRORS.invalidOrExpiredCode)
        setCode('')
        setIsVerifying(false)
        return
      }
      // Success — stay in the loading state (spinner shown). AuthContext now loads
      // the profile; the redirect below fires once it's ready and unmounts us.
      // Safety net: if that never happens (e.g. a transient profile-load failure),
      // surface something rather than hanging silently on the code screen.
      hangTimer = setTimeout(() => {
        if (cancelled) return
        // A session already exists — the login worked, only the profile load is
        // slow. Reassure and keep the code instead of flashing a false failure.
        if (userRef.current) {
          setVerifyError(SLOW_LOGIN_MESSAGE)
          return
        }
        setVerifyError(AUTH_ERRORS.generic)
        setCode('')
        setIsVerifying(false)
      }, 12000)
    })()
    return () => {
      cancelled = true
      if (hangTimer) clearTimeout(hangTimer)
    }
  }, [code, email, codeCtx])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  // Safety net for the password step's success path — same idea as the code
  // screen's hang timer: on success we stay in the loading state until the
  // navigate effect unmounts us, so if the profile load stalls, surface an
  // error instead of spinning forever.
  const passwordHangTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (passwordHangTimerRef.current) clearTimeout(passwordHangTimerRef.current)
    },
    [],
  )
  const armPasswordHangTimer = () => {
    passwordHangTimerRef.current = setTimeout(() => {
      // Session already established — the sign-in worked, only the profile load
      // is slow. Reassure instead of flashing a false failure.
      if (userRef.current) {
        setPasswordError(SLOW_LOGIN_MESSAGE)
        return
      }
      setPasswordError(AUTH_ERRORS.generic)
      setIsSubmitting(false)
    }, 12000)
  }

  const rateOrGeneric = (error: Error) =>
    error.message.includes('rate') || (error as { status?: number }).status === 429
      ? AUTH_ERRORS.rateLimited
      : AUTH_ERRORS.generic

  const goToCode = (ctx: { reason: 'confirm' | 'login'; hasPasswordFallback: boolean }) => {
    setCode('')
    setVerifyError(null)
    setHasResent(false)
    setCodeCtx(ctx)
    setResendCooldown(60) // a code was just sent
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
        toast.error(rateOrGeneric(error))
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
        } else {
          // Session created → keep loading until the navigate effect fires.
          armPasswordHangTimer()
        }
        return
      }
      const { error } = await signInWithPassword(email, password)
      if (error) {
        const authErr = error as { code?: string; status?: number }
        // Unconfirmed email → resend the signup code and route to the
        // confirmation screen instead of a misleading "wrong password".
        if (authErr.code === 'email_not_confirmed' || error.message.includes('not confirmed')) {
          const { error: resendError } = await supabase.auth.resend({ type: 'signup', email })
          if (resendError) {
            toast.error(rateOrGeneric(resendError))
            setIsSubmitting(false)
            return
          }
          goToCode({ reason: 'confirm', hasPasswordFallback: false })
          setIsSubmitting(false)
          return
        }
        if (
          authErr.status === 429 ||
          authErr.code === 'over_request_rate_limit' ||
          error.message.includes('rate')
        ) {
          toast.error(AUTH_ERRORS.rateLimited)
          setIsSubmitting(false)
          return
        }
        // Offline / retryable fetch — the password may well be right; don't
        // accuse the user of a wrong password when the request never landed.
        if (isNetworkAuthError(error)) {
          setPasswordError(NETWORK_ERROR)
          setIsSubmitting(false)
          return
        }
        setPasswordError('Passordet stemmer ikke')
        setIsSubmitting(false)
        return
      }
      // Success → keep loading until the navigate effect fires.
      armPasswordHangTimer()
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
    if (isResending || resendCooldown > 0) return
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
    setHasResent(true)
    setResendCooldown(60)
  }

  const backToIdentify = () => {
    setStep('identify')
    setPasswordValue('')
    setPasswordError(null)
    setErrors({})
  }

  // Already authenticated — redirect immediately rather than via a post-paint
  // effect, so the login form never flashes before the bounce.
  if (user && profile) {
    return (
      <Navigate
        to={resolvePostAuthDestination(profile, redirectAfterLogin, intent)}
        replace
      />
    )
  }

  // A session exists but the profile is still loading — a redirect is imminent.
  // Hold with a delayed skeleton (nothing for fast loads) instead of flashing
  // the form.
  if (authLoading && user) {
    return (
      <DelayedFallback>
        <PageSkeleton />
      </DelayedFallback>
    )
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
          <FieldError className="text-center">{verifyError}</FieldError>
        )}

        {isVerifying ? (
          <div
            className="mt-6 flex items-center justify-center gap-2 text-sm text-foreground-muted"
            role="status"
          >
            <Spinner size="sm" />
            Logger inn…
          </div>
        ) : (
          <>
            <p className="mt-6 text-center text-sm text-foreground-muted">
              {resendCooldown > 0 ? (
                <span className="tabular-nums">
                  Du kan sende ny kode om {resendCooldown} s
                </span>
              ) : (
                <>
                  Fikk du ingen kode?{' '}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending}
                    className="focus-ring rounded font-medium text-foreground hover:underline disabled:cursor-not-allowed disabled:text-foreground-muted"
                  >
                    Send på nytt
                  </button>
                </>
              )}
            </p>

            {/* Signup-race escape hatch: once they've resent a confirmation
                code, they may already have an account — offer a quiet way back
                to sign in instead of looping on a code that never confirms. */}
            {isConfirm && hasResent && (
              <p className="mt-4 text-center text-sm text-foreground-muted">
                Har du allerede en konto?{' '}
                <button
                  type="button"
                  onClick={backToIdentify}
                  className="font-medium text-foreground hover:underline"
                >
                  Gå tilbake og logg inn.
                </button>
              </p>
            )}

            <button
              type="button"
              onClick={() => {
                setCode('')
                setVerifyError(null)
                if (codeCtx.hasPasswordFallback) setStep('password')
                else backToIdentify()
              }}
              className="focus-ring mt-8 rounded text-sm font-medium text-primary hover:underline"
            >
              {codeCtx.hasPasswordFallback ? 'Bruk passord i stedet' : 'Bruk en annen e-post'}
            </button>
          </>
        )}
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
          className="absolute -left-2 -top-0.5 rounded-full p-2 text-foreground-muted transition-colors hover:bg-hover hover:text-foreground"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="mb-8 space-y-2 text-center">
          <h1 className="text-2xl font-medium text-foreground">
            {isSignup ? 'Lag et passord' : 'Skriv inn passordet'}
          </h1>
          {/* Echo the address so a typo is caught here — not after a
              confirmation code never arrives. The chevron edits it. */}
          <p className="text-base text-foreground-muted">{email}</p>
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
              <span className="absolute right-2 top-1/2 -translate-y-1/2">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  // relative + after:-inset-2 pads the hit area out to ~44px
                  // without inflating the visible glyph.
                  className="relative rounded p-1 text-foreground-muted outline-none transition-colors after:absolute after:-inset-2 hover:text-foreground focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring-subtle"
                  aria-label={showPassword ? 'Skjul passord' : 'Vis passord'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </span>
            </div>

            {isSignup && <PasswordRules password={password} />}

            {passwordError && (
              <FieldError id="password-error" className="mt-2">
                {passwordError}
              </FieldError>
            )}
          </div>

          <Button type="submit" loading={isSubmitting} size="lg" className="w-full">
            {isSignup ? 'Opprett konto' : 'Logg inn'}
          </Button>
        </form>

        {!isSignup && (
          <div className="mt-6 text-center">
            {/* Also the recovery path — code login, then a new password in
                innstillinger — so it carries the label users scan for. */}
            <button
              type="button"
              onClick={handleUseCode}
              disabled={isSubmitting}
              className="focus-ring rounded text-sm font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              Glemt passordet? Logg inn med kode
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

      <GoogleAuthButton redirectTo={callbackUrl} variant="secondary" />

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

        <Button type="submit" loading={isSubmitting} size="lg" className="w-full">
          Fortsett
        </Button>
      </form>

      <p className="mt-12 max-w-xs text-center text-sm text-foreground-muted">
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

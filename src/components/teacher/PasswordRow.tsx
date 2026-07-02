import { useEffect, useRef, useState } from 'react'
import { Eye, EyeOff } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FieldError } from '@/components/ui/field-error'
import { PasswordRules, isPasswordValid } from '@/components/auth/PasswordRules'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { AUTH_ERRORS } from '@/lib/auth-messages'
import { toast } from 'sonner'

/**
 * Passord row for the settings "Konto og sikkerhet" list. Self-contained: it
 * owns its own open/save state and never touches the page's DirtyFormBar.
 *
 * Whether the account already has a password can't be read client-side, so we
 * call the self-scoped has_own_password RPC on mount. While that's pending
 * (hasPassword === null) the action button stays disabled — we never guess the
 * label, and an RPC error keeps it disabled rather than falsely offering
 * "Lag passord" to a password user.
 *
 * Users with a password must re-verify before changing it, either with the
 * current password or a one-time email code (for those who've forgotten it).
 */
export function PasswordRow() {
  const { profile, sendMagicLink, setPassword } = useAuth()
  const email = profile?.email ?? ''

  const [hasPassword, setHasPassword] = useState<boolean | null>(null)
  const [open, setOpen] = useState(false)
  const [verifyMode, setVerifyMode] = useState<'password' | 'code'>('password')

  const [currentPassword, setCurrentPassword] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)

  const [errors, setErrors] = useState<{ currentPassword?: string; code?: string; newPassword?: string }>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)

  const currentPasswordRef = useRef<HTMLInputElement>(null)
  const codeRef = useRef<HTMLInputElement>(null)
  const newPasswordRef = useRef<HTMLInputElement>(null)

  // Self-scoped password-presence check (keyed on auth.uid() server-side).
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error } = await (
        supabase.rpc as unknown as (fn: string) => ReturnType<typeof supabase.rpc>
      )('has_own_password')
      if (cancelled) return
      if (error) {
        // Keep the button disabled rather than assuming no password.
        logger.error('has_own_password RPC failed:', error)
        return
      }
      setHasPassword(!!data)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const isRate = (error: Error) =>
    error.message.includes('rate') || (error as { status?: number }).status === 429

  const resetAndClose = () => {
    setOpen(false)
    setVerifyMode('password')
    setCurrentPassword('')
    setCode('')
    setNewPassword('')
    setShowNewPassword(false)
    setErrors({})
  }

  const toggleOpen = () => {
    if (open) resetAndClose()
    else setOpen(true)
  }

  // "Vet du ikke passordet?" — send a login code so the user can verify by email.
  const handleSendCode = async () => {
    setIsSendingCode(true)
    const { error } = await sendMagicLink(email, undefined, { shouldCreateUser: false })
    setIsSendingCode(false)
    if (error) {
      toast.error(isRate(error) ? AUTH_ERRORS.rateLimited : AUTH_ERRORS.generic)
      return
    }
    setVerifyMode('code')
    setErrors({})
    toast.success('Kode sendt til ' + email)
  }

  const handleSave = async () => {
    setErrors({})

    if (!isPasswordValid(newPassword)) {
      setErrors({ newPassword: 'Passordet oppfyller ikke kravene' })
      newPasswordRef.current?.focus()
      return
    }

    setIsSaving(true)

    // Re-verify identity for password users before allowing a change.
    if (hasPassword) {
      if (verifyMode === 'password') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: currentPassword })
        if (error) {
          if (isRate(error)) {
            toast.error(AUTH_ERRORS.rateLimited)
          } else {
            setErrors({ currentPassword: 'Passordet stemmer ikke' })
            currentPasswordRef.current?.focus()
          }
          setIsSaving(false)
          return
        }
      } else {
        // verifyOtp fires a SIGNED_IN for the same user — AuthContext no-ops on that.
        const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
        if (error) {
          setErrors({ code: AUTH_ERRORS.invalidOrExpiredCode })
          codeRef.current?.focus()
          setIsSaving(false)
          return
        }
      }
    }

    const { error } = await setPassword(newPassword)
    if (error) {
      toast.error(isRate(error) ? AUTH_ERRORS.rateLimited : AUTH_ERRORS.generic)
      setIsSaving(false)
      return
    }

    toast.success('Passordet er lagret')
    setHasPassword(true)
    setIsSaving(false)
    resetAndClose()
  }

  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <span className="text-base font-medium text-foreground">Passord</span>
        <Button
          variant="secondary"
          className="shrink-0"
          disabled={hasPassword === null}
          onClick={toggleOpen}
        >
          {hasPassword ? 'Bytt passord' : 'Lag passord'}
        </Button>
      </div>

      {open && (
        <div className="mt-4 space-y-4 border-t border-border-subtle pt-4">
          {hasPassword && verifyMode === 'password' && (
            <div className="grid gap-2">
              <label htmlFor="current-password" className="text-sm font-medium text-foreground">
                Nåværende passord
              </label>
              <Input
                id="current-password"
                ref={currentPasswordRef}
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                aria-invalid={!!errors.currentPassword || undefined}
                aria-describedby={errors.currentPassword ? 'current-password-error' : undefined}
              />
              {errors.currentPassword && (
                <FieldError id="current-password-error" className="mt-0">
                  {errors.currentPassword}
                </FieldError>
              )}
              <button
                type="button"
                onClick={handleSendCode}
                disabled={isSendingCode}
                className="justify-self-start text-sm font-medium text-foreground-muted transition-colors hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              >
                Vet du ikke passordet? Få en kode på e-post
              </button>
            </div>
          )}

          {hasPassword && verifyMode === 'code' && (
            <div className="grid gap-2">
              <label htmlFor="otp-code" className="text-sm font-medium text-foreground">
                Engangskode
              </label>
              <Input
                id="otp-code"
                ref={codeRef}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="tracking-[0.25em] tabular-nums"
                aria-invalid={!!errors.code || undefined}
                aria-describedby={errors.code ? 'otp-code-error' : 'otp-code-hint'}
              />
              {errors.code ? (
                <FieldError id="otp-code-error" className="mt-0">
                  {errors.code}
                </FieldError>
              ) : (
                <p id="otp-code-hint" className="text-sm text-foreground-muted">
                  Vi sendte en kode til {email}.
                </p>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <label htmlFor="new-password" className="text-sm font-medium text-foreground">
              Nytt passord
            </label>
            <div className="relative">
              <Input
                id="new-password"
                ref={newPasswordRef}
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pr-10"
                aria-invalid={!!errors.newPassword || undefined}
                aria-describedby={errors.newPassword ? 'new-password-error' : undefined}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-foreground-muted outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/15"
                aria-label={showNewPassword ? 'Skjul passord' : 'Vis passord'}
              >
                {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <PasswordRules password={newPassword} />
            {errors.newPassword && (
              <FieldError id="new-password-error" className="mt-0">
                {errors.newPassword}
              </FieldError>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} loading={isSaving}>
              Lagre passord
            </Button>
            <Button variant="secondary" disabled={isSaving} onClick={resetAndClose}>
              Avbryt
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

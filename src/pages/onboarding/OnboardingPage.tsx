import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronLeft, LogOut } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field-error'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { logger } from '@/lib/logger'
import { cn, formatPersonName, resolveDisplayName } from '@/lib/utils'
import { stepVariants } from '@/lib/motion'
import { toast } from 'sonner'
import { AUTH_ROUTES, parseAuthIntent, sanitizeNextPath } from '@/lib/auth-routes'
import { claimMySignups, fetchLatestClaimedContact } from '@/services/signups'
import type { UserRole } from '@/types/database'

/**
 * /onboarding — single route, branches on auth state.
 *
 *   profile.role === null                      → RoleChooser
 *   profile.role === 'buyer'  + !completed     → BuyerSetup
 *   profile.role === 'seller' + !completed     → SellerFlow (name + URL)
 *   onboarding_completed_at !== null           → redirect /overview
 *
 * `?intent=buyer|seller` (set by the entry door: seller CTA, invite link,
 * booking surface) pre-sets the role and skips the RoleChooser — the chooser
 * only renders for context-free signups (direct /auth visits). `?next=`
 * preserves a deep-link target (e.g. /join/:code) through completion.
 *
 * Preview iteration history lives at /dev/onboarding-preview. This file
 * is the production wiring. Visual rules: studio-design §16.2 sectioned
 * form, §21.3a role chooser, no section H2s on short forms.
 */

// Top-left ghost back link. Same shape as CheckoutPage so the back affordance
// reads identically across the app's multi-step flows.
function BackLink({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mb-8 -ml-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm text-foreground-muted transition-colors duration-150 ease-out cursor-pointer hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
    >
      <ChevronLeft className="size-4" strokeWidth={1.75} />
      Tilbake
    </button>
  )
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[æ]/g, 'ae')
    .replace(/[ø]/g, 'o')
    .replace(/[å]/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function OnboardingPage() {
  const { user, profile, isInitialized, isLoading, signOut, setRole } = useAuth()
  const [searchParams] = useSearchParams()

  const intent = parseAuthIntent(searchParams.get('intent'))
  const nextPath = sanitizeNextPath(searchParams.get('next')) ?? AUTH_ROUTES.dashboard

  // Entry-context intent pre-sets the role so the chooser is skipped. Applied
  // at most once per mount (the ref) — if the user later backs out to the
  // chooser via setRole(null), the intent must not re-apply and trap them.
  // While the write is in flight we render nothing instead of flashing the
  // chooser; on failure we fall back to the chooser silently.
  const intentAppliedRef = useRef(false)
  const [resolvingIntent, setResolvingIntent] = useState(() => intent !== null)
  useEffect(() => {
    if (!intent || intentAppliedRef.current) return
    if (!profile || profile.onboarding_completed_at) return
    intentAppliedRef.current = true
    if (profile.role !== null) {
      // Role already chosen in an earlier session — never override it.
      setResolvingIntent(false)
      return
    }
    void (async () => {
      const { error } = await setRole(intent)
      if (error) logger.error('Onboarding: intent role pre-set failed', error)
      setResolvingIntent(false)
    })()
  }, [intent, profile, setRole])

  // Auth gate. ProtectedRoute can't wrap this route because it lives outside
  // TeacherLayout; do the redirect inline.
  if (!isLoading && isInitialized && !user) {
    return <Navigate to={AUTH_ROUTES.auth} replace />
  }

  // Auth init is cached and typically <200ms. Render nothing during the gap
  // rather than flashing a full-screen loader (Studio § 10).
  if (isLoading || !isInitialized || !profile) {
    return null
  }

  if (profile.onboarding_completed_at) {
    return <Navigate to={nextPath} replace />
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="flex justify-center px-4 sm:px-6 py-8">
        <Link to="/" className="flex select-none items-center">
          <span className="text-base font-medium text-foreground">Openspot</span>
        </Link>
      </header>
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait" custom={1} initial={false}>
          <motion.div
            key={profile.role ?? 'role'}
            custom={1}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            style={{ willChange: 'transform, opacity' }}
            className="absolute inset-0 flex"
          >
            {profile.role === null ? (
              resolvingIntent ? null : <RoleChooser />
            ) : profile.role === 'buyer' ? (
              <BuyerSetup nextPath={nextPath} />
            ) : (
              <SellerFlow nextPath={nextPath} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <footer className="flex justify-center px-4 sm:px-6 py-8">
        <button
          type="button"
          onClick={() => { void signOut() }}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-foreground-muted hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
        >
          <LogOut className="size-3.5" strokeWidth={1.75} />
          Logg ut
        </button>
      </footer>
    </main>
  )
}

// ---------------------------------------------------------------------------
// Step 1 — universal role chooser
// ---------------------------------------------------------------------------

function RoleChooser() {
  const { setRole } = useAuth()
  // No pre-selection — an explicit pick enables Fortsett, so a reflexive
  // first click can't submit the wrong account type.
  const [pick, setPick] = useState<UserRole | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pick) return
    setSaving(true)
    const { error } = await setRole(pick)
    if (error) {
      logger.error('Onboarding: setRole failed', error)
      toast.error('Kunne ikke lagre valget. Prøv igjen.')
      setSaving(false)
      return
    }
    // No navigate — the surrounding component re-renders on profile change
    // and switches branch automatically.
    setSaving(false)
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12">
      <form onSubmit={handleSubmit} className="w-full max-w-2xl">
        <h1 className="mb-8 text-2xl font-medium text-foreground">
          Hva vil du gjøre?
        </h1>

        <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <legend className="sr-only">Velg rolle</legend>
          {([
            {
              value: 'buyer' as const,
              title: 'Jeg vil melde meg på kurs',
              body: 'Finn kurs og klasser hos lærere og studioer.',
            },
            {
              value: 'seller' as const,
              title: 'Jeg tilbyr kurs',
              body: 'Lag kurs og ta imot påmeldinger.',
            },
          ]).map((opt) => {
            const isSelected = pick === opt.value
            return (
              <label
                key={opt.value}
                className={cn(
                  'flex items-start gap-3 min-h-[7.5rem] rounded-xl bg-muted p-6 cursor-pointer transition-colors duration-150 hover:bg-hover focus-within:ring-2 focus-within:ring-foreground',
                  isSelected && 'bg-selection-light ring-2 ring-foreground',
                )}
              >
                <input
                  type="radio"
                  name="role"
                  value={opt.value}
                  checked={isSelected}
                  onChange={() => setPick(opt.value)}
                  className="sr-only"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{opt.title}</p>
                  <p className="mt-1 text-sm text-foreground-muted leading-relaxed">{opt.body}</p>
                </div>
                {isSelected && <Check className="size-4 text-foreground shrink-0 mt-1" />}
              </label>
            )
          })}
        </fieldset>

        <Button
          type="submit"
          size="cta"
          loading={saving}
          disabled={pick === null}
          className="mt-8 w-full"
        >
          Fortsett
        </Button>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2a — Buyer setup
// ---------------------------------------------------------------------------

// Await the email claim before the form mounts so the freshest claimed
// signup can prefill name/phone (zero-typing for post-booking signups).
// Renders nothing while resolving — same quiet gap as resolvingIntent above.
// Claim/fetch failures degrade to the profile/email prefill silently.
function BuyerSetup({ nextPath }: { nextPath: string }) {
  const { user } = useAuth()
  const [claimed, setClaimed] = useState<
    { name: string; phone: string | null } | null | undefined
  >(undefined)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!user) {
        setClaimed(null)
        return
      }
      const { error } = await claimMySignups()
      if (cancelled) return
      if (error) logger.error('Onboarding: claim_my_signups failed', error)
      const { data } = await fetchLatestClaimedContact(user.id)
      if (cancelled) return
      setClaimed(data ? { name: data.participant_name, phone: data.participant_phone } : null)
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  if (claimed === undefined) return null
  return (
    <BuyerSetupForm
      nextPath={nextPath}
      claimedName={claimed?.name ?? null}
      claimedPhone={claimed?.phone ?? null}
    />
  )
}

function BuyerSetupForm({
  nextPath,
  claimedName,
  claimedPhone,
}: {
  nextPath: string
  claimedName: string | null
  claimedPhone: string | null
}) {
  const { profile, completeBuyerOnboarding, setRole } = useAuth()
  const navigate = useNavigate()

  // Prefill priority: a name the user already saved on the profile, then the
  // freshest claimed booking, then the email-derived fallback.
  const prefillName = useMemo(
    () => profile?.name?.trim() || claimedName || resolveDisplayName(profile?.name, profile?.email),
    [profile, claimedName],
  )

  const [name, setName] = useState(() => prefillName)
  const [phone, setPhone] = useState(() => profile?.phone || claimedPhone || '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const handleBack = async () => {
    const { error } = await setRole(null)
    if (error) {
      logger.error('Onboarding: setRole(null) failed', error)
      toast.error('Kunne ikke gå tilbake. Prøv igjen.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!name.trim()) next.name = 'Skriv inn navnet ditt'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSaving(true)
    const phoneDigits = phone.replace(/\s/g, '')
    const { error } = await completeBuyerOnboarding({
      name: formatPersonName(name),
      phone: phoneDigits || undefined,
    })
    if (error) {
      logger.error('Onboarding: buyer completion failed', error)
      toast.error('Kunne ikke lagre. Prøv igjen.')
      setSaving(false)
      return
    }
    navigate(nextPath, { replace: true })
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12">
      <form onSubmit={handleSubmit} className="w-full max-w-lg">
        <BackLink onClick={() => { void handleBack() }} disabled={saving} />
        <h1 className="mb-8 text-2xl font-medium text-foreground">
          Litt om deg
        </h1>

        <div className="space-y-5">
          <div className="grid gap-2">
            <Label htmlFor="buyer-name">Navn</Label>
            <Input
              id="buyer-name"
              autoComplete="name"
              value={name}
              onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((p) => ({ ...p, name: '' })) }}
              autoFocus
              aria-invalid={!!errors.name || undefined}
              aria-describedby={errors.name ? 'buyer-name-error' : undefined}
            />
            {errors.name && <FieldError id="buyer-name-error" className="mt-0">{errors.name}</FieldError>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="buyer-phone">
              Telefonnummer <span className="font-normal text-foreground-muted">(valgfritt)</span>
            </Label>
            <Input
              id="buyer-phone"
              type="tel"
              inputMode="tel"
              className="tabular-nums"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>

        <Button type="submit" size="cta" loading={saving} className="mt-8 w-full">
          Fullfør
        </Button>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2b — Seller flow (single screen: name → slug)
// ---------------------------------------------------------------------------

function SellerFlow({ nextPath }: { nextPath: string }) {
  const { profile, ensureSeller, markOnboardingComplete, setRole } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState(() => resolveDisplayName(profile?.name, profile?.email))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Live address preview — the name silently becomes a public URL, so show
  // it. Without this, the "opptatt" collision error is inexplicable.
  const slugPreview = generateSlug(name.trim())

  const handleBack = async () => {
    const { error } = await setRole(null)
    if (error) {
      logger.error('Onboarding: setRole(null) failed', error)
      toast.error('Kunne ikke gå tilbake. Prøv igjen.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    const slug = generateSlug(trimmed)
    if (!trimmed) {
      setErrors({ name: 'Skriv inn et navn' })
      return
    }
    if (slug.length < 3) {
      setErrors({ name: 'Bruk minst 3 bokstaver' })
      return
    }

    setSaving(true)
    // Third arg omitted — the default 'solo' model applies; changed later in settings.
    const { seller, error } = await ensureSeller(trimmed, slug)
    if (error || !seller) {
      logger.error('Onboarding: ensureSeller failed', error)
      const msg = error?.message ?? ''
      if (msg.includes('already taken') || msg.includes('reserved')) {
        setErrors({ name: 'Dette navnet er opptatt. Velg et annet.' })
      } else if (msg.includes('Slug')) {
        setErrors({ name: 'Velg et gyldig navn' })
      } else {
        toast.error('Kunne ikke fullføre oppsettet. Prøv igjen.')
      }
      setSaving(false)
      return
    }

    const { error: stampError } = await markOnboardingComplete()
    if (stampError) {
      // Fatal in practice: without the stamp, ProtectedRoute bounces the
      // navigation right back here — so surface it and let the user resubmit
      // (ensureSeller is idempotent, the retry only re-stamps).
      logger.error('Onboarding: markOnboardingComplete failed', stampError)
      toast.error('Kunne ikke fullføre oppsettet. Prøv igjen.')
      setSaving(false)
      return
    }
    navigate(nextPath, { replace: true })
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12">
      <form onSubmit={handleSubmit} className="w-full max-w-lg">
        <BackLink onClick={() => { void handleBack() }} disabled={saving} />
        <h1 className="mb-8 text-2xl font-medium text-foreground">
          Hva skal siden din hete?
        </h1>

        <div className="grid gap-2">
          <Label htmlFor="seller-name">Navn</Label>
          <Input
            id="seller-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (errors.name) setErrors({})
            }}
            autoFocus
            aria-invalid={!!errors.name || undefined}
            aria-describedby={`seller-name-hint${errors.name ? ' seller-name-error' : ''}`}
          />
          <p id="seller-name-hint" className="text-sm text-foreground-muted">
            {slugPreview.length >= 3
              ? `Adressen blir ${window.location.host}/${slugPreview}`
              : 'Bruk ditt eget navn eller navnet på studioet.'}
          </p>
          {errors.name && (
            <FieldError id="seller-name-error" className="mt-0">{errors.name}</FieldError>
          )}
        </div>

        <Button type="submit" size="cta" loading={saving} className="mt-8 w-full">
          Fullfør
        </Button>
      </form>
    </div>
  )
}

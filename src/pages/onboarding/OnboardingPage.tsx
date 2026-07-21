import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronLeft, LogOut } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field-error'
import { Input } from '@/components/ui/input'
import { DelayedFallback } from '@/components/ui/delayed-fallback'
import { PageSkeleton } from '@/components/ui/page-skeleton'
import { PageState } from '@/components/page-state/page-state'
import { UpNextLogo } from '@/components/ui/upnext-logo'
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
 * `?intent=buyer|seller` (set by the entry door: invite link, booking
 * surface) pre-sets the role and skips the RoleChooser — the chooser
 * renders for context-free signups (direct /auth visits and the landing
 * page, which buyers read too). `?next=` preserves a deep-link target
 * (e.g. /join/:code) through completion.
 *
 * Preview iteration history lives at /dev/onboarding-preview. This file
 * is the production wiring. Visual rules: studio-design §16.2 sectioned
 * form, §21.3a role chooser, no section H2s on short forms.
 */

// Top-left ghost back link. Same shape as CheckoutPage so the back affordance
// reads identically across the app's multi-step flows.
function BackLink({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      disabled={disabled}
      className="mb-8 -ml-2.5 gap-1.5 text-foreground-muted"
    >
      <ChevronLeft className="size-4" strokeWidth={1.75} />
      Tilbake
    </Button>
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
  // Direction-aware step transitions: +1 on advance (role chooser → setup),
  // -1 on Tilbake (setup → role chooser). Set BEFORE the role-changing async
  // call resolves, so the exiting element's `custom` is already correct when
  // profile.role flips and AnimatePresence reads it for the exit variant.
  const [direction, setDirection] = useState(1)

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
  // TeacherLayout; do the redirect inline. Forward the current search params so
  // `?intent`/`?next` survive the bounce — AuthPage reads them back, closing
  // the seller-intent-loss item.
  if (!isLoading && isInitialized && !user) {
    const authQuery = searchParams.toString()
    return <Navigate to={authQuery ? `${AUTH_ROUTES.auth}?${authQuery}` : AUTH_ROUTES.auth} replace />
  }

  // Auth init is cached and typically <200ms. Hold with a delayed skeleton
  // (nothing for fast loads, Studio § 10) rather than a bare blank that's
  // indistinguishable from a crash on a slow init.
  if (isLoading || !isInitialized) {
    return (
      <DelayedFallback>
        <PageSkeleton />
      </DelayedFallback>
    )
  }

  // Authenticated and initialized, but the profile never loaded (e.g. a
  // transient boot failure kept the session alive — see AuthContext). Surface
  // a retry instead of a permanent white screen.
  if (!profile) {
    return <PageState variant="server-error" />
  }

  if (profile.onboarding_completed_at) {
    return <Navigate to={nextPath} replace />
  }

  return (
    <main className="min-h-dvh bg-background text-foreground flex flex-col">
      <header className="flex justify-center px-4 sm:px-6 py-8">
        <Link to="/" aria-label="UpNext" className="flex select-none items-center">
          <UpNextLogo />
        </Link>
      </header>
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={profile.role ?? 'role'}
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            style={{ willChange: 'transform, opacity' }}
            className="absolute inset-0 flex"
          >
            {profile.role === null ? (
              resolvingIntent ? null : <RoleChooser onAdvance={() => setDirection(1)} />
            ) : profile.role === 'buyer' ? (
              <BuyerSetup nextPath={nextPath} onBack={() => setDirection(-1)} />
            ) : (
              <SellerFlow nextPath={nextPath} onBack={() => setDirection(-1)} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <footer className="flex justify-center px-4 sm:px-6 py-8">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => { void signOut() }}
          className="gap-1.5 text-foreground-muted"
        >
          <LogOut className="size-3.5" strokeWidth={1.75} />
          Logg ut
        </Button>
      </footer>
    </main>
  )
}

// ---------------------------------------------------------------------------
// Step 1 — universal role chooser
// ---------------------------------------------------------------------------

export function RoleChooser({ onAdvance }: { onAdvance: () => void }) {
  const { setRole } = useAuth()
  // No pre-selection — an explicit pick enables Fortsett, so a reflexive
  // first click can't submit the wrong account type.
  const [pick, setPick] = useState<UserRole | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pick) return
    setSaving(true)
    onAdvance()
    const { error } = await setRole(pick)
    if (error) {
      logger.error('Onboarding: setRole failed', error)
      toast.error('Kunne ikke lagre valget')
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
          Hva skal du bruke kontoen til?
        </h1>

        <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <legend className="sr-only">Velg rolle</legend>
          {([
            {
              value: 'buyer' as const,
              title: 'Melde meg på kurs',
              body: 'Finn kurs og hold oversikt over alle påmeldingene dine.',
            },
            {
              value: 'seller' as const,
              title: 'Arrangere kurs',
              body: 'Opprett kurs, ta imot betaling og hold oversikt over deltakerne.',
            },
          ]).map((opt) => {
            const isSelected = pick === opt.value
            return (
              <label
                key={opt.value}
                className={cn(
                  'flex items-start gap-3 min-h-[7.5rem] rounded-xl bg-muted p-6 cursor-pointer transition-colors duration-150 focus-within:ring-2 focus-within:ring-foreground',
                  isSelected ? 'ring-2 ring-foreground' : 'hover:bg-hover',
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
function BuyerSetup({ nextPath, onBack }: { nextPath: string; onBack: () => void }) {
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
      onBack={onBack}
      claimedName={claimed?.name ?? null}
      claimedPhone={claimed?.phone ?? null}
    />
  )
}

export function BuyerSetupForm({
  nextPath,
  onBack,
  claimedName,
  claimedPhone,
}: {
  nextPath: string
  onBack: () => void
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
    onBack()
    const { error } = await setRole(null)
    if (error) {
      logger.error('Onboarding: setRole(null) failed', error)
      toast.error('Kunne ikke gå tilbake – prøv igjen')
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
      toast.error('Kunne ikke lagre – prøv igjen')
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
          Bekreft opplysningene dine
        </h1>

        <div className="space-y-5">
          <div className="grid gap-2">
            <Label htmlFor="buyer-name">Fullt navn</Label>
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
          Lagre og fortsett
        </Button>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2b — Seller flow (two screens: kontotype → name/slug)
// ---------------------------------------------------------------------------

export function SellerFlow({ nextPath, onBack }: { nextPath: string; onBack: () => void }) {
  const { profile, sellers, ensureSeller, markOnboardingComplete, setRole } = useAuth()
  const navigate = useNavigate()

  // Kontotype gets its own full screen (Ghost's "What describes you best?" /
  // Melio's account chooser on Mobbin — the choice IS the step, not a field
  // squeezed above the name input). Sub-steps animate with the same
  // stepVariants as the page-level role transition so the flow reads as one
  // continuous stepper.
  const [step, setStep] = useState<'model' | 'name'>('model')
  const [direction, setDirection] = useState(1)

  // If a membership already exists (interrupted onboarding created the studio
  // before the completion stamp), prefill from the existing studio name so the
  // idempotent retry re-stamps THAT studio rather than negotiating a new,
  // mismatched name. Fall back to the display name for a fresh setup.
  const [name, setName] = useState(
    () => sellers[0]?.name ?? resolveDisplayName(profile?.name, profile?.email),
  )
  // Kontotype (sellers.operating_model). No pre-selection for a fresh setup —
  // same reasoning as RoleChooser: an explicit pick enables Fortsett, so
  // studio owners don't sail past a solo default and have to dig it out of
  // settings later. An interrupted-onboarding retry prefills from the row.
  const [model, setModel] = useState<'solo' | 'studio' | null>(() =>
    sellers[0] ? (sellers[0].operating_model === 'studio' ? 'studio' : 'solo') : null,
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Live address preview — the name silently becomes a public URL, so show
  // it. Without this, the "opptatt" collision error is inexplicable.
  const slugPreview = generateSlug(name.trim())

  const handleBack = async () => {
    onBack()
    const { error } = await setRole(null)
    if (error) {
      logger.error('Onboarding: setRole(null) failed', error)
      toast.error('Kunne ikke gå tilbake – prøv igjen')
    }
  }

  const handleModelContinue = (e: React.FormEvent) => {
    e.preventDefault()
    if (!model) return
    setDirection(1)
    setStep('name')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    const slug = generateSlug(trimmed)
    if (!trimmed) {
      setErrors({ name: 'Skriv inn navnet på siden' })
      return
    }
    if (slug.length < 3) {
      setErrors({ name: 'Bruk minst 3 bokstaver eller tall' })
      return
    }

    setSaving(true)
    const { seller, error } = await ensureSeller(trimmed, slug, model ?? 'solo')
    if (error || !seller) {
      logger.error('Onboarding: ensureSeller failed', error)
      const msg = error?.message ?? ''
      if (msg.includes('already taken') || msg.includes('reserved')) {
        setErrors({ name: 'Dette sidenavnet er opptatt. Velg et annet.' })
      } else if (msg.includes('Slug')) {
        setErrors({ name: 'Navnet må inneholde bokstaver eller tall' })
      } else {
        toast.error('Kunne ikke fullføre oppsettet – prøv igjen')
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
      toast.error('Kunne ikke fullføre oppsettet – prøv igjen')
      setSaving(false)
      return
    }
    navigate(nextPath, { replace: true })
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12">
      {/* mode="wait" keeps the sub-steps in normal flow (no absolute inset) so
          the component also lays out standalone in /dev/onboarding-preview. */}
      <AnimatePresence mode="wait" custom={direction} initial={false}>
        {step === 'model' ? (
          <motion.div
            key="model"
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full"
          >
            {/* Kontotype as its own step — sets sellers.operating_model up
                front instead of defaulting to solo and hiding the switch in
                studio settings. Full-page chooser per Ghost/Melio account-type
                screens (Mobbin); cards reuse the RoleChooser anatomy, copy
                aligns with StudioPage's AccountTypeSection so it reads as the
                same setting the user finds later. */}
            {/* data-preview-safe: submit is pure local step-navigation (no
                RPC), so /dev/onboarding-preview's Inert wrapper lets it
                through and the preview stays navigable. */}
            <form data-preview-safe onSubmit={handleModelContinue} className="mx-auto w-full max-w-2xl">
              <BackLink onClick={() => { void handleBack() }} />
              <h1 className="mb-8 text-2xl font-medium text-foreground">
                Hvilken kontotype passer deg?
              </h1>

              <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <legend className="sr-only">Kontotype</legend>
                {([
                  {
                    value: 'solo' as const,
                    title: 'Jeg jobber selvstendig',
                    body: 'Du holder egne kurs og mottar betalingene selv.',
                  },
                  {
                    value: 'studio' as const,
                    title: 'Jeg driver et yogastudio',
                    body: 'Yogalærere kan vise kurs på studiosiden. Alle betalinger går til studioet.',
                  },
                ]).map((opt) => {
                  const isSelected = model === opt.value
                  return (
                    <label
                      key={opt.value}
                      className={cn(
                        'flex items-start gap-3 min-h-[7.5rem] rounded-xl bg-muted p-6 cursor-pointer transition-colors duration-150 focus-within:ring-2 focus-within:ring-foreground',
                        isSelected ? 'ring-2 ring-foreground' : 'hover:bg-hover',
                      )}
                    >
                      <input
                        type="radio"
                        name="operating-model"
                        value={opt.value}
                        checked={isSelected}
                        onChange={() => setModel(opt.value)}
                        className="sr-only"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{opt.title}</p>
                        <p className="mt-1 text-sm leading-relaxed text-foreground-muted">{opt.body}</p>
                      </div>
                      {isSelected && <Check className="size-4 text-foreground shrink-0 mt-1" />}
                    </label>
                  )
                })}
              </fieldset>
              <p className="mt-4 text-sm text-foreground-muted">
                Du kan endre dette senere i innstillingene.
              </p>

              <Button
                type="submit"
                size="cta"
                disabled={model === null}
                className="mt-8 w-full"
              >
                Fortsett
              </Button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="name"
            custom={direction}
            variants={stepVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full"
          >
            <form onSubmit={handleSubmit} className="mx-auto w-full max-w-lg">
              <BackLink
                onClick={() => {
                  setDirection(-1)
                  setStep('model')
                }}
                disabled={saving}
              />
              <div className="mb-8">
                <h1 className="text-2xl font-medium text-foreground">
                  Gi siden din et navn
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
                  Navnet vises til deltakerne og brukes i den offentlige lenken din.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="seller-name">Navn på siden</Label>
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
                    ? `Lenken til siden blir ${window.location.host}/${slugPreview}`
                    : model === 'studio'
                      ? 'Bruk navnet deltakerne kjenner studioet under.'
                      : 'Bruk navnet deltakerne kjenner deg igjen på.'}
                </p>
                {errors.name && (
                  <FieldError id="seller-name-error" className="mt-0">{errors.name}</FieldError>
                )}
              </div>

              <Button type="submit" size="cta" loading={saving} className="mt-8 w-full">
                Opprett siden
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

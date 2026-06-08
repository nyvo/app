import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronLeft, LogOut } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { FieldError } from '@/components/ui/field-error'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { logger } from '@/lib/logger'
import { cn, formatPersonName, resolveDisplayName } from '@/lib/utils'
import { stepVariants } from '@/lib/motion'
import { toast } from 'sonner'
import { AUTH_ROUTES } from '@/lib/auth-routes'
import type { UserRole } from '@/types/database'

/**
 * /onboarding — single route, branches on auth state.
 *
 *   profile.role === null                      → RoleChooser
 *   profile.role === 'buyer'  + !completed     → BuyerSetup
 *   profile.role === 'seller' + !completed     → SellerType → SellerProfile
 *   onboarding_completed_at !== null           → redirect /overview
 *
 * Preview iteration history lives at /dev/onboarding-preview. This file
 * is the production wiring. Visual rules: studio-design §16.2 sectioned
 * form, §21.3a role chooser, no section H2s on short forms.
 */

type SellerKind = 'individual' | 'studio'

// Top-left ghost back link. Same shape as CheckoutPage so the back affordance
// reads identically across the app's multi-step flows.
function BackLink({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mb-7 -ml-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm text-foreground-muted transition-colors duration-150 ease-out cursor-pointer hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
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
  const { user, profile, isInitialized, isLoading, signOut } = useAuth()

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
    return <Navigate to={AUTH_ROUTES.dashboard} replace />
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="flex justify-center px-4 sm:px-6 pt-8">
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
              <RoleChooser />
            ) : profile.role === 'buyer' ? (
              <BuyerSetup />
            ) : (
              <SellerFlow />
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
  const [pick, setPick] = useState<UserRole>('buyer')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
        <h1 className="mb-8 text-2xl font-medium tracking-tight text-foreground">
          Velg kontotype
        </h1>

        <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <legend className="sr-only">Velg rolle</legend>
          {([
            {
              value: 'buyer' as const,
              title: 'Delta på klasser',
              body: 'Finn klasser hos studioer i nærheten.',
            },
            {
              value: 'seller' as const,
              title: 'Hold kurs',
              body: 'Lag kurs og ta imot påmeldinger.',
            },
          ]).map((opt) => {
            const isSelected = pick === opt.value
            return (
              <label
                key={opt.value}
                className={cn(
                  'flex items-start gap-3 min-h-[7.5rem] rounded-xl bg-muted p-6 cursor-pointer transition-shadow duration-150 hover:bg-muted/70 focus-within:ring-2 focus-within:ring-foreground',
                  isSelected && 'ring-2 ring-foreground',
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

        <Button type="submit" size="cta" loading={saving} className="mt-8 w-full">
          Fortsett
        </Button>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2a — Buyer setup
// ---------------------------------------------------------------------------

function BuyerSetup() {
  const { profile, completeBuyerOnboarding, setRole } = useAuth()
  const navigate = useNavigate()

  const prefillName = useMemo(
    () => resolveDisplayName(profile?.name, profile?.email),
    [profile],
  )

  const [name, setName] = useState(() => prefillName)
  const [phone, setPhone] = useState(() => profile?.phone || '')
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
    navigate(AUTH_ROUTES.dashboard, { replace: true })
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12">
      <form onSubmit={handleSubmit} className="w-full max-w-lg">
        <BackLink onClick={() => { void handleBack() }} disabled={saving} />
        <h1 className="mb-8 text-2xl font-medium tracking-tight text-foreground">
          Litt om deg
        </h1>

        <div className="space-y-4">
          <div className="grid gap-2">
            <label htmlFor="buyer-name" className="text-sm font-medium text-foreground">
              Navn
            </label>
            <Input
              id="buyer-name"
              autoComplete="name"
              value={name}
              onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((p) => ({ ...p, name: '' })) }}
              autoFocus
              aria-invalid={!!errors.name || undefined}
            />
            {errors.name && <FieldError className="mt-0">{errors.name}</FieldError>}
          </div>

          <div className="grid gap-2">
            <label htmlFor="buyer-phone" className="text-sm font-medium text-foreground">
              Telefonnummer
            </label>
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

        <Button type="submit" size="cta" loading={saving} className="mt-6 w-full">
          Fullfør
        </Button>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2b — Seller flow (Type → Profile + URL)
// ---------------------------------------------------------------------------

function SellerFlow() {
  const { setRole } = useAuth()
  const [stage, setStage] = useState<'type' | 'profile'>('type')
  const [direction, setDirection] = useState(1)
  const [kind, setKind] = useState<SellerKind>('individual')

  const goToProfile = () => { setDirection(1); setStage('profile') }
  const goBackToType = () => { setDirection(-1); setStage('type') }

  const exitToRole = async () => {
    const { error } = await setRole(null)
    if (error) {
      logger.error('Onboarding: setRole(null) failed', error)
      toast.error('Kunne ikke gå tilbake. Prøv igjen.')
    }
  }

  return (
    <div className="flex-1 relative overflow-hidden">
      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.div
          key={stage}
          custom={direction}
          variants={stepVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="absolute inset-0 flex"
        >
          {stage === 'type' ? (
            <SellerType
              kind={kind}
              setKind={setKind}
              onContinue={goToProfile}
              onBack={() => { void exitToRole() }}
            />
          ) : (
            <SellerProfile kind={kind} onBack={goBackToType} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function SellerType({
  kind,
  setKind,
  onContinue,
  onBack,
}: {
  kind: SellerKind
  setKind: (k: SellerKind) => void
  onContinue: () => void
  onBack: () => void
}) {
  return (
    <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12">
      <form onSubmit={(e) => { e.preventDefault(); onContinue() }} className="w-full max-w-2xl">
        <BackLink onClick={onBack} />
        <h1 className="mb-8 text-2xl font-medium tracking-tight text-foreground">
          Velg profiltype
        </h1>

        <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <legend className="sr-only">Velg profiltype</legend>
          {([
            {
              value: 'individual' as const,
              title: 'Individuell lærer',
              body: 'Egen profil med dine kurs.',
            },
            {
              value: 'studio' as const,
              title: 'Studio',
              body: 'Studioprofil med en eller flere lærere.',
            },
          ]).map((opt) => {
            const isSelected = kind === opt.value
            return (
              <label
                key={opt.value}
                className={cn(
                  'flex items-start gap-3 min-h-[7.5rem] rounded-xl bg-muted p-6 cursor-pointer transition-shadow duration-150 hover:bg-muted/70 focus-within:ring-2 focus-within:ring-foreground',
                  isSelected && 'ring-2 ring-foreground',
                )}
              >
                <input
                  type="radio"
                  name="sellerKind"
                  value={opt.value}
                  checked={isSelected}
                  onChange={() => setKind(opt.value)}
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

        <Button type="submit" size="cta" className="mt-8 w-full">
          Fortsett
        </Button>
      </form>
    </div>
  )
}

function SellerProfile({ kind, onBack }: { kind: SellerKind; onBack: () => void }) {
  const { profile, ensureSeller, markOnboardingComplete } = useAuth()
  const navigate = useNavigate()
  const nameLabel = kind === 'studio' ? 'Studionavn' : 'Profilnavn'
  const nameHint =
    kind === 'studio'
      ? 'Kan endres senere.'
      : 'Bruk navnet deltakerne kjenner deg som.'

  const [name, setName] = useState(() =>
    kind === 'individual' ? resolveDisplayName(profile?.name, profile?.email) : '',
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    const slug = generateSlug(trimmed)
    if (!trimmed) {
      setErrors({ name: kind === 'studio' ? 'Skriv inn studionavn' : 'Skriv inn profilnavn' })
      return
    }
    if (slug.length < 3) {
      setErrors({ name: 'Bruk minst 3 bokstaver.' })
      return
    }

    setSaving(true)
    const sellerType = kind === 'studio' ? 'business' : 'individual'
    const { seller, error } = await ensureSeller(trimmed, slug, sellerType)
    if (error || !seller) {
      logger.error('Onboarding: ensureSeller failed', error)
      const msg = error?.message ?? ''
      if (msg.includes('already taken') || msg.includes('reserved')) {
        setErrors({ name: 'Dette navnet er opptatt. Velg et annet.' })
      } else if (msg.includes('Slug')) {
        setErrors({ name: 'Velg et gyldig navn.' })
      } else {
        toast.error('Kunne ikke fullføre oppsettet. Prøv igjen.')
      }
      setSaving(false)
      return
    }

    const { error: stampError } = await markOnboardingComplete()
    if (stampError) {
      logger.error('Onboarding: markOnboardingComplete failed', stampError)
      // Non-fatal — the seller is created, just route to dashboard.
    }
    navigate(AUTH_ROUTES.dashboard, { replace: true })
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12">
      <form onSubmit={handleSubmit} className="w-full max-w-lg">
        <BackLink onClick={onBack} disabled={saving} />
        <h1 className="mb-8 text-2xl font-medium tracking-tight text-foreground">
          Sett opp profilen
        </h1>

        <div className="grid gap-2">
          <label htmlFor="seller-name" className="text-sm font-medium text-foreground">
            {nameLabel}
          </label>
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
            {nameHint}
          </p>
          {errors.name && (
            <FieldError id="seller-name-error" className="mt-0">{errors.name}</FieldError>
          )}
        </div>

        <Button type="submit" size="cta" loading={saving} className="mt-6 w-full">
          Fullfør
        </Button>
      </form>
    </div>
  )
}

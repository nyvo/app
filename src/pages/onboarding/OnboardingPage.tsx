import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Building, Calendar, Check, ImageIcon, User } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/contexts/AuthContext'
import { logger } from '@/lib/logger'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { AUTH_ROUTES } from '@/lib/auth-routes'
import { uploadSellerLogo, ACCEPTED_IMAGE_TYPES, MAX_IMAGE_SIZE } from '@/services/storage'
import { updateSeller } from '@/services/sellers'
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
  const { user, profile, isInitialized, isLoading } = useAuth()

  // Auth gate. ProtectedRoute can't wrap this route because it lives outside
  // TeacherLayout; do the redirect inline.
  if (!isLoading && isInitialized && !user) {
    return <Navigate to={AUTH_ROUTES.login} replace />
  }

  if (isLoading || !isInitialized || !profile) {
    return (
      <main className="min-h-screen w-full bg-background flex items-center justify-center">
        <Spinner size="xl" />
      </main>
    )
  }

  if (profile.onboarding_completed_at) {
    return <Navigate to={AUTH_ROUTES.dashboard} replace />
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      {profile.role === null ? (
        <RoleChooser />
      ) : profile.role === 'buyer' ? (
        <BuyerSetup />
      ) : (
        <SellerFlow />
      )}
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
    }
    // No navigate — the surrounding component re-renders on profile change
    // and switches branch automatically.
  }

  return (
    <div className="flex-1 flex items-start justify-center px-4 sm:px-6 py-12">
      <form onSubmit={handleSubmit} className="w-full max-w-md">
        <h1 className="mb-8 text-3xl font-semibold tracking-tight text-foreground">
          Hva vil du gjøre?
        </h1>

        <fieldset className="space-y-3">
          <legend className="sr-only">Velg rolle</legend>
          {([
            {
              value: 'buyer' as const,
              icon: Calendar,
              title: 'Booke klasser',
              body: 'Finn og book yoga, pilates eller andre klasser hos studios i nærheten.',
            },
            {
              value: 'seller' as const,
              icon: Building,
              title: 'Drive et studio',
              body: 'Sett opp ditt eget studio, lag kurs, og motta påmeldinger.',
            },
          ]).map((opt) => {
            const isSelected = pick === opt.value
            return (
              <label
                key={opt.value}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors duration-150 focus-within:ring-2 focus-within:ring-ring',
                  isSelected ? 'border-foreground bg-muted' : 'border-border hover:bg-muted',
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
                <div className={cn(
                  'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md',
                  isSelected ? 'bg-background border border-border' : 'bg-muted',
                )}>
                  <opt.icon className="size-4 text-foreground-muted" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{opt.title}</p>
                  <p className="mt-1 text-xs text-foreground-muted leading-relaxed">{opt.body}</p>
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
  const { profile, completeBuyerOnboarding } = useAuth()
  const navigate = useNavigate()

  // Don't prefill the name if the only existing value is the email prefix
  // (Supabase's auto-fill behavior when no display name is given).
  const prefillName = useMemo(() => {
    const name = profile?.name?.trim()
    if (!name) return ''
    const emailPrefix = profile?.email?.split('@')[0]
    if (emailPrefix && name.toLowerCase() === emailPrefix.toLowerCase()) return ''
    return name
  }, [profile])

  const [firstName, setFirstName] = useState(() => prefillName.split(' ')[0] || '')
  const [lastName, setLastName] = useState(() => prefillName.split(' ').slice(1).join(' ') || '')
  const [phone, setPhone] = useState(() => profile?.phone || '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!firstName.trim()) next.firstName = 'Skriv inn fornavn'
    if (!lastName.trim()) next.lastName = 'Skriv inn etternavn'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSaving(true)
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()
    const phoneDigits = phone.replace(/\s/g, '')
    const { error } = await completeBuyerOnboarding({
      name: fullName,
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
    <div className="flex-1 flex items-start justify-center px-4 sm:px-6 py-12">
      <form onSubmit={handleSubmit} className="w-full max-w-lg">
        <h1 className="mb-8 text-3xl font-semibold tracking-tight text-foreground">
          Litt om deg
        </h1>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <label htmlFor="buyer-first-name" className="text-sm font-medium text-foreground">
                Fornavn
              </label>
              <Input
                id="buyer-first-name"
                value={firstName}
                onChange={(e) => { setFirstName(e.target.value); if (errors.firstName) setErrors((p) => ({ ...p, firstName: '' })) }}
                autoFocus
                aria-invalid={!!errors.firstName || undefined}
              />
              {errors.firstName && <p className="text-sm text-danger" role="alert">{errors.firstName}</p>}
            </div>
            <div className="grid gap-2">
              <label htmlFor="buyer-last-name" className="text-sm font-medium text-foreground">
                Etternavn
              </label>
              <Input
                id="buyer-last-name"
                value={lastName}
                onChange={(e) => { setLastName(e.target.value); if (errors.lastName) setErrors((p) => ({ ...p, lastName: '' })) }}
                aria-invalid={!!errors.lastName || undefined}
              />
              {errors.lastName && <p className="text-sm text-danger" role="alert">{errors.lastName}</p>}
            </div>
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
  const [stage, setStage] = useState<'type' | 'profile'>('type')
  const [kind, setKind] = useState<SellerKind>('individual')

  if (stage === 'type') {
    return <SellerType kind={kind} setKind={setKind} onContinue={() => setStage('profile')} />
  }
  return <SellerProfile kind={kind} onBack={() => setStage('type')} />
}

function SellerType({
  kind,
  setKind,
  onContinue,
}: {
  kind: SellerKind
  setKind: (k: SellerKind) => void
  onContinue: () => void
}) {
  return (
    <div className="flex-1 flex items-start justify-center px-4 sm:px-6 py-12">
      <form onSubmit={(e) => { e.preventDefault(); onContinue() }} className="w-full max-w-md">
        <h1 className="mb-8 text-3xl font-semibold tracking-tight text-foreground">
          Hvem er du?
        </h1>

        <fieldset className="space-y-3">
          <legend className="sr-only">Type virksomhet</legend>
          {([
            {
              value: 'individual' as const,
              icon: User,
              title: 'Individuell lærer',
              body: 'Jeg holder kurs i mitt eget navn. Frilans, ENK eller helt nystartet.',
            },
            {
              value: 'studio' as const,
              icon: Building,
              title: 'Studio',
              body: 'Jeg representerer et studio, en bedrift eller en organisasjon.',
            },
          ]).map((opt) => {
            const isSelected = kind === opt.value
            return (
              <label
                key={opt.value}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors duration-150 focus-within:ring-2 focus-within:ring-ring',
                  isSelected ? 'border-foreground bg-muted' : 'border-border hover:bg-muted',
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
                <div className={cn(
                  'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md',
                  isSelected ? 'bg-background border border-border' : 'bg-muted',
                )}>
                  <opt.icon className="size-4 text-foreground-muted" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{opt.title}</p>
                  <p className="mt-1 text-xs text-foreground-muted leading-relaxed">{opt.body}</p>
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

  const [profileName, setProfileName] = useState(() => profile?.name?.trim() || '')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [slugDraft, setSlugDraft] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // Auto-suggest the slug from the name until the user edits it themselves.
  useEffect(() => {
    if (slugTouched) return
    setSlugDraft(generateSlug(profileName))
  }, [profileName, slugTouched])

  const slugStatus = useMemo(() => {
    if (!slugDraft) return { state: 'idle' as const, message: '' }
    if (slugDraft.length < 3) return { state: 'error' as const, message: 'Minst 3 tegn.' }
    if (slugDraft.length > 40) return { state: 'error' as const, message: 'Maks 40 tegn.' }
    return { state: 'ok' as const, message: 'Tilgjengelig' }
  }, [slugDraft])

  const handlePhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error('Ugyldig filtype. Bruk JPG, PNG eller WebP.')
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error('Bildet er for stort. Maks 5 MB.')
      return
    }
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!profileName.trim()) next.name = kind === 'studio' ? 'Skriv inn studionavn' : 'Skriv inn navn'
    if (slugStatus.state === 'error') next.slug = slugStatus.message
    if (!slugDraft) next.slug = 'Skriv inn studio-adresse'
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSaving(true)
    const sellerType = kind === 'studio' ? 'business' : 'individual'
    const { seller, error } = await ensureSeller(profileName.trim(), slugDraft, sellerType)
    if (error || !seller) {
      logger.error('Onboarding: ensureSeller failed', error)
      const message = error?.message?.includes('Slug') || error?.message?.includes('taken')
        ? 'Denne adressen er opptatt. Velg en annen.'
        : 'Kunne ikke fullføre. Prøv igjen.'
      toast.error(message)
      setSaving(false)
      return
    }

    // Photo upload — non-fatal. The image is the seller's canonical logo,
    // used on the public studio page and as the instructor avatar on course
    // tiles. One image, one column (sellers.logo_url). If the upload fails
    // the seller is already created and the user can re-upload from settings.
    if (photoFile) {
      const { url, error: uploadError } = await uploadSellerLogo(seller.id, photoFile)
      if (uploadError || !url) {
        logger.error('Onboarding: photo upload failed', uploadError)
        toast.error('Kunne ikke laste opp bildet, men profilen er lagret. Du kan prøve igjen senere.')
      } else {
        const { error: patchError } = await updateSeller(seller.id, { logo_url: url })
        if (patchError) logger.error('Onboarding: sellers.logo_url patch failed', patchError)
      }
    }

    const { error: stampError } = await markOnboardingComplete()
    if (stampError) {
      logger.error('Onboarding: markOnboardingComplete failed', stampError)
      // Non-fatal — the seller is created, just route to dashboard and let
      // the user re-onboard if needed.
    }
    navigate(AUTH_ROUTES.dashboard, { replace: true })
  }

  return (
    <div className="flex-1 flex items-start justify-center px-4 sm:px-6 py-12">
      <form onSubmit={handleSubmit} className="w-full max-w-lg">
        <h1 className="mb-8 text-3xl font-semibold tracking-tight text-foreground">
          {kind === 'studio' ? 'Sett opp studioet' : 'Sett opp profilen'}
        </h1>

        <div className="space-y-5">
          <div className="grid gap-2">
            <label htmlFor="seller-name" className="text-sm font-medium text-foreground">
              {kind === 'studio' ? 'Navn på studio' : 'Ditt navn'}
            </label>
            <Input
              id="seller-name"
              value={profileName}
              onChange={(e) => { setProfileName(e.target.value); if (errors.name) setErrors((p) => ({ ...p, name: '' })) }}
              autoFocus
              aria-invalid={!!errors.name || undefined}
            />
            {errors.name && <p className="text-sm text-danger" role="alert">{errors.name}</p>}
          </div>

          <div className="grid gap-2">
            <span className="text-sm font-medium text-foreground">
              Profilbilde <span className="text-foreground-muted font-normal">(valgfritt)</span>
            </span>
            <label
              htmlFor="seller-photo"
              className="flex items-center gap-4 rounded-lg border border-dashed border-border p-4 cursor-pointer hover:bg-muted transition-colors"
            >
              <div className="size-14 shrink-0 rounded-full overflow-hidden bg-muted grid place-items-center">
                {photoPreview ? (
                  <img src={photoPreview} alt="" className="size-full object-cover" />
                ) : (
                  <ImageIcon className="size-5 text-foreground-muted" strokeWidth={1.75} />
                )}
              </div>
              <p className="text-sm font-medium text-foreground">
                {photoPreview ? 'Bytt bilde' : 'Last opp bilde'}
              </p>
              <input
                id="seller-photo"
                type="file"
                accept="image/png,image/jpeg"
                className="sr-only"
                onChange={handlePhotoChange}
              />
            </label>
          </div>

          <div className="grid gap-2">
            <label htmlFor="seller-slug" className="text-sm font-medium text-foreground">
              Studio-adresse
            </label>
            <div
              className={cn(
                'flex items-stretch rounded-md border bg-surface overflow-hidden focus-within:ring-2 focus-within:ring-ring',
                (slugStatus.state === 'error' || errors.slug) ? 'border-danger-fg' : 'border-border',
              )}
            >
              <span className="px-3 flex items-center text-sm text-foreground-muted bg-muted border-r border-border select-none">
                studio.no/
              </span>
              <input
                id="seller-slug"
                value={slugDraft}
                onChange={(e) => {
                  setSlugTouched(true)
                  setSlugDraft(generateSlug(e.target.value))
                  if (errors.slug) setErrors((p) => ({ ...p, slug: '' }))
                }}
                className="flex-1 h-9 px-3 bg-transparent text-sm text-foreground outline-none"
                aria-invalid={slugStatus.state === 'error' || !!errors.slug || undefined}
              />
            </div>
            {(slugStatus.state !== 'idle' || errors.slug) && (
              <p className={cn(
                'text-sm',
                slugStatus.state === 'error' || errors.slug ? 'text-danger' : 'text-foreground-muted',
              )}>
                {slugStatus.state === 'ok' && !errors.slug ? (
                  <span className="inline-flex items-center gap-1">
                    <Check className="size-3.5" />
                    {slugStatus.message}
                  </span>
                ) : (
                  errors.slug || slugStatus.message
                )}
              </p>
            )}
          </div>
        </div>

        <Button type="submit" size="cta" loading={saving} className="mt-6 w-full">
          Fullfør oppsett
        </Button>

        <button
          type="button"
          onClick={onBack}
          className="mt-3 w-full text-center text-sm text-foreground-muted hover:text-foreground transition-colors"
        >
          Tilbake
        </button>
      </form>
    </div>
  )
}

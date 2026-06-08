import { useEffect, useMemo, useState } from 'react'
import { Building, Calendar, Check, ImageIcon, User } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * /dev/onboarding-preview — design surface where the buyer/seller flow
 * was iterated. Production lives at src/pages/onboarding/OnboardingPage.tsx
 * + route `/onboarding`. Keep this around for future design tweaks; both
 * files are independent now.
 *
 *   Step 1 (universal) — role chooser    /signup → email verify → THIS
 *   Step 2a — Buyer    setup             after Step 1 if "Booke klasser"
 *   Step 2b — Seller   setup             after Step 1 if "Drive et studio"
 *
 * Studio-design rules in play:
 * - §21.3a role chooser (whole-row clickable radio cards)
 * - §16.2 sectioned form for the per-role setup (no wizards, no Back/Next)
 * - §17.2 max-widths: auth tier max-w-md, sectioned form max-w-lg
 */

type Role = 'buyer' | 'seller'
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

function PreviewFrame({
  label,
  description,
  children,
}: {
  label: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="border-b border-border pb-2">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-1 text-sm text-foreground-muted">{description}</p>
      </div>
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        {children}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 1 — universal role chooser
// ---------------------------------------------------------------------------

function Step1RoleChooser() {
  const [role, setRole] = useState<Role>('buyer')

  return (
    <div className="flex-1 flex items-start justify-center px-4 sm:px-6 py-12">
      <div className="w-full max-w-md">
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
            const isSelected = role === opt.value
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
                  onChange={() => setRole(opt.value)}
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

        <Button size="cta" className="mt-8 w-full">
          Fortsett
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2a — Buyer setup (sectioned form)
// ---------------------------------------------------------------------------

function Step2BuyerSetup() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  return (
    <div className="flex-1 flex items-start justify-center px-4 sm:px-6 py-12">
      <div className="w-full max-w-lg">
        <h1 className="mb-8 text-3xl font-semibold tracking-tight text-foreground">
          Litt om deg
        </h1>

        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div className="grid gap-2">
            <label htmlFor="buyer-name" className="text-sm font-medium text-foreground">
              Navn
            </label>
            <Input
              id="buyer-name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
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

          <Button type="submit" size="cta" className="mt-4 w-full">Fullfør</Button>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2b.1 — Seller type chooser (own screen, mirrors Step 1 pattern)
// ---------------------------------------------------------------------------

function Step2SellerType({
  kind,
  setKind,
}: {
  kind: SellerKind
  setKind: (k: SellerKind) => void
}) {
  return (
    <div className="flex-1 flex items-start justify-center px-4 sm:px-6 py-12">
      <div className="w-full max-w-md">
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
                  name="sellerKindPick"
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

        <Button size="cta" className="mt-8 w-full">
          Fortsett
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2b.2 — Seller profile + URL (after type is picked)
// ---------------------------------------------------------------------------

function Step2SellerProfile({ kind }: { kind: SellerKind }) {
  const [profileName, setProfileName] = useState('')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [slugDraft, setSlugDraft] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const nameLabel = kind === 'studio' ? 'Studionavn' : 'Navn på profilen'
  const nameHint =
    kind === 'studio'
      ? 'Vises offentlig på profilen og kursene dine.'
      : 'Bruk navnet deltakerne kjenner deg som.'

  // Auto-generate slug from name until the user types it themselves
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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex-1 flex items-start justify-center px-4 sm:px-6 py-12">
      <div className="w-full max-w-lg">
        <h1 className="mb-8 text-3xl font-semibold tracking-tight text-foreground">
          {kind === 'studio' ? 'Sett opp studioet' : 'Sett opp profilen'}
        </h1>

        <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
          <div className="grid gap-2">
            <label htmlFor="seller-name" className="text-sm font-medium text-foreground">
              {nameLabel}
            </label>
            <Input
              id="seller-name"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              aria-describedby="seller-name-hint"
            />
            <p id="seller-name-hint" className="text-sm text-foreground-muted">
              {nameHint}
            </p>
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
                slugStatus.state === 'error' ? 'border-danger-fg' : 'border-border',
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
                }}
                className="flex-1 h-9 px-3 bg-transparent text-sm text-foreground outline-none"
                aria-invalid={slugStatus.state === 'error' || undefined}
                aria-describedby={slugStatus.state !== 'idle' ? 'seller-slug-helper' : undefined}
              />
            </div>
            {slugStatus.state !== 'idle' && (
              <p
                id="seller-slug-helper"
                className={cn(
                  'text-sm',
                  slugStatus.state === 'error' ? 'text-danger' : 'text-foreground-muted',
                )}
              >
                {slugStatus.state === 'ok' ? (
                  <span className="inline-flex items-center gap-1">
                    <Check className="size-3.5" />
                    {slugStatus.message}
                  </span>
                ) : (
                  slugStatus.message
                )}
              </p>
            )}
          </div>

          <Button type="submit" size="cta" className="mt-3 w-full">Fullfør</Button>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OnboardingPreview() {
  const [sellerKind, setSellerKind] = useState<SellerKind>('individual')

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-3xl px-6 py-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Onboarding — buyer + seller
          </h1>
          <p className="mt-2 text-sm text-foreground-muted">
            Dev preview, ikke koblet til ekte data. Fire skjermer stablet — bla nedover eller bruk lenkene under.
          </p>
          <nav className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <a href="#step-1" className="text-foreground underline-offset-4 hover:underline">Step 1: Rolle</a>
            <a href="#step-2-buyer" className="text-foreground underline-offset-4 hover:underline">Step 2a: Buyer</a>
            <a href="#step-2-seller-type" className="text-foreground underline-offset-4 hover:underline">Step 2b.1: Seller type</a>
            <a href="#step-2-seller-profile" className="text-foreground underline-offset-4 hover:underline">Step 2b.2: Seller profile</a>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10 space-y-12">
        <section id="step-1" className="scroll-mt-6">
          <PreviewFrame
            label="Step 1 — universal"
            description="Vises rett etter e-postbekreftelse. Eneste stedet i appen hvor buyer/seller splittes."
          >
            <Step1RoleChooser />
          </PreviewFrame>
        </section>

        <section id="step-2-buyer" className="scroll-mt-6">
          <PreviewFrame
            label="Step 2a — buyer"
            description="Etter «Booke klasser». Ett sectioned-form-skjerm, så rett til dashboard."
          >
            <Step2BuyerSetup />
          </PreviewFrame>
        </section>

        <section id="step-2-seller-type" className="scroll-mt-6">
          <PreviewFrame
            label="Step 2b.1 — seller type"
            description="Etter «Drive et studio». Eget skjerm før profilen — valget styrer feltetikettene i neste steg."
          >
            <Step2SellerType kind={sellerKind} setKind={setSellerKind} />
          </PreviewFrame>
        </section>

        <section id="step-2-seller-profile" className="scroll-mt-6">
          <PreviewFrame
            label="Step 2b.2 — seller profile"
            description="Etter type-valget. To korte seksjoner: profil + adresse. Bytt visning under for å se begge label-variantene."
          >
            <div className="border-b border-border bg-muted/40 px-4 py-2 flex items-center gap-3 text-sm text-foreground-muted">
              <span className="font-medium text-foreground">Forhåndsvis som</span>
              <div className="flex rounded-full border border-border bg-surface p-0.5">
                {(['individual', 'studio'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setSellerKind(opt)}
                    className={cn(
                      'px-3 py-0.5 rounded-full text-xs font-medium transition-colors',
                      sellerKind === opt
                        ? 'bg-foreground text-background'
                        : 'text-foreground-muted hover:text-foreground',
                    )}
                  >
                    {opt === 'individual' ? 'Individuell lærer' : 'Studio'}
                  </button>
                ))}
              </div>
            </div>
            <Step2SellerProfile kind={sellerKind} />
          </PreviewFrame>
        </section>

        <footer className="border-t border-border pt-6 pb-12">
          <p className="text-xs text-foreground-muted">
            Implementasjon: <code className="font-medium">src/pages/onboarding/OnboardingPage.tsx</code> (ruten <code className="font-medium">/onboarding</code>).
          </p>
        </footer>
      </div>
    </main>
  )
}

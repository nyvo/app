import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, Search, Loader2, Building, MapPin, Check, CreditCard, BookOpen, User } from '@/lib/icons'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { pageVariants, pageTransition, slideVariants, slideTransition, slideTransitionFast } from '@/lib/motion'
import { useAuth } from '@/contexts/AuthContext'
import { updateSeller } from '@/services/sellers'
import { typedFrom } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

type SellerType = 'individual' | 'business'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[æ]/g, 'ae')
    .replace(/[ø]/g, 'o')
    .replace(/[å]/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

interface BrregResult {
  name: string
  orgForm: string | null
  city: string | null
  address: string | null
  orgNr: string
}

/** Look up a Norwegian org by org number via Brønnøysundregistrene */
async function lookupOrgNumber(orgNr: string): Promise<BrregResult | null> {
  const cleaned = orgNr.replace(/\s/g, '')
  if (!/^\d{9}$/.test(cleaned)) return null

  try {
    const res = await fetch(`https://data.brreg.no/enhetsregisteret/api/enheter/${cleaned}`)
    if (!res.ok) return null
    const data = await res.json()
    const addr = data.forretningsadresse || data.postadresse
    const city = addr?.kommune || addr?.poststed || null
    const street = addr?.adresse?.[0] || null
    return {
      name: data.navn || '',
      orgForm: data.organisasjonsform?.beskrivelse || null,
      city,
      address: street,
      orgNr: cleaned,
    }
  } catch {
    return null
  }
}

interface WelcomeFlowProps {
  onComplete: () => void
}

export function WelcomeFlow({ onComplete }: WelcomeFlowProps) {
  const { profile, currentSeller, ensureSeller, signOut } = useAuth()
  // Step 0: account type. 1: about you. 2: studio. 3: done.
  const [step, setStep] = useState(0)
  const keyboardNav = useRef(false)

  // Account type — Privatperson (individual seller, ENK in practice) vs Bedrift (AS).
  const [sellerType, setSellerType] = useState<SellerType>('individual')

  // Personal info — don't prefill if the name is just the email prefix
  const prefillName = (() => {
    const name = profile?.name?.trim()
    if (!name) return ''
    const emailPrefix = profile?.email?.split('@')[0]
    if (emailPrefix && name.toLowerCase() === emailPrefix.toLowerCase()) return ''
    return name
  })()
  const [firstName, setFirstName] = useState(() => prefillName.split(' ')[0] || '')
  const [lastName, setLastName] = useState(() => prefillName.split(' ').slice(1).join(' ') || '')

  // Location
  const [city, setCity] = useState(() => currentSeller?.city || '')

  // Business info
  const [orgNumber, setOrgNumber] = useState('')
  const [studioName, setStudioName] = useState(() => currentSeller?.name || '')
  const [studioNameTouched, setStudioNameTouched] = useState(false)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [lookupResult, setLookupResult] = useState<BrregResult | null>(null)
  const [lookupDone, setLookupDone] = useState(false)
  const [studioError, setStudioError] = useState('')

  // Step 1 validation
  const [firstNameError, setFirstNameError] = useState('')
  const [lastNameError, setLastNameError] = useState('')
  const [cityError, setCityError] = useState('')

  const [isSaving, setIsSaving] = useState(false)
  const needsSeller = !currentSeller

  // For individual sellers, default the studio name to the user's full name
  // unless they've explicitly typed something. This nudges them past the
  // "what do I call my studio" friction.
  useEffect(() => {
    if (sellerType === 'individual' && !studioNameTouched) {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()
      if (fullName) setStudioName(fullName)
    }
  }, [sellerType, firstName, lastName, studioNameTouched])

  // Debounced org number lookup
  const lookupTimerRef = useRef<ReturnType<typeof setTimeout>>(null)
  const handleOrgNumberChange = useCallback((value: string) => {
    const filtered = value.replace(/[^\d\s]/g, '')
    setOrgNumber(filtered)
    setLookupDone(false)

    if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current)

    const cleaned = filtered.replace(/\s/g, '')
    if (cleaned.length === 9) {
      setIsLookingUp(true)
      lookupTimerRef.current = setTimeout(async () => {
        const result = await lookupOrgNumber(cleaned)
        setIsLookingUp(false)
        setLookupDone(true)
        setLookupResult(result)
        if (result) {
          if (result.name) {
            setStudioName(result.name)
            setStudioNameTouched(true)
          }
          if (result.city) setCity(result.city)
        }
      }, 300)
    } else {
      setLookupResult(null)
    }
  }, [])

  useEffect(() => {
    return () => { if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current) }
  }, [])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()
      let sellerId = currentSeller?.id

      if (needsSeller) {
        const name = studioName.trim()
        if (!name) {
          setStudioError('Skriv inn et navn')
          setIsSaving(false)
          return
        }
        const slug = generateSlug(name)
        const { seller: newSeller, error: sellerError } = await ensureSeller(name, slug, sellerType)
        if (sellerError || !newSeller) {
          logger.error('Welcome flow: seller creation failed', sellerError)
          toast.error('Kunne ikke opprette virksomheten. Prøv igjen.')
          setIsSaving(false)
          return
        }
        sellerId = newSeller.id
      }

      if (profile?.id) {
        const { error } = await typedFrom('profiles')
          .update({
            name: fullName || undefined,
            onboarding_completed_at: new Date().toISOString(),
          })
          .eq('id', profile.id)
        if (error) {
          logger.error('Welcome flow: profile save failed', error)
          toast.error('Kunne ikke lagre profilen. Prøv igjen.')
          return
        }
      }

      // Save city + organization_number on the seller. organization_number is
      // the Norwegian org-nr from Brønnøysund — stored on the seller for KYC
      // when Dintero onboarding eventually collects it.
      if (sellerId) {
        const sellerPatch: { city?: string; organization_number?: string | null } = {}
        if (city.trim()) sellerPatch.city = city.trim()
        if (sellerType === 'business' && orgNumber.replace(/\s/g, '').length === 9) {
          sellerPatch.organization_number = orgNumber.replace(/\s/g, '')
        }
        if (Object.keys(sellerPatch).length > 0) {
          const { error } = await updateSeller(sellerId, sellerPatch)
          if (error) {
            logger.error('Welcome flow: seller patch save failed', error)
          }
        }
      }

      setStep(3)
    } catch (err) {
      logger.error('Welcome flow save error:', err)
      toast.error('Kunne ikke lagre dataene. Prøv igjen.')
    } finally {
      setIsSaving(false)
    }
  }, [firstName, lastName, studioName, city, orgNumber, sellerType, needsSeller, profile?.id, currentSeller?.id, ensureSeller])

  const displayName = firstName.trim() || currentSeller?.name || ''

  const validateStep1 = useCallback(() => {
    let valid = true
    if (!firstName.trim()) { setFirstNameError('Skriv inn fornavn'); valid = false }
    else setFirstNameError('')
    if (!lastName.trim()) { setLastNameError('Skriv inn etternavn'); valid = false }
    else setLastNameError('')
    if (!city.trim()) { setCityError('Skriv inn by eller sted'); valid = false }
    else setCityError('')
    return valid
  }, [firstName, lastName, city])

  // Keyboard navigation
  const advance = useCallback(() => {
    if (step === 0) setStep(1)
    else if (step === 1) { if (validateStep1()) setStep(2) }
    else if (step === 2) {
      if (!studioName.trim()) { setStudioError('Skriv inn et navn'); return }
      handleSave()
    }
    else if (step === 3) onComplete()
  }, [step, validateStep1, studioName, handleSave, onComplete])

  const goBack = useCallback(() => {
    if (step === 1) setStep(0)
    else if (step === 2) setStep(1)
  }, [step])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        if (e.key === 'Enter') { e.preventDefault(); keyboardNav.current = true; advance() }
        return
      }
      if (e.key === 'ArrowLeft') { e.preventDefault(); keyboardNav.current = true; goBack() }
      else if (e.key === 'ArrowRight') { e.preventDefault(); keyboardNav.current = true; if (step <= 1) advance() }
      else if (e.key === 'Enter') { e.preventDefault(); keyboardNav.current = true; advance() }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [step, advance, goBack])

  // Steps: 0=Type, 1=About you, 2=Studio, 3=Done
  const segments = [
    { label: 'Om deg', steps: [0, 1] },
    { label: 'Virksomheten din', steps: [2] },
  ]

  return (
    <main className="flex-1 overflow-y-auto bg-background min-h-screen flex flex-col">
      {/* Minimal top bar */}
      <div className="flex justify-end px-6 lg:px-8 pt-6 lg:pt-8">
        <Button variant="ghost" size="sm" onClick={() => signOut()}>
          Logg ut
        </Button>
      </div>

      {/* Centered card */}
      <div className="flex-1 flex items-start lg:items-center justify-center px-4 sm:px-6 pb-12">
        <motion.div
          variants={pageVariants}
          initial="initial"
          animate="animate"
          transition={pageTransition}
          className="w-full max-w-lg"
        >
          <div className="rounded-lg bg-background border border-border p-6 sm:p-8">
            {/* Step indicator */}
            {step < 3 && (
              <div className="flex gap-2 mb-8">
                {segments.map((seg) => {
                  const isActive = seg.steps.includes(step)
                  const isDone = step > Math.max(...seg.steps)
                  return (
                    <div key={seg.label} className="flex-1">
                      <div className={`h-[3px] rounded-full mb-2 smooth-transition ${
                        isActive || isDone ? 'bg-primary' : 'bg-border'
                      }`} />
                      <p className={`text-xs font-medium tracking-wide smooth-transition ${
                        isActive ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {seg.label}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}

            <AnimatePresence mode="wait">
              {/* Step 0: Account type */}
              {step === 0 && (
                <motion.div
                  key="type"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={keyboardNav.current ? slideTransitionFast : slideTransition}
                  onAnimationComplete={() => { keyboardNav.current = false }}
                >
                  <h2 className="text-base font-semibold mb-1 text-foreground">
                    Hvordan vil du bruke plattformen?
                  </h2>
                  <p className="text-sm mb-6 text-muted-foreground">
                    Du kan endre dette senere. Valget bestemmer hvordan vi setter opp betalinger og kontaktinfo.
                  </p>

                  <div className="grid grid-cols-1 gap-3 mb-8">
                    {([
                      {
                        value: 'individual' as const,
                        icon: User,
                        title: 'Privatperson',
                        body: 'Jeg holder kurs i mitt eget navn. Frilans, ENK eller helt nystartet.',
                      },
                      {
                        value: 'business' as const,
                        icon: Building,
                        title: 'Bedrift',
                        body: 'Jeg representerer en bedrift, et studio eller en organisasjon.',
                      },
                    ]).map((opt) => {
                      const isSelected = sellerType === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setSellerType(opt.value)}
                          aria-pressed={isSelected}
                          className={cn(
                            'flex items-start gap-3 rounded-lg border p-4 text-left smooth-transition focus-ring',
                            isSelected
                              ? 'border-foreground/15 bg-selection-light ring-1 ring-inset ring-selection/20'
                              : 'border-border hover:bg-muted/50',
                          )}
                        >
                          <div className={cn(
                            'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md',
                            isSelected ? 'bg-background ring-1 ring-border' : 'bg-muted',
                          )}>
                            <opt.icon className="size-4 text-muted-foreground" strokeWidth={1.75} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{opt.title}</p>
                            <p className="text-xs mt-1 text-muted-foreground leading-relaxed">{opt.body}</p>
                          </div>
                          {isSelected && <Check className="size-4 text-foreground shrink-0 mt-1" />}
                        </button>
                      )
                    })}
                  </div>

                  <Button onClick={() => setStep(1)} className="w-full">
                    Fortsett
                    <ArrowRight className="size-3.5" />
                  </Button>
                </motion.div>
              )}

              {/* Step 1: Name + City */}
              {step === 1 && (
                <motion.div
                  key="about"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={keyboardNav.current ? slideTransitionFast : slideTransition}
                  onAnimationComplete={() => { keyboardNav.current = false }}
                >
                  <h2 className="text-base font-semibold mb-1 text-foreground">
                    Først litt om deg
                  </h2>
                  <p className="text-sm mb-6 text-muted-foreground">
                    Navnet og byen din vises på kurssiden din, så elevene vet hvem du er.
                  </p>

                  <div className="flex flex-col gap-4 mb-8">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="welcome-first-name" className="text-sm font-medium mb-1.5 block text-foreground">
                          Fornavn
                        </label>
                        <Input
                          id="welcome-first-name"
                          value={firstName}
                          onChange={(e) => { setFirstName(e.target.value); if (firstNameError) setFirstNameError('') }}
                          autoFocus
                          required
                          aria-invalid={!!firstNameError || undefined}
                          aria-describedby={firstNameError ? 'welcome-first-name-error' : undefined}
                        />
                        {firstNameError && (
                          <p id="welcome-first-name-error" className="text-xs font-medium mt-1.5 text-destructive" role="alert">{firstNameError}</p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="welcome-last-name" className="text-sm font-medium mb-1.5 block text-foreground">
                          Etternavn
                        </label>
                        <Input
                          id="welcome-last-name"
                          value={lastName}
                          onChange={(e) => { setLastName(e.target.value); if (lastNameError) setLastNameError('') }}
                          required
                          aria-invalid={!!lastNameError || undefined}
                          aria-describedby={lastNameError ? 'welcome-last-name-error' : undefined}
                        />
                        {lastNameError && (
                          <p id="welcome-last-name-error" className="text-xs font-medium mt-1.5 text-destructive" role="alert">{lastNameError}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="welcome-city" className="text-sm font-medium mb-1.5 block text-foreground">
                        By / Sted
                      </label>
                      <Input
                        id="welcome-city"
                        value={city}
                        onChange={(e) => { setCity(e.target.value); if (cityError) setCityError('') }}
                        required
                        aria-invalid={!!cityError || undefined}
                        aria-describedby={cityError ? 'welcome-city-error' : 'welcome-city-hint'}
                      />
                      {cityError ? (
                        <p id="welcome-city-error" className="text-xs font-medium mt-1.5 text-destructive" role="alert">{cityError}</p>
                      ) : (
                        <p id="welcome-city-hint" className="text-xs mt-1.5 text-muted-foreground">
                          Hjelper elever å finne kurs i nærheten.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline-soft" onClick={() => setStep(0)}>
                      <ArrowLeft className="size-3.5" />
                      Tilbake
                    </Button>
                    <Button onClick={() => { if (validateStep1()) setStep(2) }}>
                      Fortsett
                      <ArrowRight className="size-3.5" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Studio */}
              {step === 2 && (
                <motion.div
                  key="studio"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={keyboardNav.current ? slideTransitionFast : slideTransition}
                  onAnimationComplete={() => { keyboardNav.current = false }}
                >
                  <h2 className="text-base font-semibold mb-1 text-foreground">
                    {sellerType === 'business' ? 'Om virksomheten din' : 'Din kursside'}
                  </h2>
                  <p className="text-sm mb-6 text-muted-foreground">
                    {sellerType === 'business'
                      ? 'Dette brukes på din offentlige kursside. Har du et organisasjonsnummer? Da fyller vi ut automatisk.'
                      : 'Navnet vises på din offentlige kursside. Du kan endre dette senere.'}
                  </p>

                  <div className="flex flex-col gap-4 mb-8">
                    {/* Org number lookup — business only */}
                    {sellerType === 'business' && (
                      <>
                        <div>
                          <label htmlFor="welcome-org-nr" className="text-sm font-medium mb-1.5 block text-foreground">
                            Organisasjonsnummer
                            <span className="text-xs font-medium tracking-wide ml-2 text-muted-foreground">(valgfritt)</span>
                          </label>
                          <div className="relative">
                            <Input
                              id="welcome-org-nr"
                              value={orgNumber}
                              onChange={(e) => handleOrgNumberChange(e.target.value)}
                              inputMode="numeric"
                              autoFocus
                              className="pr-10"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {isLookingUp ? (
                                <Loader2 className="size-4 text-muted-foreground animate-spin" />
                              ) : (
                                <Search className="size-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                          {lookupDone && !lookupResult && orgNumber.replace(/\s/g, '').length === 9 && (
                            <p className="text-xs mt-1.5 text-muted-foreground">
                              Fant ingen treff. Fyll inn manuelt under.
                            </p>
                          )}
                        </div>

                        {/* Lookup result card */}
                        {lookupDone && lookupResult && (
                          <Card className="bg-muted/50 p-4">
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 rounded-lg bg-background border border-border p-2">
                                <Building className="size-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium truncate text-foreground">
                                    {lookupResult.name}
                                  </p>
                                  <Check className="size-3.5 text-success shrink-0" />
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                  {lookupResult.orgForm && (
                                    <span className="text-xs font-medium tracking-wide text-muted-foreground">{lookupResult.orgForm}</span>
                                  )}
                                  {lookupResult.city && (
                                    <span className="text-xs font-medium tracking-wide flex items-center gap-1 text-muted-foreground">
                                      <MapPin className="size-3" />
                                      {lookupResult.city}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs tabular-nums mt-1 text-muted-foreground">
                                  Org.nr {lookupResult.orgNr.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}
                                </p>
                              </div>
                            </div>
                          </Card>
                        )}

                        <Separator />
                      </>
                    )}

                    {/* Studio name */}
                    <div>
                      <label htmlFor="welcome-studio" className="text-sm font-medium mb-1.5 block text-foreground">
                        {sellerType === 'business' ? 'Navn på virksomheten' : 'Navn på din kursside'}
                      </label>
                      <Input
                        id="welcome-studio"
                        value={studioName}
                        onChange={(e) => {
                          setStudioName(e.target.value)
                          setStudioNameTouched(true)
                          if (studioError) setStudioError('')
                        }}
                        autoFocus={sellerType === 'individual'}
                        aria-invalid={!!studioError || undefined}
                        aria-describedby={studioError ? 'welcome-studio-error' : 'welcome-studio-hint'}
                      />
                      {studioError ? (
                        <p id="welcome-studio-error" className="text-xs font-medium mt-1.5 text-destructive" role="alert">{studioError}</p>
                      ) : (
                        <p id="welcome-studio-hint" className="text-xs mt-1.5 text-muted-foreground">
                          {sellerType === 'business'
                            ? 'Vises på din offentlige kursside. Du kan endre dette senere.'
                            : 'Mange bruker bare navnet sitt. Du kan også finne på et eget studionavn.'}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline-soft" onClick={() => setStep(1)}>
                      <ArrowLeft className="size-3.5" />
                      Tilbake
                    </Button>
                    <Button
                      onClick={() => {
                        if (!studioName.trim()) {
                          setStudioError('Skriv inn et navn')
                          return
                        }
                        handleSave()
                      }}
                      loading={isSaving}
                      loadingText="Lagrer"
                    >
                      Fullfør
                      <ArrowRight className="size-3.5" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Bridge — preview remaining journey */}
              {step === 3 && (
                <motion.div
                  key="done"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={keyboardNav.current ? slideTransitionFast : slideTransition}
                  onAnimationComplete={() => { keyboardNav.current = false }}
                >
                  <h2 className="text-base font-semibold mb-2 text-foreground">
                    {displayName ? `Bra, ${displayName} — grunnlaget er på plass` : 'Grunnlaget er på plass'}
                  </h2>
                  <p className="text-sm mb-6 text-muted-foreground">
                    To steg igjen før du kan ta imot påmeldinger og betaling.
                  </p>

                  <div className="flex flex-col gap-3 mb-8">
                    {[
                      { icon: CreditCard, label: 'Aktiver betalinger', time: 'ca. 2 min' },
                      { icon: BookOpen, label: 'Opprett ditt første kurs', time: 'ca. 3 min' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-3">
                        <div className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-border">
                          <item.icon className="size-3 text-muted-foreground" />
                        </div>
                        <span className="text-sm text-foreground">{item.label}</span>
                        <span className="text-xs font-medium tracking-wide tabular-nums ml-auto text-muted-foreground">{item.time}</span>
                      </div>
                    ))}
                  </div>

                  <Button onClick={onComplete} className="w-full">
                    Fortsett til oversikten
                    <ArrowRight className="size-3.5" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </main>
  )
}

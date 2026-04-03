import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, Search, Loader2, Building, MapPin, Check, CreditCard, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { pageVariants, pageTransition, slideVariants, slideTransition, slideTransitionFast } from '@/lib/motion'
import { useAuth } from '@/contexts/AuthContext'
import { updateOrganization } from '@/services/organizations'
import { typedFrom } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { Separator } from '@/components/ui/separator'

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
  const { profile, currentOrganization, ensureOrganization, signOut } = useAuth()
  const [step, setStep] = useState(0)
  const keyboardNav = useRef(false)

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
  const [city, setCity] = useState(() => currentOrganization?.city || '')

  // Business info
  const [orgNumber, setOrgNumber] = useState('')
  const [studioName, setStudioName] = useState(() => currentOrganization?.name || '')
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [lookupResult, setLookupResult] = useState<BrregResult | null>(null)
  const [lookupDone, setLookupDone] = useState(false)
  const [studioError, setStudioError] = useState('')

  // Step 0 validation
  const [firstNameError, setFirstNameError] = useState('')
  const [lastNameError, setLastNameError] = useState('')
  const [cityError, setCityError] = useState('')

  const [isSaving, setIsSaving] = useState(false)
  const needsOrg = !currentOrganization

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
          if (result.name) setStudioName(result.name)
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
      let orgId = currentOrganization?.id

      if (needsOrg) {
        const name = studioName.trim()
        if (!name) {
          setStudioError('Skriv inn et navn')
          setIsSaving(false)
          return
        }
        const slug = generateSlug(name)
        const { organization: newOrg, error: orgError } = await ensureOrganization(name, slug)
        if (orgError || !newOrg) {
          logger.error('Welcome flow: org creation failed', orgError)
          toast.error('Kunne ikke opprette virksomheten. Prøv igjen.')
          setIsSaving(false)
          return
        }
        orgId = newOrg.id
      }

      if (profile?.id) {
        const { error } = await typedFrom('profiles')
          .update({
            name: fullName || undefined,
            onboarding_completed_at: new Date().toISOString(),
          } as any)
          .eq('id', profile.id)
        if (error) {
          logger.error('Welcome flow: profile save failed', error)
          toast.error('Kunne ikke lagre profilen. Prøv igjen.')
          return
        }
      }

      if (orgId && city.trim()) {
        const { error } = await updateOrganization(orgId, { city: city.trim() })
        if (error) {
          logger.error('Welcome flow: city save failed', error)
        }
      }

      setStep(2)
    } catch (err) {
      logger.error('Welcome flow save error:', err)
      toast.error('Kunne ikke lagre dataene. Prøv igjen.')
    } finally {
      setIsSaving(false)
    }
  }, [firstName, lastName, studioName, city, needsOrg, profile?.id, currentOrganization?.id, ensureOrganization])

  const displayName = firstName.trim() || currentOrganization?.name || ''

  const validateStep0 = useCallback(() => {
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
    if (step === 0) { if (validateStep0()) setStep(1) }
    else if (step === 1) {
      if (!studioName.trim()) { setStudioError('Skriv inn et navn'); return }
      handleSave()
    }
    else if (step === 2) onComplete()
  }, [step, validateStep0, studioName, handleSave, onComplete])

  const goBack = useCallback(() => {
    if (step === 1) setStep(0)
  }, [step])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        if (e.key === 'Enter') { e.preventDefault(); keyboardNav.current = true; advance() }
        return
      }
      if (e.key === 'ArrowLeft') { e.preventDefault(); keyboardNav.current = true; goBack() }
      else if (e.key === 'ArrowRight') { e.preventDefault(); keyboardNav.current = true; if (step === 0) advance() }
      else if (e.key === 'Enter') { e.preventDefault(); keyboardNav.current = true; advance() }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [step, advance, goBack])

  // Steps: 0=About you (name+city), 1=Studio, 2=Done
  const segments = [
    { label: 'Om deg', steps: [0] },
    { label: 'Virksomheten din', steps: [1] },
  ]

  return (
    <main className="flex-1 overflow-y-auto bg-background min-h-screen flex flex-col">
      {/* Minimal top bar */}
      <div className="flex justify-end px-6 lg:px-8 pt-6 lg:pt-8">
        <Button variant="ghost" size="sm" onClick={() => signOut()} className="type-meta text-muted-foreground h-auto p-0 hover:bg-transparent hover:text-foreground">
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
            {step < 2 && (
              <div className="flex gap-2 mb-8">
                {segments.map((seg) => {
                  const isActive = seg.steps.includes(step)
                  const isDone = step > Math.max(...seg.steps)
                  return (
                    <div key={seg.label} className="flex-1">
                      <div className={`h-[3px] rounded-full mb-2 smooth-transition ${
                        isActive || isDone ? 'bg-primary' : 'bg-border'
                      }`} />
                      <p className={`type-meta smooth-transition ${
                        isActive ? 'font-medium text-foreground' : 'text-muted-foreground'
                      }`}>
                        {seg.label}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}

            <AnimatePresence mode="wait">
              {/* Step 0: Name + City */}
              {step === 0 && (
                <motion.div
                  key="about"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={keyboardNav.current ? slideTransitionFast : slideTransition}
                  onAnimationComplete={() => { keyboardNav.current = false }}
                >
                  <h2 className="type-title mb-1 text-foreground">
                    Først litt om deg
                  </h2>
                  <p className="type-body mb-6 text-muted-foreground">
                    Navnet og byen din vises på kurssiden din, så elevene vet hvem du er.
                  </p>

                  <div className="flex flex-col gap-4 mb-8">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="welcome-first-name" className="type-label-sm mb-1.5 block text-foreground">
                          Fornavn
                        </label>
                        <Input
                          id="welcome-first-name"
                          value={firstName}
                          onChange={(e) => { setFirstName(e.target.value); if (firstNameError) setFirstNameError('') }}
                          placeholder="Ola"
                          autoFocus
                          required
                          aria-invalid={!!firstNameError || undefined}
                          aria-describedby={firstNameError ? 'welcome-first-name-error' : undefined}
                        />
                        {firstNameError && (
                          <p id="welcome-first-name-error" className="type-meta mt-1.5 text-destructive" role="alert">{firstNameError}</p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="welcome-last-name" className="type-label-sm mb-1.5 block text-foreground">
                          Etternavn
                        </label>
                        <Input
                          id="welcome-last-name"
                          value={lastName}
                          onChange={(e) => { setLastName(e.target.value); if (lastNameError) setLastNameError('') }}
                          placeholder="Nordmann"
                          required
                          aria-invalid={!!lastNameError || undefined}
                          aria-describedby={lastNameError ? 'welcome-last-name-error' : undefined}
                        />
                        {lastNameError && (
                          <p id="welcome-last-name-error" className="type-meta mt-1.5 text-destructive" role="alert">{lastNameError}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="welcome-city" className="type-label-sm mb-1.5 block text-foreground">
                        By / Sted
                      </label>
                      <Input
                        id="welcome-city"
                        value={city}
                        onChange={(e) => { setCity(e.target.value); if (cityError) setCityError('') }}
                        placeholder="F.eks. Oslo"
                        required
                        aria-invalid={!!cityError || undefined}
                        aria-describedby={cityError ? 'welcome-city-error' : 'welcome-city-hint'}
                      />
                      {cityError ? (
                        <p id="welcome-city-error" className="type-meta mt-1.5 text-destructive" role="alert">{cityError}</p>
                      ) : (
                        <p id="welcome-city-hint" className="type-meta mt-1.5 text-muted-foreground">
                          Hjelper elever å finne kurs i nærheten.
                        </p>
                      )}
                    </div>
                  </div>

                  <Button onClick={() => { if (validateStep0()) setStep(1) }} className="w-full">
                    Fortsett
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </motion.div>
              )}

              {/* Step 1: Studio */}
              {step === 1 && (
                <motion.div
                  key="studio"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={keyboardNav.current ? slideTransitionFast : slideTransition}
                  onAnimationComplete={() => { keyboardNav.current = false }}
                >
                  <h2 className="type-title mb-1 text-foreground">
                    Om virksomheten din
                  </h2>
                  <p className="type-body mb-6 text-muted-foreground">
                    Dette brukes på din offentlige kursside. Har du et organisasjonsnummer? Da fyller vi ut automatisk.
                  </p>

                  <div className="flex flex-col gap-4 mb-8">
                    {/* Org number lookup */}
                    <div>
                      <label htmlFor="welcome-org-nr" className="type-label-sm mb-1.5 block text-foreground">
                        Organisasjonsnummer
                        <span className="type-body-sm ml-1 text-muted-foreground">(valgfritt)</span>
                      </label>
                      <div className="relative">
                        <Input
                          id="welcome-org-nr"
                          value={orgNumber}
                          onChange={(e) => handleOrgNumberChange(e.target.value)}
                          placeholder="123 456 789"
                          inputMode="numeric"
                          autoFocus
                          className="pr-10"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {isLookingUp ? (
                            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
                          ) : (
                            <Search className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      {lookupDone && !lookupResult && orgNumber.replace(/\s/g, '').length === 9 && (
                        <p className="type-meta mt-1.5 text-muted-foreground">
                          Fant ingen treff. Fyll inn manuelt under.
                        </p>
                      )}
                    </div>

                    {/* Lookup result card */}
                    {lookupDone && lookupResult && (
                      <Card className="bg-surface-muted/50 p-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 rounded-lg bg-background border border-border p-2">
                            <Building className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="type-label truncate text-foreground">
                                {lookupResult.name}
                              </p>
                              <Check className="h-3.5 w-3.5 text-status-confirmed-text shrink-0" />
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                              {lookupResult.orgForm && (
                                <span className="type-meta text-muted-foreground">{lookupResult.orgForm}</span>
                              )}
                              {lookupResult.city && (
                                <span className="type-meta flex items-center gap-1 text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  {lookupResult.city}
                                </span>
                              )}
                            </div>
                            <p className="type-meta mt-1 text-muted-foreground tabular-nums">
                              Org.nr {lookupResult.orgNr.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}
                            </p>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Divider */}
                    <Separator />

                    {/* Studio name */}
                    <div>
                      <label htmlFor="welcome-studio" className="type-label-sm mb-1.5 block text-foreground">
                        Navn på virksomheten
                      </label>
                      <Input
                        id="welcome-studio"
                        value={studioName}
                        onChange={(e) => {
                          setStudioName(e.target.value)
                          if (studioError) setStudioError('')
                        }}
                        placeholder="Yoga med Ola"
                        aria-invalid={!!studioError || undefined}
                        aria-describedby={studioError ? 'welcome-studio-error' : undefined}
                      />
                      {studioError ? (
                        <p id="welcome-studio-error" className="type-meta mt-1.5 text-destructive" role="alert">{studioError}</p>
                      ) : (
                        <p className="type-meta mt-1.5 text-muted-foreground">
                          Vises på din offentlige kursside. Du kan endre dette senere.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline-soft" onClick={() => setStep(0)}>
                      <ArrowLeft className="h-3.5 w-3.5" />
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
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Bridge — preview remaining journey */}
              {step === 2 && (
                <motion.div
                  key="done"
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={keyboardNav.current ? slideTransitionFast : slideTransition}
                  onAnimationComplete={() => { keyboardNav.current = false }}
                >
                  <h2 className="type-title mb-2 text-foreground">
                    {displayName ? `Bra, ${displayName} — grunnlaget er på plass` : 'Grunnlaget er på plass'}
                  </h2>
                  <p className="type-body mb-6 text-muted-foreground leading-relaxed">
                    To steg igjen før du kan ta imot påmeldinger og betaling.
                  </p>

                  <div className="flex flex-col gap-3 mb-8">
                    {[
                      { icon: CreditCard, label: 'Aktiver betalinger', time: 'ca. 2 min' },
                      { icon: BookOpen, label: 'Opprett ditt første kurs', time: 'ca. 3 min' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-3">
                        <div className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-border">
                          <item.icon className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <span className="type-body text-foreground">{item.label}</span>
                        <span className="type-meta ml-auto text-muted-foreground">{item.time}</span>
                      </div>
                    ))}
                  </div>

                  <Button onClick={onComplete} className="w-full">
                    Fortsett til oversikten
                    <ArrowRight className="h-3.5 w-3.5" />
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

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, Search, Loader2, Building, MapPin, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MobileTeacherHeader } from '@/components/teacher/MobileTeacherHeader'
import { pageVariants, pageTransition } from '@/lib/motion'
import { useAuth } from '@/contexts/AuthContext'
import { updateOrganization } from '@/services/organizations'
import { typedFrom } from '@/lib/supabase'
import { logger } from '@/lib/logger'

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

const slideVariants = {
  enter: { opacity: 0, x: 24 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
}

export function WelcomeFlow({ onComplete }: WelcomeFlowProps) {
  const { profile, currentOrganization, ensureOrganization, signOut } = useAuth()
  const [step, setStep] = useState(0)

  // Personal info — don't prefill if the name is just the email prefix (e.g. "kristian" from "kristian@example.com")
  const prefillName = (() => {
    const name = profile?.name?.trim()
    if (!name) return ''
    const emailPrefix = profile?.email?.split('@')[0]
    if (emailPrefix && name.toLowerCase() === emailPrefix.toLowerCase()) return ''
    return name
  })()
  const [firstName, setFirstName] = useState(() => prefillName.split(' ')[0] || '')
  const [lastName, setLastName] = useState(() => prefillName.split(' ').slice(1).join(' ') || '')

  // Business info
  const [orgNumber, setOrgNumber] = useState('')
  const [studioName, setStudioName] = useState(() => currentOrganization?.name || '')
  const [city, setCity] = useState(() => currentOrganization?.city || '')
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [lookupResult, setLookupResult] = useState<BrregResult | null>(null)
  const [lookupDone, setLookupDone] = useState(false)
  const [studioError, setStudioError] = useState('')

  const [isSaving, setIsSaving] = useState(false)
  const needsOrg = !currentOrganization

  // Debounced org number lookup
  const lookupTimerRef = useRef<ReturnType<typeof setTimeout>>(null)
  const handleOrgNumberChange = useCallback((value: string) => {
    // Allow digits and spaces for readability (e.g. "123 456 789")
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
          toast.error('Kunne ikke opprette studioet. Prøv igjen.')
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

      setStep(4)
    } catch (err) {
      logger.error('Welcome flow save error:', err)
      toast.error('Kunne ikke lagre. Prøv igjen.')
    } finally {
      setIsSaving(false)
    }
  }, [firstName, lastName, studioName, city, needsOrg, profile?.id, currentOrganization?.id, ensureOrganization])

  const displayName = firstName.trim() || currentOrganization?.name || ''

  // Keyboard navigation
  const advance = useCallback(() => {
    if (step === 0) setStep(1)
    else if (step === 1) setStep(2)
    else if (step === 2) setStep(3)
    else if (step === 3) {
      if (!studioName.trim()) { setStudioError('Skriv inn et navn'); return }
      handleSave()
    }
    else if (step === 4) onComplete()
  }, [step, studioName, handleSave, onComplete])

  const goBack = useCallback(() => {
    if (step > 0 && step < 4) setStep((s) => s - 1)
  }, [step])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        if (e.key === 'Enter') { e.preventDefault(); advance() }
        return
      }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goBack() }
      else if (e.key === 'ArrowRight') { e.preventDefault(); if (step < 3) advance() }
      else if (e.key === 'Enter') { e.preventDefault(); advance() }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [step, advance, goBack])

  // Steps: 0=Welcome, 1=Name, 2=City, 3=Studio
  const segments = [
    { label: 'Velkommen', steps: [0] },
    { label: 'Om deg', steps: [1, 2] },
    { label: 'Studioet ditt', steps: [3] },
  ]

  return (
    <main className="flex-1 overflow-y-auto bg-surface h-screen">
      <MobileTeacherHeader title="Kom i gang" />

      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:px-8 lg:py-8">
        <motion.div
          variants={pageVariants}
          initial="initial"
          animate="animate"
          transition={pageTransition}
        >
          <header className="mb-8 flex items-end justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-text-tertiary mb-2">Kom i gang</p>
              <h1 className="font-geist text-2xl font-medium tracking-tight text-text-primary">
                Sett opp kontoen din
              </h1>
            </div>
            <button
              onClick={() => signOut()}
              className="text-xs text-text-tertiary hover:text-text-primary smooth-transition"
            >
              Logg ut
            </button>
          </header>

          <div className="max-w-2xl">
              <div className="rounded-xl bg-white border border-zinc-200 p-6 sm:p-8">
                {/* Step indicator */}
                {step < 4 && (
                  <div className="flex gap-2 mb-8">
                    {segments.map((seg) => {
                      const isActive = seg.steps.includes(step)
                      const isDone = step > Math.max(...seg.steps)
                      return (
                        <div key={seg.label} className="flex-1">
                          <div className={`h-[3px] rounded-full mb-2 smooth-transition ${
                            isActive || isDone ? 'bg-zinc-900' : 'bg-zinc-200'
                          }`} />
                          <p className={`text-xs smooth-transition ${
                            isActive ? 'font-medium text-text-primary' : 'text-text-tertiary'
                          }`}>
                            {seg.label}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}

                <AnimatePresence mode="wait">
                  {/* Step 0: Welcome */}
                  {step === 0 && (
                    <motion.div
                      key="welcome"
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.2 }}
                    >
                      <h2 className="text-lg font-medium text-text-primary mb-2">
                        Velkommen til Ease
                      </h2>
                      <p className="text-sm text-text-secondary leading-relaxed mb-8">
                        La oss sette opp kontoen din. Det tar under ett minutt.
                      </p>
                      <Button onClick={() => setStep(1)} className="w-full">
                        Kom i gang
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </motion.div>
                  )}

                  {/* Step 1: Name */}
                  {step === 1 && (
                    <motion.div
                      key="name"
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.2 }}
                    >
                      <h2 className="text-lg font-medium text-text-primary mb-1">
                        Hva heter du?
                      </h2>
                      <p className="text-sm text-text-secondary mb-6">
                        Navnet vises på kurssiden din.
                      </p>

                      <div className="grid grid-cols-2 gap-3 mb-8">
                        <div>
                          <label htmlFor="welcome-first-name" className="text-xs font-medium text-text-primary mb-1.5 block">
                            Fornavn
                          </label>
                          <Input
                            id="welcome-first-name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="Ola"
                            autoFocus
                          />
                        </div>
                        <div>
                          <label htmlFor="welcome-last-name" className="text-xs font-medium text-text-primary mb-1.5 block">
                            Etternavn
                          </label>
                          <Input
                            id="welcome-last-name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Nordmann"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" onClick={() => setStep(0)}>
                          <ArrowLeft className="h-3.5 w-3.5" />
                          Tilbake
                        </Button>
                        <Button onClick={() => setStep(2)}>
                          Neste
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2: City */}
                  {step === 2 && (
                    <motion.div
                      key="city"
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.2 }}
                    >
                      <h2 className="text-lg font-medium text-text-primary mb-1">
                        Hvilken by holder du til i?
                      </h2>
                      <p className="text-sm text-text-secondary mb-6">
                        Hjelper elever å finne kurs i nærheten.
                      </p>

                      <div className="mb-8">
                        <label htmlFor="welcome-city" className="text-xs font-medium text-text-primary mb-1.5 block">
                          By
                        </label>
                        <Input
                          id="welcome-city"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Oslo"
                          autoFocus
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" onClick={() => setStep(1)}>
                          <ArrowLeft className="h-3.5 w-3.5" />
                          Tilbake
                        </Button>
                        <Button onClick={() => setStep(3)}>
                          Neste
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Business info */}
                  {step === 3 && (
                    <motion.div
                      key="studio"
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.2 }}
                    >
                      <h2 className="text-lg font-medium text-text-primary mb-1">
                        Om studioet ditt
                      </h2>
                      <p className="text-sm text-text-secondary mb-6">
                        Har du et organisasjonsnummer? Da fyller vi ut automatisk.
                      </p>

                      <div className="flex flex-col gap-4 mb-8">
                        {/* Org number lookup */}
                        <div>
                          <label htmlFor="welcome-org-nr" className="text-xs font-medium text-text-primary mb-1.5 block">
                            Organisasjonsnummer
                            <span className="text-text-tertiary font-normal ml-1">(valgfritt)</span>
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
                                <Loader2 className="h-4 w-4 text-text-tertiary animate-spin" />
                              ) : (
                                <Search className="h-4 w-4 text-text-tertiary" />
                              )}
                            </div>
                          </div>
                          {lookupDone && !lookupResult && orgNumber.replace(/\s/g, '').length === 9 && (
                            <p className="text-xs text-text-tertiary mt-1.5">
                              Fant ingen treff. Fyll inn manuelt under.
                            </p>
                          )}
                        </div>

                        {/* Lookup result card */}
                        {lookupDone && lookupResult && (
                          <div className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4">
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5 rounded-lg bg-white border border-zinc-200 p-2">
                                <Building className="h-4 w-4 text-text-tertiary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-text-primary truncate">
                                    {lookupResult.name}
                                  </p>
                                  <Check className="h-3.5 w-3.5 text-status-confirmed-text shrink-0" />
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                  {lookupResult.orgForm && (
                                    <span className="text-xs text-text-secondary">{lookupResult.orgForm}</span>
                                  )}
                                  {lookupResult.city && (
                                    <span className="flex items-center gap-1 text-xs text-text-secondary">
                                      <MapPin className="h-3 w-3" />
                                      {lookupResult.city}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-text-secondary mt-1 tabular-nums">
                                  Org.nr {lookupResult.orgNr.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Divider */}
                        <div className="h-px bg-zinc-100" />

                        {/* Studio name */}
                        <div>
                          <label htmlFor="welcome-studio" className="text-xs font-medium text-text-primary mb-1.5 block">
                            Studionavn
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
                          />
                          {studioError ? (
                            <p className="text-xs text-destructive mt-1.5">{studioError}</p>
                          ) : (
                            <p className="text-xs text-text-tertiary mt-1.5">
                              Vises på din offentlige kursside. Du kan endre dette senere.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" onClick={() => setStep(2)}>
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

                  {/* Step 4: Confirmation */}
                  {step === 4 && (
                    <motion.div
                      key="done"
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.2 }}
                    >
                      <h2 className="text-lg font-medium text-text-primary mb-2">
                        {displayName ? `Flott, ${displayName}` : 'Flott'}
                      </h2>
                      <p className="text-sm text-text-secondary leading-relaxed mb-8">
                        Studioet ditt er klart. Du finner flere innstillinger under profil-siden.
                      </p>
                      <Button onClick={onComplete} className="w-full">
                        Gå til oversikten
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
          </div>
        </motion.div>
      </div>
    </main>
  )
}

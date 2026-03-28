import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { updateOrganization } from '@/services/organizations'
import { typedFrom } from '@/lib/supabase'
import { logger } from '@/lib/logger'

const TOTAL_STEPS = 5

/** Generate URL-friendly slug from organization name */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[æ]/g, 'ae')
    .replace(/[ø]/g, 'o')
    .replace(/[å]/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Check if the welcome flow should be shown (profile not yet onboarded) */
export function useWelcomeFlow() {
  const { profile } = useAuth()
  const isComplete = !!profile?.onboarding_completed_at
  const [dismissed, setDismissed] = useState(false)

  return {
    isOpen: !isComplete && !dismissed,
    dismiss: useCallback(() => setDismissed(true), []),
  }
}

interface WelcomeFlowProps {
  isOpen: boolean
  onDismiss: () => void
  /** If true, org creation is required (user has no org yet) — X button hidden, cannot skip */
  requireOrg?: boolean
}

const slideVariants = {
  enter: { opacity: 0, x: 20 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
}

export function WelcomeFlow({ isOpen, onDismiss, requireOrg = false }: WelcomeFlowProps) {
  const { profile, currentOrganization, ensureOrganization, refreshOrganizations } = useAuth()
  const [step, setStep] = useState(0)
  const [firstName, setFirstName] = useState(() => profile?.name?.split(' ')[0] || '')
  const [lastName, setLastName] = useState(() => profile?.name?.split(' ').slice(1).join(' ') || '')
  const [studioName, setStudioName] = useState(() => currentOrganization?.name || '')
  const [city, setCity] = useState(() => currentOrganization?.city || '')
  const [isSaving, setIsSaving] = useState(false)
  const [studioError, setStudioError] = useState('')

  // Whether we need to create an org (no org exists yet)
  const needsOrg = !currentOrganization

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim()

      // Create org if needed, track the org ID for city save
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

      // Save profile name + mark onboarding complete
      if (profile?.id) {
        const { error } = await typedFrom('profiles')
          .update({
            name: fullName || undefined,
            onboarding_completed_at: new Date().toISOString(),
          } as any)
          .eq('id', profile.id)
        if (error) {
          logger.error('Welcome flow: profile save failed', error)
        }
      }

      // Save city on org
      if (orgId && city.trim()) {
        const { error } = await updateOrganization(orgId, { city: city.trim() })
        if (error) {
          logger.error('Welcome flow: city save failed', error)
        }
      }

      await refreshOrganizations()
      setStep(4)
    } catch (err) {
      logger.error('Welcome flow save error:', err)
      toast.error('Kunne ikke lagre. Prøv igjen.')
    } finally {
      setIsSaving(false)
    }
  }, [firstName, lastName, studioName, city, needsOrg, profile?.id, currentOrganization?.id, ensureOrganization, refreshOrganizations])

  const handleDismiss = useCallback(async () => {
    // If org is required and doesn't exist, don't allow dismiss
    if (requireOrg && !currentOrganization) return

    // Mark onboarding as completed even if user skips
    if (profile?.id && !profile.onboarding_completed_at) {
      await typedFrom('profiles')
        .update({ onboarding_completed_at: new Date().toISOString() } as any)
        .eq('id', profile.id)
    }
    onDismiss()
  }, [requireOrg, currentOrganization, profile?.id, profile?.onboarding_completed_at, onDismiss])

  const displayName = firstName.trim() || currentOrganization?.name || ''

  // Keyboard navigation
  const goBack = useCallback(() => {
    if (step > 0 && step < 4) setStep((s) => s - 1)
  }, [step])

  const goForward = useCallback(() => {
    if (step === 0) setStep(1)
    else if (step === 1) setStep(2)
    else if (step === 2) setStep(3)
    // Step 3 (city) triggers save — use Enter/button
  }, [step])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        if (e.key === 'Enter') {
          e.preventDefault()
          if (step === 0) setStep(1)
          else if (step === 1) setStep(2)
          else if (step === 2) setStep(3)
          else if (step === 3) handleSave()
          else if (step === 4) onDismiss()
        }
        return
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goBack()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goForward()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (step === 0) setStep(1)
        else if (step === 1) setStep(2)
        else if (step === 2) setStep(3)
        else if (step === 3) handleSave()
        else if (step === 4) onDismiss()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, step, goBack, goForward, handleSave, onDismiss])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleDismiss() }}>
      <DialogContent className={`sm:max-w-md p-0 gap-0 overflow-hidden [&>[data-slot=dialog-close]]:top-[1.65rem] [&>[data-slot=dialog-close]]:right-6 ${requireOrg ? '[&>[data-slot=dialog-close]]:hidden' : ''}`}>
        {/* Step indicator */}
        <div className="flex items-center gap-3 px-6 pt-6 pr-14">
          <span className="text-xs font-medium text-text-tertiary tabular-nums">
            {step + 1} / {TOTAL_STEPS}
          </span>
          <div className="flex gap-1.5 flex-1">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div
                key={i}
                className={`h-[3px] flex-1 rounded-full smooth-transition ${
                  i <= step ? 'bg-zinc-900' : 'bg-zinc-200'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="px-6 pb-6 pt-5 min-h-[260px] flex flex-col">
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
                className="flex flex-col flex-1"
              >
                <div className="flex-1 flex flex-col justify-center">
                  <h2 className="text-lg font-medium text-text-primary mb-2">
                    Velkommen til Ease
                  </h2>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    La oss sette opp studioet ditt. Det tar under ett minutt.
                  </p>
                </div>
                <Button onClick={() => setStep(1)} className="w-full mt-6">
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
                className="flex flex-col flex-1"
              >
                <div className="flex-1">
                  <h2 className="text-lg font-medium text-text-primary mb-1">
                    Hva heter du?
                  </h2>
                  <p className="text-sm text-text-secondary mb-6">
                    Navnet vises på kurssiden din.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
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
                </div>

                <div className="grid grid-cols-2 gap-3 mt-6">
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

            {/* Step 2: Studio name */}
            {step === 2 && (
              <motion.div
                key="studio"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2 }}
                className="flex flex-col flex-1"
              >
                <div className="flex-1">
                  <h2 className="text-lg font-medium text-text-primary mb-1">
                    Hva heter studioet ditt?
                  </h2>
                  <p className="text-sm text-text-secondary mb-6">
                    Navnet på din virksomhet eller kursside.
                  </p>

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
                      autoFocus
                      aria-invalid={!!studioError || undefined}
                    />
                    {studioError ? (
                      <p className="text-xs text-destructive mt-1.5">{studioError}</p>
                    ) : (
                      <p className="text-xs text-text-tertiary mt-1.5">
                        Du kan endre dette senere.
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-6">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Tilbake
                  </Button>
                  <Button onClick={() => {
                    if (!studioName.trim()) {
                      setStudioError('Skriv inn et navn')
                      return
                    }
                    setStep(3)
                  }}>
                    Neste
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: City */}
            {step === 3 && (
              <motion.div
                key="city"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2 }}
                className="flex flex-col flex-1"
              >
                <div className="flex-1">
                  <h2 className="text-lg font-medium text-text-primary mb-1">
                    Hvilken by holder du til i?
                  </h2>
                  <p className="text-sm text-text-secondary mb-6">
                    Hjelper elever å finne kurs i nærheten.
                  </p>

                  <div>
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
                </div>

                <div className="grid grid-cols-2 gap-3 mt-6">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Tilbake
                  </Button>
                  <Button
                    onClick={handleSave}
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
                className="flex flex-col flex-1"
              >
                <div className="flex-1 flex flex-col justify-center">
                  <h2 className="text-lg font-medium text-text-primary mb-2">
                    {displayName ? `Flott, ${displayName}` : 'Flott'}
                  </h2>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    Studioet ditt er klart. Du finner flere innstillinger under profil-siden.
                  </p>
                </div>
                <Button onClick={onDismiss} className="w-full mt-6">
                  Gå til oversikten
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}

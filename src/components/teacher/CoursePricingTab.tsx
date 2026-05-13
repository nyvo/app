import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Star, MoreHorizontal } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState as SharedEmptyState } from '@/components/ui/empty-state'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { ConfirmDialog, ConfirmScopeItem } from '@/components/ui/confirm-dialog'
import { friendlyError } from '@/lib/error-messages'
import { formatKroner } from '@/lib/utils'
import {
  buildDiscountDuplicate,
  deactivateTicketType,
  deleteTicketType,
  fetchTicketTypesForCourse,
  reactivateTicketType,
  setDefaultTicketType,
} from '@/services/ticketTypes'
import { TicketTypeForm } from './TicketTypeForm'
import type { TicketAudience, TicketType, TicketTypeInsert } from '@/types/database'

const AUDIENCE_LABEL: Record<TicketAudience, string> = {
  standard: 'Standard',
  student: 'Student',
  senior: 'Honnør',
  staff: 'Personale',
}

interface CoursePricingTabProps {
  courseId: string
  /** Used as the default `weeks` value for new package tiers. */
  courseTotalWeeks: number | null
}

export function CoursePricingTab({ courseId, courseTotalWeeks }: CoursePricingTabProps) {
  const [tiers, setTiers] = useState<TicketType[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<TicketType | null>(null)
  const [prefill, setPrefill] = useState<TicketTypeInsert | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await fetchTicketTypesForCourse(courseId)
    if (error) {
      toast.error(friendlyError(error, 'Kunne ikke laste billettyper'))
    }
    setTiers(data)
    setLoading(false)
  }, [courseId])

  useEffect(() => {
    void load()
  }, [load])

  // Group: active first (sorted by display_order), then archived.
  const { active, archived } = useMemo(() => {
    return {
      active: tiers.filter(t => t.is_active),
      archived: tiers.filter(t => !t.is_active),
    }
  }, [tiers])

  function startCreate() {
    setEditing(null)
    setPrefill(null)
    setFormOpen(true)
  }

  function startEdit(tier: TicketType) {
    setEditing(tier)
    setPrefill(null)
    setFormOpen(true)
  }

  function startDuplicate(tier: TicketType) {
    setEditing(null)
    setPrefill(buildDiscountDuplicate(tier))
    setFormOpen(true)
  }

  async function handleSetDefault(tier: TicketType) {
    if (tier.is_default) return
    const { error } = await setDefaultTicketType(courseId, tier.id)
    if (error) {
      toast.error(friendlyError(error, 'Kunne ikke sette standard'))
      return
    }
    toast.success(`«${tier.label}» er nå standardvalget`)
    void load()
  }

  // Tier 1 — toast+undo. is_active flip is fully reversible, so archive/
  // restore are both optimistic with an Angre action that swaps them back.
  async function handleArchive(tier: TicketType) {
    if (tier.is_default) {
      toast.error('Kan ikke arkivere standardvalget. Sett en annen som standard først.')
      return
    }
    // Optimistic flip
    setTiers(prev => prev.map(t => t.id === tier.id ? { ...t, is_active: false } : t))
    const { error } = await deactivateTicketType(tier.id)
    if (error) {
      // Revert on failure
      setTiers(prev => prev.map(t => t.id === tier.id ? { ...t, is_active: true } : t))
      toast.error(friendlyError(error, 'Kunne ikke arkivere'))
      return
    }
    toast.success('Arkivert', {
      duration: 8000,
      action: {
        label: 'Angre',
        onClick: async () => {
          setTiers(prev => prev.map(t => t.id === tier.id ? { ...t, is_active: true } : t))
          const { error: revertError } = await reactivateTicketType(tier.id)
          if (revertError) {
            setTiers(prev => prev.map(t => t.id === tier.id ? { ...t, is_active: false } : t))
            toast.error(friendlyError(revertError, 'Kunne ikke gjenopprette'))
          }
        },
      },
    })
  }

  async function handleRestore(tier: TicketType) {
    setTiers(prev => prev.map(t => t.id === tier.id ? { ...t, is_active: true } : t))
    const { error } = await reactivateTicketType(tier.id)
    if (error) {
      setTiers(prev => prev.map(t => t.id === tier.id ? { ...t, is_active: false } : t))
      toast.error(friendlyError(error, 'Kunne ikke aktivere'))
      return
    }
    toast.success('Aktivert', {
      duration: 8000,
      action: {
        label: 'Angre',
        onClick: async () => {
          setTiers(prev => prev.map(t => t.id === tier.id ? { ...t, is_active: false } : t))
          const { error: revertError } = await deactivateTicketType(tier.id)
          if (revertError) {
            setTiers(prev => prev.map(t => t.id === tier.id ? { ...t, is_active: true } : t))
            toast.error(friendlyError(revertError, 'Kunne ikke gjenopprette'))
          }
        },
      },
    })
  }

  async function handleHardDelete(tier: TicketType) {
    setDeletingId(null)
    const { error } = await deleteTicketType(tier.id)
    if (error) {
      // FK violation → there are signups referencing this tier.
      const msg = error.message?.toLowerCase().includes('foreign key')
        || error.message?.toLowerCase().includes('violates')
        ? 'Denne billettypen har påmeldinger og kan ikke slettes. Bruk «Arkiver» i stedet.'
        : friendlyError(error, 'Kunne ikke slette')
      toast.error(msg)
      return
    }
    toast.success('Slettet')
    void load()
  }

  return (
    <div>
      {/* Aktive billettyper — first section, no top divider. Heading on the
          left, list of tiers on the right (col-span-2). */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
        <div>
          <h3 className="text-base font-semibold text-foreground">Billettyper</h3>
          <p className="mt-1 text-sm text-foreground-muted">
            Lag en eller flere billettyper — for eksempel «Hele kurset», «Student-rabatt» og «Drop-in».
            Deltakerne ser bare aktive billetter på påmeldingssiden.
          </p>
        </div>
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-end">
            <Button size="sm" onClick={startCreate} className="shrink-0">
              Ny billettype
            </Button>
          </div>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-20 rounded-lg" />
            </div>
          ) : active.length === 0 ? (
            <EmptyState onCreate={startCreate} />
          ) : (
            <div className="space-y-3">
              {active.map(tier => (
                <TicketTypeRow
                  key={tier.id}
                  tier={tier}
                  onEdit={() => startEdit(tier)}
                  onDuplicate={() => startDuplicate(tier)}
                  onSetDefault={() => handleSetDefault(tier)}
                  onArchive={() => handleArchive(tier)}
                  onDelete={() => setDeletingId(tier.id)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {archived.length > 0 && (
        <section className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8 mt-10 pt-10 border-t border-border">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Arkiverte <span className="text-foreground-muted tabular-nums font-normal">({archived.length})</span>
            </h3>
            <p className="mt-1 text-sm text-foreground-muted">
              Skjult fra påmeldingssiden. Tidligere påmeldinger beholder fortsatt riktig billettlabel.
            </p>
          </div>
          <div className="md:col-span-2 space-y-3">
            {archived.map(tier => (
              <TicketTypeRow
                key={tier.id}
                tier={tier}
                archived
                onEdit={() => startEdit(tier)}
                onRestore={() => handleRestore(tier)}
                onDelete={() => setDeletingId(tier.id)}
              />
            ))}
          </div>
        </section>
      )}

      <TicketTypeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        prefill={prefill}
        courseId={courseId}
        defaultWeeks={courseTotalWeeks}
        onSaved={() => void load()}
      />

      {(() => {
        const deletingTier = tiers.find(t => t.id === deletingId)
        return (
          <ConfirmDialog
            open={!!deletingId}
            onOpenChange={open => !open && setDeletingId(null)}
            ariaLabel="Slett billettype"
            headline="Billettypen slettes permanent. Sletting fungerer kun hvis ingen påmeldinger viser til billetten — bruk «Arkiver» ellers."
            scope={
              deletingTier ? (
                <ConfirmScopeItem
                  name={deletingTier.label}
                  meta={AUDIENCE_LABEL[deletingTier.audience as TicketAudience]}
                  trailing={formatKroner(deletingTier.price)}
                />
              ) : (
                <ConfirmScopeItem name="Billettype" />
              )
            }
            actionLabel="Slett permanent"
            onConfirm={() => {
              if (deletingTier) void handleHardDelete(deletingTier)
            }}
          />
        )
      })()}
    </div>
  )
}

interface TicketTypeRowProps {
  tier: TicketType
  archived?: boolean
  onEdit?: () => void
  onDuplicate?: () => void
  onSetDefault?: () => void
  onArchive?: () => void
  onRestore?: () => void
  onDelete?: () => void
}

function TicketTypeRow({
  tier,
  archived,
  onEdit,
  onDuplicate,
  onSetDefault,
  onArchive,
  onRestore,
  onDelete,
}: TicketTypeRowProps) {
  const isDropIn = tier.ticket_kind === 'drop_in'
  const audienceLabel = tier.audience !== 'standard' ? AUDIENCE_LABEL[tier.audience as TicketAudience] : null
  const salesEnds = tier.sales_ends_at ? new Date(tier.sales_ends_at) : null
  const salesStarts = tier.sales_starts_at ? new Date(tier.sales_starts_at) : null
  const now = new Date()
  const expired = !!salesEnds && salesEnds <= now
  const upcoming = !!salesStarts && salesStarts > now

  // Fold descriptive badges into the muted meta line as text fragments.
  const metaParts: { text: string; tone?: 'foreground' | 'muted' | 'warning' }[] = [
    { text: formatKroner(tier.price), tone: 'foreground' },
  ]
  if (isDropIn) metaParts.push({ text: 'per gang', tone: 'muted' })
  if (!isDropIn && tier.weeks) metaParts.push({ text: `${tier.weeks} uker`, tone: 'muted' })
  if (audienceLabel) metaParts.push({ text: audienceLabel, tone: 'muted' })
  if (tier.max_quantity != null) metaParts.push({ text: `Maks ${tier.max_quantity}`, tone: 'muted' })
  if (expired) metaParts.push({ text: `Utløpt ${salesEnds!.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}`, tone: 'warning' })
  else if (salesEnds) metaParts.push({ text: `T.o.m. ${salesEnds.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}`, tone: 'muted' })
  if (upcoming) metaParts.push({ text: 'Ikke i salg ennå', tone: 'warning' })

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border border-border p-4',
        archived && 'bg-muted',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {tier.is_default && (
            <span
              className="text-foreground shrink-0"
              title="Standardvalg"
              aria-label="Standardvalg"
            >
              <Star className="size-4" fill="currentColor" strokeWidth={0} />
            </span>
          )}
          <p className={cn(
            'text-base font-semibold',
            archived ? 'text-foreground-muted' : 'text-foreground',
          )}>
            {tier.label}
          </p>
        </div>
        <p className="mt-1 text-sm tabular-nums text-foreground-muted">
          {metaParts.map((part, i) => (
            <span key={i}>
              {i > 0 && <span className="text-foreground-disabled mx-2">·</span>}
              <span className={cn(
                part.tone === 'foreground' && 'text-foreground font-medium',
                part.tone === 'warning' && 'text-foreground font-medium',
              )}>
                {part.text}
              </span>
            </span>
          ))}
        </p>
        {tier.description && (
          <p className="mt-2 text-xs text-foreground-muted">{tier.description}</p>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Mer"
            className="shrink-0 -mr-2"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onEdit && (
            <DropdownMenuItem onClick={onEdit}>
              Rediger
            </DropdownMenuItem>
          )}
          {!archived && onSetDefault && !tier.is_default && (
            <DropdownMenuItem onClick={onSetDefault}>
              Sett som standard
            </DropdownMenuItem>
          )}
          {!archived && onDuplicate && (
            <DropdownMenuItem onClick={onDuplicate}>
              Dupliser
            </DropdownMenuItem>
          )}
          {!archived && onArchive && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onArchive}>
                Arkiver
              </DropdownMenuItem>
            </>
          )}
          {archived && onRestore && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onRestore}>
                Aktiver
              </DropdownMenuItem>
            </>
          )}
          {onDelete && (
            <DropdownMenuItem onClick={onDelete} className="text-danger">
              Slett permanent
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <SharedEmptyState
      variant="compact"
      title="Ingen billettyper enda"
      description="Opprett minst én aktiv billettype for at studenter skal kunne melde seg på."
      action={
        <Button size="sm" onClick={onCreate}>
          Ny billettype
        </Button>
      }
    />
  )
}

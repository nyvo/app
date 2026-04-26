import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Star, Copy, Archive, ArchiveRestore, Pencil, Trash2 as Trash } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
  senior: 'Senior',
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

  async function handleArchive(tier: TicketType) {
    if (tier.is_default) {
      toast.error('Kan ikke arkivere standardvalget. Sett en annen som standard først.')
      return
    }
    const { error } = await deactivateTicketType(tier.id)
    if (error) {
      toast.error(friendlyError(error, 'Kunne ikke arkivere'))
      return
    }
    toast.success('Arkivert')
    void load()
  }

  async function handleRestore(tier: TicketType) {
    const { error } = await reactivateTicketType(tier.id)
    if (error) {
      toast.error(friendlyError(error, 'Kunne ikke aktivere'))
      return
    }
    toast.success('Aktivert')
    void load()
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
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Priser og billettyper</CardTitle>
            <CardDescription className="mt-1">
              Lag en eller flere billettyper — for eksempel «Hele kurset», «Student-rabatt» og «Drop-in».
              Studenten ser bare aktive billetter på påmeldingssiden.
            </CardDescription>
          </div>
          <Button size="sm" onClick={startCreate} className="shrink-0 gap-1.5">
            <Plus className="size-3.5" />
            Ny billettype
          </Button>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {archived.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Arkiverte ({archived.length})</CardTitle>
            <CardDescription className="mt-0.5">
              Skjult fra påmeldingssiden. Tidligere påmeldinger beholder fortsatt riktig billettlabel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
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
          </CardContent>
        </Card>
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

      <AlertDialog open={!!deletingId} onOpenChange={open => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slette denne billettypen?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanent sletting fungerer kun hvis ingen påmeldinger viser til denne billetten.
              Hvis det finnes påmeldinger, bruk «Arkiver» i stedet — da skjules den fra påmeldingssiden
              men historikken beholdes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const target = tiers.find(t => t.id === deletingId)
                if (target) void handleHardDelete(target)
              }}
            >
              Slett permanent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  const expired = salesEnds && salesEnds <= now
  const upcoming = salesStarts && salesStarts > now

  return (
    <div
      className={`flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between ${archived ? 'bg-muted/50' : ''}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{tier.label}</p>
          {tier.is_default && (
            <Badge variant="accent" shape="rect" size="xs">
              Standardvalg
            </Badge>
          )}
          {isDropIn && (
            <Badge variant="secondary" shape="rect" size="xs">
              Drop-in
            </Badge>
          )}
          {audienceLabel && (
            <Badge variant="secondary" shape="rect" size="xs">
              {audienceLabel}
            </Badge>
          )}
          {expired && (
            <Badge variant="warning" shape="rect" size="xs">
              Utløpt
            </Badge>
          )}
          {upcoming && (
            <Badge variant="info" shape="rect" size="xs">
              Ikke i salg ennå
            </Badge>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span className="tabular-nums font-medium text-foreground">{formatKroner(tier.price)}</span>
          {!isDropIn && tier.weeks ? <span>{tier.weeks} uker</span> : null}
          {tier.max_quantity != null && <span>Maks {tier.max_quantity}</span>}
          {salesEnds && !expired && (
            <span>T.o.m. {salesEnds.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long' })}</span>
          )}
        </div>
        {tier.description && (
          <p className="mt-1 text-xs text-muted-foreground">{tier.description}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {!archived && onSetDefault && !tier.is_default && (
          <Button variant="ghost" size="xs" onClick={onSetDefault} className="gap-1.5">
            <Star className="size-3.5" />
            Sett som standard
          </Button>
        )}
        {!archived && onDuplicate && (
          <Button variant="ghost" size="xs" onClick={onDuplicate} className="gap-1.5">
            <Copy className="size-3.5" />
            Dupliser
          </Button>
        )}
        {onEdit && (
          <Button variant="ghost" size="xs" onClick={onEdit} className="gap-1.5">
            <Pencil className="size-3.5" />
            Rediger
          </Button>
        )}
        {!archived && onArchive && (
          <Button variant="ghost" size="xs" onClick={onArchive} className="gap-1.5">
            <Archive className="size-3.5" />
            Arkiver
          </Button>
        )}
        {archived && onRestore && (
          <Button variant="ghost" size="xs" onClick={onRestore} className="gap-1.5">
            <ArchiveRestore className="size-3.5" />
            Aktiver
          </Button>
        )}
        {onDelete && (
          <Button variant="ghost" size="xs" onClick={onDelete} className="gap-1.5 text-destructive hover:text-destructive">
            <Trash className="size-3.5" />
            Slett
          </Button>
        )}
      </div>
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-1 py-8 text-center">
      <p className="text-sm font-medium text-foreground">Ingen billettyper enda</p>
      <p className="text-xs text-muted-foreground">
        Opprett minst én aktiv billettype for at studenter skal kunne melde seg på.
      </p>
      <Button size="sm" className="mt-3 gap-1.5" onClick={onCreate}>
        <Plus className="size-3.5" />
        Ny billettype
      </Button>
    </div>
  )
}

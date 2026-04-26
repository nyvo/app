import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'

// No `Label` primitive in this codebase — using native `<label>` styled inline.
function Label({ htmlFor, children, className }: { htmlFor?: string; children: React.ReactNode; className?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className={`text-sm font-medium text-foreground ${className ?? ''}`}
    >
      {children}
    </label>
  )
}
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { friendlyError } from '@/lib/error-messages'
import {
  createTicketType,
  updateTicketType,
} from '@/services/ticketTypes'
import type {
  TicketAudience,
  TicketKind,
  TicketType,
  TicketTypeInsert,
} from '@/types/database'

const AUDIENCE_LABELS: Record<TicketAudience, string> = {
  standard: 'Standard',
  student: 'Student / ufør / pensjon',
  senior: 'Senior',
  staff: 'Personale',
}

const KIND_LABELS: Record<TicketKind, string> = {
  package: 'Pakke (full påmelding eller flere uker)',
  drop_in: 'Drop-in (én økt)',
  pass: 'Klippekort (kommer)',
}

interface FormState {
  label: string
  description: string
  price: string // string in form, parsed to number on submit
  ticket_kind: TicketKind
  audience: TicketAudience
  weeks: string
  sales_starts_at: string // ISO date input value
  sales_ends_at: string
  max_quantity: string
  is_default: boolean
  is_active: boolean
}

const EMPTY_FORM: FormState = {
  label: '',
  description: '',
  price: '',
  ticket_kind: 'package',
  audience: 'standard',
  weeks: '',
  sales_starts_at: '',
  sales_ends_at: '',
  max_quantity: '',
  is_default: false,
  is_active: true,
}

interface TicketTypeFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set, the form opens in edit mode and pre-fills from this row. */
  editing: TicketType | null
  /** When provided alongside editing=null, the form starts from this prefill (used by "Dupliser som rabatt"). */
  prefill: TicketTypeInsert | null
  courseId: string
  /** Default total_weeks for new package tiers — usually course.total_weeks. */
  defaultWeeks: number | null
  onSaved: () => void
}

/** Convert a TicketType (or insert prefill) to the string-based FormState. */
function toFormState(source: TicketType | TicketTypeInsert): FormState {
  return {
    label: source.label ?? '',
    description: source.description ?? '',
    price: source.price !== undefined && source.price !== null ? String(source.price) : '',
    ticket_kind: (source.ticket_kind as TicketKind) ?? 'package',
    audience: (source.audience as TicketAudience) ?? 'standard',
    weeks: source.weeks !== undefined && source.weeks !== null ? String(source.weeks) : '',
    sales_starts_at: source.sales_starts_at?.slice(0, 16) ?? '',
    sales_ends_at: source.sales_ends_at?.slice(0, 16) ?? '',
    max_quantity:
      source.max_quantity !== undefined && source.max_quantity !== null
        ? String(source.max_quantity)
        : '',
    is_default: source.is_default ?? false,
    is_active: source.is_active ?? true,
  }
}

export function TicketTypeForm({
  open,
  onOpenChange,
  editing,
  prefill,
  courseId,
  defaultWeeks,
  onSaved,
}: TicketTypeFormProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})

  // Reset on open
  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm(toFormState(editing))
    } else if (prefill) {
      setForm(toFormState(prefill))
    } else {
      setForm({
        ...EMPTY_FORM,
        weeks: defaultWeeks ? String(defaultWeeks) : '',
      })
    }
    setErrors({})
  }, [open, editing, prefill, defaultWeeks])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  function validate(): boolean {
    const next: typeof errors = {}
    if (!form.label.trim()) next.label = 'Skriv en tittel for billettypen'
    const priceNum = Number(form.price)
    if (!form.price || Number.isNaN(priceNum) || priceNum < 0) {
      next.price = 'Pris må være 0 eller mer'
    }
    if (form.ticket_kind === 'package') {
      const weeksNum = Number(form.weeks)
      if (!form.weeks || Number.isNaN(weeksNum) || weeksNum <= 0) {
        next.weeks = 'Pakker må ha et antall uker'
      }
    }
    if (form.max_quantity) {
      const q = Number(form.max_quantity)
      if (Number.isNaN(q) || q <= 0) {
        next.max_quantity = 'Må være et helt tall over 0'
      }
    }
    if (form.sales_starts_at && form.sales_ends_at) {
      if (new Date(form.sales_ends_at) <= new Date(form.sales_starts_at)) {
        next.sales_ends_at = 'Sluttdato må være etter startdato'
      }
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)

    const payload: TicketTypeInsert = {
      course_id: courseId,
      label: form.label.trim(),
      description: form.description.trim() || null,
      price: Number(form.price),
      ticket_kind: form.ticket_kind,
      audience: form.audience,
      // For drop_in we force weeks=null; for package we require it (validated above).
      weeks: form.ticket_kind === 'drop_in' ? null : Number(form.weeks),
      is_full_course: form.ticket_kind === 'package' && Number(form.weeks) === defaultWeeks,
      is_active: form.is_active,
      is_default: form.is_default,
      sales_starts_at: form.sales_starts_at ? new Date(form.sales_starts_at).toISOString() : null,
      sales_ends_at: form.sales_ends_at ? new Date(form.sales_ends_at).toISOString() : null,
      max_quantity: form.max_quantity ? Number(form.max_quantity) : null,
    }

    if (editing) {
      const { error } = await updateTicketType(editing.id, payload)
      if (error) {
        toast.error(friendlyError(error, 'Kunne ikke lagre billettypen'))
        setSubmitting(false)
        return
      }
      toast.success('Billettype oppdatert')
    } else {
      const { error } = await createTicketType(payload)
      if (error) {
        toast.error(friendlyError(error, 'Kunne ikke opprette billettypen'))
        setSubmitting(false)
        return
      }
      toast.success('Billettype opprettet')
    }

    setSubmitting(false)
    onOpenChange(false)
    onSaved()
  }

  const isPackage = form.ticket_kind === 'package'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Rediger billettype' : 'Ny billettype'}
            </DialogTitle>
            <DialogDescription>
              Hver billettype er én sellable variant — for eksempel «Hele kurset», «Student-rabatt» eller «Drop-in».
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Kind — fixed after first save with signups, but we don't enforce that here yet */}
            <div className="space-y-2">
              <Label htmlFor="ticket_kind">Type</Label>
              <Select
                value={form.ticket_kind}
                onValueChange={v => update('ticket_kind', v as TicketKind)}
              >
                <SelectTrigger id="ticket_kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="package">{KIND_LABELS.package}</SelectItem>
                  <SelectItem value="drop_in">{KIND_LABELS.drop_in}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="label">Tittel</Label>
              <Input
                id="label"
                value={form.label}
                onChange={e => update('label', e.target.value)}
                aria-invalid={!!errors.label}
              />
              {errors.label && <p className="text-xs font-medium text-destructive">{errors.label}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beskrivelse (valgfritt)</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={e => update('description', e.target.value)}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Pris (kr)</Label>
                <Input
                  id="price"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={form.price}
                  onChange={e => update('price', e.target.value)}
                  aria-invalid={!!errors.price}
                />
                {errors.price && <p className="text-xs font-medium text-destructive">{errors.price}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="audience">Målgruppe</Label>
                <Select
                  value={form.audience}
                  onValueChange={v => update('audience', v as TicketAudience)}
                >
                  <SelectTrigger id="audience">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(AUDIENCE_LABELS) as TicketAudience[]).map(a => (
                      <SelectItem key={a} value={a}>{AUDIENCE_LABELS[a]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isPackage && (
              <div className="space-y-2">
                <Label htmlFor="weeks">Antall uker</Label>
                <Input
                  id="weeks"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={form.weeks}
                  onChange={e => update('weeks', e.target.value)}
                  aria-invalid={!!errors.weeks}
                />
                {errors.weeks && <p className="text-xs font-medium text-destructive">{errors.weeks}</p>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sales_starts_at">Salg starter (valgfritt)</Label>
                <Input
                  id="sales_starts_at"
                  type="datetime-local"
                  value={form.sales_starts_at}
                  onChange={e => update('sales_starts_at', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sales_ends_at">Salg slutter (valgfritt)</Label>
                <Input
                  id="sales_ends_at"
                  type="datetime-local"
                  value={form.sales_ends_at}
                  onChange={e => update('sales_ends_at', e.target.value)}
                  aria-invalid={!!errors.sales_ends_at}
                />
                {errors.sales_ends_at && (
                  <p className="text-xs font-medium text-destructive">{errors.sales_ends_at}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_quantity">Maks antall (valgfritt)</Label>
              <Input
                id="max_quantity"
                type="number"
                inputMode="numeric"
                min={1}
                value={form.max_quantity}
                onChange={e => update('max_quantity', e.target.value)}
                aria-invalid={!!errors.max_quantity}
              />
              <p className="text-xs text-muted-foreground">
                Tom = ubegrenset. Gjelder hele kurset, ikke per økt.
              </p>
              {errors.max_quantity && (
                <p className="text-xs font-medium text-destructive">{errors.max_quantity}</p>
              )}
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label htmlFor="is_default" className="text-sm">Forhåndsvalgt billett</Label>
                <p className="text-xs text-muted-foreground">
                  Denne velges automatisk på påmeldingssiden.
                </p>
              </div>
              <Switch
                id="is_default"
                checked={form.is_default}
                onCheckedChange={v => update('is_default', v)}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label htmlFor="is_active" className="text-sm">Aktiv</Label>
                <p className="text-xs text-muted-foreground">
                  Skru av for å skjule fra påmeldingssiden uten å slette.
                </p>
              </div>
              <Switch
                id="is_active"
                checked={form.is_active}
                onCheckedChange={v => update('is_active', v)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline-soft"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Avbryt
            </Button>
            <Button type="submit" loading={submitting} loadingText="Lagrer …">
              {editing ? 'Lagre' : 'Opprett'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

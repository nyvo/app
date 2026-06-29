import type { ReactNode } from 'react'
import { Check, Plus, X } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { ImageField } from '@/components/ui/image-upload'
import { UserAvatar } from '@/components/ui/user-avatar'
import { PageShell } from '@/components/teacher/PageShell'

/**
 * Dev-only structural preview for the /studio rework — Time2Book style:
 * flat two-column rows (label + description on the left, control on the
 * right), separated by divider lines, no cards. Matches the project's
 * "flat, don't box every section" rule and the existing CourseSettingsTab
 * label-left layout. Sample data only; fields are inert.
 */
const ROOMS = [
  { name: 'Sal 1', capacity: 18 },
  { name: 'Behandlingsrom', capacity: 4 },
  { name: 'Ute', capacity: null as number | null },
]

const AFFILIATES = [
  { name: 'Maja Berg', email: 'maja@example.no' },
  { name: 'Lars Solheim', email: 'lars@example.no' },
]

function Row({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: ReactNode
}) {
  return (
    <div className="grid gap-x-10 gap-y-3 py-7 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
      <div className="min-w-0">
        <h3 className="text-sm font-medium text-foreground">{label}</h3>
        {description && <p className="mt-1 text-sm text-foreground-muted">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export default function StudioPreview() {
  return (
    <main className="flex-1 min-h-full overflow-y-auto bg-canvas">
      <PageShell narrow="centered" title="Studio">
        <div className="divide-y divide-border-subtle">
          <Row label="Profilbilde" description="Vises på studiosiden din.">
            <ImageField
              variant="avatar"
              value={null}
              onChange={() => {}}
              onRemove={() => {}}
              changeLabel="Endre"
              ariaLabel="Last opp profilbilde"
            />
          </Row>

          <Row label="Navn" description="Navnet deltakerne ser på studiosiden.">
            <Input defaultValue="Flow Studio" className="max-w-md" />
          </Row>

          <Row label="Nettadresse" description="Lenken til den offentlige studiosiden.">
            <InputGroup className="max-w-md">
              <InputGroupAddon align="inline-start">openspot.no/</InputGroupAddon>
              <InputGroupInput defaultValue="flow-studio" />
            </InputGroup>
          </Row>

          <Row label="Sted" description="Brukes når du lager kurs, og vises til deltakerne som skal møte opp.">
            <div className="space-y-3">
              <Input defaultValue="Flow Studio" placeholder="Søk etter studio eller adresse…" />
              <p className="text-sm text-foreground-muted">Storgata 12, 0155 Oslo</p>
              <div className="grid h-44 place-items-center rounded-md border border-border bg-muted text-sm text-foreground-muted">
                Kart
              </div>
            </div>
          </Row>

          <Row label="Rom" description="Antall plasser per rom — fylles inn automatisk når du bruker rommet på et kurs.">
            <div className="space-y-3">
              <div className="divide-y divide-border overflow-hidden rounded-md border border-border bg-surface">
                {ROOMS.map((room) => (
                  <div key={room.name} className="flex items-center gap-3 px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      {room.name}
                    </span>
                    <Input
                      type="number"
                      defaultValue={room.capacity ?? undefined}
                      placeholder="–"
                      aria-label={`Antall plasser i ${room.name}`}
                      className="h-8 w-16 shrink-0 text-center"
                    />
                    <span className="shrink-0 text-sm text-foreground-muted">plasser</span>
                    <button
                      type="button"
                      className="flex size-7 shrink-0 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-active hover:text-foreground"
                      aria-label={`Fjern ${room.name}`}
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border bg-surface px-3 py-2.5 text-sm font-medium text-foreground-muted transition-colors hover:border-foreground/25 hover:text-foreground"
              >
                <Plus className="size-4" />
                Legg til rom
              </button>
            </div>
          </Row>

          <Row label="Samarbeid" description="Inviter instruktører til å holde kurs hos studioet ditt.">
            <div className="space-y-3">
              <InputGroup>
                <InputGroupInput readOnly value="openspot.no/join/flow-9f3a2" />
                <InputGroupAddon align="inline-end">
                  <Button variant="soft">
                    <Check className="size-3.5" />
                    Kopier
                  </Button>
                </InputGroupAddon>
              </InputGroup>
              <div className="divide-y divide-border overflow-hidden rounded-md border border-border bg-surface">
                {AFFILIATES.map((a) => (
                  <div key={a.email} className="flex items-center gap-3 px-3 py-2.5">
                    <UserAvatar name={a.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{a.name}</p>
                      <p className="truncate text-sm text-foreground-muted">{a.email}</p>
                    </div>
                    <Button variant="ghost">
                      Fjern
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </Row>
        </div>
      </PageShell>
    </main>
  )
}

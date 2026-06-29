import { useState } from 'react'
import { Calendar, Clock, ImageIcon, MapPin } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SegmentedTabs } from '@/components/teacher/SegmentedTabs'
import { cn } from '@/lib/utils'

type FormatType = 'single' | 'series'

// The bigger input style, in tokens: 44px tall, larger radius, more padding,
// base type. (Candidate for a real Input size="lg" variant.)
const BIG_INPUT = 'h-11 rounded-xl px-4 text-base placeholder:text-foreground-subtle'

/**
 * Dev-only preview — a faithful copy of the Eventbrite exploration
 * (/dev/course-builder-eventbrite) rebuilt entirely on our tokens: white Card
 * on the dampened canvas, semibold labels + muted sub-descriptions, big inputs
 * with leading icons, 44px SegmentedTabs, pinned footer. Token colors only.
 */
type IconType = React.ComponentType<{ className?: string; strokeWidth?: number }>

function Field({
  label,
  sub,
  htmlFor,
  children,
}: {
  label: string
  sub?: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-foreground">
        {label}
      </label>
      {sub && <p className="mt-0.5 text-sm text-foreground-muted">{sub}</p>}
      <div className="mt-2">{children}</div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold text-foreground">{children}</h2>
}

function IconInput({
  icon: Icon,
  className,
  ...props
}: { icon: IconType } & React.ComponentProps<'input'>) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-foreground-subtle" strokeWidth={1.75} />
      <Input className={cn(BIG_INPUT, 'pl-12', className)} {...props} />
    </div>
  )
}

export default function CourseBuilderPreview() {
  const [format, setFormat] = useState<FormatType>('single')
  const [title, setTitle] = useState('Morgenyoga')
  const [description, setDescription] = useState('')
  const [capacity, setCapacity] = useState('12')
  const [price, setPrice] = useState('350')

  return (
    <main className="flex h-screen flex-col bg-canvas">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 pt-10 pb-10 sm:px-6">
          <h1 className="mb-6 text-2xl font-medium text-foreground">Nytt kurs</h1>

          <Card className="gap-0 overflow-hidden p-0">
            {/* Cover banner */}
            <button
              type="button"
              className="flex h-44 w-full flex-col items-center justify-center gap-2 border-b border-border bg-muted text-foreground-muted transition-colors hover:bg-active"
            >
              <ImageIcon className="size-6" strokeWidth={1.75} />
              <span className="text-sm font-medium text-foreground">Legg til et bilde</span>
            </button>

            <div className="space-y-8 p-6 sm:p-8">
              <section className="space-y-5">
                <SectionTitle>Om kurset</SectionTitle>
                <Field label="Tittel" htmlFor="b-title">
                  <Input id="b-title" className={BIG_INPUT} value={title} onChange={(e) => setTitle(e.target.value)} />
                </Field>
                <Field label="Beskrivelse" htmlFor="b-desc">
                  <Textarea
                    id="b-desc"
                    rows={4}
                    className="rounded-xl px-4 py-3 text-base placeholder:text-foreground-subtle"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Fortell litt om hva deltakerne får ut av kurset…"
                  />
                </Field>
              </section>

              <hr className="border-border-subtle" />

              <section className="space-y-5">
                <SectionTitle>Når</SectionTitle>
                <Field label="Type">
                  <SegmentedTabs<FormatType>
                    size="lg"
                    value={format}
                    onChange={setFormat}
                    tabs={[
                      { key: 'single', label: 'Enkeltkurs' },
                      { key: 'series', label: 'Kursserie' },
                    ]}
                    ariaLabel="Type"
                    stretch
                  />
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label={format === 'series' ? 'Startdato' : 'Dato'} htmlFor="b-date">
                    <IconInput id="b-date" icon={Calendar} defaultValue="tirsdag 8. juli 2026" />
                  </Field>
                  <Field label="Tidspunkt">
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <IconInput icon={Clock} defaultValue="06:00" aria-label="Starttid" />
                      </div>
                      <span className="shrink-0 text-base font-medium text-foreground-muted">til</span>
                      <div className="flex-1">
                        <IconInput icon={Clock} defaultValue="07:00" aria-label="Sluttid" />
                      </div>
                    </div>
                  </Field>
                </div>
              </section>

              <hr className="border-border-subtle" />

              <section className="space-y-5">
                <SectionTitle>Hvor og pris</SectionTitle>
                <Field label="Sted" htmlFor="b-loc">
                  <IconInput id="b-loc" icon={MapPin} placeholder="Søk etter studio eller adresse" />
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Antall plasser" htmlFor="b-cap">
                    <Input id="b-cap" className={BIG_INPUT} type="number" inputMode="numeric" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
                  </Field>
                  <Field label={format === 'series' ? 'Pris per gang' : 'Pris'} htmlFor="b-price">
                    <div className="relative">
                      <Input id="b-price" className={cn(BIG_INPUT, 'pr-10 tabular-nums')} type="number" inputMode="numeric" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-base text-foreground-muted">kr</span>
                    </div>
                  </Field>
                </div>
              </section>
            </div>
          </Card>
        </div>
      </div>

      {/* Pinned action footer */}
      <div className="border-t border-border bg-background">
        <div className="mx-auto flex max-w-3xl items-center justify-end gap-2 px-4 py-3 sm:px-6">
          <Button variant="secondary" size="lg">Lagre utkast</Button>
          <Button size="lg">Publiser</Button>
        </div>
      </div>
    </main>
  )
}

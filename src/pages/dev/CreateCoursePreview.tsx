import { useState } from 'react'
import { Trash2, X } from '@/lib/icons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SegmentedTabs } from '@/components/teacher/SegmentedTabs'
import { cn } from '@/lib/utils'

/**
 * /dev/create-course-preview — design surface for the CreateCourseDrawer
 * rewrite. Renames "Én gang / Flere ganger" → "Enkelt / Gjentakende" and
 * makes Enkelt support multi-day (weekend retreat, 2-day workshop) without
 * promoting to multi-week. Multi-week stays in Gjentakende.
 *
 * Two frames stacked: Enkelt (with 1 day, then with 2 days), Gjentakende.
 * Both render the drawer body inline at the real 480px width so it reads
 * how it'll look mounted in a Sheet.
 */

type FormatType = 'single' | 'series'

function generateTimeSlots(startHour = 6, endHour = 23): string[] {
  const slots: string[] = []
  for (let h = startHour; h < endHour; h++) {
    for (const m of [0, 15, 30, 45]) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  slots.push(`${String(endHour).padStart(2, '0')}:00`)
  return slots
}

const ALL_TIME_SLOTS = generateTimeSlots()

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function endTimeSlotsFor(startTime: string): string[] {
  if (!startTime) return ALL_TIME_SLOTS
  const min = timeToMin(startTime) + 15
  return ALL_TIME_SLOTS.filter((t) => timeToMin(t) >= min)
}

interface SessionDay {
  id: string
  date: Date | undefined
  startTime: string
  endTime: string
}

function newDay(): SessionDay {
  return { id: crypto.randomUUID(), date: undefined, startTime: '', endTime: '' }
}

function TimeRangeSelect({
  startTime,
  endTime,
  onStartChange,
  onEndChange,
  ariaLabelPrefix = '',
}: {
  startTime: string
  endTime: string
  onStartChange: (v: string) => void
  onEndChange: (v: string) => void
  ariaLabelPrefix?: string
}) {
  const endSlots = endTimeSlotsFor(startTime)
  return (
    <div className="flex items-center gap-2">
      <Select
        value={startTime}
        onValueChange={(v) => {
          onStartChange(v)
          if (endTime && timeToMin(endTime) <= timeToMin(v)) onEndChange('')
        }}
      >
        <SelectTrigger className="w-full" aria-label={`${ariaLabelPrefix}Starttid`.trim()}>
          <SelectValue placeholder="Start" />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {ALL_TIME_SLOTS.map((slot) => (
            <SelectItem key={slot} value={slot}>{slot}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="shrink-0 text-sm font-medium text-foreground-muted">–</span>
      <Select value={endTime} onValueChange={onEndChange}>
        <SelectTrigger className="w-full" aria-label={`${ariaLabelPrefix}Sluttid`.trim()}>
          <SelectValue placeholder="Slutt" />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {endSlots.map((slot) => (
            <SelectItem key={slot} value={slot}>{slot}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Drawer body — both branches share a single layout, the date/time area
// switches between the two patterns based on `format`.
// ---------------------------------------------------------------------------

function DrawerBody({
  initialFormat = 'single' as FormatType,
  initialDays = 1,
}: {
  initialFormat?: FormatType
  initialDays?: number
}) {
  const [format, setFormat] = useState<FormatType>(initialFormat)
  const [title, setTitle] = useState('')
  const [days, setDays] = useState<SessionDay[]>(() =>
    Array.from({ length: Math.max(1, initialDays) }, () => newDay()),
  )
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [weeks, setWeeks] = useState('')
  const [location, setLocation] = useState('')
  const [capacity, setCapacity] = useState('')
  const [price, setPrice] = useState('')

  // In production: the Sheet `onPointerDownOutside` handler computes the same
  // dirty check and silently calls `e.preventDefault()` when truthy — so an
  // accidental tap outside doesn't close the drawer when there's progress to
  // lose. × and Esc remain free (deliberate gestures). No modal, no toast.

  const resetForm = () => {
    setTitle('')
    setDays([newDay()])
    setStartDate(undefined)
    setStartTime('')
    setEndTime('')
    setWeeks('')
    setLocation('')
    setCapacity('')
    setPrice('')
  }

  const addDay = () => setDays((d) => [...d, newDay()])
  const removeDay = (id: string) => setDays((d) => (d.length > 1 ? d.filter((x) => x.id !== id) : d))
  const updateDay = (id: string, patch: Partial<SessionDay>) =>
    setDays((d) => d.map((x) => (x.id === id ? { ...x, ...patch } : x)))

  return (
    <div className="flex flex-col h-[640px] w-full sm:w-[480px] bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
      {/* Sheet header — pl-6 pr-4 py-3, text-sm title (label-like) per drawer spec */}
      <div className="flex items-center justify-between pl-6 pr-4 py-3 border-b border-border">
        <p className="text-sm font-semibold text-foreground">Nytt kurs</p>
        <button
          type="button"
          aria-label="Lukk"
          onClick={resetForm}
          className="inline-flex size-8 items-center justify-center rounded-md text-foreground-muted hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Scrollable body — p-6, space-y-6 (airy default, not banned space-y-5) */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Format — Enkelt / Gjentakende */}
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">Når holder du kurset?</label>
          <SegmentedTabs<FormatType>
            value={format}
            onChange={setFormat}
            tabs={[
              { key: 'single', label: 'Enkelt' },
              { key: 'series', label: 'Ukentlig' },
            ]}
            ariaLabel="Kursformat"
          />
        </div>

        {/* Tittel */}
        <div>
          <label htmlFor="cc-title" className="mb-2 block text-sm font-medium text-foreground">
            Tittel
          </label>
          <Input id="cc-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        {/* Date/time area — branches on format */}
        {format === 'single' ? (
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">
              {days.length === 1 ? 'Dato og tid' : 'Datoer'}
            </label>

            <div className="space-y-4">
              {days.map((day, idx) => (
                <div
                  key={day.id}
                  className={cn(
                    'space-y-2',
                    idx > 0 && 'pt-4 border-t border-border',
                  )}
                >
                  {days.length > 1 && (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-foreground-muted">Dag {idx + 1}</p>
                      <button
                        type="button"
                        onClick={() => removeDay(day.id)}
                        aria-label={`Fjern dag ${idx + 1}`}
                        className="inline-flex size-7 items-center justify-center rounded-md text-foreground-muted hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  )}
                  <DatePicker
                    value={day.date}
                    onChange={(d) => updateDay(day.id, { date: d })}
                    placeholder="Velg dato"
                    fromDate={new Date()}
                  />
                  <TimeRangeSelect
                    startTime={day.startTime}
                    endTime={day.endTime}
                    onStartChange={(v) => updateDay(day.id, { startTime: v })}
                    onEndChange={(v) => updateDay(day.id, { endTime: v })}
                    ariaLabelPrefix={`Dag ${idx + 1} `}
                  />
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={addDay}
              className="mt-3 w-full justify-center text-foreground-muted hover:text-foreground"
            >
              {days.length === 1 ? 'Legg til en dag til' : 'Legg til enda en dag'}
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="cc-startdate" className="mb-2 block text-sm font-medium text-foreground">
                  Startdato
                </label>
                <DatePicker
                  id="cc-startdate"
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Velg dato"
                  fromDate={new Date()}
                />
              </div>
              <div>
                <label htmlFor="cc-weeks" className="mb-2 block text-sm font-medium text-foreground">
                  Antall uker
                </label>
                <Input
                  id="cc-weeks"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="50"
                  value={weeks}
                  onChange={(e) => setWeeks(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Tid</label>
              <TimeRangeSelect
                startTime={startTime}
                endTime={endTime}
                onStartChange={setStartTime}
                onEndChange={setEndTime}
              />
            </div>
          </>
        )}

        {/* Sted */}
        <div>
          <label htmlFor="cc-location" className="mb-2 block text-sm font-medium text-foreground">
            Sted
          </label>
          <Input
            id="cc-location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        {/* Plasser + Pris on one row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="cc-capacity" className="mb-2 block text-sm font-medium text-foreground">
              Antall plasser
            </label>
            <Input
              id="cc-capacity"
              type="number"
              inputMode="numeric"
              min="1"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="cc-price" className="mb-2 block text-sm font-medium text-foreground">
              Pris
              {format === 'series' && (
                <span className="ml-2 font-normal text-foreground-muted">(for hele kurset)</span>
              )}
            </label>
            <div className="relative">
              <Input
                id="cc-price"
                type="number"
                inputMode="numeric"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                aria-describedby="cc-price-suffix"
                className="pr-10 tabular-nums"
              />
              <span
                id="cc-price-suffix"
                aria-hidden="true"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-foreground-muted pointer-events-none"
              >
                kr
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky footer — primary only, ×/Esc/backdrop already close */}
      <div className="border-t border-border px-6 py-3 flex items-center justify-end bg-surface">
        <Button size="sm">Opprett</Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

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
      <div className="flex items-start justify-center py-8 px-4 bg-muted/30 rounded-xl">
        {children}
      </div>
    </div>
  )
}

export default function CreateCoursePreview() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-3xl px-6 py-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Nytt kurs — Enkelt / Ukentlig
          </h1>
          <p className="mt-2 text-sm text-foreground-muted">
            Dev preview, ikke koblet til ekte data. Tre varianter av samme skjema stablet under hverandre — bytt format i hver for å se begge alternativene.
          </p>
          <nav className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <a href="#frame-enkelt" className="text-foreground underline-offset-4 hover:underline">Enkelt (én dag)</a>
            <a href="#frame-multi" className="text-foreground underline-offset-4 hover:underline">Enkelt (flere dager)</a>
            <a href="#frame-ukentlig" className="text-foreground underline-offset-4 hover:underline">Ukentlig</a>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10 space-y-12">
        <section id="frame-enkelt" className="scroll-mt-6">
          <PreviewFrame
            label="Enkelt — én dag"
            description="For workshops, drop-in og enkeltklasser. Én dato, ett tidspunkt."
          >
            <DrawerBody initialFormat="single" />
          </PreviewFrame>
        </section>

        <section id="frame-multi" className="scroll-mt-6">
          <PreviewFrame
            label="Enkelt — flere dager"
            description="Bygg en helg (lør + søn) eller workshop over flere dager med «Legg til en dag til». Hver dag får egen dato og tid."
          >
            <DrawerBody initialFormat="single" initialDays={2} />
          </PreviewFrame>
        </section>

        <section id="frame-ukentlig" className="scroll-mt-6">
          <PreviewFrame
            label="Ukentlig"
            description="Klasse som går samme dag og tid hver uke. Startdato, tidspunkt og antall uker."
          >
            <DrawerBody initialFormat="series" />
          </PreviewFrame>
        </section>

        <footer className="border-t border-border pt-6 pb-12">
          <p className="text-xs text-foreground-muted">
            Implementasjon: <code className="font-medium">src/components/teacher/CreateCourseDrawer.tsx</code>. Plan i <code className="font-medium">tasks/dashboard-rebuild-status.md</code> item #8.
          </p>
        </footer>
      </div>
    </main>
  )
}


import { Fragment, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { StatusBadge, type CourseStatus } from '@/components/ui/status-badge'
import { Switch } from '@/components/ui/switch'
import { MapPin, Info, Pencil, X } from '@/lib/icons'

/**
 * Token-styled mock of the redesigned course Oversikt — app width (max-w-6xl)
 * and real design tokens/primitives, single column, no sidebar.
 *
 *   Header: title + status badge, then tabs (no metadata in header).
 *   Top slot: readiness card (draft) ⇄ KPI stats (live).
 *   Tid og sted: schedule + location (multi/weekly = list; single = Tid|Sted).
 *   Kursinnstillinger: series only.
 */

const noop = () => {}

export default function CourseOversiktWireframe() {
  return (
    <div className="min-h-dvh bg-canvas py-12">
      <div className="mx-auto max-w-6xl space-y-16 px-6">
        <Frame label="Utkast (Pro) — mangler kun utbetaling">
          <Shell status="draft">
            <Readiness variant="payouts" />
            <StatRow stats={[['Påmeldte', '0 / 12'], ['Pris', '350 kr']]} />
            <TidOgSted weekly />
            <Settings />
          </Shell>
        </Frame>

        <Frame label="Utkast — klar til publisering">
          <Shell status="draft">
            <Readiness variant="ready" />
            <StatRow stats={[['Påmeldte', '0 / 12'], ['Pris', '350 kr']]} />
            <TidOgSted weekly />
            <Settings />
          </Shell>
        </Frame>

        <Frame label="Publisert — ukentlig kursrekke">
          <Shell status="upcoming">
            <StatRow stats={[['Påmeldte', '9 / 12'], ['Inntekt', '25 200 kr'], ['Pris', '350 kr']]} />
            <TidOgSted weekly />
            <Settings />
          </Shell>
        </Frame>

        <Frame label="Publisert — enkeltkurs, én dag">
          <Shell status="upcoming">
            <StatRow stats={[['Påmeldte', '9 / 12'], ['Inntekt', '25 200 kr'], ['Pris', '350 kr']]} />
            <TidOgSted single />
          </Shell>
        </Frame>

        <Frame label="Tid og sted — «Endre» åpner inline redigering">
          <Shell status="upcoming">
            <StatRow stats={[['Påmeldte', '9 / 12'], ['Inntekt', '25 200 kr'], ['Pris', '350 kr']]} />
            <TidOgSted weekly editing={1} />
          </Shell>
        </Frame>

        <Frame label="«Se alle» — modal med alle timer">
          <SessionsModal />
        </Frame>
      </div>
    </div>
  )
}

// Modal mock — "Se alle" opens the full session list. Reuses SessionCell so the
// card preview and the modal are visually identical. Shown on a dimmed backdrop.
function SessionsModal() {
  return (
    <div className="flex justify-center rounded-2xl bg-foreground/40 p-8">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-surface shadow-soft">
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
          <p className="text-base font-medium text-foreground">Alle timer</p>
          <button
            type="button"
            aria-label="Lukk"
            className="flex size-9 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-active"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-80 space-y-2 overflow-y-auto p-3">
          {ALL_SESSIONS.map((s) => (
            <SessionCell key={s.date} session={s} />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── page shell ───────────────────────────────────────────────────── */

function Frame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-xs font-medium uppercase text-foreground-subtle">{label}</p>
      {children}
    </div>
  )
}

function Shell({ status, children }: { status: CourseStatus; children: ReactNode }) {
  return (
    <div>
      <h1 className="text-2xl font-medium text-foreground">Morgenyoga</h1>
      <div className="mt-2">
        <StatusBadge status={status} />
      </div>
      <div className="mt-5 flex gap-6 border-b border-border">
        <span className="-mb-px border-b-2 border-foreground pb-3 text-sm font-medium text-foreground">
          Oversikt
        </span>
        <span className="pb-3 text-sm text-foreground-muted">Påmeldte</span>
        <span className="pb-3 text-sm text-foreground-muted">Rediger</span>
      </div>
      <div className="mt-6 space-y-4">{children}</div>
    </div>
  )
}

/* ── top slot: readiness (draft) ⇄ stat row (live/draft config) ───── */

function Readiness({ variant }: { variant: 'payouts' | 'ready' }) {
  const ready = variant === 'ready'
  return (
    <FramedCard title="Publisering">
      <div className="flex items-center justify-between gap-4 p-5">
        <div className="max-w-md">
          <p className="text-lg font-medium text-foreground">
            {ready ? 'Klar til å publisere' : 'Sett opp utbetaling for å publisere'}
          </p>
          <p className="mt-1.5 text-base text-foreground-muted">
            {ready
              ? 'Alt er på plass — publiser for å åpne for påmelding.'
              : 'Koble til Stripe for å ta imot betaling — det eneste som gjenstår.'}
          </p>
        </div>
        <Button className="shrink-0">{ready ? 'Publiser kurs' : 'Sett opp utbetaling'}</Button>
      </div>
    </FramedCard>
  )
}

// Cells centered, separated by short *inset* dividers (a thin centered line,
// not a full-height border) so the separation stays subtle.
function StatRow({ stats }: { stats: string[][] }) {
  return (
    <FramedCard title="Nøkkeltall">
      <div className="flex items-stretch">
        {stats.map(([label, value], i) => (
          <Fragment key={label}>
            {i > 0 && <div className="my-auto h-12 w-px shrink-0 bg-border-subtle" />}
            <div className="flex-1 px-5 py-5 text-center">
              <p className="text-sm text-foreground-muted">{label}</p>
              <p className="mt-1.5 text-2xl font-medium tabular-nums text-foreground">{value}</p>
            </div>
          </Fragment>
        ))}
      </div>
    </FramedCard>
  )
}

/* ── timeplan + sted, side by side ─────────────────────────────────── */

function TidOgSted({
  weekly,
  single,
  editing,
}: {
  weekly?: boolean
  single?: boolean
  editing?: number
}) {
  return (
    // Stretch so the two cards are always the same height; the Sted map fills
    // its remaining space so there's never an empty gap. The map shows in every
    // state (consistency) — single-day fills its Timeplan with a centered
    // "when" display instead of a lone row.
    <div className="grid gap-4 lg:grid-cols-2">
      <Timeplan weekly={weekly} single={single} editing={editing} />
      <Sted />
    </div>
  )
}

// Framed card — a subtle primary-tinted outer surface whose top is the header
// (title left, actions right), with a white bordered panel inset for the
// content. No shadows; hierarchy comes from the tint/white contrast + borders.
function FramedCard({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    // Outer: tinted, no border. Header text/icons are all primary; content
    // lives in a white bordered inset panel. Hierarchy from contrast, not lines.
    <div className="flex flex-col rounded-2xl bg-primary/5 p-2">
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <p className="text-sm font-medium text-primary">{title}</p>
        {action && <span className="text-sm text-primary/65">{action}</span>}
      </div>
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-primary/15 bg-surface">
        {children}
      </div>
    </div>
  )
}

function Timeplan({
  weekly,
  single,
  editing,
}: {
  weekly?: boolean
  single?: boolean
  editing?: number
}) {
  // Inline edit (no modal). The Sted card sits alongside, so the panel doesn't
  // repeat the location.
  if (editing != null) {
    return (
      <FramedCard title="Rediger time — 15. juli">
        <div className="flex flex-1 flex-col p-5">
          {/* Labeled fields — same Dato | Tidspunkt layout as the course builder. */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-foreground">Dato</label>
              <div className="mt-2">
                <FakeInput className="w-full" text="8. juli" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground">Tidspunkt</label>
              <div className="mt-2 flex items-center gap-2">
                <FakeInput className="flex-1" text="06:00" />
                <span className="text-foreground-muted">–</span>
                <FakeInput className="flex-1" text="07:00" />
              </div>
            </div>
          </div>

          {/* Notice moved in from the header into its own horizontal card. */}
          <div className="mt-5 flex items-center gap-2.5 rounded-lg bg-muted px-3.5 py-2.5">
            <Info className="size-4 shrink-0 text-foreground-muted" />
            <span className="text-sm text-foreground-muted">Påmeldte varsles på e-post om endringen.</span>
          </div>

          <div className="mt-auto flex justify-end gap-2 pt-5">
            <Button variant="secondary">Avbryt</Button>
            <Button>Lagre</Button>
          </div>
        </div>
      </FramedCard>
    )
  }

  // Single-day has one date — a centered "when" block so the card fills next to
  // the Sted+map instead of leaving a lone row at the top.
  if (single) {
    return (
      <FramedCard title="Timeplan">
        <div className="flex flex-1 flex-col items-center justify-center p-5 text-center">
          <p className="text-base capitalize text-foreground-muted">Tirsdag</p>
          <p className="mt-0.5 text-xl font-medium text-foreground">8. juli</p>
          <p className="mt-1 text-base tabular-nums text-foreground-muted">06:00–07:00</p>
        </div>
      </FramedCard>
    )
  }

  // Multi/weekly = a preview of the first sessions as reusable cells; the rest
  // open in a modal ("Se alle") because extending the list inline would break
  // the equal-height layout next to Sted.
  const preview = (weekly ? ALL_SESSIONS : MULTI_SESSIONS).slice(0, 3)
  const total = weekly ? ALL_SESSIONS.length : MULTI_SESSIONS.length
  return (
    <FramedCard title="Timeplan">
      <div className="flex flex-1 flex-col p-5">
        <div className="space-y-4">
          {preview.map((s) => (
            <SessionRow key={s.date} session={s} />
          ))}
        </div>
        {total > preview.length && (
          <button
            type="button"
            className="mt-4 inline-flex text-sm font-medium text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground"
          >
            Se alle timer
          </button>
        )}
      </div>
    </FramedCard>
  )
}

type Session = { weekday: string; date: string; time: string }

const ALL_SESSIONS: Session[] = [
  { weekday: 'Tirsdag', date: '8. juli', time: '06:00–07:00' },
  { weekday: 'Tirsdag', date: '15. juli', time: '06:00–07:00' },
  { weekday: 'Tirsdag', date: '22. juli', time: '06:00–07:00' },
  { weekday: 'Tirsdag', date: '29. juli', time: '06:00–07:00' },
  { weekday: 'Tirsdag', date: '5. august', time: '06:00–07:00' },
  { weekday: 'Tirsdag', date: '12. august', time: '06:00–07:00' },
  { weekday: 'Tirsdag', date: '19. august', time: '06:00–07:00' },
  { weekday: 'Tirsdag', date: '26. august', time: '06:00–07:00' },
]

const MULTI_SESSIONS: Session[] = [
  { weekday: 'Onsdag', date: '8. juli', time: '06:00–07:00' },
  { weekday: 'Torsdag', date: '9. juli', time: '08:00–09:30' },
  { weekday: 'Fredag', date: '10. juli', time: '17:00–18:00' },
]

// Edit affordance shared by both session renderings — a quiet pencil icon
// (no repeated "Endre" text down the column).
function EditTime() {
  return (
    <button
      type="button"
      aria-label="Endre time"
      className="flex size-9 shrink-0 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-hover hover:text-foreground"
    >
      <Pencil className="size-4" />
    </button>
  )
}

// Inline row inside the Timeplan card — the date already sits in a white panel
// inside a tinted frame, so a filled cell here would be a third nested card.
// Instead each row gets a left primary accent line; lighter, less chrome.
function SessionRow({ session }: { session: Session }) {
  return (
    <div className="flex items-stretch justify-between gap-3">
      <div className="flex min-w-0 items-center gap-4">
        <span className="w-1 self-stretch rounded-full bg-primary/40" />
        <div className="min-w-0">
          <p className="text-base font-medium text-foreground">
            {session.weekday} {session.date}
          </p>
          <p className="mt-0.5 text-sm tabular-nums text-foreground-muted">{session.time}</p>
        </div>
      </div>
      <EditTime />
    </div>
  )
}

// Filled card — used in the "Se alle" modal, where rows sit on a plain white
// dialog (no surrounding frame) so a faint-primary fill reads as a clean cell.
function SessionCell({ session }: { session: Session }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-primary/5 px-4 py-3">
      <div className="min-w-0">
        <p className="text-base font-medium text-foreground">
          {session.weekday} {session.date}
        </p>
        <p className="mt-0.5 text-sm tabular-nums text-foreground-muted">{session.time}</p>
      </div>
      <EditTime />
    </div>
  )
}

// Sted — name + address + a map preview filling the inset panel.
function Sted() {
  return (
    <FramedCard title="Sted">
      <div className="p-5">
        <p className="text-base font-medium text-foreground">Flow Studio</p>
        <p className="text-base text-foreground-muted">Storgata 1, 0155 Oslo</p>
      </div>
      <div
        className="flex flex-1 items-center justify-center border-t border-border-subtle bg-muted"
        style={{ minHeight: '9rem' }}
      >
        <MapPin className="size-7 text-foreground-subtle" />
      </div>
    </FramedCard>
  )
}

function FakeInput({ className = '', text }: { className?: string; text: string }) {
  return (
    <div
      className={`flex h-11 items-center rounded-xl border border-border px-4 text-base text-foreground-subtle ${className}`}
    >
      {text}
    </div>
  )
}

/* ── settings (series only) ───────────────────────────────────────── */

function Settings() {
  return (
    <FramedCard title="Kursinnstillinger">
      <div className="p-5">
        <div className="divide-y divide-border-subtle">
          {['Tillat drop-in', 'Tillat påmelding etter oppstart'].map((s) => (
            <div key={s} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
              <span className="text-base text-foreground">{s}</span>
              <Switch checked={false} onCheckedChange={noop} />
            </div>
          ))}
        </div>
      </div>
    </FramedCard>
  )
}

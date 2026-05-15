import { useState } from 'react'
import {
  CalendarDays,
  Clock,
  ImageIcon,
  MapPin,
  MoreHorizontal,
  Pencil,
  Users,
} from '@/lib/icons'
import { SearchInput } from '@/components/ui/search-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn, formatKroner } from '@/lib/utils'

/**
 * /dev/courses-grid-preview — design exploration for reworking the Courses
 * page. Schedule already reads as a chronological timeline; Courses should
 * read as an inventory / catalogue, NOT a denser version of the same list.
 *
 * Two variants stacked for comparison:
 *   A) Media-forward gallery cards (recommended)
 *   B) Compact stat tiles (no media — denser, for teachers with many courses)
 *
 * No real data — hardcoded samples that exercise the interesting states:
 * healthy, near-full, brand-new, draft, no upcoming sessions.
 */

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

type SampleCourse = {
  id: string
  title: string
  imageUrl: string | null
  format: 'series' | 'single'
  delivery: 'in_person' | 'online'
  status: 'active' | 'draft'
  location: string
  nextSessionLabel: string | null // already-formatted, e.g. "I morgen · 18:30"
  signups: number
  capacity: number | null
  price: number
  allowsDropIn: boolean
}

const SAMPLES: SampleCourse[] = [
  {
    id: '1',
    title: 'Vinyasa Flow — Mandagsklasse',
    imageUrl: null,
    format: 'series',
    delivery: 'in_person',
    status: 'active',
    location: 'Studio Sentrum, Oslo',
    nextSessionLabel: 'I morgen · 18:30',
    signups: 12,
    capacity: 16,
    price: 2200,
    allowsDropIn: true,
  },
  {
    id: '2',
    title: 'Yin Yoga — Helgeworkshop',
    imageUrl: null,
    format: 'single',
    delivery: 'in_person',
    status: 'active',
    location: 'Frogner',
    nextSessionLabel: 'Lør 17. mai · 10:00',
    signups: 18,
    capacity: 20,
    price: 850,
    allowsDropIn: false,
  },
  {
    id: '3',
    title: 'Pilates for nybegynnere',
    imageUrl: null,
    format: 'series',
    delivery: 'in_person',
    status: 'active',
    location: 'Grünerløkka',
    nextSessionLabel: 'Tir 14. mai · 19:00',
    signups: 4,
    capacity: 12,
    price: 1800,
    allowsDropIn: true,
  },
  {
    id: '4',
    title: 'Meditasjon — Online drop-in',
    imageUrl: null,
    format: 'single',
    delivery: 'online',
    status: 'active',
    location: 'Zoom',
    nextSessionLabel: 'Ingen kommende økter',
    signups: 0,
    capacity: null,
    price: 150,
    allowsDropIn: true,
  },
  {
    id: '5',
    title: 'Sommerretreat 2026',
    imageUrl: null,
    format: 'single',
    delivery: 'in_person',
    status: 'draft',
    location: 'Hardanger',
    nextSessionLabel: null,
    signups: 0,
    capacity: 14,
    price: 7900,
    allowsDropIn: false,
  },
  {
    id: '6',
    title: 'Restorative Yoga — Søndag morgen',
    imageUrl: null,
    format: 'series',
    delivery: 'in_person',
    status: 'active',
    location: 'Studio Sentrum, Oslo',
    nextSessionLabel: 'Søn 12. mai · 09:30',
    signups: 8,
    capacity: 10,
    price: 1600,
    allowsDropIn: true,
  },
]

function typeLabel(c: SampleCourse): string {
  if (c.delivery === 'online') return 'Nettkurs'
  return c.format === 'series' ? 'Kursrekke' : 'Enkelttime'
}

function fillPercent(c: SampleCourse): number | null {
  if (c.capacity == null || c.capacity === 0) return null
  return Math.min(100, Math.round((c.signups / c.capacity) * 100))
}

// ---------------------------------------------------------------------------
// Variant A — Media-forward gallery
// ---------------------------------------------------------------------------

function GalleryCard({ course }: { course: SampleCourse }) {
  const pct = fillPercent(course)
  const isFull = pct === 100
  const isDraft = course.status === 'draft'

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface',
        'transition-shadow hover:shadow-sm',
      )}
    >
      {/* Cover — production-real placeholder (matches CourseListView fallback) */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        <div className="absolute inset-0 flex items-center justify-center">
          <ImageIcon className="size-8 text-foreground-disabled" aria-hidden="true" />
        </div>
        {/* Status pill — only when worth flagging */}
        {(isDraft || isFull) && (
          <span
            className={cn(
              'absolute left-3 top-3 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium backdrop-blur-sm',
              isDraft
                ? 'bg-background/90 text-foreground-muted ring-1 ring-border'
                : 'bg-foreground text-background',
            )}
          >
            {isDraft ? 'Utkast' : 'Fullt'}
          </span>
        )}
        {/* Hover actions — quick edit + more */}
        <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            aria-label="Rediger"
            className="inline-flex size-7 items-center justify-center rounded-md bg-background/90 text-foreground-muted ring-1 ring-border backdrop-blur-sm hover:text-foreground"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label="Mer"
            className="inline-flex size-7 items-center justify-center rounded-md bg-background/90 text-foreground-muted ring-1 ring-border backdrop-blur-sm hover:text-foreground"
          >
            <MoreHorizontal className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-medium leading-snug text-foreground line-clamp-2">
            {course.title}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground-muted">
          <span>{typeLabel(course)}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden="true" />
            {course.location}
          </span>
        </div>

        {/* Next session — the single most useful piece of info */}
        <div className="flex items-center gap-2 text-sm text-foreground">
          <CalendarDays className="size-4 shrink-0 text-foreground-muted" aria-hidden="true" />
          <span className={cn(course.nextSessionLabel == null && 'text-foreground-muted italic')}>
            {course.nextSessionLabel ?? 'Ingen datoer satt'}
          </span>
        </div>

        {/* Fill bar */}
        {pct != null ? (
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1 text-foreground-muted">
                <Users className="size-3.5" aria-hidden="true" />
                {course.signups} / {course.capacity}
              </span>
              <span className="tabular-nums text-foreground-muted">{pct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  isFull ? 'bg-foreground' : 'bg-foreground/70',
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="text-xs text-foreground-muted inline-flex items-center gap-1">
            <Users className="size-3.5" aria-hidden="true" />
            {course.signups} påmeldt · drop-in
          </div>
        )}

        {/* Footer — price + actions */}
        <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
          <span className="text-sm font-medium tabular-nums text-foreground">
            {formatKroner(course.price)}
          </span>
          {course.allowsDropIn && (
            <span className="text-xs text-foreground-muted">Drop-in tilgjengelig</span>
          )}
        </div>
      </div>
    </article>
  )
}

function GalleryVariant({ courses }: { courses: SampleCourse[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((c) => (
        <GalleryCard key={c.id} course={c} />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Variant B — Compact stat tiles (no media)
// ---------------------------------------------------------------------------

function StatTile({ course }: { course: SampleCourse }) {
  const pct = fillPercent(course)
  const isDraft = course.status === 'draft'

  return (
    <article
      className={cn(
        'group relative flex flex-col gap-3 rounded-xl border border-border bg-surface p-5',
        'transition-shadow hover:shadow-sm',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-medium leading-snug text-foreground line-clamp-2">
          {course.title}
        </h3>
        {isDraft && (
          <span className="shrink-0 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground-muted">
            Utkast
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground-muted">
        <span>{typeLabel(course)}</span>
        <span aria-hidden="true">·</span>
        <span className="inline-flex items-center gap-1">
          <MapPin className="size-3.5" aria-hidden="true" />
          {course.location}
        </span>
      </div>

      {/* Big stat row — fill ratio dominates */}
      <div className="flex items-end justify-between gap-4 pt-1">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-medium tabular-nums text-foreground">
              {course.signups}
            </span>
            {course.capacity != null && (
              <span className="text-sm tabular-nums text-foreground-muted">
                / {course.capacity}
              </span>
            )}
          </div>
          <p className="text-xs text-foreground-muted">påmeldt</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium tabular-nums text-foreground">
            {formatKroner(course.price)}
          </p>
          {course.allowsDropIn && (
            <p className="text-xs text-foreground-muted">+ drop-in</p>
          )}
        </div>
      </div>

      {/* Fill bar */}
      {pct != null && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-foreground/70 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-border pt-3 text-xs text-foreground-muted">
        <Clock className="size-3.5 shrink-0" aria-hidden="true" />
        <span className={cn(course.nextSessionLabel == null && 'italic')}>
          {course.nextSessionLabel ?? 'Ingen datoer satt'}
        </span>
      </div>
    </article>
  )
}

function StatVariant({ courses }: { courses: SampleCourse[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {courses.map((c) => (
        <StatTile key={c.id} course={c} />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Variant C — Horizontal row cards (thumbnail left, content right)
// Pattern used by Airbnb host listings, Eventbrite events, Stripe-style product
// rows. Denser than vertical cards, more scannable than tables.
// ---------------------------------------------------------------------------

function RowCard({ course }: { course: SampleCourse }) {
  const pct = fillPercent(course)
  const isFull = pct === 100
  const isDraft = course.status === 'draft'

  return (
    <article
      className={cn(
        'group flex items-stretch gap-4 rounded-xl border border-border bg-surface p-3',
        'transition-colors hover:bg-muted/40',
      )}
    >
      {/* Thumbnail — production fallback (same as gallery + CourseListView) */}
      <div className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-muted md:size-28">
        <div className="absolute inset-0 flex items-center justify-center">
          <ImageIcon className="size-6 text-foreground-disabled" aria-hidden="true" />
        </div>
      </div>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-medium text-foreground">
              {course.title}
            </h3>
            {(isDraft || isFull) && (
              <span
                className={cn(
                  'shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                  isDraft
                    ? 'bg-muted text-foreground-muted'
                    : 'bg-foreground text-background',
                )}
              >
                {isDraft ? 'Utkast' : 'Fullt'}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-foreground-muted">
            <span>{typeLabel(course)}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden="true" />
              {course.location}
            </span>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <span className="inline-flex items-center gap-1.5 text-foreground-muted">
            <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
            <span className={cn(course.nextSessionLabel == null && 'italic')}>
              {course.nextSessionLabel ?? 'Ingen datoer satt'}
            </span>
          </span>
          {pct != null ? (
            <span className="inline-flex items-center gap-2 text-foreground-muted">
              <Users className="size-4 shrink-0" aria-hidden="true" />
              <span className="tabular-nums">
                {course.signups} / {course.capacity}
              </span>
              <span className="hidden h-1 w-16 overflow-hidden rounded-full bg-muted md:inline-block">
                <span
                  className={cn(
                    'block h-full rounded-full',
                    isFull ? 'bg-foreground' : 'bg-foreground/70',
                  )}
                  style={{ width: `${pct}%` }}
                />
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-foreground-muted">
              <Users className="size-4 shrink-0" aria-hidden="true" />
              <span>{course.signups} påmeldt · drop-in</span>
            </span>
          )}
        </div>
      </div>

      {/* Right column — price + meny */}
      <div className="flex shrink-0 flex-col items-end justify-between py-0.5">
        <button
          type="button"
          aria-label="Mer"
          className="inline-flex size-7 items-center justify-center rounded-md text-foreground-muted opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100 focus:opacity-100"
        >
          <MoreHorizontal className="size-4" />
        </button>
        <span className="text-sm font-medium tabular-nums text-foreground">
          {formatKroner(course.price)}
        </span>
      </div>
    </article>
  )
}

function RowVariant({ courses }: { courses: SampleCourse[] }) {
  return (
    <div className="space-y-2">
      {courses.map((c) => (
        <RowCard key={c.id} course={c} />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Toolbar (shared — same as live page, minus the table-specific sort options)
// ---------------------------------------------------------------------------

type ViewTab = 'active' | 'past' | 'draft'

const TABS: Array<{ key: ViewTab; label: string; count?: number }> = [
  { key: 'active', label: 'Aktive' },
  { key: 'past', label: 'Fullførte' },
  { key: 'draft', label: 'Utkast', count: 1 },
]

function MockToolbar() {
  const [viewTab, setViewTab] = useState<ViewTab>('active')
  const [search, setSearch] = useState('')
  return (
    <div className="mb-5 flex flex-col gap-3 border-b border-border md:flex-row md:items-end md:justify-between">
      <nav role="tablist" aria-label="Filtrer kurs" className="flex gap-6">
        {TABS.map((tab) => {
          const isActive = viewTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setViewTab(tab.key)}
              className={cn(
                'inline-flex items-center gap-2 py-3 text-sm border-b-2 transition-colors duration-150 outline-none focus-visible:text-foreground',
                isActive
                  ? 'font-medium border-foreground text-foreground'
                  : 'border-transparent text-foreground-muted hover:text-foreground',
              )}
            >
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <span className="text-xs tabular-nums text-foreground-muted">
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </nav>
      <div className="flex w-full items-center gap-2 pb-2 md:w-auto">
        <Select defaultValue="next">
          <SelectTrigger className="h-9 w-44" aria-label="Sorter kurs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="next">Neste økt</SelectItem>
            <SelectItem value="name">Navn (A–Å)</SelectItem>
            <SelectItem value="signups">Påmeldte (mest fullt)</SelectItem>
            <SelectItem value="updated">Sist endret</SelectItem>
          </SelectContent>
        </Select>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Søk etter kurs…"
          aria-label="Søk etter kurs"
          className="flex-1 md:w-56"
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Frame + Page
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
    <section className="space-y-4">
      <div className="border-b border-border pb-2">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-1 text-sm text-foreground-muted">{description}</p>
      </div>
      <div className="pt-2">{children}</div>
    </section>
  )
}

export default function CoursesGridPreview() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Mine kurs — layout-utforskning
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-foreground-muted">
            Dev preview, ikke koblet til ekte data. Differensierer Mine kurs fra
            Timeplan ved å bytte ut «list-i-ramme» med et tydeligere
            katalog-format. Tre varianter for sammenligning.
          </p>
          <nav className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <a href="#frame-gallery" className="text-foreground underline-offset-4 hover:underline">
              A · Mediarik gallery (vertikal)
            </a>
            <a href="#frame-rows" className="text-foreground underline-offset-4 hover:underline">
              B · Horisontale rader
            </a>
            <a href="#frame-stats" className="text-foreground underline-offset-4 hover:underline">
              C · Kompakt statistikk
            </a>
            <a href="#frame-empty" className="text-foreground underline-offset-4 hover:underline">
              D · Single-card states
            </a>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-12 px-6 py-10">
        <section id="frame-gallery" className="scroll-mt-6">
          <PreviewFrame
            label="A · Mediarik gallery (anbefalt)"
            description="Bildeflate øverst gir hvert kurs visuell identitet og fjerner tabell-følelsen. Fill-bar og neste-økt-rad gjør tilstanden lesbar på 1 sekund. Hover viser quick-edit + meny. 3-kol på lg, 2 på sm."
          >
            <MockToolbar />
            <GalleryVariant courses={SAMPLES} />
          </PreviewFrame>
        </section>

        <section id="frame-rows" className="scroll-mt-6">
          <PreviewFrame
            label="B · Horisontale rader (thumbnail venstre)"
            description="Mønster fra Airbnb host listings, Eventbrite organizer events, Stripe products. Tetter pakket enn vertikale kort, men beholder bilde + status + fill-bar i én leselinje. Bra hvis du vil scanne 10+ kurs uten å scrolle. Hover viser meny-knapp; pris ligger fast til høyre."
          >
            <MockToolbar />
            <RowVariant courses={SAMPLES} />
          </PreviewFrame>
        </section>

        <section id="frame-stats" className="scroll-mt-6">
          <PreviewFrame
            label="C · Kompakt statistikk-fliser"
            description="Ingen bilde — påmeldt-tallet dominerer (dashboard-følelse). 4 kort per rad på xl. Bra hvis en lærer har 30+ kurs og bildene blir for mye visuell støy."
          >
            <MockToolbar />
            <StatVariant courses={SAMPLES} />
          </PreviewFrame>
        </section>

        <section id="frame-empty" className="scroll-mt-6">
          <PreviewFrame
            label="D · Enkeltkort — tilstander side-ved-side"
            description="Samme variant A-kort i alle statene: sunn fylling, nær-fullt, drop-in (uten capacity), og utkast. Sjekk at draft-pillen leser tydelig og at 'Ingen datoer satt' føles informativ snarere enn ødelagt."
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <GalleryCard course={SAMPLES[0]} />
              <GalleryCard course={SAMPLES[1]} />
              <GalleryCard course={SAMPLES[3]} />
              <GalleryCard course={SAMPLES[4]} />
            </div>
          </PreviewFrame>
        </section>

        <footer className="border-t border-border pt-6 pb-12">
          <p className="text-xs text-foreground-muted">
            Implementasjon mål:{' '}
            <code className="font-medium">src/pages/teacher/CoursesPage.tsx</code> +
            ny <code className="font-medium">CourseGridCard</code> i{' '}
            <code className="font-medium">src/components/teacher/</code>. Erstatter
            CourseListView som primær visning; List-View kan beholdes som
            sekundær «kompakt»-toggle hvis ønsket.
          </p>
        </footer>
      </div>

    </main>
  )
}

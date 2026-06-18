import {
  Building,
  MapPin,
  ArrowUpRight,
  ChevronLeft,
  Calendar,
  Clock,
} from '@/lib/icons';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/user-avatar';

/**
 * Prototype — course-detail header, grounded in real references (Mobbin).
 *
 * Finding: real booking/marketplace DETAIL pages (Care.com class detail,
 * Eventbrite, Airbnb, Booking, Posh) keep the PLATFORM brand in the header and
 * show the seller/host as a "by X" element in the CONTENT — nobody puts a
 * back-chevron + logo + name lockup in the header. So the earlier lockup mock
 * was off. This compares the reference-correct options.
 */

const MOCK = { studio: 'Kristoffer Yoga', firstName: 'Ingrid' };

// ── Shared pieces ────────────────────────────────────────────────────────────

function AccountChip() {
  return (
    <span className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface py-0.5 pl-0.5 pr-3.5 shadow-xs">
      <UserAvatar size="sm" name={MOCK.firstName} />
      <span className="pl-0.5 text-sm font-medium text-foreground">{MOCK.firstName}</span>
    </span>
  );
}

function StudioLogo({ className }: { className?: string }) {
  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-lg bg-muted text-foreground-muted ring-1 ring-border', className)}>
      <Building className="size-1/2" strokeWidth={1.5} />
    </span>
  );
}

function BrowserFrame({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
        <span className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-border-strong" />
          <span className="size-2.5 rounded-full bg-border-strong" />
          <span className="size-2.5 rounded-full bg-border-strong" />
        </span>
        <span className="ml-2 truncate rounded-md bg-background px-2.5 py-1 text-xs text-foreground-muted ring-1 ring-border">{url}</span>
      </div>
      {children}
    </div>
  );
}

// ── Course overview (storefront) — studio masthead + slider calendar ─────────

const DAYS = [
  { wd: 'I dag', n: '15', sub: 'Ingen kurs', on: true },
  { wd: 'Tir', n: '16', sub: '1 kurs' },
  { wd: 'Ons', n: '17', sub: '1 kurs' },
  { wd: 'Tor', n: '18', sub: 'Ingen kurs' },
  { wd: 'Fre', n: '19', sub: 'Ingen kurs' },
];

function OverviewScreen() {
  return (
    <div className="px-6 py-7">
      <div className="flex items-start gap-5">
        <StudioLogo className="size-16" />
        <div className="min-w-0 flex-1 pt-0.5">
          <h1 className="text-2xl font-medium leading-tight text-foreground">{MOCK.studio}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground-muted">
            <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" aria-hidden /> Kaigata 3, 9008 Tromsø</span>
            <span className="inline-flex items-center gap-1 font-medium text-primary underline decoration-primary/30 underline-offset-2">
              Få veibeskrivelse <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
            </span>
          </div>
        </div>
        <AccountChip />
      </div>
      <p className="mt-7 text-lg font-medium text-foreground">Juni</p>
      <div className="mt-3 flex gap-2 overflow-hidden">
        {DAYS.map((d) => (
          <div
            key={d.n}
            className={cn(
              'flex w-24 shrink-0 flex-col items-center rounded-xl border px-2 py-3 text-center',
              d.on ? 'border-transparent bg-foreground text-background' : 'border-border bg-muted/40',
            )}
          >
            <span className={cn('text-xs', d.on ? 'text-background/70' : 'text-foreground-muted')}>{d.wd}</span>
            <span className="text-lg font-semibold leading-tight">{d.n}</span>
            <span className={cn('text-xs', d.on ? 'text-background/70' : 'text-foreground-muted')}>{d.sub}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Detail-header treatments ─────────────────────────────────────────────────

type Treatment = 'now' | 'studio' | 'platform';

function DetailScreen({ treatment }: { treatment: Treatment }) {
  return (
    <>
      <header className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
        {treatment === 'studio' ? (
          // Clean studio brand lockup (no chevron) — doubles as "home" → storefront
          <span className="inline-flex items-center gap-2 text-foreground">
            <StudioLogo className="size-7" />
            <span className="text-base font-medium">{MOCK.studio}</span>
          </span>
        ) : (
          <span className="text-base font-medium text-foreground">Openspot</span>
        )}
        <AccountChip />
      </header>

      <div className="px-6 py-6">
        {/* "now" keeps the separate back link */}
        {treatment === 'now' && (
          <span className="mb-5 inline-flex items-center gap-1.5 text-sm text-foreground-muted">
            <ChevronLeft className="size-4" strokeWidth={1.75} /> {MOCK.studio}
          </span>
        )}
        <h1 className="text-3xl font-medium text-foreground">Paid</h1>

        {/* "platform" surfaces the studio as a "by X" content link (Care.com / Eventbrite) */}
        {treatment === 'platform' && (
          <span className="mt-2 inline-flex items-center gap-2 text-sm text-foreground-muted">
            Arrangert av
            <span className="inline-flex items-center gap-1.5 font-medium text-foreground underline decoration-foreground-disabled underline-offset-2">
              <StudioLogo className="size-5" />
              {MOCK.studio}
            </span>
          </span>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-foreground-muted">
          <span className="inline-flex items-center gap-1.5"><Calendar className="size-3.5" strokeWidth={1.75} /> I morgen</span>
          <span className="inline-flex items-center gap-1.5 tabular-nums"><Clock className="size-3.5" strokeWidth={1.75} /> 06:15–07:00</span>
        </div>
        <div className="mt-6 h-px bg-border" />
        <p className="mt-6 text-sm font-medium text-foreground-muted">Om kurset</p>
        <p className="mt-1.5 text-sm text-foreground">Morgenyoga for alle nivåer.</p>
      </div>
    </>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

const StorefrontHeaderPreview = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-40 border-b border-border bg-surface-elevated backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Badge variant="neutral" shape="pill" size="sm">Detail header</Badge>
          <span className="text-sm text-foreground-muted">Referansebasert (Care.com, Eventbrite, Airbnb)</span>
          <span className="ml-auto text-xs text-foreground-muted">/dev/storefront-header</span>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-border bg-muted/30 p-5">
          <p className="text-sm font-medium text-foreground">Funn fra Mobbin</p>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-foreground-muted">
            Ekte booking-detaljsider beholder <strong className="font-medium text-foreground">plattform-merket</strong> i
            headeren og viser arrangøren som «arrangert av X» i innholdet — ingen
            «‹ logo + navn»-lockup i headeren. Den forrige mock-en var derfor feil.
            Her er de to referanse-riktige retningene.
          </p>
        </div>

        {/* Context: the overview */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">Kontekst — kursoversikten (studio-merket)</h2>
          <BrowserFrame url="openspot.no/kristoffer-yoga">
            <OverviewScreen />
          </BrowserFrame>
        </section>

        {/* Three detail treatments */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-foreground">Kursdetalj — tre alternativer</h2>
          <div className="space-y-6">
            <Option
              label="Nå"
              caption="«Openspot» i headeren + egen tilbake-lenke i innholdet. Merket bytter fra studio til Openspot."
            >
              <DetailScreen treatment="now" />
            </Option>
            <Option
              label="A — Plattform-header + «arrangert av» (referansemønster)"
              caption="Openspot blir i headeren (konsekvent merkevare), studioet vises som lenke i innholdet — slik Care.com, Eventbrite og Airbnb gjør det. Krever ingen endring i headeren, bare en tydelig arrangør-lenke."
            >
              <DetailScreen treatment="platform" />
            </Option>
            <Option
              label="B — Studio-merke i headeren (white-label)"
              caption="Rent studio-merke (logo + navn → storefront), ingen chevron, ingen egen tilbake-lenke. Konsekvent med den studio-merkede oversikten — men da bør oversikten og detaljen begge være studio-først, og Openspot tones ned overalt."
            >
              <DetailScreen treatment="studio" />
            </Option>
          </div>
        </section>
      </div>
    </div>
  );
};

function Option({ label, caption, children }: { label: string; caption: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <BrowserFrame url="openspot.no/kristoffer-yoga/paid">{children}</BrowserFrame>
      <p className="max-w-3xl text-xs leading-relaxed text-foreground-muted">{caption}</p>
    </div>
  );
}

export default StorefrontHeaderPreview;

import {
  User,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Home,
} from '@/lib/icons';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/user-avatar';

/**
 * Prototype — "one frame through the whole buyer journey".
 *
 * Today `/overview` (a buyer's "Mine påmeldinger") renders inside TeacherLayout
 * → TeacherSidebar, the seller's sidebar shell. So a buyer who taps "Mine
 * påmeldinger" jumps from the clean top-bar public pages into a sidebar app —
 * feels like leaving the app.
 *
 * Proposal: buyers never enter the sidebar. Their bookings render in the SAME
 * top-bar frame (<AppHeader>: Openspot wordmark left + AccountControl right) as
 * the course/checkout pages. The AccountControl is the constant top-right on
 * every buyer screen → the journey is one continuous frame. Sellers keep the
 * sidebar (a real multi-section admin tool).
 *
 * This is a visual prototype only — no routing changed.
 */

const MOCK_BUYER = { firstName: 'Ingrid' };

// ── The shared frame ────────────────────────────────────────────────────────

/** Static logged-in account chip (visual only — mirrors the real
 * <AccountControl> "Navngitt" trigger). */
function AccountChip() {
  return (
    <span className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface py-0.5 pl-0.5 pr-2 shadow-xs">
      <UserAvatar size="sm" name={MOCK_BUYER.firstName} />
      <span className="pl-0.5 text-sm font-medium text-foreground">{MOCK_BUYER.firstName}</span>
      <ChevronDown className="size-4 text-foreground-muted" strokeWidth={1.75} />
    </span>
  );
}

/** The one header every buyer-facing screen shares. */
function AppHeader({ maxWidth = 'max-w-[1100px]' }: { maxWidth?: string }) {
  return (
    <header className="w-full border-b border-border-subtle py-4">
      <div className={cn('mx-auto flex w-full items-center justify-between px-5', maxWidth)}>
        <span className="text-base font-medium text-foreground">Openspot</span>
        <AccountChip />
      </div>
    </header>
  );
}

/** Faux browser chrome so each screen reads as a distinct page — while the
 * identical AppHeader inside shows the continuity. */
function BrowserFrame({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
        <span className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-border-strong" />
          <span className="size-2.5 rounded-full bg-border-strong" />
          <span className="size-2.5 rounded-full bg-border-strong" />
        </span>
        <span className="ml-2 truncate rounded-md bg-background px-2.5 py-1 text-xs text-foreground-muted ring-1 ring-border">
          {url}
        </span>
      </div>
      {children}
    </div>
  );
}

// ── Screen bodies ────────────────────────────────────────────────────────────

function CourseBody() {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-6">
      <span className="mb-5 inline-flex items-center gap-1.5 text-sm text-foreground-muted">
        <ChevronLeft className="size-4" strokeWidth={1.75} />
        Kristoffer Yoga
      </span>
      <div className="grid grid-cols-[minmax(0,1fr)_300px] gap-8">
        <div>
          <h1 className="text-3xl font-medium text-foreground">Paid</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-foreground-muted">
            <span className="inline-flex items-center gap-1.5"><Calendar className="size-3.5" strokeWidth={1.75} /> I morgen</span>
            <span className="inline-flex items-center gap-1.5 tabular-nums"><Clock className="size-3.5" strokeWidth={1.75} /> 06:15–07:00</span>
          </div>
          <div className="mt-6 h-px bg-border" />
          <p className="mt-6 text-sm font-medium text-foreground-muted">Om kurset</p>
          <p className="mt-1.5 text-sm text-foreground">Morgenyoga for alle nivåer.</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-foreground-muted">I morgen · 06:15</p>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">Totalt</span>
            <span className="font-semibold text-foreground">2 100 kr</span>
          </div>
          <div className="mt-3 h-9 rounded-full bg-primary text-center text-sm font-medium leading-9 text-primary-foreground">
            Reserver
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckoutBody() {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-6">
      <span className="mb-5 inline-flex items-center gap-1.5 text-sm text-foreground-muted">
        <ChevronLeft className="size-4" strokeWidth={1.75} />
        Tilbake
      </span>
      <div className="max-w-md">
        <h1 className="text-2xl font-medium text-foreground">Fullfør påmelding</h1>
        <div className="mt-5 space-y-3 rounded-xl border border-border bg-surface p-4 text-sm">
          <Row label="Kurspakke" value="2 000 kr" />
          <Row label="Tjenestegebyr" value="100 kr" muted />
          <div className="h-px bg-border" />
          <Row label="Totalt" value="2 100 kr" bold />
        </div>
        <div className="mt-4 h-10 rounded-full bg-primary text-center text-sm font-medium leading-10 text-primary-foreground">
          Betal 2 100 kr
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, muted, bold }: { label: string; value: string; muted?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn(muted ? 'text-foreground-muted' : 'text-foreground', bold && 'font-semibold')}>{label}</span>
      <span className={cn('tabular-nums', muted ? 'text-foreground-muted' : 'text-foreground', bold && 'font-semibold')}>{value}</span>
    </div>
  );
}

interface Booking {
  month: string;
  day: string;
  title: string;
  studio: string;
  time: string;
  past?: boolean;
}

const UPCOMING: Booking[] = [
  { month: 'jun', day: '16', title: 'Paid', studio: 'Kristoffer Yoga', time: '06:15–07:00' },
  { month: 'jun', day: '18', title: 'Morgenflyt', studio: 'Inspire Yogastudio', time: '09:00–10:00' },
];
const PAST: Booking[] = [
  { month: 'jun', day: '02', title: 'Vinyasa', studio: 'Kristoffer Yoga', time: '17:30–18:30', past: true },
];

function BookingCard({ b }: { b: Booking }) {
  return (
    <div className={cn('flex items-center gap-4 rounded-xl border border-border bg-surface p-4', b.past && 'opacity-60')}>
      <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-lg bg-muted">
        <span className="text-[10px] font-medium uppercase leading-none text-foreground-muted">{b.month}</span>
        <span className="text-base font-semibold leading-tight text-foreground">{b.day}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{b.title}</p>
        <p className="truncate text-sm text-foreground-muted">{b.studio} · {b.time}</p>
      </div>
      {!b.past && <Badge variant="success" shape="pill" size="sm">Bekreftet</Badge>}
      <ChevronRight className="size-4 text-foreground-disabled" strokeWidth={1.75} />
    </div>
  );
}

function MyBookingsBody() {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-6">
      <h1 className="text-2xl font-medium text-foreground">Mine påmeldinger</h1>
      <p className="mt-1 text-sm text-foreground-muted">Alle kursene dine, på tvers av studioer.</p>

      <p className="mt-6 mb-2 text-xs font-medium uppercase tracking-wide text-foreground-muted">Kommende</p>
      <div className="space-y-2.5">
        {UPCOMING.map((b) => <BookingCard key={b.title} b={b} />)}
      </div>

      <p className="mt-6 mb-2 text-xs font-medium uppercase tracking-wide text-foreground-muted">Tidligere</p>
      <div className="space-y-2.5">
        {PAST.map((b) => <BookingCard key={b.title} b={b} />)}
      </div>
    </div>
  );
}

/** The current reality: buyer bookings inside the seller sidebar shell. */
function SidebarShellMock() {
  return (
    <div className="flex min-h-[420px]">
      {/* Dark Slate sidebar (chrome tokens) */}
      <div className="flex w-44 shrink-0 flex-col bg-chrome p-3 text-chrome-foreground">
        <span className="px-2 py-1.5 text-base font-medium text-chrome-foreground">Openspot</span>
        <div className="mt-3 flex items-center gap-2 rounded-md bg-chrome-hover px-2 py-1.5 text-sm">
          <Home className="size-4" strokeWidth={1.75} />
          Oversikt
        </div>
        <div className="mt-auto flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-chrome-foreground-muted">
          <span className="flex size-6 items-center justify-center rounded-full bg-chrome-active">
            <User className="size-3.5" strokeWidth={1.75} />
          </span>
          Ingrid
        </div>
      </div>
      {/* Body */}
      <div className="min-w-0 flex-1 px-5 py-6">
        <h1 className="text-2xl font-medium text-foreground">Mine påmeldinger</h1>
        <div className="mt-5 space-y-2.5">
          {UPCOMING.map((b) => <BookingCard key={b.title} b={b} />)}
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

function JourneyStep({ url, label, children }: { url: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <BrowserFrame url={url}>
        <AppHeader />
        {children}
      </BrowserFrame>
    </div>
  );
}

const BuyerFramePreview = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-40 border-b border-border bg-surface-elevated backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Badge variant="neutral" shape="pill" size="sm">Buyer frame</Badge>
          <span className="text-sm text-foreground-muted">Én ramme gjennom hele kjøperreisen</span>
          <span className="ml-auto text-xs text-foreground-muted">/dev/buyer-frame</span>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-border bg-muted/30 p-5">
          <p className="text-sm font-medium text-foreground">Hvorfor</p>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-foreground-muted">
            Samme topbar (Openspot-merke til venstre, konto til høyre) bærer
            gjennom hele kjøperreisen — kurs, checkout og «Mine påmeldinger».
            Kontoknappen er den konstante i øvre høyre hjørne. Kjøperen havner
            aldri i selgerens sidebar, så det føles som én app hele veien.
          </p>
        </div>

        {/* The continuous journey */}
        <section className="space-y-5">
          <h2 className="text-sm font-medium text-foreground">Kjøperreise — samme topbar hele veien</h2>
          <JourneyStep url="openspot.no/kristoffer-yoga/paid" label="1 · Kursside">
            <CourseBody />
          </JourneyStep>
          <div className="flex items-center justify-center gap-2 text-xs text-foreground-muted">
            <span className="h-4 w-px bg-border" /> samme ramme <span className="h-4 w-px bg-border" />
          </div>
          <JourneyStep url="openspot.no/kristoffer-yoga/paid/pamelding" label="2 · Checkout">
            <CheckoutBody />
          </JourneyStep>
          <div className="flex items-center justify-center gap-2 text-xs text-foreground-muted">
            <span className="h-4 w-px bg-border" /> samme ramme <span className="h-4 w-px bg-border" />
          </div>
          <JourneyStep url="openspot.no/mine-paameldinger" label="3 · Mine påmeldinger (ny — i samme ramme)">
            <MyBookingsBody />
          </JourneyStep>
        </section>

        {/* Before / after for the bookings screen */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-foreground">«Mine påmeldinger»: nå → forslag</h2>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Nå — selgerens sidebar</span>
              <BrowserFrame url="openspot.no/overview">
                <SidebarShellMock />
              </BrowserFrame>
              <p className="text-xs leading-relaxed text-foreground-muted">
                Kjøperen kastes inn i et sidebar-skall bygget for selgere (ett
                nav-punkt). Annen ramme enn resten → føles som et eget verktøy.
              </p>
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Forslag — samme topbar</span>
              <BrowserFrame url="openspot.no/mine-paameldinger">
                <AppHeader />
                <MyBookingsBody />
              </BrowserFrame>
              <p className="text-xs leading-relaxed text-foreground-muted">
                Identisk topbar som kurs- og checkout-sidene. Kjøperen merker
                ingen overgang — samme app, samme ramme.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default BuyerFramePreview;

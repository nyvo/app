import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  LogOut,
  Ticket,
  ChevronDown,
  ChevronLeft,
  MapPin,
  Building,
  ArrowUpRight,
} from '@/lib/icons';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

/**
 * Prototype — buyer-account affordance for the PUBLIC course surfaces.
 *
 * The gap (App.tsx RootRoute): buyers enter through studio storefronts but the
 * only login doors live on the seller-advertised landing page. This adds a
 * discreet account control to the three public headers — never gating a guest.
 *
 * STYLE grounded in real references (Mobbin):
 *  - Logged out → bordered pill "Logg inn"  (Preply, Brilliant)
 *  - Logged in  → bare avatar + chevron      (ClassPass, Klook, Eventbrite, Dovetail)
 *                 …or avatar + first name     (Navan, Workable) — toggle; the name
 *                 offsets our mandated neutral-silhouette placeholder read.
 *  - Menu       → clean white profile card    (Preply, Fibery, Dovetail) — header
 *                 (avatar·name·email) + divider + plain rows, ONE indigo-accented
 *                 primary ("Mine påmeldinger"). No decorative fills.
 *
 * Integration points if approved:
 *   1. StudioMasthead.tsx          — top-right of the brand lockup row
 *   2. PublicCourseDetailPage.tsx  — right cell of the centered wordmark header
 *   3. CheckoutPage.tsx            — same (optional here — mid-purchase)
 */

type AuthState = 'out' | 'in';
/** Logged-in treatment. `avatar` = bare circle + chevron (ClassPass / Klook /
 * Eventbrite / Dovetail — the booking-vertical norm). `named` = avatar + first
 * name in a pill chip (Navan / Workable — heavier, but the name offsets our
 * mandated neutral-silhouette placeholder read). Logged-out is a bordered pill
 * in both (validated by Preply / Brilliant). */
type Style = 'avatar' | 'named';
type Width = 'desktop' | 'mobile';

const MOCK_BUYER = {
  name: 'Ingrid Hansen',
  firstName: 'Ingrid',
  email: 'ingrid@example.com',
  avatarUrl: null as string | null,
};

// ── The reusable control (what would be extracted to a shared component) ──

interface AccountControlProps {
  authState: AuthState;
  style: Style;
  /** Where to return after auth — the storefront/course path the buyer is on. */
  next: string;
}

function AccountControl({ authState, style, next }: AccountControlProps) {
  const loginHref = `/auth?intent=buyer&next=${encodeURIComponent(next)}`;

  // Logged out — bordered pill, both styles (Preply / Brilliant).
  if (authState === 'out') {
    return (
      <Link
        to={loginHref}
        className="group inline-flex h-9 select-none items-center gap-1.5 rounded-full border border-border bg-surface pl-2.5 pr-3.5 text-sm font-medium text-foreground shadow-xs transition-colors hover:border-border-strong hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px"
      >
        <User className="size-4 text-foreground-muted transition-colors group-hover:text-foreground" strokeWidth={1.75} />
        Logg inn
      </Link>
    );
  }

  // Logged in — bare avatar (vertical-native) or named pill chip.
  const trigger =
    style === 'avatar' ? (
      <button
        type="button"
        aria-label="Kontomeny"
        className="group inline-flex items-center gap-1 rounded-full outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <UserAvatar size="sm" name={MOCK_BUYER.name} src={MOCK_BUYER.avatarUrl} ringClassName="ring-1 ring-border transition-[box-shadow] group-hover:ring-border-strong" />
        <ChevronDown className="size-4 text-foreground-muted transition-transform group-aria-expanded:rotate-180" strokeWidth={1.75} />
      </button>
    ) : (
      <button
        type="button"
        aria-label="Kontomeny"
        className="group inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface py-0.5 pl-0.5 pr-2 shadow-xs outline-none transition-colors hover:border-border-strong hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-expanded:border-border-strong aria-expanded:bg-muted"
      >
        <UserAvatar size="sm" name={MOCK_BUYER.name} src={MOCK_BUYER.avatarUrl} />
        <span className="hidden pl-0.5 text-sm font-medium text-foreground sm:inline">{MOCK_BUYER.firstName}</span>
        <ChevronDown className="size-4 text-foreground-muted transition-transform group-aria-expanded:rotate-180" strokeWidth={1.75} />
      </button>
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <AccountMenu />
    </DropdownMenu>
  );
}

/** Clean white profile card — Preply / Fibery / Dovetail pattern. */
function AccountMenu() {
  return (
    <DropdownMenuContent align="end" sideOffset={8} className="w-64 overflow-hidden p-0">
      <div className="flex items-center gap-3 border-b border-border px-3 py-3">
        <UserAvatar size="md" name={MOCK_BUYER.name} src={MOCK_BUYER.avatarUrl} ringClassName="ring-1 ring-border" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{MOCK_BUYER.name}</p>
          <p className="truncate text-xs text-foreground-muted">{MOCK_BUYER.email}</p>
        </div>
      </div>
      <div className="p-1">
        <DropdownMenuItem asChild className="gap-2.5 py-2">
          <Link to="/overview">
            <Ticket className="size-4 text-primary" strokeWidth={1.75} />
            <span className="font-medium">Mine påmeldinger</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="gap-2.5 py-2">
          <Link to="/settings/profile">
            <User className="size-4 text-foreground-muted" strokeWidth={1.75} />
            Profil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2.5 py-2">
          <LogOut className="size-4 text-foreground-muted" strokeWidth={1.75} />
          Logg ut
        </DropdownMenuItem>
      </div>
    </DropdownMenuContent>
  );
}

// ── Header showcases — the three real public surfaces, mocked ──────────────

function StorefrontHeader({ control }: { control: React.ReactNode }) {
  return (
    <header className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-10 lg:px-8">
      <div className="flex items-start gap-5 sm:gap-6">
        <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground-muted ring-1 ring-border sm:size-24">
          <Building className="size-9 sm:size-10" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <h1 className="text-3xl font-medium leading-tight text-foreground sm:text-4xl">
            Inspire Yogastudio
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-foreground-muted">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <MapPin className="size-4 shrink-0" aria-hidden />
              <span className="truncate">Storgata 12, Oslo</span>
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-primary underline decoration-primary/30 underline-offset-2">
              Få veibeskrivelse
              <ArrowUpRight className="size-3.5" strokeWidth={1.75} />
            </span>
          </div>
        </div>
        {/* NEW — account control, top-right, aligned to the brand lockup */}
        <div className="shrink-0 pt-0.5">{control}</div>
      </div>
    </header>
  );
}

function WordmarkHeader({ control, back }: { control: React.ReactNode; back?: string }) {
  return (
    <>
      {/* Header = two anchored zones: brand left, account right. */}
      <header className="flex items-center justify-between px-4 py-6 sm:px-6">
        <Link to="/" className="flex select-none items-center">
          <span className="text-base font-medium text-foreground">Openspot</span>
        </Link>
        {control}
      </header>
      {/* Back link belongs to the CONTENT area, not the header. */}
      {back && (
        <div className="px-4 pt-2 sm:px-6">
          <span className="inline-flex items-center gap-1.5 text-sm text-foreground-muted">
            <ChevronLeft className="size-4" strokeWidth={1.75} />
            {back}
          </span>
        </div>
      )}
    </>
  );
}

// ── Frame + page ───────────────────────────────────────────────────────────

function Showcase({
  label,
  file,
  width,
  children,
}: {
  label: string;
  file: string;
  width: Width;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-sm font-medium text-foreground">{label}</h2>
        <code className="text-xs text-foreground-muted">{file}</code>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-background">
        <div className="mx-auto" style={{ maxWidth: width === 'mobile' ? 390 : '100%' }}>
          {children}
          <div className="h-10" />
        </div>
      </div>
    </section>
  );
}

const AccountAffordancePreview = () => {
  const [authState, setAuthState] = useState<AuthState>('out');
  const [style, setStyle] = useState<Style>('avatar');
  const [width, setWidth] = useState<Width>('desktop');

  const control = (next: string) => (
    <AccountControl authState={authState} style={style} next={next} />
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DevBar
        authState={authState}
        onAuthState={setAuthState}
        style={style}
        onStyle={setStyle}
        width={width}
        onWidth={setWidth}
      />

      <div className="mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
        {/* Rationale */}
        <div className="rounded-xl border border-border bg-muted/30 p-5">
          <p className="text-sm font-medium text-foreground">Hvorfor</p>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-foreground-muted">
            Kjøpere kommer inn via studioets storefront, men eneste innloggingsdør
            ligger på landingssiden som selges inn mot arrangører. Denne diskré
            kontoknappen gir gjenkommende kjøpere en vei tilbake til «Mine
            påmeldinger» der de faktisk står — uten å stenge gjestekjøp.
          </p>
        </div>

        {/* The two evidence-grounded logged-in options, side by side */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-foreground">Innlogget — to alternativer</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <CompareCard
              caption="Avatar (ClassPass · Klook · Eventbrite)"
              note="Vertikal-standard. Risiko: nøytral grå silhuett uten bilde kan se uferdig ut."
            >
              <AccountControl authState="in" style="avatar" next="/x" />
            </CompareCard>
            <CompareCard
              caption="Navngitt (Navan · Workable)"
              note="Navnet fjerner placeholder-følelsen. Litt tyngre, mer «SaaS»."
            >
              <AccountControl authState="in" style="named" next="/x" />
            </CompareCard>
          </div>
        </section>

        {/* The three public surfaces */}
        <Showcase label="1 · Studio-storefront" file="StudioMasthead.tsx" width={width}>
          <StorefrontHeader control={control('/inspire-yogastudio')} />
        </Showcase>

        <Showcase label="2 · Kursside" file="PublicCourseDetailPage.tsx" width={width}>
          <WordmarkHeader control={control('/inspire-yogastudio/yoga-flow')} back="Inspire Yogastudio" />
        </Showcase>

        <Showcase label="3 · Checkout (valgfri her)" file="CheckoutPage.tsx" width={width}>
          <WordmarkHeader control={control('/inspire-yogastudio/yoga-flow/pamelding')} />
        </Showcase>

        {/* Open-menu reference (static replica so it shows in screenshots) */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-foreground">Kontomeny (åpen)</h2>
          <div className="rounded-xl border border-border bg-background p-8">
            <OpenMenuReplica />
          </div>
        </section>
      </div>
    </div>
  );
};

function CompareCard({
  caption,
  note,
  children,
}: {
  caption: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-background p-6">
      <div className="flex min-h-10 items-center">{children}</div>
      <div>
        <span className="block text-sm font-medium text-foreground">{caption}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-foreground-muted">{note}</span>
      </div>
    </div>
  );
}

/** Static visual replica of the open menu (so screenshots show it without
 * relying on the portal). Mirrors AccountMenu's tokens. */
function OpenMenuReplica() {
  return (
    <div className="w-64 overflow-hidden rounded-md bg-surface text-foreground shadow-md ring-1 ring-foreground/10">
      <div className="flex items-center gap-3 border-b border-border px-3 py-3">
        <UserAvatar size="md" name={MOCK_BUYER.name} src={MOCK_BUYER.avatarUrl} ringClassName="ring-1 ring-border" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{MOCK_BUYER.name}</p>
          <p className="truncate text-xs text-foreground-muted">{MOCK_BUYER.email}</p>
        </div>
      </div>
      <div className="p-1">
        <ReplicaItem icon={<Ticket className="size-4 text-primary" strokeWidth={1.75} />} bold>Mine påmeldinger</ReplicaItem>
        <ReplicaItem icon={<User className="size-4 text-foreground-muted" strokeWidth={1.75} />}>Profil</ReplicaItem>
        <div className="-mx-1 my-1 h-px bg-border" />
        <ReplicaItem icon={<LogOut className="size-4 text-foreground-muted" strokeWidth={1.75} />}>Logg ut</ReplicaItem>
      </div>
    </div>
  );
}

function ReplicaItem({
  icon,
  children,
  bold,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-sm px-2 py-2 text-sm text-foreground">
      {icon}
      <span className={cn(bold && 'font-medium')}>{children}</span>
    </div>
  );
}

function DevBar({
  authState,
  onAuthState,
  style,
  onStyle,
  width,
  onWidth,
}: {
  authState: AuthState;
  onAuthState: (v: AuthState) => void;
  style: Style;
  onStyle: (v: Style) => void;
  width: Width;
  onWidth: (v: Width) => void;
}) {
  return (
    <div className="sticky top-0 z-40 border-b border-border bg-surface-elevated backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
        <Toggle
          label="Konto"
          value={authState}
          options={[['out', 'Utlogget'], ['in', 'Innlogget']]}
          onChange={onAuthState}
        />
        <Toggle
          label="Innlogget-stil"
          value={style}
          options={[['avatar', 'Avatar'], ['named', 'Navngitt']]}
          onChange={onStyle}
        />
        <Toggle
          label="Bredde"
          value={width}
          options={[['desktop', 'Desktop'], ['mobile', 'Mobil']]}
          onChange={onWidth}
        />
        <Badge variant="neutral" shape="pill" size="sm">Account affordance</Badge>
        <span className="ml-auto text-xs text-foreground-muted">/dev/account-affordance</span>
      </div>
    </div>
  );
}

function Toggle<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-foreground-muted">{label}</span>
      <div className="inline-flex rounded-full border border-border bg-background p-0.5">
        {options.map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
              value === v ? 'bg-foreground text-background' : 'text-foreground-muted hover:text-foreground',
            )}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

export default AccountAffordancePreview;

import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  CreditCard,
  Home,
  Lock,
  Shield,
  Wallet,
} from '@/lib/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { routes } from '@/lib/routes'

const SURFACES = [
  {
    name: 'Dashboard',
    start: 'Manual payment panel, external-payment signups, no income chart.',
    pro: 'Income chart, paid/refunded revenue, Stripe-backed payment states.',
  },
  {
    name: 'Checkout',
    start: 'Signup confirmation only. No payment, no service fee, no platform money flow.',
    pro: 'Stripe Elements, Vipps/card, capped service fee, platform fee split.',
  },
  {
    name: 'Payouts',
    start: 'Locked surface with upgrade path.',
    pro: 'Stripe onboarding/status/Express dashboard.',
  },
  {
    name: 'Publish',
    start: 'Priced courses can publish without payment setup.',
    pro: 'Stripe onboarding is required before publishing integrated-payment courses.',
  },
] as const

const START_SIGNUPS = [
  { name: 'Anna Berg', course: 'Morgenflyt', payment: 'Ekstern betaling', amount: '1 200 kr' },
  { name: 'Mikkel Solheim', course: 'Pust og ro', payment: 'Venter', amount: '350 kr' },
] as const

const PRO_SIGNUPS = [
  { name: 'Ida Lien', course: 'Vinyasa kveld', payment: 'Betalt', amount: '1 349 kr' },
  { name: 'Sara Nymo', course: 'Helgekurs', payment: 'Refundert', amount: '0 kr' },
] as const

export default function TierPreview() {
  return (
    <main className="min-h-screen bg-muted/30 text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="neutral" size="sm">Dev preview</Badge>
              <Badge variant="info" size="sm">Mobbin refs: billing, plan comparison, contextual upgrade</Badge>
            </div>
            <h1 className="mt-3 text-2xl font-medium tracking-tight sm:text-3xl">
              Start vs Pro product states
            </h1>
            <p className="mt-2 max-w-3xl text-base text-foreground-muted">
              A focused review of the places where the free tier must feel deliberately different
              from Pro: dashboard, checkout, payouts, and publish gating.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link to={routes.settingsBilling}>Billing route</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to={routes.settingsPayouts}>Payout route</Link>
            </Button>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="rounded-lg border border-border bg-background p-3 xl:sticky xl:top-6 xl:self-start">
            <div className="px-2 py-2">
              <p className="text-base font-medium">Openspot</p>
              <p className="mt-1 text-xs text-foreground-muted">Teacher account preview</p>
            </div>
            <nav className="mt-3 space-y-1">
              <SidebarItem icon={Home} label="Oversikt" active />
              <SidebarItem icon={Calendar} label="Timeplan" />
              <SidebarItem icon={BookOpen} label="Kurs" />
              <SidebarItem icon={CreditCard} label="Abonnement" badge="Start" />
            </nav>
            <div className="mt-4 rounded-md border border-border bg-muted/50 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Plan</span>
                <Badge variant="neutral" size="sm">Start</Badge>
              </div>
              <p className="mt-2 text-xs leading-5 text-foreground-muted">
                Current account accepts signups, but payment is handled outside Openspot.
              </p>
              <Button size="default" className="mt-3 h-8 px-3 text-xs">
                Upgrade
                <ArrowRight className="size-3.5" aria-hidden />
              </Button>
            </div>
          </aside>

          <div className="space-y-5">
            <section className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
              <DashboardSurface />
              <PlanInspector />
            </section>

            <section className="grid gap-5 lg:grid-cols-3">
              <CheckoutSurface />
              <PayoutSurface />
              <PublishSurface />
            </section>

            <SurfaceMatrix />
          </div>
        </section>
      </div>
    </main>
  )
}

function SidebarItem({
  icon: Icon,
  label,
  active,
  badge,
}: {
  icon: typeof Home
  label: string
  active?: boolean
  badge?: string
}) {
  return (
    <div
      className={[
        'flex h-9 items-center gap-2 rounded-md px-2 text-sm',
        active ? 'bg-muted text-foreground' : 'text-foreground-muted',
      ].join(' ')}
    >
      <Icon className="size-4" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge && <Badge variant="neutral" size="xs">{badge}</Badge>}
    </div>
  )
}

function DashboardSurface() {
  return (
    <section className="rounded-lg border border-border bg-background">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-medium">Oversikt</h2>
            <Badge variant="neutral" size="sm">Start</Badge>
          </div>
          <p className="mt-1 text-sm text-foreground-muted">What a new teacher should see first.</p>
        </div>
        <Button variant="secondary" className="w-fit">Se Pro</Button>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="p-5">
          <div className="rounded-md border border-border bg-muted/40 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground-muted">Betalinger</p>
                <h3 className="mt-1 text-2xl font-medium tracking-tight">
                  Avtales direkte med instruktør
                </h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-foreground-muted">
                  Påmeldinger lander i Openspot. Vipps, faktura, kontant eller annen betaling
                  skjer utenfor plattformen.
                </p>
              </div>
              <Wallet className="size-5 text-foreground-muted" aria-hidden />
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            <MiniList title="Siste påmeldinger" rows={START_SIGNUPS} muted />
            <MiniList title="Pro preview" rows={PRO_SIGNUPS} />
          </div>
        </div>

        <div className="border-t border-border bg-muted/25 p-5 lg:border-l lg:border-t-0">
          <p className="text-sm font-medium">Upgrade trigger</p>
          <p className="mt-2 text-sm leading-6 text-foreground-muted">
            Keep the Start dashboard useful. Put the Pro prompt next to the manual-payment pain,
            not as a full-page ad.
          </p>
          <div className="mt-4 space-y-3">
            <UnlockRow label="Kort/Vipps checkout" />
            <UnlockRow label="Automatiske utbetalinger" />
            <UnlockRow label="Inntektsgraf" />
          </div>
        </div>
      </div>
    </section>
  )
}

function MiniList({
  title,
  rows,
  muted,
}: {
  title: string
  rows: readonly { name: string; course: string; payment: string; amount: string }[]
  muted?: boolean
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="mb-2 text-sm font-medium">{title}</p>
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={`${row.name}-${row.course}`} className="flex items-center gap-3 rounded-md px-2 py-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
              {row.name.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{row.name}</p>
              <p className="truncate text-xs text-foreground-muted">{row.course}</p>
            </div>
            <div className="text-right">
              <Badge variant={muted ? 'neutral' : 'success'} size="xs">
                {row.payment}
              </Badge>
              <p className="mt-1 text-xs tabular-nums text-foreground-muted">{row.amount}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function UnlockRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Lock className="size-3.5 text-foreground-muted" aria-hidden />
      <span>{label}</span>
    </div>
  )
}

function PlanInspector() {
  return (
    <section className="rounded-lg border border-border bg-background">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-base font-medium">Billing settings</h2>
        <p className="mt-1 text-sm text-foreground-muted">Current state plus plan selection.</p>
      </div>
      <div className="p-5">
        <div className="rounded-md border border-border p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-foreground-muted">Current plan</p>
              <p className="mt-1 text-xl font-medium">Start</p>
            </div>
            <Badge variant="neutral" size="sm">Free</Badge>
          </div>
          <p className="mt-3 text-sm leading-6 text-foreground-muted">
            Free tier remains operational. The upgrade path is visible, but not blocking course setup.
          </p>
        </div>

        <div className="mt-3 rounded-md border border-foreground/20 bg-background p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-foreground-muted">Pro</p>
              <p className="mt-1 text-xl font-medium">499 kr/mnd</p>
              <p className="text-xs text-foreground-muted">eks. mva</p>
            </div>
            <Badge variant="success" size="sm">Payments</Badge>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            <Feature label="Vipps og kort" />
            <Feature label="Stripe split payout" />
            <Feature label="0 % lærerprovisjon" />
          </ul>
          <Button className="mt-4 w-full">Oppgrader til Pro</Button>
        </div>
      </div>
    </section>
  )
}

function Feature({ label }: { label: string }) {
  return (
    <li className="flex gap-2">
      <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
      <span>{label}</span>
    </li>
  )
}

function CheckoutSurface() {
  return (
    <SurfaceCard
      icon={CreditCard}
      eyebrow="Checkout"
      title="Manual checkout for Start"
      badge="No money flow"
      body="A paid Start course should confirm the signup and tell the participant to arrange payment directly. No Dintero badge, no service fee."
      rows={[
        ['Course price', '1 200 kr'],
        ['Service fee', '0 kr'],
        ['Payment status', 'Ekstern'],
      ]}
    />
  )
}

function PayoutSurface() {
  return (
    <SurfaceCard
      icon={Shield}
      eyebrow="Betalingskonto"
      title="Locked until Pro"
      badge="Contextual upgrade"
      body="Opening the payout route as Start explains why Stripe Connect is hidden and sends the teacher to billing."
      rows={[
        ['Start', 'Upgrade prompt'],
        ['Pro inactive', 'Stripe setup'],
        ['Pro active', 'Express dashboard link'],
      ]}
    />
  )
}

function PublishSurface() {
  return (
    <SurfaceCard
      icon={BookOpen}
      eyebrow="Publisering"
      title="Gate by payment mode"
      badge="Server backed"
      body="Start can publish priced courses because payment is external. Pro requires Stripe onboarding before integrated checkout."
      rows={[
        ['Start priced course', 'Can publish'],
        ['Pro without Stripe', 'Blocked'],
        ['Pro with Stripe', 'Can publish'],
      ]}
    />
  )
}

function SurfaceCard({
  icon: Icon,
  eyebrow,
  title,
  badge,
  body,
  rows,
}: {
  icon: typeof CreditCard
  eyebrow: string
  title: string
  badge: string
  body: string
  rows: readonly (readonly [string, string])[]
}) {
  return (
    <section className="rounded-lg border border-border bg-background p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-9 items-center justify-center rounded-md bg-muted text-foreground-muted">
          <Icon className="size-4" aria-hidden />
        </div>
        <Badge variant="neutral" size="sm">{badge}</Badge>
      </div>
      <p className="mt-4 text-sm font-medium text-foreground-muted">{eyebrow}</p>
      <h2 className="mt-1 text-lg font-medium tracking-tight">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-foreground-muted">{body}</p>
      <div className="mt-4 divide-y divide-border rounded-md border border-border">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 px-3 py-2 text-sm">
            <span className="text-foreground-muted">{label}</span>
            <span className="text-right font-medium">{value}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function SurfaceMatrix() {
  return (
    <section className="rounded-lg border border-border bg-background">
      <div className="border-b border-border px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-medium">Implementation map</h2>
            <p className="mt-1 text-sm text-foreground-muted">
              The blocker inventory translated into explicit Start and Pro states.
            </p>
          </div>
          <Badge variant="info" size="sm">Reference: plan comparison + feature info</Badge>
        </div>
      </div>

      <div className="hidden sm:block">
        <div className="grid grid-cols-[180px_1fr_1fr] bg-muted/60 px-5 py-3 text-sm font-medium">
          <span>Surface</span>
          <span>Start</span>
          <span>Pro</span>
        </div>
        {SURFACES.map((surface) => (
          <div
            key={surface.name}
            className="grid grid-cols-[180px_1fr_1fr] border-t border-border px-5 py-4 text-sm"
          >
            <span className="font-medium">{surface.name}</span>
            <span className="pr-6 leading-6 text-foreground-muted">{surface.start}</span>
            <span className="leading-6 text-foreground-muted">{surface.pro}</span>
          </div>
        ))}
      </div>

      <div className="space-y-3 p-4 sm:hidden">
        {SURFACES.map((surface) => (
          <div key={surface.name} className="rounded-md border border-border p-4">
            <p className="font-medium">{surface.name}</p>
            <p className="mt-3 text-sm font-medium text-foreground-muted">Start</p>
            <p className="mt-1 text-sm leading-6">{surface.start}</p>
            <p className="mt-3 text-sm font-medium text-foreground-muted">Pro</p>
            <p className="mt-1 text-sm leading-6">{surface.pro}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

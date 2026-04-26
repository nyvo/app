import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

type TokenSet = React.CSSProperties;

// Column 2 — Cal.com-inspired: navy-ink primary, cool-blue tinted neutrals.
// Canvas stays slightly off-white (gap from card preserved); sidebar tokens
// shift in parallel so the dashboard shell picks up the cool-blue wash too.
const CAL_TOKENS: TokenSet = {
  // @ts-expect-error — CSS custom properties aren't in CSSProperties type
  '--background': 'oklch(0.985 0.005 240)',
  '--foreground': 'oklch(0.15 0.03 250)',
  '--card': 'oklch(1 0 0)',
  '--card-foreground': 'oklch(0.15 0.03 250)',
  '--popover': 'oklch(1 0 0)',
  '--popover-foreground': 'oklch(0.15 0.03 250)',
  '--primary': 'oklch(0.22 0.05 255)',
  '--primary-foreground': 'oklch(0.985 0 0)',
  '--secondary': 'oklch(0.975 0.008 240)',
  '--secondary-foreground': 'oklch(0.22 0.05 255)',
  '--muted': 'oklch(0.975 0.008 240)',
  '--muted-foreground': 'oklch(0.52 0.015 240)',
  '--tertiary-foreground': 'oklch(0.68 0.018 240)',
  '--disabled-foreground': 'oklch(0.82 0.012 240)',
  '--accent': 'oklch(0.975 0.008 240)',
  '--accent-foreground': 'oklch(0.22 0.05 255)',
  '--border': 'oklch(0.87 0.012 240)',
  '--border-subtle': 'oklch(0.93 0.008 240)',
  '--input': 'oklch(0.87 0.012 240)',
  '--ring': 'oklch(0.68 0.018 240)',
  // Sidebar tokens — parallel shifts so the dashboard shell matches
  '--sidebar': 'oklch(1 0 0)',
  '--sidebar-foreground': 'oklch(0.15 0.03 250)',
  '--sidebar-primary': 'oklch(0.22 0.05 255)',
  '--sidebar-primary-foreground': 'oklch(0.985 0 0)',
  '--sidebar-accent': 'oklch(0.975 0.008 240)',
  '--sidebar-accent-foreground': 'oklch(0.22 0.05 255)',
  '--sidebar-border': 'oklch(0.87 0.012 240)',
  '--sidebar-ring': 'oklch(0.68 0.018 240)',
  '--radius': '0.5rem',
};

// Column 3 — Linear-inspired: pure neutrals, minimal borders, tighter radius.
// Linear's signature is "borders so faint they almost disappear", relying on
// subtle shadows for card separation. Canvas stays slightly off-white.
const LINEAR_TOKENS: TokenSet = {
  // @ts-expect-error
  '--background': 'oklch(0.99 0 0)',
  '--foreground': 'oklch(0.18 0.005 260)',
  '--card': 'oklch(1 0 0)',
  '--card-foreground': 'oklch(0.18 0.005 260)',
  '--popover': 'oklch(1 0 0)',
  '--popover-foreground': 'oklch(0.18 0.005 260)',
  '--primary': 'oklch(0.20 0.008 260)',
  '--primary-foreground': 'oklch(0.985 0 0)',
  '--secondary': 'oklch(0.97 0 0)',
  '--secondary-foreground': 'oklch(0.20 0.008 260)',
  '--muted': 'oklch(0.97 0 0)',
  '--muted-foreground': 'oklch(0.52 0.005 260)',
  '--tertiary-foreground': 'oklch(0.65 0.005 260)',
  '--disabled-foreground': 'oklch(0.78 0.005 260)',
  '--accent': 'oklch(0.97 0 0)',
  '--accent-foreground': 'oklch(0.20 0.008 260)',
  '--border': 'oklch(0.94 0 0)',
  '--border-subtle': 'oklch(0.97 0 0)',
  '--input': 'oklch(0.94 0 0)',
  '--ring': 'oklch(0.65 0.005 260)',
  '--sidebar': 'oklch(1 0 0)',
  '--sidebar-foreground': 'oklch(0.18 0.005 260)',
  '--sidebar-primary': 'oklch(0.20 0.008 260)',
  '--sidebar-primary-foreground': 'oklch(0.985 0 0)',
  '--sidebar-accent': 'oklch(0.97 0 0)',
  '--sidebar-accent-foreground': 'oklch(0.20 0.008 260)',
  '--sidebar-border': 'oklch(0.94 0 0)',
  '--sidebar-ring': 'oklch(0.65 0.005 260)',
  '--radius': '0.375rem',
};

// Column 4 — Warm-neutral (Tailwind stone-palette inspired): warm off-white,
// warm-gray text tiers, orange/brown undertone. The "soft, grounded, human"
// axis. Card stays pure-warm-white, canvas slightly darker warm off-white.
const WARM_TOKENS: TokenSet = {
  // @ts-expect-error
  '--background': 'oklch(0.98 0.006 75)',
  '--foreground': 'oklch(0.18 0.006 60)',
  '--card': 'oklch(0.995 0.003 75)',
  '--card-foreground': 'oklch(0.18 0.006 60)',
  '--popover': 'oklch(0.995 0.003 75)',
  '--popover-foreground': 'oklch(0.18 0.006 60)',
  '--primary': 'oklch(0.22 0.008 60)',
  '--primary-foreground': 'oklch(0.985 0.004 75)',
  '--secondary': 'oklch(0.965 0.006 75)',
  '--secondary-foreground': 'oklch(0.22 0.008 60)',
  '--muted': 'oklch(0.965 0.006 75)',
  '--muted-foreground': 'oklch(0.52 0.012 70)',
  '--tertiary-foreground': 'oklch(0.65 0.012 75)',
  '--disabled-foreground': 'oklch(0.80 0.01 75)',
  '--accent': 'oklch(0.965 0.006 75)',
  '--accent-foreground': 'oklch(0.22 0.008 60)',
  '--border': 'oklch(0.90 0.008 75)',
  '--border-subtle': 'oklch(0.945 0.006 75)',
  '--input': 'oklch(0.90 0.008 75)',
  '--ring': 'oklch(0.65 0.012 75)',
  '--sidebar': 'oklch(0.995 0.003 75)',
  '--sidebar-foreground': 'oklch(0.18 0.006 60)',
  '--sidebar-primary': 'oklch(0.22 0.008 60)',
  '--sidebar-primary-foreground': 'oklch(0.985 0.004 75)',
  '--sidebar-accent': 'oklch(0.965 0.006 75)',
  '--sidebar-accent-foreground': 'oklch(0.22 0.008 60)',
  '--sidebar-border': 'oklch(0.90 0.008 75)',
  '--sidebar-ring': 'oklch(0.65 0.012 75)',
  '--radius': '0.5rem',
};

function Samples() {
  return (
    <div className="space-y-6">
      {/* Card with header + content */}
      <Card>
        <CardHeader>
          <CardTitle>Kurskveld med Anne</CardTitle>
          <CardDescription>Torsdag kl. 18:00 · 12 av 14 påmeldte</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Åpen klasse for alle nivåer. Fokus på pusteteknikk og avslapning. Ta med egen matte.
          </p>
        </CardContent>
      </Card>

      {/* Button row */}
      <div className="flex flex-wrap items-center gap-2">
        <Button>Opprett kurs</Button>
        <Button variant="secondary">Avbryt</Button>
        <Button variant="outline">Filtrer</Button>
        <Button variant="ghost">Mer</Button>
        <Button variant="destructive">Slett</Button>
      </div>

      {/* Text hierarchy */}
      <div className="space-y-2 rounded-lg border border-border bg-card p-6">
        <p className="text-xs font-medium tracking-wide uppercase text-muted-foreground">Inntekter</p>
        <p className="text-3xl font-semibold tabular-nums text-foreground">42 800 kr</p>
        <p className="text-sm text-muted-foreground">Denne måneden</p>
        <p className="text-xs text-tertiary-foreground">Oppdatert for 2 minutter siden</p>
      </div>

      {/* Chart-2 accent surface */}
      <div className="rounded-lg bg-chart-2/10 p-4 flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-chart-2/10 text-chart-2 ring-1 ring-chart-2/20">
          <span className="text-sm font-semibold">YM</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Yin Yoga</p>
          <p className="text-xs text-tertiary-foreground">Mandag kl. 19:00</p>
        </div>
      </div>

      {/* Semantic badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="success" shape="rect">Betalt</Badge>
        <Badge variant="warning" shape="rect">Venter</Badge>
        <Badge variant="destructive" shape="rect">Feilet</Badge>
        <Badge variant="info" shape="rect">Ny</Badge>
        <Badge variant="neutral" shape="rect">Utkast</Badge>
        <Badge variant="accent" shape="rect">Uke 6</Badge>
      </div>

      {/* Form field */}
      <div className="space-y-1.5">
        <label htmlFor="preview-input" className="text-sm font-medium text-foreground">Kursnavn</label>
        <Input id="preview-input" />
      </div>

      {/* Row list with dividers */}
      <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
        {[
          { name: 'Kari Nordmann', meta: 'kari@example.com', status: 'Betalt' },
          { name: 'Ola Hansen', meta: 'ola@example.com', status: 'Venter' },
          { name: 'Ingrid Berg', meta: 'ingrid@example.com', status: 'Betalt' },
        ].map((row) => (
          <div key={row.name} className="flex items-center justify-between px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{row.name}</p>
              <p className="text-xs text-muted-foreground">{row.meta}</p>
            </div>
            <span className="text-xs font-medium tracking-wide text-muted-foreground">{row.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ColumnProps {
  label: string;
  description: string;
  tokens?: TokenSet;
}

function Column({ label, description, tokens }: ColumnProps) {
  return (
    <section className="p-6 bg-background" style={tokens}>
      <div className="mb-6">
        <p className="text-xs font-medium tracking-wide uppercase text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground mt-0.5 leading-snug">{description}</p>
      </div>
      <Samples />
    </section>
  );
}

export default function TokenPreview() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4">
        <h1 className="text-xl font-semibold text-foreground">Token comparison</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Same components, 4 different token sets. Compare and pick your axis.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border">
        <Column
          label="1 · Current"
          description="Pure neutral. Black primary, no color in grays. This is the app today."
        />
        <Column
          label="2 · Cal.com-inspired"
          description="Cool + blue-tinted. Navy-ink primary, subtle blue wash on every gray tier, 8px radius."
          tokens={CAL_TOKENS}
        />
        <Column
          label="3 · Linear-inspired"
          description="Pure neutral but refined. Lighter borders (relies on shadow), tighter 6px radius, near-invisible dividers."
          tokens={LINEAR_TOKENS}
        />
        <Column
          label="4 · Warm-neutral"
          description="Opposite axis. Warm off-white bg, warm-gray text (orange/brown undertone), softer feel. Yoga-adjacent."
          tokens={WARM_TOKENS}
        />
      </div>
    </div>
  );
}

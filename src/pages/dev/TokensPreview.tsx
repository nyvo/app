import type { ReactNode } from 'react';
import { DevPage, PreviewSection } from './_kit';
import { cn } from '@/lib/utils';

/**
 * Live reference for every SEMANTIC design token exposed by `src/index.css`
 * (Layer 2 → Layer 3 `@theme` utilities). Renders the real Tailwind utility
 * classes — never hardcoded hex/oklch — so this page always reflects the
 * actual token values in both light and dark mode. Primitives (`--neutral-*`,
 * `--jade/amber/red/blue-*`) are intentionally NOT shown here: components
 * never consume them directly, so a token reference shouldn't either.
 */

interface SwatchItem {
  /** Complete utility class(es) applied to the tile itself (bg/border). */
  tileClassName: string;
  /** Exact utility class name(s) to print under the tile. */
  token: string;
  /** Short Norwegian description of the token's role. */
  label: string;
  /** Optional content rendered inside the tile (e.g. a contrast-checked sample). */
  content?: ReactNode;
  /** Optional caveat shown under the token name (e.g. translucency notes). */
  note?: string;
}

function Swatch({ tileClassName, token, label, content, note }: SwatchItem) {
  return (
    <div className="space-y-1.5">
      <div className={cn('flex h-16 items-center justify-center rounded-lg', tileClassName)}>
        {content}
      </div>
      <div className="space-y-0.5">
        <p className="text-xs text-foreground">{label}</p>
        <p className="font-mono text-xs text-foreground-muted">{token}</p>
        {note ? <p className="text-xs text-foreground-subtle">{note}</p> : null}
      </div>
    </div>
  );
}

function SwatchGrid({ items }: { items: SwatchItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <Swatch key={item.token} {...item} />
      ))}
    </div>
  );
}

// ── Overflater ──────────────────────────────────────────────────────────

const SURFACE_TOKENS: SwatchItem[] = [
  { tileClassName: 'bg-background border border-border-subtle', token: 'bg-background', label: 'Bakgrunn (side)' },
  { tileClassName: 'bg-canvas border border-border-subtle', token: 'bg-canvas', label: 'Canvas' },
  { tileClassName: 'bg-surface border border-border-subtle', token: 'bg-surface', label: 'Overflate (kort, paneler)' },
  {
    tileClassName: 'bg-surface-elevated border border-border-subtle',
    token: 'bg-surface-elevated',
    label: 'Elevated (translucent header)',
    note: 'Halvtransparent — synlig blur bak innhold, ikke her.',
  },
  { tileClassName: 'bg-panel border border-border-subtle', token: 'bg-panel', label: 'Panel (verktøy-fyll)' },
  { tileClassName: 'bg-muted border border-border-subtle', token: 'bg-muted', label: 'Muted (hover/aktiv-fyll)' },
  {
    tileClassName: 'bg-hover border border-border-subtle',
    token: 'bg-hover',
    label: 'Hover-overlegg',
    note: 'Ink 6% — adapterer til enhver overflate/tema.',
  },
  {
    tileClassName: 'bg-pressed border border-border-subtle',
    token: 'bg-pressed',
    label: 'Pressed-overlegg',
    note: 'Ink 12%.',
  },
  { tileClassName: 'bg-selection border border-border-subtle', token: 'bg-selection', label: 'Selection (tintet kort-hover)' },
  { tileClassName: 'bg-selection-light border border-border-subtle', token: 'bg-selection-light', label: 'Valgt-tilstand tint' },
  { tileClassName: 'bg-chrome border border-border-subtle', token: 'bg-chrome', label: 'Chrome (mørk — toast, marketing)' },
  { tileClassName: 'bg-sidebar border border-border-subtle', token: 'bg-sidebar', label: 'Sidebar' },
];

function OverflaterSection() {
  return (
    <PreviewSection
      label="Overflater"
      description="Bakgrunner og fyll — Layer 2/3 surface-tokens fra @theme."
    >
      <SwatchGrid items={SURFACE_TOKENS} />
    </PreviewSection>
  );
}

// ── Tekst ───────────────────────────────────────────────────────────────

interface TextTier {
  className: string;
  token: string;
  label: string;
  sample: string;
}

const TEXT_TIERS: TextTier[] = [
  {
    className: 'text-foreground',
    token: 'text-foreground',
    label: 'Primær tekst',
    sample: 'Yin Yoga – kveldskurs',
  },
  {
    className: 'text-foreground-muted',
    token: 'text-foreground-muted',
    label: 'Sekundær tekst — WCAG AA på bakgrunn',
    sample: 'Torsdag kl. 18:00 · 12 av 14 påmeldte',
  },
  {
    className: 'text-foreground-subtle',
    token: 'text-foreground-subtle',
    label: 'Diskré — kun dekorative ikoner/glyfer, ikke AA for tekst',
    sample: 'Oppdatert for 2 minutter siden',
  },
  {
    className: 'text-foreground-disabled',
    token: 'text-foreground-disabled',
    label: 'Deaktivert',
    sample: 'Denne handlingen er ikke tilgjengelig',
  },
];

function TekstSection() {
  return (
    <PreviewSection
      label="Tekst"
      description="Forgrunns-tiere — samme rekkefølge som hierarkiet: foreground → muted → subtle → disabled."
    >
      <div className="divide-y divide-border-subtle rounded-xl border border-border-subtle bg-surface px-5">
        {TEXT_TIERS.map((tier) => (
          <div key={tier.token} className="space-y-1 py-5">
            <p className={cn('text-base', tier.className)}>{tier.sample}</p>
            <p className="font-mono text-xs text-foreground-muted">
              {tier.token} <span className="text-foreground-subtle">— {tier.label}</span>
            </p>
          </div>
        ))}
      </div>
    </PreviewSection>
  );
}

// ── Kanter ──────────────────────────────────────────────────────────────

const BORDER_TOKENS: SwatchItem[] = [
  { tileClassName: 'bg-surface border-2 border-border', token: 'border-border', label: 'Synlig skillelinje' },
  { tileClassName: 'bg-surface border-2 border-border-subtle', token: 'border-border-subtle', label: 'Hårfin — rader, dividere' },
  { tileClassName: 'bg-surface border-2 border-border-strong', token: 'border-border-strong', label: 'Skjema-kant (checkbox, switch)' },
  { tileClassName: 'bg-surface border-2 border-border-card', token: 'border-border-card', label: 'Flytende kort (booking, checkout)' },
  { tileClassName: 'bg-surface border-2 border-input', token: 'border-input', label: 'Booking-rail kant' },
];

function KanterSection() {
  return (
    <PreviewSection
      label="Kanter"
      description="Border-tiere — resten av flatene er kantløse på hvit bunn; kun disse rollene bruker synlig border."
    >
      <SwatchGrid items={BORDER_TOKENS} />
    </PreviewSection>
  );
}

// ── Semantiske farger ───────────────────────────────────────────────────

const SEMANTIC_TOKENS: SwatchItem[] = [
  {
    tileClassName: 'bg-primary',
    token: 'bg-primary · text-primary-foreground',
    label: 'Primary (asurblå)',
    content: <span className="text-sm font-medium text-primary-foreground">Aa</span>,
  },
  {
    tileClassName: 'bg-primary-subtle border border-border-subtle',
    token: 'bg-primary-subtle · text-primary',
    label: 'Primary subtle',
    content: <span className="text-sm font-medium text-primary">Aa</span>,
  },
  {
    tileClassName: 'bg-success',
    token: 'bg-success · text-success-foreground',
    label: 'Success (jade)',
    content: <span className="text-sm font-medium text-success-foreground">Aa</span>,
  },
  {
    tileClassName: 'bg-success-subtle border border-border-subtle',
    token: 'bg-success-subtle · text-success',
    label: 'Success subtle',
    content: <span className="text-sm font-medium text-success">Aa</span>,
  },
  {
    tileClassName: 'bg-warning',
    token: 'bg-warning · text-warning-foreground',
    label: 'Warning (amber)',
    content: <span className="text-sm font-medium text-warning-foreground">Aa</span>,
  },
  {
    tileClassName: 'bg-warning-subtle border border-border-subtle',
    token: 'bg-warning-subtle · text-warning',
    label: 'Warning subtle',
    content: <span className="text-sm font-medium text-warning">Aa</span>,
  },
  {
    tileClassName: 'bg-danger',
    token: 'bg-danger · text-danger-foreground',
    label: 'Danger / destructive (rød)',
    content: <span className="text-sm font-medium text-danger-foreground">Aa</span>,
  },
  {
    tileClassName: 'bg-danger-subtle border border-border-subtle',
    token: 'bg-danger-subtle · text-danger',
    label: 'Danger subtle',
    content: <span className="text-sm font-medium text-danger">Aa</span>,
  },
  {
    tileClassName: 'bg-info',
    token: 'bg-info · text-info-foreground',
    label: 'Info (blå)',
    content: <span className="text-sm font-medium text-info-foreground">Aa</span>,
  },
  {
    tileClassName: 'bg-info-subtle border border-border-subtle',
    token: 'bg-info-subtle · text-info',
    label: 'Info subtle',
    content: <span className="text-sm font-medium text-info">Aa</span>,
  },
];

function SemantiskeFargerSection() {
  return (
    <PreviewSection
      label="Semantiske farger"
      description="Solid + subtle par per familie — samme fyll/tekst-kombinasjon som Badge- og Button-variantene bruker."
    >
      <SwatchGrid items={SEMANTIC_TOKENS} />
    </PreviewSection>
  );
}

// ── Radius og skygge ────────────────────────────────────────────────────

interface RadiusTile {
  className: string;
  token: string;
  meta: string;
}

const RADIUS_TILES: RadiusTile[] = [
  { className: 'rounded-sm', token: 'rounded-sm', meta: '4px — tette chips, mini-thumbs' },
  { className: 'rounded-md', token: 'rounded-md', meta: '6px — kompakte kontroller' },
  { className: 'rounded-lg', token: 'rounded-lg', meta: '8px — listerader, merker, bilde-thumbs' },
  { className: 'rounded-xl', token: 'rounded-xl', meta: '10px — kort, paneler, dialoger (kort-radiusen)' },
  { className: 'rounded-2xl', token: 'rounded-2xl', meta: '12px — store flater, booking-/checkout-kort' },
  { className: 'rounded-3xl', token: 'rounded-3xl', meta: '16px — store marketing-bånd' },
];

function RadiusOgSkyggeSection() {
  return (
    <PreviewSection
      label="Radius og skygge"
      description="Systemet er ellers flatt (hvit-på-hvit + border) — shadow-soft er reservert for flytende fokus-flater."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {RADIUS_TILES.map((tile) => (
          <div key={tile.token} className="space-y-1.5">
            <div
              className={cn(
                'flex h-20 items-center justify-center border border-border-subtle bg-surface',
                tile.className,
              )}
            />
            <div className="space-y-0.5">
              <p className="font-mono text-xs text-foreground-muted">{tile.token}</p>
              <p className="text-xs text-foreground-subtle">{tile.meta}</p>
            </div>
          </div>
        ))}
        <div className="space-y-1.5">
          <div className="h-20 rounded-xl bg-surface shadow-soft" />
          <div className="space-y-0.5">
            <p className="font-mono text-xs text-foreground-muted">shadow-soft</p>
            <p className="text-xs text-foreground-subtle">Booking-rail, checkout-sammendrag, kvittering</p>
          </div>
        </div>
      </div>
    </PreviewSection>
  );
}

// ── Typografi ───────────────────────────────────────────────────────────

interface TypeStep {
  className: string;
  token: string;
  sample: string;
  meta: string;
}

const TYPE_SCALE: TypeStep[] = [
  { className: 'text-xs', token: 'text-xs', sample: '12 av 14 påmeldte', meta: '12 / 16 — captions, KPI-etiketter, chips' },
  { className: 'text-sm', token: 'text-sm', sample: 'Torsdag kl. 18:00 · Yin Yoga', meta: '14 / 20 — meta, etiketter, kontroller' },
  { className: 'text-base', token: 'text-base', sample: 'Åpen klasse for alle nivåer.', meta: '16 / 24 — app-brødtekst (standard)' },
  { className: 'text-lg', token: 'text-lg', sample: 'Bekreft avbestilling', meta: '18 / 28 — ingress, overskrifter på juridiske sider' },
  { className: 'text-xl', token: 'text-xl', sample: 'Kommende kurskvelder', meta: '20 / 28 — h3, store kort-titler' },
  { className: 'text-2xl', token: 'text-2xl', sample: 'Innstillinger', meta: '24 / 30 — h2, sidetitler' },
  { className: 'text-3xl', token: 'text-3xl', sample: '42 800 kr', meta: '30 / 36 — h1, dashboard-hero' },
  { className: 'text-4xl', token: 'text-4xl', sample: 'Finn ditt neste kurs', meta: '36 / 44 — offentlig h1, mobil display' },
  { className: 'text-5xl', token: 'text-5xl', sample: 'Yoga for alle', meta: '48 / 52 — display, én per landingsside-hero' },
];

function TypografiSection() {
  return (
    <PreviewSection
      label="Typografi"
      description="Type-skalaen (Studio canonical) — størrelse, linjehøyde og letter-spacing er del av tokenet; ikke legg tracking-* oppå."
    >
      <div className="divide-y divide-border-subtle rounded-xl border border-border-subtle bg-surface px-5">
        {TYPE_SCALE.map((step) => (
          <div key={step.token} className="space-y-1 py-5">
            <p className={cn(step.className, 'text-foreground')}>{step.sample}</p>
            <p className="font-mono text-xs text-foreground-muted">
              {step.token} <span className="text-foreground-subtle">— {step.meta}</span>
            </p>
          </div>
        ))}
      </div>
    </PreviewSection>
  );
}

export default function TokensPreview() {
  return (
    <DevPage
      title="Design tokens"
      description="Live referanse for de semantiske tokenene i src/index.css — ekte Tailwind-utility-klasser, ingen hardkodede farger. Tilpasser seg automatisk lys/mørk modus."
    >
      <OverflaterSection />
      <TekstSection />
      <KanterSection />
      <SemantiskeFargerSection />
      <RadiusOgSkyggeSection />
      <TypografiSection />
    </DevPage>
  );
}

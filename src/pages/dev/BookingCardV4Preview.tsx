import { useState } from 'react';
import { Calendar, Clock, Users } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { calculateServiceFee, calculateTotalPrice } from '@/lib/pricing';
import { formatKroner, cn } from '@/lib/utils';

/**
 * Prototype v4 — informative, not marketing.
 *
 * Direction correction: no price hero, no salesy perks, no urgency pressure.
 * Calm and factual — the buyer gets the facts they need to decide (when, scope,
 * spots), price stated plainly near the action, normal Reserver button.
 * Setup: OpenTable/Beli icon-labeled fact rows + Care.com ticket toggle. Our
 * theme — neutral segmented toggle (no dark pill), indigo only on the CTA.
 */

type Variant = 'two' | 'one' | 'free' | 'soldout';

interface Ticket {
  label: string;
  amount: number;
  /** Factual scope line — what the ticket covers. */
  scope: string;
}

function ticketFor(variant: Variant, mode: 'package' | 'dropin'): Ticket {
  if (variant === 'free') return { label: 'Enkelttime', amount: 0, scope: 'Én time · 60 min' };
  if (variant === 'two') {
    return mode === 'package'
      ? { label: 'Hele kurspakken', amount: 2000, scope: '8 ganger · 60 min per gang' }
      : { label: 'Drop-in', amount: 500, scope: 'Én enkelt time · 60 min' };
  }
  return { label: 'Hele kurset', amount: 1500, scope: '3 dager · 60 min per dag' };
}

// Neutral segmented toggle — calm, in-theme (no dark pill).
function TicketToggle({ mode, onChange }: { mode: 'package' | 'dropin'; onChange: (m: 'package' | 'dropin') => void }) {
  return (
    <div role="radiogroup" aria-label="Velg billett" className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
      {(['package', 'dropin'] as const).map((m) => {
        const selected = mode === m;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(m)}
            className={cn(
              'rounded-full px-3 py-2 text-sm font-medium transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
              selected ? 'bg-surface text-foreground shadow-xs' : 'text-foreground-muted hover:text-foreground',
            )}
          >
            {m === 'package' ? 'Kurspakke' : 'Drop-in'}
          </button>
        );
      })}
    </div>
  );
}

function Fact({ icon: Icon, children }: { icon: typeof Calendar; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <Icon className="size-4 shrink-0 text-foreground-muted" strokeWidth={1.75} />
      <span className="text-foreground">{children}</span>
    </div>
  );
}

function BookingCardV4({ variant }: { variant: Variant }) {
  const [mode, setMode] = useState<'package' | 'dropin'>('package');
  const ticket = ticketFor(variant, mode);
  const fee = ticket.amount > 0 ? calculateServiceFee(ticket.amount) : 0;
  const total = ticket.amount > 0 ? calculateTotalPrice(ticket.amount) : 0;

  if (variant === 'soldout') {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
        <div className="space-y-3">
          <p className="text-base font-medium text-foreground">Fullt</p>
          <p className="text-sm text-foreground-muted">Alle plasser på dette kurset er tatt.</p>
          <Button variant="outline" size="cta" className="mt-2 w-full">Se andre kurs</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
      <div className="space-y-5">
        {variant === 'two' && <TicketToggle mode={mode} onChange={setMode} />}

        {/* Facts — what, when, scope, availability (OpenTable idiom) */}
        <div className="space-y-3">
          {variant !== 'two' && <p className="text-base font-medium text-foreground">{ticket.label}</p>}
          <Fact icon={Calendar}>I morgen · 06:15–07:00</Fact>
          <Fact icon={Clock}>{ticket.scope}</Fact>
          <Fact icon={Users}>3 av 12 plasser igjen</Fact>
        </div>

        {/* Price — stated plainly, not a hero */}
        <div className="space-y-2 border-t border-border pt-4">
          {ticket.amount > 0 ? (
            <>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-foreground-muted">Pris</span>
                <span className="tabular-nums text-foreground">{formatKroner(ticket.amount)}</span>
              </div>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-foreground-muted">Tjenestegebyr</span>
                <span className="tabular-nums text-foreground-muted">{formatKroner(fee)}</span>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-base font-medium text-foreground">Totalt</span>
                <span className="text-base font-medium tabular-nums text-foreground">{formatKroner(total)}</span>
              </div>
            </>
          ) : (
            <div className="flex items-baseline justify-between">
              <span className="text-base font-medium text-foreground">Pris</span>
              <span className="text-base font-medium text-foreground">Gratis</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Button size="cta" className="w-full">{ticket.amount > 0 ? 'Reserver' : 'Meld meg på'}</Button>
          <p className="text-center text-xs text-foreground-muted">
            {ticket.amount > 0 ? 'Du blir ikke belastet ennå' : 'Gratis påmelding'}
          </p>
        </div>
      </div>
    </div>
  );
}

function Rail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="w-[360px] max-w-full">{children}</div>
    </div>
  );
}

const BookingCardV4Preview = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-40 border-b border-border bg-surface-elevated backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Badge variant="neutral" shape="pill" size="sm">Booking card v4</Badge>
          <span className="text-sm text-foreground-muted">Informativ, rolig — ikke markedsføring, ingen pris-hero</span>
          <span className="ml-auto text-xs text-foreground-muted">/dev/booking-card-4</span>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
        <p className="max-w-2xl text-sm leading-relaxed text-foreground-muted">
          Retningskorreksjon: ingen pris-hero, ingen salgsfordeler, ingen hastverk.
          Rolig og faktabasert — kjøperen får det hen trenger for å bestemme seg (når,
          omfang, plasser), prisen står nøkternt rett over knappen. Toggle (Care.com) +
          fakta-rader (OpenTable), i vårt tema.
        </p>
        <div className="flex flex-wrap gap-8">
          <Rail label="To billett-typer (toggle)"><BookingCardV4 variant="two" /></Rail>
          <Rail label="Én type"><BookingCardV4 variant="one" /></Rail>
          <Rail label="Gratis"><BookingCardV4 variant="free" /></Rail>
          <Rail label="Fullt"><BookingCardV4 variant="soldout" /></Rail>
        </div>
      </div>
    </div>
  );
};

export default BookingCardV4Preview;

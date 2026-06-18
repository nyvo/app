import { useState } from 'react';
import { Calendar, Check } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { calculateServiceFee, calculateTotalPrice } from '@/lib/pricing';
import { formatKroner, cn } from '@/lib/utils';

/**
 * Prototype v3 — booking card, second Mobbin pass.
 *
 * What v2 missed (the strong booking cards all do these):
 *  - SELL the ticket with value perks + checkmarks (Expedia "Free cancellation /
 *    no fees", Klook perk chips) — not just a price.
 *  - Put the TOTAL inside the CTA bar (Zomato "₹1599 TOTAL · Pay Now", Careem
 *    total-left/Next-right, Open "Confirm · 1 Credit", Kiwi "Continue for $686").
 *  - Reassurance/urgency (OpenTable hold timer, free cancellation, spots-left).
 * Ticket type stays a Care.com segmented toggle. Our tokens only.
 */

type Variant = 'two' | 'one' | 'free' | 'soldout';

interface Ticket {
  label: string;
  sub: string | null;
  amount: number;
  perks: string[];
}

function ticketFor(variant: Variant, mode: 'package' | 'dropin'): Ticket {
  if (variant === 'free') {
    return { label: 'Enkelttime', sub: 'Én time', amount: 0, perks: ['Ingen betaling', 'Reserver plassen din'] };
  }
  if (variant === 'two') {
    return mode === 'package'
      ? { label: 'Hele kurspakken', sub: '8 uker', amount: 2000, perks: ['Alle 8 timene inkludert', 'Fast plass hver uke', 'Spar 2 000 kr vs. drop-in'] }
      : { label: 'Drop-in', sub: 'Én time', amount: 500, perks: ['Én enkelt time', 'Ingen binding'] };
  }
  return { label: 'Hele kurset', sub: '3 dager', amount: 1500, perks: ['Alle 3 dagene inkludert', 'Fast plass'] };
}

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
              selected ? 'bg-foreground text-background shadow-xs' : 'text-foreground-muted hover:text-foreground',
            )}
          >
            {m === 'package' ? 'Kurspakke' : 'Drop-in'}
          </button>
        );
      })}
    </div>
  );
}

function BookingCardV3({ variant }: { variant: Variant }) {
  const [mode, setMode] = useState<'package' | 'dropin'>('package');
  const ticket = ticketFor(variant, mode);
  const fee = ticket.amount > 0 ? calculateServiceFee(ticket.amount) : 0;
  const total = ticket.amount > 0 ? calculateTotalPrice(ticket.amount) : 0;

  if (variant === 'soldout') {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
        <div className="space-y-4 text-center">
          <Badge variant="neutral" shape="pill" size="sm">Fullt</Badge>
          <p className="text-base font-medium text-foreground">Alle plasser er tatt</p>
          <Button variant="outline" size="cta" className="w-full">Se andre kurs</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
      <div className="space-y-5">
        {variant === 'two' && <TicketToggle mode={mode} onChange={setMode} />}

        {/* Ticket — name + value perks (the part v2 was missing) */}
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-lg font-medium text-foreground">{ticket.label}</p>
            {ticket.sub && <p className="shrink-0 text-sm text-foreground-muted">{ticket.sub}</p>}
          </div>
          <ul className="space-y-2">
            {ticket.perks.map((p) => (
              <li key={p} className="flex items-center gap-2.5 text-sm text-foreground">
                <Check className="size-4 shrink-0 text-primary" strokeWidth={2.25} />
                {p}
              </li>
            ))}
          </ul>
        </div>

        {/* Schedule + urgency */}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
          <span className="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
            <Calendar className="size-4 shrink-0 text-foreground-muted" strokeWidth={1.75} />
            <span className="truncate">I morgen · 06:15–07:00</span>
          </span>
          <Badge variant="warning" shape="pill" size="sm">3 igjen</Badge>
        </div>

        {/* CTA — total lives in the button (Zomato / Open / Kiwi) */}
        <div className="space-y-2">
          {ticket.amount > 0 ? (
            <>
              <Button size="cta" className="w-full justify-between">
                <span>Reserver</span>
                <span className="tabular-nums">{formatKroner(total)}</span>
              </Button>
              <p className="text-center text-xs text-foreground-muted">
                Inkl. {formatKroner(fee)} gebyr · du belastes ikke ennå
              </p>
            </>
          ) : (
            <>
              <Button size="cta" className="w-full">Meld meg på</Button>
              <p className="text-center text-xs text-foreground-muted">Gratis · ingen betaling</p>
            </>
          )}
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

const BookingCardV3Preview = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-40 border-b border-border bg-surface-elevated backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Badge variant="neutral" shape="pill" size="sm">Booking card v3</Badge>
          <span className="text-sm text-foreground-muted">Perks + total-i-knappen (Expedia · Zomato · Open)</span>
          <span className="ml-auto text-xs text-foreground-muted">/dev/booking-card-3</span>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
        <p className="max-w-2xl text-sm leading-relaxed text-foreground-muted">
          Andre Mobbin-runde. Billetten <strong className="font-medium text-foreground">selges med
          fordeler</strong> (Expedia/Klook), <strong className="font-medium text-foreground">totalen
          ligger i knappen</strong> (Zomato/Open/Kiwi), og plasser-igjen gir hastverk
          (OpenTable). Det v2 manglet: verdi og handlekraft — ikke bare pris + knapp.
        </p>
        <div className="flex flex-wrap gap-8">
          <Rail label="To billett-typer (toggle)"><BookingCardV3 variant="two" /></Rail>
          <Rail label="Én type"><BookingCardV3 variant="one" /></Rail>
          <Rail label="Gratis"><BookingCardV3 variant="free" /></Rail>
          <Rail label="Fullt"><BookingCardV3 variant="soldout" /></Rail>
        </div>
      </div>
    </div>
  );
};

export default BookingCardV3Preview;

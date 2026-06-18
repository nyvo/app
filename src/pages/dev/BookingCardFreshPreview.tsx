import { useState } from 'react';
import { Calendar, Lock } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { calculateServiceFee, calculateTotalPrice } from '@/lib/pricing';
import { formatKroner, cn } from '@/lib/utils';

/**
 * Prototype — booking card rebuilt FROM SCRATCH.
 *
 * Setup copied from Mobbin, re-themed with our tokens — NOT a re-skin of the
 * current card:
 *  - Airbnb reservation card: PRICE leads big → selector → reserve → "you won't
 *    be charged yet" → breakdown under the button.
 *  - Care.com: segmented ticket toggle, dark-selected.
 *  - Open / ClassPass iOS: premium, quiet, price is the hero.
 *
 * Differences from today's card: leads with the price (not a "Når" label), one
 * dark segmented toggle (not two radio tiles), the schedule is a filled chip,
 * and the breakdown is fee + total only (the ticket price is the hero, shown
 * once).
 */

type Variant = 'two' | 'one' | 'free' | 'soldout';

interface Ticket {
  label: string;
  sub: string | null;
  amount: number;
}

function ticketFor(variant: Variant, mode: 'package' | 'dropin'): Ticket {
  if (variant === 'free') return { label: 'Enkelttime', sub: 'Én time', amount: 0 };
  if (variant === 'two') {
    return mode === 'package'
      ? { label: 'Hele kurspakken', sub: '8 uker', amount: 2000 }
      : { label: 'Drop-in', sub: 'Én time', amount: 500 };
  }
  return { label: 'Hele kurset', sub: '3 dager', amount: 1500 };
}

// Dark-selected segmented toggle (Care.com idiom, our foreground/muted tokens).
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

function BookingCardFresh({ variant }: { variant: Variant }) {
  const [mode, setMode] = useState<'package' | 'dropin'>('package');
  const ticket = ticketFor(variant, mode);
  const fee = ticket.amount > 0 ? calculateServiceFee(ticket.amount) : 0;
  const total = ticket.amount > 0 ? calculateTotalPrice(ticket.amount) : 0;
  const soldOut = variant === 'soldout';

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
      {soldOut ? (
        <div className="space-y-4 text-center">
          <p className="text-2xl font-medium text-foreground">Fullt</p>
          <p className="text-sm text-foreground-muted">Dette kurset er fullbooket.</p>
          <Button variant="outline" size="cta" className="w-full">Se andre kurs</Button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* 1 — ticket toggle (only with a real choice) */}
          {variant === 'two' && <TicketToggle mode={mode} onChange={setMode} />}

          {/* 2 — price hero (leads, Airbnb-style) */}
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-medium tabular-nums tracking-tight text-foreground">
                {ticket.amount > 0 ? formatKroner(ticket.amount) : 'Gratis'}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-foreground-muted">{ticket.label}{ticket.sub ? ` · ${ticket.sub}` : ''}</p>
          </div>

          {/* 3 — schedule chip */}
          <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-4 py-3">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
              <Calendar className="size-4 text-foreground-muted" strokeWidth={1.75} />
              I morgen · 06:15–07:00
            </span>
            <Badge variant="warning" shape="pill" size="sm">3 igjen</Badge>
          </div>

          {/* 4 — CTA */}
          <Button size="cta" className="w-full">{ticket.amount > 0 ? 'Reserver' : 'Meld meg på'}</Button>

          {/* 5 — reassurance */}
          <p className="text-center text-xs text-foreground-muted">Du blir ikke belastet ennå</p>

          {/* 6 — breakdown (fee + total only; ticket price is the hero) */}
          {ticket.amount > 0 && (
            <div className="space-y-2.5 border-t border-border pt-4">
              {fee > 0 && (
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-foreground-muted">Tjenestegebyr</span>
                  <span className="tabular-nums text-foreground-muted">{formatKroner(fee)}</span>
                </div>
              )}
              <div className="flex items-baseline justify-between">
                <span className="text-base font-medium text-foreground">Totalt</span>
                <span className="text-base font-medium tabular-nums text-foreground">{formatKroner(total)}</span>
              </div>
            </div>
          )}

          {/* 7 — secure note */}
          {ticket.amount > 0 && (
            <p className="flex items-center justify-center gap-1.5 text-xs text-foreground-disabled">
              <Lock className="size-3" strokeWidth={2} /> Sikker betaling med Dintero
            </p>
          )}
        </div>
      )}
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

const BookingCardFreshPreview = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-40 border-b border-border bg-surface-elevated backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Badge variant="neutral" shape="pill" size="sm">Booking card v2</Badge>
          <span className="text-sm text-foreground-muted">Fra scratch — oppsett: Airbnb + Care.com, våre tokens</span>
          <span className="ml-auto text-xs text-foreground-muted">/dev/booking-card-2</span>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
        <p className="max-w-2xl text-sm leading-relaxed text-foreground-muted">
          Bygget på nytt. Prisen leder (Airbnb), billett-typen er en mørk segmentert
          toggle (Care.com), timeplanen er en chip, «Du blir ikke belastet ennå» gir
          trygghet, og oppsummeringen viser kun gebyr + total. Ingen gjenbruk av det
          gamle kortets oppsett — kun våre tokens.
        </p>
        <div className="flex flex-wrap gap-8">
          <Rail label="To billett-typer (toggle)"><BookingCardFresh variant="two" /></Rail>
          <Rail label="Én type"><BookingCardFresh variant="one" /></Rail>
          <Rail label="Gratis"><BookingCardFresh variant="free" /></Rail>
          <Rail label="Fullt"><BookingCardFresh variant="soldout" /></Rail>
        </div>
      </div>
    </div>
  );
};

export default BookingCardFreshPreview;

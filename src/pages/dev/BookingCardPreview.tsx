import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DinteroPaymentBadge } from '@/components/public/DinteroPaymentBadge';
import { calculateServiceFee, calculateTotalPrice } from '@/lib/pricing';
import { formatKroner, cn } from '@/lib/utils';

/**
 * Prototype — redesigned booking card for the course-detail rail.
 *
 * Grounded in Mobbin (Care.com, Time2book, Eventbrite, Posh): a **segmented
 * toggle** picks the ticket type, then the purchasable ticket sits below it,
 * then a slim summary + CTA. Fixes the current card's problems: the ticket no
 * longer appears twice (radio row AND breakdown line), one clean choice control
 * instead of two stacked selectable cards, and a clear hierarchy
 * (choose → ticket → total → reserve). All design-system tokens.
 */

// ── Segmented control (neutral — indigo stays on the CTA) ────────────────────

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Velg billett"
      className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1"
    >
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={cn(
              'rounded-full px-3 py-2 text-sm font-medium transition-colors duration-150 ease-out',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
              selected
                ? 'bg-surface text-foreground shadow-xs'
                : 'text-foreground-muted hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── New booking card ─────────────────────────────────────────────────────────

type Variant = 'two' | 'one' | 'free' | 'lowstock' | 'soldout';

interface Ticket {
  label: string;
  sub: string | null;
  amount: number;
}

function ticketFor(variant: Variant, mode: 'package' | 'dropin'): Ticket {
  if (variant === 'free') return { label: 'Enkelttime', sub: null, amount: 0 };
  if (variant === 'two') {
    return mode === 'package'
      ? { label: 'Hele kurspakken', sub: '8 uker', amount: 2000 }
      : { label: 'Drop-in', sub: 'I morgen · 06:15', amount: 500 };
  }
  return { label: 'Hele kurset', sub: '3 dager', amount: 1500 };
}

function BookingCard({ variant }: { variant: Variant }) {
  const [mode, setMode] = useState<'package' | 'dropin'>('package');
  const ticket = ticketFor(variant, mode);

  const fee = ticket.amount > 0 ? calculateServiceFee(ticket.amount) : 0;
  const total = ticket.amount > 0 ? calculateTotalPrice(ticket.amount) : 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
      <div className="space-y-5 p-6">
        {/* When + spots */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">Når</p>
            <p className="mt-1 text-base font-medium tabular-nums text-foreground">I morgen · 06:15–07:00</p>
          </div>
          {variant === 'lowstock' && (
            <Badge variant="warning" shape="pill" size="sm">3 plasser igjen</Badge>
          )}
        </div>

        {variant === 'soldout' ? (
          <div className="space-y-1 rounded-xl bg-muted px-4 py-6 text-center">
            <p className="text-base font-medium text-foreground">Kurset er fullt</p>
            <p className="text-sm text-foreground-muted underline decoration-foreground-disabled underline-offset-2">
              Se andre kurs fra Kristoffer Yoga
            </p>
          </div>
        ) : (
          <>
            {/* Choice — segmented toggle, only when there are two types */}
            {variant === 'two' && (
              <Segmented
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'package', label: 'Kurspakke' },
                  { value: 'dropin', label: 'Drop-in' },
                ]}
              />
            )}

            {/* The ticket you're buying — label + sub + its price, once */}
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-medium text-foreground">{ticket.label}</p>
                  {ticket.sub && <p className="mt-0.5 text-sm text-foreground-muted">{ticket.sub}</p>}
                </div>
                <span className="shrink-0 text-base font-medium tabular-nums text-foreground">
                  {ticket.amount > 0 ? formatKroner(ticket.amount) : 'Gratis'}
                </span>
              </div>
            </div>

            {/* Summary — fee + total only (no repeated ticket line) */}
            {ticket.amount > 0 && (
              <dl className="space-y-2.5">
                {fee > 0 && (
                  <div className="flex items-baseline justify-between text-sm">
                    <dt className="text-foreground-muted">Tjenestegebyr</dt>
                    <dd className="tabular-nums text-foreground-muted">{formatKroner(fee)}</dd>
                  </div>
                )}
                <div className="flex items-baseline justify-between border-t border-border pt-3">
                  <dt className="text-base font-medium text-foreground">Totalt</dt>
                  <dd className="text-xl font-medium tabular-nums text-foreground">{formatKroner(total)}</dd>
                </div>
              </dl>
            )}

            <Button size="cta" className="w-full">Reserver</Button>

            {ticket.amount > 0 && (
              <div className="space-y-2 border-t border-border pt-4">
                <p className="text-center text-xs text-foreground-muted">Sikker betaling</p>
                <DinteroPaymentBadge variant="logomark" className="mx-auto w-full max-w-[280px]" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Current card replica (for the before/after) ──────────────────────────────

function OldRadioRow({ selected, label, sub, price }: { selected?: boolean; label: string; sub: string; price: string }) {
  return (
    <div className={cn('w-full rounded-xl border px-3.5 py-2.5', selected ? 'border-primary bg-selection-light' : 'border-border')}>
      <div className="flex items-center gap-3">
        <span className={cn('flex size-[18px] shrink-0 items-center justify-center rounded-full border-2', selected ? 'border-primary' : 'border-input')}>
          {selected && <span className="size-2 rounded-full bg-primary" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-medium text-foreground">{label}</p>
          <p className="truncate text-xs text-foreground-muted">{sub}</p>
        </div>
        <span className="shrink-0 text-base font-medium tabular-nums text-foreground">{price}</span>
      </div>
    </div>
  );
}

function OldCardReplica() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
      <div className="space-y-5 p-6">
        <div>
          <p className="text-xs text-foreground-muted">Når</p>
          <p className="mt-0.5 text-base font-medium tabular-nums text-foreground">I morgen · 06:15–07:00</p>
        </div>
        <div className="space-y-2">
          <OldRadioRow selected label="Kurspakke" sub="4 uker igjen" price="2 000 kr" />
          <OldRadioRow label="Drop-in" sub="I morgen · 06:15" price="500 kr" />
        </div>
        <dl className="space-y-2.5">
          <div className="flex items-baseline justify-between text-base"><dt className="text-foreground-muted">Kurspakke</dt><dd className="tabular-nums text-foreground">2 000 kr</dd></div>
          <div className="flex items-baseline justify-between text-base"><dt className="text-foreground-muted">Tjenestegebyr</dt><dd className="tabular-nums text-foreground-muted">100 kr</dd></div>
          <div className="flex items-baseline justify-between border-t border-border pt-3"><dt className="text-base font-medium text-foreground">Totalt</dt><dd className="text-xl font-medium tabular-nums text-foreground">2 100 kr</dd></div>
        </dl>
        <Button size="cta" className="w-full">Reserver</Button>
        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-center text-xs text-foreground-muted">Sikker betaling</p>
          <DinteroPaymentBadge variant="logomark" className="mx-auto w-full max-w-[280px]" />
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

function Rail({ label, sublabel, children }: { label: string; sublabel?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {sublabel && <span className="text-xs text-foreground-muted">{sublabel}</span>}
      </div>
      <div className="w-[360px] max-w-full">{children}</div>
    </div>
  );
}

const BookingCardPreview = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-40 border-b border-border bg-surface-elevated backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Badge variant="neutral" shape="pill" size="sm">Booking card</Badge>
          <span className="text-sm text-foreground-muted">Care.com-mønster: toggle → billett → total</span>
          <span className="ml-auto text-xs text-foreground-muted">/dev/booking-card</span>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
        {/* Before / after */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-foreground">Før → etter (to billett-typer)</h2>
          <div className="flex flex-wrap gap-8">
            <Rail label="Nå" sublabel="billett vises to ganger, to kort">
              <OldCardReplica />
            </Rail>
            <Rail label="Forslag" sublabel="toggle → billett → total">
              <BookingCard variant="two" />
            </Rail>
          </div>
        </section>

        {/* New card — states */}
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-foreground">Nye kort — tilstander</h2>
          <div className="flex flex-wrap gap-8">
            <Rail label="Én billett-type"><BookingCard variant="one" /></Rail>
            <Rail label="Gratis"><BookingCard variant="free" /></Rail>
            <Rail label="Få plasser"><BookingCard variant="lowstock" /></Rail>
            <Rail label="Fullt"><BookingCard variant="soldout" /></Rail>
          </div>
        </section>
      </div>
    </div>
  );
};

export default BookingCardPreview;

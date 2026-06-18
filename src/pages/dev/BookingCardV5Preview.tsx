import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/**
 * Prototype v5 — Care.com structure, flat on the canvas.
 *
 *  - Each ticket type is an option (info left, price + "Velg" right). NO box
 *    around each option, NO outer card — it sits on the canvas.
 *  - More than one option (drop-in dates) → separated by a divider, not boxes.
 *  - No total summary on the card; step 1 is just the choice.
 */

const DATES = [
  { wd: 'Tirsdag', d: 16, mo: 'jun' },
  { wd: 'Tirsdag', d: 23, mo: 'jun' },
  { wd: 'Tirsdag', d: 30, mo: 'jun' },
  { wd: 'Tirsdag', d: 7, mo: 'jul' },
  { wd: 'Tirsdag', d: 14, mo: 'jul' },
  { wd: 'Tirsdag', d: 21, mo: 'jul' },
  { wd: 'Tirsdag', d: 28, mo: 'jul' },
  { wd: 'Tirsdag', d: 4, mo: 'aug' },
];
const TIME = '06:15–07:00';
const CLASS_NAME = 'Morgenyoga';
const fmt = (i: number) => `${DATES[i].wd} ${DATES[i].d}. ${DATES[i].mo}`;

type Variant = 'two' | 'one' | 'free' | 'soldout';

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

/** A bare option row — no box. Info left, price + Velg right. */
function Option({
  title,
  inlineTime,
  timeNote,
  dates,
  onSeeAll,
  price,
  free,
  align = 'start',
  dense = false,
}: {
  title: string;
  inlineTime?: string;
  timeNote?: string;
  dates?: number[];
  onSeeAll?: () => void;
  price?: string;
  free?: boolean;
  align?: 'start' | 'center';
  dense?: boolean;
}) {
  return (
    <div className={cn('flex justify-between gap-4', align === 'center' ? 'items-center' : 'items-start')}>
      <div className="min-w-0">
        <p
          className={cn(
            'flex flex-wrap items-baseline gap-x-2 text-foreground',
            dense ? 'text-sm' : 'text-base font-medium',
          )}
        >
          <span>{title}</span>
          {inlineTime && (
            <span className="text-sm font-normal tabular-nums text-foreground-muted">{inlineTime}</span>
          )}
        </p>
        {timeNote && <p className="mt-0.5 text-sm tabular-nums text-foreground-muted">{timeNote}</p>}
        {dates && (
          <ul className="mt-2 space-y-1.5 text-sm text-foreground">
            {dates.map((i) => (
              <li key={i} className="flex items-baseline gap-x-2">
                <span>{fmt(i)}</span>
                <span className="tabular-nums text-foreground-muted">{TIME}</span>
              </li>
            ))}
          </ul>
        )}
        {onSeeAll && (
          <button onClick={onSeeAll} className="mt-2 text-sm font-medium text-primary underline">
            Se alle {DATES.length} datoer
          </button>
        )}
      </div>
      <div className="flex w-20 shrink-0 flex-col items-stretch gap-2">
        <span className="text-center text-sm font-medium tabular-nums text-foreground">{free ? 'Gratis' : price}</span>
        <Button size="default" className="w-full">Velg</Button>
      </div>
    </div>
  );
}

function AllDatesDialog({ open, onOpenChange, selectable }: { open: boolean; onOpenChange: (o: boolean) => void; selectable: boolean }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{selectable ? 'Velg dato' : 'Alle datoer'}</DialogTitle>
        </DialogHeader>
        <ul className="divide-y divide-border">
          {DATES.map((_, i) => (
            <li key={i} className="flex items-center justify-between gap-3 py-3 text-sm text-foreground first:pt-0 last:pb-0">
              <span className="flex items-baseline gap-3">
                <span className="font-medium">{fmt(i)}</span>
                <span className="tabular-nums text-foreground-muted">{TIME}</span>
              </span>
              {selectable && <Button size="default" className="px-4" onClick={() => onOpenChange(false)}>Velg</Button>}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function BookingCardV5({ variant }: { variant: Variant }) {
  const [mode, setMode] = useState<'package' | 'dropin'>('package');
  const [modalOpen, setModalOpen] = useState(false);

  if (variant === 'soldout') {
    return (
      <div className="space-y-3">
        <h3 className="text-lg font-medium text-foreground">Fullt</h3>
        <p className="text-sm text-foreground-muted">Alle plasser på dette kurset er tatt.</p>
        <Button variant="outline" size="cta" className="mt-1 w-full">Se andre kurs</Button>
      </div>
    );
  }

  const isDropin = variant === 'two' && mode === 'dropin';

  return (
    <div>
      <div className="space-y-5">
        <h3 className="text-lg font-medium text-foreground">Velg kurstype</h3>

        {variant === 'two' && <TicketToggle mode={mode} onChange={setMode} />}

        {variant === 'free' ? (
          <Option title={CLASS_NAME} timeNote={`${fmt(0)}, kl. ${TIME}`} free />
        ) : isDropin ? (
          <div>
            <div className="divide-y divide-border">
              {[0, 1, 2].map((i) => (
                <div key={i} className="py-4 first:pt-0">
                  <Option title={fmt(i)} inlineTime={TIME} price="500 kr" align="center" dense />
                </div>
              ))}
            </div>
            <button onClick={() => setModalOpen(true)} className="mt-3 text-sm font-medium text-primary underline">
              Se alle {DATES.length} datoer
            </button>
          </div>
        ) : (
          <Option
            title={CLASS_NAME}
            dates={[0, 1, 2]}
            onSeeAll={() => setModalOpen(true)}
            price={variant === 'one' ? '1 500 kr' : '2 000 kr'}
          />
        )}
      </div>

      <AllDatesDialog open={modalOpen} onOpenChange={setModalOpen} selectable={isDropin} />
    </div>
  );
}

/** Preview frame — a plain canvas panel (NOT the booking card) so each variant
 * is visible; the booking content inside sits flat on it. */
function Rail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="w-[360px] max-w-full rounded-xl border border-dashed border-border-subtle p-6">{children}</div>
    </div>
  );
}

const BookingCardV5Preview = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-40 border-b border-border bg-surface-elevated backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Badge variant="neutral" shape="pill" size="sm">Booking card v5</Badge>
          <span className="text-sm text-foreground-muted">Flat på canvas — ingen bokser, divider mellom flere</span>
          <span className="ml-auto text-xs text-foreground-muted">/dev/booking-card-5</span>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
        <p className="max-w-2xl text-sm leading-relaxed text-foreground-muted">
          Ingen kort rundt hvert valg — innholdet sitter på canvas. Flere valg (drop-in
          per dato) skilles med en divider, ikke egne bokser. Den stiplede rammen under
          er bare for å vise raden i previewet (ikke en del av designet).
        </p>
        <div className="flex flex-wrap gap-8">
          <Rail label="Kursrekke + drop-in (toggle)"><BookingCardV5 variant="two" /></Rail>
          <Rail label="Én serie"><BookingCardV5 variant="one" /></Rail>
          <Rail label="Gratis"><BookingCardV5 variant="free" /></Rail>
          <Rail label="Fullt"><BookingCardV5 variant="soldout" /></Rail>
        </div>
      </div>
    </div>
  );
};

export default BookingCardV5Preview;

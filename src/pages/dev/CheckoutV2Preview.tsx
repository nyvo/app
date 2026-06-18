import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Building, Calendar, Clock, ChevronLeft, Lock } from '@/lib/icons';
import { formatKroner, cn } from '@/lib/utils';

/**
 * Prototype — step 2 (Påmelding) rebuilt from scratch.
 *
 * One page, two columns (Fresha / Airbnb model):
 *   - LEFT: contact form, then the payment section (the Dintero embed slot,
 *     mocked here as an express button + card fields so the framing is visible).
 *   - RIGHT: a sticky summary card — identity → date/time → line items → Total
 *     → secure/cancellation footer (Fresha summary structure).
 *
 * Branches: integrert (Dintero), gratis (no payment), manuell (pay at studio).
 * Nothing from the current CheckoutPage is reused — only primitives.
 */

type Variant = 'integrated' | 'free' | 'manual';

const STUDIO = 'Kristoffer Yoga';
const COURSE = 'Morgenyoga';
const SESSION_DATE = 'Tirsdag 16. juni';
const SESSION_TIME = '06:15–07:00';

const PRICE: Record<Variant, { label: string; amount: number }> = {
  integrated: { label: 'Drop-in', amount: 500 },
  free: { label: COURSE, amount: 0 },
  manual: { label: 'Kurspakke', amount: 2000 },
};
const FEE = 25;

// Bigger, airier inputs — 44px tall, roomier padding, 16px text, softer corners.
const FIELD_INPUT = 'h-11 rounded-xl px-3.5 text-base';

// ── Page ────────────────────────────────────────────────────────────────

const CheckoutV2Preview = () => {
  const [variant, setVariant] = useState<Variant>('integrated');

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* dev chrome */}
      <div className="sticky top-0 z-40 border-b border-border bg-surface-elevated/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Badge variant="neutral" shape="pill" size="sm">Checkout v2</Badge>
          <VariantSwitch value={variant} onChange={setVariant} />
          <span className="ml-auto text-xs text-foreground-muted">/dev/checkout-2</span>
        </div>
      </div>

      <Checkout variant={variant} />
    </div>
  );
};

function Checkout({ variant }: { variant: Variant }) {
  const ticket = PRICE[variant];
  const fee = variant === 'integrated' ? FEE : 0;
  const total = ticket.amount + fee;

  return (
    <>
      {/* page top bar — icon-only back + the single secure-payment mark */}
      <div className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <button
            type="button"
            aria-label="Tilbake"
            className="-ml-2 flex size-10 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="size-5" strokeWidth={1.75} />
          </button>
          {variant === 'integrated' && (
            <span className="inline-flex items-center gap-1.5 text-xs text-foreground-muted">
              <Lock className="size-3.5" strokeWidth={1.75} />
              Sikker betaling
            </span>
          )}
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-medium text-foreground">Påmelding</h1>

        <div className="mt-8 grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1fr)_320px] md:items-start md:gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
          {/* LEFT — form + payment */}
          <div className="min-w-0 max-w-[560px] space-y-10">
            <ContactSection />

            {variant === 'integrated' ? (
              <PaymentSection total={total} />
            ) : (
              <ConfirmSection variant={variant} />
            )}
          </div>

          {/* RIGHT — summary */}
          <aside>
            <div className="md:sticky md:top-24">
              <Summary variant={variant} ticket={ticket} fee={fee} total={total} />
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}

// ── Left: contact ─────────────────────────────────────────────────────────

function ContactSection() {
  return (
    <section className="space-y-5">
      <SectionHeader title="Kontaktinfo" />
      <div className="space-y-5">
        <Field label="Navn" htmlFor="v2-name">
          <Input id="v2-name" autoComplete="name" placeholder="Kari Nordmann" className={FIELD_INPUT} />
        </Field>
        <Field label="E-post" htmlFor="v2-email">
          <Input id="v2-email" type="email" autoComplete="email" placeholder="kari@example.no" className={FIELD_INPUT} />
        </Field>
        <Field label="Telefon" htmlFor="v2-phone">
          <Input id="v2-phone" type="tel" autoComplete="tel" placeholder="+47 400 00 000" className={FIELD_INPUT} />
        </Field>
        <Field label="Melding (valgfritt)" htmlFor="v2-note">
          <Textarea id="v2-note" rows={3} placeholder="Allergier, skader eller annet vi bør vite." className="rounded-xl px-3.5 py-2.5 text-base" />
        </Field>
      </div>
    </section>
  );
}

// ── Left: payment (the Dintero embed slot) ─────────────────────────────────

function PaymentSection({ total }: { total: number }) {
  return (
    <section className="space-y-5">
      <SectionHeader title="Betaling" />

      <TermsLine />

      {/* The bordered card stands in for the Dintero embed. */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <button
          type="button"
          className="flex h-11 w-full items-center justify-center rounded-xl bg-[#FF5B24] text-base font-semibold text-white transition-opacity hover:opacity-90"
        >
          Betal med Vipps
        </button>

        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-foreground-muted">eller betal med kort</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="space-y-5">
          <Field label="Kortnummer" htmlFor="v2-card">
            <div className="relative">
              <Input id="v2-card" inputMode="numeric" placeholder="1234 5678 9012 3456" className={cn(FIELD_INPUT, 'pr-14')} />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] font-semibold tracking-wide text-foreground-muted">
                VISA
              </span>
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Utløpsdato" htmlFor="v2-exp">
              <Input id="v2-exp" inputMode="numeric" placeholder="MM/ÅÅ" className={FIELD_INPUT} />
            </Field>
            <Field label="CVC" htmlFor="v2-cvc">
              <Input id="v2-cvc" inputMode="numeric" placeholder="123" className={FIELD_INPUT} />
            </Field>
          </div>
          <Field label="Navn på kort" htmlFor="v2-cardname">
            <Input id="v2-cardname" placeholder="Kari Nordmann" className={FIELD_INPUT} />
          </Field>
        </div>

        <Button size="cta" className="mt-6 w-full">
          Betal {formatKroner(total)}
        </Button>
      </div>
    </section>
  );
}

// ── Left: confirm (free / manual — no online payment) ──────────────────────

function ConfirmSection({ variant }: { variant: Variant }) {
  return (
    <section className="space-y-5">
      {variant === 'manual' && (
        <div className="rounded-xl bg-muted p-4">
          <p className="text-sm font-medium text-foreground">Betaling avtales med studioet</p>
          <p className="mt-1 text-sm text-foreground-muted">
            Du betaler ikke noe her. {STUDIO} tar betalt direkte.
          </p>
        </div>
      )}

      <TermsLine />

      <Button size="cta" className="w-full">Bekreft påmelding</Button>
    </section>
  );
}

function TermsLine() {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
      <Checkbox className="mt-0.5" />
      <span>
        Jeg godtar{' '}
        <a href="#" className="underline decoration-foreground-disabled underline-offset-2 hover:decoration-foreground">
          vilkår og angrerett
        </a>
        .
      </span>
    </label>
  );
}

// ── Right: summary ─────────────────────────────────────────────────────────

function Summary({
  variant,
  ticket,
  fee,
  total,
}: {
  variant: Variant;
  ticket: { label: string; amount: number };
  fee: number;
  total: number;
}) {
  const isFree = variant === 'free';
  const isManual = variant === 'manual';

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="space-y-5 p-5">
        {/* identity */}
        <div className="flex gap-3">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground-muted ring-1 ring-border">
            <Building className="size-5" strokeWidth={1.5} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm text-foreground-muted">{STUDIO}</p>
            <p className="mt-0.5 text-base font-medium text-foreground">{COURSE}</p>
          </div>
        </div>

        {/* date/time */}
        <div className="space-y-1.5 text-sm text-foreground">
          <p className="flex items-center gap-2">
            <Calendar className="size-4 shrink-0 text-foreground-muted" strokeWidth={1.75} />
            {SESSION_DATE}
          </p>
          <p className="flex items-center gap-2 tabular-nums">
            <Clock className="size-4 shrink-0 text-foreground-muted" strokeWidth={1.75} />
            {SESSION_TIME}
          </p>
        </div>

        <div className="border-t border-border" />

        {/* line items + total */}
        {isFree ? (
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-base font-medium text-foreground">Totalt</span>
            <span className="text-xl font-medium text-foreground">Gratis</span>
          </div>
        ) : (
          <>
            <dl className="space-y-2 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-foreground">{ticket.label}</dt>
                <dd className="tabular-nums text-foreground">{formatKroner(ticket.amount)}</dd>
              </div>
              {fee > 0 && (
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-foreground-muted">Tjenestegebyr</dt>
                  <dd className="tabular-nums text-foreground-muted">{formatKroner(fee)}</dd>
                </div>
              )}
            </dl>
            <div className="border-t border-border" />
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-base font-medium text-foreground">Totalt</span>
              <span className="text-xl font-medium tabular-nums text-foreground">{formatKroner(total)}</span>
            </div>
          </>
        )}

        {(isFree || isManual) && (
          <>
            <div className="border-t border-border" />
            <p className="text-xs text-foreground-muted">
              {isManual ? `Betaling avtales direkte med ${STUDIO}.` : 'Gratis kurs – ingen betaling.'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Bits ───────────────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <h2 className="text-lg font-medium text-foreground">{title}</h2>;
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}

function VariantSwitch({ value, onChange }: { value: Variant; onChange: (v: Variant) => void }) {
  const opts: { id: Variant; label: string }[] = [
    { id: 'integrated', label: 'Integrert' },
    { id: 'free', label: 'Gratis' },
    { id: 'manual', label: 'Manuell' },
  ];
  return (
    <div className="flex gap-1 rounded-full bg-muted p-1">
      {opts.map((o) => {
        const selected = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              selected ? 'bg-surface text-foreground shadow-xs' : 'text-foreground-muted hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default CheckoutV2Preview;

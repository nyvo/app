import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChevronLeft, Lock } from '@/lib/icons';
import { formatKroner, cn } from '@/lib/utils';

/**
 * Prototype — booking as a filled light-neutral panel on the course page, with
 * step 2 (kontakt + betaling) opening in a centered modal rather than a full
 * page. Combines two ideas under evaluation:
 *
 *   1. The booking rail becomes a filled `bg-muted` panel (the same neutral as
 *      the Betaling card), instead of sitting flat on the canvas. The filled
 *      edge is the separation — it replaces the column gap/hairline.
 *   2. "Velg" opens the checkout (the /dev/checkout-3 flow) in a centered
 *      modal (Dialog), keeping the course context dimmed behind it. In the real
 *      app this modal is route-backed so the Dintero redirect, refresh and back
 *      button still work.
 *
 * The modal carries the SAME surface language (the neutral Betaling card) so the
 * panel→modal feels like one expanding surface.
 */

type Variant = 'integrated' | 'free' | 'manual';
type Step = 'contact' | 'payment';

const STUDIO = 'Kristoffer Yoga';
const COURSE = 'Morgenyoga';
const COURSE_IMAGE =
  'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=480&q=80';
const DATE = 'Tirsdag 16. juni';
const TIME = '06:15–07:00';
const MORE_DATES = ['Tirsdag 23. juni', 'Tirsdag 30. juni'];

const PRICE: Record<Variant, number> = { integrated: 500, free: 0, manual: 2000 };
const FEE = 25;
const TICKET_LABEL: Record<Variant, string> = {
  integrated: 'Drop-in',
  free: COURSE,
  manual: 'Kurspakke',
};

// ── Page ────────────────────────────────────────────────────────────────────

const BookingModalPreview = () => {
  const [variant, setVariant] = useState<Variant>('integrated');
  const [layout, setLayout] = useState<'split' | 'single'>('split');
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-40 border-b border-border bg-surface-elevated/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Badge variant="neutral" shape="pill" size="sm">Booking modal</Badge>
          <VariantSwitch value={variant} onChange={setVariant} />
          <LayoutSwitch value={layout} onChange={setLayout} />
          <span className="ml-auto text-xs text-foreground-muted">/dev/booking-modal</span>
        </div>
      </div>

      <DetailMock variant={variant} onVelg={() => setOpen(true)} />
      {layout === 'split' ? (
        <CheckoutModal variant={variant} open={open} onOpenChange={setOpen} />
      ) : (
        <CheckoutModalSingle variant={variant} open={open} onOpenChange={setOpen} />
      )}
    </div>
  );
};

// ── Mock course-detail layout (the page behind the panel) ────────────────────

function DetailMock({ variant, onVelg }: { variant: Variant; onVelg: () => void }) {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-2xl bg-muted">
        <img src={COURSE_IMAGE} alt="" className="h-56 w-full object-cover sm:h-72" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1fr)_360px] md:items-start md:gap-12">
        {/* LEFT — course content */}
        <div className="min-w-0">
          <p className="text-sm text-foreground-muted">{STUDIO}</p>
          <h1 className="mt-1 text-3xl font-medium tracking-tight text-foreground">{COURSE}</h1>
          <p className="mt-2 text-sm text-foreground-muted">Kursrekke · tirsdager kl. {TIME}</p>

          <section className="mt-8 border-t border-border pt-8">
            <h2 className="text-lg font-medium text-foreground">Om kurset</h2>
            <p className="mt-3 text-sm leading-relaxed text-foreground-muted">
              Rolig morgenyoga for alle nivåer. Vi starter dagen med pust, mobilitet
              og enkle flyt-sekvenser. Ta med egen matte om du har — ellers låner du
              av studioet.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-foreground-muted">
              Kurset går over åtte tirsdager. Du beholder plassen din gjennom hele
              rekka, og kan melde deg på enkelttimer hvis det er ledig.
            </p>
          </section>

          <section className="mt-8 border-t border-border pt-8">
            <h2 className="text-lg font-medium text-foreground">Instruktør</h2>
            <p className="mt-3 text-sm leading-relaxed text-foreground-muted">
              Kristoffer har undervist yoga i over ti år og holder en varm, uhøytidelig
              time med plass til både nybegynnere og viderekomne.
            </p>
          </section>
        </div>

        {/* RIGHT — the filled booking panel */}
        <aside>
          <div className="md:sticky md:top-8">
            <BookingPanel variant={variant} onVelg={onVelg} />
          </div>
        </aside>
      </div>
    </main>
  );
}

/**
 * The booking rail, now a filled light-neutral panel (`bg-muted`) instead of
 * flat-on-canvas. The fill is the separation — no column hairline needed.
 */
function BookingPanel({ variant, onVelg }: { variant: Variant; onVelg: () => void }) {
  const free = variant === 'free';
  const price = PRICE[variant];
  return (
    <div className="rounded-2xl bg-muted p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-medium text-foreground">Velg kurstype</h3>
        <Badge variant="warning" shape="pill" size="sm">3 plasser igjen</Badge>
      </div>

      <div className="mt-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-base font-medium text-foreground">{COURSE}</p>
          <ul className="mt-2 space-y-1.5 text-sm text-foreground">
            {[DATE, ...MORE_DATES].map((d) => (
              <li key={d} className="flex items-baseline gap-x-2">
                <span>{d}</span>
                <span className="tabular-nums text-foreground-muted">{TIME}</span>
              </li>
            ))}
          </ul>
          <button type="button" className="mt-2 text-sm font-medium text-primary underline">
            Se alle 8 datoer
          </button>
        </div>
        <div className="flex w-20 shrink-0 flex-col items-stretch gap-2">
          <span className="text-center text-sm font-medium tabular-nums text-foreground">
            {free ? 'Gratis' : formatKroner(price)}
          </span>
          <Button size="default" className="w-full" onClick={onVelg}>
            Velg
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Checkout sheet ───────────────────────────────────────────────────────────

function CheckoutModal({
  variant,
  open,
  onOpenChange,
}: {
  variant: Variant;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const stepped = variant === 'integrated';
  const [step, setStep] = useState<Step>('contact');

  // Reset to the first step whenever the modal (re)opens or the variant changes,
  // so a reopened modal never lingers on a stale payment step.
  function handleOpenChange(next: boolean) {
    if (next) setStep('contact');
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* Two columns, /dev/checkout-3 layout: steps left, summary right — but
          the summary is a filled neutral panel (not the hairline-divided column),
          carrying the booking panel's surface into the modal. */}
      <DialogContent className="flex max-h-[calc(100dvh-3rem)] gap-0 overflow-hidden p-0 sm:max-w-[840px]">
        {/* LEFT — the step (header pinned, body scrolls) */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center gap-3 border-b border-border px-6 py-4 pr-14 md:pr-6">
            {stepped && step === 'payment' && (
              <button
                type="button"
                aria-label="Tilbake"
                onClick={() => setStep('contact')}
                className="-ml-1 flex size-8 shrink-0 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-muted hover:text-foreground"
              >
                <ChevronLeft className="size-5" strokeWidth={1.75} />
              </button>
            )}
            <DialogTitle>Påmelding</DialogTitle>
            {stepped && <MiniStepper step={step} />}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            {/* mobile only — the filled summary column is hidden < md */}
            <div className="mb-6 border-b border-border pb-6 md:hidden">
              <OrderSummary variant={variant} />
            </div>

            {stepped && step === 'contact' && (
              <ContactStep onContinue={() => setStep('payment')} />
            )}
            {stepped && step === 'payment' && <PaymentStep variant={variant} />}
            {!stepped && <ConfirmStep variant={variant} />}
          </div>
        </div>

        {/* RIGHT — filled neutral summary, full height */}
        <SummaryPanel variant={variant} />
      </DialogContent>
    </Dialog>
  );
}

/** The right column — a filled `bg-muted` panel that runs the full modal height,
 *  same content as the checkout-3 summary (identity, when, price). */
function SummaryPanel({ variant }: { variant: Variant }) {
  const price = PRICE[variant];
  const fee = variant === 'integrated' ? FEE : 0;
  const total = price + fee;
  return (
    <aside className="hidden w-[300px] shrink-0 bg-muted p-6 md:block">
      <div className="space-y-6">
        <div className="flex gap-3">
          <img src={COURSE_IMAGE} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
          <div className="min-w-0">
            <p className="truncate text-sm text-foreground-muted">{STUDIO}</p>
            <p className="text-base font-medium leading-snug text-foreground">{COURSE}</p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <p className="text-foreground-muted">Dato</p>
            <p className="mt-0.5 text-foreground">{DATE}</p>
          </div>
          <div>
            <p className="text-foreground-muted">Tid</p>
            <p className="mt-0.5 tabular-nums text-foreground">{TIME}</p>
          </div>
        </div>

        <div className="space-y-3 border-t border-border pt-5 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-foreground">{TICKET_LABEL[variant]}</span>
            <span className="tabular-nums text-foreground">{formatKroner(price)}</span>
          </div>
          {fee > 0 && (
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-foreground-muted">Tjenestegebyr</span>
              <span className="tabular-nums text-foreground-muted">{formatKroner(fee)}</span>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3">
            <span className="text-base font-medium text-foreground">Totalt</span>
            <span className="text-xl font-medium tabular-nums text-foreground">{formatKroner(total)}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

/**
 * Single-column variant — the booking-app convention (Open / Peerspace, per the
 * Mobbin cross-check): a narrower modal with the summary as a filled block at
 * the top and the step below. One column, so it scales from desktop to phone
 * with nothing to collapse — no side panel that has to disappear on tablet.
 */
function CheckoutModalSingle({
  variant,
  open,
  onOpenChange,
}: {
  variant: Variant;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const stepped = variant === 'integrated';
  const [step, setStep] = useState<Step>('contact');

  function handleOpenChange(next: boolean) {
    if (next) setStep('contact');
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-3rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[460px]">
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-6 py-4 pr-14">
          {stepped && step === 'payment' && (
            <button
              type="button"
              aria-label="Tilbake"
              onClick={() => setStep('contact')}
              className="-ml-1 flex size-8 shrink-0 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="size-5" strokeWidth={1.75} />
            </button>
          )}
          <DialogTitle>Påmelding</DialogTitle>
          {stepped && <MiniStepper step={step} />}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {/* filled summary as a top block (the surface stays), then the step */}
          <div className="rounded-2xl bg-muted p-4">
            <OrderSummary variant={variant} />
          </div>

          <div className="mt-6 border-t border-border pt-6">
            {stepped && step === 'contact' && (
              <ContactStep onContinue={() => setStep('payment')} />
            )}
            {stepped && step === 'payment' && <PaymentStep variant={variant} />}
            {!stepped && <ConfirmStep variant={variant} />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MiniStepper({ step }: { step: Step }) {
  const onPayment = step === 'payment';
  return (
    <nav aria-label="Fremdrift" className="ml-auto flex items-center gap-2 text-xs">
      <span className={cn(onPayment ? 'text-foreground-muted' : 'font-medium text-foreground')}>
        Kontakt
      </span>
      <span aria-hidden className={cn('h-px w-4', onPayment ? 'bg-primary' : 'bg-border')} />
      <span className={cn(onPayment ? 'font-medium text-foreground' : 'text-foreground-muted')}>
        Betaling
      </span>
    </nav>
  );
}

/** Compact order summary — thumbnail + identity + price block (no sidebar in a
 *  narrow sheet, so the total lives here at the top). */
function OrderSummary({ variant }: { variant: Variant }) {
  const free = variant === 'free';
  const price = PRICE[variant];
  const fee = variant === 'integrated' ? FEE : 0;
  const total = price + fee;
  return (
    <div>
      <div className="flex gap-3">
        <img src={COURSE_IMAGE} alt="" className="size-14 shrink-0 rounded-lg bg-muted object-cover" />
        <div className="min-w-0">
          <p className="truncate text-sm text-foreground-muted">{STUDIO}</p>
          <p className="text-base font-medium text-foreground">{COURSE}</p>
          <p className="mt-0.5 text-sm text-foreground-muted">{DATE}, {TIME}</p>
        </div>
      </div>

      <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-foreground">{TICKET_LABEL[variant]}</dt>
          <dd className="tabular-nums text-foreground">{formatKroner(price)}</dd>
        </div>
        {fee > 0 && (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-foreground-muted">Tjenestegebyr</dt>
            <dd className="tabular-nums text-foreground-muted">{formatKroner(fee)}</dd>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2">
          <dt className="font-medium text-foreground">Totalt</dt>
          <dd className="font-medium tabular-nums text-foreground">{formatKroner(total)}</dd>
        </div>
      </dl>
      {free && <p className="sr-only">Gratis</p>}
    </div>
  );
}

// ── Steps (single column, sheet-width) ───────────────────────────────────────

function ContactStep({ onContinue }: { onContinue: () => void }) {
  return (
    <section>
      <h2 className="text-base font-medium text-foreground">Hvem melder vi på?</h2>
      <div className="mt-4 space-y-4">
        <FloatingField id="bm-name" label="Navn" autoComplete="name" defaultValue="Kari Nordmann" />
        <FloatingField id="bm-email" label="E-post" type="email" inputMode="email" autoComplete="email" defaultValue="kari@example.no" />
        <FloatingField id="bm-phone" label="Telefon" type="tel" inputMode="tel" autoComplete="tel" defaultValue="+47 400 00 000" />
      </div>
      <Button size="cta" className="mt-8 w-full" onClick={onContinue}>
        Fortsett til betaling
      </Button>
    </section>
  );
}

function PaymentStep({ variant }: { variant: Variant }) {
  const total = PRICE[variant] + FEE;
  return (
    <section>
      <h2 className="text-base font-medium text-foreground">Betaling</h2>
      <p className="mt-1 text-sm text-foreground-muted">Betal med Vipps eller kort.</p>

      <div className="mt-6">
        <TermsLine />
      </div>

      {/* Dintero embed stand-in */}
      <div className="mt-4 rounded-xl border border-border bg-surface p-5">
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
        <div className="space-y-4">
          <FloatingField
            id="bm-card"
            label="Kortnummer"
            inputMode="numeric"
            fieldClassName="pr-14"
            suffix={
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] font-semibold tracking-wide text-foreground-muted">
                VISA
              </span>
            }
          />
          <div className="grid grid-cols-2 gap-4">
            <FloatingField id="bm-exp" label="Utløpsdato" inputMode="numeric" />
            <FloatingField id="bm-cvc" label="CVC" inputMode="numeric" />
          </div>
        </div>
        <Button size="cta" className="mt-6 w-full">
          Betal {formatKroner(total)}
        </Button>
      </div>

      <p className="mt-4 inline-flex w-full items-center justify-center gap-1.5 text-xs text-foreground-muted">
        <Lock className="size-3.5" strokeWidth={1.75} />
        Sikker betaling
      </p>
    </section>
  );
}

function ConfirmStep({ variant }: { variant: Variant }) {
  return (
    <section>
      <h2 className="text-base font-medium text-foreground">Hvem melder vi på?</h2>
      <div className="mt-4 space-y-4">
        <FloatingField id="bmc-name" label="Navn" autoComplete="name" defaultValue="Kari Nordmann" />
        <FloatingField id="bmc-email" label="E-post" type="email" inputMode="email" autoComplete="email" defaultValue="kari@example.no" />
        <FloatingField id="bmc-phone" label="Telefon" type="tel" inputMode="tel" autoComplete="tel" defaultValue="+47 400 00 000" />
      </div>

      <div className="mt-8">
        <PaymentNote variant={variant} />
      </div>

      <div className="mt-8">
        <TermsLine />
        <Button size="cta" className="mt-4 w-full">Meld meg på</Button>
      </div>
    </section>
  );
}

/** The shared neutral "Betaling" card — carries the surface language from the
 *  panel into the sheet. */
function PaymentNote({ variant }: { variant: Variant }) {
  const free = variant === 'free';
  return (
    <div className="space-y-2">
      <h2 className="text-base font-medium text-foreground">Betaling</h2>
      <div className="rounded-2xl bg-muted p-4">
        <p className="text-sm text-foreground">
          {free
            ? 'Dette er et gratis kurs.'
            : 'Studioet sender deg betalingsinformasjon på e-post.'}
        </p>
      </div>
    </div>
  );
}

function TermsLine() {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
      <Checkbox className="mt-0.5" />
      <span>
        Jeg godtar{' '}
        <a href="#" className="underline decoration-foreground-disabled underline-offset-2 hover:decoration-foreground">
          vilkårene
        </a>
        .
      </span>
    </label>
  );
}

// ── Bits ─────────────────────────────────────────────────────────────────────

/** Floating-label field (public-page style — label rests inside, shrinks on
 *  focus/fill). Matches the checkout-3 prototype. */
function FloatingField({
  id,
  label,
  type = 'text',
  defaultValue,
  autoComplete,
  inputMode,
  fieldClassName,
  suffix,
}: {
  id: string;
  label: string;
  type?: string;
  defaultValue?: string;
  autoComplete?: string;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email';
  fieldClassName?: string;
  suffix?: React.ReactNode;
}) {
  const fieldBase =
    'peer w-full rounded-lg border border-border bg-surface px-3.5 text-base text-foreground placeholder-transparent transition-colors focus:border-foreground focus:outline-none focus:ring-2 focus:ring-ring/30';
  const floats =
    'peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-xs';
  return (
    <div className="relative">
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        placeholder=" "
        className={cn(fieldBase, 'h-14 pb-1 pt-5', fieldClassName)}
      />
      <label
        htmlFor={id}
        className={cn(
          'pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base text-foreground-muted transition-all',
          floats,
        )}
      >
        {label}
      </label>
      {suffix}
    </div>
  );
}

function LayoutSwitch({
  value,
  onChange,
}: {
  value: 'split' | 'single';
  onChange: (v: 'split' | 'single') => void;
}) {
  const opts: { id: 'split' | 'single'; label: string }[] = [
    { id: 'split', label: 'Split' },
    { id: 'single', label: 'Én kolonne' },
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

export default BookingModalPreview;

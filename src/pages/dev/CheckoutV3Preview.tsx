import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronDown, Lock } from '@/lib/icons';
import { formatKroner, cn } from '@/lib/utils';

/**
 * Prototype — step 2 (Påmelding) as a true two-step flow, Shop/Apple aesthetic.
 *
 * Difference from /dev/checkout-2: the contact form and the payment no longer
 * stack vertically — they are separate steps, and the progress indicator lives
 * in the top bar next to the back arrow (Apple-checkout model).
 *
 * Aesthetic borrowed from Shopify Shop + Apple checkout:
 *   - Floating-label inputs: the label rests inside the field, then shrinks to
 *     the top-left once the field is focused or filled. (FloatingField below.)
 *   - A descriptive question header on each form ("Hvem melder vi på?"), with a
 *     short helper line, rather than a terse field-group title.
 *   - Completed steps collapse to an editable "Deltaker" summary row.
 *
 * Steps (paid + integrated payments):
 *   1 · Kontakt   → name / e-post / telefon / melding
 *   2 · Betaling  → identity summary row (editable) + terms + Dintero embed
 *
 * Skip rule: a signed-in buyer whose profile already has the required fields
 * skips step 1 entirely — they land on Betaling with their info shown as an
 * editable row. The stepper still marks Kontakt done.
 *
 * Free / manuell branches have no payment, so they collapse to a single
 * confirm screen with no stepper.
 */

type Variant = 'integrated' | 'free' | 'manual';
type Step = 'contact' | 'payment';

const STUDIO = 'Kristoffer Yoga';
const COURSE = 'Morgenyoga';
// Real thumbnail stands in for resolveCourseImage() — a placeholder icon read
// as unfinished; a photo is what makes the Shop/Apple summary feel airy.
const COURSE_IMAGE = 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=240&q=80';

interface Booking {
  label: string;
  amount: number;
  /** Set for a course series — drives the "(x uker)" tag and a start–end date. */
  weeks?: number;
  /** Single session → one date; series → "start – slutt" range. */
  date: string;
  time: string;
  /** Paid at the studio, not online → summary shows a "due now / at studio"
   * schedule instead of a plain total (Navan/Booking "pay at venue" pattern). */
  payLater?: boolean;
}

// "Manuell" doubles as the series example (Kurspakke, 8 uker) so the summary's
// series + pay-at-studio formatting is visible. Drop-in / Gratis are single
// sessions paid online (or free).
const BOOKING: Record<Variant, Booking> = {
  integrated: { label: 'Drop-in', amount: 500, date: 'Tirsdag 16. juni', time: '06:15–07:00' },
  free: { label: COURSE, amount: 0, date: 'Tirsdag 16. juni', time: '06:15–07:00' },
  manual: { label: 'Kurspakke', amount: 2000, weeks: 8, date: '16. juni – 4. august', time: '06:15–07:00', payLater: true },
};
const FEE = 25;

// Stand-in for a signed-in buyer whose profile is complete.
const SAVED_PROFILE = { name: 'Kari Nordmann', email: 'kari@example.no', phone: '+47 400 00 000' };

// ── Page ────────────────────────────────────────────────────────────────

const CheckoutV3Preview = () => {
  const [variant, setVariant] = useState<Variant>('integrated');
  const [signedIn, setSignedIn] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* dev chrome */}
      <div className="sticky top-0 z-40 border-b border-border bg-surface-elevated/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Badge variant="neutral" shape="pill" size="sm">Checkout v3</Badge>
          <VariantSwitch value={variant} onChange={setVariant} />
          <label className="flex cursor-pointer items-center gap-2 text-xs text-foreground-muted">
            <Checkbox checked={signedIn} onCheckedChange={(v) => setSignedIn(v === true)} />
            Innlogget (komplett profil)
          </label>
          <span className="ml-auto text-xs text-foreground-muted">/dev/checkout-3</span>
        </div>
      </div>

      <Checkout key={`${variant}-${signedIn}`} variant={variant} signedIn={signedIn} />
    </div>
  );
};

function Checkout({ variant, signedIn }: { variant: Variant; signedIn: boolean }) {
  const ticket = BOOKING[variant];
  const fee = variant === 'integrated' ? FEE : 0;
  const total = ticket.amount + fee;

  // Only the paid + integrated branch has a real payment step worth gating.
  const stepped = variant === 'integrated';
  // Signed-in + complete profile → skip the contact step.
  const [step, setStep] = useState<Step>(signedIn && stepped ? 'payment' : 'contact');
  // Mobile: the side summary is hidden, so a collapsible bar carries the total.
  const [summaryOpen, setSummaryOpen] = useState(false);

  return (
    <>
      {/* page top bar — back arrow + the step indicator live together here */}
      <header className="sticky top-[49px] z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            aria-label="Tilbake"
            onClick={() => {
              if (stepped && step === 'payment') setStep('contact');
            }}
            className="-ml-2 flex size-10 shrink-0 items-center justify-center rounded-full text-foreground-muted transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="size-5" strokeWidth={1.75} />
          </button>

          {/* Step indicator only when the contact step is actually in the forward
              flow. A signed-in buyer skips it → single step → no indicator. */}
          {stepped && !signedIn && <Stepper step={step} onGoContact={() => setStep('contact')} />}

          {/* "Sikker betaling" belongs only to the flow that actually takes a
              card. Free / manuell have no online payment, so the lock would lie
              about what's happening — leave the right side clear. */}
          {stepped && (
            <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 text-xs text-foreground-muted">
              <Lock className="size-3.5" strokeWidth={1.75} />
              <span className="hidden sm:inline">Sikker betaling</span>
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        {/* Mobile: collapsible summary (Apple "Show Order Summary"). The side
            column is hidden < md, so the total stays glanceable up here. */}
        <div className="mb-6 overflow-hidden rounded-lg border border-border md:hidden">
          <button
            type="button"
            onClick={() => setSummaryOpen((o) => !o)}
            aria-expanded={summaryOpen}
            className="flex w-full items-center justify-between px-4 py-3 text-sm"
          >
            <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
              {summaryOpen ? 'Skjul sammendrag' : 'Vis sammendrag'}
              <ChevronDown
                className={cn('size-4 transition-transform', summaryOpen && 'rotate-180')}
                strokeWidth={1.75}
              />
            </span>
            <span className="font-medium tabular-nums text-foreground">
              {formatKroner(total)}
            </span>
          </button>
          {summaryOpen && (
            <div className="border-t border-border p-4">
              <Summary ticket={ticket} fee={fee} total={total} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1fr)_320px] md:items-start md:gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
          {/* LEFT — one step at a time */}
          <div className="min-w-0 max-w-[560px]">
            {stepped && step === 'contact' && <ContactStep onContinue={() => setStep('payment')} />}

            {stepped && step === 'payment' && (
              <PaymentStep total={total} profile={SAVED_PROFILE} onEditContact={() => setStep('contact')} />
            )}

            {!stepped && (
              <ConfirmStep signedIn={signedIn} variant={variant} />
            )}
          </div>

          {/* RIGHT — persistent summary: hairline-divided column, no card (Shop). */}
          <aside className="hidden md:block md:border-l md:border-border md:pl-8 lg:pl-12">
            <div className="md:sticky md:top-28">
              <Summary ticket={ticket} fee={fee} total={total} />
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}

// ── Header stepper ──────────────────────────────────────────────────────

/**
 * Step indicator — a left-aligned text breadcrumb with a thin connector that
 * fills as you progress (Squarespace/Felt model), anchored beside the back
 * arrow rather than floating in the centre. The current step is emphasised, the
 * done step stays tappable to jump back and edit, the upcoming step is muted.
 */
function Stepper({ step, onGoContact }: { step: Step; onGoContact: () => void }) {
  const onPayment = step === 'payment';
  return (
    <nav aria-label="Fremdrift" className="flex items-center gap-3 text-sm">
      <button
        type="button"
        disabled={!onPayment}
        onClick={onPayment ? onGoContact : undefined}
        aria-current={onPayment ? undefined : 'step'}
        className={cn('transition-colors text-foreground', !onPayment && 'font-medium', onPayment && 'cursor-pointer')}
      >
        Kontakt
      </button>
      <span aria-hidden className={cn('h-px w-6 transition-colors', onPayment ? 'bg-primary' : 'bg-border')} />
      <span
        aria-current={onPayment ? 'step' : undefined}
        className={cn('transition-colors', onPayment ? 'font-medium text-foreground' : 'text-foreground-muted')}
      >
        Betaling
      </span>
    </nav>
  );
}

// ── Step 1: contact ────────────────────────────────────────────────────────

function ContactStep({ onContinue }: { onContinue: () => void }) {
  return (
    <section>
      <FormHeader title="Hvem melder vi på?" />

      <div className="mt-6 space-y-4">
        <FloatingField id="v3-name" label="Navn" autoComplete="name" defaultValue="Kari Nordmann" />
        <FloatingField id="v3-email" label="E-post" type="email" inputMode="email" autoComplete="email" defaultValue="kari@example.no" />
        <FloatingField id="v3-phone" label="Telefon" type="tel" inputMode="tel" autoComplete="tel" defaultValue="+47 400 00 000" />
        <FloatingField id="v3-note" label="Melding til studioet (valgfritt)" multiline rows={3} muted />
      </div>

      <Button size="cta" className="mt-8 w-full" onClick={onContinue}>
        Fortsett til betaling
      </Button>
    </section>
  );
}

// ── Step 2: payment ──────────────────────────────────────────────────────

function PaymentStep({
  total,
  profile,
  onEditContact,
}: {
  total: number;
  profile: { name: string; email: string; phone: string };
  onEditContact: () => void;
}) {
  return (
    <section>
      <FormHeader title="Betaling" description="Betal med Vipps eller kort." />

      {/* identity row — lets a skipped/returning buyer verify + fix who they are */}
      <div className="mt-6 flex items-start justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs text-foreground-muted">Deltaker</p>
          <p className="mt-0.5 truncate text-sm font-medium text-foreground">{profile.name}</p>
          <p className="truncate text-sm text-foreground-muted">{profile.email}</p>
          <p className="truncate text-sm text-foreground-muted">{profile.phone}</p>
        </div>
        <button
          type="button"
          onClick={onEditContact}
          className="shrink-0 text-sm font-medium text-primary underline underline-offset-2"
        >
          Endre
        </button>
      </div>

      {/* Terms + payment are one unit: consent gates the pay action, so the
          checkbox hugs the card (16px) while the whole group sits 32px below
          the Deltaker block above. */}
      <div className="mt-8">
        <TermsLine />

        {/* The bordered card stands in for the Dintero embed. */}
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
            id="v3-card"
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
            <FloatingField id="v3-exp" label="Utløpsdato" inputMode="numeric" />
            <FloatingField id="v3-cvc" label="CVC" inputMode="numeric" />
          </div>
        </div>
          <Button size="cta" className="mt-6 w-full">
            Betal {formatKroner(total)}
          </Button>
        </div>
      </div>
    </section>
  );
}

// ── Free / manuell: single confirm screen ──────────────────────────────────

function ConfirmStep({
  signedIn,
  variant,
}: {
  signedIn: boolean;
  variant: Variant;
}) {
  // Signed-in buyers land on a collapsed "Deltaker" row; "Endre" swaps it for
  // the normal form in place (no step change — there's no payment step here),
  // mirroring the integrated flow's editable identity row.
  const [editing, setEditing] = useState(false);
  const showForm = !signedIn || editing;

  return (
    <section>
      <FormHeader title="Hvem melder vi på?" />

      {showForm ? (
        <div className="mt-6 space-y-4">
          <FloatingField id="v3c-name" label="Navn" autoComplete="name" defaultValue="Kari Nordmann" />
          <FloatingField id="v3c-email" label="E-post" type="email" inputMode="email" autoComplete="email" defaultValue="kari@example.no" />
          <FloatingField id="v3c-phone" label="Telefon" type="tel" inputMode="tel" autoComplete="tel" defaultValue="+47 400 00 000" />
        </div>
      ) : (
        <div className="mt-6 flex items-start justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs text-foreground-muted">Deltaker</p>
            <p className="mt-0.5 truncate text-sm font-medium text-foreground">{SAVED_PROFILE.name}</p>
            <p className="truncate text-sm text-foreground-muted">{SAVED_PROFILE.email}</p>
            <p className="truncate text-sm text-foreground-muted">{SAVED_PROFILE.phone}</p>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="shrink-0 text-sm font-medium text-primary underline underline-offset-2"
          >
            Endre
          </button>
        </div>
      )}

      {/* "Betaling" section for both no-payment branches: a labelled zone + one
          short declarative line. Manuell sets the expectation (studio e-mails
          details); free states plainly there's nothing to pay, so the cold
          "0 kr" in the summary reads as intentional. A distinct zone → 32px. */}
      <div className="mt-8">
        <PaymentNote variant={variant} />
      </div>

      {/* Consent + confirm are one unit: terms gate the button, so it hugs
          (16px), and the whole group sits 32px below the zone above. */}
      <div className="mt-8">
        <TermsLine />
        <Button size="cta" className="mt-4 w-full">Meld meg på</Button>
      </div>
    </section>
  );
}

/**
 * "Betaling" section for the no-integrated-payment branches: a labelled zone +
 * one short declarative line. Manuell sets the one expectation that matters (the
 * studio e-mails payment details); free states there's nothing to pay, so the
 * summary's "0 kr" reads as intentional rather than a skipped step. No separate
 * payment STEP — there's no action to take, so a step would be hollow.
 */
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

// Terms acceptance — one label for every variant. "angrerett" intentionally
// dropped: for date-bound leisure activities it doesn't apply (angrerettloven
// § 22 m), and a free signup has no purchase to withdraw from. The binding /
// no-angrerett clause belongs in the linked vilkår, not inline.
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

// ── Right: summary ─────────────────────────────────────────────────────────

function Summary({
  ticket,
  fee,
  total,
}: {
  ticket: Booking;
  fee: number;
  total: number;
}) {
  return (
    <div className="space-y-6">
      {/* identity — real thumbnail + studio/class, like Shop/Hims */}
      <div className="flex gap-4">
        <img
          src={COURSE_IMAGE}
          alt=""
          className="size-16 shrink-0 rounded-xl bg-muted object-cover"
        />
        <div className="min-w-0 pt-0.5">
          <p className="truncate text-sm text-foreground-muted">{STUDIO}</p>
          <p className="mt-0.5 text-base font-medium leading-snug text-foreground">{COURSE}</p>
        </div>
      </div>

      {/* when — always stacked (label over value), regardless of format. The
          label sits one step down the colour scale (muted) so the value reads
          as the primary line; a date range just grows into the space. */}
      <div className="space-y-3 text-sm">
        <div>
          <p className="text-foreground-muted">Dato</p>
          <p className="mt-0.5 text-foreground">{ticket.date}</p>
        </div>
        <div>
          <p className="text-foreground-muted">Tid</p>
          <p className="mt-0.5 tabular-nums text-foreground">{ticket.time}</p>
        </div>
      </div>

      {/* price — one block for every format; a free booking lists its item at
          0 kr and totals to 0 kr (Eventbrite pattern). */}
      <div className="space-y-4 border-t border-border pt-5">
        <dl className="space-y-2.5 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-foreground">
              {ticket.label}
              {ticket.weeks ? ` (${ticket.weeks} uker)` : ''}
            </dt>
            <dd className="tabular-nums text-foreground">{formatKroner(ticket.amount)}</dd>
          </div>
          {fee > 0 && (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-foreground">Tjenestegebyr</dt>
              <dd className="tabular-nums text-foreground">{formatKroner(fee)}</dd>
            </div>
          )}
        </dl>
        <div className="flex items-baseline justify-between gap-3 border-t border-border pt-4">
          <span className="text-xl font-medium text-foreground">Totalt</span>
          <span className="text-xl font-medium tabular-nums text-foreground">{formatKroner(total)}</span>
        </div>
      </div>

    </div>
  );
}

// ── Bits ───────────────────────────────────────────────────────────────────

/** Apple/Shop-style section lead: a big descriptive question + optional helper. */
function FormHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h1 className="text-2xl font-medium text-foreground">{title}</h1>
      {description && <p className="mt-1.5 text-sm text-foreground-muted">{description}</p>}
    </div>
  );
}

/**
 * Floating-label field (Shop / Apple style). The label rests inside the input,
 * then shrinks to the top-left when the field is focused or holds a value. The
 * `placeholder=" "` (single space) is what drives the `:placeholder-shown`
 * state the label transition keys off.
 */
function FloatingField({
  id,
  label,
  type = 'text',
  defaultValue,
  autoComplete,
  inputMode,
  multiline = false,
  rows = 3,
  fieldClassName,
  suffix,
  muted = false,
}: {
  id: string;
  label: string;
  type?: string;
  defaultValue?: string;
  autoComplete?: string;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email';
  multiline?: boolean;
  rows?: number;
  fieldClassName?: string;
  suffix?: React.ReactNode;
  /** Optional field — recedes to a borderless grey fill at rest, becomes a
   *  normal white field on focus or once filled, so it doesn't read as required. */
  muted?: boolean;
}) {
  const fieldBase = cn(
    'peer w-full rounded-lg border bg-surface px-3.5 text-base text-foreground placeholder-transparent transition-colors focus:outline-none focus:ring-2',
    muted
      ? 'border-transparent bg-muted focus:border-foreground focus:bg-surface focus:ring-ring/30 [&:not(:placeholder-shown)]:border-border [&:not(:placeholder-shown)]:bg-surface'
      : 'border-border focus:border-foreground focus:ring-ring/30',
  );
  const floats =
    'peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-xs';

  return (
    <div className="relative">
      {multiline ? (
        <textarea
          id={id}
          rows={rows}
          defaultValue={defaultValue}
          placeholder=" "
          className={cn(fieldBase, 'pb-2 pt-6', fieldClassName)}
        />
      ) : (
        <input
          id={id}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          defaultValue={defaultValue}
          placeholder=" "
          className={cn(fieldBase, 'h-14 pb-1 pt-5', fieldClassName)}
        />
      )}
      <label
        htmlFor={id}
        className={cn(
          'pointer-events-none absolute left-3.5 text-base text-foreground-muted transition-all',
          multiline ? 'top-4' : 'top-1/2 -translate-y-1/2',
          floats,
        )}
      >
        {label}
      </label>
      {suffix}
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

export default CheckoutV3Preview;

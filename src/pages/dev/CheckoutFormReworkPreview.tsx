import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { formatKroner, cn } from '@/lib/utils';
import { calculateServiceFee } from '@/lib/pricing';
import type { PublicCourseWithDetails } from '@/services/publicCourses';

/**
 * Preview for the combined checkout page. Mirrors the route that will live
 * at /:slug/:courseSlug/pamelding in production. Single page: ticket select
 * + contact info + terms + checkout iframe (mocked here) all on one route.
 * Two-column desktop (form/iframe left, persistent summary right); single
 * column on mobile with sticky bottom "Til betaling" scroll affordance.
 *
 * Mock data only. The checkout iframe section is a static design mock
 * that approximates the embed — real payment wiring happens at cutover.
 */

type Variant = 'series-with-dropin' | 'series-only' | 'single' | 'free';

const VARIANT_LABELS: Record<Variant, string> = {
  'series-with-dropin': 'Kursrekke + drop-in (to billetter)',
  'series-only': 'Kursrekke uten drop-in (én billett)',
  single: 'Enkelttime',
  free: 'Gratis prøvetime',
};

type TicketOption = {
  id: string;
  label: string;
  sublabel: string;
  price: number;
};

const CheckoutFormReworkPreview = () => {
  const [variant, setVariant] = useState<Variant>('series-with-dropin');
  const [searchParams] = useSearchParams();
  const course = useMemo(() => makeMockCourse(variant), [variant]);
  const options = useMemo(() => buildOptions(course), [course]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [terms, setTerms] = useState(false);

  // Pre-selected from the detail page's rail (?billett=). If the param is
  // missing or invalid (deep link / fresh visit), default to the first
  // option — the primary tier. Inline "Endre" can change it locally.
  const [selectedId, setSelectedId] = useState<string>(() => {
    const fromUrl = searchParams.get('billett');
    if (fromUrl && options.find((o) => o.id === fromUrl)) return fromUrl;
    return options[0]?.id ?? '';
  });

  // When the dev variant flips and options change, reset to first option.
  useEffect(() => {
    setSelectedId(options[0]?.id ?? '');
  }, [variant, options]);

  const selected = options.find((o) => o.id === selectedId) ?? options[0];
  const subtotal = selected?.price ?? 0;
  const fee = calculateServiceFee(subtotal);
  const total = subtotal + fee;
  const isFree = subtotal === 0;

  const ctaLabel = isFree ? 'Bekreft påmelding' : 'Fortsett til betaling';
  const formValid = name.trim().length > 0 && /\S+@\S+\.\S+/.test(email) && terms;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DevBar variant={variant} onVariantChange={setVariant} />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-6 pb-32 lg:pb-16">
        <header className="mb-10 max-w-2xl">
          <p className="text-sm text-foreground-muted">Påmelding</p>
          <h1 className="mt-1 text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
            {course.title}
          </h1>
        </header>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12 lg:items-start">
          <div className="space-y-10 max-w-[560px] min-w-0">
            {selected && (
              <SelectedTicket
                options={options}
                selectedId={selectedId}
                onChange={setSelectedId}
                isFree={isFree}
              />
            )}

            <Section title="Kontaktinfo">
              <div className="space-y-4">
                <Field label="Navn" htmlFor="name">
                  <Input
                    id="name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Field>
                <Field label="E-post" htmlFor="email">
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
                <label className="flex items-start gap-3 cursor-pointer text-sm text-foreground pt-1">
                  <Checkbox
                    checked={terms}
                    onCheckedChange={(v) => setTerms(v === true)}
                    className="mt-0.5"
                  />
                  <span>
                    Jeg godtar{' '}
                    <Link to="/terms" className="underline decoration-foreground-disabled underline-offset-2 hover:decoration-foreground">
                      vilkår og angrerett
                    </Link>
                    .
                  </span>
                </label>
              </div>
            </Section>

            {isFree ? (
              <Button className="w-full" disabled={!formValid}>
                {ctaLabel}
              </Button>
            ) : (
              <Section title="Betaling" id="payment">
                <PaymentEmbed
                  enabled={formValid}
                  total={total}
                />
              </Section>
            )}
          </div>

          <aside className="hidden lg:block">
            <div className="sticky top-10">
              <CheckoutSummary
                course={course}
                selectedOption={selected}
                subtotal={subtotal}
                fee={fee}
                total={total}
              />
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile sticky total + jump-to-payment affordance */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-background border-t border-border">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-foreground-muted">Totalt</p>
            <p className="text-base font-semibold tabular-nums text-foreground">
              {isFree ? 'Gratis' : formatKroner(total)}
            </p>
          </div>
          {isFree ? (
            <Button disabled={!formValid}>
              {ctaLabel}
            </Button>
          ) : (
            <Button
              disabled={!formValid}
              onClick={() => {
                document.getElementById('payment')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              Til betaling
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

function Section({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="text-base font-semibold tracking-tight text-foreground mb-4">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Static mock of the Stripe embedded checkout. Approximates the real
 * iframe's surface — Vipps express button at the top (per Vipps merchant
 * guidelines), divider, then card fields with a single pay action. When
 * `enabled` is false the whole block is disabled-looking, signaling the
 * user to complete the form above first.
 */
function PaymentEmbed({ enabled, total }: { enabled: boolean; total: number }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-surface p-5 space-y-4 transition-opacity',
        !enabled && 'opacity-50 pointer-events-none',
      )}
      aria-disabled={!enabled}
    >
      {!enabled && (
        <p className="text-sm text-foreground-muted">
          Fyll ut kontaktinfo og godta vilkår for å fortsette.
        </p>
      )}

      {/* Vipps primary — Vipps brand orange, per Vipps merchant guidelines */}
      <button
        type="button"
        className="w-full rounded-full bg-[#FF5B24] text-white text-base font-medium h-11 flex items-center justify-center gap-2 hover:bg-[#E94B16] transition-colors"
        disabled={!enabled}
      >
        Betal med Vipps
      </button>

      <div className="flex items-center gap-3 text-xs text-foreground-muted">
        <span className="flex-1 border-t border-border" />
        eller betal med kort
        <span className="flex-1 border-t border-border" />
      </div>

      <div className="space-y-3">
        <Field label="Kortnummer" htmlFor="card-number">
          <Input
            id="card-number"
            placeholder="1234 5678 9012 3456"
            inputMode="numeric"
            disabled={!enabled}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="MM / ÅÅ" htmlFor="card-expiry">
            <Input id="card-expiry" placeholder="04/28" disabled={!enabled} />
          </Field>
          <Field label="CVC" htmlFor="card-cvc">
            <Input id="card-cvc" placeholder="123" disabled={!enabled} />
          </Field>
        </div>
      </div>

      <Button className="w-full" disabled={!enabled}>
        Betal {formatKroner(total)}
      </Button>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * Confirmation tile at the top of the checkout form. Shows the ticket the
 * user chose on the detail page rail. Clicking "Endre" expands in place
 * into a radio picker — picking a new option auto-collapses back to the
 * read-only tile (Airbnb / Klook pattern). Single-option courses skip
 * the toggle entirely.
 */
function SelectedTicket({
  options,
  selectedId,
  onChange,
  isFree,
}: {
  options: TicketOption[];
  selectedId: string;
  onChange: (id: string) => void;
  isFree: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const changeable = options.length > 1;
  const selected = options.find((o) => o.id === selectedId) ?? options[0];

  // Collapse if it becomes uneditable (variant flip).
  useEffect(() => {
    if (!changeable) setEditing(false);
  }, [changeable]);

  if (!selected) return null;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <p className="text-sm font-medium text-foreground">Billett</p>
        {changeable && (
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="text-sm font-medium text-foreground-muted hover:text-foreground transition-colors"
          >
            {editing ? 'Lukk' : 'Endre'}
          </button>
        )}
      </div>

      {editing && changeable ? (
        <div className="space-y-2" role="radiogroup" aria-label="Velg billett">
          {options.map((opt) => (
            <PickerTile
              key={opt.id}
              option={opt}
              selected={selectedId === opt.id}
              onSelect={() => {
                onChange(opt.id);
                setEditing(false);
              }}
              isFree={isFree}
            />
          ))}
        </div>
      ) : (
        <ReadOnlyTile option={selected} isFree={isFree} />
      )}
    </div>
  );
}

function ReadOnlyTile({ option, isFree }: { option: TicketOption; isFree: boolean }) {
  return (
    <div className="rounded-lg bg-muted px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {option.label}
          </p>
          <p className="text-xs text-foreground-muted truncate">
            {option.sublabel}
          </p>
        </div>
        <p className="text-lg font-semibold tracking-tight text-foreground tabular-nums whitespace-nowrap">
          {isFree ? 'Gratis' : formatKroner(option.price)}
        </p>
      </div>
    </div>
  );
}

function PickerTile({
  option,
  selected,
  onSelect,
  isFree,
}: {
  option: TicketOption;
  selected: boolean;
  onSelect: () => void;
  isFree: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'w-full text-left rounded-lg px-4 py-3.5 transition-colors',
        selected ? 'bg-active' : 'bg-muted hover:bg-active/50',
      )}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0 flex items-baseline gap-3">
          <span
            className={cn(
              'inline-block size-4 rounded-full border shrink-0 translate-y-0.5',
              selected ? 'border-foreground bg-foreground' : 'border-border',
            )}
            aria-hidden
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {option.label}
            </p>
            <p className="text-xs text-foreground-muted truncate">
              {option.sublabel}
            </p>
          </div>
        </div>
        <p className="text-lg font-semibold tracking-tight text-foreground tabular-nums whitespace-nowrap">
          {isFree ? 'Gratis' : formatKroner(option.price)}
        </p>
      </div>
    </button>
  );
}

function CheckoutSummary({
  course,
  selectedOption,
  subtotal,
  fee,
  total,
}: {
  course: PublicCourseWithDetails;
  selectedOption: TicketOption | undefined;
  subtotal: number;
  fee: number;
  total: number;
}) {
  const isFree = subtotal === 0;
  const meta = buildMeta(course);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="p-5 space-y-5">
        <div>
          <p className="text-sm text-foreground-muted">{course.seller?.name}</p>
          <h3 className="mt-0.5 text-base font-semibold tracking-tight text-foreground">
            {course.title}
          </h3>
          {meta && (
            <p className="mt-2 text-sm text-foreground-muted">{meta}</p>
          )}
        </div>

        {selectedOption && (
          <>
            <div className="border-t border-border" />
            <div className="space-y-2 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-foreground">{selectedOption.label}</span>
                <span className="tabular-nums text-foreground">
                  {isFree ? 'Gratis' : formatKroner(selectedOption.price)}
                </span>
              </div>
              {!isFree && (
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-foreground-muted">Tjenestegebyr</span>
                  <span className="tabular-nums text-foreground-muted">
                    {formatKroner(fee)}
                  </span>
                </div>
              )}
            </div>
            <div className="border-t border-border" />
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-base font-medium text-foreground">Totalt</span>
              <span className="text-base font-semibold tabular-nums text-foreground">
                {isFree ? 'Gratis' : formatKroner(total)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DevBar({ variant, onVariantChange }: { variant: Variant; onVariantChange: (v: Variant) => void }) {
  return (
    <div className="border-b border-border bg-muted/30">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium text-foreground-muted">Variant</span>
        <select
          value={variant}
          onChange={(e) => onVariantChange(e.target.value as Variant)}
          className="text-sm border border-border rounded-md px-2 py-1 bg-background"
        >
          {(Object.keys(VARIANT_LABELS) as Variant[]).map((v) => (
            <option key={v} value={v}>{VARIANT_LABELS[v]}</option>
          ))}
        </select>
        <Badge variant="neutral" shape="pill" size="sm">Påmelding · combined</Badge>
        <span className="ml-auto text-xs text-foreground-muted">
          /dev/checkout-form-rework
        </span>
      </div>
    </div>
  );
}

const SHORT_WEEKDAYS = ['søn.', 'man.', 'tir.', 'ons.', 'tor.', 'fre.', 'lør.'] as const;

function buildMeta(course: PublicCourseWithDetails): string | null {
  const typeLabel =
    course.delivery_mode === 'online' ? 'Nettkurs'
    : course.format === 'series' ? 'Kursrekke'
    : 'Enkelttime';
  const m = course.time_schedule?.match(/(\d{1,2}:\d{2})/);
  const time = m ? m[1] : null;
  const dateStr = course.next_session?.session_date ?? course.start_date;
  if (course.format === 'series' && dateStr && time) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return `${typeLabel} · ${SHORT_WEEKDAYS[d.getDay()]} kl. ${time}`;
    }
  }
  if (time) return `${typeLabel} · kl. ${time}`;
  return typeLabel;
}

function buildOptions(course: PublicCourseWithDetails): TicketOption[] {
  const isFree = !course.price || course.price === 0;
  if (isFree) {
    return [{
      id: 'free',
      label: 'Gratis prøvetime',
      sublabel: 'Én klasse — ingen betaling',
      price: 0,
    }];
  }

  const opts: TicketOption[] = [];
  const isSeries = course.format === 'series';

  opts.push({
    id: 'main',
    label: isSeries ? 'Hele kurspakken' : 'Enkelttime',
    sublabel: isSeries && course.total_weeks
      ? `${course.total_weeks} uker — full pakke`
      : 'Én klasse',
    price: course.price ?? 0,
  });

  if (course.allows_drop_in && course.drop_in_price) {
    opts.push({
      id: 'drop-in',
      label: 'Drop-in',
      sublabel: 'Per gang — kjøp så lenge det er plass',
      price: course.drop_in_price,
    });
  }

  return opts;
}

function makeMockCourse(variant: Variant): PublicCourseWithDetails {
  const base: PublicCourseWithDetails = {
    id: 'mock-course',
    slug: 'vinyasa-flow',
    title: 'Vinyasa Flow',
    description: null,
    format: 'series',
    delivery_mode: 'in_person',
    status: 'active',
    location: 'InSPIRE Yogastudio · Sal 1',
    location_lat: null,
    location_lon: null,
    location_place_id: null,
    time_schedule: '18:00-19:15',
    duration: 75,
    max_participants: 14,
    price: 1990,
    allows_drop_in: true,
    drop_in_price: 249,
    accepts_late_signups: true,
    total_weeks: 8,
    start_date: '2026-04-08',
    end_date: '2026-06-03',
    image_url: null,
    seller_id: 'mock',
    spots_available: 2,
    seller: {
      name: 'InSPIRE Yogastudio',
      slug: 'mock-studio',
      logo_url: null,
      stripe_onboarding_complete: true,
      default_course_image_url: null,
    },
    instructor_name: null,
    instructor: null,
    instructors: [],
    next_session: {
      session_date: '2026-04-08',
      session_number: 1,
      total_sessions: 8,
    },
    upcoming_session_dates: [],
  };

  switch (variant) {
    case 'series-only':
      return { ...base, allows_drop_in: false, drop_in_price: null };
    case 'single':
      return {
        ...base,
        format: 'single',
        total_weeks: null,
        end_date: null,
        title: 'Fullmåne-workshop',
        allows_drop_in: false,
        drop_in_price: null,
        price: 450,
        duration: 120,
      };
    case 'free':
      return {
        ...base,
        format: 'single',
        total_weeks: null,
        end_date: null,
        title: 'Gratis prøvetime',
        price: 0,
        allows_drop_in: false,
        drop_in_price: null,
        spots_available: 8,
      };
    default:
      return base;
  }
}

export default CheckoutFormReworkPreview;

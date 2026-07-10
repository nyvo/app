import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft } from '@/lib/icons';
import { formatCoursePrice } from '@/lib/utils';
import { calculateServiceFee } from '@/lib/pricing';
import {
  BillettSection,
  CheckoutStepHeader,
  CheckoutSummary,
  ContactFields,
  ContactSubmitSection,
  PayButtonRow,
  type FormState,
} from '@/pages/public/CheckoutPage';
import {
  buildMainTierConstraintLabel,
  buildNextSessionLabel,
} from '@/components/public/course-details/schedule-format';
import type { TicketId } from '@/components/public/course-details/BookingRailLite';
import type { PublicCourseWithDetails } from '@/services/publicCourses';
import type { AvailableTicketType } from '@/types/database';

/**
 * Preview for the T1 checkout step ("Fullfør påmeldingen") — the real page
 * needs live Supabase data + a Stripe PaymentIntent, so this composes the
 * page's own exported pieces (BillettSection, ContactFields,
 * ContactSubmitSection, CheckoutSummary, CheckoutStepHeader, PayButtonRow)
 * with mock data. Only the page-level wrappers (header, back link, grid) are
 * copied; every visible section renders through the shipped components, so
 * the preview can't drift from the live checkout.
 *
 * The Stripe Payment Element itself can't mount without a client secret —
 * the 'betaling' variant renders a labeled placeholder panel in its slot.
 */

type Variant = 'to-billetter' | 'drop-in' | 'startet' | 'enkelt' | 'gratis' | 'betaling';

const VARIANT_LABELS: Record<Variant, string> = {
  'to-billetter': 'To billetter (Hele kurset valgt)',
  'drop-in': 'Drop-in valgt (neste økt-linje)',
  startet: 'Startet (prorata-kvittering: 2200 − 550)',
  enkelt: 'Enkeltkurs (én billett, ingen billettvelger)',
  gratis: 'Gratis kurs (uten gebyr og betaling)',
  betaling: 'Betalingssteg (billett låst, Stripe-plassholder)',
};

const CheckoutT1Preview = () => {
  const [variant, setVariant] = useState<Variant>('to-billetter');

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <DevBar variant={variant} onVariantChange={setVariant} />
      {/* key resets tier/form state when the variant switches */}
      <PreviewBody key={variant} variant={variant} />
    </div>
  );
};

function PreviewBody({ variant }: { variant: Variant }) {
  const course = makeMockCourse(variant);
  const tiers = makeMockTiers(variant, course);
  const mainTier = tiers.find((t) => t.ticket_kind !== 'drop_in') ?? null;
  const dropInTier = tiers.find((t) => t.ticket_kind === 'drop_in') ?? null;
  const showBillett = tiers.length === 2 && !!mainTier && !!dropInTier;

  const [selectedKind, setSelectedKind] = useState<TicketId>(
    variant === 'drop-in' ? 'drop-in' : 'main',
  );
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    phone: '',
    note: '',
    terms: false,
  });

  const step: 'contact' | 'payment' = variant === 'betaling' ? 'payment' : 'contact';
  const isFree = variant === 'gratis';

  const selectedTier =
    selectedKind === 'drop-in' && dropInTier ? dropInTier : mainTier;
  const subtotal = selectedTier?.price ?? 0;
  const fee = calculateServiceFee(subtotal);
  const total = subtotal + fee;

  // Constraint line under the Billett toggle — same helpers the real page
  // uses; the drop-in "next session" is a fixed mock date.
  const nextDropInSession = mockNextDropInSession(variant);
  const constraintLabel =
    selectedKind === 'drop-in'
      ? buildNextSessionLabel(nextDropInSession)
      : mainTier
        ? buildMainTierConstraintLabel(course, mainTier)
        : null;

  return (
    <>
      <header className="flex w-full items-center justify-center px-4 py-8 sm:px-6">
        <Link to="/" className="flex select-none items-center">
          <span className="text-base font-medium text-foreground">Openspot</span>
        </Link>
      </header>
      <div className="mx-auto max-w-6xl w-full px-4 sm:px-6 lg:px-8 pb-16">
        <button
          type="button"
          className="focus-ring mb-8 rounded inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground transition-colors cursor-pointer"
        >
          <ChevronLeft className="size-4" strokeWidth={1.75} />
          {step === 'payment' ? 'Tilbake' : 'Tilbake til kurset'}
        </button>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1fr)_320px] md:gap-8 md:items-start lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
          <div className="space-y-6 max-w-[552px] min-w-0">
            {showBillett && mainTier && dropInTier && (
              <BillettSection
                mainTier={mainTier}
                dropInTier={dropInTier}
                selectedKind={selectedKind}
                onSelect={setSelectedKind}
                constraintLabel={constraintLabel}
                lowStock
                spotsLeft={3}
                disabled={step === 'payment'}
              />
            )}

            {step === 'contact' ? (
              <>
                <CheckoutStepHeader step={1} showSteps={!isFree} />

                {/* Mobile-only condensed summary — same block the live page
                    renders above the form on <md. */}
                <div className="md:hidden">
                  <div className="flex items-center justify-between gap-3 rounded-lg bg-panel px-4 py-3">
                    <span className="truncate text-sm font-medium text-foreground">{course.title}</span>
                    <span className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                      {formatCoursePrice(total)}
                    </span>
                  </div>
                </div>

                <form onSubmit={(e) => e.preventDefault()} noValidate className="space-y-6">
                  <ContactFields
                    form={form}
                    setForm={setForm}
                    nameError={null}
                    emailError={null}
                    phoneError={null}
                    termsError={null}
                  />
                  <ContactSubmitSection
                    isFree={isFree}
                    submitting={false}
                    dropInResolving={false}
                    disabled={false}
                    sessionError={null}
                    showDropInLookupFailed={false}
                    showNoUpcomingDropIn={false}
                    sellerName={course.seller?.name ?? null}
                  />
                </form>
              </>
            ) : (
              <>
                <CheckoutStepHeader step={2} />

                <div id="payment" className="scroll-mt-6">
                  <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
                    {/* Placeholder in the Stripe Payment Element's slot — the
                        real element needs a live PaymentIntent client secret. */}
                    <div className="flex h-40 items-center justify-center rounded-xl bg-panel text-sm text-foreground-muted">
                      Stripe Payment Element
                    </div>
                    <PayButtonRow total={total} submitting={false} disabled={false} />
                  </form>
                </div>
              </>
            )}
          </div>

          <aside>
            <div className="md:sticky md:top-10">
              <CheckoutSummary
                course={course}
                selectedTier={selectedTier}
                subtotal={subtotal}
                fee={fee}
                total={total}
                isFree={isFree}
              />
            </div>
          </aside>
        </div>
      </div>
    </>
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
        <Badge variant="neutral" shape="pill" size="sm">Checkout T1</Badge>
        <span className="ml-auto text-xs text-foreground-muted">/dev/checkout-t1-preview</span>
      </div>
    </div>
  );
}

// ── Mock data ───────────────────────────────────────────────────────────

/** Next drop-in session for the constraint line — a Tuesday matching the
 * course's weekday so "Neste økt: tir. …" reads consistently. */
function mockNextDropInSession(variant: Variant): { session_date: string; start_time: string } {
  return variant === 'startet'
    ? { session_date: '2026-07-14', start_time: '18:00:00' }
    : { session_date: '2026-08-11', start_time: '18:00:00' };
}

function makeMockCourse(variant: Variant): PublicCourseWithDetails {
  const base: PublicCourseWithDetails = {
    id: 'mock-course',
    slug: 'yoga-for-nybegynnere',
    title: 'Yoga for nybegynnere',
    description: null,
    format: 'series',
    delivery_mode: 'in_person',
    status: 'active',
    location: 'Fjell Yoga Oslo, Thorvald Meyers gate 45',
    location_lat: null,
    location_lon: null,
    location_place_id: null,
    time_schedule: '18:00-19:30',
    duration: 90,
    max_participants: 15,
    price: 2200,
    allows_drop_in: true,
    drop_in_price: 250,
    total_weeks: 8,
    start_date: '2026-08-11',
    end_date: '2026-09-29',
    image_url: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=400',
    instructor_name: 'Ingrid Larsen',
    accepts_late_signups: true,
    seller_id: 'mock-seller',
    spots_available: 3,
    seller: {
      name: 'Fjell Yoga Oslo',
      slug: 'fjellyoga',
      logo_url: null,
      stripe_onboarding_complete: true,
      default_course_image_url: null,
    },
    instructor: { id: 'mock-course:primary-instructor', name: 'Ingrid Larsen', role: 'primary', display_order: 0 },
    instructors: [{ id: 'mock-course:primary-instructor', name: 'Ingrid Larsen', role: 'primary', display_order: 0 }],
    next_session: { session_date: '2026-08-11', session_number: 1, total_sessions: 8 },
    upcoming_session_dates: [],
  };

  switch (variant) {
    case 'startet':
      return {
        ...base,
        start_date: '2026-06-23',
        end_date: '2026-08-11',
        next_session: { session_date: '2026-07-14', session_number: 4, total_sessions: 8 },
      };
    case 'enkelt':
      return {
        ...base,
        format: 'single',
        title: 'Helgeworkshop: Yin og pust',
        total_weeks: null,
        start_date: '2026-08-15',
        end_date: null,
        time_schedule: '10:00-13:00',
        duration: 180,
        price: 1400,
        allows_drop_in: false,
        drop_in_price: null,
        next_session: { session_date: '2026-08-15', session_number: 1, total_sessions: 1 },
      };
    case 'gratis':
      return {
        ...base,
        format: 'single',
        title: 'Gratis prøvetime',
        total_weeks: null,
        start_date: '2026-08-15',
        end_date: null,
        time_schedule: '10:00-11:00',
        duration: 60,
        price: 0,
        allows_drop_in: false,
        drop_in_price: null,
        image_url: null,
        next_session: { session_date: '2026-08-15', session_number: 1, total_sessions: 1 },
      };
    default:
      return base;
  }
}

/** Mock tier rows shaped like `available_ticket_types` output. The 'startet'
 * variant returns the package tier already prorated (price + weeks reduced),
 * exactly as the RPC does once a series has held sessions. */
function makeMockTiers(variant: Variant, course: PublicCourseWithDetails): AvailableTicketType[] {
  const mainLabel = variant === 'gratis' ? 'Prøvetime' : 'Hele kurset';
  const tiers: AvailableTicketType[] = [
    {
      id: 'tier-main',
      course_id: course.id,
      label: mainLabel,
      description: '',
      price: variant === 'startet' ? 1650 : (course.price ?? 0),
      weeks: variant === 'startet' ? 6 : (course.format === 'series' ? (course.total_weeks ?? 1) : 1),
      ticket_kind: 'package',
      audience: 'standard',
      is_default: true,
      display_order: 0,
      sales_starts_at: '',
      sales_ends_at: '',
      max_quantity: 0,
      seats_remaining: 0,
    },
  ];
  if (course.allows_drop_in && course.drop_in_price) {
    tiers.push({
      id: 'tier-drop-in',
      course_id: course.id,
      label: 'Drop-in',
      description: '',
      price: course.drop_in_price,
      weeks: 1,
      ticket_kind: 'drop_in',
      audience: 'standard',
      is_default: false,
      display_order: 1,
      sales_starts_at: '',
      sales_ends_at: '',
      max_quantity: 0,
      seats_remaining: 0,
    });
  }
  return tiers;
}

export default CheckoutT1Preview;

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { CourseDetailContent } from '@/components/public/course-details/CourseDetailContent';
import { getBookingTiles } from '@/components/public/course-details/BookingRailLite';
import { buildDropInSublabel } from '@/components/public/course-details/schedule-format';
import { MobilePriceBar } from '@/components/public/course-details/MobilePriceBar';
import { calculateTotalPrice } from '@/lib/pricing';
import type { PublicCourseWithDetails } from '@/services/publicCourses';
import type { AvailableTicketType, CourseSession } from '@/types/database';

/**
 * Preview for the T1 "Magasin" course-detail rework (CTA-first: no tier
 * selection on the page, single elevated booking card, tier choice moves to
 * checkout). Renders the SAME `CourseDetailContent` the real
 * `PublicCourseDetailPage` uses — no local re-implementation — so this
 * preview can never drift from what ships.
 */

type Variant =
  | 'normal'
  | 'startet'
  | 'enkelt'
  | 'uten-bilde'
  | 'fullt'
  | 'pakke-full'
  | 'gratis'
  | 'avlyst-okt'
  | 'enkelt-fullt'
  | 'enkelt-gratis';

const VARIANT_LABELS: Record<Variant, string> = {
  normal: 'Normal (2 billetter, bilde, 3 plasser)',
  startet: 'Startet (prorata: 6 av 8 økter, 1650 av 2200 kr)',
  enkelt: 'Enkeltkurs (én billett, ingen drop-in)',
  'uten-bilde': 'Uten bilde',
  fullt: 'Fullt (helt utsolgt)',
  'pakke-full': 'Kurspakken full, drop-in åpen',
  gratis: 'Gratis kurs',
  'avlyst-okt': 'Avlyst økt i timeplanen',
  'enkelt-fullt': 'Enkeltkurs, fullt',
  'enkelt-gratis': 'Enkeltkurs, gratis',
};

const DetailT1Preview = () => {
  const [variant, setVariant] = useState<Variant>('normal');
  const course = useMemo(() => makeMockCourse(variant), [variant]);
  const sessions = useMemo(() => makeMockSessions(course.id, variant), [course.id, variant]);
  const tiers = useMemo(() => makeMockTiers(course, variant), [course, variant]);

  const { tiles, courseFull, soldOut, closed, spotsLeft, lowStock } = getBookingTiles(
    course,
    tiers,
    buildDropInSublabel(sessions),
  );
  const checkoutHref = '/dev/checkout-form-rework';
  const mainTile = tiles.find((t) => t.id === 'main') ?? tiles[0] ?? null;
  const mobileTotal = calculateTotalPrice(mainTile?.amount ?? 0);
  const paymentNotReady = tiles.some((t) => t.amount > 0) && !course.seller?.stripe_onboarding_complete;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <DevBar variant={variant} onVariantChange={setVariant} />

      <header className="flex w-full items-center justify-center px-4 py-8 sm:px-6">
        <Link to="/" className="flex select-none items-center">
          <span className="text-base font-medium text-foreground">Openspot</span>
        </Link>
      </header>

      <main className="flex-1">
        <CourseDetailContent
          course={course}
          sessions={sessions}
          tiles={tiles}
          courseFull={courseFull}
          soldOut={soldOut}
          closed={closed}
          spotsLeft={spotsLeft}
          lowStock={lowStock}
          checkoutHref={checkoutHref}
          backHref="/dev/detail-t1-preview"
        />
        <MobilePriceBar
          selectedTile={mainTile}
          total={mobileTotal}
          href={checkoutHref}
          soldOut={soldOut}
          closed={closed}
          paymentNotReady={paymentNotReady}
          ctaLabel="Meld deg på"
        />
      </main>
    </div>
  );
};

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
        <Badge variant="neutral" shape="pill" size="sm">Detail T1</Badge>
        <span className="ml-auto text-xs text-foreground-muted">/dev/detail-t1-preview</span>
      </div>
    </div>
  );
}

// ── Mock data ───────────────────────────────────────────────────────────

function makeMockCourse(variant: Variant): PublicCourseWithDetails {
  const base: PublicCourseWithDetails = {
    id: 'mock-course',
    slug: 'yoga-for-nybegynnere',
    title: 'Yoga for nybegynnere',
    description:
      'Vi går gjennom grunnstillingene i et tempo der ingen blir hengende etter. Du trenger ikke ta med noe: matter og blokker ligger i studio.\n\nKurset holdes av Ingrid Larsen, tirsdager kl. 18:00–19:30.',
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
    image_url: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=1200',
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

  const enkelt: PublicCourseWithDetails = {
    ...base,
    format: 'single',
    title: 'Helgeworkshop: Yin og pust',
    description: 'En rolig lørdag med yin-yoga og pustøvelser. Passer for alle nivåer, ingen erfaring nødvendig.',
    total_weeks: null,
    start_date: '2026-08-15',
    end_date: null,
    time_schedule: '10:00-13:00',
    duration: 180,
    price: 1400,
    allows_drop_in: false,
    drop_in_price: null,
    max_participants: 12,
    spots_available: 6,
    instructor_name: null,
    instructor: null,
    instructors: [],
    next_session: { session_date: '2026-08-15', session_number: 1, total_sessions: 1 },
  };

  switch (variant) {
    case 'startet':
      return {
        ...base,
        start_date: '2026-06-23',
        end_date: '2026-08-11',
      };
    case 'enkelt':
      return enkelt;
    case 'enkelt-fullt':
      return { ...enkelt, spots_available: 0 };
    case 'enkelt-gratis':
      return { ...enkelt, price: 0 };
    case 'uten-bilde':
      return { ...base, image_url: null };
    case 'fullt':
    case 'pakke-full':
      return { ...base, spots_available: 0 };
    case 'gratis':
      return { ...base, price: 0, allows_drop_in: false, drop_in_price: null, spots_available: 8 };
    default:
      return base;
  }
}

/** Mock tier rows shaped like `available_ticket_types` output — what the
 * real page passes to `getBookingTiles`. */
function makeMockTiers(course: PublicCourseWithDetails, variant: Variant): AvailableTicketType[] {
  // Fully sold out: the RPC returns no purchasable tiers at all (package
  // withheld on courseFull, drop-in gated on next-session capacity).
  if (variant === 'fullt' || variant === 'enkelt-fullt') return [];

  const tiers: AvailableTicketType[] = [
    {
      id: 'tier-main',
      course_id: course.id,
      label: course.format === 'series' ? 'Hele kurset' : 'Hele kurset',
      description: '',
      // The started-course edge: the RPC returns the package tier already
      // prorated (price + weeks reduced), never the original course.price.
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

function makeMockSessions(courseId: string, variant: Variant): CourseSession[] {
  const session = (
    id: string,
    session_date: string,
    session_number: number,
    start_time = '18:00:00',
    end_time = '19:30:00',
  ): CourseSession => ({
    id,
    course_id: courseId,
    session_date,
    session_number,
    start_time,
    end_time,
    status: 'upcoming',
    notes: null,
    reminder_sent_at: null,
    created_at: null,
    updated_at: null,
  });

  if (variant.startsWith('enkelt')) {
    return [session('s1', '2026-08-15', 1, '10:00:00', '13:00:00')];
  }

  const dates =
    variant === 'startet'
      ? ['2026-06-23', '2026-06-30', '2026-07-07', '2026-07-14', '2026-07-21', '2026-07-28', '2026-08-04', '2026-08-11']
      : ['2026-08-11', '2026-08-18', '2026-08-25', '2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22', '2026-09-29'];

  return dates.map((d, i) => {
    const row = session(`s${i + 1}`, d, i + 1);
    // Session-level cancellation (the only public «avlyst» state today — a
    // fully cancelled course never reaches the public page).
    if (variant === 'avlyst-okt' && i === 2) return { ...row, status: 'cancelled' };
    return row;
  });
}

export default DetailT1Preview;

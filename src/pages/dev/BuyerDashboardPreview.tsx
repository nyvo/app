import { DevPage, PreviewSection } from './_kit';
import { PageState } from '@/components/page-state/page-state';
import { BuyerDashboardBody, DashboardSkeleton } from '@/pages/teacher/BuyerDashboard';
import type { BuyerSignup } from '@/services/signups';

/**
 * `/dev/buyer-dashboard-preview` — every state of the buyer's `/overview`
 * (`src/pages/teacher/BuyerDashboard.tsx`, picked by `DashboardRouter` when the
 * user is not a seller). Mounts the REAL `BuyerDashboardBody` + `DashboardSkeleton`
 * with mock `BuyerSignup` rows — no hand-rolled copy — so this preview can't
 * drift from what ships. The final "feil" panel mirrors the router-level error
 * (`DashboardRouter` shows a page `server-error` when the seller-membership
 * fetch fails and it can't tell buyer from seller).
 */

// ─── Mock data ────────────────────────────────────────────────────────────
// Shape matches `BuyerSignup` (src/services/signups.ts) — the exact projection
// `fetchMySignups` returns, so plain typed literals are enough.

const MOCK_SELLER = {
  name: 'Fjell Yoga Oslo',
  logo_url: null,
  slug: 'fjellyoga',
};

function isoDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function mockSignup(overrides: {
  id: string;
  status?: BuyerSignup['status'];
  amount_paid?: number | null;
  createdDaysAgo?: number;
  title: string;
  slug?: string;
  start_date: string | null;
  end_date?: string | null;
  image_url?: string | null;
  seller?: { name: string; logo_url: string | null; slug: string } | null;
}): BuyerSignup {
  const {
    id,
    status = 'confirmed',
    amount_paid = 2200,
    createdDaysAgo = 3,
    title,
    slug = 'yoga-for-nybegynnere',
    start_date,
    end_date = null,
    image_url = null,
    seller = MOCK_SELLER,
  } = overrides;
  return {
    id,
    status,
    amount_paid,
    created_at: daysAgoIso(createdDaysAgo),
    course: {
      id: `course-${id}`,
      title,
      slug,
      start_date,
      end_date,
      time_schedule: '18:00-19:30',
      location: 'Fjell Yoga Oslo, Thorvald Meyers gate 45',
      image_url,
      seller,
    },
  };
}

// Kommende + Tidligere, exercising every row branch: paid w/ image, free
// ("Gratis"), image fallback, a past booking, an "Avmeldt" (buyer-cancelled)
// and an "Avlyst" (course-cancelled) badge, plus a row whose course lost its
// slug (inert, non-link title).
const MOCK_SIGNUPS: BuyerSignup[] = [
  mockSignup({
    id: '1',
    title: 'Yoga for nybegynnere',
    slug: 'yoga-for-nybegynnere',
    start_date: isoDateOffset(6),
    end_date: isoDateOffset(55),
    amount_paid: 2200,
    image_url: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=400',
    createdDaysAgo: 2,
  }),
  mockSignup({
    id: '2',
    title: 'Nettkurs: Pilates hjemme',
    slug: 'nettkurs-pilates',
    start_date: isoDateOffset(12),
    amount_paid: 0,
    createdDaysAgo: 4,
  }),
  mockSignup({
    id: '3',
    title: 'Helgeworkshop: Yin og pust',
    slug: 'helgeworkshop-yin-og-pust',
    start_date: isoDateOffset(20),
    amount_paid: 1400,
    createdDaysAgo: 6,
  }),
  mockSignup({
    id: '4',
    title: 'Styrke for viderekomne',
    slug: 'styrke-for-viderekomne',
    start_date: isoDateOffset(-14),
    end_date: isoDateOffset(-2),
    amount_paid: 2400,
    createdDaysAgo: 40,
  }),
  mockSignup({
    id: '5',
    title: 'Morgenmeditasjon',
    slug: 'morgenmeditasjon',
    status: 'cancelled',
    start_date: isoDateOffset(9),
    amount_paid: 300,
    createdDaysAgo: 8,
  }),
  mockSignup({
    id: '6',
    title: 'Styrke og smidighet',
    slug: 'styrke-og-smidighet',
    status: 'course_cancelled',
    start_date: isoDateOffset(15),
    amount_paid: 450,
    createdDaysAgo: 10,
    // Studio identity missing → title + seller render as inert plain text
    // (no public-course / storefront links).
    seller: null,
  }),
];

const noop = () => {};

export default function BuyerDashboardPreview() {
  return (
    <DevPage
      title="Oversikt (kjøper)"
      description="Alle tilstandene til kjøperens /overview (BuyerDashboard) — mine påmeldinger delt i Kommende/Tidligere, tomt, laster og feil. Siste panel speiler DashboardRouters rolle-feil. Ingen håndlaget markup: hver seksjon monterer den ekte BuyerDashboardBody / DashboardSkeleton."
    >
      <PreviewSection
        label="Med påmeldinger"
        description="Kommende (betalt med bilde, gratis, bilde-fallback) og Tidligere (fullført, «Avmeldt», «Avlyst»). Kurstittel og studio lenker til de offentlige sidene; siste rad mangler slug og er derfor inert."
      >
        <BuyerDashboardBody signups={MOCK_SIGNUPS} loadFailed={false} onRetry={noop} />
      </PreviewSection>

      <PreviewSection
        label="Tomt — ingen påmeldinger"
        description="EmptyState: «Ingen påmeldinger ennå»."
      >
        <BuyerDashboardBody signups={[]} loadFailed={false} onRetry={noop} />
      </PreviewSection>

      <PreviewSection
        label="Laster"
        description="DashboardSkeleton — speiler rad-anatomien (bak DelayedFallback i produksjon, vist direkte her)."
      >
        <DashboardSkeleton />
      </PreviewSection>

      <PreviewSection
        label="Feil — henting av påmeldinger"
        description="ErrorState med «Prøv igjen» — henting feilet, eller kravet av gjeste-påmeldinger kunne ikke bekreftes."
      >
        <BuyerDashboardBody signups={null} loadFailed onRetry={noop} />
      </PreviewSection>

      <PreviewSection
        label="Feil — ukjent rolle (DashboardRouter)"
        description="Selger-medlemskapet kunne ikke hentes, så ruteren viser en side-feil i stedet for å gjette kjøper vs. selger — PageState variant=«server-error»."
      >
        <PageState variant="server-error" as="div" />
      </PreviewSection>
    </DevPage>
  );
}

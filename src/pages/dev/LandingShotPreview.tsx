import { useState } from 'react';
import { AuthContext, type AuthContextType } from '@/contexts/AuthContext';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { PageShell } from '@/components/teacher/PageShell';
import { NotificationsPopover } from '@/components/notifications/NotificationsPopover';
import { IncomeChart } from '@/components/teacher/dashboard/IncomeChart';
import {
  RecentSignupsSection,
  UpcomingCoursesSection,
} from '@/pages/teacher/TeacherDashboard';
import { buildMockIncome, isoDateOffset, mockSignup } from './DashboardPreview';
import type { Profile, Seller } from '@/types/database';
import type { Course as DashboardCourse } from '@/types/dashboard';
import type { IncomeRange } from '@/services/income';

/**
 * `/dev/landing-shot` — the STAGED SOURCE for the landing page's hero
 * screenshot (public/landing-dashboard.webp). Renders the real app shell
 * (TeacherSidebar + PageShell) around the real dashboard sections, fed with
 * pretty mock data whose dates are always relative to "now" — so the shot
 * can be re-captured any time the dashboard UI changes.
 *
 * Capture with: `node scripts/capture-landing-hero.mjs` (dev server must be
 * running; see the script header for options).
 *
 * The sidebar reads useAuth(), so we inject a staged AuthContext value. The
 * cast below is dev-only: sidebar/notifications consume a handful of fields;
 * queries fired with the fake seller id fail silently (setup card hides on
 * loadFailed, notifications bell renders without a badge) — which is exactly
 * the polished, setup-complete look the marketing shot needs.
 */

const MOCK_SELLER = {
  id: 'landing-shot-seller',
  name: 'Flyt Studio',
  subscription_plan: 'pro', // Pro → no upsell card in the sidebar footer
} as unknown as Seller;

const MOCK_PROFILE = {
  id: 'landing-shot-profile',
  name: 'Flyt Studio',
  email: 'hei@flytstudio.no',
  role: 'seller',
} as unknown as Profile;

const MOCK_AUTH = {
  user: null,
  profile: MOCK_PROFILE,
  session: null,
  isLoading: false,
  isInitialized: true,
  initPromise: Promise.resolve(),
  currentSeller: MOCK_SELLER,
  sellers: [MOCK_SELLER],
  userRole: 'owner',
  sellersLoadFailed: false,
  currentSellerHydrateFailed: false,
  signOut: async () => {},
} as unknown as AuthContextType;

const NEXT_COURSES: DashboardCourse[] = [
  {
    id: 'morning-flow',
    title: 'Morning Flow',
    subtitle: 'Enkeltkurs',
    time: '09:00',
    type: 'event',
    date: isoDateOffset(0),
    signups: 8,
    capacity: 10,
  },
  {
    id: 'vinyasa',
    title: 'Vinyasa Flow',
    subtitle: 'Kursrekke',
    time: '18:00',
    type: 'course-series',
    date: isoDateOffset(1),
    signups: 12,
    capacity: 14,
  },
  {
    id: 'yin',
    title: 'Yin Yoga',
    subtitle: 'Enkeltkurs',
    time: '20:00',
    type: 'event',
    date: isoDateOffset(3),
    signups: 4,
    capacity: 12,
  },
];

const RECENT_SIGNUPS = [
  mockSignup('1', 'Olav Hansen', 'Morning Flow', 2),
  mockSignup('2', 'Mari Eriksen', 'Vinyasa Flow', 5),
  mockSignup('3', 'Anne Sørensen', 'Yin Yoga', 26),
];

export default function LandingShotPreview() {
  const [range, setRange] = useState<IncomeRange>('month');
  const incomeSeries = buildMockIncome(range);

  return (
    <AuthContext.Provider value={MOCK_AUTH}>
      <SidebarProvider>
        <TeacherSidebar />
        <SidebarInset>
          <div className="flex-1 min-h-full overflow-y-auto bg-canvas">
            <PageShell title="Oversikt" action={<NotificationsPopover />}>
              <div className="space-y-12">
                <IncomeChart
                  series={incomeSeries}
                  isLoading={false}
                  range={range}
                  onRangeChange={setRange}
                />
                <div className="grid grid-cols-1 gap-y-6 lg:grid-cols-2 lg:gap-y-0">
                  <UpcomingCoursesSection courses={NEXT_COURSES} isLoading={false} />
                  <RecentSignupsSection
                    signups={RECENT_SIGNUPS}
                    isLoading={false}
                    onSelect={() => {}}
                  />
                </div>
              </div>
            </PageShell>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthContext.Provider>
  );
}

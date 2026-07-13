import { lazy, Suspense } from 'react';
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Outlet,
  Route,
  RouterProvider,
  useLocation,
  useParams,
} from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DelayedFallback } from './components/ui/delayed-fallback';
import { PageSkeleton } from './components/ui/page-skeleton';
import { RESERVED_SLUGS } from '@/lib/reservedSlugs';
import { useAuth } from '@/contexts/AuthContext';

import { RoleRoute } from './components/RoleRoute';

// Lazy load all route components for code splitting.
// TeacherLayout too: it pulls the sidebar, icon set and course drawer into
// whatever chunk it lands in — eager, that was the ENTRY chunk, so anonymous
// buyers downloaded the dashboard chrome before checkout could render. It
// stays mounted across dashboard routes once loaded; lazy only moves the
// module into its own chunk behind the existing root Suspense.
const TeacherLayout = lazy(() => import('./layouts/TeacherLayout'));
const DashboardRouter = lazy(() => import('./pages/teacher/DashboardRouter'));
const GetStartedPage = lazy(() => import('./pages/teacher/GetStartedPage'));
const HelpPage = lazy(() => import('./pages/teacher/HelpPage'));
const SchedulePage = lazy(() => import('./pages/teacher/SchedulePage'));
const CoursesPage = lazy(() => import('./pages/teacher/CoursesPage'));
const CourseBuilderPage = lazy(() => import('./pages/teacher/CourseBuilderPage'));
const CoursePage = lazy(() => import('./pages/teacher/CoursePage'));
const TeacherProfilePage = lazy(() => import('./pages/teacher/TeacherProfilePage'));
const BillingPage = lazy(() => import('./pages/teacher/BillingPage'));
const PaymentsPage = lazy(() => import('./pages/teacher/PaymentsPage'));
const StudioPage = lazy(() => import('./pages/teacher/StudioPage'));
const PublicCoursesPage = lazy(() => import('./pages/public/PublicCoursesPage'));
const EmbedCalendarPage = lazy(() => import('./pages/public/EmbedCalendarPage'));
const EmbedPreviewPage = lazy(() => import('./pages/public/EmbedPreviewPage'));
const PublicCourseDetailPage = lazy(() => import('./pages/public/PublicCourseDetailPage'));
const CheckoutPage = lazy(() => import('./pages/public/CheckoutPage'));
const LandingPage = lazy(() => import('./pages/public/LandingPage'));
const AuthPage = lazy(() => import('./pages/public/AuthPage'));
const TermsPage = lazy(() => import('./pages/public/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/public/PrivacyPage'));
const AboutPage = lazy(() => import('./pages/public/AboutPage'));
const CheckoutSuccessPage = lazy(() => import('./pages/public/CheckoutSuccessPage'));
const AuthCallbackPage = lazy(() => import('./pages/public/AuthCallbackPage'));
const JoinPage = lazy(() => import('./pages/public/JoinPage'));
const OnboardingPage = lazy(() => import('./pages/onboarding/OnboardingPage'));

const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
// Dev preview gallery (DEV-only, tree-shaken from production). Index hub +
// live-backed previews of the real product surfaces in their default / empty /
// error / loading states. See src/pages/dev/DevIndex.tsx for the full map.
const DevIndex = lazy(() => import('./pages/dev/DevIndex'));
// Foundations
const TokensPreview = lazy(() => import('./pages/dev/TokensPreview'));
const PrimitivesPreview = lazy(() => import('./pages/dev/PrimitivesPreview'));
const StatesPreview = lazy(() => import('./pages/dev/StatesPreview'));
const SettingsRowsPreview = lazy(() => import('./pages/dev/SettingsRowsPreview'));
// Seller — dashboard & daily
const DashboardPreview = lazy(() => import('./pages/dev/DashboardPreview'));
const IncomeChartPreview = lazy(() => import('./pages/dev/IncomeChartPreview'));
const CoursesListPreview = lazy(() => import('./pages/dev/CoursesListPreview'));
const CourseBuilderLivePreview = lazy(() => import('./pages/dev/CourseBuilderLivePreview'));
const DraftExperiencePreview = lazy(() => import('./pages/dev/DraftExperiencePreview'));
const SchedulePreview = lazy(() => import('./pages/dev/SchedulePreview'));
const SessionDaysPreview = lazy(() => import('./pages/dev/SessionDaysPreview'));
// Seller — money & studio
const PayoutPreview = lazy(() => import('./pages/dev/PayoutPreview'));
const BillingPreview = lazy(() => import('./pages/dev/BillingPreview'));
const StudioPreview = lazy(() => import('./pages/dev/StudioPreview'));
const EmbedCodePreview = lazy(() => import('./pages/dev/EmbedCodePreview'));
// Buyer / public
const BuyerDashboardPreview = lazy(() => import('./pages/dev/BuyerDashboardPreview'));
const StorefrontPreview = lazy(() => import('./pages/dev/StorefrontPreview'));
const DetailT1Preview = lazy(() => import('./pages/dev/DetailT1Preview'));
const CheckoutT1Preview = lazy(() => import('./pages/dev/CheckoutT1Preview'));
const EmbedPreview = lazy(() => import('./pages/dev/EmbedPreview'));
// Onboarding
const OnboardingPreview = lazy(() => import('./pages/dev/OnboardingPreview'));

// Public team page at root: only renders if the slug is NOT a reserved word.
// Reserved words 404 (since they should hit a literal route higher in the
// table; if they didn't, the route doesn't exist).
function FlatTeamRoute({ children }: { children: React.ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  if (!slug || RESERVED_SLUGS.has(slug.toLowerCase())) {
    return <NotFoundPage />;
  }
  return <>{children}</>;
}

/**
 * Root path (`/`) is conditional. Logged-in users redirect to their
 * dashboard at /overview; logged-out users see the public LandingPage.
 * Auth init shows a fullscreen loader to avoid flicker.
 */
function RootRoute() {
  const { isInitialized, user } = useAuth();
  // Auth init is cached and usually <200ms. A delayed skeleton renders nothing
  // for fast loads (Studio § 10) but keeps a slow init distinguishable from a
  // crash rather than an indefinite blank.
  if (!isInitialized) return <DelayedFallback><PageSkeleton /></DelayedFallback>;
  if (user) return <Navigate to="/overview" replace />;
  return <LandingPage />;
}

/**
 * Skip link (WCAG 2.4.1) — first tabbable element; visually hidden until
 * focused. Focuses the page's <main> landmark directly since routes render
 * their own <main> without a shared id.
 */
function SkipLink() {
  return (
    <a
      href="#main"
      onClick={(e) => {
        e.preventDefault();
        const main = document.querySelector('main');
        if (main) {
          main.setAttribute('tabindex', '-1');
          main.focus({ preventScroll: false });
        }
      }}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:border focus:border-border focus:outline-none focus:ring-2 focus:ring-ring"
    >
      Hopp til hovedinnholdet
    </a>
  );
}

/**
 * Root chrome — toaster + error boundary + suspense wrap every route via a
 * pathless layout route. Lives *inside* the router (data mode) so route
 * components can use useBlocker for unsaved-changes guards.
 */
function RootChrome() {
  const location = useLocation();
  return (
    <>
      <SkipLink />
      <Toaster />
      {/* resetKeys by pathname: after a crash, navigating (incl. browser-back)
          clears the error state so the user isn't stuck on the error page. */}
      <ErrorBoundary resetKeys={[location.pathname]}>
        <Suspense fallback={<DelayedFallback><PageSkeleton /></DelayedFallback>}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
    </>
  );
}

// Data router (createBrowserRouter) instead of declarative <BrowserRouter> —
// required for useBlocker (see components/ui/unsaved-changes.tsx). The route
// JSX is unchanged, just hoisted out of <Routes> into the router config.
const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<RootChrome />}>
        {/* Public Routes */}
        <Route path="/" element={<RootRoute />} />
        <Route
          path="/auth"
          element={
            import.meta.env.VITE_PRELAUNCH === 'true' ? <Navigate to="/" replace /> : <AuthPage />
          }
        />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/om-oss" element={<AboutPage />} />
        <Route path="/personvern" element={<PrivacyPage />} />
        <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/join/:code" element={<JoinPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />

        {/* Authenticated dashboard — slug-less namespace, English URLs,
            Norwegian UI copy (Time2Book-style). All under TeacherLayout
            so the sidebar + topbar persist.

            /overview and /settings/profile are shared between buyers and
            sellers. Everything else is seller-only and sits behind
            RoleRoute — a buyer hitting /courses by URL bounces to
            /overview instead of seeing a half-broken seller page. */}
        <Route element={<TeacherLayout />}>
          <Route path="overview" element={<DashboardRouter />} />
          <Route path="help" element={<HelpPage />} />
          <Route path="settings/profile" element={<TeacherProfilePage />} />

          <Route element={<RoleRoute allow="seller" />}>
            <Route path="get-started" element={<GetStartedPage />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="courses" element={<CoursesPage />} />
            <Route path="courses/new" element={<CourseBuilderPage />} handle={{ fullBleed: true }} />
            <Route path="courses/:id" element={<CoursePage />} />
            <Route path="studio" element={<StudioPage />} />
            {/* Samarbeid moved into the Studio page (2026-06). Old links and
                stale notification action_urls keep resolving. */}
            <Route path="collaboration" element={<Navigate to="/studio#samarbeid" replace />} />
            <Route path="settings/billing" element={<BillingPage />} />
            <Route path="settings/payouts" element={<PaymentsPage />} />
          </Route>
        </Route>

        {/* Dev preview gallery (no auth, direct-URL only). DEV-only:
            tree-shaken out of production builds so it never ships or gets
            indexed. Index hub at /dev; every preview renders REAL components
            in their default / empty / error / loading states. */}
        {import.meta.env.DEV && (
          <>
            <Route path="/dev" element={<DevIndex />} />
            {/* Foundations */}
            <Route path="/dev/tokens" element={<TokensPreview />} />
            <Route path="/dev/primitives" element={<PrimitivesPreview />} />
            <Route path="/dev/states" element={<StatesPreview />} />
            <Route path="/dev/settings-rows-preview" element={<SettingsRowsPreview />} />
            {/* Seller — dashboard & daily */}
            <Route path="/dev/dashboard-preview" element={<DashboardPreview />} />
            <Route path="/dev/income-chart-preview" element={<IncomeChartPreview />} />
            <Route path="/dev/courses-list-preview" element={<CoursesListPreview />} />
            <Route path="/dev/course-builder-live" element={<CourseBuilderLivePreview />} />
            <Route path="/dev/draft-experience-preview" element={<DraftExperiencePreview />} />
            <Route path="/dev/schedule-preview" element={<SchedulePreview />} />
            <Route path="/dev/session-days-preview" element={<SessionDaysPreview />} />
            {/* Seller — money & studio */}
            <Route path="/dev/payout-preview" element={<PayoutPreview />} />
            <Route path="/dev/billing-preview" element={<BillingPreview />} />
            <Route path="/dev/studio-preview" element={<StudioPreview />} />
            <Route path="/dev/embed-code-preview" element={<EmbedCodePreview />} />
            {/* Buyer / public */}
            <Route path="/dev/buyer-dashboard-preview" element={<BuyerDashboardPreview />} />
            <Route path="/dev/storefront" element={<StorefrontPreview />} />
            <Route path="/dev/detail-t1-preview" element={<DetailT1Preview />} />
            <Route path="/dev/checkout-t1-preview" element={<CheckoutT1Preview />} />
            <Route path="/dev/embed-preview" element={<EmbedPreview />} />
            {/* Onboarding */}
            <Route path="/dev/onboarding-preview" element={<OnboardingPreview />} />
          </>
        )}

        {/* Embeddable calendar widget — sellers iframe this into their own
            site. Literal `/embed/` prefix, so it MUST come before the flat
            `/:slug` catch-all below (which would otherwise swallow it). */}
        <Route path="/embed/:slug" element={<EmbedCalendarPage />} />
        {/* Teacher-facing preview of the embed above — framed with back link
            + title; the bare route stays chrome-less for iframes. */}
        <Route path="/embed/:slug/preview" element={<EmbedPreviewPage />} />

        {/* Flat-slug team pages at root — `ourapp.no/<team-slug>[/courseId]`.
            FlatTeamRoute checks the slug against the reserved-words list and
            renders 404 if it's reserved, so these MUST come AFTER all literal
            routes above. Bookmarks and direct URL visits hit these. */}
        <Route
          path="/:slug"
          element={
            <FlatTeamRoute>
              <PublicCoursesPage />
            </FlatTeamRoute>
          }
        />
        <Route
          path="/:slug/:courseSlug"
          element={
            <FlatTeamRoute>
              <PublicCourseDetailPage />
            </FlatTeamRoute>
          }
        />
        <Route
          path="/:slug/:courseSlug/pamelding"
          element={
            <FlatTeamRoute>
              <CheckoutPage />
            </FlatTeamRoute>
          }
        />

        {/* 404 Catch-all */}
        <Route path="*" element={<NotFoundPage />} />
    </Route>
  )
);

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* reducedMotion="user": framer-motion transforms are JS-driven, so the
            CSS prefers-reduced-motion guard in index.css can't reach them. */}
        <MotionConfig reducedMotion="user">
          <RouterProvider router={router} />
        </MotionConfig>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;

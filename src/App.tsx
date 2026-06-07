import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { DelayedFallback } from './components/ui/delayed-fallback';
import { PageSkeleton } from './components/ui/page-skeleton';
import { RESERVED_SLUGS } from '@/lib/reservedSlugs';
import { useAuth } from '@/contexts/AuthContext';

// Persistent layouts (no lazy — always mounted)
import TeacherLayout from './layouts/TeacherLayout';
import { RoleRoute } from './components/RoleRoute';

// Lazy load all route components for code splitting
const DashboardRouter = lazy(() => import('./pages/teacher/DashboardRouter'));
const GetStartedPage = lazy(() => import('./pages/teacher/GetStartedPage'));
const HelpPage = lazy(() => import('./pages/teacher/HelpPage'));
const SchedulePage = lazy(() => import('./pages/teacher/SchedulePage'));
const CoursesPage = lazy(() => import('./pages/teacher/CoursesPage'));
const CoursePage = lazy(() => import('./pages/teacher/CoursePage'));
const TeacherProfilePage = lazy(() => import('./pages/teacher/TeacherProfilePage'));
const PaymentsPage = lazy(() => import('./pages/teacher/PaymentsPage'));
const StudioPage = lazy(() => import('./pages/teacher/StudioPage'));
const CollaborationPage = lazy(() => import('./pages/teacher/CollaborationPage'));
const PublicCoursesPage = lazy(() => import('./pages/public/PublicCoursesPage'));
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
const TokenPreview = lazy(() => import('./pages/dev/TokenPreview'));
const OnboardingPreview = lazy(() => import('./pages/dev/OnboardingPreview'));
const CreateCoursePreview = lazy(() => import('./pages/dev/CreateCoursePreview'));
const CoursesGridPreview = lazy(() => import('./pages/dev/CoursesGridPreview'));
const MonthGridPreview = lazy(() => import('./pages/dev/MonthGridPreview'));
const PayoutPreview = lazy(() => import('./pages/dev/PayoutPreview'));
const IncomeChartPreview = lazy(() => import('./pages/dev/IncomeChartPreview'));
const EntityCardPreview = lazy(() => import('./pages/dev/EntityCardPreview'));
const DashboardPreview = lazy(() => import('./pages/dev/DashboardPreview'));
const CoursesListPreview = lazy(() => import('./pages/dev/CoursesListPreview'));
const CheckoutReworkPreview = lazy(() => import('./pages/dev/CheckoutReworkPreview'));
const CheckoutFormReworkPreview = lazy(() => import('./pages/dev/CheckoutFormReworkPreview'));
const DetailReworkPreview = lazy(() => import('./pages/dev/DetailReworkPreview'));
const ModalsButtonsToastsPreview = lazy(() => import('./pages/dev/ModalsButtonsToastsPreview'));

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
  // Auth init is cached and usually <200ms — render nothing rather than flash
  // a loader (Studio § 10). On the rare slow init the user briefly sees blank;
  // far calmer than a full-screen spinner that flickers in and out.
  if (!isInitialized) return null;
  if (user) return <Navigate to="/overview" replace />;
  return <LandingPage />;
}

function AppRoutes() {
  return (
    <>
      <Routes>
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
            <Route path="courses/:id" element={<CoursePage />} />
            <Route path="studio" element={<StudioPage />} />
            <Route path="collaboration" element={<CollaborationPage />} />
            <Route path="settings/payouts" element={<PaymentsPage />} />
          </Route>
        </Route>

        {/* Dev preview (no auth, direct-URL only). DEV-only: tree-shaken out
            of production builds so these half-finished galleries never ship
            or get indexed. */}
        {import.meta.env.DEV && (
          <>
            <Route path="/dev/token-preview" element={<TokenPreview />} />
            <Route path="/dev/onboarding-preview" element={<OnboardingPreview />} />
            <Route path="/dev/create-course-preview" element={<CreateCoursePreview />} />
            <Route path="/dev/courses-grid-preview" element={<CoursesGridPreview />} />
            <Route path="/dev/month-grid-preview" element={<MonthGridPreview />} />
            <Route path="/dev/payout-preview" element={<PayoutPreview />} />
            <Route path="/dev/income-chart-preview" element={<IncomeChartPreview />} />
            <Route path="/dev/entity-card-preview" element={<EntityCardPreview />} />
            <Route path="/dev/dashboard-preview" element={<DashboardPreview />} />
            <Route path="/dev/courses-list-preview" element={<CoursesListPreview />} />
            <Route path="/dev/checkout-rework" element={<CheckoutReworkPreview />} />
            <Route path="/dev/checkout-form-rework" element={<CheckoutFormReworkPreview />} />
            <Route path="/dev/detail-rework" element={<DetailReworkPreview />} />
            <Route path="/dev/modals-buttons-toasts" element={<ModalsButtonsToastsPreview />} />
          </>
        )}

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
      </Routes>
    </>
  );
}

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster />
        <ErrorBoundary>
          <Suspense fallback={<DelayedFallback><PageSkeleton /></DelayedFallback>}>
            <AppRoutes />
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;

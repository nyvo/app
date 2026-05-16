import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams, type Location } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PageLoader } from './components/ui/page-loader';
import { RESERVED_SLUGS } from '@/lib/reservedSlugs';
import { useAuth } from '@/contexts/AuthContext';

// Persistent layouts (no lazy — always mounted)
import TeacherLayout from './layouts/TeacherLayout';

// Lazy load all route components for code splitting
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'));
const GetStartedPage = lazy(() => import('./pages/teacher/GetStartedPage'));
const SchedulePage = lazy(() => import('./pages/teacher/SchedulePage'));
const CoursesPage = lazy(() => import('./pages/teacher/CoursesPage'));
const CoursePage = lazy(() => import('./pages/teacher/CoursePage'));
const TeacherProfilePage = lazy(() => import('./pages/teacher/TeacherProfilePage'));
const PaymentsPage = lazy(() => import('./pages/teacher/PaymentsPage'));
const TeamsPage = lazy(() => import('./pages/teacher/TeamsPage'));
const PublicCoursesPage = lazy(() => import('./pages/public/PublicCoursesPage'));
const PublicCourseDetailPage = lazy(() => import('./pages/public/PublicCourseDetailPage'));
const LandingPage = lazy(() => import('./pages/public/LandingPage'));
const SignupPage = lazy(() => import('./pages/public/SignupPage'));
const LoginPage = lazy(() => import('./pages/public/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/public/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/public/ResetPasswordPage'));
const TermsPage = lazy(() => import('./pages/public/TermsPage'));
const CheckoutSuccessPage = lazy(() => import('./pages/public/CheckoutSuccessPage'));
const ConfirmEmailPage = lazy(() => import('./pages/public/ConfirmEmailPage'));
const AuthCallbackPage = lazy(() => import('./pages/public/AuthCallbackPage'));
const JoinPage = lazy(() => import('./pages/public/JoinPage'));
const OnboardingPage = lazy(() => import('./pages/onboarding/OnboardingPage'));

const ComingSoonPage = lazy(() => import('./pages/ComingSoonPage'));
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

type RouterState = { backgroundLocation?: Location } | null;

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
  if (!isInitialized) return <PageLoader variant="fullscreen" />;
  if (user) return <Navigate to="/overview" replace />;
  return <LandingPage />;
}

function AppRoutes() {
  const location = useLocation();
  const state = location.state as RouterState;
  const backgroundLocation = state?.backgroundLocation;

  return (
    <>
      <Routes location={backgroundLocation || location}>
        {/* Public Routes */}
        <Route path="/" element={<RootRoute />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
        <Route path="/confirm-email" element={<ConfirmEmailPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/join/:code" element={<JoinPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />

        {/* Authenticated dashboard — slug-less namespace, English URLs,
            Norwegian UI copy (Time2Book-style). All under TeacherLayout
            so the sidebar + topbar persist. */}
        <Route element={<TeacherLayout />}>
          <Route path="overview" element={<TeacherDashboard />} />
          <Route path="get-started" element={<GetStartedPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="courses/:id" element={<CoursePage />} />
          <Route path="studio" element={<TeamsPage />} />
          <Route path="settings/profile" element={<TeacherProfilePage />} />
          <Route path="settings/payouts" element={<PaymentsPage />} />
        </Route>

        {/* Dev preview (no auth, direct-URL only) */}
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

        {/* 404 Catch-all */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {/* Overlay layer — only mounted when navigating from a team card
          (which passes state.backgroundLocation). Renders the course detail
          page as a fixed overlay on top of the team overview that's
          mounted underneath via the first Routes block, so the back button
          returns to the exact team-page scroll position. Direct URL
          visits skip this layer entirely — the first Routes block already
          rendered the detail page as a normal scrollable document. */}
      {backgroundLocation && (
        <Routes>
          <Route
            path="/:slug/:courseSlug"
            element={
              <FlatTeamRoute>
                <PublicCourseDetailPage />
              </FlatTeamRoute>
            }
          />
          <Route path="*" element={null} />
        </Routes>
      )}
    </>
  );
}

const App = () => {
  if (import.meta.env.VITE_COMING_SOON === 'true') {
    return (
      <Suspense fallback={<PageLoader variant="fullscreen" />}>
        <ComingSoonPage />
      </Suspense>
    );
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="bottom-center"
          theme="light"
        />
        <ErrorBoundary>
          <Suspense fallback={<PageLoader variant="fullscreen" />}>
            <AppRoutes />
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;

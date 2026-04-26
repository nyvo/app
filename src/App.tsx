import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation, type Location } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PageLoader } from './components/ui/page-loader';

// Persistent layouts (no lazy — always mounted)
import TeacherLayout from './layouts/TeacherLayout';

// Lazy load all route components for code splitting
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'));
const SchedulePage = lazy(() => import('./pages/teacher/SchedulePage'));
const SignupsPage = lazy(() => import('./pages/teacher/SignupsPage'));
// MESSAGES_DISABLED_PRE_LAUNCH (2026-04-25): Messages feature is hidden
// for MVP launch. Re-enable by uncommenting this line + the route below,
// plus the entry in TeacherSidebar, the breadcrumb in TeacherTopBar, the
// quick-action in TeacherDashboard, and the "Send melding" button in
// CourseOverviewTab. Search MESSAGES_DISABLED_PRE_LAUNCH for all sites.
// const MessagesPage = lazy(() => import('./pages/teacher/MessagesPage'));
const CreateCoursePage = lazy(() => import('./pages/teacher/CreateCoursePage'));
const CoursesPage = lazy(() => import('./pages/teacher/CoursesPage'));
const CourseDetailPage = lazy(() => import('./pages/teacher/CourseDetailPage'));
const TeacherProfilePage = lazy(() => import('./pages/teacher/TeacherProfilePage'));
const LocationsPage = lazy(() => import('./pages/teacher/LocationsPage'));
const PaymentsPage = lazy(() => import('./pages/teacher/PaymentsPage'));
const SpacesPage = lazy(() => import('./pages/teacher/SpacesPage'));
const PublicCoursesPage = lazy(() => import('./pages/public/PublicCoursesPage'));
const PublicCourseDetailPage = lazy(() => import('./pages/public/PublicCourseDetailPage'));
const SpacePage = lazy(() => import('./pages/public/SpacePage'));
const LandingPage = lazy(() => import('./pages/public/LandingPage'));
const SignupPage = lazy(() => import('./pages/public/SignupPage'));
const LoginPage = lazy(() => import('./pages/public/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/public/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/public/ResetPasswordPage'));
const TermsPage = lazy(() => import('./pages/public/TermsPage'));
const CheckoutSuccessPage = lazy(() => import('./pages/public/CheckoutSuccessPage'));
const ConfirmEmailPage = lazy(() => import('./pages/public/ConfirmEmailPage'));

const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const TokenPreview = lazy(() => import('./pages/dev/TokenPreview'));

type RouterState = { backgroundLocation?: Location } | null;

function AppRoutes() {
  const location = useLocation();
  const state = location.state as RouterState;
  const backgroundLocation = state?.backgroundLocation;

  return (
    <>
      <Routes location={backgroundLocation || location}>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
        <Route path="/confirm-email" element={<ConfirmEmailPage />} />

        {/* Studio/Organization Public Routes.
            With backgroundLocation set (in-app nav from a card), the first
            Routes block uses the backgroundLocation, so /studio/:slug
            matches and PublicCoursesPage renders underneath the overlay.
            On direct visits, the real URL `/studio/:slug/:courseId` matches
            here and PublicCourseDetailPage renders as a normal page. */}
        <Route path="/studio/:slug" element={<PublicCoursesPage />} />
        <Route path="/studio/:slug/:courseId" element={<PublicCourseDetailPage />} />

        {/* Shared-studio (grouped) public page — aggregated schedule across
            all member orgs of a Space. `/space/:slug` is a distinct word from
            `/studio/:slug` (singular = individual org's booking page),
            eliminating the visual `/studio/` vs `/studios/` confusion and
            preventing slug-namespace collisions. UI labels everywhere read
            "Studio" (controlled ambiguity); the URL path is purely a routing
            identifier. Internal model is `spaces` + `space_members`. */}
        <Route path="/space/:slug" element={<SpacePage />} />

        {/* Teacher Routes (Protected, persistent sidebar layout) */}
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route index element={<TeacherDashboard />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="courses/:id" element={<CourseDetailPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="signups" element={<SignupsPage />} />
          {/* MESSAGES_DISABLED_PRE_LAUNCH */}
          {/* <Route path="messages" element={<MessagesPage />} /> */}
          <Route path="new-course" element={<CreateCoursePage />} />
          <Route path="profile" element={<TeacherProfilePage />} />
          <Route path="locations" element={<LocationsPage />} />
          <Route path="payments" element={<PaymentsPage />} />
          <Route path="studio" element={<SpacesPage />} />
        </Route>
        {/* Dev preview (no auth, direct-URL only) */}
        <Route path="/dev/token-preview" element={<TokenPreview />} />

        {/* 404 Catch-all */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {/* Overlay layer — only mounted when navigating from a studio card
          (which passes state.backgroundLocation). Renders the course detail
          page as a fixed overlay on top of the studio overview that's
          mounted underneath via the first Routes block, so the back button
          returns to the exact studio-page scroll position. Direct URL
          visits skip this layer entirely — the first Routes block already
          rendered the detail page as a normal scrollable document. */}
      {backgroundLocation && (
        <Routes>
          <Route path="/studio/:slug/:courseId" element={<PublicCourseDetailPage />} />
          <Route path="*" element={null} />
        </Routes>
      )}
    </>
  );
}

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
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

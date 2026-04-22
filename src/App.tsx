import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation, type Location } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PageLoader } from './components/ui/page-loader';

// Persistent layouts (no lazy — always mounted)
import TeacherLayout from './layouts/TeacherLayout';

// Lazy load all route components for code splitting
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'));
const SchedulePage = lazy(() => import('./pages/teacher/SchedulePage'));
const SignupsPage = lazy(() => import('./pages/teacher/SignupsPage'));
const MessagesPage = lazy(() => import('./pages/teacher/MessagesPage'));
const CreateCoursePage = lazy(() => import('./pages/teacher/CreateCoursePage'));
const CoursesPage = lazy(() => import('./pages/teacher/CoursesPage'));
const CourseDetailPage = lazy(() => import('./pages/teacher/CourseDetailPage'));
const TeacherProfilePage = lazy(() => import('./pages/teacher/TeacherProfilePage'));
const LocationsPage = lazy(() => import('./pages/teacher/LocationsPage'));
const PaymentsPage = lazy(() => import('./pages/teacher/PaymentsPage'));
const StripeCallbackPage = lazy(() => import('./pages/teacher/StripeCallbackPage'));
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
            Both the list and the detail URL render the schedule page as the base;
            the drawer is layered on top for /studio/:slug/:courseId (see below). */}
        <Route path="/studio/:slug" element={<PublicCoursesPage />} />
        <Route path="/studio/:slug/:courseId" element={<PublicCoursesPage />} />

        {/* Teacher Routes (Protected, persistent sidebar layout) */}
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route index element={<TeacherDashboard />} />
          <Route path="courses" element={<CoursesPage />} />
          <Route path="courses/:id" element={<CourseDetailPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="signups" element={<SignupsPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="new-course" element={<CreateCoursePage />} />
          <Route path="profile" element={<TeacherProfilePage />} />
          <Route path="locations" element={<LocationsPage />} />
          <Route path="payments" element={<PaymentsPage />} />
        </Route>
        <Route path="/teacher/stripe-callback" element={<ProtectedRoute><StripeCallbackPage /></ProtectedRoute>} />

        {/* Dev preview (no auth, direct-URL only) */}
        <Route path="/dev/token-preview" element={<TokenPreview />} />

        {/* 404 Catch-all */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {/* Overlay route — renders the course detail page on top of the schedule
          when URL matches /studio/:slug/:courseId. In-app nav from the schedule
          passes state.backgroundLocation so the schedule never unmounts —
          back-button returns to its exact scroll position. Direct URL visits
          still work (no backgroundLocation → schedule renders behind via the
          fallback route above, detail renders on top). */}
      <Routes>
        <Route path="/studio/:slug/:courseId" element={<PublicCourseDetailPage />} />
      </Routes>
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

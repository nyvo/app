import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PageLoader } from './components/ui/page-loader';

// Lazy load all route components for code splitting
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'));
const SchedulePage = lazy(() => import('./pages/teacher/SchedulePage'));
const SignupsPage = lazy(() => import('./pages/teacher/SignupsPage'));
const MessagesPage = lazy(() => import('./pages/teacher/MessagesPage'));
const CreateCoursePage = lazy(() => import('./pages/teacher/CreateCoursePage'));
const CoursesPage = lazy(() => import('./pages/teacher/CoursesPage'));
const CourseDetailPage = lazy(() => import('./pages/teacher/CourseDetailPage'));
const TeacherProfilePage = lazy(() => import('./pages/teacher/TeacherProfilePage'));

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

const StudentLoginPage = lazy(() => import('./pages/student/StudentLoginPage'));
const StudentRegisterPage = lazy(() => import('./pages/student/StudentRegisterPage'));
const StudentDashboardPage = lazy(() => import('./pages/student/StudentDashboardPage'));
const StudentProfilePage = lazy(() => import('./pages/student/StudentProfilePage'));

const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          theme="light"
        />
        <Suspense fallback={<PageLoader variant="fullscreen" />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
            <Route path="/confirm-email" element={<ConfirmEmailPage />} />
{/* Studio/Organization Public Routes */}
            <Route path="/studio/:slug" element={<PublicCoursesPage />} />
            <Route path="/studio/:slug/:courseId" element={<PublicCourseDetailPage />} />

            {/* Teacher Routes (Protected) */}
            <Route path="/teacher" element={<ProtectedRoute requiredUserType="teacher"><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/teacher/courses" element={<ProtectedRoute requiredUserType="teacher"><CoursesPage /></ProtectedRoute>} />
            <Route path="/teacher/courses/:id" element={<ProtectedRoute requiredUserType="teacher"><CourseDetailPage /></ProtectedRoute>} />
            <Route path="/teacher/schedule" element={<ProtectedRoute requiredUserType="teacher"><SchedulePage /></ProtectedRoute>} />
            <Route path="/teacher/signups" element={<ProtectedRoute requiredUserType="teacher"><SignupsPage /></ProtectedRoute>} />
            <Route path="/teacher/messages" element={<ProtectedRoute requiredUserType="teacher"><MessagesPage /></ProtectedRoute>} />
            <Route path="/teacher/new-course" element={<ProtectedRoute requiredUserType="teacher"><CreateCoursePage /></ProtectedRoute>} />
            <Route path="/teacher/profile" element={<ProtectedRoute requiredUserType="teacher"><TeacherProfilePage /></ProtectedRoute>} />

            {/* Student Routes */}
            <Route path="/student/login" element={<StudentLoginPage />} />
            <Route path="/student/register" element={<StudentRegisterPage />} />
            <Route path="/student/dashboard" element={<ProtectedRoute requireOrganization={false} requiredUserType="student"><StudentDashboardPage /></ProtectedRoute>} />
            <Route path="/student/profile" element={<ProtectedRoute requireOrganization={false} requiredUserType="student"><StudentProfilePage /></ProtectedRoute>} />
            
            {/* 404 Catch-all */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;

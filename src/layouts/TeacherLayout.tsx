import { Outlet } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { TeacherSidebar } from '@/components/teacher/TeacherSidebar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { WelcomeFlow } from '@/components/teacher/WelcomeFlow';
import { useAuth } from '@/contexts/AuthContext';

export default function TeacherLayout() {
  const { profile, refreshOrganizations } = useAuth();
  const showWelcome = !!profile && !profile.onboarding_completed_at;

  return (
    <ProtectedRoute>
      <SidebarProvider>
        {/* Sidebar: visible but muted during onboarding */}
        <div className={showWelcome ? 'opacity-40 pointer-events-none select-none' : ''}>
          <TeacherSidebar />
        </div>
        {showWelcome ? (
          <WelcomeFlow onComplete={refreshOrganizations} />
        ) : (
          <Outlet />
        )}
      </SidebarProvider>
    </ProtectedRoute>
  );
}

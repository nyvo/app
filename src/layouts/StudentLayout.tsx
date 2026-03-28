import { Outlet } from 'react-router-dom';
import { StudentDashboardLayout } from '@/components/student/StudentDashboardLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function StudentLayout() {
  return (
    <ProtectedRoute requireOrganization={false} requiredUserType="student">
      <StudentDashboardLayout>
        <Outlet />
      </StudentDashboardLayout>
    </ProtectedRoute>
  );
}

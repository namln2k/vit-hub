import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/useAuth';
import type { UserRole } from '@/constants/userRoles';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { currentUser, appUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-sm font-medium text-gray-500">
        Đang tải...
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && appUser?.role !== requiredRole) {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
}

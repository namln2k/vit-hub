import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/useAuth';
import type { UserRole } from '@/constants/userRoles';
import Sharingan from '@/components/shared/loading/Sharingan';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { currentUser, appUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm font-medium text-gray-500">
        <Sharingan />
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

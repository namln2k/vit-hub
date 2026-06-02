import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import DashboardPage from '@/pages/DashboardPage';
import SuperAdminPage from '@/pages/SuperAdminPage';
import LandingPage from '@/pages/LandingPage';
import DivisionsIntroduction from '@/pages/DivisionsIntroduction';
import AuthCallbackPage from '@/pages/auth/AuthCallbackPage';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/divisions" element={<DivisionsIntroduction />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/super-admin/*"
        element={
          <ProtectedRoute requiredRole="super_admin">
            <SuperAdminPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

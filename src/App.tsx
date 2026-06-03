import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ProfilePage from '@/pages/ProfilePage';
import SuperAdminPage from '@/pages/SuperAdminPage';
import LandingPage from '@/pages/LandingPage';
import DivisionsIntroduction from '@/pages/DivisionsIntroduction';
import PostPage from '@/pages/PostPage';
import AuthCallbackPage from '@/pages/auth/AuthCallbackPage';
import ProtectedRoute from '@/components/shared/routing/ProtectedRoute';
import { Toaster } from 'sonner';

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/divisions" element={<DivisionsIntroduction />} />
        <Route path="/posts/:slug" element={<PostPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
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
      <Toaster richColors position="top-right" />
    </>
  );
}

export default App;

import ProtectedRoute from '@/components/shared/routing/ProtectedRoute';
import AuthCallbackPage from '@/pages/auth/AuthCallbackPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import DivisionsIntroduction from '@/pages/DivisionsIntroduction';
import BadmintonFeaturePage from '@/pages/features/BadmintonFeaturePage';
import FeaturesPage from '@/pages/features/FeaturesPage';
import LandingPage from '@/pages/LandingPage';
import PostPage from '@/pages/PostPage';
import ProfilePage from '@/pages/ProfilePage';
import SuperAdminPage from '@/pages/SuperAdminPage';
import { Navigate, Route, Routes } from 'react-router-dom';
import PickleballFeaturePage from '@/pages/features/PickleballFeaturePage';

function App() {
  return (
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
        path="/features"
        element={
          <ProtectedRoute>
            <FeaturesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/features/badminton"
        element={
          <ProtectedRoute>
            <BadmintonFeaturePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/features/pickleball"
        element={
          <ProtectedRoute>
            <PickleballFeaturePage />
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

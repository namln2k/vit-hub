import LoginPage from '@/screens/auth/LoginPage';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

export default function LoginRoute() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}

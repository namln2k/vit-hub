import SuperAdminPage from '@/screens/SuperAdminPage';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

export default function SuperAdminRoute() {
  return (
    <Suspense>
      <SuperAdminPage />
    </Suspense>
  );
}

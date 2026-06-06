import SuperAdminLayoutContent from '@/features/super-admin/components/common/SuperAdminLayoutContent';
import { Suspense, type ReactNode } from 'react';

export const dynamic = 'force-dynamic';

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense>
      <SuperAdminLayoutContent>{children}</SuperAdminLayoutContent>
    </Suspense>
  );
}

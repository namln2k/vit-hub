import SuperAdminLayoutContent from '@/features/super-admin/components/common/SuperAdminLayoutContent';
import { APP_ROUTES } from '@/constants/routes';
import { requireWebActor } from '@/server/auth/actor';
import { authAuthorization } from '@/server/services/auth/authorization';
import { redirect } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';

export const dynamic = 'force-dynamic';

export default async function SuperAdminLayout({ children }: { children: ReactNode }) {
  try {
    await authAuthorization.requireActiveSuperAdmin(await requireWebActor());
  } catch {
    redirect(APP_ROUTES.profile);
  }

  return (
    <Suspense>
      <SuperAdminLayoutContent>{children}</SuperAdminLayoutContent>
    </Suspense>
  );
}

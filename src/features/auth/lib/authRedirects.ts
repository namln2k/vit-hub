import type { UserRole } from '@/constants/userRoles';
import { APP_ROUTES } from '@/constants/routes';

export function getDefaultAuthenticatedRoute(role: UserRole | string | null | undefined) {
  return role === 'super_admin' ? APP_ROUTES.superAdmin : APP_ROUTES.features;
}

export function getSafeAuthNextPath(next: string | null | undefined) {
  if (!next?.startsWith('/') || next.startsWith('//')) {
    return null;
  }

  return next;
}

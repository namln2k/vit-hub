import { APP_ROUTES, isPathInRoute } from '@/constants/routes';
import type { UserRole } from '@/constants/userRoles';

export type AvatarMenuFeatureId = 'admin' | 'features' | 'profile';

export interface AvatarMenuFeature {
  id: AvatarMenuFeatureId;
  label: string;
  to: string;
}

export const AVATAR_MENU_FEATURES = {
  admin: {
    id: 'admin',
    label: 'Quản trị',
    to: APP_ROUTES.superAdmin,
  },
  features: {
    id: 'features',
    label: 'Tính năng',
    to: APP_ROUTES.features,
  },
  profile: {
    id: 'profile',
    label: 'Hồ sơ cá nhân',
    to: APP_ROUTES.profile,
  },
} as const satisfies Record<AvatarMenuFeatureId, AvatarMenuFeature>;

const ROLE_AVATAR_MENU_FEATURES = {
  member: ['features', 'profile'],
  super_admin: ['admin', 'features', 'profile'],
} as const satisfies Record<UserRole, readonly AvatarMenuFeatureId[]>;

function normalizePathname(pathname: string) {
  if (pathname.length <= 1) {
    return '/';
  }

  return pathname.replace(/\/+$/, '');
}

function getCurrentFeatureId(pathname: string): AvatarMenuFeatureId | null {
  const normalizedPathname = normalizePathname(pathname);

  if (normalizedPathname === APP_ROUTES.profile) {
    return 'profile';
  }

  if (normalizedPathname === APP_ROUTES.features) {
    return 'features';
  }

  if (isPathInRoute(normalizedPathname, APP_ROUTES.superAdmin)) {
    return 'admin';
  }

  return null;
}

export function getAllowedAvatarMenuFeatures(
  role: UserRole | null | undefined,
  pathname: string,
): AvatarMenuFeature[] {
  if (!role) {
    return [];
  }

  const currentFeatureId = getCurrentFeatureId(pathname);

  return ROLE_AVATAR_MENU_FEATURES[role]
    .filter((featureId) => featureId !== currentFeatureId)
    .map((featureId) => AVATAR_MENU_FEATURES[featureId]);
}

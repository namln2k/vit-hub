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
    to: '/super-admin',
  },
  features: {
    id: 'features',
    label: 'Tính năng',
    to: '/features',
  },
  profile: {
    id: 'profile',
    label: 'Hồ sơ cá nhân',
    to: '/profile',
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

  if (normalizedPathname === '/profile') {
    return 'profile';
  }

  if (normalizedPathname === '/features') {
    return 'features';
  }

  if (normalizedPathname === '/super-admin' || normalizedPathname.startsWith('/super-admin/')) {
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

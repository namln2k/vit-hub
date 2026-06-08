export const APP_ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  profile: '/profile',
  features: '/features',
  badmintonFeature: '/features/badminton',
  pickleballFeature: '/features/pickleball',
  superAdmin: '/super-admin',
  authCallback: '/auth/callback',
} as const;

export const API_ROUTES = {
  authRegister: '/api/auth/register',
  avatarsPresign: '/api/avatars/presign',
  badmintonGames: '/api/badminton/games',
  postsPresign: '/api/posts/presign',
  usersImport: '/api/users/import',
} as const;

export const PROTECTED_APP_ROUTES = [
  APP_ROUTES.profile,
  APP_ROUTES.features,
  APP_ROUTES.superAdmin,
] as const;

export function isPathInRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function getPostPath(slug: string) {
  return `/posts/${slug}`;
}

export function getPublicBadmintonGamePath(gameId: string) {
  return `/badminton/games/${gameId}`;
}

export function getBadmintonGameManagementPath(gameId: string) {
  return `/features/badminton/games/${gameId}`;
}

export function withRouteQuery(pathname: string, params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  const query = searchParams.toString();

  return query ? `${pathname}?${query}` : pathname;
}

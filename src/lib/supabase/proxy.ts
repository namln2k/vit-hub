import { createServerClient } from '@supabase/ssr';
import { APP_ROUTES, PROTECTED_APP_ROUTES, isPathInRoute } from '@/constants/routes';
import { getSupabasePublicServerConfig } from '@/server/env';
import { SUPABASE_AUTH_COOKIE_NAME } from './config';
import { NextResponse, type NextRequest } from 'next/server';

function isProtectedPath(pathname: string) {
  return PROTECTED_APP_ROUTES.some((route) => isPathInRoute(pathname, route));
}

function isSuperAdminPath(pathname: string) {
  return isPathInRoute(pathname, APP_ROUTES.superAdmin);
}

function getSupabaseUrl() {
  try {
    return getSupabasePublicServerConfig().supabaseUrl;
  } catch {
    return undefined;
  }
}

function getSupabasePublishableKey() {
  try {
    return getSupabasePublicServerConfig().publishableKey;
  } catch {
    return undefined;
  }
}

function getAppOrigin() {
  return (process.env.NEXT_PUBLIC_APP_ORIGIN ?? 'http://localhost:3000').replace(/\/$/, '');
}

function redirectTo(pathname: string) {
  const url = new URL(pathname, getAppOrigin());
  url.pathname = pathname;
  url.search = '';
  return NextResponse.redirect(url);
}

async function getUserRole(uid: string) {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to protect super-admin routes.');
  }

  const query = new URLSearchParams({
    select: 'role',
    id: `eq.${uid}`,
    limit: '1',
  });
  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/user?${query}`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return Array.isArray(data) ? data[0]?.role : null;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const supabaseUrl = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();

  if (!supabaseUrl || !publishableKey) {
    if (isProtectedPath(request.nextUrl.pathname)) {
      return redirectTo(APP_ROUTES.login);
    }

    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, publishableKey, {
    cookieOptions: {
      name: SUPABASE_AUTH_COOKIE_NAME,
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) => supabaseResponse.headers.set(key, value));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const uid = typeof claims?.sub === 'string' ? claims.sub : '';
  const pathname = request.nextUrl.pathname;

  if (isProtectedPath(pathname) && !uid) {
    const url = new URL(APP_ROUTES.login, getAppOrigin());
    url.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  if (isSuperAdminPath(pathname) && uid) {
    const role = await getUserRole(uid);

    if (role !== 'super_admin') {
      return redirectTo(APP_ROUTES.profile);
    }
  }

  return supabaseResponse;
}

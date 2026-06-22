import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { APP_ROUTES, PROTECTED_APP_ROUTES, isPathInRoute } from '@/constants/routes';
import { getSupabaseServerConfig } from '@/server/env';
import { getRequestOriginFromHeaders } from '@/server/requestOrigin';
import { SUPABASE_AUTH_COOKIE_NAME } from './config';
import { NextResponse, type NextRequest } from 'next/server';

function isProtectedPath(pathname: string) {
  return PROTECTED_APP_ROUTES.some((route) => isPathInRoute(pathname, route));
}

function getSupabaseConfig() {
  try {
    return getSupabaseServerConfig();
  } catch {
    return undefined;
  }
}

function redirectTo(request: NextRequest, pathname: string) {
  const origin = getRequestOriginFromHeaders(request.headers);
  const url = new URL(pathname, origin);
  url.pathname = pathname;
  url.search = '';
  return NextResponse.redirect(url);
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const supabaseConfig = getSupabaseConfig();

  if (!supabaseConfig) {
    if (isProtectedPath(request.nextUrl.pathname)) {
      return redirectTo(request, APP_ROUTES.login);
    }

    return supabaseResponse;
  }

  const { supabaseUrl, publishableKey } = supabaseConfig;
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
    const url = new URL(APP_ROUTES.login, getRequestOriginFromHeaders(request.headers));
    url.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

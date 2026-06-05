import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_PREFIXES = ['/profile', '/features', '/super-admin'];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isSuperAdminPath(pathname: string) {
  return pathname === '/super-admin' || pathname.startsWith('/super-admin/');
}

function getSupabaseUrl() {
  return process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
}

function getSupabasePublishableKey() {
  return process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
}

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
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
      return redirectTo(request, '/login');
    }

    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, publishableKey, {
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
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  if (isSuperAdminPath(pathname) && uid) {
    const role = await getUserRole(uid);

    if (role !== 'super_admin') {
      return redirectTo(request, '/profile');
    }
  }

  return supabaseResponse;
}
